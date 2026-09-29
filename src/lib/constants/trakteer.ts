// ============================================================================
// ReguFlow - Konstanta widget dukungan (Trakteer) & sumber terbuka
// ----------------------------------------------------------------------------
// Semua nilai di file ini bisa disesuaikan tanpa menyentuh kode komponen:
//   - ganti tujuan traktiran  -> TRAKTEER_USERNAME
//   - ganti nominal dasar     -> TRAKTEER_BASE_NOMINAL
//   - ganti alamat repositori -> REPO_URL
// ============================================================================

// ---- Trakteer --------------------------------------------------------------

/** Username Trakteer tujuan (halaman: https://trakteer.id/<username>). */
export const TRAKTEER_USERNAME = "perpus_opera";

export const TRAKTEER_PROFILE_URL = `https://trakteer.id/${TRAKTEER_USERNAME}`;

/**
 * Halaman "tip" Trakteer. Nominal akhir tetap dipilih di sisi Trakteer karena
 * Trakteer tidak menyediakan API/param resmi untuk auto-checkout.
 * Param `?amount=` ikut dikirim sebagai informasi (diabaikan bila tidak
 * didukung), sehingga QR tetap membuka halaman yang benar.
 */
export const TRAKTEER_TIP_URL = `${TRAKTEER_PROFILE_URL}/tip`;

/** Pesan wajib pada widget dukungan. */
export const TRAKTEER_WIDGET_MESSAGE =
  "Web app ini gratis & bebas iklan. Kopi kecil, server tetap jalan";

/**
 * Nominal dasar traktiran (Rupiah). Semua pilihan cepat adalah kelipatan
 * nilai ini (Rp6.000, Rp12.000, Rp18.000, dst).
 */
export const TRAKTEER_BASE_NOMINAL = 6_000;

/** Jumlah tombol nominal cepat yang ditampilkan di panel. */
export const TRAKTEER_QUICK_PICK_COUNT = 6;

/** Batas nominal kustom (Rupiah) supaya tidak ada salah ketik ekstrem. */
export const TRAKTEER_MAX_NOMINAL = 1_000_000;

/** Label kecil di bawah QR code. */
export const TRAKTEER_QR_CAPTION =
  "Pindai QR ini dengan kamera HP, lalu selesaikan pembayaran di Trakteer.";

/** Daftar nominal cepat: kelipatan TRAKTEER_BASE_NOMINAL. */
export function trakteerQuickNominals(count = TRAKTEER_QUICK_PICK_COUNT): number[] {
  return Array.from(
    { length: Math.max(1, count) },
    (_, i) => TRAKTEER_BASE_NOMINAL * (i + 1)
  );
}

/** Bulatkan nominal ke kelipatan dasar, dibatasi min & max. */
export function normalizeTrakteerNominal(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return TRAKTEER_BASE_NOMINAL;
  const steps = Math.round(value / TRAKTEER_BASE_NOMINAL) || 1;
  return Math.min(Math.max(steps, 1), Math.floor(TRAKTEER_MAX_NOMINAL / TRAKTEER_BASE_NOMINAL)) *
    TRAKTEER_BASE_NOMINAL;
}

/** True bila nominal adalah kelipatan dasar dan berada di dalam batas. */
export function isTrakteerNominalValid(value: number): boolean {
  return (
    Number.isFinite(value) &&
    value >= TRAKTEER_BASE_NOMINAL &&
    value <= TRAKTEER_MAX_NOMINAL &&
    value % TRAKTEER_BASE_NOMINAL === 0
  );
}

/** Tautan Trakteer untuk nominal tertentu (param amount ikut disertakan). */
export function trakteerTipUrl(nominal?: number): string {
  if (!nominal || !isTrakteerNominalValid(nominal)) return TRAKTEER_TIP_URL;
  return `${TRAKTEER_TIP_URL}?amount=${nominal}`;
}

// ---- Sumber terbuka (open source) ------------------------------------------

/** Repositori publik source code ReguFlow (frontend + backend). */
export const REPO_URL = "https://github.com/kagekkaget/reguflow-1-kk";

/** Branch utama — dipakai untuk menyusun URL download ZIP. */
export const REPO_BRANCH = "main";

/** Download source code lengkap sebagai arsip ZIP. */
export const REPO_ZIP_URL = `${REPO_URL}/archive/refs/heads/${REPO_BRANCH}.zip`;

/** Perintah git clone (tampil + bisa disalin dari panel widget). */
export const GIT_CLONE_COMMAND = `git clone ${REPO_URL}.git`;

/** Atribut yang wajib tampil di widget, footer, dan README. */
export const OPEN_SOURCE_CREDIT = "Open Source oleh MZF - 2026";

export const OPEN_SOURCE_LICENSE = "Lisensi MIT";
