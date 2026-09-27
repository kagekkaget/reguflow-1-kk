// ============================================================================
// ReguFlow - Skema validasi (Zod) dengan pesan Bahasa Indonesia
// ============================================================================
// Catatan: validasi client hanya untuk UX. Server/RLS tetap otoritas akhir.

import { z } from "zod";

const stringOrNull = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v ? v : null));

// ---- Auth -------------------------------------------------------------------

export const registerSchema = z
  .object({
    full_name: z
      .string({ required_error: "Nama lengkap wajib diisi." })
      .trim()
      .min(2, "Nama lengkap minimal 2 karakter.")
      .max(100, "Nama lengkap maksimal 100 karakter."),
    email: z
      .string({ required_error: "Email wajib diisi." })
      .trim()
      .email("Format email tidak valid.")
      .max(160, "Email maksimal 160 karakter."),
    password: z
      .string({ required_error: "Password wajib diisi." })
      .min(8, "Password minimal 8 karakter.")
      .max(72, "Password maksimal 72 karakter.")
      .regex(/[A-Za-z]/, "Password harus mengandung huruf.")
      .regex(/[0-9]/, "Password harus mengandung angka."),
    confirmPassword: z.string(),
    whatsapp: z
      .string({ required_error: "Nomor WhatsApp wajib diisi." })
      .trim()
      .min(8, "Nomor WhatsApp minimal 8 digit.")
      .max(20, "Nomor WhatsApp maksimal 20 digit.")
      .regex(/^[0-9+\- ]+$/, "Nomor WhatsApp hanya boleh angka, +, dan -."),
    acceptTerms: z
      .boolean()
      .refine((v) => v === true, "Kamu harus menyetujui syarat & ketentuan."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok.",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email wajib diisi." })
    .trim()
    .email("Format email tidak valid."),
  password: z
    .string({ required_error: "Password wajib diisi." })
    .min(1, "Password wajib diisi."),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ---- Assessment publik -------------------------------------------------------

export const assessmentSchema = z.object({
  business_name: z
    .string({ required_error: "Nama usaha wajib diisi." })
    .trim()
    .min(2, "Nama usaha minimal 2 karakter.")
    .max(120, "Nama usaha maksimal 120 karakter."),
  owner_name: z
    .string({ required_error: "Nama pemilik wajib diisi." })
    .trim()
    .min(2, "Nama pemilik minimal 2 karakter.")
    .max(100, "Nama pemilik maksimal 100 karakter."),
  whatsapp: z
    .string({ required_error: "Nomor WhatsApp wajib diisi." })
    .trim()
    .min(8, "Nomor WhatsApp minimal 8 digit.")
    .max(20, "Nomor WhatsApp maksimal 20 digit.")
    .regex(/^[0-9+\- ]+$/, "Nomor WhatsApp hanya boleh angka, +, dan -."),
  email: z
    .string()
    .trim()
    .email("Format email tidak valid.")
    .max(160, "Email maksimal 160 karakter.")
    .optional()
    .or(z.literal("")),
  city: z
    .string({ required_error: "Kota/kabupaten wajib diisi." })
    .trim()
    .min(2, "Kota/kabupaten minimal 2 karakter.")
    .max(100, "Kota/kabupaten maksimal 100 karakter."),
  business_type: z.string().trim().max(80).optional().or(z.literal("")),
  product_type: z.string().trim().max(80).optional().or(z.literal("")),
  has_nib: z.boolean().default(false),
  has_halal_certificate: z.boolean().default(false),
  has_spp_irt: z.boolean().default(false),
  has_product_label: z.boolean().default(false),
  has_ingredient_list: z.boolean().default(false),
  has_product_photo: z.boolean().default(false),
});

export type AssessmentInput = z.infer<typeof assessmentSchema>;

// ---- Profil usaha -------------------------------------------------------------

export const businessSchema = z.object({
  legal_name: z
    .string({ required_error: "Nama legal usaha wajib diisi." })
    .trim()
    .min(2, "Nama legal minimal 2 karakter.")
    .max(120, "Nama legal maksimal 120 karakter."),
  brand_name: z.string().trim().max(120).optional().or(z.literal("")),
  nib: z
    .string()
    .trim()
    .max(20, "NIB maksimal 20 karakter.")
    .regex(/^[0-9]*$/, "NIB hanya boleh angka.")
    .optional()
    .or(z.literal("")),
  npwp: z
    .string()
    .trim()
    .max(25, "NPWP maksimal 25 karakter.")
    .regex(/^[0-9.\-]*$/, "Format NPWP tidak valid.")
    .optional()
    .or(z.literal("")),
  entity_type: z.string().trim().max(40).optional().or(z.literal("")),
  business_scale: z.string().trim().max(40).optional().or(z.literal("")),
  employee_count: z
    .number({ invalid_type_error: "Jumlah karyawan harus berupa angka." })
    .int("Jumlah karyawan harus bilangan bulat.")
    .min(0, "Jumlah karyawan minimal 0.")
    .max(100000, "Jumlah karyawan maksimal 100.000.")
    .optional()
    .or(z.literal("").transform(() => null)),
  annual_revenue: z
    .number({ invalid_type_error: "Omzet harus berupa angka." })
    .min(0, "Omzet minimal 0.")
    .max(1e15, "Nilai omzet terlalu besar.")
    .optional()
    .or(z.literal("").transform(() => null)),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  province: z.string().trim().max(100).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  postal_code: z
    .string()
    .trim()
    .max(10, "Kode pos maksimal 10 karakter.")
    .regex(/^[0-9]*$/, "Kode pos hanya boleh angka.")
    .optional()
    .or(z.literal("")),
  kbli: z
    .string()
    .trim()
    .max(10, "KBLI maksimal 10 karakter.")
    .optional()
    .or(z.literal("")),
});

export type BusinessFormInput = z.infer<typeof businessSchema>;

// ---- Produk -------------------------------------------------------------------

export const productSchema = z.object({
  name: z
    .string({ required_error: "Nama produk wajib diisi." })
    .trim()
    .min(2, "Nama produk minimal 2 karakter.")
    .max(120, "Nama produk maksimal 120 karakter."),
  sku: z
    .string()
    .trim()
    .max(60, "SKU maksimal 60 karakter.")
    .optional()
    .or(z.literal("")),
  category: z.string().trim().max(60).optional().or(z.literal("")),
  subcategory: z.string().trim().max(60).optional().or(z.literal("")),
  description: z
    .string()
    .trim()
    .max(1000, "Deskripsi maksimal 1000 karakter.")
    .optional()
    .or(z.literal("")),
  is_food_or_beverage: z.boolean().default(true),
  is_cosmetic: z.boolean().default(false),
  is_imported: z.boolean().default(false),
  uses_animal_derived_material: z.boolean().default(false),
  uses_alcohol_related_material: z.boolean().default(false),
  simple_production_process: z.boolean().default(true),
  packaging_type: z.string().trim().max(60).optional().or(z.literal("")),
  sales_channel: z.string().trim().max(60).optional().or(z.literal("")),
});

export type ProductFormInput = z.infer<typeof productSchema>;

// ---- Dokumen ------------------------------------------------------------------

export const documentSchema = z.object({
  document_type: z.string({ required_error: "Jenis dokumen wajib dipilih." }),
  title: z
    .string({ required_error: "Judul dokumen wajib diisi." })
    .trim()
    .min(2, "Judul dokumen minimal 2 karakter.")
    .max(120, "Judul dokumen maksimal 120 karakter."),
  issue_date: z.string().optional().or(z.literal("")),
  expiry_date: z.string().optional().or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(500, "Catatan maksimal 500 karakter.")
    .optional()
    .or(z.literal("")),
});

export type DocumentFormInput = z.infer<typeof documentSchema>;

// ---- Task ----------------------------------------------------------------------

export const taskSchema = z.object({
  title: z
    .string({ required_error: "Judul task wajib diisi." })
    .trim()
    .min(2, "Judul task minimal 2 karakter.")
    .max(160, "Judul task maksimal 160 karakter."),
  description: z
    .string()
    .trim()
    .max(500, "Deskripsi maksimal 500 karakter.")
    .optional()
    .or(z.literal("")),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["todo", "in_progress", "done", "cancelled"]),
  due_date: z.string().optional().or(z.literal("")),
  compliance_case_id: z.string().optional().or(z.literal("")),
});

