import { Link } from "react-router-dom";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/supabase/auth-store";
import {
  CASE_STATUS_LABELS,
  CASE_STATUS_TONES,
  ENGAGEMENT_STATUS_LABELS,
  ENGAGEMENT_STATUS_TONES,
} from "@/lib/constants";
import { getSafeErrorMessage, formatDateID } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { CaseStatus, ConsultantEngagement } from "@/types";

export default function ConsultantDashboardPage() {
  const toast = useToast();
  const activeOrgId = useAuthStore((s) => s.activeOrganizationId);
  const activeRole = useAuthStore((s) => s.activeRole());
  const isPlatformAdmin = useAuthStore((s) => s.isPlatformAdmin());

  const {
    data: engagements = [],
    isLoading,
  } = useQuery({
    queryKey: ["consultant-engagements", activeOrgId],
    enabled: Boolean(activeOrgId),
    queryFn: async () => {
      // Admin platform melihat semua engagement; konsultan melihat milik org-nya
      const baseQuery = supabase
        .from("consultant_engagements")
        .select(
          "*, business_organization:organizations!consultant_engagements_business_organization_id_fkey(id, name)"
        );
      const query = !isPlatformAdmin && activeRole === "consultant"
        ? baseQuery.eq("consultant_organization_id", activeOrgId!)
        : baseQuery;
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ConsultantEngagement[];
    },
  });

  const activeEngagements = engagements.filter(
    (e) => e.status === "active" || e.status === "pending"
  );

  const { data: clientCases = [] } = useQuery({
    queryKey: ["consultant-cases", activeOrgId],
    enabled: engagements.length > 0,
    queryFn: async () => {
      const orgIds = engagements.map((e) => e.business_organization_id);
      const { data: businesses } = await supabase
        .from("businesses")
        .select("id")
        .in("organization_id", orgIds);
      if (!businesses || businesses.length === 0) return [];
      const { data, error } = await supabase
        .from("compliance_cases")
        .select(
          "*, business:businesses!compliance_cases_business_id_fkey(id, legal_name, brand_name, organization_id)"
        )
        .in(
          "business_id",
          businesses.map((b) => b.id)
        )
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        title: string;
        domain_code: string;
        status: CaseStatus;
        score: number;
        business: { id: string; legal_name: string; organization_id: string } | null;
        updated_at: string;
      }>;
    },
  });

  const needReview = clientCases.filter(
    (c) => c.status === "internal_review" || c.status === "consultant_review"
  );
  const readyToSubmit = clientCases.filter((c) => c.status === "ready_to_submit");
  const revisionCases = clientCases.filter((c) => c.status === "revision");

  const handleUpdateEngagement = async (
    id: string,
    status: ConsultantEngagement["status"]
  ) => {
    try {
      const { error } = await supabase
        .from("consultant_engagements")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
      toast.success("Status diperbarui", ENGAGEMENT_STATUS_LABELS[status]);
    } catch (error) {
      toast.error("Gagal memperbarui", getSafeErrorMessage(error));
    }
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Dashboard Konsultan" />
        <LoadingState label="Memuat data klien..." />
      </div>
    );
  }

  const stats = [
    { label: "Klien Aktif", value: activeEngagements.length, tone: "blue" },
    { label: "Butuh Review", value: needReview.length, tone: "amber" },
    { label: "Siap Submit", value: readyToSubmit.length, tone: "green" },
    { label: "Revisi", value: revisionCases.length, tone: "red" },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard Konsultan"
        description="Pantau klien UMKM dampingan dan compliance case mereka."
        actions={
          <Link to="/consultant/clients">
            <Button variant="outline" size="sm">
              Semua Klien
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardBody>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">
                {stat.value}
              </p>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h3 className="text-base font-semibold text-slate-900">
              Klien Dampingan
            </h3>
            {activeEngagements.length === 0 ? (
              <EmptyState
                title="Belum ada klien"
                description="Klien yang request pendampingan akan muncul di sini."
              />
            ) : (
              <div className="mt-4 space-y-3">
                {activeEngagements.map((e) => (
                  <div
                    key={e.id}
                    className="rounded-xl border border-slate-100 p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900">
                        {e.business_organization?.name ?? "Klien"}
                      </p>
                      <Badge className={ENGAGEMENT_STATUS_TONES[e.status]}>
                        {ENGAGEMENT_STATUS_LABELS[e.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {e.package_name} · {formatDateID(e.created_at)}
                    </p>
                    {e.status === "pending" && (
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateEngagement(e.id, "active")}
                        >
                          Konfirmasi
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateEngagement(e.id, "cancelled")}
                        >
                          Tolak
                        </Button>
                      </div>
                    )}
                    {e.status === "active" && (
                      <Link to={`/consultant/clients/${e.business_organization_id}`}>
                        <Button size="sm" variant="ghost" className="mt-3">
                          Lihat Detail Klien →
                        </Button>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="text-base font-semibold text-slate-900">
              Aktivitas Compliance Terbaru
            </h3>
            {clientCases.length === 0 ? (
              <EmptyState
                title="Belum ada aktivitas"
                description="Compliance case klien akan muncul di sini."
              />
            ) : (
              <div className="mt-4 space-y-3">
                {clientCases.slice(0, 6).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {c.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 truncate">
                        {c.business?.legal_name} · {formatDateID(c.updated_at)}
                      </p>
                    </div>
                    <Badge className={CASE_STATUS_TONES[c.status]}>
                      {CASE_STATUS_LABELS[c.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
