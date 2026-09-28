// ============================================================================
// ReguFlow - Security utils (server-side validation & file checks)
// ----------------------------------------------------------------------------
// Mirror of frontend security utils, dijalankan di server (defense in depth).
// ============================================================================

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const ALLOWED_FILE_EXTENSIONS = [
  "pdf", "jpg", "jpeg", "png", "webp", "doc", "docx", "xls", "xlsx",
];

const BLOCKED_FILE_EXTENSIONS = [
  "exe", "sh", "bat", "cmd", "js", "mjs", "html", "htm", "php", "py", "jar",
  "zip", "rar", "7z", "msi", "app", "deb", "rpm", "apk", "dll", "ps1", "vbs",
];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export function validateUploadedFile(file: {
  buffer: Buffer;
  originalname: string;
  size: number;
  mimetype: string;
}): { ok: boolean; error?: string } {
  if (!file || !file.originalname) {
    return { ok: false, error: "File tidak ditemukan." };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: "Ukuran file maksimal 10MB." };
  }
  if (file.size === 0) {
    return { ok: false, error: "File kosong." };
  }

  const ext = file.originalname.split(".").pop()?.toLowerCase() ?? "";
  if (!ext) return { ok: false, error: "Jenis file tidak didukung." };

  if ((BLOCKED_FILE_EXTENSIONS as readonly string[]).includes(ext)) {
    return { ok: false, error: "Jenis file ini tidak diizinkan (berbahaya)." };
  }
  if (!(ALLOWED_FILE_EXTENSIONS as readonly string[]).includes(ext)) {
    return { ok: false, error: "Jenis file tidak didukung." };
  }

  const mime = (file.mimetype ?? "").toLowerCase();
  if (mime && !(ALLOWED_MIME_TYPES as readonly string[]).includes(mime)) {
    return { ok: false, error: "Jenis file tidak didukung." };
  }

  if (containsDangerousPattern(file.originalname)) {
    return { ok: false, error: "Nama file tidak valid." };
  }

  return { ok: true };
}

function containsDangerousPattern(input: string): boolean {
  const lower = input.toLowerCase();
  const patterns = [
    /<script[\s\S]*?>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe[\s\S]*?>/i,
    /<img[\s\S]*?onerror/i,
    /\.\.\//,
    /<%[\s\S]*?%>/,
  ];
  return patterns.some((p) => p.test(lower));
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\- ]/g, "_").replace(/\s+/g, "_").slice(0, 120) || "dokumen";
}

export function buildDocumentStoragePath(
  organizationId: string,
  documentId: string,
  fileName: string
): string {
  return `${organizationId}/${documentId}/${sanitizeFileName(fileName)}`;
}

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(value: string | null | undefined): boolean {
  return Boolean(value) && UUID_REGEX.test(value!);
}

export function getSafeErrorMessage(
  error: unknown,
  fallback = "Terjadi kesalahan. Coba lagi beberapa saat."
): string {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.error("[api] error:", error);
  }
  if (error && typeof error === "object" && "message" in error) {
    const msg = String((error as { message: unknown }).message ?? "");
    if (msg && !msg.includes("\n") && msg.length < 160) return msg;
  }
  return fallback;
}
