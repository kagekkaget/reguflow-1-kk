// ============================================================================
// ReguFlow - Document vault routes (upload, list, download, verify, delete)
// ----------------------------------------------------------------------------
// File disimpan di storage private (UPLOAD_DIR); hanya path relatif yang masuk
// DB. Download di-stream setelah cek ownership.
// ============================================================================

import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client";
import { businesses, documents, documentVersions } from "../db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { authenticate, type AuthenticatedRequest } from "../middleware/auth";
import { createAuditLog } from "../modules/audit";
import {
  readUploadedFile,
  uploadSingle,
  type UploadRequest,
} from "../middleware/upload";
import { UPLOAD_DIR } from "../middleware/upload";
import type { Response } from "express";

export const documentsRouter = Router();

const documentMetaSchema = z.object({
  business_id: z.string().uuid().optional().nullable(),
  product_id: z.string().uuid().optional().nullable(),
  document_type: z.string().min(1, "Tipe dokumen wajib diisi."),
  title: z.string().min(1, "Judul wajib diisi."),
  issue_date: z.string().optional().nullable(),
  expiry_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

async function assertOrgAccess(
  orgId: string | null,
  organizationId: string
): Promise<boolean> {
  return orgId === organizationId;
}

async function assertBusinessInOrg(
  orgId: string | null,
  businessId: string | null
): Promise<boolean> {
  if (!businessId) return true;
  const business = await db.query.businesses.findFirst({
    where: eq(businesses.id, businessId),
    columns: { id: true, organizationId: true },
  });
  return Boolean(business && business.organizationId === orgId);
}

// --- GET /api/documents?business_id=... --------------------------------------
documentsRouter.get(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const businessId = (req.query.business_id as string | undefined) ?? null;
    const orgId = req.user!.orgId;
    if (!orgId) {
      res.json([]);
      return;
    }

    const businessAllowed = await assertBusinessInOrg(orgId, businessId ?? null);
    if (!businessAllowed) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    const rows = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.organizationId, orgId),
          businessId ? eq(documents.businessId, businessId) : undefined,
          isNull(documents.deletedAt)
        )
      )
      .orderBy(desc(documents.createdAt));

    res.json(rows);
  }
);

// --- POST /api/documents (multipart: field "file") ----------------------------
documentsRouter.post(
  "/",
  authenticate,
  ...uploadSingle("file"),
  async (req: UploadRequest, res: Response) => {
    const parsed = documentMetaSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({
          error: parsed.error.issues[0]?.message ?? "Input tidak valid.",
        });
      return;
    }

    if (!req.uploadedFile) {
      res.status(400).json({ error: "File wajib diupload." });
      return;
    }

    const orgId = req.user!.orgId;
    if (!orgId) {
      res.status(400).json({ error: "Organisasi belum dikonfigurasi." });
      return;
    }

    const input = parsed.data;
    const businessAllowed = await assertBusinessInOrg(orgId, input.business_id ?? null);
    if (!businessAllowed) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    const uploaded = req.uploadedFile;
    const [doc] = await db
      .insert(documents)
      .values({
        organizationId: orgId,
        businessId: input.business_id ?? null,
        productId: input.product_id ?? null,
        uploadedBy: req.user!.id,
        documentType: input.document_type,
        title: input.title,
        filePath: uploaded.relativePath,
        fileName: uploaded.originalname,
        mimeType: uploaded.mimetype,
        fileSize: uploaded.size,
        issueDate: input.issue_date ?? null,
        expiryDate: input.expiry_date ?? null,
        verificationStatus: "pending",
        notes: input.notes ?? null,
      })
      .returning();

    await db.insert(documentVersions).values({
      documentId: doc!.id,
      filePath: uploaded.relativePath,
      fileName: uploaded.originalname,
      mimeType: uploaded.mimetype,
      fileSize: uploaded.size,
      versionNumber: 1,
      uploadedBy: req.user!.id,
    });

    await createAuditLog(req, "upload", "document", doc!.id, {
      document_type: input.document_type,
      size: uploaded.size,
    });

    res.status(201).json(doc);
  }
);

// --- GET /api/documents/:id/download -----------------------------------------
documentsRouter.get(
  "/:id/download",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const doc = await db.query.documents.findFirst({
      where: and(eq(documents.id, req.params.id), isNull(documents.deletedAt)),
    });
    if (!doc) {
      res.status(404).json({ error: "Dokumen tidak ditemukan." });
      return;
    }

    const hasAccess = await assertOrgAccess(req.user!.orgId, doc.organizationId);
    if (!hasAccess) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    let buffer: Buffer;
    try {
      buffer = await readUploadedFile(doc.filePath);
    } catch {
      res.status(404).json({ error: "File fisik tidak ditemukan." });
      return;
    }

    res.setHeader("Content-Type", doc.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(doc.fileName)}"`
    );
    res.send(buffer);
  }
);

// --- PATCH /api/documents/:id (verify / status) -------------------------------
documentsRouter.patch(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = z
      .object({
        verification_status: z
          .enum(["pending", "valid", "invalid", "revision_needed", "expired"])
          .optional(),
        notes: z.string().optional().nullable(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({
          error: parsed.error.issues[0]?.message ?? "Input tidak valid.",
        });
      return;
    }

    const doc = await db.query.documents.findFirst({
      where: and(eq(documents.id, req.params.id), isNull(documents.deletedAt)),
    });
    if (!doc) {
      res.status(404).json({ error: "Dokumen tidak ditemukan." });
      return;
    }

    const hasAccess = await assertOrgAccess(req.user!.orgId, doc.organizationId);
    if (!hasAccess) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    const input = parsed.data;
    const [updated] = await db
      .update(documents)
      .set({
        verificationStatus: input.verification_status,
        notes: input.notes,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, doc.id))
      .returning();

    await createAuditLog(req, "update", "document", doc.id, {
      verification_status: input.verification_status,
    });

    res.json(updated);
  }
);

// --- DELETE /api/documents/:id (soft delete) ----------------------------------
documentsRouter.delete(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const doc = await db.query.documents.findFirst({
      where: and(eq(documents.id, req.params.id), isNull(documents.deletedAt)),
    });
    if (!doc) {
      res.status(404).json({ error: "Dokumen tidak ditemukan." });
      return;
    }

    const hasAccess = await assertOrgAccess(req.user!.orgId, doc.organizationId);
    if (!hasAccess) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    await db
      .update(documents)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(documents.id, doc.id));

    await createAuditLog(req, "delete", "document", doc.id);
    res.status(204).end();
  }
);

export { UPLOAD_DIR };
