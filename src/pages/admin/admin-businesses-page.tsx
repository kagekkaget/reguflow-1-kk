import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, type Column } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading";
import { supabase } from "@/lib/supabase/client";
import { formatDateID } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { Business } from "@/types";

export default function AdminBusinessesPage() {
  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ["admin-businesses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("id, legal_name, brand_name, nib, city, business_scale, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Business[];
    },
  });

  const columns: Column<Business>[] = [
    { key: "name", header: "Nama Usaha", cell: (b) => b.legal_name },
    { key: "brand", header: "Brand", hideOnMobile: true, cell: (b) => b.brand_name ?? "-" },
    { key: "nib", header: "NIB", hideOnMobile: true, cell: (b) => b.nib ?? <Badge tone="red">Belum ada</Badge> },
    { key: "city", header: "Kota", hideOnMobile: true, cell: (b) => b.city ?? "-" },
    { key: "scale", header: "Skala", cell: (b) => <Badge tone="gray">{b.business_scale ?? "-"}</Badge> },
    { key: "created", header: "Dibuat", hideOnMobile: true, cell: (b) => formatDateID(b.created_at) },
  ];

  return (
    <div>
      <PageHeader
        title="Usaha"
        description="Semua profil usaha UMKM di platform."
      />
      {isLoading ? (
        <LoadingState label="Memuat usaha..." />
      ) : businesses.length === 0 ? (
        <Card>
          <EmptyState title="Belum ada usaha" />
        </Card>
      ) : (
        <Table
          columns={columns}
          data={businesses}
          rowKey={(b) => b.id}
          empty={<EmptyState title="Belum ada usaha" />}
        />
      )}
    </div>
  );
}
