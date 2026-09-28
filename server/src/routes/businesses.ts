// ============================================================================
// ReguFlow - Business routes
// ----------------------------------------------------------------------------
// Ownership: user hanya bisa melihat/mengubah business dari organisasinya.
// ============================================================================

import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client";
import { businesses, organizationMembers } from "../db/schema";
import { and, desc, eq, ilike } from "drizzle-orm";
import { authenticate, type AuthenticatedRequest } from "../middleware/auth";
import { createAuditLog } from "../modules/audit";
import type { Response } from "express";

export const businessesRouter = Router();

const upsertSchema = z.object({
  legal_name: z.string().min(1, "Nama badan usaha wajib diisi."),
  brand_name: z.string().optional().nullable(),
  nib: z.string().optional().nullable(),
  npwp: z.string().optional().nullable(),
  entity_type: z.string().optional().nullable(),
  business_scale: z.string().optional().nullable(),
  annual_revenue: z.number().optional().nullable(),
  employee_count: z.number().int().optional().nullable(),
  address: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  kbli: z.string().optional().nullable(),
  status: z.string().optional(),
});

async function assertMembership(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const row = await db
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.status, "active")
      )
    )
    .limit(1);
  return row.length > 0;
}

// --- GET /api/businesses ------------------------------------------------------
businessesRouter.get(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const search = (req.query.search as string | undefined)?.trim();
    const orgId = req.user!.orgId;
    if (!orgId) {
      res.json([]);
      return;
    }

    const rows = await db
      .select()
      .from(businesses)
      .where(
        and(
          eq(businesses.organizationId, orgId),
          search ? ilike(businesses.legalName, `%${search}%`) : undefined
        )
      )
      .orderBy(desc(businesses.createdAt));

    res.json(rows);
  }
);

// --- GET /api/businesses/:id --------------------------------------------------
businessesRouter.get(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const business = await db.query.businesses.findFirst({
      where: eq(businesses.id, req.params.id),
    });
    if (!business) {
      res.status(404).json({ error: "Business tidak ditemukan." });
      return;
    }

    const hasAccess = await assertMembership(req.user!.id, business.organizationId);
    if (!hasAccess) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    res.json(business);
  }
);

// --- POST /api/businesses -----------------------------------------------------
businessesRouter.post(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = upsertSchema.safeParse(req.body);
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
      res
        .status(400)
        .json({ error: "Selesaikan onboarding organisasi terlebih dahulu." });
      return;
    }

    const input = parsed.data;
    const [business] = await db
      .insert(businesses)
      .values({
        organizationId: orgId,
        legalName: input.legal_name,
        brandName: input.brand_name ?? null,
        nib: input.nib ?? null,
        npwp: input.npwp ?? null,
        entityType: input.entity_type ?? null,
        businessScale: input.business_scale ?? null,
        annualRevenue: input.annual_revenue?.toString() ?? null,
        employeeCount: input.employee_count ?? 0,
        address: input.address ?? null,
        province: input.province ?? null,
        city: input.city ?? null,
        postalCode: input.postal_code ?? null,
        kbli: input.kbli ?? null,
        status: input.status ?? "active",
      })
      .returning();

    await createAuditLog(req, "create", "business", business!.id);
    res.status(201).json(business);
  }
);

// --- PUT /api/businesses/:id --------------------------------------------------
businessesRouter.put(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = upsertSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({
          error: parsed.error.issues[0]?.message ?? "Input tidak valid.",
        });
      return;
    }

    const business = await db.query.businesses.findFirst({
      where: eq(businesses.id, req.params.id),
      columns: { id: true, organizationId: true },
    });
    if (!business) {
      res.status(404).json({ error: "Business tidak ditemukan." });
      return;
    }

    const hasAccess = await assertMembership(req.user!.id, business.organizationId);
    if (!hasAccess) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    const input = parsed.data;
    const [updated] = await db
      .update(businesses)
      .set({
        legalName: input.legal_name,
        brandName: input.brand_name,
        nib: input.nib,
        npwp: input.npwp,
        entityType: input.entity_type,
        businessScale: input.business_scale,
        annualRevenue: input.annual_revenue?.toString(),
        employeeCount: input.employee_count,
        address: input.address,
        province: input.province,
        city: input.city,
        postalCode: input.postal_code,
        kbli: input.kbli,
        status: input.status,
        updatedAt: new Date(),
      })
      .where(eq(businesses.id, business.id))
      .returning();

    await createAuditLog(req, "update", "business", business.id);
    res.json(updated);
  }
);

// --- DELETE /api/businesses/:id -----------------------------------------------
businessesRouter.delete(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const business = await db.query.businesses.findFirst({
      where: eq(businesses.id, req.params.id),
      columns: { id: true, organizationId: true },
    });
    if (!business) {
      res.status(404).json({ error: "Business tidak ditemukan." });
      return;
    }

    const hasAccess = await assertMembership(req.user!.id, business.organizationId);
    if (!hasAccess) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    await db.delete(businesses).where(eq(businesses.id, business.id));
    await createAuditLog(req, "delete", "business", business.id);
    res.status(204).end();
  }
);
