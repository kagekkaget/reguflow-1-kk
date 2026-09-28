// ============================================================================
// ReguFlow - Organization routes
// ----------------------------------------------------------------------------
// RBAC: user hanya bisa melihat & mengelola organisasi tempat dia member aktif.
// ============================================================================

import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client";
import {
  organizations,
  organizationMembers,
  users,
  businesses,
  products,
  tasks,
  complianceCases,
  consultantEngagements,
} from "../db/schema";
import { and, asc, desc, eq, inArray, or } from "drizzle-orm";
import {
  authenticate,
  requireOwner,
  type AuthenticatedRequest,
} from "../middleware/auth";
import { createAuditLog } from "../modules/audit";
import type { Response } from "express";

export const organizationsRouter = Router();

// --- GET /api/organizations --------------------------------------------------
organizationsRouter.get(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const rows = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        type: organizations.type,
        role: organizationMembers.role,
        createdAt: organizations.createdAt,
      })
      .from(organizations)
      .innerJoin(
        organizationMembers,
        eq(organizations.id, organizationMembers.organizationId)
      )
      .where(
        and(
          eq(organizationMembers.userId, req.user!.id),
          eq(organizationMembers.status, "active")
        )
      )
      .orderBy(desc(organizations.createdAt));

    res.json(rows);
  }
);

// --- GET /api/organizations/consultants (directory) -------------------------
organizationsRouter.get(
  "/consultants",
  authenticate,
  async (_req: AuthenticatedRequest, res: Response) => {
    const rows = await db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(eq(organizations.type, "consultant_agency"))
      .orderBy(asc(organizations.name));

    res.json(rows);
  }
);

// --- GET /api/organizations/:id ----------------------------------------------
organizationsRouter.get(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const membership = await db
      .select({
        organizationId: organizationMembers.organizationId,
        role: organizationMembers.role,
      })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, req.params.id),
          eq(organizationMembers.userId, req.user!.id),
          eq(organizationMembers.status, "active")
        )
      )
      .limit(1);

    if (membership.length === 0) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, req.params.id),
    });
    if (!org) {
      res.status(404).json({ error: "Organisasi tidak ditemukan." });
      return;
    }

    res.json({ ...org, role: membership[0]!.role });
  }
);

// --- GET /api/organizations/:id/members --------------------------------------
organizationsRouter.get(
  "/:id/members",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const membership = await db
      .select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, req.params.id),
          eq(organizationMembers.userId, req.user!.id),
          eq(organizationMembers.status, "active")
        )
      )
      .limit(1);

    if (membership.length === 0) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    const members = await db
      .select({
        id: organizationMembers.id,
        userId: users.id,
        email: users.email,
        fullName: users.fullName,
        role: organizationMembers.role,
        status: organizationMembers.status,
        createdAt: organizationMembers.createdAt,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .where(eq(organizationMembers.organizationId, req.params.id))
      .orderBy(desc(organizationMembers.createdAt));

    res.json(members);
  }
);

// --- POST /api/organizations/:id/members -------------------------------------
organizationsRouter.post(
  "/:id/members",
  authenticate,
  requireOwner,
  async (req: AuthenticatedRequest, res: Response) => {
    const { email, role } = req.body as { email?: string; role?: string };
    if (!email) {
      res.status(400).json({ error: "Email member wajib diisi." });
      return;
    }

    // Owner harus member organisasi ini
    const ownerMembership = await db
      .select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, req.params.id),
          eq(organizationMembers.userId, req.user!.id),
          eq(organizationMembers.status, "active")
        )
      )
      .limit(1);

    if (ownerMembership.length === 0) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    const invitee = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true },
    });
    if (!invitee) {
      res.status(404).json({ error: "User belum terdaftar." });
      return;
    }

    const existing = await db
      .select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, req.params.id),
          eq(organizationMembers.userId, invitee.id)
        )
      )
      .limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "User sudah menjadi member." });
      return;
    }

    const [member] = await db
      .insert(organizationMembers)
      .values({
        organizationId: req.params.id,
        userId: invitee.id,
        role: (role ?? "staff") as "owner" | "staff" | "consultant" | "admin" | "viewer",
        status: "active",
      })
      .returning({ id: organizationMembers.id });

    await createAuditLog(req, "create", "organization_member", member!.id, {
      email,
      role,
    });

    res.status(201).json({ id: member!.id, email, role: role ?? "staff" });
  }
);

// --- DELETE /api/organizations/:id/members/:memberId -------------------------
organizationsRouter.delete(
  "/:id/members/:memberId",
  authenticate,
  requireOwner,
  async (req: AuthenticatedRequest, res: Response) => {
    const member = await db
      .select({
        id: organizationMembers.id,
        userId: organizationMembers.userId,
      })
      .from(organizationMembers)
      .where(eq(organizationMembers.id, req.params.memberId))
      .limit(1);

    if (member.length === 0 || member[0]!.userId === req.user!.id) {
      res.status(400).json({ error: "Tidak bisa menghapus member ini." });
      return;
    }

    await db
      .delete(organizationMembers)
      .where(eq(organizationMembers.id, req.params.memberId));

    await createAuditLog(req, "delete", "organization_member", req.params.memberId);

    res.status(204).end();
  }
);

