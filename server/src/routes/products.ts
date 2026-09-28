// ============================================================================
// ReguFlow - Product & ingredient routes
// ============================================================================

import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client";
import {
  businesses,
  ingredients,
  productIngredients,
  products,
  suppliers,
} from "../db/schema";
import { and, desc, eq, ilike } from "drizzle-orm";
import { authenticate, type AuthenticatedRequest } from "../middleware/auth";
import { createAuditLog } from "../modules/audit";
import type { Response } from "express";

async function assertBusinessAccess(
  orgId: string | null,
  businessId: string
): Promise<boolean> {
  const business = await db.query.businesses.findFirst({
    where: eq(businesses.id, businessId),
    columns: { id: true, organizationId: true },
  });
  if (!business) return false;
  return business.organizationId === orgId;
}

// ============================================================ Products ========
export const productsRouter = Router();

const productSchema = z.object({
  business_id: z.string().uuid(),
  name: z.string().min(1, "Nama produk wajib diisi."),
  sku: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  subcategory: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  is_food_or_beverage: z.boolean().default(true),
  is_cosmetic: z.boolean().default(false),
  is_imported: z.boolean().default(false),
  uses_animal_derived_material: z.boolean().default(false),
  uses_alcohol_related_material: z.boolean().default(false),
  simple_production_process: z.boolean().default(true),
  packaging_type: z.string().optional().nullable(),
  sales_channel: z.string().optional().nullable(),
  status: z.string().optional(),
});

// --- GET /api/products?business_id=... ---------------------------------------
productsRouter.get(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const businessId = req.query.business_id as string | undefined;
    const search = (req.query.search as string | undefined)?.trim();

    if (!businessId) {
      res.status(400).json({ error: "business_id wajib diisi." });
      return;
    }

    const hasAccess = await assertBusinessAccess(
      req.user!.orgId,
      businessId
    );
    if (!hasAccess) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    const rows = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.businessId, businessId),
          search ? ilike(products.name, `%${search}%`) : undefined
        )
      )
      .orderBy(desc(products.createdAt));

    res.json(rows);
  }
);

// --- POST /api/products -------------------------------------------------------
productsRouter.post(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({
          error: parsed.error.issues[0]?.message ?? "Input tidak valid.",
        });
      return;
    }

    const input = parsed.data;
    const hasAccess = await assertBusinessAccess(
      req.user!.orgId,
      input.business_id
    );
    if (!hasAccess) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    const [product] = await db
      .insert(products)
      .values({
        businessId: input.business_id,
        name: input.name,
        sku: input.sku ?? null,
        category: input.category ?? null,
        subcategory: input.subcategory ?? null,
        description: input.description ?? null,
        isFoodOrBeverage: input.is_food_or_beverage,
        isCosmetic: input.is_cosmetic,
        isImported: input.is_imported,
        usesAnimalDerivedMaterial: input.uses_animal_derived_material,
        usesAlcoholRelatedMaterial: input.uses_alcohol_related_material,
        simpleProductionProcess: input.simple_production_process,
        packagingType: input.packaging_type ?? null,
        salesChannel: input.sales_channel ?? null,
        status: input.status ?? "active",
      })
      .returning();

    await createAuditLog(req, "create", "product", product!.id);
    res.status(201).json(product);
  }
);

// --- PUT /api/products/:id ----------------------------------------------------
productsRouter.put(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = productSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({
          error: parsed.error.issues[0]?.message ?? "Input tidak valid.",
        });
      return;
    }

    const product = await db.query.products.findFirst({
      where: eq(products.id, req.params.id),
      columns: { id: true, businessId: true },
    });
    if (!product) {
      res.status(404).json({ error: "Produk tidak ditemukan." });
      return;
    }

    const hasAccess = await assertBusinessAccess(
      req.user!.orgId,
      product.businessId
    );
    if (!hasAccess) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    const input = parsed.data;
    const [updated] = await db
      .update(products)
      .set({
        name: input.name,
        sku: input.sku,
        category: input.category,
        subcategory: input.subcategory,
        description: input.description,
        isFoodOrBeverage: input.is_food_or_beverage,
        isCosmetic: input.is_cosmetic,
        isImported: input.is_imported,
        usesAnimalDerivedMaterial: input.uses_animal_derived_material,
        usesAlcoholRelatedMaterial: input.uses_alcohol_related_material,
        simpleProductionProcess: input.simple_production_process,
        packagingType: input.packaging_type,
        salesChannel: input.sales_channel,
        status: input.status,
        updatedAt: new Date(),
      })
      .where(eq(products.id, product.id))
      .returning();

    await createAuditLog(req, "update", "product", product.id);
    res.json(updated);
  }
);

// --- DELETE /api/products/:id -------------------------------------------------
productsRouter.delete(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const product = await db.query.products.findFirst({
      where: eq(products.id, req.params.id),
      columns: { id: true, businessId: true },
    });
    if (!product) {
      res.status(404).json({ error: "Produk tidak ditemukan." });
      return;
    }

    const hasAccess = await assertBusinessAccess(
      req.user!.orgId,
      product.businessId
    );
    if (!hasAccess) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    await db.delete(products).where(eq(products.id, product.id));
    await createAuditLog(req, "delete", "product", product.id);
    res.status(204).end();
  }
);

// ============================================================ Ingredients =====
export const ingredientsRouter = Router();

