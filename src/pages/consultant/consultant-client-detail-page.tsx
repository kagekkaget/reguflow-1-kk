import { useNavigate, useParams } from "react-router-dom";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading";
import { CommentSection } from "@/components/common/comment-section";
import {
  CASE_STATUS_LABELS,
  CASE_STATUS_TONES,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from "@/lib/constants";
import { getSafeErrorMessage, isValidUUID, formatDateID } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Business, Product, Task, ComplianceCase } from "@/types";

export default function ConsultantClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const orgId = isValidUUID(id) ? id : null;

  const { data: businesses, isLoading } = useQuery({
    queryKey: ["consultant-client-business", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("organization_id", orgId!);
      if (error) throw error;
      return (data ?? []) as Business[];
    },
  });

  const business = businesses?.[0] ?? null;

  const { data: products = [] } = useQuery({
    queryKey: ["consultant-client-products", business?.id],
    enabled: Boolean(business?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("business_id", business!.id);
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });

  const { data: cases = [] } = useQuery({
    queryKey: ["consultant-client-cases", business?.id],
    enabled: Boolean(business?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compliance_cases")
        .select("*")
        .eq("business_id", business!.id);
      if (error) throw error;
      return (data ?? []) as ComplianceCase[];
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["consultant-client-tasks", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });

  const handleAssignTask = async () => {
    if (!orgId) return;
    const title = window.prompt("Judul task untuk klien:");
    if (!title) return;
    try {
      const { error } = await supabase.from("tasks").insert({
        organization_id: orgId,
        title,
        status: "todo",
        priority: "medium",
      });
      if (error) throw error;
      queryClient.invalidateQueries({
        queryKey: ["consultant-client-tasks", orgId],
      });
      toast.success("Task ditambahkan", title);
    } catch (error) {
      toast.error("Gagal menambah task", getSafeErrorMessage(error));
    }
  };

  const handleApproveChecklist = async (caseId: string) => {
    try {
      const { error } = await supabase
        .from("compliance_cases")
        .update({ status: "ready_to_submit" })
        .eq("id", caseId);
      if (error) throw error;
      queryClient.invalidateQueries({
        queryKey: ["consultant-client-cases", business?.id],
      });
      toast.success(
        "Checklist disetujui",
        "Status compliance case menjadi Siap Direview."
      );
    } catch (error) {
      toast.error("Gagal menyetujui", getSafeErrorMessage(error));
    }
  };

  const handleRequestRevision = async (caseId: string) => {
    try {
      const { error } = await supabase
        .from("compliance_cases")
        .update({ status: "revision" })
        .eq("id", caseId);
      if (error) throw error;
      queryClient.invalidateQueries({
        queryKey: ["consultant-client-cases", business?.id],
      });
      toast.success("Revisi diminta", "Klien akan melihat status Butuh Revisi.");
    } catch (error) {
      toast.error("Gagal meminta revisi", getSafeErrorMessage(error));
    }
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Detail Klien" />
        <LoadingState label="Memuat data klien..." />
      </div>
    );
  }

  if (!business) {
    return (
      <div>
        <PageHeader title="Detail Klien" />
        <Card>
          <ErrorState
            title="Klien tidak ditemukan"
            description="Klien mungkin tidak ada atau kamu tidak memiliki engagement aktif dengannya."
            retryLabel="Kembali ke Klien"
            onRetry={() => navigate("/consultant/clients")}
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={business.legal_name}
        description="Detail UMKM dampingan: produk, compliance, dokumen, dan task."
        breadcrumbs={[
          { label: "Klien", to: "/consultant/clients" },
          { label: business.legal_name },
        ]}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate("/consultant/clients")}>
            ← Semua Klien
          </Button>
        }
      />

      <Card className="mb-5">
        <CardBody>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm font-medium text-slate-500">Brand</dt>
              <dd className="mt-1 text-sm text-slate-900">
                {business.brand_name ?? "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">NIB</dt>
              <dd className="mt-1 text-sm text-slate-900">{business.nib ?? "Belum ada"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Kota</dt>
              <dd className="mt-1 text-sm text-slate-900">{business.city ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Skala usaha</dt>
              <dd className="mt-1 text-sm text-slate-900">
                {business.business_scale ?? "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Karyawan</dt>
              <dd className="mt-1 text-sm text-slate-900">
                {business.employee_count ?? 0}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Bentuk usaha</dt>
              <dd className="mt-1 text-sm text-slate-900">
                {business.entity_type ?? "-"}
              </dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h3 className="text-base font-semibold text-slate-900">Produk</h3>
            {products.length === 0 ? (
              <EmptyState title="Belum ada produk" />
            ) : (
              <ul className="mt-4 space-y-2.5">
                {products.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 p-3"
                  >
                    <span className="text-sm font-medium text-slate-900">
                      {p.name}
                    </span>
                    <Badge tone="gray">{p.category ?? "-"}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Compliance Case
              </h3>
            </div>
            {cases.length === 0 ? (
              <EmptyState title="Belum ada compliance case" />
            ) : (
              <div className="mt-4 space-y-3">
                {cases.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-slate-100 p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900">
                        {c.title}
                      </p>
                      <Badge className={CASE_STATUS_TONES[c.status]}>
                        {CASE_STATUS_LABELS[c.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Skor: {c.score}/100 · Update{" "}
                      {formatDateID(c.updated_at, { day: "numeric", month: "short" })}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApproveChecklist(c.id)}
                      >
                        Setujui
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRequestRevision(c.id)}
                      >
                        Minta Revisi
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Task Klien</h3>
              <Button size="sm" variant="outline" onClick={handleAssignTask}>
                + Assign Task
              </Button>
            </div>
            {tasks.length === 0 ? (
              <EmptyState title="Belum ada task" />
            ) : (
              <ul className="mt-4 space-y-2.5">
                {tasks.slice(0, 6).map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 p-3"
                  >
                    <span className="text-sm font-medium text-slate-900">
                      {t.title}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge tone="gray">{TASK_PRIORITY_LABELS[t.priority]}</Badge>
                      <Badge tone="blue">{TASK_STATUS_LABELS[t.status]}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <CommentSection
              targetType="consultant_client"
              targetId={orgId ?? ""}
              title="Komentar untuk Klien"
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
