// ============================================================================
// Toast - notifikasi singkat (Zustand + render di root)
// ============================================================================

import { create } from "zustand";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: string;
  tone: ToastTone;
  title: string;
  message?: string;
}

interface ToastState {
  toasts: ToastItem[];
  push: (tone: ToastTone, title: string, message?: string) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (tone, title, message) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set((s) => ({ toasts: [...s.toasts, { id, tone, title, message }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, tone === "error" ? 6000 : 4000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// Convenience hooks
export function useToast() {
  const push = useToastStore((s) => s.push);
  return {
    success: (title: string, message?: string) => push("success", title, message),
    error: (title: string, message?: string) => push("error", title, message),
    info: (title: string, message?: string) => push("info", title, message),
    warning: (title: string, message?: string) => push("warning", title, message),
  };
}

const toneConfig: Record<
  ToastTone,
  { classes: string; icon: string }
> = {
  success: {
    classes: "border-emerald-200 bg-emerald-50",
    icon: "text-emerald-600",
  },
  error: {
    classes: "border-red-200 bg-red-50",
    icon: "text-red-600",
  },
  info: { classes: "border-blue-200 bg-blue-50", icon: "text-blue-600" },
  warning: {
    classes: "border-amber-200 bg-amber-50",
    icon: "text-amber-600",
  },
};

const icons: Record<ToastTone, string> = {
  success: "M4.5 12.75l6 6 9-13.5",
  error: "M6 18 18 6M6 6l12 12",
  info: "M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z",
  warning: "M12 9v3.75m0 3.75h.007M5.25 18.75h13.5a.75.75 0 0 0 .65-1.13l-6.75-11.7a.75.75 0 0 0-1.3 0l-6.75 11.7a.75.75 0 0 0 .65 1.13Z",
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  // Auto-dismiss tambahan saat unmount (safety)
  useEffect(() => () => void 0, []);

  return (
    <div
      className="fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:right-4 sm:left-auto sm:top-4 sm:items-end sm:px-0"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => {
        const cfg = toneConfig[t.tone];
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto flex w-full max-w-sm animate-fade-in items-start gap-3 rounded-xl border p-4 shadow-card-lg",
              cfg.classes
            )}
          >
            <svg
              className={cn("h-5 w-5 flex-shrink-0", cfg.icon)}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d={icons[t.tone]} />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900">{t.title}</p>
              {t.message && (
                <p className="mt-0.5 text-sm text-slate-600">{t.message}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="flex-shrink-0 text-slate-400 hover:text-slate-600"
              aria-label="Tutup notifikasi"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path strokeLinecap="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
