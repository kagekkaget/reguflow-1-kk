import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, type Column } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading";
import { supabase } from "@/lib/supabase/client";
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_TONES,
  DOCUMENT_TYPE_LABELS,
} from "@/lib/constants";
import { formatBytes, formatDateID } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { DocumentRow } from "@/types";

export default function AdminDocumentsPage() {
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["admin-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DocumentRow[];
    },
  });

  const columns: Column<DocumentRow>[] = [
    { key: "title", header: "Judul", cell: (d) => d.title },
    {
      key: "type",
      header: "Jenis",
      hideOnMobile: true,
      cell: (d) => <Badge tone="gray">{DOCUMENT_TYPE_LABELS[d.document_type] ?? d.document_type}</Badge>,
    },
    { key: "size", header: "Ukuran", hideOnMobile: true, cell: (d) => formatBytes(d.file_size) },
    {
      key: "status",
      header: "Status",
      cell: (d) => (
        <Badge className={DOCUMENT_STATUS_TONES[d.verification_status]}>
          {DOCUMENT_STATUS_LABELS[d.verification_status]}
        </Badge>
      ),
    },
    { key: "expiry", header: "Kadaluarsa", hideOnMobile: true, cell: (d) => d.expiry_date ? formatDateID(d.expiry_date) : "-" },
    { key: "created", header: "Diupload", hideOnMobile: true, cell: (d) => formatDateID(d.created_at) },
  ];

  return (
    <div>
      <PageHeader
        title="Dokumen Platform"
        description="Semua dokumen yang diupload pengguna (metadata). File tetap private."
      />

      <Card className="mb-5 border-amber-200 bg-amber-50/60">
        <CardBody>
          <p className="text-sm text-slate-700">
            Admin hanya melihat metadata. Akses file tetap melalui signed URL dan
            RLS storage policy. Bucket dokumen harus selalu private.
          </p>
        </CardBody>
      </Card>

      {isLoading ? (
        <LoadingState label="Memuat dokumen..." />
      ) : documents.length === 0 ? (
        <Card>
          <EmptyState title="Belum ada dokumen" />
        </Card>
      ) : (
        <Table
          columns={columns}
          data={documents}
          rowKey={(d) => d.id}
          empty={<EmptyState title="Belum ada dokumen" />}
        />
      )}
    </div>
  );
}
