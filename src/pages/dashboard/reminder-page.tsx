import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading";
import { useDocuments, useReminders, useTasks } from "@/hooks/use-queries";
import {
  DOCUMENT_TYPE_LABELS,
  TASK_PRIORITY_LABELS,
} from "@/lib/constants";
import {
  daysUntil,
  formatDateID,
  relativeDateLabel,
} from "@/lib/utils";

export default function ReminderPage() {
  const { data: reminders = [], isLoading } = useReminders();
  const { data: documents = [] } = useDocuments();
  const { data: tasks = [] } = useTasks();

  const docReminders = documents
    .filter((d) => d.expiry_date)
    .map((d) => ({
      id: `doc-${d.id}`,
      type: "Dokumen akan kadaluarsa",
      title: d.title,
      meta: DOCUMENT_TYPE_LABELS[d.document_type] ?? d.document_type,
      date: d.expiry_date!,
      urgent: (daysUntil(d.expiry_date) ?? 999) <= 30,
    }));

  const taskReminders = tasks
    .filter((t) => t.due_date && t.status !== "done" && t.status !== "cancelled")
    .map((t) => ({
      id: `task-${t.id}`,
      type: "Task jatuh tempo",
      title: t.title,
      meta: TASK_PRIORITY_LABELS[t.priority],
      date: t.due_date!,
      urgent:
        (daysUntil(t.due_date) ?? 999) <= 7 || t.priority === "urgent",
    }));

  const allReminders = [...docReminders, ...taskReminders].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Reminder" />
        <LoadingState label="Memuat reminder..." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Reminder"
        description="Pengingat dokumen yang akan kadaluarsa dan task yang jatuh tempo."
      />

      <Card className="mb-5 border-brand-200 bg-brand-50/40">
        <CardBody>
          <p className="text-sm text-slate-700">
            Untuk MVP, reminder tampil di aplikasi (in-app). Struktur database
            sudah disiapkan untuk pengiriman email & WhatsApp di masa depan.
          </p>
        </CardBody>
      </Card>

      {allReminders.length === 0 ? (
        <Card>
          <EmptyState
            title="Tidak ada reminder"
            description="Tambahkan tanggal kadaluarsa pada dokumen atau jatuh tempo pada task untuk mendapatkan reminder."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {allReminders.map((r) => {
            const days = daysUntil(r.date);
            const isOverdue = days !== null && days < 0;
            return (
              <Card key={r.id}>
                <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={r.urgent ? "red" : "gray"}>{r.type}</Badge>
                      <Badge tone="blue">{r.meta}</Badge>
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-slate-900">
                      {r.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateID(r.date)} · {relativeDateLabel(r.date)}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {isOverdue ? (
                      <Badge tone="red">Lewat {Math.abs(days ?? 0)} hari</Badge>
                    ) : (
                      <Badge tone={r.urgent ? "amber" : "green"}>
                        {relativeDateLabel(r.date)}
                      </Badge>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {reminders.length > 0 && (
        <div className="mt-8">
          <h2 className="text-base font-semibold text-slate-900">
            Reminder Terjadwal
          </h2>
          <div className="mt-4 space-y-3">
            {reminders.map((r) => (
              <Card key={r.id}>
                <CardBody className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {r.message}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatDateID(r.remind_at, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <Badge tone={r.status === "sent" ? "green" : "gray"}>
                    {r.status === "sent"
                      ? "Terkirim"
                      : r.status === "failed"
                        ? "Gagal"
                        : "Menunggu"}
                  </Badge>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
