import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, Checkbox, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/supabase/auth-store";
import { useBusiness, useProducts, queryKeys } from "@/hooks/use-queries";
import { productSchema, type ProductFormInput } from "@/lib/validation";
import {
  PACKAGING_TYPES,
  PRODUCT_CATEGORIES,
  SALES_CHANNELS,
} from "@/lib/constants";
import { getSafeErrorMessage } from "@/lib/utils";
import { logAudit } from "@/lib/security/audit";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatDateID } from "@/lib/utils";
import type { Product } from "@/types";

export default function ProdukListPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const activeOrgId = useAuthStore((s) => s.activeOrganizationId);
  const { data: businesses } = useBusiness();
  const { data: products = [], isLoading } = useProducts();
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      is_food_or_beverage: true,
      simple_production_process: true,
    },
  });

  const businessId = businesses?.[0]?.id;

  const handleCreate = async (values: ProductFormInput) => {
    if (!activeOrgId || !businessId) {
      toast.error("Gagal menambah produk", "Lengkapi profil usaha kamu dulu.");
      return;
    }
    setSaving(true);
    try {
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
      await logAudit({
        organizationId: activeOrgId,
        action: "task_created",
        entityType: "product",
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
      toast.success("Produk ditambahkan", values.name);
      reset();
      setModalOpen(false);
    } catch (error) {
      toast.error("Gagal menambah produk", getSafeErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Produk"
        description="Daftar produk usaha kamu. Klik produk untuk lihat detail & checklist."
        actions={
          <Button onClick={() => setModalOpen(true)} disabled={!businessId}>
            + Tambah Produk
          </Button>
        }
      />

      {!businessId && !isLoading ? (
        <Card>
          <EmptyState
            title="Profil usaha belum ada"
            description="Buat profil usaha dulu sebelum menambahkan produk."
            actionLabel="Isi Profil Usaha"
            onAction={() => (window.location.href = "/usaha")}
          />
        </Card>
      ) : isLoading ? (
        <LoadingState label="Memuat produk..." />
      ) : products.length === 0 ? (
        <Card>
          <EmptyState
            title="Belum ada produk"
            description="Tambahkan produk pertama kamu untuk mendapatkan checklist compliance yang relevan."
            actionLabel="+ Tambah Produk"
            onAction={() => setModalOpen(true)}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Tambah Produk"
        description="Lengkapi data produk untuk menentukan compliance yang dibutuhkan."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit(handleCreate)} loading={saving}>
              Simpan Produk
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit(handleCreate)} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Nama produk"
              required
              error={errors.name?.message}
              htmlFor="name"
            >
              <Input
                id="name"
                placeholder="Contoh: Kue Lapis Legit"
                error={!!errors.name}
                {...register("name")}
              />
            </Field>
            <Field label="SKU (opsional)" htmlFor="sku" error={errors.sku?.message}>
              <Input id="sku" {...register("sku")} />
            </Field>
            <Field label="Kategori" htmlFor="category" error={errors.category?.message}>
              <Select id="category" {...register("category")}>
                <option value="">Pilih kategori</option>
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Subkategori (opsional)"
              htmlFor="subcategory"
              error={errors.subcategory?.message}
            >
              <Input id="subcategory" {...register("subcategory")} />
            </Field>
            <Field label="Jenis kemasan" htmlFor="packaging_type">
              <Select id="packaging_type" {...register("packaging_type")}>
                <option value="">Pilih kemasan</option>
                {PACKAGING_TYPES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Channel penjualan" htmlFor="sales_channel">
              <Select id="sales_channel" {...register("sales_channel")}>
                <option value="">Pilih channel</option>
                {SALES_CHANNELS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Deskripsi (opsional)" htmlFor="description">
            <Textarea
              id="description"
              rows={3}
              placeholder="Deskripsi singkat produk"
              {...register("description")}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Checkbox
              label="Makanan atau minuman"
              {...register("is_food_or_beverage")}
            />
            <Checkbox label="Kosmetik" {...register("is_cosmetic")} />
            <Checkbox
              label="Menggunakan bahan hewani"
              {...register("uses_animal_derived_material")}
            />
            <Checkbox
              label="Menggunakan alkohol / turunannya"
              {...register("uses_alcohol_related_material")}
            />
            <Checkbox
              label="Proses produksi sederhana (rumahan)"
              {...register("simple_production_process")}
            />
            <Checkbox label="Produk impor" {...register("is_imported")} />
          </div>
          <button type="submit" className="sr-only" aria-hidden="true">
            Simpan
          </button>
        </form>
      </Modal>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const complianceTags: string[] = [];
  if (product.is_food_or_beverage) complianceTags.push("Halal");
  if (product.is_food_or_beverage && product.simple_production_process)
    complianceTags.push("SPP-IRT");
  if (product.is_cosmetic) complianceTags.push("BPOM");

  return (
    <Card className="transition-shadow hover:shadow-card-lg">
      <CardBody className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900">
            {product.name}
          </h3>
          {complianceTags[0] && <Badge tone="blue">{complianceTags[0]}</Badge>}
        </div>
        <div className="flex flex-wrap gap-2">
          {complianceTags.slice(1).map((tag) => (
            <Badge key={tag} tone="gray">
              {tag}
            </Badge>
          ))}
          {product.category && <Badge tone="gray">{product.category}</Badge>}
          {product.packaging_type && (
            <Badge tone="gray">{product.packaging_type}</Badge>
          )}
        </div>
        {product.description && (
          <p className="text-sm text-slate-600 line-clamp-2">
            {product.description}
          </p>
        )}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-xs text-slate-400">
            Dibuat {formatDateID(product.created_at, { day: "numeric", month: "short" })}
          </span>
          <Link to={`/produk/${product.id}`}>
            <Button variant="ghost" size="sm">
              Lihat Detail →
            </Button>
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
