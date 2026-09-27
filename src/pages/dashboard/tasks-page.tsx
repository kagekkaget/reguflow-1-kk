import { useState } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";
import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_TONES,
  TASK_STATUS_LABELS,
  TASK_STATUS_TONES,
} from "@/lib/constants";
import { useCreateTask, useTasks, queryKeys } from "@/hooks/use-queries";
import { getSafeErrorMessage, formatDateID, relativeDateLabel, daysUntil } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { Task, TaskPriority, TaskStatus } from "@/types";

export default function TasksPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: tasks = [], isLoading } = useTasks();
  const createTask = useCreateTask();
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium" as TaskPriority,
    dueDate: "",
    complianceCaseId: "",
  });

  const filtered = statusFilter
    ? tasks.filter((t) => t.status === statusFilter)
    : tasks;

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast.error("Judul wajib", "Isi judul task terlebih dahulu.");
      return;
    }
    try {
      await createTask.mutateAsync({
        title: form.title,
        description: form.description || null,
        priority: form.priority,
        dueDate: form.dueDate || null,
        complianceCaseId: form.complianceCaseId || null,
      });
      toast.success("Task dibuat", form.title);
      setModalOpen(false);
      setForm({
        title: "",
        description: "",
        priority: "medium",
        dueDate: "",
        complianceCaseId: "",
      });
    } catch (error) {
      toast.error("Gagal membuat task", getSafeErrorMessage(error));
    }
  };

  const handleStatusUpdate = async (task: Task, status: TaskStatus) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status })
        .eq("id", task.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
      toast.success("Task diperbarui", TASK_STATUS_LABELS[status]);
    } catch (error) {
      toast.error("Gagal memperbarui", getSafeErrorMessage(error));
    }
  };

  return (
    <div>
      <PageHeader
        title="Task"
        description="Daftar tugas compliance kamu. Urutkan berdasarkan prioritas dan jatuh tempo."
        actions={
          <Button onClick={() => setModalOpen(true)}>+ Buat Task</Button>
        }
      />

      <Card className="mb-5">
        <CardBody className="flex flex-wrap items-center gap-4">
          <div className="min-w-48 flex-1">
            <label htmlFor="task-filter" className="label-text">
              Filter status
            </label>
            <Select
              id="task-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1.5"
            >
              <option value="">Semua status</option>
              {Object.entries(TASK_STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <p className="text-sm text-slate-500">
            {filtered.filter((t) => t.status !== "done").length} task aktif
          </p>
        </CardBody>
      </Card>

      {isLoading ? (
        <LoadingState label="Memuat task..." />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            title="Belum ada task"
            description="Buat task pertama kamu — misalnya 'Upload NIB' atau 'Siapkan daftar bahan'."
            actionLabel="+ Buat Task"
            onAction={() => setModalOpen(true)}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered
            .sort((a, b) => {
              const order = { urgent: 0, high: 1, medium: 2, low: 3 };
              if (a.status === "done" && b.status !== "done") return 1;
              if (a.status !== "done" && b.status === "done") return -1;
              return order[a.priority] - order[b.priority];
            })
            .map((task) => {
              const days = daysUntil(task.due_date);
              const overdue =
                days !== null && days < 0 && task.status !== "done";
              return (
                <Card key={task.id}>
                  <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={TASK_PRIORITY_TONES[task.priority]}>
                          {TASK_PRIORITY_LABELS[task.priority]}
                        </Badge>
                        <Badge className={TASK_STATUS_TONES[task.status]}>
                          {TASK_STATUS_LABELS[task.status]}
                        </Badge>
                        {overdue && <Badge tone="red">Lewat jatuh tempo</Badge>}
                      </div>
                      <h3 className="mt-2 text-sm font-semibold text-slate-900">
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="mt-1 text-sm text-slate-600">
                          {task.description}
                        </p>
                      )}
                      {task.due_date && (
                        <p className="mt-1.5 text-xs text-slate-500">
                          Jatuh tempo: {formatDateID(task.due_date)} ·{" "}
                          {relativeDateLabel(task.due_date)}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <Select
                        aria-label={`Update status ${task.title}`}
                        value={task.status}
                        onChange={(e) =>
                          handleStatusUpdate(task, e.target.value as TaskStatus)
                        }
                        className="text-sm"
                      >
                        {Object.entries(TASK_STATUS_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Buat Task"
        description="Tugas akan muncul di dashboard dan reminder kamu."
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleCreate} loading={createTask.isPending}>
              Simpan Task
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block">
            <span className="label-text">
              Judul task <span className="text-red-500">*</span>
            </span>
            <Input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Contoh: Upload NIB"
              className="mt-1.5"
            />
          </label>
          <label className="block">
            <span className="label-text">Deskripsi (opsional)</span>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              className="mt-1.5"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label-text">Prioritas</span>
              <Select
                value={form.priority}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    priority: e.target.value as TaskPriority,
                  }))
                }
                className="mt-1.5"
              >
                {Object.entries(TASK_PRIORITY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="label-text">Jatuh tempo</span>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) =>
                  setForm((p) => ({ ...p, dueDate: e.target.value }))
                }
                className="mt-1.5"
              />
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
