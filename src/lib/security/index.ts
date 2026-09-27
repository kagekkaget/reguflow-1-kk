// ============================================================================
// ReguFlow - Security utilities
// ----------------------------------------------------------------------------
// Prinsip: secure by default, never trust client, private by default.
// ============================================================================

import type { MemberRole, Profile } from "@/types";

// ---- XSS: sanitasi output teks user ---------------------------------------

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#47;",
  "`": "&#96;",
};

/**
 * Escape teks yang akan dirender. Wajib untuk semua user-generated content.
 * Note: React sudah escape secara default; fungsi ini untuk kasus khusus
 * (mis. teks di attribute, atau export ke file).
 */
export function escapeHtml(input: string | null | undefined): string {
  if (input === null || input === undefined) return "";
  return String(input).replace(/[&<>"'`/]/g, (ch) => HTML_ENTITIES[ch] ?? ch);
}

/** Normalisasi & sanitasi teks input user (trim + strip kontrol + batas panjang). */
export function sanitizeTextInput(
  input: string | null | undefined,
  maxLength = 500
): string {
  if (!input) return "";
  return String(input)
    .replace(/[\u0000-\u001F\u007F]/g, "") // kontrol karakter
    .trim()
    .slice(0, maxLength);
}

/**
 * Deteksi payload berbahaya umum. Return true jika input terdeteksi mengandung
 * pola injection (XSS / path traversal). Gunakan untuk *defense in depth* -
 * validasi utama tetap di Zod + server.
 */
export function containsDangerousPattern(input: string): boolean {
  const lower = input.toLowerCase();
  const patterns = [
    /<script[\s\S]*?>/i,
    /javascript:/i,
    /on\w+\s*=/i, // onerror=, onload=, ...
    /<iframe[\s\S]*?>/i,
    /<img[\s\S]*?onerror/i,
    /\.\.\//, // path traversal
    /<%[\s\S]*?%>/, // server template injection
  ];
  return patterns.some((p) => p.test(lower));
}

// ---- File upload security ---------------------------------------------------

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export const ALLOWED_FILE_EXTENSIONS = [
  "pdf", "jpg", "jpeg", "png", "webp", "doc", "docx", "xls", "xlsx",
] as const;

export const BLOCKED_FILE_EXTENSIONS = [
  "exe", "sh", "bat", "cmd", "js", "mjs", "html", "htm", "php", "py", "jar",
  "zip", "rar", "7z", "msi", "app", "deb", "rpm", "apk", "dll", "ps1", "vbs",
] as const;

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export interface FileValidationResult {
  ok: boolean;
  error?: string;
}

/**
 * Validasi file sebelum upload (defense in depth - storage policy juga cek).
 * Cek: ukuran, ekstensi yang diizinkan, ekstensi yang diblokir, MIME type,
 * dan nama file aman.
 */
export function validateUploadedFile(file: File): FileValidationResult {
  if (!file) return { ok: false, error: "File tidak ditemukan." };

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: "Ukuran file maksimal 10MB." };
  }

  if (file.size === 0) {
    return { ok: false, error: "File kosong. Pilih file lain." };
  }

  const name = file.name ?? "";
  const ext = name.split(".").pop()?.toLowerCase() ?? "";

  if (!ext) return { ok: false, error: "Jenis file tidak didukung." };

  if ((BLOCKED_FILE_EXTENSIONS as readonly string[]).includes(ext)) {
    return { ok: false, error: "Jenis file ini tidak diizinkan (berbahaya)." };
  }

  if (!(ALLOWED_FILE_EXTENSIONS as readonly string[]).includes(ext)) {
    return { ok: false, error: "Jenis file tidak didukung." };
  }

  // MIME type cek (bisa di spoof client, tapi tetap layak dicek)
  const mime = file.type?.toLowerCase() ?? "";
  if (mime && !(ALLOWED_MIME_TYPES as readonly string[]).includes(mime)) {
    return { ok: false, error: "Jenis file tidak didukung." };
  }

  if (containsDangerousPattern(name)) {
    return { ok: false, error: "Nama file tidak valid." };
  }

  return { ok: true };
}

/** Sanitasi nama file: hanya alphanumeric, dash, underscore, titik. */
export function sanitizeFileName(name: string): string {
  const base = name.replace(/[^\w.\- ]/g, "_").replace(/\s+/g, "_");
  return base.slice(0, 120) || "dokumen";
}

/**
 * Bangun path storage aman: documents/<org_id>/<doc_id>/<filename>
 * Org_id diverifikasi oleh RLS storage policy (foldername[1] = org_id).
 */
export function buildDocumentStoragePath(
  organizationId: string,
  documentId: string,
  fileName: string
): string {
  return `${organizationId}/${documentId}/${sanitizeFileName(fileName)}`;
}

// ---- Access control guards ---------------------------------------------------

export interface GuardContext {
  profile: Profile | null;
  activeRole: MemberRole | null;
  activeOrganizationId: string | null;
  isPlatformAdmin: boolean;
}

export function requireAuth(ctx: GuardContext): boolean {
  return ctx.profile !== null;
}

export function requireRole(ctx: GuardContext, roles: MemberRole[]): boolean {
  if (!requireAuth(ctx)) return false;
  if (ctx.isPlatformAdmin) return true; // admin platform lewat
  return ctx.activeRole !== null && roles.includes(ctx.activeRole);
}

/** Admin platform only. */
export function requireAdmin(ctx: GuardContext): boolean {
  return requireAuth(ctx) && ctx.isPlatformAdmin;
}

/** Consultant atau admin. */
export function requireConsultant(ctx: GuardContext): boolean {
  return requireRole(ctx, ["consultant"]);
}

/** Owner/staff/admin org. */
export function requireOrgMember(ctx: GuardContext): boolean {
  return requireRole(ctx, ["owner", "staff", "admin"]);
}

/** Cek akses ke organisasi (frontend; backend dipegang oleh RLS). */
export function canAccessOrganization(
  ctx: GuardContext,
  organizationId: string
): boolean {
  if (!requireAuth(ctx)) return false;
  if (ctx.isPlatformAdmin) return true;
  return ctx.activeOrganizationId === organizationId;
}

/** Cek akses ke business (via organisasi aktif). */
export function canAccessBusiness(
  ctx: GuardContext,
  businessOrgId: string
): boolean {
  return canAccessOrganization(ctx, businessOrgId);
}

// ---- Route param validation -------------------------------------------------

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validasi route param harus UUID. Return null jika tidak valid. */
export function validateUuidParam(value: string | undefined): string | null {
  if (!value || !UUID_REGEX.test(value)) return null;
  return value;
}
