// ============================================================================
// ReguFlow - Konstanta aplikasi (label Bahasa Indonesia)
// ============================================================================

import type {
  CaseStatus,
  ChecklistStatus,
  DocumentStatus,
  EngagementStatus,
  MemberRole,
  TaskPriority,
  TaskStatus,
} from "@/types";

export const APP_NAME = "ReguFlow";
export const APP_TAGLINE =
  "Cek kesiapan legalitas dan sertifikasi UMKM kamu tanpa bingung.";

export const DISCLAIMER =
  "ReguFlow adalah alat bantu pengelolaan dokumen dan kesiapan kepatuhan. Keputusan akhir dan pengajuan resmi tetap dilakukan melalui portal resmi pemerintah atau pendamping/konsultan terkait.";

// ---- Roles ----------------------------------------------------------------

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Pemilik Usaha",
  staff: "Staff Usaha",
  consultant: "Konsultan / Pendamping",
  admin: "Admin Platform",
  viewer: "Penonton (Viewer)",
};

export const ROLE_DESCRIPTIONS: Record<MemberRole, string> = {
  owner: "Akses penuh ke data usaha, dokumen, dan pengaturan organisasi.",
  staff: "Bisa mengelola produk, dokumen, dan task sesuai arahan pemilik.",
  consultant: "Membantu UMKM dampingan mengecek & melengkapi compliance.",
  admin: "Mengelola platform, pengguna, dan aturan compliance.",
  viewer: "Hanya bisa melihat, tidak bisa mengubah data.",
};

// ---- Document types --------------------------------------------------------

export const DOCUMENT_TYPES = [
  "NIB",
  "NPWP",
  "KTP owner",
  "Sertifikat halal",
  "SPP-IRT",
  "Label produk",
  "Foto produk",
  "Manual SJPH",
  "Daftar bahan",
  "Data supplier",
  "SOP produksi",
  "SOP kebersihan",
  "Lainnya",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  "NIB": "NIB (Nomor Induk Berusaha)",
  "NPWP": "NPWP",
  "KTP owner": "KTP Pemilik",
  "Sertifikat halal": "Sertifikat Halal",
  "SPP-IRT": "SPP-IRT",
  "Label produk": "Label Produk",
  "Foto produk": "Foto Produk",
  "Manual SJPH": "Manual SJPH",
  "Daftar bahan": "Daftar Bahan",
  "Data supplier": "Data Supplier",
  "SOP produksi": "SOP Produksi",
  "SOP kebersihan": "SOP Kebersihan",
  "Lainnya": "Dokumen Lainnya",
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  pending: "Menunggu Cek",
  valid: "Valid",
  invalid: "Tidak Valid",
  revision_needed: "Butuh Revisi",
  expired: "Kadaluarsa",
};

export const DOCUMENT_STATUS_TONES: Record<DocumentStatus, string> = {
  pending: "bg-slate-100 text-slate-700",
  valid: "bg-emerald-100 text-emerald-700",
  invalid: "bg-red-100 text-red-700",
  revision_needed: "bg-amber-100 text-amber-700",
  expired: "bg-red-100 text-red-700",
};

// ---- Task ------------------------------------------------------------------

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "Belum Dikerjakan",
  in_progress: "Sedang Dikerjakan",
  done: "Selesai",
  cancelled: "Dibatalkan",
};

export const TASK_STATUS_TONES: Record<TaskStatus, string> = {
  todo: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  done: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-500",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Rendah",
  medium: "Sedang",
  high: "Tinggi",
  urgent: "Mendesak",
};

export const TASK_PRIORITY_TONES: Record<TaskPriority, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};

// ---- Compliance case --------------------------------------------------------

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  not_started: "Belum Mulai",
  data_collected: "Data Dikumpulkan",
  internal_review: "Review Internal",
  consultant_review: "Review Konsultan",
  ready_to_submit: "Siap Direview",
  submitted: "Sudah Diajukan",
  revision: "Butuh Revisi",
  approved: "Disetujui",
  expired: "Kadaluarsa",
};

// Urutan journey untuk ComplianceJourney component
export const CASE_JOURNEY: CaseStatus[] = [
  "not_started",
  "data_collected",
  "internal_review",
  "consultant_review",
  "ready_to_submit",
  "submitted",
  "approved",
];

export const CASE_STATUS_TONES: Record<CaseStatus, string> = {
  not_started: "bg-slate-100 text-slate-700",
  data_collected: "bg-blue-100 text-blue-700",
  internal_review: "bg-violet-100 text-violet-700",
  consultant_review: "bg-indigo-100 text-indigo-700",
  ready_to_submit: "bg-teal-100 text-teal-700",
  submitted: "bg-cyan-100 text-cyan-700",
  revision: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  expired: "bg-red-100 text-red-700",
};

// ---- Checklist --------------------------------------------------------------

export const CHECKLIST_STATUS_LABELS: Record<ChecklistStatus, string> = {
  todo: "Belum Selesai",
  in_progress: "Sedang Dikerjakan",
  done: "Selesai",
  blocked: "Terhalang",
};

// ---- Engagement -------------------------------------------------------------

export const ENGAGEMENT_STATUS_LABELS: Record<EngagementStatus, string> = {
  pending: "Menunggu Konfirmasi",
  active: "Aktif",
  paused: "Dijeda",
  ended: "Selesai",
  cancelled: "Dibatalkan",
};

export const ENGAGEMENT_STATUS_TONES: Record<EngagementStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-slate-100 text-slate-700",
  ended: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

// ---- Compliance domains ------------------------------------------------------

