// ============================================================================
// ReguFlow - Compliance Scanner Engine (versi sederhana)
// ----------------------------------------------------------------------------
// Membaca: data usaha, produk, dokumen, dan jawaban assessment.
// Menghasilkan: skor 0-100, status, dokumen yang kurang, rekomendasi,
// compliance case yang disarankan, dan checklist awal.
//
// Catatan: ini adalah alat bantu asesmen awal - BUKAN keputusan resmi.
// ============================================================================

import type {
  AssessmentAnswers,
  ScannerInput,
  ScannerResult,
} from "@/types";
import { clamp } from "@/lib/utils";

const MAX_SCORE = 100;

interface Criterion {
  label: string;
  points: number;
  earned: number;
}

/** Cek apakah dokumen dengan jenis tertentu sudah ada & valid. */
function hasDocument(
  documents: ScannerInput["documents"],
  type: string
): boolean {
  return documents.some(
    (d) =>
      d.document_type === type &&
      d.verification_status !== "invalid" &&
      d.verification_status !== "expired"
  );
}

/**
 * Hitung skor kesiapan compliance.
 * Bobot mengikuti contoh scoring pada spesifikasi produk.
 */
export function calculateComplianceScore(input: ScannerInput): ScannerResult {
  const { business, products, documents, answers } = input;

  const hasNib =
    Boolean(business?.nib && business.nib.trim().length > 0) ||
    Boolean(answers.has_nib);
  const hasNibDoc = hasDocument(documents, "NIB");

  const isFood = products.some((p) => p.is_food_or_beverage) ||
    Boolean(answers.has_halal_certificate) ||
    (products.length > 0 &&
      products.some((p) => p.category === "Makanan" || p.category === "Minuman"));

  const businessDataComplete = Boolean(
    business?.legal_name &&
      business.city &&
      business.address &&
      business.entity_type &&
      (business.employee_count ?? null) !== null
  );

  const productsComplete = products.length > 0 && products.every(
    (p) => p.name && p.category && p.packaging_type
  );

  const hasIngredients =
    hasDocument(documents, "Daftar bahan") || Boolean(answers.has_ingredient_list);

  const hasSuppliers = hasDocument(documents, "Data supplier");

  const hasProductPhoto =
    hasDocument(documents, "Foto produk") || Boolean(answers.has_product_photo);

  const hasSjph = hasDocument(documents, "Manual SJPH");

  const hasProductionFlow = hasDocument(documents, "SOP produksi");

  const hasSopHygiene = hasDocument(documents, "SOP kebersihan");

  // ---- Kumpul kriteria & poin ----------------------------------------------

  const criteria: Criterion[] = [
    {
      label: "NIB tersedia",
      points: 15,
      earned: hasNib || hasNibDoc ? 15 : 0,
    },
    {
      label: "Data usaha lengkap",
      points: 10,
      earned: businessDataComplete ? 10 : 0,
    },
    {
      label: "Produk lengkap",
      points: 10,
      earned: productsComplete ? 10 : 0,
    },
    {
      label: "Daftar bahan lengkap",
      points: 15,
      earned: hasIngredients ? 15 : 0,
    },
    {
      label: "Supplier tercatat",
      points: 10,
      earned: hasSuppliers ? 10 : 0,
    },
    {
      label: "Foto produk tersedia",
      points: 10,
      earned: hasProductPhoto ? 10 : 0,
    },
    {
      label: "Alur produksi tersedia",
      points: 10,
      earned: hasProductionFlow ? 10 : 0,
    },
    {
      label: "Manual SJPH tersedia",
      points: 15,
      earned: hasSjph ? 15 : 0,
    },
    {
      label: "SOP kebersihan diisi",
      points: 5,
      earned: hasSopHygiene ? 5 : 0,
    },
  ];

  const totalEarned = criteria.reduce((sum, c) => sum + c.earned, 0);
  const score = clamp(
    Math.round((totalEarned / MAX_SCORE) * MAX_SCORE),
    0,
    MAX_SCORE
  );

  // ---- Status ----------------------------------------------------------------

  let statusLabel = "Belum Siap";
  if (score > 80) statusLabel = "Siap Direview";
  else if (score > 60) statusLabel = "Hampir Siap";
  else if (score > 30) statusLabel = "Perlu Dilengkapi";

  const statusTone =
    score > 80 ? "green" : score > 60 ? "yellow" : score > 30 ? "amber" : "red";

  // ---- Dokumen kurang ---------------------------------------------------------

  const missingDocuments: string[] = [];
  if (!hasNib && !hasNibDoc) missingDocuments.push("NIB");
  if (!hasIngredients) missingDocuments.push("Daftar bahan");
  if (!hasProductPhoto) missingDocuments.push("Foto produk");
  if (isFood) {
    if (!hasDocument(documents, "Label produk") && !answers.has_product_label)
      missingDocuments.push("Label produk");
    if (!hasSjph) missingDocuments.push("Manual SJPH");
    if (!hasSuppliers) missingDocuments.push("Data supplier");
  }

  // ---- Rekomendasi -------------------------------------------------------------

  const recommendations: string[] = [];
  if (!hasNib && !hasNibDoc) {
    recommendations.push(
      "Lengkapi atau upload NIB terlebih dahulu. NIB diterbitkan gratis melalui OSS."
    );
  }
  if (isFood) {
    recommendations.push(
      "Produk makanan/minuman sebaiknya disertifikasi halal. Siapkan daftar bahan, data supplier, dan manual SJPH."
    );
  }
  if (isFood && (business?.business_scale ?? "mikro") !== "menengah") {
    recommendations.push(
      "Usaha pangan rumahan skala mikro/kecil perlu mendaftar SPP-IRT. Cek kembali kategori produk kamu."
    );
  }
  if (!hasIngredients) recommendations.push("Lengkapi daftar bahan produk kamu.");
  if (!hasProductPhoto) recommendations.push("Upload foto produk dengan kemasan jelas.");
  if (!hasDocument(documents, "Label produk") && !answers.has_product_label)
    recommendations.push("Upload label produk (kemasan) kamu.");
  if (isFood && !hasSjph)
    recommendations.push("Siapkan Manual SJPH (Sistem Jaminan Produk Halal).");
  if (recommendations.length === 0) {
    recommendations.push(
      "Kesiapan kamu sudah baik. Minta review pendamping sebelum mengajukan resmi."
    );
  }

  // ---- Suggested compliance cases ------------------------------------------------

  const suggestedCases: string[] = [];
  if (!hasNib && !hasNibDoc) suggestedCases.push("nib");
  if (isFood) suggestedCases.push("halal");
  if (
    isFood &&
    (business?.business_scale ?? "mikro") !== "menengah" &&
    !answers.has_spp_irt &&
    !hasDocument(documents, "SPP-IRT")
  ) {
    suggestedCases.push("spp_irt");
  }
  if (!hasDocument(documents, "Label produk") && !answers.has_product_label)
    suggestedCases.push("labeling");
  if (!businessDataComplete || !business?.nib) suggestedCases.push("dokumen_usaha");

  // ---- Checklist awal --------------------------------------------------------------

  const checklistItems: ScannerResult["checklistItems"] = [];

  if (suggestedCases.includes("nib")) {
    checklistItems.push({ domainCode: "nib", title: "Daftar & dapatkan NIB dari OSS" });
    checklistItems.push({ domainCode: "nib", title: "Upload NIB ke brankas dokumen" });
  }
  if (suggestedCases.includes("halal")) {
    checklistItems.push({ domainCode: "halal", title: "Lengkapi data usaha & produk" });
    checklistItems.push({ domainCode: "halal", title: "Catat daftar bahan & supplier" });
    checklistItems.push({ domainCode: "halal", title: "Siapkan Manual SJPH" });
    checklistItems.push({ domainCode: "halal", title: "Review pendamping sebelum submit" });
  }
  if (suggestedCases.includes("spp_irt")) {
    checklistItems.push({
      domainCode: "spp_irt",
      title: "Cek kelayakan SPP-IRT untuk produk rumah tangga",
    });
  }
  if (suggestedCases.includes("labeling")) {
    checklistItems.push({ domainCode: "labeling", title: "Buat label kemasan sesuai aturan" });
  }
  if (!hasIngredients)
    checklistItems.push({ domainCode: "halal", title: "Lengkapi daftar bahan" });
  if (!hasProductPhoto)
    checklistItems.push({ domainCode: "labeling", title: "Upload foto produk" });

  return {
    score,
    statusLabel,
    statusTone,
    missingDocuments,
    recommendations,
    suggestedCases,
    checklistItems,
    breakdown: criteria.map((c) => ({
      label: c.label,
      points: c.points,
      earned: c.earned,
    })),
  };
}

/** Skor dari jawaban assessment publik (tanpa data user tersimpan). */
export function calculateAssessmentScore(
  answers: AssessmentAnswers
): number {
  return calculateComplianceScore({
    business: null,
    products: [],
    documents: [],
    answers,
  }).score;
}

/** Ambil label status dari skor. */
export function getScoreStatusLabel(score: number): string {
  if (score > 80) return "Siap Direview";
  if (score > 60) return "Hampir Siap";
  if (score > 30) return "Perlu Dilengkapi";
  return "Belum Siap";
}
