import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/supabase/auth-store";
import { ENGAGEMENT_STATUS_LABELS, ENGAGEMENT_STATUS_TONES } from "@/lib/constants";
import { formatDateID, debounce } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { ConsultantEngagement } from "@/types";

export default function ConsultantClientsPage() {
  const activeOrgId = useAuthStore((s) => s.activeOrganizationId);
  const activeRole = useAuthStore((s) => s.activeRole());
  const isPlatformAdmin = useAuthStore((s) => s.isPlatformAdmin());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: engagements = [], isLoading } = useQuery({
    queryKey: ["consultant-engagements-list", activeOrgId],
    enabled: Boolean(activeOrgId),
    queryFn: async () => {
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

  const handleSearch = debounce((value: string) => setSearch(value), 300);

  const filtered = useMemo(() => {
    return engagements.filter((e) => {
      if (statusFilter && e.status !== statusFilter) return false;
      if (search) {
        return (e.business_organization?.name ?? "")
          .toLowerCase()
          .includes(search.toLowerCase());
      }
      return true;
    });
  }, [engagements, search, statusFilter]);

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Klien UMKM" />
        <LoadingState label="Memuat klien..." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Klien UMKM"
        description="Daftar UMKM yang kamu dampingi beserta status engagement."
      />

      <Card className="mb-5">
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label htmlFor="client-search" className="label-text">
              Cari klien
            </label>
            <Input
              id="client-search"
              placeholder="Nama usaha..."
              onChange={(e) => handleSearch(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <label htmlFor="client-status" className="label-text">
              Status
            </label>
            <Select
              id="client-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1.5"
            >
              <option value="">Semua status</option>
              {Object.entries(ENGAGEMENT_STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </CardBody>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            title="Tidak ada klien"
            description="Belum ada UMKM yang terhubung dengan kamu. Request pendampingan akan muncul di sini."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <Card key={e.id} className="transition-shadow hover:shadow-card-lg">
              <CardBody>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold text-slate-900">
                    {e.business_organization?.name ?? "Klien"}
                  </h3>
                  <Badge className={ENGAGEMENT_STATUS_TONES[e.status]}>
                    {ENGAGEMENT_STATUS_LABELS[e.status]}
                  </Badge>
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  {e.package_name ?? "Paket standar"}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Sejak {formatDateID(e.created_at, { day: "numeric", month: "short" })}
                </p>
                {e.status === "active" && (
                  <Link to={`/consultant/clients/${e.business_organization_id}`}>
                    <button
                      type="button"
                      className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      Lihat Detail
                    </button>
                  </Link>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
