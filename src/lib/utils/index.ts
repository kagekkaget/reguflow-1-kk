// ============================================================================
// ReguFlow - Utils umum
// ============================================================================

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Gabungkan className Tailwind dengan aman (tailwind-merge). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format bytes ke label yang mudah dibaca. */
export function formatBytes(bytes: number, decimals = 0): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    sizes.length - 1
  );
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/** Format angka ke Rupiah, contoh: 6000 -> "Rp6.000". */
export function formatRupiah(value: number): string {
  if (!Number.isFinite(value)) return "Rp0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  })
    .format(value)
    .replace(/\s/g, "\u00a0"); // rapikan spasi tipis agar tidak patah baris
}

/** Format tanggal ISO ke format Indonesia. */
export function formatDateID(
  value: string | Date | null | undefined,
  opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  }
): string {
  if (!value) return "-";
  try {
    const date = typeof value === "string" ? new Date(value) : value;
    if (isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("id-ID", opts).format(date);
  } catch {
    return "-";
  }
}

/** Selisih hari dari sekarang (negatif = sudah lewat). */
export function daysUntil(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (isNaN(date.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

/** Label relatif sederhana untuk tanggal (Bahasa Indonesia). */
export function relativeDateLabel(value: string | Date | null | undefined): string {
  const days = daysUntil(value);
  if (days === null) return "-";
  if (days === 0) return "Hari ini";
  if (days === 1) return "Besok";
  if (days === -1) return "Kemarin";
  if (days < 0) return `Lewat ${Math.abs(days)} hari`;
  return `${days} hari lagi`;
}

/** Inisial dari nama untuk avatar. */
export function getInitials(name: string): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Potong teks panjang. */
export function truncate(text: string, max = 120): string {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

/** Clamp angka ke rentang. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Debounce function (untuk search). */
export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  delay = 300
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** Pesan error yang aman untuk user (tidak membocorkan detail internal). */
export function getSafeErrorMessage(
  error: unknown,
  fallback = "Terjadi kesalahan. Coba lagi beberapa saat."
): string {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error("[ReguFlow] error:", error);
  }
  if (error && typeof error === "object" && "message" in error) {
    const msg = String((error as { message: unknown }).message ?? "");
    // Hanya tampilkan pesan yang kita kenal aman (bukan stack trace).
    if (msg && !msg.includes("\n") && msg.length < 160) return msg;
  }
  return fallback;
}

/** Cek apakah string terlihat seperti UUID v4. */
export function isValidUUID(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

/**
 * Salin teks ke clipboard. `navigator.clipboard` hanya tersedia di konteks aman
 * (HTTPS/localhost), jadi disiapkan fallback textarea + execCommand.
 * Mengembalikan true bila berhasil.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // lanjut ke fallback
  }

  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
