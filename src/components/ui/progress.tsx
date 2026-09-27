import { cn } from "@/lib/utils";

export interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  tone?: "brand" | "green" | "amber" | "red";
  showLabel?: boolean;
}

const toneBarClasses = {
  brand: "bg-brand-600",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

export function Progress({
  value,
  max = 100,
  className,
  barClassName,
  tone = "brand",
  showLabel = false,
}: ProgressProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  const rounded = Math.round(pct);

  return (
    <div className={cn("w-full", className)}>
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuenow={rounded}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            toneBarClasses[tone],
            barClassName
          )}
          style={{ width: `${rounded}%` }}
        />
      </div>
      {showLabel && (
        <p className="mt-1 text-right text-xs font-medium text-slate-500">
          {rounded}%
        </p>
      )}
    </div>
  );
}
