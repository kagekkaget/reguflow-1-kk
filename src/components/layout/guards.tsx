// ============================================================================
// ReguFlow - Route guards (frontend RBAC)
// ----------------------------------------------------------------------------
// Guard frontend hanya untuk UX (mencegah pengguna masuk halaman salah).
// Otoritas sebenarnya: Supabase Auth + RLS database. Never trust client.
// ============================================================================

import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/lib/supabase/auth-store";
import { LoadingState } from "@/components/ui/loading";
import type { MemberRole } from "@/types";

interface GuardProps {
  children: ReactNode;
  roles?: MemberRole[];
  requirePlatformAdmin?: boolean;
}

export function RequireAuth({
  children,
  roles,
  requirePlatformAdmin,
}: GuardProps) {
  const loading = useAuthStore((s) => s.loading);
  const initialized = useAuthStore((s) => s.initialized);
  const profile = useAuthStore((s) => s.profile);
  const activeRole = useAuthStore((s) => s.activeRole());
  const isPlatformAdmin = useAuthStore((s) => s.isPlatformAdmin());
  const location = useLocation();

  if (!initialized || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoadingState label="Memuat sesi kamu..." />
      </div>
    );
  }

  if (!profile) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  if (requirePlatformAdmin && !isPlatformAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (roles && roles.length > 0) {
    const allowed = isPlatformAdmin || (activeRole && roles.includes(activeRole));
    if (!allowed) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  return <RequireAuth requirePlatformAdmin>{children}</RequireAuth>;
}

export function RequireConsultant({ children }: { children: ReactNode }) {
  return (
    <RequireAuth roles={["consultant", "admin"]}>{children}</RequireAuth>
  );
}
