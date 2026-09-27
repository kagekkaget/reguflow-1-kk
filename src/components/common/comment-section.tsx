import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading";
import { useComments, useCreateComment } from "@/hooks/use-queries";
import { getSafeErrorMessage, formatDateID } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

export function CommentSection({
  targetType,
  targetId,
  title = "Komentar",
}: {
  targetType: string;
  targetId: string;
  title?: string;
}) {
  const toast = useToast();
  const [body, setBody] = useState("");
  const { data: comments = [], isLoading } = useComments(targetType, targetId);
  const createComment = useCreateComment(targetType, targetId);

  const handleSubmit = async () => {
    const text = body.trim();
    if (!text) {
      toast.error("Komentar kosong", "Tulis komentar dulu.");
      return;
    }
    try {
      await createComment.mutateAsync(text);
      setBody("");
      toast.success("Komentar terkirim");
    } catch (error) {
      toast.error("Gagal mengirim komentar", getSafeErrorMessage(error));
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>

      <div className="space-y-3">
        {isLoading ? (
          <LoadingState label="Memuat komentar..." />
        ) : comments.length === 0 ? (
          <EmptyState
            title="Belum ada komentar"
            description="Komentar dari kamu atau pendamping akan muncul di sini."
          />
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-slate-100 bg-slate-50/50 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">
                  {c.profile?.full_name ?? "Pengguna"}
                </p>
                <span className="text-xs text-slate-400">
                  {formatDateID(c.created_at, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-slate-600 whitespace-pre-wrap break-words">
                {c.body}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="space-y-2">
        <Textarea
          rows={3}
          placeholder="Tulis komentar..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={1000}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSubmit}
            loading={createComment.isPending}
            disabled={!body.trim()}
          >
            Kirim Komentar
          </Button>
        </div>
      </div>
    </div>
  );
}
