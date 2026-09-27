import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading";
import { supabase } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { formatDateID } from "@/lib/utils";

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [
        { count: totalUsers },
        { count: totalProfiles },
        { count: totalBusinesses },
        { count: totalProducts },
        { count: totalDocuments },
        { count: activeCases },
        { count: thisMonthAssessments },
      ] = await Promise.all([
        supabase.from("organization_members").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("businesses").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("documents").select("*", { count: "exact", head: true }).is("deleted_at", null),
        supabase
          .from("compliance_cases")
          .select("*", { count: "exact", head: true })
          .not("status", "in", '("approved","expired")'),
        supabase
          .from("assessments")
          .select("*", { count: "exact", head: true })
          .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      ]);

      return {
        totalUsers: totalUsers ?? 0,
        totalProfiles: totalProfiles ?? 0,
        totalBusinesses: totalBusinesses ?? 0,
        totalProducts: totalProducts ?? 0,
        totalDocuments: totalDocuments ?? 0,
        activeCases: activeCases ?? 0,
        thisMonthAssessments: thisMonthAssessments ?? 0,
      };
    },
  });

  const { data: recentUsers = [] } = useQuery({
    queryKey: ["admin-recent-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, default_role, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        full_name: string;
        default_role: string;
        created_at: string;
      }>;
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
    { label: "Total Pengguna", value: stats?.totalProfiles ?? 0, hint: "User terdaftar" },
    { label: "Total Anggota Org", value: stats?.totalUsers ?? 0, hint: "Membership aktif" },
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
                      {u.full_name || "Tanpa nama"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDateID(u.created_at)}
                    </p>
                  </div>
                  <Badge tone="gray">{u.default_role}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
