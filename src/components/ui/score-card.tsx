import { getScoreStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Progress } from "./progress";

export interface ScoreCardProps {
  score: number;
  title?: string;
  description?: string;
  className?: string;
  compact?: boolean;
}

export function ScoreCard({
  score,
  title = "Skor Kesiapan",
  description = "Skor ini dihitung dari kelengkapan data usaha, produk, dan dokumen kamu.",
  className,
  compact = false,
}: ScoreCardProps) {
  const status = getScoreStatus(score);

  return (
    <div className={cn("card p-5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
          {!compact && (
            <p className="mt-1 text-xs text-slate-500 max-w-xs">{description}</p>
          )}
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold leading-none text-slate-900">
            {score}
            <span className="text-base font-medium text-slate-400">/100</span>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <Progress
          value={score}
          tone={
            status.color.includes("emerald")
              ? "green"
              : status.color.includes("amber")
                ? "amber"
                : status.color.includes("yellow")
                  ? "brand"
                  : "red"
          }
        />
        <div className="mt-3 flex items-center justify-between">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
              status.tone
            )}
          >
            {status.label}
          </span>
          {!compact && (
            <span className="text-xs text-slate-400">
              {score > 80
                ? "Saatnya minta review"
                : score > 60
                  ? "Lengkapi sisa dokumen"
                  : "Mulai dari NIB & dokumen dasar"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
