// ============================================================================
// ReguFlow - Assessment routes (public insert-only, untuk self-assessment)
// ============================================================================

import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client";
import { assessments } from "../db/schema";
import { desc } from "drizzle-orm";
import { requireAdmin, type AuthenticatedRequest } from "../middleware/auth";
import type { Response } from "express";

export const assessmentsRouter = Router();

const assessmentSchema = z.object({
  business_name: z.string().min(1, "Nama usaha wajib diisi."),
  owner_name: z.string().min(1, "Nama pemilik wajib diisi."),
  whatsapp: z.string().min(5, "WhatsApp wajib diisi."),
  email: z.string().email().optional(),
  city: z.string().min(1, "Kota wajib diisi."),
  business_type: z.string().optional(),
  product_type: z.string().optional(),
  has_nib: z.boolean().default(false),
  has_halal_certificate: z.boolean().default(false),
  has_spp_irt: z.boolean().default(false),
  has_product_label: z.boolean().default(false),
  has_ingredient_list: z.boolean().default(false),
  has_product_photo: z.boolean().default(false),
});

// --- POST /api/assessments (public) -----------------------------------------
assessmentsRouter.post("/", async (req: AuthenticatedRequest, res: Response) => {
  const parsed = assessmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: parsed.error.issues[0]?.message ?? "Input tidak valid." });
    return;
  }

  const input = parsed.data;

  // Hitung skor sederhana dari 6 kriteria utama
  const flags = [
    input.has_nib,
    input.has_halal_certificate,
    input.has_spp_irt,
    input.has_product_label,
    input.has_ingredient_list,
    input.has_product_photo,
  ];
  const score = Math.round((flags.filter(Boolean).length / flags.length) * 100);

  const [row] = await db
    .insert(assessments)
    .values({
      businessName: input.business_name,
      ownerName: input.owner_name,
      whatsapp: input.whatsapp,
      email: input.email ?? null,
      city: input.city,
      businessType: input.business_type ?? null,
      productType: input.product_type ?? null,
      hasNib: input.has_nib,
      hasHalalCertificate: input.has_halal_certificate,
      hasSppIrt: input.has_spp_irt,
      hasProductLabel: input.has_product_label,
      hasIngredientList: input.has_ingredient_list,
      hasProductPhoto: input.has_product_photo,
      score,
      resultJson: { flags, score },
    })
    .returning({ id: assessments.id, score: assessments.score });

  res.status(201).json({ id: row!.id, score: row!.score });
});

// --- GET /api/assessments (admin) ---------------------------------------------
assessmentsRouter.get("/", requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  const rows = await db
    .select({
      id: assessments.id,
      businessName: assessments.businessName,
      ownerName: assessments.ownerName,
      whatsapp: assessments.whatsapp,
      email: assessments.email,
      city: assessments.city,
      businessType: assessments.businessType,
      productType: assessments.productType,
      hasNib: assessments.hasNib,
      hasHalalCertificate: assessments.hasHalalCertificate,
      hasSppIrt: assessments.hasSppIrt,
      hasProductLabel: assessments.hasProductLabel,
      hasIngredientList: assessments.hasIngredientList,
      hasProductPhoto: assessments.hasProductPhoto,
      score: assessments.score,
      resultJson: assessments.resultJson,
      createdAt: assessments.createdAt,
    })
    .from(assessments)
    .orderBy(desc(assessments.createdAt))
    .limit(50);

  res.json(rows);
});
