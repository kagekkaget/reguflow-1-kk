// ============================================================================
// ReguFlow - Compliance routes (domains, requirements, cases, checklist)
// ============================================================================

import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client";
import {
  businesses,
  checklistItems,
  complianceCases,
  complianceDomains,
  consultantEngagements,
  products,
  requirements,
} from "../db/schema";
import { and, asc, desc, eq, or } from "drizzle-orm";
import { authenticate, type AuthenticatedRequest } from "../middleware/auth";
import { createAuditLog } from "../modules/audit";
import type { Response } from "express";

export const complianceRouter = Router();

async function assertBusinessAccess(
  orgId: string | null,
  businessId: string
): Promise<boolean> {
  const business = await db.query.businesses.findFirst({
    where: eq(businesses.id, businessId),
    columns: { id: true, organizationId: true },
  });
  return Boolean(business && business.organizationId === orgId);
}

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

// --- GET /api/compliance/domains ---------------------------------------------
complianceRouter.get(
  "/domains",
  authenticate,
  async (_req: AuthenticatedRequest, res: Response) => {
    const rows = await db
      .select()
      .from(complianceDomains)
      .orderBy(asc(complianceDomains.name));
    res.json(rows);
  }
);

// --- GET /api/compliance/requirements?domain_code=... -------------------------
complianceRouter.get(
  "/requirements",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const domainCode = req.query.domain_code as string | undefined;
    const rows = await db
      .select()
      .from(requirements)
      .where(
        domainCode ? eq(requirements.domainCode, domainCode) : undefined
      )
      .orderBy(asc(requirements.sortOrder), asc(requirements.name));
    res.json(rows);
  }
);

const caseSchema = z.object({
  business_id: z.string().uuid(),
  product_id: z.string().uuid().optional().nullable(),
  domain_code: z.string().min(1, "Domain wajib diisi."),
  pathway: z.string().optional().nullable(),
  title: z.string().min(1, "Judul wajib diisi."),
  due_date: z.string().optional().nullable(),
});

// --- GET /api/compliance/cases?business_id=... --------------------------------
complianceRouter.get(
  "/cases",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const businessId = req.query.business_id as string | undefined;
    if (!businessId) {
      res.status(400).json({ error: "business_id wajib diisi." });
      return;
    }

    const hasAccess = await assertBusinessAccess(req.user!.orgId, businessId);
    if (!hasAccess) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    const rows = await db
      .select({
        id: complianceCases.id,
        businessId: complianceCases.businessId,
        productId: complianceCases.productId,
        domainCode: complianceCases.domainCode,
        pathway: complianceCases.pathway,
        title: complianceCases.title,
        status: complianceCases.status,
        score: complianceCases.score,
        dueDate: complianceCases.dueDate,
        assignedConsultantId: complianceCases.assignedConsultantId,
        createdAt: complianceCases.createdAt,
        updatedAt: complianceCases.updatedAt,
        productName: products.name,
      })
      .from(complianceCases)
      .leftJoin(products, eq(products.id, complianceCases.productId))
      .where(eq(complianceCases.businessId, businessId))
      .orderBy(desc(complianceCases.updatedAt));

    res.json(rows);
  }
);

// --- POST /api/compliance/cases ------------------------------------------------
complianceRouter.post(
  "/cases",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = caseSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({
          error: parsed.error.issues[0]?.message ?? "Input tidak valid.",
        });
      return;
    }

    const input = parsed.data;
    const hasAccess = await assertBusinessAccess(req.user!.orgId, input.business_id);
    if (!hasAccess) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    const [caseRow] = await db
      .insert(complianceCases)
      .values({
        businessId: input.business_id,
        productId: input.product_id ?? null,
        domainCode: input.domain_code,
        pathway: input.pathway ?? null,
        title: input.title,
        status: "not_started",
        dueDate: input.due_date ?? null,
      })
      .returning();

    // Auto-generate checklist dari requirements domain ini
    const domainRequirements = await db
      .select()
      .from(requirements)
      .where(eq(requirements.domainCode, input.domain_code))
      .orderBy(asc(requirements.sortOrder));

    if (domainRequirements.length > 0) {
      await db.insert(checklistItems).values(
        domainRequirements.map((r, index) => ({
          complianceCaseId: caseRow!.id,
          requirementId: r.id,
          title: r.name,
          description: r.description ?? null,
          status: "todo" as const,
          sortOrder: index,
        }))
      );
    }

    await createAuditLog(req, "create", "compliance_case", caseRow!.id);
    res.status(201).json(caseRow);
  }
);

