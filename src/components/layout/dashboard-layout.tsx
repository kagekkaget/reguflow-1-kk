import { useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { useAuthStore } from "@/lib/api/auth-store";
import { ROLE_LABELS } from "@/lib/constants";
import { getInitials } from "@/lib/utils";
import type { NavItem } from "@/lib/constants/navigation";
import {
  ADMIN_NAV,
  APP_NAV,
  CONSULTANT_NAV,
} from "@/lib/constants/navigation";

function NavIcon({ path, className }: { path: string; className?: string }) {
  return (
    <svg
      className={cn("h-5 w-5 flex-shrink-0", className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

function NavSection({ items, title }: { items: NavItem[]; title: string }) {
  return (
    <div className="space-y-1">
      <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </p>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-brand-50 text-brand-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )
          }
        >
          {({ isActive }) => (
            <>
              <NavIcon path={item.icon} className={isActive ? "text-brand-600" : ""} />
              <span>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}

function UserMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const activeRole = useAuthStore((s) => s.activeRole());

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-2 text-left transition-colors hover:bg-slate-50"
        aria-expanded={open}
        aria-label="Menu user"
      >
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
          {getInitials(profile?.full_name ?? "U")}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">
            {profile?.full_name || "Pengguna"}
          </p>
          <p className="truncate text-xs text-slate-500">
            {activeRole ? ROLE_LABELS[activeRole] : "Member"}
          </p>
        </div>
        <svg
          className={cn("h-4 w-4 text-slate-400 transition-transform", open && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path strokeLinecap="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute inset-x-0 bottom-full z-50 mb-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card-lg animate-fade-in">
          <Link
            to="/pengaturan"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Pengaturan
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="block w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

function OrgSwitcher() {
  const memberships = useAuthStore((s) => s.memberships);
  const activeOrganizationId = useAuthStore((s) => s.activeOrganizationId);
  const setActiveOrganizationId = useAuthStore((s) => s.setActiveOrganizationId);

  if (memberships.length <= 1) {
    const m = memberships[0];
    return (
      <div className="rounded-xl bg-slate-50 px-3 py-2.5">
        <p className="text-xs font-medium text-slate-500">Organisasi aktif</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
          {m?.organization.name ?? "Belum ada"}
        </p>
      </div>
    );
  }

  return (
    <div>
      <label
        htmlFor="org-switcher"
        className="mb-1.5 block text-xs font-medium text-slate-500"
      >
        Organisasi aktif
      </label>
      <select
        id="org-switcher"
        value={activeOrganizationId ?? ""}
        onChange={(e) => setActiveOrganizationId(e.target.value)}
        className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
      >
        {memberships.map((m) => (
          <option key={m.organization_id} value={m.organization_id}>
            {m.organization.name} · {ROLE_LABELS[m.role]}
          </option>
        ))}
      </select>
    </div>
  );
}

export interface DashboardLayoutProps {
  children: React.ReactNode;
  variant?: "app" | "consultant" | "admin";
}

export function DashboardLayout({
  children,
  variant = "app",
}: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isPlatformAdmin = useAuthStore((s) => s.isPlatformAdmin());
  const activeRole = useAuthStore((s) => s.activeRole());

  const { mainNav, title } = useMemo(() => {
    if (variant === "admin") return { mainNav: ADMIN_NAV, title: "Admin Platform" };
    if (variant === "consultant")
      return { mainNav: CONSULTANT_NAV, title: "Panel Konsultan" };
    return { mainNav: APP_NAV, title: "Dashboard UMKM" };
  }, [variant]);

  const consultantNavVisible =
    variant !== "consultant" &&
    (activeRole === "consultant" || isPlatformAdmin);
  const adminNavVisible = variant !== "admin" && isPlatformAdmin;

  const sidebar = (
    <div className="flex h-full flex-col gap-5 overflow-y-auto bg-white p-4">
      <div className="flex items-center justify-between">
        <Link to="/" aria-label="Beranda ReguFlow">
          <Logo size="sm" />
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
          aria-label="Tutup menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <OrgSwitcher />

      <nav className="flex-1 space-y-6">
        <NavSection items={mainNav} title={title} />
        {consultantNavVisible && (
          <NavSection items={CONSULTANT_NAV} title="Konsultan" />
        )}
        {adminNavVisible && <NavSection items={ADMIN_NAV} title="Admin" />}
      </nav>

      <UserMenu />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-200 lg:block">
        {sidebar}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl">
            {sidebar}
          </div>
        </div>
      )}

      <div className="lg:pl-72">
        {/* Top bar mobile */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600"
            aria-label="Buka menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            </svg>
          </button>
          <Link to="/dashboard" className="flex-shrink-0">
            <Logo size="sm" />
          </Link>
          <span className="ml-auto text-xs font-medium text-slate-400">
            {location.pathname.split("/")[1] || "dashboard"}
          </span>
        </header>

        <main className="min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-6xl animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
