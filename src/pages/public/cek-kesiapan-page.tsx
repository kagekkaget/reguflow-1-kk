import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/input";
import { ScoreCard } from "@/components/ui/score-card";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase/client";
import { assessmentSchema, type AssessmentInput } from "@/lib/validation";
import { calculateComplianceScore } from "@/lib/compliance/scanner";
import { getSafeErrorMessage } from "@/lib/utils";
import { DISCLAIMER, PRODUCT_CATEGORIES } from "@/lib/constants";
import type { AssessmentAnswers } from "@/types";
import { Badge } from "@/components/ui/badge";

export default function CekKesiapanPage() {
  const toast = useToast();
  const [result, setResult] = useState<ReturnType<
    typeof calculateComplianceScore
  > | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AssessmentInput>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      has_nib: false,
      has_halal_certificate: false,
      has_spp_irt: false,
      has_product_label: false,
      has_ingredient_list: false,
      has_product_photo: false,
    },
  });

  const submitAssessment = useMutation({
    mutationFn: async (data: AssessmentInput) => {
      // Simpan assessment publik (insert-only via RLS)
      const answers: AssessmentAnswers = {
        business_name: data.business_name,
        owner_name: data.owner_name,
        whatsapp: data.whatsapp,
        email: data.email || undefined,
        city: data.city,
        business_type: data.business_type || undefined,
        product_type: data.product_type || undefined,
        has_nib: Boolean(data.has_nib),
        has_halal_certificate: Boolean(data.has_halal_certificate),
        has_spp_irt: Boolean(data.has_spp_irt),
        has_product_label: Boolean(data.has_product_label),
        has_ingredient_list: Boolean(data.has_ingredient_list),
        has_product_photo: Boolean(data.has_product_photo),
      };

      const scanResult = calculateComplianceScore({
        business: null,
        products: [],
        documents: [],
        answers,
      });

      try {
        await supabase.from("assessments").insert({
          business_name: answers.business_name,
          owner_name: answers.owner_name,
          whatsapp: answers.whatsapp,
          email: answers.email ?? null,
          city: answers.city,
          business_type: answers.business_type ?? null,
          product_type: answers.product_type ?? null,
          has_nib: answers.has_nib,
          has_halal_certificate: answers.has_halal_certificate,
          has_spp_irt: answers.has_spp_irt,
          has_product_label: answers.has_product_label,
          has_ingredient_list: answers.has_ingredient_list,
          has_product_photo: answers.has_product_photo,
          score: scanResult.score,
          result_json: {
            status_label: scanResult.statusLabel,
            missing_documents: scanResult.missingDocuments,
            recommendations: scanResult.recommendations,
          } as Record<string, unknown>,
        });
      } catch {
        // gagal simpan tidak menghalangi menampilkan hasil
      }

      return scanResult;
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success("Hasil assesment kamu sudah siap!");
      setTimeout(() => {
        document.getElementById("hasil-asesmen")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
    },
    onError: (error) => {
      toast.error("Gagal memproses assesmen", getSafeErrorMessage(error));
    },
  });

  if (result) {
    return (
      <div className="bg-slate-50">
        <div className="container-narrow py-10 sm:py-16" id="hasil-asesmen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Hasil Cek Kesiapan
            </h1>
            <p className="mt-2 text-slate-600">
              Berikut ringkasan kesiapan legalitas & sertifikasi usaha kamu.
            </p>
          </div>

          <div className="mt-8 space-y-5">
            <ScoreCard score={result.score} />

            {result.missingDocuments.length > 0 && (
              <Card>
                <CardBody className="space-y-4">
                  <h2 className="text-base font-semibold text-slate-900">
                    Dokumen yang Belum Kamu Miliki
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {result.missingDocuments.map((doc) => (
                      <Badge key={doc} tone="red">
                        {doc}
                      </Badge>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}

            <Card>
              <CardBody className="space-y-4">
                <h2 className="text-base font-semibold text-slate-900">
                  Rekomendasi Awal
                </h2>
                <ul className="space-y-3">
                  {result.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex gap-3 text-sm text-slate-600">
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                        {idx + 1}
                      </span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            {result.suggestedCases.length > 0 && (
              <Card>
                <CardBody className="space-y-3">
                  <h2 className="text-base font-semibold text-slate-900">
                    Compliance yang Sebaiknya Kamu Urus
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {result.suggestedCases.map((code) => (
                      <Badge key={code} tone="blue">
                        {code === "nib"
                          ? "NIB"
                          : code === "halal"
                            ? "Sertifikasi Halal"
                            : code === "spp_irt"
                              ? "SPP-IRT"
                              : code === "labeling"
                                ? "Label Produk"
                                : "Dokumen Usaha"}
                      </Badge>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}

            <Card className="border-amber-200 bg-amber-50/60">
              <CardBody>
                <p className="text-sm text-slate-600">{DISCLAIMER}</p>
              </CardBody>
            </Card>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/register" className="flex-1">
                <Button size="lg" fullWidth>
                  Buat Akun untuk Menyimpan Progress
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setResult(null)}
              >
                Ulangi Cek
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50">
      <div className="container-narrow py-10 sm:py-16">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Cek Kesiapan Gratis
          </h1>
          <p className="mt-2 text-slate-600">
            Jawab pertanyaan berikut dengan jujur. Hasilnya langsung muncul —
            gratis, tanpa perlu daftar.
          </p>
        </div>

        <Card className="mt-8">
          <form
            onSubmit={handleSubmit((data) => submitAssessment.mutate(data))}
            className="space-y-6 p-6 sm:p-8"
            noValidate
          >
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-slate-900">
                Data Usaha
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Nama usaha"
                  required
                  error={errors.business_name?.message}
                  htmlFor="business_name"
                >
                  <Input
                    id="business_name"
                    placeholder="Contoh: Kue Bu Tina"
                    error={!!errors.business_name}
                    {...register("business_name")}
                  />
                </Field>
                <Field
                  label="Nama pemilik"
                  required
                  error={errors.owner_name?.message}
                  htmlFor="owner_name"
                >
                  <Input
                    id="owner_name"
                    placeholder="Nama lengkap pemilik"
                    error={!!errors.owner_name}
                    {...register("owner_name")}
                  />
                </Field>
                <Field
                  label="Nomor WhatsApp"
                  required
                  error={errors.whatsapp?.message}
                  htmlFor="whatsapp"
                  hint="Untuk follow up (opsional jika mendaftar)"
                >
                  <Input
                    id="whatsapp"
                    inputMode="tel"
                    placeholder="081234567890"
                    error={!!errors.whatsapp}
                    {...register("whatsapp")}
                  />
                </Field>
                <Field
                  label="Email (opsional)"
                  error={errors.email?.message}
                  htmlFor="email"
                >
                  <Input
                    id="email"
                    type="email"
                    placeholder="kamu@email.com"
                    error={!!errors.email}
                    {...register("email")}
                  />
                </Field>
                <Field
                  label="Kota/kabupaten"
                  required
                  error={errors.city?.message}
                  htmlFor="city"
                >
                  <Input
                    id="city"
                    placeholder="Contoh: Bandung"
                    error={!!errors.city}
                    {...register("city")}
                  />
                </Field>
                <Field label="Jenis produk utama" htmlFor="product_type">
                  <Select id="product_type" {...register("product_type")}>
                    <option value="">Pilih jenis produk</option>
                    {PRODUCT_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </div>

            <div className="space-y-4 border-t border-slate-100 pt-6">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Dokumen yang Sudah Dimiliki
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Centang dokumen yang sudah kamu punya.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Checkbox
                  label="Sudah punya NIB"
                  description="Nomor Induk Berusaha dari OSS"
                  {...register("has_nib")}
                />
                <Checkbox
                  label="Sudah punya sertifikat halal"
                  description="Sertifikasi halal resmi (BPJPH)"
                  {...register("has_halal_certificate")}
                />
                <Checkbox
                  label="Sudah punya SPP-IRT"
                  description="Registrasi pangan rumah tangga"
                  {...register("has_spp_irt")}
                />
                <Checkbox
                  label="Sudah punya label produk"
                  description="Label di kemasan produk"
                  {...register("has_product_label")}
                />
                <Checkbox
                  label="Punya daftar bahan"
                  description="Daftar komposisi produk"
                  {...register("has_ingredient_list")}
                />
                <Checkbox
                  label="Punya foto produk"
                  description="Foto produk dengan kemasan jelas"
                  {...register("has_product_photo")}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-6">
              <Button
                type="submit"
                size="lg"
                loading={isSubmitting || submitAssessment.isPending}
                fullWidth
              >
                Lihat Hasil
              </Button>
              <p className="text-center text-xs text-slate-500">
                Data kamu disimpan secara privat dan hanya untuk menampilkan hasil
                asesmen.
              </p>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
