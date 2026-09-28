// ============================================================================
// ReguFlow - Engagement, comment & notification routes
// ============================================================================

import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client";
import { comments, consultantEngagements, notifications } from "../db/schema";
import { and, desc, eq, or } from "drizzle-orm";
import { organizations } from "../db/schema";
import { authenticate, type AuthenticatedRequest } from "../middleware/auth";
import { createAuditLog } from "../modules/audit";
import type { Response } from "express";

// ============================================================ Engagements =====
export const engagementsRouter = Router();

const engagementSchema = z.object({
  business_organization_id: z.string().uuid(),
  consultant_organization_id: z.string().uuid(),
  package_name: z.string().optional().nullable(),
  scope: z.string().optional().nullable(),
  price: z.number().optional().nullable(),
  started_at: z.string().optional().nullable(),
});

// --- GET /api/engagements -----------------------------------------------------
engagementsRouter.get(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const orgId = req.user!.orgId;
    if (!orgId) {
      res.json([]);
      return;
    }

    const rows = await db
      .select({
        id: consultantEngagements.id,
        businessOrganizationId: consultantEngagements.businessOrganizationId,
        consultantOrganizationId: consultantEngagements.consultantOrganizationId,
        packageName: consultantEngagements.packageName,
        scope: consultantEngagements.scope,
        status: consultantEngagements.status,
        price: consultantEngagements.price,
        startedAt: consultantEngagements.startedAt,
        endedAt: consultantEngagements.endedAt,
        createdAt: consultantEngagements.createdAt,
        updatedAt: consultantEngagements.updatedAt,
        businessOrganizationName: organizations.name,
      })
      .from(consultantEngagements)
      .innerJoin(
        organizations,
        eq(organizations.id, consultantEngagements.businessOrganizationId)
      )
      .where(
        or(
          eq(consultantEngagements.businessOrganizationId, orgId),
          // consultant juga bisa lihat engagement-nya
          eq(consultantEngagements.consultantOrganizationId, orgId)
        )
      )
      .orderBy(desc(consultantEngagements.createdAt));

    res.json(rows);
  }
);

// --- POST /api/engagements -----------------------------------------------------
engagementsRouter.post(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = engagementSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({
          error: parsed.error.issues[0]?.message ?? "Input tidak valid.",
        });
      return;
    }

    const orgId = req.user!.orgId;
    if (!orgId) {
      res.status(400).json({ error: "Organisasi belum dikonfigurasi." });
      return;
    }

    const input = parsed.data;
    const [engagement] = await db
      .insert(consultantEngagements)
      .values({
        businessOrganizationId: input.business_organization_id,
        consultantOrganizationId: input.consultant_organization_id,
        packageName: input.package_name ?? null,
        scope: input.scope ?? null,
        price: input.price?.toString() ?? null,
        startedAt: input.started_at ? new Date(input.started_at) : null,
        status: "pending",
      })
      .returning();

    await createAuditLog(req, "create", "engagement", engagement!.id);
    res.status(201).json(engagement);
  }
);

// --- PATCH /api/engagements/:id (update status) -------------------------------
engagementsRouter.patch(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = z
      .object({
        status: z.enum(["pending", "active", "paused", "ended", "cancelled"]),
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

    const engagement = await db.query.consultantEngagements.findFirst({
      where: eq(consultantEngagements.id, req.params.id),
      columns: {
        id: true,
        businessOrganizationId: true,
        consultantOrganizationId: true,
      },
    });
    if (!engagement) {
      res.status(404).json({ error: "Engagement tidak ditemukan." });
      return;
    }

    const orgId = req.user!.orgId;
    if (
      engagement.businessOrganizationId !== orgId &&
      engagement.consultantOrganizationId !== orgId
    ) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    const [updated] = await db
      .update(consultantEngagements)
      .set({
        status: parsed.data.status,
        endedAt: parsed.data.status === "ended" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(consultantEngagements.id, engagement.id))
      .returning();

    await createAuditLog(req, "update", "engagement", engagement.id, {
      status: parsed.data.status,
    });

    res.json(updated);
  }
);

// ============================================================ Comments ========
export const commentsRouter = Router();

const commentSchema = z.object({
  target_type: z.string().min(1, "Target wajib diisi."),
  target_id: z.string().uuid(),
  body: z.string().min(1, "Komentar wajib diisi."),
});

// --- GET /api/comments?target_type=...&target_id=... --------------------------
commentsRouter.get(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const targetType = req.query.target_type as string | undefined;
    const targetId = req.query.target_id as string | undefined;
    if (!targetType || !targetId) {
      res.status(400).json({ error: "target_type & target_id wajib diisi." });
      return;
    }

    const orgId = req.user!.orgId;
    if (!orgId) {
      res.json([]);
      return;
    }

    const rows = await db
      .select()
      .from(comments)
      .where(
        and(
          eq(comments.organizationId, orgId),
          eq(comments.targetType, targetType),
          eq(comments.targetId, targetId)
        )
      )
      .orderBy(desc(comments.createdAt));

    res.json(rows);
  }
);

// --- POST /api/comments --------------------------------------------------------
commentsRouter.post(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = commentSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({
          error: parsed.error.issues[0]?.message ?? "Input tidak valid.",
        });
      return;
    }

    const orgId = req.user!.orgId;
    if (!orgId) {
      res.status(400).json({ error: "Organisasi belum dikonfigurasi." });
      return;
    }

    const input = parsed.data;
    const [comment] = await db
      .insert(comments)
      .values({
        organizationId: orgId,
        targetType: input.target_type,
        targetId: input.target_id,
        body: input.body,
        createdBy: req.user!.id,
      })
      .returning();

    await createAuditLog(req, "create", "comment", comment!.id);
    res.status(201).json(comment);
  }
);

// --- DELETE /api/comments/:id ---------------------------------------------------
commentsRouter.delete(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, req.params.id),
      columns: { id: true, organizationId: true, createdBy: true },
    });
    if (!comment) {
      res.status(404).json({ error: "Komentar tidak ditemukan." });
      return;
    }

    if (comment.organizationId !== req.user!.orgId) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    await db.delete(comments).where(eq(comments.id, comment.id));
    await createAuditLog(req, "delete", "comment", comment.id);
    res.status(204).end();
  }
);

// ============================================================ Notifications ====
export const notificationsRouter = Router();

// --- GET /api/notifications ------------------------------------------------------
notificationsRouter.get(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, req.user!.id))
      .orderBy(desc(notifications.createdAt));

    res.json(rows);
  }
);

// --- PATCH /api/notifications/:id/read -------------------------------------------
notificationsRouter.patch(
  "/:id/read",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const notif = await db.query.notifications.findFirst({
      where: eq(notifications.id, req.params.id),
      columns: { id: true, userId: true },
    });
    if (!notif) {
      res.status(404).json({ error: "Notifikasi tidak ditemukan." });
      return;
    }

    if (notif.userId !== req.user!.id) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notif.id))
      .returning();

    res.json(updated);
  }
);

// --- POST /api/notifications/read-all ---------------------------------------------
notificationsRouter.post(
  "/read-all",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, req.user!.id));

    res.status(204).end();
  }
);
