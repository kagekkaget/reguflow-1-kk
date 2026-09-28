// ============================================================================
// ReguFlow - Auth helpers: password hashing, JWT sign/verify, token payloads
// ----------------------------------------------------------------------------
// Access token: 15 menit (httpOnly flag juga bisa dipakai; kami kirim via
// Authorization header untuk SPA).
// Refresh token: 30 hari (httpOnly cookie).
// ============================================================================

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { memberRole } from "../db/schema";

/** Derive union type dari pgEnum: "owner" | "staff" | "consultant" | "admin" | "viewer" */
export type MemberRole = (typeof memberRole.enumValues)[number];

export interface AuthPayload {
  sub: string;
  role?: MemberRole;
  orgId?: string | null;
  iat?: number;
  exp?: number;
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? "";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "";

if (!ACCESS_SECRET) throw new Error("JWT_ACCESS_SECRET belum diset di .env");
if (!REFRESH_SECRET) throw new Error("JWT_REFRESH_SECRET belum diset di .env");

export const ACCESS_TOKEN_EXPIRY = "15m";
export const REFRESH_TOKEN_EXPIRY = `${30}d`;

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAccessToken(payload: AuthPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function signRefreshToken(payload: AuthPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function verifyAccessToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, ACCESS_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, REFRESH_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}
