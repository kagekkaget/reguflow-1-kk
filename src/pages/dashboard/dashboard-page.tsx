import { Link } from "react-router-dom";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScoreCard } from "@/components/ui/score-card";
import { Progress } from "@/components/ui/progress";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading";
import { PageHeader } from "@/components/layout/page-header";
import {
  useBusiness,
  useComplianceCases,
  useDocuments,
  useTasks,
} from "@/hooks/use-queries";
import { useComplianceScanner } from "@/hooks/use-scanner";
import { useAuthStore } from "@/lib/api/auth-store";
import {
  CASE_STATUS_LABELS,
  CASE_STATUS_TONES,
  DISCLAIMER,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_TONES,
  DOMAIN_CODE_LABELS,
  TASK_PRIORITY_LABELS,
} from "@/lib/constants";
import { formatDateID, relativeDateLabel, daysUntil } from "@/lib/utils";

export default function DashboardPage() {
  const profile = useAuthStore((s) => s.profile);
  const {
    data: businesses,
    isLoading: loadingBusiness,
    isError: businessError,
  } = useBusiness();
  const { data: documents = [], isLoading: loadingDocuments } = useDocuments();
  const { data: tasks = [] } = useTasks();
  const { data: cases = [], isLoading: loadingCases } = useComplianceCases();
  const { result: scanResult, loading: scanning } = useComplianceScanner();

  const business = businesses?.[0] ?? null;
  const noBusiness = !loadingBusiness && !business;

  const urgentTasks = tasks
    .filter((t) => t.status !== "done" && t.status !== "cancelled")
    .sort((a, b) => {
      const order = { urgent: 0, high: 1, medium: 2, low: 3 };
      return order[a.priority] - order[b.priority];
    })
    .slice(0, 4);

  const recentDocuments = documents.slice(0, 4);
  const missingDocs = scanResult?.missingDocuments ?? [];

  if (loadingBusiness || businessError) {
    return (
      <div>
        <PageHeader
          title={`Halo, ${profile?.full_name?.split(" ")[0] ?? ""}!`}
          description="Ini ringkasan kesiapan compliance usaha kamu."
        />
        {businessError ? (
          <ErrorState
            title="Gagal memuat data"
            description="Terjadi kesalahan saat memuat data usaha. Coba lagi."
            onRetry={() => window.location.reload()}
          />
        ) : (
          <LoadingState label="Memuat dashboard..." />
        )}
      </div>
    );
  }

  if (noBusiness) {
    return (
      <div>
        <PageHeader
          title={`Halo, ${profile?.full_name?.split(" ")[0] ?? ""}!`}
          description="Ini ringkasan kesiapan compliance usaha kamu."
        />
        <Card>
          <EmptyState
            title="Selamat datang di ReguFlow!"
            description="Kamu belum memiliki profil usaha. Mulai dengan onboarding untuk mengisi data usaha, produk, dan dokumen kamu."
            actionLabel="Mulai Onboarding"
            onAction={() => (window.location.href = "/onboarding")}
          />
        </Card>
        <div className="mt-6">
          <Card className="border-amber-200 bg-amber-50/60">
            <CardBody>
              <p className="text-sm text-slate-600">{DISCLAIMER}</p>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Halo, ${profile?.full_name?.split(" ")[0] ?? ""}!`}
        description={`Ini ringkasan kesiapan compliance ${business?.legal_name ?? "usaha kamu"}.`}
        actions={
          <Link to="/compliance">
            <Button variant="outline" size="sm">
              Lihat Compliance
            </Button>
          </Link>
        }
      />

      {scanning && !scanResult ? (
        <LoadingState label="Menghitung skor kesiapan..." />
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <ScoreCard score={scanResult?.score ?? 0} />

          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">
                  Dokumen Kurang
                </h3>
                <span className="text-2xl font-bold text-slate-900">
                  {missingDocs.length}
                </span>
              </div>
              <div className="mt-4 space-y-2">
                {missingDocs.length === 0 ? (
                  <p className="text-sm text-emerald-600">
                    Semua dokumen utama sudah lengkap!
                  </p>
                ) : (
                  missingDocs.slice(0, 4).map((doc) => (
                    <div
                      key={doc}
                      className="flex items-center gap-2 text-sm text-slate-600"
                    >
                      <svg
                        className="h-4 w-4 flex-shrink-0 text-red-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" d="M12 9v3.75m0 3.75h.007" />
                      </svg>
                      {doc}
                    </div>
                  ))
                )}
              </div>
              <Link
                to="/dokumen"
                className="mt-4 inline-flex text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                Buka brankas dokumen →
              </Link>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">
                  Task Mendesak
                </h3>
                <span className="text-2xl font-bold text-slate-900">
                  {urgentTasks.length}
                </span>
              </div>
              <div className="mt-4 space-y-2.5">
                {urgentTasks.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Tidak ada task mendesak. Kerja bagus!
                  </p>
                ) : (
                  urgentTasks.slice(0, 3).map((task) => (
                    <div key={task.id} className="flex items-start gap-2">
                      <Badge tone="red" className="flex-shrink-0">
                        {TASK_PRIORITY_LABELS[task.priority]}
                      </Badge>
                      <span className="text-sm text-slate-700 line-clamp-1">
                        {task.title}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <Link
                to="/tasks"
                className="mt-4 inline-flex text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                Lihat semua task →
              </Link>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Status compliance utama */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Status Compliance
              </h3>
              <Link to="/compliance">
                <Button variant="ghost" size="sm">
                  Semua
                </Button>
              </Link>
            </div>
            {loadingCases ? (
              <LoadingState label="Memuat..." />
            ) : cases.length === 0 ? (
              <EmptyState
                title="Belum ada compliance case"
                description="Jalankan scanner untuk membuat compliance case otomatis berdasarkan data kamu."
                actionLabel="Jalankan Scanner"
                onAction={() => (window.location.href = "/compliance")}
              />
            ) : (
              <div className="space-y-3">
                {cases.slice(0, 4).map((c) => (
                  <Link
                    key={c.id}
                    to={`/compliance/${c.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 transition-colors hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        {DOMAIN_CODE_LABELS[c.domain_code] ?? c.domain_code}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 truncate">
                        {c.title}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <Progress
                        value={c.score}
                        className="w-16"
                        tone={c.score > 80 ? "green" : c.score > 50 ? "amber" : "red"}
                      />
                      <Badge className={CASE_STATUS_TONES[c.status]}>
                        {CASE_STATUS_LABELS[c.status]}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Dokumen Terbaru
              </h3>
              <Link to="/dokumen">
                <Button variant="ghost" size="sm">
                  Semua
                </Button>
              </Link>
            </div>
            {loadingDocuments ? (
              <LoadingState label="Memuat..." />
            ) : recentDocuments.length === 0 ? (
              <EmptyState
                title="Belum ada dokumen"
                description="Upload dokumen pertama kamu untuk mulai membangun brankas."
                actionLabel="Upload Dokumen"
                onAction={() => (window.location.href = "/dokumen")}
              />
            ) : (
              <div className="space-y-3">
                {recentDocuments.map((doc) => {
                  const days = daysUntil(doc.expiry_date);
                  const isExpiringSoon =
                    days !== null && days <= 30 && days >= 0;
                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {doc.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatDateID(doc.created_at)}
                          {doc.expiry_date
                            ? ` ·_expired ${relativeDateLabel(doc.expiry_date)}`
                            : ""}
                        </p>
                      </div>
                      <Badge
                        className={
                          isExpiringSoon
                            ? "bg-amber-100 text-amber-700"
                            : DOCUMENT_STATUS_TONES[doc.verification_status]
                        }
                      >
                        {isExpiringSoon
                          ? "Akan Kadaluarsa"
                          : DOCUMENT_STATUS_LABELS[doc.verification_status]}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Rekomendasi next step */}
      <Card className="mt-5 border-brand-200 bg-brand-50/40">
        <CardBody>
          <h3 className="text-base font-semibold text-slate-900">
            Rekomendasi Langkah Berikutnya
          </h3>
          <ol className="mt-4 space-y-3">
            {(scanResult?.recommendations ?? [
              "Lengkapi data usaha kamu di halaman Profil Usaha.",
            ])
              .slice(0, 3)
              .map((rec, idx) => (
                <li
                  key={idx}
                  className="flex gap-3 text-sm text-slate-700"
                >
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                    {idx + 1}
                  </span>
                  {rec}
                </li>
              ))}
          </ol>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link to="/onboarding" className="flex-1">
              <Button fullWidth variant="outline">
                Lanjutkan Onboarding
              </Button>
            </Link>
            <Link to="/pendamping" className="flex-1">
              <Button fullWidth>Minta Review Pendamping</Button>
            </Link>
          </div>
        </CardBody>
      </Card>

      <p className="mt-6 text-xs leading-relaxed text-slate-400">{DISCLAIMER}</p>
    </div>
  );
}
