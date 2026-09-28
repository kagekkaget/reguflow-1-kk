// ============================================================================
// ReguFlow - Auth routes: register, login, refresh, logout, me
// ----------------------------------------------------------------------------
// Password disimpan sebagai bcrypt hash. Access token (15m) dikirim via JSON
// body untuk SPA; refresh token (30d) di httpOnly cookie.
// ============================================================================

import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client";
import { organizations, organizationMembers, refreshTokens, users } from "../db/schema";
import { and, eq, gt, isNull } from "drizzle-orm";
import {
  comparePassword,
  hashPassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../lib/auth";
import { authenticate, type AuthenticatedRequest } from "../middleware/auth";
import { REFRESH_TOKEN_EXPIRY_DAYS } from "../lib/constants";
import { createAuditLog } from "../modules/audit";
import type { Response } from "express";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email("Email tidak valid."),
  password: z.string().min(8, "Password minimal 8 karakter."),
  full_name: z.string().min(1, "Nama wajib diisi."),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email("Email tidak valid."),
  password: z.string().min(1, "Password wajib diisi."),
});

const REFRESH_COOKIE = "refresh_token";
const REFRESH_MAX_AGE_MS = REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: REFRESH_MAX_AGE_MS,
    path: "/api/auth",
  });
}

function publicUser(row: {
  id: string;
  email: string;
  fullName: string;
  defaultRole: string;
  onboardingCompleted: boolean;
}) {
  return {
    id: row.id,
    email: row.email,
    full_name: row.fullName,
    role: row.defaultRole,
    onboarding_completed: row.onboardingCompleted,
  };
}

// --- POST /api/auth/register -------------------------------------------------
authRouter.post("/register", async (req: AuthenticatedRequest, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: parsed.error.issues[0]?.message ?? "Input tidak valid." });
    return;
  }

  const { email, password, full_name, phone } = parsed.data;

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Email sudah terdaftar." });
    return;
  }

  const passwordHash = await hashPassword(password);

  const [newUser] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      fullName: full_name,
      phone: phone ?? null,
      defaultRole: "owner",
      onboardingCompleted: false,
    })
    .returning({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      defaultRole: users.defaultRole,
      onboardingCompleted: users.onboardingCompleted,
    });

  // Buat organization default (business) untuk UMKM
  const [org] = await db
    .insert(organizations)
    .values({
      name: `Usaha ${full_name}`,
      type: "business",
      createdBy: newUser!.id,
    })
    .returning({ id: organizations.id });

  await db.insert(organizationMembers).values({
    organizationId: org!.id,
    userId: newUser!.id,
    role: "owner",
    status: "active",
  });

  const accessToken = signAccessToken({ sub: newUser!.id, role: "owner" });
  const refreshToken = signRefreshToken({ sub: newUser!.id });

  await db.insert(refreshTokens).values({
    userId: newUser!.id,
    tokenHash: refreshToken,
    expiresAt: new Date(Date.now() + REFRESH_MAX_AGE_MS),
  });

  await createAuditLog(req, "register", "user", newUser!.id);

  setRefreshCookie(res, refreshToken);
  res.status(201).json({
    access_token: accessToken,
    user: { ...publicUser(newUser!), organization_id: org!.id },
  });
});

// --- POST /api/auth/login ----------------------------------------------------
authRouter.post("/login", async (req: AuthenticatedRequest, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: parsed.error.issues[0]?.message ?? "Input tidak valid." });
    return;
  }

  const { email, password } = parsed.data;

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      passwordHash: users.passwordHash,
      defaultRole: users.defaultRole,
      onboardingCompleted: users.onboardingCompleted,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Timing attack: selalu jalankan compare meski user tidak ada.
  const passwordHash = rows[0]?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvali";
  const valid = await comparePassword(password, passwordHash);

  if (rows.length === 0 || !valid || !rows[0]!.isActive) {
    res.status(401).json({ error: "Email atau password salah." });
    return;
  }

  const user = rows[0]!;
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

  const accessToken = signAccessToken({ sub: user.id, role: user.defaultRole });
  const refreshToken = signRefreshToken({ sub: user.id });

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: refreshToken,
    expiresAt: new Date(Date.now() + REFRESH_MAX_AGE_MS),
  });

  await createAuditLog(req, "login", "user", user.id);

  setRefreshCookie(res, refreshToken);
  res.json({
    access_token: accessToken,
    user: {
      ...publicUser(user),
      organization_id: membership[0]?.organizationId ?? null,
    },
  });
});

// --- POST /api/auth/refresh --------------------------------------------------
authRouter.post("/refresh", async (req: AuthenticatedRequest, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!token) {
    res.status(401).json({ error: "Refresh token tidak ada." });
    return;
  }

  const payload = verifyRefreshToken(token);
  if (!payload?.sub) {
    res.status(401).json({ error: "Refresh token tidak valid." });
    return;
  }

  const stored = await db
    .select({ id: refreshTokens.id, expiresAt: refreshTokens.expiresAt })
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, token),
        eq(refreshTokens.userId, payload.sub),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  if (stored.length === 0) {
    res.status(401).json({ error: "Sesi berakhir. Silakan login kembali." });
    return;
  }

  // Rotasi: revoke token lama
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.id, stored[0]!.id));

  const user = await db.query.users.findFirst({
    where: and(eq(users.id, payload.sub), eq(users.isActive, true)),
    columns: { id: true, email: true, defaultRole: true },
  });
  if (!user) {
    res.status(401).json({ error: "User tidak ditemukan." });
    return;
  }

  const accessToken = signAccessToken({ sub: user.id, role: user.defaultRole });
  const refreshToken = signRefreshToken({ sub: user.id });

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: refreshToken,
    expiresAt: new Date(Date.now() + REFRESH_MAX_AGE_MS),
  });

  setRefreshCookie(res, refreshToken);
  res.json({ access_token: accessToken });
});

// --- POST /api/auth/logout ---------------------------------------------------
authRouter.post("/logout", async (req: AuthenticatedRequest, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (token) {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.tokenHash, token));
    await createAuditLog(req, "logout", "user", req.user?.id);
  }
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
  res.status(204).end();
});

// --- PATCH /api/auth/me (update profile flags) -------------------------------
authRouter.patch(
  "/me",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = z
      .object({
        full_name: z.string().min(1).optional(),
        phone: z.string().optional().nullable(),
        onboarding_completed: z.boolean().optional(),
        onboarding_step: z.number().int().optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message ?? "Input tidak valid." });
      return;
    }

    const input = parsed.data;
    const [updated] = await db
      .update(users)
      .set({
        fullName: input.full_name,
        phone: input.phone,
        onboardingCompleted: input.onboarding_completed,
        onboardingStep: input.onboarding_step,
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.user!.id))
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        defaultRole: users.defaultRole,
        onboardingCompleted: users.onboardingCompleted,
        phone: users.phone,
      });

    res.json(publicUser(updated!));
  }
);
authRouter.get("/me", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, req.user!.id),
    columns: {
      id: true,
      email: true,
      fullName: true,
      defaultRole: true,
      onboardingCompleted: true,
      phone: true,
    },
  });
  if (!user) {
    res.status(404).json({ error: "User tidak ditemukan." });
    return;
  }
  res.json({ ...publicUser(user), phone: user.phone });
});
