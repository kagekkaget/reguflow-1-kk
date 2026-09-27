import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Checkbox } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScoreCard } from "@/components/ui/score-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/supabase/auth-store";
import {
  businessSchema,
  productSchema,
  type BusinessFormInput,
  type ProductFormInput,
} from "@/lib/validation";
import {
  BUSINESS_SCALES,
  ENTITY_TYPES,
  PACKAGING_TYPES,
  PROVINSI_LIST,
  SALES_CHANNELS,
} from "@/lib/constants";
import { getSafeErrorMessage } from "@/lib/utils";
import { logAudit } from "@/lib/security/audit";
import { useComplianceScanner } from "@/hooks/use-scanner";
import { useBusiness, useProducts } from "@/hooks/use-queries";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/use-queries";

const STEPS = [
  { num: 1, label: "Profil Usaha" },
  { num: 2, label: "Produk" },
  { num: 3, label: "Dokumen" },
  { num: 4, label: "Hasil & Checklist" },
];

export default function OnboardingPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const activeOrgId = useAuthStore((s) => s.activeOrganizationId);
  const { refetch: refetchBusiness } = useBusiness();
  const { data: existingBusiness } = useBusiness();
  const { data: existingProducts = [] } = useProducts();
  const { result: scanResult, runScannerAndCreateCases } =
    useComplianceScanner();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [skippedProduct, setSkippedProduct] = useState(false);
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({});

  const businessForm = useForm<BusinessFormInput>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      legal_name: existingBusiness?.[0]?.legal_name ?? "",
      brand_name: existingBusiness?.[0]?.brand_name ?? "",
      nib: existingBusiness?.[0]?.nib ?? "",
      npwp: existingBusiness?.[0]?.npwp ?? "",
      entity_type: existingBusiness?.[0]?.entity_type ?? "perorangan",
      business_scale: existingBusiness?.[0]?.business_scale ?? "mikro",
      employee_count: existingBusiness?.[0]?.employee_count ?? 0,
      address: existingBusiness?.[0]?.address ?? "",
      province: existingBusiness?.[0]?.province ?? "",
      city: existingBusiness?.[0]?.city ?? "",
      postal_code: existingBusiness?.[0]?.postal_code ?? "",
      kbli: existingBusiness?.[0]?.kbli ?? "",
    },
  });

  const productForm = useForm<ProductFormInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      is_food_or_beverage: true,
      simple_production_process: true,
    },
  });

  const stepProgress = (step / STEPS.length) * 100;

  const saveBusiness = async (): Promise<string | null> => {
    if (!activeOrgId) return null;
    const values = businessForm.getValues();
    const payload = {
      organization_id: activeOrgId,
      legal_name: values.legal_name,
      brand_name: values.brand_name || null,
      nib: values.nib || null,
      npwp: values.npwp || null,
      entity_type: values.entity_type || "perorangan",
      business_scale: values.business_scale || "mikro",
      employee_count: typeof values.employee_count === "number" ? values.employee_count : 0,
      annual_revenue: typeof values.annual_revenue === "number" ? values.annual_revenue : null,
      address: values.address || null,
      province: values.province || null,
      city: values.city || null,
      postal_code: values.postal_code || null,
      kbli: values.kbli || null,
      status: "active",
    };

    const existing = existingBusiness?.[0];
    if (existing) {
      const { error } = await supabase
        .from("businesses")
        .update(payload)
        .eq("id", existing.id);
      if (error) throw error;
      await logAudit({
        organizationId: activeOrgId,
        action: "business_updated",
        entityType: "business",
        entityId: existing.id,
      });
      return existing.id;
    }

    const { data, error } = await supabase
      .from("businesses")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return (data as { id: string }).id;
  };

  const saveProduct = async (businessId: string) => {
    if (skippedProduct) return;
    const values = productForm.getValues();
    if (!values.name) return;
    const { error } = await supabase.from("products").insert({
      business_id: businessId,
      name: values.name,
      sku: values.sku || null,
      category: values.category || null,
      subcategory: values.subcategory || null,
      description: values.description || null,
      is_food_or_beverage: Boolean(values.is_food_or_beverage),
      is_cosmetic: Boolean(values.is_cosmetic),
      is_imported: Boolean(values.is_imported),
      uses_animal_derived_material: Boolean(values.uses_animal_derived_material),
      uses_alcohol_related_material: Boolean(
        values.uses_alcohol_related_material
      ),
      simple_production_process: Boolean(values.simple_production_process),
      packaging_type: values.packaging_type || null,
      sales_channel: values.sales_channel || null,
      status: "active",
    });
    if (error) throw error;
  };

  const markOnboardingComplete = async () => {
    if (!profile) return;
    await supabase
      .from("profiles")
      .update({ onboarding_completed: true, onboarding_step: 4 })
      .eq("id", profile.id);
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      if (step === 1) {
        const valid = await businessForm.trigger();
        if (!valid) {
          toast.error("Lengkapi data", "Beberapa field masih belum valid.");
          setSaving(false);
          return;
        }
        await saveBusiness();
      }
      if (profile) {
        await supabase
          .from("profiles")
          .update({ onboarding_step: step })
          .eq("id", profile.id);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.business });
      toast.success("Draft tersimpan", "Kamu bisa lanjut kapan saja.");
    } catch (error) {
      toast.error("Gagal menyimpan draft", getSafeErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    setSaving(true);
    try {
      if (step === 1) {
        const valid = await businessForm.trigger();
        if (!valid) {
          toast.error("Lengkapi data", "Beberapa field masih belum valid.");
          setSaving(false);
          return;
        }
        await saveBusiness();
        queryClient.invalidateQueries({ queryKey: queryKeys.business });
        await refetchBusiness();
      }
      if (step === 2 && !skippedProduct) {
        const valid = await productForm.trigger(["name", "category"]);
        if (!valid) {
          toast.error("Lengkapi data produk", "Minimal nama produk harus diisi.");
          setSaving(false);
          return;
        }
        const businesses = (await refetchBusiness()).data;
        if (businesses && businesses.length > 0) {
          await saveProduct(businesses[0]!.id);
        }
        queryClient.invalidateQueries({ queryKey: queryKeys.products });
      }
      setStep((s) => Math.min(s + 1, STEPS.length));
    } catch (error) {
      toast.error("Gagal menyimpan", getSafeErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleFinish = async () => {
    setSaving(true);
    try {
      await markOnboardingComplete();
      await runScannerAndCreateCases();
      queryClient.invalidateQueries();
      toast.success("Onboarding selesai!", "Dashboard kamu sudah siap.");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      toast.error("Gagal menyelesaikan", getSafeErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const docChecklist = [
    { key: "NIB", label: "NIB (Nomor Induk Berusaha)" },
    { key: "KTP owner", label: "KTP Pemilik Usaha" },
    { key: "NPWP", label: "NPWP (opsional)" },
    { key: "Sertifikat halal", label: "Sertifikat Halal" },
    { key: "SPP-IRT", label: "SPP-IRT" },
    { key: "Label produk", label: "Label Produk" },
    { key: "Foto produk", label: "Foto Produk" },
    { key: "Manual SJPH", label: "Manual SJPH" },
    { key: "Daftar bahan", label: "Daftar Bahan" },
    { key: "Data supplier", label: "Data Supplier" },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          Onboarding ReguFlow
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Lengkapi 4 langkah ini untuk mendapatkan checklist compliance yang
          sesuai dengan usaha kamu.
        </p>
        <div className="mt-5">
          <Progress value={stepProgress} showLabel />
          <div className="mt-3 flex justify-between">
            {STEPS.map((s) => (
              <div
                key={s.num}
                className={`flex flex-col items-center gap-1.5 text-center ${
                  s.num < step
                    ? "text-emerald-600"
                    : s.num === step
                      ? "text-brand-600"
                      : "text-slate-400"
                }`}
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    s.num < step
                      ? "bg-emerald-100 text-emerald-700"
                      : s.num === step
                        ? "bg-brand-600 text-white"
                        : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {s.num < step ? "✓" : s.num}
                </div>
                <span className="hidden text-xs font-medium sm:block">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Card>
        <CardBody className="p-6 sm:p-8">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Profil Usaha
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Data dasar usaha kamu. NIB wajib untuk hampir semua proses
                  compliance.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Nama legal usaha"
                  required
                  error={businessForm.formState.errors.legal_name?.message}
                  htmlFor="legal_name"
                >
                  <Input
                    id="legal_name"
                    placeholder="Contoh: Usaha Kue Bu Tina"
                    error={!!businessForm.formState.errors.legal_name}
                    {...businessForm.register("legal_name")}
                  />
                </Field>
                <Field
                  label="Nama brand (opsional)"
                  htmlFor="brand_name"
                  error={businessForm.formState.errors.brand_name?.message}
                >
                  <Input
                    id="brand_name"
                    placeholder="Nama yang dikenal pelanggan"
                    {...businessForm.register("brand_name")}
                  />
                </Field>
                <Field
                  label="NIB"
                  htmlFor="nib"
                  hint="13 digit dari OSS. Kosongkan jika belum punya."
                  error={businessForm.formState.errors.nib?.message}
                >
                  <Input
                    id="nib"
                    inputMode="numeric"
                    placeholder="0123456789012"
                    {...businessForm.register("nib")}
                  />
                </Field>
                <Field
                  label="NPWP (opsional)"
                  htmlFor="npwp"
                  error={businessForm.formState.errors.npwp?.message}
                >
                  <Input
                    id="npwp"
                    placeholder="XX.XXX.XXX.X-XXX.XXX"
                    {...businessForm.register("npwp")}
                  />
                </Field>
                <Field label="Bentuk usaha" htmlFor="entity_type">
                  <Select id="entity_type" {...businessForm.register("entity_type")}>
                    {ENTITY_TYPES.map((e) => (
                      <option key={e.value} value={e.value}>
                        {e.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Skala usaha" htmlFor="business_scale">
                  <Select
                    id="business_scale"
                    {...businessForm.register("business_scale")}
                  >
                    {BUSINESS_SCALES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label="Jumlah karyawan"
                  htmlFor="employee_count"
                  error={businessForm.formState.errors.employee_count?.message}
                >
                  <Input
                    id="employee_count"
                    type="number"
                    min={0}
                    {...businessForm.register("employee_count", {
                      setValueAs: (v) =>
                        v === "" || v === null || v === undefined
                          ? 0
                          : Number(v),
                    })}
                  />
                </Field>
                <Field
                  label="Omzet tahunan (opsional)"
                  htmlFor="annual_revenue"
                  error={businessForm.formState.errors.annual_revenue?.message}
                >
                  <Input
                    id="annual_revenue"
                    type="number"
                    min={0}
                    placeholder="Rp"
                    {...businessForm.register("annual_revenue", {
                      setValueAs: (v) =>
                        v === "" || v === null || v === undefined
                          ? null
                          : Number(v),
                    })}
                  />
                </Field>
                <Field
                  label="Alamat produksi"
                  htmlFor="address"
                  error={businessForm.formState.errors.address?.message}
                >
                  <Input
                    id="address"
                    placeholder="Alamat tempat produksi"
                    {...businessForm.register("address")}
                  />
                </Field>
                <Field label="Provinsi" htmlFor="province">
                  <Select
                    id="province"
                    {...businessForm.register("province")}
                  >
                    <option value="">Pilih provinsi</option>
                    {PROVINSI_LIST.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label="Kota/kabupaten"
                  htmlFor="city"
                  error={businessForm.formState.errors.city?.message}
                >
                  <Input
                    id="city"
                    placeholder="Contoh: Bandung"
                    {...businessForm.register("city")}
                  />
                </Field>
                <Field
                  label="Kode pos (opsional)"
                  htmlFor="postal_code"
                  error={businessForm.formState.errors.postal_code?.message}
                >
                  <Input
                    id="postal_code"
                    inputMode="numeric"
                    {...businessForm.register("postal_code")}
                  />
                </Field>
                <Field
                  label="KBLI (opsional)"
                  htmlFor="kbli"
                  hint="Kode bidang usaha, contoh: 10711"
                  error={businessForm.formState.errors.kbli?.message}
                >
                  <Input id="kbli" {...businessForm.register("kbli")} />
                </Field>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Produk</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Tambahkan minimal satu produk utama. Jenis produk menentukan
                    sertifikasi yang dibutuhkan.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSkippedProduct((v) => !v)}
                >
                  {skippedProduct ? "Isi produk" : "Lewati"}
                </Button>
              </div>

              {skippedProduct ? (
                <EmptyState
                  title="Produk dilewati"
                  description="Kamu bisa menambahkan produk nanti di halaman Produk."
                />
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Nama produk"
                      required
                      error={productForm.formState.errors.name?.message}
                      htmlFor="p_name"
                    >
                      <Input
                        id="p_name"
                        placeholder="Contoh: Kue Lapis Legit"
                        error={!!productForm.formState.errors.name}
                        {...productForm.register("name")}
                      />
                    </Field>
                    <Field
                      label="Kategori"
                      error={productForm.formState.errors.category?.message}
                      htmlFor="p_category"
                    >
                      <Select id="p_category" {...productForm.register("category")}>
                        <option value="">Pilih kategori</option>
                        {["Makanan", "Minuman", "Kosmetik", "Produk RTG", "Kerajinan", "Pakaian", "Lainnya"].map(
                          (c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          )
                        )}
                      </Select>
                    </Field>
                    <Field
                      label="Jenis kemasan"
                      htmlFor="p_packaging"
                      error={productForm.formState.errors.packaging_type?.message}
                    >
                      <Select
                        id="p_packaging"
                        {...productForm.register("packaging_type")}
                      >
                        <option value="">Pilih kemasan</option>
                        {PACKAGING_TYPES.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Channel penjualan" htmlFor="p_channel">
                      <Select id="p_channel" {...productForm.register("sales_channel")}>
                        <option value="">Pilih channel</option>
                        {SALES_CHANNELS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>

                  <div className="border-t border-slate-100 pt-5">
                    <p className="text-sm font-medium text-slate-700">
                      Karakteristik produk
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Jawaban ini menentukan jenis compliance case yang akan
                      dibuat.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Checkbox
                        label="Makanan atau minuman"
                        description="Produk untuk dikonsumsi"
                        {...productForm.register("is_food_or_beverage")}
                      />
                      <Checkbox
                        label="Kosmetik"
                        description="Perlu registrasi BPOM"
                        {...productForm.register("is_cosmetic")}
                      />
                      <Checkbox
                        label="Menggunakan bahan hewani"
                        description="Memengaruhi syarat halal"
                        {...productForm.register("uses_animal_derived_material")}
                      />
                      <Checkbox
                        label="Menggunakan alkohol / turunannya"
                        description="Memengaruhi status halal"
                        {...productForm.register("uses_alcohol_related_material")}
                      />
                      <Checkbox
                        label="Proses produksi sederhana (rumahan)"
                        description="Skala rumah tangga → SPP-IRT"
                        {...productForm.register("simple_production_process")}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Dokumen yang Dimiliki
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Centang dokumen yang sudah kamu punya. Kamu bisa upload
                  file-nya nanti di Brankas Dokumen.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {docChecklist.map((doc) => (
                  <Checkbox
                    key={doc.key}
                    label={doc.label}
                    checked={Boolean(checkedDocs[doc.key])}
                    onChange={(e) =>
                      setCheckedDocs((prev) => ({
                        ...prev,
                        [doc.key]: e.target.checked,
                      }))
                    }
                  />
                ))}
              </div>
              {existingProducts.length > 0 && (
                <div className="rounded-xl bg-brand-50 p-4">
                  <p className="text-sm text-brand-800">
                    Produk <strong>{existingProducts[0]!.name}</strong> akan
                    dipakai scanner untuk menentukan compliance case.
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Hasil Awal & Checklist
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Ini ringkasan kesiapan compliance berdasarkan data yang sudah
                  kamu isi.
                </p>
              </div>

              <ScoreCard
                score={scanResult?.score ?? 0}
                description="Skor dihitung dari data usaha, produk, dan dokumen."
              />

              {scanResult && scanResult.suggestedCases.length > 0 && (
                <Card className="border-slate-200 bg-white">
                  <CardBody className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Compliance Case yang Akan Dibuat
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {scanResult.suggestedCases.map((code) => (
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

              {scanResult && scanResult.recommendations.length > 0 && (
                <Card className="border-brand-200 bg-brand-50/40">
                  <CardBody>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Rekomendasi Pertama
                    </h3>
                    <ol className="mt-3 space-y-2.5">
                      {scanResult.recommendations.slice(0, 4).map((rec, idx) => (
                        <li
                          key={idx}
                          className="flex gap-3 text-sm text-slate-700"
                        >
                          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                            {idx + 1}
                          </span>
                          {rec}
                        </li>
                      ))}
                    </ol>
                  </CardBody>
                </Card>
              )}

              <p className="text-xs text-slate-500">
                Dengan menyelesaikan onboarding, scanner akan membuat compliance
                case dan checklist otomatis untuk kamu.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-100 pt-6">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 1 || saving}
            >
              ← Kembali
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                loading={saving}
              >
                Simpan Draft
              </Button>
              {step < STEPS.length ? (
                <Button onClick={handleNext} loading={saving}>
                  Lanjut →
                </Button>
              ) : (
                <Button onClick={handleFinish} loading={saving}>
                  Selesaikan & Buat Checklist
                </Button>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