// --- GET /api/compliance/cases/:id --------------------------------------------
complianceRouter.get(
  "/cases/:id",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const caseRow = await db.query.complianceCases.findFirst({
      where: eq(complianceCases.id, req.params.id),
    });
    if (!caseRow) {
      res.status(404).json({ error: "Case tidak ditemukan." });
      return;
    }

    const hasAccess = await assertBusinessAccess(req.user!.orgId, caseRow.businessId);
    if (!hasAccess) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    res.json(caseRow);
  }
);

// --- PATCH /api/compliance/cases/:id (update status) --------------------------------
complianceRouter.patch(
  "/cases/:id",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = z
      .object({
        status: z.enum(["not_started", "data_collected", "internal_review", "consultant_review", "ready_to_submit", "submitted", "revision", "approved", "expired"]),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message ?? "Input tidak valid." });
      return;
    }

    const caseRow = await db.query.complianceCases.findFirst({
      where: eq(complianceCases.id, req.params.id),
      columns: { id: true, businessId: true },
    });
    if (!caseRow) {
      res.status(404).json({ error: "Case tidak ditemukan." });
      return;
    }

    const business = await db.query.businesses.findFirst({
      where: eq(businesses.id, caseRow.businessId),
      columns: { organizationId: true },
    });
    const hasAccess =
      (await assertBusinessAccess(req.user!.orgId, caseRow.businessId)) ||
      (business &&
        (await assertEngagementAccess(req.user!.id, business.organizationId)));
    if (!hasAccess) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    const [updated] = await db
      .update(complianceCases)
      .set({
        status: parsed.data.status,
        updatedAt: new Date(),
      })
      .where(eq(complianceCases.id, caseRow.id))
      .returning();

    await createAuditLog(req, "update", "compliance_case", caseRow.id, {
      status: parsed.data.status,
    });

    res.json(updated);
  }
);

// --- GET /api/compliance/cases/:id/checklist ----------------------------------
complianceRouter.get(
  "/cases/:id/checklist",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const caseRow = await db.query.complianceCases.findFirst({
      where: eq(complianceCases.id, req.params.id),
      columns: { id: true, businessId: true },
    });
    if (!caseRow) {
      res.status(404).json({ error: "Case tidak ditemukan." });
      return;
    }

    const hasAccess = await assertBusinessAccess(req.user!.orgId, caseRow.businessId);
    if (!hasAccess) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    const items = await db
      .select()
      .from(checklistItems)
      .where(eq(checklistItems.complianceCaseId, caseRow.id))
      .orderBy(asc(checklistItems.sortOrder));

    res.json(items);
  }
);

// --- PATCH /api/compliance/cases/:caseId/checklist/:itemId ---------------------
complianceRouter.patch(
  "/cases/:caseId/checklist/:itemId",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = z
      .object({
        status: z.enum(["todo", "in_progress", "done", "blocked"]),
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

    const caseRow = await db.query.complianceCases.findFirst({
      where: eq(complianceCases.id, req.params.caseId),
      columns: { id: true, businessId: true },
    });
    if (!caseRow) {
      res.status(404).json({ error: "Case tidak ditemukan." });
      return;
    }

    const hasAccess = await assertBusinessAccess(req.user!.orgId, caseRow.businessId);
    if (!hasAccess) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    const [updated] = await db
      .update(checklistItems)
      .set({
        status: parsed.data.status,
        completedAt: parsed.data.status === "done" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(checklistItems.id, req.params.itemId))
      .returning();

    // Update skor case berdasarkan progres checklist
    const allItems = await db
      .select({ status: checklistItems.status })
      .from(checklistItems)
      .where(eq(checklistItems.complianceCaseId, caseRow.id));
    const done = allItems.filter((i) => i.status === "done").length;
    const score =
      allItems.length > 0 ? Math.round((done / allItems.length) * 100) : 0;

    await db
      .update(complianceCases)
      .set({
        score,
        status:
          score === 100
            ? "ready_to_submit"
            : score > 0
              ? "data_collected"
              : "not_started",
        updatedAt: new Date(),
      })
      .where(eq(complianceCases.id, caseRow.id));

    await createAuditLog(req, "update", "checklist_item", req.params.itemId, {
      status: parsed.data.status,
    });

    res.json(updated);
  }
);
