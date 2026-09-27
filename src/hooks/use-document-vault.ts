// ============================================================================
// ReguFlow - Document vault hook (upload via private bucket + signed URL)
// ----------------------------------------------------------------------------
// Keamanan:
// - File divalidasi (tipe, ukuran, nama) sebelum upload.
// - Upload ke path documents/<org_id>/<doc_id>/<filename> (di-guard RLS storage).
// - Preview/download HANYA melalui signed URL, tidak ada public URL.
// - Setiap aksi dicatat di audit_logs.
// ============================================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, DOCUMENTS_BUCKET } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/supabase/auth-store";
import { queryKeys, useDocuments } from "@/hooks/use-queries";
import {
  buildDocumentStoragePath,
  sanitizeFileName,
  validateUploadedFile,
} from "@/lib/security";
import { logAudit } from "@/lib/security/audit";
import { getSafeErrorMessage } from "@/lib/utils";
import type { DocumentRow, DocumentStatus } from "@/types";

export interface UploadDocumentInput {
  file: File;
  documentType: string;
  title: string;
  businessId?: string | null;
  productId?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  notes?: string | null;
}

export function useDocumentVault() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const userId = useAuthStore((s) => s.profile?.id ?? null);
  const { data: documents = [] } = useDocuments();

  const uploadDocument = useMutation({
    mutationFn: async (input: UploadDocumentInput): Promise<DocumentRow> => {
      if (!orgId) throw new Error("Organisasi tidak ditemukan. Coba login ulang.");
      if (!userId) throw new Error("Sesi tidak valid. Coba login ulang.");

      const validation = validateUploadedFile(input.file);
      if (!validation.ok) {
        throw new Error(validation.error ?? "Jenis file tidak didukung.");
      }

      // 1. Buat metadata dokumen lebih dulu untuk dapat document_id
      const docId = crypto.randomUUID();
      const safeName = sanitizeFileName(input.file.name);
      const filePath = buildDocumentStoragePath(orgId, docId, safeName);

      // 2. Upload file ke private bucket
      const { error: uploadError } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .upload(filePath, input.file, {
          cacheControl: "3600",
          upsert: false,
          contentType: input.file.type || undefined,
        });

      if (uploadError) {
        throw new Error(
          uploadError.message?.includes("already")
            ? "File dengan nama tersebut sudah ada."
            : "Gagal mengunggah file. Coba lagi."
        );
      }

      // 3. Simpan metadata
      const { data, error } = await supabase
        .from("documents")
        .insert({
          id: docId,
          organization_id: orgId,
          business_id: input.businessId ?? null,
          product_id: input.productId ?? null,
          uploaded_by: userId,
          document_type: input.documentType,
          title: input.title,
          file_path: filePath,
          file_name: safeName,
          mime_type: input.file.type || "application/octet-stream",
          file_size: input.file.size,
          issue_date: input.issueDate || null,
          expiry_date: input.expiryDate || null,
          verification_status: "pending",
          notes: input.notes ?? null,
        })
        .select()
        .single();

      if (error) {
        // rollback file jika metadata gagal
        await supabase.storage.from(DOCUMENTS_BUCKET).remove([filePath]);
        throw new Error("Gagal menyimpan metadata dokumen.");
      }

      await logAudit({
        organizationId: orgId,
        action: "document_uploaded",
        entityType: "document",
        entityId: docId,
        metadata: {
          document_type: input.documentType,
          file_name: safeName,
          file_size: input.file.size,
        },
      });

      return data as DocumentRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents });
    },
  });

  const createSignedUrl = useMutation({
    mutationFn: async ({
      doc,
      action = "preview",
    }: {
      doc: DocumentRow;
      action?: "preview" | "download";
    }): Promise<string> => {
      if (!orgId) throw new Error("Organisasi tidak ditemukan.");
      const { data, error } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .createSignedUrl(doc.file_path, 60, {
          download: action === "download" ? doc.file_name : false,
        });

      if (error || !data?.signedUrl) {
        throw new Error("Gagal membuat tautan aman untuk dokumen.");
      }

      await logAudit({
        organizationId: orgId,
        action:
          action === "download" ? "document_downloaded" : "document_viewed",
        entityType: "document",
        entityId: doc.id,
        metadata: { file_name: doc.file_name },
      });

      return data.signedUrl;
    },
  });

  const updateDocumentStatus = useMutation({
    mutationFn: async ({
      docId,
      status,
      notes,
      expiryDate,
    }: {
      docId: string;
      status: DocumentStatus;
      notes?: string | null;
      expiryDate?: string | null;
    }): Promise<void> => {
      const update: Record<string, unknown> = { verification_status: status };
      if (notes !== undefined) update.notes = notes;
      if (expiryDate !== undefined) update.expiry_date = expiryDate;
      const { error } = await supabase
        .from("documents")
        .update(update)
        .eq("id", docId);
      if (error) throw new Error("Gagal memperbarui status dokumen.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents });
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (doc: DocumentRow): Promise<void> => {
      if (!orgId) throw new Error("Organisasi tidak ditemukan.");
      // Soft-delete metadata dulu, lalu hapus file storage
      const { error: metaError } = await supabase
        .from("documents")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", doc.id);
      if (metaError) throw new Error("Gagal menghapus dokumen.");

      await supabase.storage.from(DOCUMENTS_BUCKET).remove([doc.file_path]);

      await logAudit({
        organizationId: orgId,
        action: "document_deleted",
        entityType: "document",
        entityId: doc.id,
        metadata: { file_name: doc.file_name },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents });
    },
  });

  return {
    documents,
    uploadDocument,
    createSignedUrl,
    updateDocumentStatus,
    deleteDocument,
    getSafeErrorMessage,
  };
}
