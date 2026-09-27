// ============================================================================
// ReguFlow - Router (lazy load untuk performance + code splitting)
// ============================================================================

import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { PublicLayout } from "@/components/layout/public-layout";
import { AuthLayout } from "@/components/layout/auth-layout";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  RequireAdmin,
  RequireAuth,
  RequireConsultant,
} from "@/components/layout/guards";
import { LoadingState } from "@/components/ui/loading";

// ---- Public pages (eager: landing butuh load cepat) --------------------------
import LandingPage from "@/pages/public/landing-page";
import CekKesiapanPage from "@/pages/public/cek-kesiapan-page";

// ---- Public lazy ---------------------------------------------------------------
const TentangPage = lazy(() => import("@/pages/public/tentang-page"));
const HargaPage = lazy(() => import("@/pages/public/harga-page"));
const KebijakanPrivasiPage = lazy(() =>
  import("@/pages/public/kebijakan-privasi-page")
);
const NotFoundPage = lazy(() => import("@/pages/public/not-found-page"));

// ---- Auth lazy ------------------------------------------------------------------
const LoginPage = lazy(() => import("@/pages/auth/login-page"));
const RegisterPage = lazy(() => import("@/pages/auth/register-page"));
const VerifyEmailPage = lazy(() => import("@/pages/auth/verify-email-page"));

// ---- App lazy ---------------------------------------------------------------------
const DashboardPage = lazy(() => import("@/pages/dashboard/dashboard-page"));
const OnboardingPage = lazy(() => import("@/pages/dashboard/onboarding-page"));
const UsahaPage = lazy(() => import("@/pages/dashboard/usaha-page"));
const ProdukListPage = lazy(() => import("@/pages/dashboard/produk-list-page"));
const ProdukDetailPage = lazy(() =>
  import("@/pages/dashboard/produk-detail-page")
);
const ComplianceListPage = lazy(() =>
  import("@/pages/dashboard/compliance-list-page")
);
const ComplianceDetailPage = lazy(() =>
  import("@/pages/dashboard/compliance-detail-page")
);
const DokumenPage = lazy(() => import("@/pages/dashboard/dokumen-page"));
const TasksPage = lazy(() => import("@/pages/dashboard/tasks-page"));
const ReminderPage = lazy(() => import("@/pages/dashboard/reminder-page"));
const PendampingPage = lazy(() => import("@/pages/dashboard/pendamping-page"));
const PengaturanPage = lazy(() => import("@/pages/dashboard/pengaturan-page"));

// ---- Consultant lazy ----------------------------------------------------------------
const ConsultantDashboardPage = lazy(() =>
  import("@/pages/consultant/consultant-dashboard-page")
);
const ConsultantClientsPage = lazy(() =>
  import("@/pages/consultant/consultant-clients-page")
);
const ConsultantClientDetailPage = lazy(() =>
  import("@/pages/consultant/consultant-client-detail-page")
);

// ---- Admin lazy -----------------------------------------------------------------------
const AdminDashboardPage = lazy(() => import("@/pages/admin/admin-dashboard-page"));
const AdminUsersPage = lazy(() => import("@/pages/admin/admin-users-page"));
const AdminBusinessesPage = lazy(() =>
  import("@/pages/admin/admin-businesses-page")
);
const AdminRulesPage = lazy(() => import("@/pages/admin/admin-rules-page"));
const AdminTemplatesPage = lazy(() => import("@/pages/admin/admin-templates-page"));
const AdminDocumentsPage = lazy(() => import("@/pages/admin/admin-documents-page"));
const AdminReportsPage = lazy(() => import("@/pages/admin/admin-reports-page"));

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <LoadingState label="Memuat halaman..." />
    </div>
  );
}

function withPublicLayout(node: React.ReactNode) {
  return <PublicLayout>{node}</PublicLayout>;
}

function withAuthLayout(
  node: React.ReactNode,
  title: string,
  subtitle?: string
) {
  return <AuthLayout title={title} subtitle={subtitle}>{node}</AuthLayout>;
}

function withDashboard(variant: "app" | "consultant" | "admin") {
  return function wrap(node: React.ReactNode) {
    return <DashboardLayout variant={variant}>{node}</DashboardLayout>;
  };
}

