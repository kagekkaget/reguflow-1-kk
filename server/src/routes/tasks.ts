// ============================================================================
// ReguFlow - Task & reminder routes
// ============================================================================

import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client";
import { complianceCases, reminders, tasks } from "../db/schema";
import { and, asc, desc, eq } from "drizzle-orm";
import { authenticate, type AuthenticatedRequest } from "../middleware/auth";
import { createAuditLog } from "../modules/audit";
import type { Response } from "express";

export const tasksRouter = Router();

const taskSchema = z.object({
  compliance_case_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1, "Judul tugas wajib diisi."),
  description: z.string().optional().nullable(),
  status: z.enum(["todo", "in_progress", "done", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  due_date: z.string().optional().nullable(),
});

async function assertCaseInOrg(
  orgId: string | null,
  caseId: string | null
): Promise<boolean> {
  if (!caseId) return true;
  const caseRow = await db.query.complianceCases.findFirst({
    where: eq(complianceCases.id, caseId),
    columns: { id: true, businessId: true },
  });
  if (!caseRow) return false;
  const business = await db.query.businesses.findFirst({
    where: eq(complianceCases.businessId, caseRow.businessId),
    columns: { id: true, organizationId: true },
  });
  return Boolean(business && business.organizationId === orgId);
}

// --- GET /api/tasks?case_id=... ----------------------------------------------
tasksRouter.get(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const orgId = req.user!.orgId;
    if (!orgId) {
      res.json([]);
      return;
    }

    const caseId = (req.query.case_id as string | undefined) ?? null;
    if (caseId) {
      const allowed = await assertCaseInOrg(orgId, caseId ?? null);
      if (!allowed) {
        res.status(403).json({ error: "Kamu tidak memiliki akses." });
        return;
      }
    }

    const rows = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.organizationId, orgId),
          caseId ? eq(tasks.complianceCaseId, caseId) : undefined
        )
      )
      .orderBy(asc(tasks.status), desc(tasks.createdAt));

    res.json(rows);
  }
);

// --- POST /api/tasks ---------------------------------------------------------
tasksRouter.post(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = taskSchema.safeParse(req.body);
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
    const allowed = await assertCaseInOrg(orgId, input.compliance_case_id ?? null);
    if (!allowed) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    const [task] = await db
      .insert(tasks)
      .values({
        organizationId: orgId,
        complianceCaseId: input.compliance_case_id ?? null,
        title: input.title,
        description: input.description ?? null,
        status: input.status ?? "todo",
        priority: input.priority ?? "medium",
        assignedTo: input.assigned_to ?? null,
        dueDate: input.due_date ?? null,
        createdBy: req.user!.id,
      })
      .returning();

    await createAuditLog(req, "create", "task", task!.id);
    res.status(201).json(task);
  }
);

// --- PATCH /api/tasks/:id ----------------------------------------------------
tasksRouter.patch(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = taskSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({
          error: parsed.error.issues[0]?.message ?? "Input tidak valid.",
        });
      return;
    }

    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, req.params.id),
      columns: { id: true, organizationId: true },
    });
    if (!task) {
      res.status(404).json({ error: "Tugas tidak ditemukan." });
      return;
    }

    if (task.organizationId !== req.user!.orgId) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    const input = parsed.data;
    const [updated] = await db
      .update(tasks)
      .set({
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        assignedTo: input.assigned_to,
        dueDate: input.due_date,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, task.id))
      .returning();

    await createAuditLog(req, "update", "task", task.id);
    res.json(updated);
  }
);

// --- DELETE /api/tasks/:id ---------------------------------------------------
tasksRouter.delete(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, req.params.id),
      columns: { id: true, organizationId: true },
    });
    if (!task) {
      res.status(404).json({ error: "Tugas tidak ditemukan." });
      return;
    }

    if (task.organizationId !== req.user!.orgId) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    await db.delete(tasks).where(eq(tasks.id, task.id));
    await createAuditLog(req, "delete", "task", task.id);
    res.status(204).end();
  }
);

// ============================================================ Reminders ======
export const remindersRouter = Router();

const reminderSchema = z.object({
  target_type: z.string().min(1, "Target wajib diisi."),
  target_id: z.string().uuid(),
  channel: z.enum(["in_app", "email", "whatsapp"]).optional(),
  message: z.string().min(1, "Pesan wajib diisi."),
  remind_at: z.string().min(1, "Waktu reminder wajib diisi."),
});

// --- GET /api/reminders ------------------------------------------------------
remindersRouter.get(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const orgId = req.user!.orgId;
    if (!orgId) {
      res.json([]);
      return;
    }

    const rows = await db
      .select()
      .from(reminders)
      .where(eq(reminders.organizationId, orgId))
      .orderBy(asc(reminders.remindAt));

    res.json(rows);
  }
);

// --- POST /api/reminders ------------------------------------------------------
remindersRouter.post(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = reminderSchema.safeParse(req.body);
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
    const [reminder] = await db
      .insert(reminders)
      .values({
        organizationId: orgId,
        targetType: input.target_type,
        targetId: input.target_id,
        channel: input.channel ?? "in_app",
        message: input.message,
        remindAt: new Date(input.remind_at),
      })
      .returning();

    await createAuditLog(req, "create", "reminder", reminder!.id);
    res.status(201).json(reminder);
  }
);

// --- DELETE /api/reminders/:id ------------------------------------------------
remindersRouter.delete(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const reminder = await db.query.reminders.findFirst({
      where: eq(reminders.id, req.params.id),
      columns: { id: true, organizationId: true },
    });
    if (!reminder) {
      res.status(404).json({ error: "Reminder tidak ditemukan." });
      return;
    }

    if (reminder.organizationId !== req.user!.orgId) {
      res.status(403).json({ error: "Kamu tidak memiliki akses." });
      return;
    }

    await db.delete(reminders).where(eq(reminders.id, reminder.id));
    await createAuditLog(req, "delete", "reminder", reminder.id);
    res.status(204).end();
  }
);