// --- GET /api/organizations/:id/businesses (consultant access via engagement) --
async function assertEngagementAccess(
  userId: string,
  orgId: string
): Promise<boolean> {
  const row = await db
    .select({ id: consultantEngagements.id })
    .from(consultantEngagements)
    .where(
      or(
        and(
          eq(consultantEngagements.businessOrganizationId, orgId),
          eq(consultantEngagements.consultantOrganizationId, userId)
        ),
        and(
          eq(consultantEngagements.consultantOrganizationId, orgId),
          eq(consultantEngagements.businessOrganizationId, userId)
        )
      )
    )
    .limit(1);
  return row.length > 0;
}

organizationsRouter.get(
  "/:id/businesses",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const orgId = req.params.id;
    const hasAccess =
      req.user!.orgId === orgId || (await assertEngagementAccess(req.user!.id, orgId));
    if (!hasAccess) {
      res.status(403).json({ error: "Kamu tidak memiliki akses ke organisasi ini." });
      return;
    }

    const rows = await db
      .select()
      .from(businesses)
      .where(eq(businesses.organizationId, orgId))
      .orderBy(desc(businesses.createdAt));

    res.json(rows);
  }
);

organizationsRouter.get(
  "/:id/tasks",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const orgId = req.params.id;
    const hasAccess =
      req.user!.orgId === orgId || (await assertEngagementAccess(req.user!.id, orgId));
    if (!hasAccess) {
      res.status(403).json({ error: "Kamu tidak memiliki akses ke organisasi ini." });
      return;
    }

    const rows = await db
      .select()
      .from(tasks)
      .where(eq(tasks.organizationId, orgId))
      .orderBy(desc(tasks.createdAt));

    res.json(rows);
  }
);

organizationsRouter.get(
  "/:id/compliance-cases",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const orgId = req.params.id;
    const hasAccess =
      req.user!.orgId === orgId || (await assertEngagementAccess(req.user!.id, orgId));
    if (!hasAccess) {
      res.status(403).json({ error: "Kamu tidak memiliki akses ke organisasi ini." });
      return;
    }

    const allBusinesses = await db
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.organizationId, orgId));

    if (allBusinesses.length === 0) {
      res.json([]);
      return;
    }

    const businessIds = allBusinesses.map((b) => b.id);
    const rows = await db
      .select()
      .from(complianceCases)
      .where(
        businessIds.length === 1
          ? eq(complianceCases.businessId, businessIds[0]!)
          : inArray(complianceCases.businessId, businessIds)
      )
      .orderBy(desc(complianceCases.updatedAt));

    res.json(rows);
  }
);

// --- GET /api/organizations/:id/products (consultant access via engagement) ----
organizationsRouter.get(
  "/:id/products",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const orgId = req.params.id;
    const hasAccess =
      req.user!.orgId === orgId || (await assertEngagementAccess(req.user!.id, orgId));
    if (!hasAccess) {
      res.status(403).json({ error: "Kamu tidak memiliki akses ke organisasi ini." });
      return;
    }

    const allBusinesses = await db
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.organizationId, orgId));

    if (allBusinesses.length === 0) {
      res.json([]);
      return;
    }

    const businessIds = allBusinesses.map((b) => b.id);
    const rows = await db
      .select()
      .from(products)
      .where(
        businessIds.length === 1
          ? eq(products.businessId, businessIds[0]!)
          : inArray(products.businessId, businessIds)
      )
      .orderBy(desc(products.createdAt));

    res.json(rows);
  }
);

// --- POST /api/organizations/:id/tasks (consultant access via engagement) -----
organizationsRouter.post(
  "/:id/tasks",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const orgId = req.params.id;
    const hasAccess =
      req.user!.orgId === orgId || (await assertEngagementAccess(req.user!.id, orgId));
    if (!hasAccess) {
      res.status(403).json({ error: "Kamu tidak memiliki akses ke organisasi ini." });
      return;
    }

    const parsed = z
      .object({
        title: z.string().min(1, "Judul tugas wajib diisi."),
        description: z.string().optional().nullable(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        status: z.enum(["todo", "in_progress", "done", "cancelled"]).optional(),
        due_date: z.string().optional().nullable(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message ?? "Input tidak valid." });
      return;
    }

    const input = parsed.data;
    const [task] = await db
      .insert(tasks)
      .values({
        organizationId: orgId,
        title: input.title,
        description: input.description ?? null,
        status: input.status ?? "todo",
        priority: input.priority ?? "medium",
        assignedTo: null,
        dueDate: input.due_date ?? null,
        createdBy: req.user!.id,
      })
      .returning();

    await createAuditLog(req, "create", "task", task!.id);
    res.status(201).json(task);
  }
);