export function AppRouter() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* ---- Public ---- */}
        <Route path="/" element={withPublicLayout(<LandingPage />)} />
        <Route
          path="/cek-kesiapan"
          element={withPublicLayout(<CekKesiapanPage />)}
        />
        <Route
          path="/tentang"
          element={withPublicLayout(<TentangPage />)}
        />
        <Route path="/harga" element={withPublicLayout(<HargaPage />)} />
        <Route
          path="/kebijakan-privasi"
          element={withPublicLayout(<KebijakanPrivasiPage />)}
        />

        {/* ---- Auth ---- */}
        <Route
          path="/login"
          element={withAuthLayout(<LoginPage />, "Masuk ke ReguFlow")}
        />
        <Route
          path="/register"
          element={withAuthLayout(
            <RegisterPage />,
            "Daftar Akun ReguFlow",
            "Gratis untuk memulai. Selesai dalam 1 menit."
          )}
        />
        <Route
          path="/verify-email"
          element={withAuthLayout(<VerifyEmailPage />, "Verifikasi Email")}
        />

        {/* ---- App (UMKM) ---- */}
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              {withDashboard("app")(<DashboardPage />)}
            </RequireAuth>
          }
        />
        <Route
          path="/onboarding"
          element={
            <RequireAuth>{withDashboard("app")(<OnboardingPage />)}</RequireAuth>
          }
        />
        <Route
          path="/usaha"
          element={
            <RequireAuth>{withDashboard("app")(<UsahaPage />)}</RequireAuth>
          }
        />
        <Route
          path="/produk"
          element={
            <RequireAuth>
              {withDashboard("app")(<ProdukListPage />)}
            </RequireAuth>
          }
        />
        <Route
          path="/produk/:id"
          element={
            <RequireAuth>
              {withDashboard("app")(<ProdukDetailPage />)}
            </RequireAuth>
          }
        />
        <Route
          path="/compliance"
          element={
            <RequireAuth>
              {withDashboard("app")(<ComplianceListPage />)}
            </RequireAuth>
          }
        />
        <Route
          path="/compliance/:id"
          element={
            <RequireAuth>
              {withDashboard("app")(<ComplianceDetailPage />)}
            </RequireAuth>
          }
        />
        <Route
          path="/dokumen"
          element={
            <RequireAuth>{withDashboard("app")(<DokumenPage />)}</RequireAuth>
          }
        />
        <Route
          path="/tasks"
          element={
            <RequireAuth>{withDashboard("app")(<TasksPage />)}</RequireAuth>
          }
        />
        <Route
          path="/reminder"
          element={
            <RequireAuth>{withDashboard("app")(<ReminderPage />)}</RequireAuth>
          }
        />
        <Route
          path="/pendamping"
          element={
            <RequireAuth>
              {withDashboard("app")(<PendampingPage />)}
            </RequireAuth>
          }
        />
        <Route
          path="/pengaturan"
          element={
            <RequireAuth>
              {withDashboard("app")(<PengaturanPage />)}
            </RequireAuth>
          }
        />

        {/* ---- Consultant ---- */}
        <Route
          path="/consultant/dashboard"
          element={
            <RequireConsultant>
              {withDashboard("consultant")(<ConsultantDashboardPage />)}
            </RequireConsultant>
          }
        />
        <Route
          path="/consultant/clients"
          element={
            <RequireConsultant>
              {withDashboard("consultant")(<ConsultantClientsPage />)}
            </RequireConsultant>
          }
        />
        <Route
          path="/consultant/clients/:id"
          element={
            <RequireConsultant>
              {withDashboard("consultant")(<ConsultantClientDetailPage />)}
            </RequireConsultant>
          }
        />

        {/* ---- Admin ---- */}
        <Route
          path="/admin/dashboard"
          element={
            <RequireAdmin>
              {withDashboard("admin")(<AdminDashboardPage />)}
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RequireAdmin>{withDashboard("admin")(<AdminUsersPage />)}</RequireAdmin>
          }
        />
        <Route
          path="/admin/businesses"
          element={
            <RequireAdmin>
              {withDashboard("admin")(<AdminBusinessesPage />)}
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/rules"
          element={
            <RequireAdmin>{withDashboard("admin")(<AdminRulesPage />)}</RequireAdmin>
          }
        />
        <Route
          path="/admin/templates"
          element={
            <RequireAdmin>
              {withDashboard("admin")(<AdminTemplatesPage />)}
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/documents"
          element={
            <RequireAdmin>
              {withDashboard("admin")(<AdminDocumentsPage />)}
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <RequireAdmin>
              {withDashboard("admin")(<AdminReportsPage />)}
            </RequireAdmin>
          }
        />

        {/* ---- 404 ---- */}
        <Route path="*" element={withPublicLayout(<NotFoundPage />)} />
      </Routes>
    </Suspense>
  );
}
