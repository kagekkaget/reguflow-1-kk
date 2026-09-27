import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading";
import { ErrorState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { CommentSection } from "@/components/common/comment-section";
import { useProduct, useComplianceCases } from "@/hooks/use-queries";
import {
  CASE_STATUS_LABELS,
  CASE_STATUS_TONES,
  DOMAIN_CODE_LABELS,
} from "@/lib/constants";
import { isValidUUID } from "@/lib/utils";
import { formatDateID } from "@/lib/utils";

type Tab = "ringkasan" | "bahan" | "dokumen" | "checklist" | "komentar";

const TABS: { key: Tab; label: string }[] = [
  { key: "ringkasan", label: "Ringkasan" },
  { key: "bahan", label: "Bahan" },
  { key: "dokumen", label: "Dokumen" },
  { key: "checklist", label: "Checklist" },
  { key: "komentar", label: "Komentar" },
];

export default function ProdukDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("ringkasan");

  const {
    data: product,
    isLoading,
    isError,
  } = useProduct(isValidUUID(id) ? id : undefined);
  const { data: cases = [] } = useComplianceCases();
  const productCases = cases.filter((c) => c.product_id === id);

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Detail Produk" />
        <LoadingState label="Memuat produk..." />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div>
        <PageHeader title="Detail Produk" />
        <Card>
          <ErrorState
            title="Produk tidak ditemukan"
            description="Produk mungkin sudah dihapus atau kamu tidak memiliki akses."
            retryLabel="Kembali ke Produk"
            onRetry={() => navigate("/produk")}
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={product.name}
        description={`Produk sejak ${formatDateID(product.created_at)}`}
        breadcrumbs={[
          { label: "Produk", to: "/produk" },
          { label: product.name },
        ]}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate("/produk")}>
            ← Semua Produk
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2 border-b border-slate-200 pb-px">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "text-brand-700"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
            {tab === t.key && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-600" />
            )}
          </button>
        ))}
      </div>

      {tab === "ringkasan" && (
        <Card>
          <CardBody>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <DetailItem label="SKU" value={product.sku} />
              <DetailItem label="Kategori" value={product.category} />
              <DetailItem label="Subkategori" value={product.subcategory} />
              <DetailItem label="Jenis kemasan" value={product.packaging_type} />
              <DetailItem label="Channel penjualan" value={product.sales_channel} />
              <DetailItem
                label="Makanan/minuman"
                value={product.is_food_or_beverage ? "Ya" : "Tidak"}
              />
              <DetailItem
                label="Kosmetik"
                value={product.is_cosmetic ? "Ya" : "Tidak"}
              />
              <DetailItem
                label="Produk impor"
                value={product.is_imported ? "Ya" : "Tidak"}
              />
              <DetailItem
                label="Bahan hewani"
                value={product.uses_animal_derived_material ? "Ya" : "Tidak"}
              />
              <DetailItem
                label="Mengandung alkohol"
                value={product.uses_alcohol_related_material ? "Ya" : "Tidak"}
              />
              <DetailItem
                label="Produksi rumahan"
                value={product.simple_production_process ? "Ya" : "Tidak"}
              />
            </dl>
            {product.description && (
              <div className="mt-6 border-t border-slate-100 pt-6">
                <dt className="text-sm font-medium text-slate-500">Deskripsi</dt>
                <dd className="mt-1.5 text-sm text-slate-700 whitespace-pre-wrap">
                  {product.description}
                </dd>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {tab === "bahan" && (
        <Card>
          <EmptyState
            title="Daftar bahan belum tersedia"
            description="Fitur manajemen bahan & supplier akan segera hadir. Sementara, catat daftar bahan di checklist halal."
            actionLabel="Lihat Compliance Halal"
            onAction={() => {
              const halalCase = productCases.find((c) => c.domain_code === "halal");
              if (halalCase) navigate(`/compliance/${halalCase.id}`);
              else navigate("/compliance");
            }}
          />
        </Card>
      )}

      {tab === "dokumen" && (
        <Card>
          <EmptyState
            title="Dokumen produk belum ada"
            description="Upload dokumen produk seperti foto, label, dan daftar bahan di Brankas Dokumen."
            actionLabel="Buka Brankas Dokumen"
            onAction={() => navigate("/dokumen")}
          />
        </Card>
      )}

      {tab === "checklist" && (
        <div className="space-y-4">
          {productCases.length === 0 ? (
            <Card>
              <EmptyState
                title="Belum ada compliance case"
                description="Jalankan scanner untuk membuat checklist compliance untuk produk ini."
                actionLabel="Buka Compliance"
                onAction={() => navigate("/compliance")}
              />
            </Card>
          ) : (
            productCases.map((c) => (
              <Card key={c.id}>
                <CardBody>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {DOMAIN_CODE_LABELS[c.domain_code] ?? c.domain_code}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{c.title}</p>
                    </div>
                    <Badge className={CASE_STATUS_TONES[c.status]}>
                      {CASE_STATUS_LABELS[c.status]}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => navigate(`/compliance/${c.id}`)}
                  >
                    Buka Checklist →
                  </Button>
                </CardBody>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "komentar" && (
        <Card>
          <CardBody>
            <CommentSection targetType="product" targetId={product.id} />
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{value || "-"}</dd>
    </div>
  );
}