export const DOMAIN_CODE_LABELS: Record<string, string> = {
  nib: "NIB",
  halal: "Sertifikasi Halal",
  spp_irt: "SPP-IRT",
  bpom: "Registrasi BPOM",
  pajak: "Pajak Usaha",
  merek: "Merek Dagang",
  labeling: "Label Produk",
  dokumen_usaha: "Dokumen Usaha",
};

export const DOMAIN_CODE_DESCRIPTIONS: Record<string, string> = {
  nib: "Nomor Induk Berusaha dari OSS - identitas wajib usaha kamu.",
  halal: "Sertifikasi halal produk melalui portal resmi (SIHALAL/BPJPH).",
  spp_irt: "Registrasi pangan rumah tangga untuk usaha mikro & kecil.",
  bpom: "Registrasi produk (kosmetik, suplemen, obat) ke BPOM.",
  pajak: "Kewajiban pajak: NPWP usaha dan laporan SPT Tahunan.",
  merek: "Lindungi nama brand kamu dengan mendaftarkan merek (HKI).",
  labeling: "Pastikan label kemasan sesuai aturan: komposisi, expired, produsen.",
  dokumen_usaha: "Dokumen dasar usaha: KTP, NPWP, NIB, dan lainnya.",
};

// ---- Opsi form ----------------------------------------------------------------

export const ENTITY_TYPES = [
  { value: "perorangan", label: "Perorangan" },
  { value: "pt", label: "PT (Perseroan Terbatas)" },
  { value: "cv", label: "CV (Commanditaire Vennootschap)" },
  { value: "koperasi", label: "Koperasi" },
  { value: "yayasan", label: "Yayasan" },
];

export const BUSINESS_SCALES = [
  { value: "mikro", label: "Mikro (omzet < 1 miliar/tahun)" },
  { value: "kecil", label: "Kecil (omzet 1 - 5 miliar/tahun)" },
  { value: "menengah", label: "Menengah (omzet > 5 miliar/tahun)" },
];

export const PRODUCT_CATEGORIES = [
  { value: "Makanan", label: "Makanan" },
  { value: "Minuman", label: "Minuman" },
  { value: "Kosmetik", label: "Kosmetik / Kecantikan" },
  { value: "Produk RTG", label: "Produk Rumah Tangga" },
  { value: "Kerajinan", label: "Kerajinan" },
  { value: "Pakaian", label: "Pakaian / Fashion" },
  { value: "Lainnya", label: "Lainnya" },
];

export const PACKAGING_TYPES = [
  { value: "Kotak", label: "Kotak" },
  { value: "Pouch", label: "Pouch / Plastik Segel" },
  { value: "Botol", label: "Botol" },
  { value: "Kaleng", label: "Kaleng" },
  { value: "Toples", label: "Toples" },
  { value: "Manual / Tidak dikemas", label: "Manual / Tidak dikemas" },
];

export const SALES_CHANNELS = [
  { value: "Online", label: "Online (marketplace/sosmed)" },
  { value: "Toko fisik", label: "Toko fisik" },
  { value: "Online + Toko", label: "Online + Toko fisik" },
  { value: "Reseller", label: "Reseller / Distributor" },
  { value: "B2B", label: "B2B (suplai ke usaha lain)" },
];

export const PROVINSI_LIST = [
  "Aceh", "Sumatera Utara", "Sumatera Barat", "Riau", "Kepulauan Riau",
  "Jambi", "Sumatera Selatan", "Bangka Belitung", "Lampung", "Banten",
  "DKI Jakarta", "Jawa Barat", "Jawa Tengah", "DI Yogyakarta", "Jawa Timur",
  "Bali", "Nusa Tenggara Barat", "Nusa Tenggara Timur", "Kalimantan Barat",
  "Kalimantan Tengah", "Kalimantan Selatan", "Kalimantan Timur",
  "Kalimantan Utara", "Sulawesi Utara", "Sulawesi Tengah", "Sulawesi Selatan",
  "Sulawesi Tenggara", "Gorontalo", "Sulawesi Barat", "Maluku",
  "Maluku Utara", "Papua", "Papua Barat", "Papua Selatan", "Papua Tengah",
  "Papua Pegunungan", "Papua Barat Daya",
];

// ---- Skor --------------------------------------------------------------------

export function getScoreStatus(score: number): {
  label: string;
  tone: string;
  color: string;
} {
  if (score <= 30)
    return {
      label: "Belum Siap",
      tone: "bg-red-100 text-red-700",
      color: "bg-red-500",
    };
  if (score <= 60)
    return {
      label: "Perlu Dilengkapi",
      tone: "bg-amber-100 text-amber-700",
      color: "bg-amber-500",
    };
  if (score <= 80)
    return {
      label: "Hampir Siap",
      tone: "bg-yellow-100 text-yellow-700",
      color: "bg-yellow-500",
    };
  return {
    label: "Siap Direview",
    tone: "bg-emerald-100 text-emerald-700",
    color: "bg-emerald-500",
  };
}

// ---- Audit actions ------------------------------------------------------------

export const AUDIT_ACTIONS = {
  USER_LOGIN: "user_login",
  USER_LOGOUT: "user_logout",
  DOCUMENT_UPLOADED: "document_uploaded",
  DOCUMENT_VIEWED: "document_viewed",
  DOCUMENT_DOWNLOADED: "document_downloaded",
  DOCUMENT_DELETED: "document_deleted",
  COMPLIANCE_STATUS_UPDATED: "compliance_status_updated",
  CHECKLIST_UPDATED: "checklist_updated",
  TASK_CREATED: "task_created",
  TASK_UPDATED: "task_updated",
  ROLE_CHANGED: "role_changed",
  MEMBER_INVITED: "member_invited",
  PROFILE_UPDATED: "profile_updated",
  BUSINESS_UPDATED: "business_updated",
  SCANNER_RUN: "scanner_run",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
