import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/ui/logo";
import { DISCLAIMER } from "@/lib/constants";

export function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex h-16 items-center px-4 sm:px-6">
        <Link to="/" aria-label="ReguFlow beranda">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-md">
          <div className="card p-6 shadow-card-lg sm:p-8 animate-fade-in">
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            {subtitle && (
              <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
            )}
            <div className="mt-6">{children}</div>
          </div>
          <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
            {DISCLAIMER}
          </p>
        </div>
      </main>
    </div>
  );
}