export type TaskFormInput = z.infer<typeof taskSchema>;

// ---- Komentar ------------------------------------------------------------------

export const commentSchema = z.object({
  body: z
    .string({ required_error: "Komentar wajib diisi." })
    .trim()
    .min(1, "Komentar wajib diisi.")
    .max(1000, "Komentar maksimal 1000 karakter."),
});

export type CommentFormInput = z.infer<typeof commentSchema>;

// ---- Profil user ---------------------------------------------------------------

export const profileSchema = z.object({
  full_name: z
    .string({ required_error: "Nama wajib diisi." })
    .trim()
    .min(2, "Nama minimal 2 karakter.")
    .max(100, "Nama maksimal 100 karakter."),
  phone: z
    .string()
    .trim()
    .max(20, "Nomor telepon maksimal 20 digit.")
    .regex(/^[0-9+\- ]*$/, "Nomor telepon hanya boleh angka, +, dan -.")
    .optional()
    .or(z.literal("")),
});

export type ProfileFormInput = z.infer<typeof profileSchema>;

// ---- Helper: nullify empty strings ---------------------------------------------

/** Ubah string kosong menjadi null untuk field DB nullable. */
export function emptyToNull<T extends Record<string, unknown>>(
  obj: T
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v === "" ? null : v;
  }
  return out;
}

export { stringOrNull };
