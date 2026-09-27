import { useNavigate, useParams } from "react-router-dom";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading";
import { PageHeader } from "@/components/layout/page-header";
import { ComplianceJourney } from "@/components/compliance/compliance-journey";
import { CommentSection } from "@/components/common/comment-section";
import {
  useComplianceCase,
  useUpdateCaseStatus,
  useUpdateChecklistItem,
} from "@/hooks/use-queries";
import {
  CASE_STATUS_LABELS,
  CASE_STATUS_TONES,
  DOMAIN_CODE_DESCRIPTIONS,
  DOMAIN_CODE_LABELS,
} from "@/lib/constants";
import { useToast } from "@/components/ui/toast";
import { getSafeErrorMessage, isValidUUID } from "@/lib/utils";
import type { CaseStatus } from "@/types";

const NEXT_STATUS: Partial<Record<CaseStatus, CaseStatus>> = {
  not_started: "data_collected",
  data_collected: "internal_review",
  internal_review: "consultant_review",
  consultant_review: "ready_to_submit",
  ready_to_submit: "submitted",
  submitted: "approved",
  revision: "data_collected",
};

export default function ComplianceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const {
    data: complianceCase,
    isLoading,
    isError,
  } = useComplianceCase(isValidUUID(id) ? id : undefined);
  const updateStatus = useUpdateCaseStatus();
  const updateChecklist = useUpdateChecklistItem(id ?? "");

  const checklist = complianceCase?.checklist_items ?? [];

  const doneCount = checklist.filter((c) => c.status === "done").length;
  const progress =
    checklist.length > 0
      ? Math.round((doneCount / checklist.length) * 100)
      : 0;

  const handleToggleChecklist = (itemId: string, current: boolean) => {
    updateChecklist.mutate({
      itemId,
      status: current ? "todo" : "done",
    });
  };

  const handleAdvance = async () => {
    if (!complianceCase) return;
    const next = NEXT_STATUS[complianceCase.status];
    if (!next) {
      toast.info("Sudah final", "Status case ini sudah final.");
      return;
    }
    try {
      await updateStatus.mutateAsync({
        caseId: complianceCase.id,
        status: next,
        score: progress,
      });
      toast.success("Status diperbarui", CASE_STATUS_LABELS[next]);
    } catch (error) {
      toast.error("Gagal memperbarui status", getSafeErrorMessage(error));
    }
  };

  const handleSetRevision = async () => {
    if (!complianceCase) return;
    try {
      await updateStatus.mutateAsync({
        caseId: complianceCase.id,
        status: "revision",
        score: progress,
      });
      toast.success("Status diperbarui", "Case butuh revisi.");
    } catch (error) {
      toast.error("Gagal memperbarui status", getSafeErrorMessage(error));
    }
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Detail Compliance" />
        <LoadingState label="Memuat compliance case..." />
      </div>
    );
  }

  if (isError || !complianceCase) {
    return (
      <div>
        <PageHeader title="Detail Compliance" />
        <Card>
          <ErrorState
            title="Compliance case tidak ditemukan"
            description="Case mungkin sudah dihapus atau kamu tidak memiliki akses."
            retryLabel="Kembali ke Compliance"
            onRetry={() => navigate("/compliance")}
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={complianceCase.title}
        breadcrumbs={[
          { label: "Compliance", to: "/compliance" },
          { label: DOMAIN_CODE_LABELS[complianceCase.domain_code] ?? "Detail" },
        ]}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate("/compliance")}>
            ← Semua Case
          </Button>
        }
      />

      <Card className="mb-5">
        <CardBody className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="blue">
                {DOMAIN_CODE_LABELS[complianceCase.domain_code] ??
                  complianceCase.domain_code}
              </Badge>
              <Badge className={CASE_STATUS_TONES[complianceCase.status]}>
                {CASE_STATUS_LABELS[complianceCase.status]}
              </Badge>
              {complianceCase.product && (
                <Badge tone="gray">Produk: {complianceCase.product.name}</Badge>
              )}
            </div>
            <div className="flex gap-2">
              {complianceCase.status !== "approved" &&
                complianceCase.status !== "expired" && (
                  <Button onClick={handleAdvance} loading={updateStatus.isPending}>
                    {complianceCase.status === "revision"
                      ? "Mulai Perbaikan"
                      : "Update Status →"}
                  </Button>
                )}
              {complianceCase.status !== "revision" &&
                complianceCase.status !== "approved" &&
                complianceCase.status !== "expired" && (
                  <Button
                    variant="outline"
                    onClick={handleSetRevision}
                    loading={updateStatus.isPending}
                  >
                    Tandai Revisi
                  </Button>
                )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">Progress checklist</span>
              <span className="font-semibold text-slate-900">
                {doneCount}/{checklist.length} selesai · {progress}%
              </span>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-brand-600 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <ComplianceJourney currentStatus={complianceCase.status} />

          {DOMAIN_CODE_DESCRIPTIONS[complianceCase.domain_code] && (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              {DOMAIN_CODE_DESCRIPTIONS[complianceCase.domain_code]}
            </p>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardBody>
            <h3 className="text-base font-semibold text-slate-900">Checklist</h3>
            {checklist.length === 0 ? (
              <EmptyState
                title="Checklist kosong"
                description="Jalankan scanner ulang untuk membuat checklist otomatis."
              />
            ) : (
              <div className="mt-4 space-y-2.5">
                {checklist
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 rounded-xl border border-slate-100 p-3.5"
                    >
                      <Checkbox
                        checked={item.status === "done"}
                        onChange={() =>
                          handleToggleChecklist(item.id, item.status === "done")
                        }
                        disabled={updateChecklist.isPending}
                        aria-label={item.title}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-medium ${
                            item.status === "done"
                              ? "text-slate-400 line-through"
                              : "text-slate-900"
                          }`}
                        >
                          {item.title}
                        </p>
                        {item.description && (
                          <p className="mt-0.5 text-xs text-slate-500">
                            {item.description}
                          </p>
                        )}
                      </div>
                      {item.status === "in_progress" && (
                        <Badge tone="blue">Sedang dikerjakan</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardBody>
            <CommentSection
              targetType="compliance_case"
              targetId={complianceCase.id}
              title="Komentar & Catatan"
            />
          </CardBody>
        </Card>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-slate-400">
        ReguFlow adalah alat bantu pengelolaan dokumen dan kesiapan kepatuhan.
        Keputusan akhir dan pengajuan resmi tetap dilakukan melalui portal resmi
        pemerintah atau pendamping/konsultan terkait.
      </p>
    </div>
  );
}
