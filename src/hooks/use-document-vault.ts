// ============================================================================
// ReguFlow - Document vault hook (REST API multipart + private download)
// ----------------------------------------------------------------------------
// Keamanan:
// - File divalidasi (tipe, ukuran, nama) di client SEBELUM upload, dan
//   divalidasi lagi di server (defense in depth).
// - Upload via multipart ke /api/documents; file disimpan di storage private.
// - Preview/download via endpoint /api/documents/:id/download yang memeriksa
//   ownership di server. Tidak ada public URL.
// - Setiap aksi dicatat di audit_logs oleh server.
// ============================================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, API_URL, getAccessToken } from "@/lib/api/client";
import { useAuthStore } from "@/lib/api/auth-store";
import { queryKeys, useDocuments } from "@/hooks/use-queries";
import { validateUploadedFile, sanitizeFileName } from "@/lib/security";
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

type ApiDocument = Parameters<typeof mapToDocumentRow>[0];

// Mapper camelCase → snake_case (lihat use-queries.ts untuk pola yang sama).
function mapToDocumentRow(d: {
  id: string;
  organizationId: string;
  businessId: string | null;
  productId: string | null;
  uploadedBy: string | null;
  documentType: string;
  title: string;
  filePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  issueDate: string | null;
  expiryDate: string | null;
  verificationStatus: DocumentStatus;
  notes: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}): DocumentRow {
  return {
    id: d.id,
    organization_id: d.organizationId,
    business_id: d.businessId,
    product_id: d.productId,
    uploaded_by: d.uploadedBy,
    document_type: d.documentType,
    title: d.title,
    file_path: d.filePath,
    file_name: d.fileName,
    mime_type: d.mimeType,
    file_size: d.fileSize,
    issue_date: d.issueDate,
    expiry_date: d.expiryDate,
    verification_status: d.verificationStatus,
    notes: d.notes,
    deleted_at: d.deletedAt,
    created_at: d.createdAt,
    updated_at: d.updatedAt,
  };
}

export function useDocumentVault() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const { data: documents = [] } = useDocuments();

  const uploadDocument = useMutation({
    mutationFn: async (input: UploadDocumentInput): Promise<DocumentRow> => {
      if (!orgId) throw new Error("Organisasi tidak ditemukan. Coba login ulang.");

      const validation = validateUploadedFile(input.file);
      if (!validation.ok) {
        throw new Error(validation.error ?? "Jenis file tidak didukung.");
      }

      const formData = new FormData();
      formData.append("file", input.file, sanitizeFileName(input.file.name));
      formData.append("document_type", input.documentType);
      formData.append("title", input.title);
      if (input.businessId) formData.append("business_id", input.businessId);
      if (input.productId) formData.append("product_id", input.productId);
      if (input.issueDate) formData.append("issue_date", input.issueDate);
      if (input.expiryDate) formData.append("expiry_date", input.expiryDate);
      if (input.notes) formData.append("notes", input.notes);

      const data = await api.post<ApiDocument>("/api/documents", formData);
      return mapToDocumentRow(data);
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
      // Server memeriksa ownership sebelum mengirim file. Karena fetch dengan
      // credentials diperlukan, kita unduh sebagai blob lalu buat object URL.
      const response = await fetch(
        `${API_URL}/api/documents/${doc.id}/download`,
        {
          method: "GET",
          credentials: "include",
          headers: getAccessToken()
            ? { Authorization: `Bearer ${getAccessToken()}` }
            : undefined,
        }
      );

      if (!response.ok) {
        throw new Error("Gagal mengakses dokumen. Coba lagi.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      // Untuk action download, picu unduhan otomatis lalu revoke object URL.
      if (action === "download") {
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = doc.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        return objectUrl;
      }

      return objectUrl;
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
      await api.patch(`/api/documents/${docId}`, {
        verification_status: status,
        notes: notes ?? undefined,
        expiry_date: expiryDate ?? undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents });
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (doc: DocumentRow): Promise<void> => {
      if (!orgId) throw new Error("Organisasi tidak ditemukan.");
      await api.delete(`/api/documents/${doc.id}`);
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
