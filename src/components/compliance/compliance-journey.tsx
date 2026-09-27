import { CASE_JOURNEY, CASE_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { CaseStatus } from "@/types";

export function ComplianceJourney({
  currentStatus,
  className,
}: {
  currentStatus: CaseStatus;
  className?: string;
}) {
  const currentIndex = CASE_JOURNEY.indexOf(currentStatus);
  const isRevision = currentStatus === "revision";
  const isExpired = currentStatus === "expired";

  return (
    <div className={className}>
      <div className="flex items-center">
        {CASE_JOURNEY.map((status, idx) => {
          const isDone = !isRevision && !isExpired && idx < currentIndex;
          const isCurrent = !isRevision && !isExpired && idx === currentIndex;
          const isLast = idx === CASE_JOURNEY.length - 1;

          return (
            <div key={status} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    isDone && "bg-emerald-100 text-emerald-700",
                    isCurrent && "bg-brand-600 text-white",
                    !isDone && !isCurrent && "bg-slate-100 text-slate-400"
                  )}
                >
                  {isDone ? "✓" : idx + 1}
                </div>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "h-0.5 flex-1 transition-colors",
                    isDone ? "bg-emerald-300" : "bg-slate-200"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex justify-between gap-1">
        {CASE_JOURNEY.map((status, idx) => (
          <span
            key={status}
            className={cn(
              "flex-1 text-center text-[10px] font-medium leading-tight",
              idx === currentIndex ? "text-brand-700" : "text-slate-400"
            )}
          >
            {CASE_STATUS_LABELS[status]}
          </span>
        ))}
      </div>
      {isRevision && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
          Case ini butuh revisi. Perbaiki checklist, lalu update status ke
          "Data Dikumpulkan".
        </p>
      )}
      {isExpired && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          Compliance case ini sudah kadaluarsa. Ajukan ulang melalui portal resmi.
        </p>
      )}
    </div>
  );
}
