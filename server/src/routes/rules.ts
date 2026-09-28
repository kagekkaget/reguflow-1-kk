import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client";
import { complianceRules, complianceDomains } from "../db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { requireAdmin, type AuthenticatedRequest } from "../middleware/auth";
import { createAuditLog } from "../modules/audit";
import type { Response } from "express";

export const rulesRouter = Router();

const ruleSchema = z.object({
  code: z.string().min(1, "Kode rule wajib diisi."),
  domain_code: z.string().optional().nullable(),
  title: z.string().min(1, "Judul wajib diisi."),
  description: z.string().optional().nullable(),
  priority: z.number().int().optional(),
  is_active: z.boolean().optional(),
  condition_json: z.record(z.unknown()).optional(),
  action_json: z.record(z.unknown()).optional(),
});

rulesRouter.get("/", requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  const rows = await db
    .select({
      id: complianceRules.id,
      domainId: complianceRules.domainId,
      code: complianceRules.code,
      title: complianceRules.title,
      description: complianceRules.description,
      conditionJson: complianceRules.conditionJson,
      actionJson: complianceRules.actionJson,
      priority: complianceRules.priority,
      effectiveFrom: complianceRules.effectiveFrom,
      effectiveUntil: complianceRules.effectiveUntil,
      version: complianceRules.version,
      isActive: complianceRules.isActive,
      createdAt: complianceRules.createdAt,
      updatedAt: complianceRules.updatedAt,
    })
    .from(complianceRules)
    .orderBy(desc(complianceRules.priority), asc(complianceRules.createdAt));

  res.json(rows);
});

rulesRouter.post("/", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = ruleSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: parsed.error.issues[0]?.message ?? "Input tidak valid." });
    return;
  }

  const input = parsed.data;

  let domainId: string | null = null;
  if (input.domain_code) {
    const domain = await db
      .select({ id: complianceDomains.id })
      .from(complianceDomains)
      .where(eq(complianceDomains.code, input.domain_code))
      .limit(1);
    domainId = domain[0]?.id ?? null;
  }

  const [rule] = await db
    .insert(complianceRules)
    .values({
      domainId,
      code: input.code,
      title: input.title,
      description: input.description,
      priority: input.priority ?? 50,
      isActive: input.is_active ?? true,
      conditionJson: input.condition_json ?? {},
      actionJson: input.action_json ?? {},
    })
    .returning({
      id: complianceRules.id,
      domainId: complianceRules.domainId,
      code: complianceRules.code,
      title: complianceRules.title,
      description: complianceRules.description,
      conditionJson: complianceRules.conditionJson,
      actionJson: complianceRules.actionJson,
      priority: complianceRules.priority,
      effectiveFrom: complianceRules.effectiveFrom,
      effectiveUntil: complianceRules.effectiveUntil,
      version: complianceRules.version,
      isActive: complianceRules.isActive,
      createdAt: complianceRules.createdAt,
      updatedAt: complianceRules.updatedAt,
    });

  await createAuditLog(req, "create", "compliance_rule", rule!.id);
  res.status(201).json(rule);
});

rulesRouter.patch("/:id", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = ruleSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: parsed.error.issues[0]?.message ?? "Input tidak valid." });
    return;
  }

  const input = parsed.data;

   let domainId: string | null | undefined;
   if (input.domain_code !== undefined) {
     if (input.domain_code) {
       const domain = await db
         .select({ id: complianceDomains.id })
         .from(complianceDomains)
         .where(eq(complianceDomains.code, input.domain_code))
         .limit(1);
       domainId = domain[0]?.id ?? null;
     } else {
       domainId = null;
     }
   }

  const [updated] = await db
    .update(complianceRules)
    .set({
      ...(input.code && { code: input.code }),
      domainId,
      ...(input.title && { title: input.title }),
      description: input.description,
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.is_active !== undefined && { isActive: input.is_active }),
      ...(input.condition_json && { conditionJson: input.condition_json }),
      ...(input.action_json && { actionJson: input.action_json }),
      updatedAt: new Date(),
    })
    .where(eq(complianceRules.id, req.params.id))
    .returning({
      id: complianceRules.id,
      domainId: complianceRules.domainId,
      code: complianceRules.code,
      title: complianceRules.title,
      description: complianceRules.description,
      conditionJson: complianceRules.conditionJson,
      actionJson: complianceRules.actionJson,
      priority: complianceRules.priority,
      effectiveFrom: complianceRules.effectiveFrom,
      effectiveUntil: complianceRules.effectiveUntil,
      version: complianceRules.version,
      isActive: complianceRules.isActive,
      createdAt: complianceRules.createdAt,
      updatedAt: complianceRules.updatedAt,
    });

  if (!updated) {
    res.status(404).json({ error: "Rule tidak ditemukan." });
    return;
  }

  await createAuditLog(req, "update", "compliance_rule", req.params.id);
  res.json(updated);
});

rulesRouter.delete("/:id", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const [deleted] = await db
    .delete(complianceRules)
    .where(eq(complianceRules.id, req.params.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Rule tidak ditemukan." });
    return;
  }

  await createAuditLog(req, "delete", "compliance_rule", req.params.id);
  res.status(204).end();
});