const ingredientSchema = z.object({
  business_id: z.string().uuid(),
  supplier_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1, "Nama bahan wajib diisi."),
  ingredient_type: z.string().optional().nullable(),
  halal_status: z.string().optional().nullable(),
  halal_certificate_number: z.string().optional().nullable(),
  expiry_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// --- GET /api/ingredients?business_id=... ------------------------------------
ingredientsRouter.get(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const businessId = req.query.business_id as string | undefined;
    if (!businessId) {
      res.status(400).json({ error: "business_id wajib diisi." });
      return;
    }

    const hasAccess = await assertBusinessAccess(
      req.user!.orgId,
      businessId
    );
    if (!hasAccess) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    const rows = await db
      .select()
      .from(ingredients)
      .where(eq(ingredients.businessId, businessId))
      .orderBy(desc(ingredients.createdAt));

    res.json(rows);
  }
);

// --- POST /api/ingredients ----------------------------------------------------
ingredientsRouter.post(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = ingredientSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({
          error: parsed.error.issues[0]?.message ?? "Input tidak valid.",
        });
      return;
    }

    const input = parsed.data;
    const hasAccess = await assertBusinessAccess(
      req.user!.orgId,
      input.business_id
    );
    if (!hasAccess) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    const [ingredient] = await db
      .insert(ingredients)
      .values({
        businessId: input.business_id,
        supplierId: input.supplier_id ?? null,
        name: input.name,
        ingredientType: input.ingredient_type ?? null,
        halalStatus: input.halal_status ?? null,
        halalCertificateNumber: input.halal_certificate_number ?? null,
        expiryDate: input.expiry_date ?? null,
        notes: input.notes ?? null,
      })
      .returning();

    await createAuditLog(req, "create", "ingredient", ingredient!.id);
    res.status(201).json(ingredient);
  }
);

// --- DELETE /api/ingredients/:id ----------------------------------------------
ingredientsRouter.delete(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const ingredient = await db.query.ingredients.findFirst({
      where: eq(ingredients.id, req.params.id),
      columns: { id: true, businessId: true },
    });
    if (!ingredient) {
      res.status(404).json({ error: "Bahan tidak ditemukan." });
      return;
    }

    const hasAccess = await assertBusinessAccess(
      req.user!.orgId,
      ingredient.businessId
    );
    if (!hasAccess) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    await db.delete(ingredients).where(eq(ingredients.id, ingredient.id));
    await createAuditLog(req, "delete", "ingredient", ingredient.id);
    res.status(204).end();
  }
);

// ============================================================ Suppliers =======
export const suppliersRouter = Router();

const supplierSchema = z.object({
  business_id: z.string().uuid(),
  name: z.string().min(1, "Nama supplier wajib diisi."),
  contact_name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  nib: z.string().optional().nullable(),
  has_halal_certificate: z.boolean().default(false),
  halal_certificate_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// --- GET /api/suppliers?business_id=... --------------------------------------
suppliersRouter.get(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const businessId = req.query.business_id as string | undefined;
    if (!businessId) {
      res.status(400).json({ error: "business_id wajib diisi." });
      return;
    }

    const hasAccess = await assertBusinessAccess(
      req.user!.orgId,
      businessId
    );
    if (!hasAccess) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    const rows = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.businessId, businessId))
      .orderBy(desc(suppliers.createdAt));

    res.json(rows);
  }
);

// --- POST /api/suppliers ------------------------------------------------------
suppliersRouter.post(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = supplierSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({
          error: parsed.error.issues[0]?.message ?? "Input tidak valid.",
        });
      return;
    }

    const input = parsed.data;
    const hasAccess = await assertBusinessAccess(
      req.user!.orgId,
      input.business_id
    );
    if (!hasAccess) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    const [supplier] = await db
      .insert(suppliers)
      .values({
        businessId: input.business_id,
        name: input.name,
        contactName: input.contact_name ?? null,
        phone: input.phone ?? null,
        address: input.address ?? null,
        nib: input.nib ?? null,
        hasHalalCertificate: input.has_halal_certificate,
        halalCertificateNumber: input.halal_certificate_number ?? null,
        notes: input.notes ?? null,
      })
      .returning();

    await createAuditLog(req, "create", "supplier", supplier!.id);
    res.status(201).json(supplier);
  }
);

// --- DELETE /api/suppliers/:id ------------------------------------------------
suppliersRouter.delete(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const supplier = await db.query.suppliers.findFirst({
      where: eq(suppliers.id, req.params.id),
      columns: { id: true, businessId: true },
    });
    if (!supplier) {
      res.status(404).json({ error: "Supplier tidak ditemukan." });
      return;
    }

    const hasAccess = await assertBusinessAccess(
      req.user!.orgId,
      supplier.businessId
    );
    if (!hasAccess) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    await db.delete(suppliers).where(eq(suppliers.id, supplier.id));
    await createAuditLog(req, "delete", "supplier", supplier.id);
    res.status(204).end();
  }
);

// --- POST /api/products/:id/ingredients --------------------------------------
productsRouter.post(
  "/:id/ingredients",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = z
      .object({
        ingredient_id: z.string().uuid(),
        quantity: z.number().optional().nullable(),
        unit: z.string().optional().nullable(),
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

    const product = await db.query.products.findFirst({
      where: eq(products.id, req.params.id),
      columns: { id: true, businessId: true },
    });
    if (!product) {
      res.status(404).json({ error: "Produk tidak ditemukan." });
      return;
    }

    const hasAccess = await assertBusinessAccess(
      req.user!.orgId,
      product.businessId
    );
    if (!hasAccess) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    const input = parsed.data;
    const [link] = await db
      .insert(productIngredients)
      .values({
        productId: product.id,
        ingredientId: input.ingredient_id,
        quantity: input.quantity?.toString() ?? null,
        unit: input.unit ?? null,
      })
      .returning();

    res.status(201).json(link);
  }
);
