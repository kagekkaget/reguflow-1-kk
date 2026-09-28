import { Router } from "express";
import { db } from "../db/client";
import {
  organizationMembers,
  businesses,
  products,
  documents,
  complianceCases,
  assessments,
  auditLogs,
  users,
} from "../db/schema";
import { and, count, desc, eq, gte, ilike, isNull, ne } from "drizzle-orm";
import { requireAdmin, type AuthenticatedRequest } from "../middleware/auth";
import type { Response } from "express";

export const adminRouter = Router();

async function assertPlatformAdmin(req: AuthenticatedRequest, res: Response): Promise<boolean> {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Kamu tidak memiliki akses admin platform." });
    return false;
  }
  return true;
}

adminRouter.get("/stats", requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const [
    totalMembers,
    totalUsers,
    totalBusinesses,
    totalProducts,
    totalDocuments,
    activeCases,
    thisMonthAssessments,
  ] = await Promise.all([
    db
      .select({ count: count() })
      .from(organizationMembers)
      .where(eq(organizationMembers.status, "active")),
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(businesses),
    db.select({ count: count() }).from(products),
    db
      .select({ count: count() })
      .from(documents)
      .where(isNull(documents.deletedAt)),
    db
      .select({ count: count() })
      .from(complianceCases)
      .where(
        and(
          ne(complianceCases.status, "approved"),
          ne(complianceCases.status, "expired")
        )
      ),
    db.select({ count: count() })    .from(assessments).where(gte(assessments.createdAt, new Date(thisMonth))),
  ]);

  res.json({
    totalUsers: totalUsers[0]?.count ?? 0,
    totalMembers: totalMembers[0]?.count ?? 0,
    totalBusinesses: totalBusinesses[0]?.count ?? 0,
    totalProducts: totalProducts[0]?.count ?? 0,
    totalDocuments: totalDocuments[0]?.count ?? 0,
    activeCases: activeCases[0]?.count ?? 0,
    thisMonthAssessments: thisMonthAssessments[0]?.count ?? 0,
  });
});

adminRouter.get("/businesses", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  if (!(await assertPlatformAdmin(req, res))) return;
  const search = (req.query.search as string | undefined)?.trim();

  const rows = await db
    .select()
    .from(businesses)
    .where(search ? ilike(businesses.legalName, `%${search}%`) : undefined)
    .orderBy(desc(businesses.createdAt));

  res.json(rows);
});

adminRouter.get("/documents", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  if (!(await assertPlatformAdmin(req, res))) return;
  const rows = await db
    .select()
    .from(documents)
    .where(isNull(documents.deletedAt))
    .orderBy(desc(documents.createdAt));

  res.json(rows);
});

adminRouter.get("/users", requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  const rows = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      defaultRole: users.defaultRole,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  res.json(rows);
});

adminRouter.get("/audit-logs", requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  const rows = await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(50);

  res.json(rows);
});
