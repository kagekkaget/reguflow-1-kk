import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";
import {
  businessSchema,
  type BusinessFormInput,
} from "@/lib/validation";
import {
  BUSINESS_SCALES,
  ENTITY_TYPES,
  PROVINSI_LIST,
} from "@/lib/constants";
import { getSafeErrorMessage } from "@/lib/utils";
import { logAudit } from "@/lib/security/audit";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/supabase/auth-store";
import { useBusiness } from "@/hooks/use-queries";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/use-queries";

export default function UsahaPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const activeOrgId = useAuthStore((s) => s.activeOrganizationId);
  const { data: businesses, isLoading } = useBusiness();
  const business = businesses?.[0] ?? null;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BusinessFormInput>({
    resolver: zodResolver(businessSchema),
    values: business
      ? {
          legal_name: business.legal_name,
          brand_name: business.brand_name ?? "",
          nib: business.nib ?? "",
          npwp: business.npwp ?? "",
          entity_type: business.entity_type ?? "perorangan",
          business_scale: business.business_scale ?? "mikro",
          employee_count: business.employee_count ?? 0,
          annual_revenue: business.annual_revenue ?? undefined,
          address: business.address ?? "",
          province: business.province ?? "",
          city: business.city ?? "",
          postal_code: business.postal_code ?? "",
          kbli: business.kbli ?? "",
        }
      : {
          legal_name: "",
          entity_type: "perorangan",
          business_scale: "mikro",
          employee_count: 0,
        },
  });

  const onSubmit = async (values: BusinessFormInput) => {
    if (!activeOrgId) {
      toast.error("Gagal menyimpan", "Organisasi tidak ditemukan.");
      return;
    }
    try {
      const payload = {
        organization_id: activeOrgId,
        legal_name: values.legal_name,
        brand_name: values.brand_name || null,
        nib: values.nib || null,
        npwp: values.npwp || null,
        entity_type: values.entity_type || "perorangan",
        business_scale: values.business_scale || "mikro",
        employee_count:
          typeof values.employee_count === "number" ? values.employee_count : 0,
        annual_revenue:
          typeof values.annual_revenue === "number"
            ? values.annual_revenue
            : null,
        address: values.address || null,
        province: values.province || null,
        city: values.city || null,
        postal_code: values.postal_code || null,
        kbli: values.kbli || null,
        status: "active",
      };

      if (business) {
        const { error } = await supabase
          .from("businesses")
          .update(payload)
          .eq("id", business.id);
        if (error) throw error;
        await logAudit({
          organizationId: activeOrgId,
          action: "business_updated",
          entityType: "business",
          entityId: business.id,
        });
      } else {
        const { error } = await supabase.from("businesses").insert(payload);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.business });
      toast.success("Tersimpan", "Profil usaha berhasil diperbarui.");
    } catch (error) {
      toast.error("Gagal menyimpan", getSafeErrorMessage(error));
    }
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Profil Usaha" />
        <LoadingState label="Memuat data usaha..." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Profil Usaha"
        description="Data lengkap usaha kamu digunakan untuk menghitung skor kesiapan compliance."
      />

      {!business ? (
        <Card>
          <EmptyState
            title="Profil usaha belum ada"
            description="Isi form di bawah untuk membuat profil usaha kamu."
          />
        </Card>
      ) : null}

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <CardBody className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Identitas Usaha
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field
                  label="Nama legal usaha"
                  required
                  error={errors.legal_name?.message}
                  htmlFor="legal_name"
                >
                  <Input
                    id="legal_name"
                    placeholder="Contoh: Usaha Kue Bu Tina"
                    error={!!errors.legal_name}
                    {...register("legal_name")}
                  />
                </Field>
                <Field
                  label="Nama brand (opsional)"
                  htmlFor="brand_name"
                  error={errors.brand_name?.message}
                >
                  <Input id="brand_name" {...register("brand_name")} />
                </Field>
                <Field
                  label="NIB"
                  htmlFor="nib"
                  hint="13 digit dari OSS"
                  error={errors.nib?.message}
                >
                  <Input
                    id="nib"
                    inputMode="numeric"
                    placeholder="0123456789012"
                    {...register("nib")}
                  />
                </Field>
                <Field
                  label="NPWP (opsional)"
                  htmlFor="npwp"
                  error={errors.npwp?.message}
                >
                  <Input id="npwp" {...register("npwp")} />
                </Field>
                <Field label="Bentuk usaha" htmlFor="entity_type">
                  <Select id="entity_type" {...register("entity_type")}>
                    {ENTITY_TYPES.map((e) => (
                      <option key={e.value} value={e.value}>
                        {e.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Skala usaha" htmlFor="business_scale">
                  <Select id="business_scale" {...register("business_scale")}>
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
                  error={errors.employee_count?.message}
                >
                  <Input
                    id="employee_count"
                    type="number"
                    min={0}
                    {...register("employee_count", {
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
                  error={errors.annual_revenue?.message}
                >
                  <Input
                    id="annual_revenue"
                    type="number"
                    min={0}
                    placeholder="Rp"
                    {...register("annual_revenue", {
                      setValueAs: (v) =>
                        v === "" || v === null || v === undefined
                          ? null
                          : Number(v),
                    })}
                  />
                </Field>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <h2 className="text-base font-semibold text-slate-900">
                Lokasi Produksi
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field
                  label="Alamat produksi"
                  htmlFor="address"
                  className="sm:col-span-2"
                  error={errors.address?.message}
                >
                  <Input
                    id="address"
                    placeholder="Alamat lengkap tempat produksi"
                    {...register("address")}
                  />
                </Field>
                <Field label="Provinsi" htmlFor="province" error={errors.province?.message}>
                  <Select id="province" {...register("province")}>
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
                  error={errors.city?.message}
                >
                  <Input id="city" {...register("city")} />
                </Field>
                <Field
                  label="Kode pos (opsional)"
                  htmlFor="postal_code"
                  error={errors.postal_code?.message}
                >
                  <Input id="postal_code" inputMode="numeric" {...register("postal_code")} />
                </Field>
                <Field label="KBLI (opsional)" htmlFor="kbli" error={errors.kbli?.message}>
                  <Input id="kbli" placeholder="10711" {...register("kbli")} />
                </Field>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
              <Button type="submit" loading={isSubmitting}>
                Simpan Perubahan
              </Button>
            </div>
          </CardBody>
        </form>
      </Card>
    </div>
  );
}
