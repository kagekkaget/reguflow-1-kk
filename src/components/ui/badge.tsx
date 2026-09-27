import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "gray" | "blue" | "green" | "red" | "amber" | "yellow" | "violet" | "indigo" | "teal" | "cyan";

const toneClasses: Record<Tone, string> = {
  gray: "bg-slate-100 text-slate-700",
  blue: "bg-blue-100 text-blue-700",
  green: "bg-emerald-100 text-emerald-700",
  red: "bg-red-100 text-red-700",
  amber: "bg-amber-100 text-amber-700",
  yellow: "bg-yellow-100 text-yellow-700",
  violet: "bg-violet-100 text-violet-700",
  indigo: "bg-indigo-100 text-indigo-700",
  teal: "bg-teal-100 text-teal-700",
  cyan: "bg-cyan-100 text-cyan-700",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "gray", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}

/** Badge status dari string tone yang tersimpan di constants. */
export function StatusBadge({
  label,
  toneClass,
  className,
}: {
  label: string;
  toneClass: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        toneClass,
        className
      )}
    >
      {label}
    </span>
  );
}
