import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading";
import { supabase } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { formatDateID } from "@/lib/utils";

export default function AdminReportsPage() {
  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ["admin-assessments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("id, business_name, city, score, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        business_name: string;
        city: string;
        score: number;
        created_at: string;
      }>;
    },
  });

  const { data: audits = [] } = useQuery({
    queryKey: ["admin-audits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, actor_id, created_at, metadata")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        action: string;
        actor_id: string | null;
        created_at: string;
        metadata: Record<string, unknown>;
      }>;
    },
  });

  const avgScore = assessments.length
    ? Math.round(assessments.reduce((sum, a) => sum + a.score, 0) / assessments.length)
    : 0;

  return (
    <div>
      <PageHeader
        title="Laporan"
        description="Ringkasan assessment publik dan audit log platform."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-sm font-medium text-slate-500">Total Assessment</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">
              {assessments.length}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm font-medium text-slate-500">Rata-rata Skor</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{avgScore}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm font-medium text-slate-500">Audit Log Terbaru</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{audits.length}</p>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-5">
        <CardBody>
          <h3 className="text-base font-semibold text-slate-900">
            Assessment Publik Terbaru
          </h3>
          {isLoading ? (
            <LoadingState label="Memuat assessment..." />
          ) : assessments.length === 0 ? (
            <EmptyState title="Belum ada assessment" />
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {assessments.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {a.business_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {a.city} · {formatDateID(a.created_at)}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-sm font-bold text-slate-900">
                    {a.score}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card className="mt-5">
        <CardBody>
          <h3 className="text-base font-semibold text-slate-900">Audit Log</h3>
          {audits.length === 0 ? (
            <EmptyState title="Belum ada audit log" />
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {audits.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {a.action.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-slate-500">
                      {a.actor_id ? `User: ${a.actor_id.slice(0, 8)}` : "Sistem"} ·{" "}
                      {formatDateID(a.created_at, {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <code className="flex-shrink-0 text-xs text-slate-400">
                    {a.action}
                  </code>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
