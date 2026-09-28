// ============================================================================
// ReguFlow - Auth middleware (JWT dari Authorization header / httpOnly cookie)
// ----------------------------------------------------------------------------
// Verifikasi token, lalu load user aktif dari DB. Never trust client: role &
// organization diambil dari database, bukan hanya dari payload JWT.
// ============================================================================

import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/auth";
import { db } from "../db/client";
import { users, organizationMembers } from "../db/schema";
import { and, eq } from "drizzle-orm";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  orgId: string | null;
}

export interface AuthenticatedRequest extends Request<Record<string, string>> {
  user?: AuthenticatedUser;
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice(7);
  }
  if (req.cookies?.access_token) {
    return req.cookies.access_token as string;
  }
  return null;
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthenticated. Silakan login." });
    return;
  }

  const payload = verifyAccessToken(token);
  if (!payload || !payload.sub) {
    res.status(401).json({ error: "Sesi tidak valid. Silakan login kembali." });
    return;
  }

  const user = await db.query.users.findFirst({
    where: and(eq(users.id, payload.sub), eq(users.isActive, true)),
    columns: { id: true, email: true, defaultRole: true },
  });
  if (!user) {
    res.status(401).json({ error: "User tidak ditemukan." });
    return;
  }

  const membership = await db
    .select({ organizationId: organizationMembers.organizationId })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, user.id),
        eq(organizationMembers.status, "active")
      )
    )
    .limit(1);

  req.user = {
    id: user.id,
    email: user.email,
    role: user.defaultRole,
    orgId: membership.length > 0 ? membership[0]!.organizationId : null,
  };

  next();
}

/** Role-based access control (admin platform bypass). */
export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthenticated. Silakan login." });
      return;
    }
    if (req.user.role === "admin" || roles.includes(req.user.role)) {
      next();
      return;
    }
    res
      .status(403)
      .json({ error: "Kamu tidak memiliki akses ke halaman ini." });
  };
}

export const requireAdmin = requireRole("admin");
export const requireOwner = requireRole("owner", "admin");
