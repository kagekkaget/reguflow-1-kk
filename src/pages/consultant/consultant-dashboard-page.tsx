import { Link } from "react-router-dom";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api/client";
import { useAuthStore } from "@/lib/api/auth-store";
import {
  CASE_STATUS_LABELS,
  CASE_STATUS_TONES,
  ENGAGEMENT_STATUS_LABELS,
  ENGAGEMENT_STATUS_TONES,
} from "@/lib/constants";
import { getSafeErrorMessage, formatDateID } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CaseStatus, ConsultantEngagement } from "@/types";

type ApiEngagement = {
  id: string;
  businessOrganizationId: string;
  consultantOrganizationId: string;
  packageName: string | null;
  scope: string | null;
  status: ConsultantEngagement["status"];
  price: number | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  businessOrganizationName: string;
};

function mapEngagement(e: ApiEngagement): ConsultantEngagement {
  return {
    id: e.id,
    business_organization_id: e.businessOrganizationId,
    consultant_organization_id: e.consultantOrganizationId,
    package_name: e.packageName,
    scope: e.scope,
    status: e.status,
    price: e.price,
    started_at: e.startedAt,
    ended_at: e.endedAt,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
    business_organization: { id: e.businessOrganizationId, name: e.businessOrganizationName },
    consultant_organization: null,
  };
}

export default function ConsultantDashboardPage() {
  const toast = useToast();
  const activeOrgId = useAuthStore((s) => s.activeOrganizationId);
  const activeRole = useAuthStore((s) => s.activeRole());
  const isPlatformAdmin = useAuthStore((s) => s.isPlatformAdmin());
  const queryClient = useQueryClient();

  const {
    data: engagements = [],
    isLoading,
  } = useQuery({
    queryKey: ["consultant-engagements", activeOrgId],
    enabled: Boolean(activeOrgId),
    queryFn: async () => {
      // Admin platform melihat semua engagement; konsultan melihat milik org-nya
      const data = await api.get<ApiEngagement[]>("/api/engagements");
      const filtered = (!isPlatformAdmin && activeRole === "consultant")
        ? data.filter((e) => e.consultantOrganizationId === activeOrgId)
        : data;
      return filtered.map(mapEngagement);
    },
  });

  const activeEngagements = engagements.filter(
    (e) => e.status === "active" || e.status === "pending"
  );

  const { data: clientCases = [] } = useQuery({
    queryKey: ["consultant-cases", activeOrgId],
    enabled: engagements.length > 0,
    queryFn: async () => {
      const orgIds = engagements
        .filter((e) => e.business_organization_id)
        .map((e) => e.business_organization_id);
      if (orgIds.length === 0) return [];

      // Fetch compliance cases for each client business org
      const cases: Array<{
        id: string;
        title: string;
        domain_code: string;
        status: CaseStatus;
        score: number;
        business: { id: string; legal_name: string; organization_id: string } | null;
        updated_at: string;
      }> = [];

      for (const orgId of orgIds) {
        const data = await api.get<{
          id: string;
          businessId: string;
          productId: string | null;
          domainCode: string;
          pathway: string | null;
          title: string;
          status: CaseStatus;
          score: number;
          dueDate: string | null;
          assignedConsultantId: string | null;
          createdAt: string;
          updatedAt: string;
          productName: string | null;
        }[]>(`/api/organizations/${orgId}/compliance-cases`);
        cases.push(...data.map((c) => ({
          id: c.id,
          title: c.title,
          domain_code: c.domainCode,
          status: c.status,
          score: c.score,
          business: { id: c.businessId, legal_name: c.title, organization_id: orgId },
          updated_at: c.updatedAt,
        })));
      }

      return cases;
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
      await api.patch(`/api/engagements/${id}`, { status });
      queryClient.invalidateQueries({ queryKey: ["consultant-engagements", activeOrgId] });
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
