import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

export interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  to?: string;
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-11 w-11",
};

const textSizeClasses = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-xl",
};

export function Logo({ className, showText = true, size = "md" }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-teal-600 shadow-sm",
          sizeClasses[size]
        )}
        aria-hidden="true"
      >
        <svg
          className="h-1/2 w-1/2 text-white"
          viewBox="0 0 32 32"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 24V11.5A1.5 1.5 0 0 1 9.5 10h7.2a1.5 1.5 0 0 1 1.5 1.5V24" />
          <path d="M8 24a2.6 2.6 0 0 0 2.6 2.6h8.2a1.5 1.5 0 0 0 1.5-1.5V13" />
          <path d="M20.5 22.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path d="M19.4 19.7l.8.8 1.6-1.7" />
        </svg>
      </span>
      {showText && (
        <span className={cn("font-bold tracking-tight text-slate-900", textSizeClasses[size])}>
          {APP_NAME}
        </span>
      )}
    </span>
  );
}
