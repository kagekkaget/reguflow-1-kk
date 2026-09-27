import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/supabase/auth-store";
import { queryKeys } from "@/hooks/use-queries";
import { useQueryClient } from "@tanstack/react-query";
import { ENGAGEMENT_STATUS_LABELS, ENGAGEMENT_STATUS_TONES } from "@/lib/constants";
import { getSafeErrorMessage, formatDateID } from "@/lib/utils";
import type { ConsultantEngagement } from "@/types";
import { useQuery } from "@tanstack/react-query";

export default function PendampingPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const activeOrgId = useAuthStore((s) => s.activeOrganizationId);

  const { data: engagements = [], isLoading } = useQuery({
    queryKey: queryKeys.engagements,
    enabled: Boolean(activeOrgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultant_engagements")
        .select(
          "*, business_organization:organizations!consultant_engagements_business_organization_id_fkey(id, name), consultant_organization:organizations!consultant_engagements_consultant_organization_id_fkey(id, name)"
        )
        .eq("business_organization_id", activeOrgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ConsultantEngagement[];
    },
  });

  const activeEngagement = engagements.find(
    (e) => e.status === "active" || e.status === "pending"
  );

  const handleRequestConsultant = async () => {
    if (!activeOrgId) return;
    try {
      // Buat request engagement dengan konsultan yang tersedia di platform.
      // Untuk MVP: cari consultant_agency pertama yang aktif.
      const { data: consultants } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("type", "consultant_agency")
        .limit(1);

      const consultant = consultants?.[0];
      if (!consultant) {
        toast.info(
          "Belum ada konsultan",
          "Saat ini belum ada konsultan yang terdaftar di platform. Coba lagi nanti."
        );
        return;
      }

      const { error } = await supabase
        .from("consultant_engagements")
        .insert({
          business_organization_id: activeOrgId,
          consultant_organization_id: consultant.id,
          package_name: "Pendampingan Compliance Dasar",
          scope: "Asesmen kesiapan, review checklist, dan pendampingan dokumen",
          status: "pending",
        });

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: queryKeys.engagements });
      toast.success(
        "Permintaan terkirim",
        `Permintaan pendampingan dikirim ke ${consultant.name}. Tunggu konfirmasi.`
      );
    } catch (error) {
      toast.error("Gagal meminta pendamping", getSafeErrorMessage(error));
    }
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Pendamping / Konsultan" />
        <LoadingState label="Memuat data pendamping..." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Pendamping / Konsultan"
        description="Minta bantuan pendamping untuk mereview kesiapan compliance kamu."
      />

      {activeEngagement ? (
        <Card className="mb-5">
          <CardBody className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Pendamping kamu
                </p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">
                  {activeEngagement.consultant_organization?.name ??
                    "Konsultan ReguFlow"}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {activeEngagement.package_name}
                </p>
              </div>
              <Badge className={ENGAGEMENT_STATUS_TONES[activeEngagement.status]}>
                {ENGAGEMENT_STATUS_LABELS[activeEngagement.status]}
              </Badge>
            </div>
            {activeEngagement.scope && (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                {activeEngagement.scope}
              </p>
            )}
            <p className="text-xs text-slate-500">
              Mulai:{" "}
              {activeEngagement.started_at
                ? formatDateID(activeEngagement.started_at)
                : "Menunggu konfirmasi"}
            </p>
          </CardBody>
        </Card>
      ) : (
        <Card className="mb-5">
          <EmptyState
            title="Belum punya pendamping"
            description="Kamu bisa minta pendamping untuk membantu review checklist dan dokumen sebelum diajukan resmi."
            actionLabel="Minta Pendampingan"
            onAction={handleRequestConsultant}
          />
        </Card>
      )}

      <Card className="mb-5">
        <CardBody>
          <h3 className="text-base font-semibold text-slate-900">
            Cara Kerja Pendampingan
          </h3>
          <ol className="mt-4 space-y-3">
            {[
              "Kamu minta pendampingan melalui tombol di atas.",
              "Pendamping akan menghubungi & mengkonfirmasi.",
              "Pendamping mereview checklist & dokumen kamu.",
              "Kamu menerima rekomendasi perbaikan.",
              "Saat sudah siap, kamu mengajukan sendiri ke portal resmi.",
            ].map((step, idx) => (
              <li key={idx} className="flex gap-3 text-sm text-slate-600">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                  {idx + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>

      {engagements.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Riwayat Pendampingan
          </h2>
          <div className="mt-4 space-y-3">
            {engagements.map((e) => (
              <Card key={e.id}>
                <CardBody className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {e.consultant_organization?.name ?? "Konsultan"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {e.package_name} · {formatDateID(e.created_at)}
                    </p>
                  </div>
                  <Badge className={ENGAGEMENT_STATUS_TONES[e.status]}>
                    {ENGAGEMENT_STATUS_LABELS[e.status]}
                  </Badge>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-xs leading-relaxed text-slate-400">
        ReguFlow adalah alat bantu pengelolaan dokumen dan kesiapan kepatuhan.
        Keputusan akhir dan pengajuan resmi tetap dilakukan melalui portal resmi
        pemerintah atau pendamping/konsultan terkait.
      </p>
    </div>
  );
}
