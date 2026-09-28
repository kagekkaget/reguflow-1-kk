// ============================================================================
// ReguFlow - Seed compliance domains & requirements into Neon
// ----------------------------------------------------------------------------
// Idempotent: cek existensi sebelum insert (tanpa membutuhkan unique index).
// ============================================================================

import "dotenv/config";
import { db } from "../db/client";
import { complianceDomains, requirements } from "../db/schema";
import { eq, and } from "drizzle-orm";

// --- Domain definitions (Indonesian MSME compliance) -----------------------
const domainsData = [
  { code: "bpom", name: "BPOM", description: "Badan Pengawas Obat dan Makanan — regulasi keamanan pangan dan obat." },
  { code: "kiprok", name: "KIPROK", description: "Kartu Indonesia Pangan Organik — sertifikasi organik." },
  { code: "sirt", name: "SPP/IRT", description: "Surat Persetujuan Prinsip / Izin Rumah Tahu dari BPOM." },
  { code: "halal", name: "Halal", description: "Sertifikasi Halal dari Majelis Ulama Indonesia (MUI)." },
  { code: "nib", name: "NIB", description: "Nomor Induk Berusaha dari OSS." },
  { code: "npwp", name: "NPWP", description: "Nomor Pokok Wajib Pajak dari Direktorat Jenderal Pajak." },
  { code: "label", name: "Label", description: "Label kemasan sesuai ketentuan BPOM." },
  { code: "ingredient_list", name: "Ingredient List", description: "Daftar bahan dan kandungan gizi sesuai regulasi BPOM." },
  { code: "product_photo", name: "Product Photo", description: "Foto produk sesuai standar dokumentasi pangan." },
];

// --- Requirements per domain -------------------------------------------------
const requirementsData = [
  { domainCode: "bpom", name: "NPOM", description: "Nomor Pendaftaran Obat/Makanan di BPOM.", requiredDocumentType: "npom", isMandatory: true },
  { domainCode: "bpom", name: "Label Pangan", description: "Label sesuai ketentuan BPOM 37/2022.", requiredDocumentType: "label", isMandatory: true },
  { domainCode: "bpom", name: "Daftar Bahan", description: "FSTD/Ingredient list lengkap.", requiredDocumentType: "ingredient_list", isMandatory: true },
  { domainCode: "halal", name: "Sertifikat Halal MUI", description: "Sertifikat halal resmi MUI.", requiredDocumentType: "halal_certificate", isMandatory: false },
  { domainCode: "halal", name: "Formulir PHRL", description: "Pengajuan Harti Kemenag.", requiredDocumentType: "phrl_form", isMandatory: false },
  { domainCode: "nib", name: "Nomor Induk Berusaha", description: "NIB dari OSS.", requiredDocumentType: "nib", isMandatory: true },
  { domainCode: "npwp", name: "NPWP", description: "Nomor Pokok Wajib Pajak.", requiredDocumentType: "npwp", isMandatory: true },
  { domainCode: "sirt", name: "SPP atau IRT", description: "Surat Persetujuan Prinsip atau Izin Rumah Tahu.", requiredDocumentType: "spp_irt", isMandatory: false },
  { domainCode: "kiprok", name: "Sertifikat Organik", description: "Sertifikat KIPROK dari OSS.", requiredDocumentType: "kiprok_certificate", isMandatory: false },
  { domainCode: "label", name: "Label Kemasan", description: "Label sesuai ketentuan pengawasan kemasan.", requiredDocumentType: "label", isMandatory: true },
];

async function seed() {
  console.log("Seeding compliance domains...");
  for (const d of domainsData) {
    const existing = await db
      .select({ id: complianceDomains.id })
      .from(complianceDomains)
      .where(eq(complianceDomains.code, d.code))
      .limit(1);
    if (existing.length > 0) {
      await db
        .update(complianceDomains)
        .set({ name: d.name, description: d.description })
        .where(eq(complianceDomains.code, d.code));
      continue;
    }
    await db.insert(complianceDomains).values(d);
  }

  console.log("Seeding requirements...");
  for (const r of requirementsData) {
    const existing = await db
      .select({ id: requirements.id })
      .from(requirements)
      .where(and(eq(requirements.domainCode, r.domainCode), eq(requirements.name, r.name)))
      .limit(1);
    if (existing.length > 0) continue;
    await db.insert(requirements).values(r);
  }

  console.log("Seed complete!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
