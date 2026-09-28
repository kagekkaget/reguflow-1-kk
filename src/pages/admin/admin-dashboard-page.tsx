import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading";
import { api } from "@/lib/api/client";
import { useQuery } from "@tanstack/react-query";
import { formatDateID } from "@/lib/utils";

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const stats = await api.get<{
        totalUsers: number;
        totalMembers: number;
        totalBusinesses: number;
        totalProducts: number;
        totalDocuments: number;
        activeCases: number;
        thisMonthAssessments: number;
      }>("/api/admin/stats");
      return stats;
    },
  });

  const { data: recentUsers = [] } = useQuery({
    queryKey: ["admin-recent-users"],
    queryFn: async () => {
      const data = await api.get<Array<{
        id: string;
        fullName: string;
        email: string;
        defaultRole: string;
        createdAt: string;
      }>>("/api/admin/users");
      return data;
    },
  });

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Dashboard Admin" />
        <LoadingState label="Memuat statistik platform..." />
      </div>
    );
  }

  const cards = [
    { label: "Total Pengguna", value: stats?.totalUsers ?? 0, hint: "User terdaftar" },
    { label: "Total Anggota Org", value: stats?.totalMembers ?? 0, hint: "Membership aktif" },
    { label: "Total UMKM", value: stats?.totalBusinesses ?? 0, hint: "Profil usaha" },
    { label: "Total Produk", value: stats?.totalProducts ?? 0 },
    {
      label: "Assessment Bulan Ini",
      value: stats?.thisMonthAssessments ?? 0,
      hint: "Cek kesiapan publik",
    },
    { label: "Dokumen Diupload", value: stats?.totalDocuments ?? 0 },
    { label: "Compliance Case Aktif", value: stats?.activeCases ?? 0 },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard Admin"
        description="Statistik platform ReguFlow secara keseluruhan."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardBody>
              <p className="text-sm font-medium text-slate-500">{card.label}</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">
                {card.value}
              </p>
              {card.hint && (
                <p className="mt-1 text-xs text-slate-400">{card.hint}</p>
              )}
            </CardBody>
          </Card>
        ))}
      </div>

      <Card className="mt-5">
        <CardBody>
          <h3 className="text-base font-semibold text-slate-900">
            Pengguna Terbaru
          </h3>
          {recentUsers.length === 0 ? (
            <EmptyState title="Belum ada pengguna" />
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {recentUsers.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {u.fullName || "Tanpa nama"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDateID(u.createdAt)}
                    </p>
                  </div>
                  <Badge tone="gray">{u.defaultRole}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
