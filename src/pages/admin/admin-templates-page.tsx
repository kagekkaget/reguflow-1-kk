import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, type Column } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading";
import { api } from "@/lib/api/client";
import { DOMAIN_CODE_LABELS } from "@/lib/constants";
import { useQuery } from "@tanstack/react-query";
import type { Requirement } from "@/types";

export default function AdminTemplatesPage() {
  const { data: requirements = [], isLoading } = useQuery({
    queryKey: ["admin-requirements"],
    queryFn: async () => {
      const data = await api.get<Requirement[]>("/api/compliance/requirements");
      return data;
    },
  });

  const columns: Column<Requirement>[] = [
    { key: "name", header: "Nama Requirement", cell: (r) => r.name },
    {
      key: "domain",
      header: "Domain",
      cell: (r) => (
        <Badge tone="blue">
          {DOMAIN_CODE_LABELS[r.domain_code] ?? r.domain_code}
        </Badge>
      ),
    },
    { key: "doc", header: "Dokumen Wajib", hideOnMobile: true, cell: (r) => r.required_document_type ?? "-" },
    {
      key: "mandatory",
      header: "Wajib",
      cell: (r) => (
        <Badge tone={r.is_mandatory ? "red" : "gray"}>
          {r.is_mandatory ? "Wajib" : "Opsional"}
        </Badge>
      ),
    },
    { key: "order", header: "Urutan", hideOnMobile: true, cell: (r) => r.sort_order },
  ];

  return (
    <div>
      <PageHeader
        title="Template Checklist"
        description="Template requirement untuk checklist compliance per domain."
      />

      <Card className="mb-5 border-brand-200 bg-brand-50/40">
        <CardBody>
          <p className="text-sm text-slate-700">
            Template awal untuk halal, NIB, SPP-IRT, labeling, dan dokumen usaha
            sudah disediakan melalui seed SQL di <code>server/src/db/seed.ts</code>. Jalankan ulang
            seed jika ingin reset template.
          </p>
        </CardBody>
      </Card>

      {isLoading ? (
        <LoadingState label="Memuat template..." />
      ) : requirements.length === 0 ? (
        <Card>
          <EmptyState
            title="Belum ada template"
            description="Jalankan seed SQL untuk membuat template requirement awal."
          />
        </Card>
      ) : (
        <Table
          columns={columns}
          data={requirements}
          rowKey={(r) => r.id}
          empty={<EmptyState title="Belum ada template" />}
        />
      )}
    </div>
  );
}
