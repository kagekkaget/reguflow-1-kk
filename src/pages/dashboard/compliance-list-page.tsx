import { Link } from "react-router-dom";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading";
import { useComplianceCases, useBusiness } from "@/hooks/use-queries";
import { useComplianceScanner } from "@/hooks/use-scanner";
import {
  CASE_STATUS_LABELS,
  CASE_STATUS_TONES,
  DOMAIN_CODE_LABELS,
} from "@/lib/constants";
import { formatDateID } from "@/lib/utils";

export default function ComplianceListPage() {
  const { data: businesses } = useBusiness();
  const { data: cases = [], isLoading } = useComplianceCases();
  const { result: scanResult, loading: scanning, runScannerAndCreateCases } =
    useComplianceScanner();
  const business = businesses?.[0] ?? null;

  const handleRunScanner = async () => {
    const result = await runScannerAndCreateCases();
    if (result) {
      window.location.reload();
    }
  };

  return (
    <div>
      <PageHeader
        title="Compliance"
        description="Daftar compliance case usaha kamu beserta status dan checklist."
        actions={
          <Button
            onClick={handleRunScanner}
            loading={scanning}
            disabled={!business}
          >
            Jalankan Scanner
          </Button>
        }
      />

      {scanResult && (
        <Card className="mb-5 border-brand-200 bg-brand-50/40">
          <CardBody>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Hasil scan terakhir
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {scanResult.score}
                  <span className="text-base font-normal text-slate-400">/100</span>
                  <span className="ml-2 text-sm font-semibold text-slate-600">
                    {scanResult.statusLabel}
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {scanResult.suggestedCases.map((code) => (
                  <Badge key={code} tone="blue">
                    {DOMAIN_CODE_LABELS[code] ?? code}
                  </Badge>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {isLoading ? (
        <LoadingState label="Memuat compliance case..." />
      ) : !business ? (
        <Card>
          <EmptyState
            title="Profil usaha belum ada"
            description="Lengkapi profil usaha untuk mulai membuat compliance case."
            actionLabel="Isi Profil Usaha"
            onAction={() => (window.location.href = "/usaha")}
          />
        </Card>
      ) : cases.length === 0 ? (
        <Card>
          <EmptyState
            title="Belum ada compliance case"
            description="Jalankan scanner untuk membuat compliance case & checklist otomatis berdasarkan data usaha dan produk kamu."
            actionLabel="Jalankan Scanner"
            onAction={handleRunScanner}
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {cases.map((c) => (
            <Card key={c.id} className="transition-shadow hover:shadow-card-lg">
              <CardBody>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Badge tone="blue" className="mb-2">
                      {DOMAIN_CODE_LABELS[c.domain_code] ?? c.domain_code}
                    </Badge>
                    <h3 className="text-base font-semibold text-slate-900">
                      {c.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {c.business?.legal_name}
                      {c.product ? ` · ${c.product.name}` : ""}
                    </p>
                  </div>
                  <Badge className={CASE_STATUS_TONES[c.status]}>
                    {CASE_STATUS_LABELS[c.status]}
                  </Badge>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Skor checklist</span>
                    <span className="font-semibold text-slate-900">
                      {c.score}/100
                    </span>
                  </div>
                  <Progress
                    value={c.score}
                    className="mt-1.5"
                    tone={
                      c.score > 80 ? "green" : c.score > 50 ? "amber" : "red"
                    }
                  />
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-xs text-slate-400">
                    Dibuat {formatDateID(c.created_at, { day: "numeric", month: "short" })}
                  </span>
                  <Link to={`/compliance/${c.id}`}>
                    <Button variant="ghost" size="sm">
                      Buka Detail →
                    </Button>
                  </Link>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
