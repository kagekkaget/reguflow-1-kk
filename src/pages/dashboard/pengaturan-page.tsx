import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/supabase/auth-store";
import { profileSchema, type ProfileFormInput } from "@/lib/validation";
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/constants";
import { getSafeErrorMessage, getInitials } from "@/lib/utils";
import { logAudit } from "@/lib/security/audit";
import { useQueryClient } from "@tanstack/react-query";

export default function PengaturanPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const sessionEmail = useAuthStore((s) => s.session?.user?.email ?? "");
  const memberships = useAuthStore((s) => s.memberships);
  const activeRole = useAuthStore((s) => s.activeRole());
  const activeOrganization = useAuthStore((s) => s.activeOrganization());
  const isPlatformAdmin = useAuthStore((s) => s.isPlatformAdmin());
  const signOut = useAuthStore((s) => s.signOut);
  const refresh = useAuthStore((s) => s.refresh);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormInput>({
    resolver: zodResolver(profileSchema),
    values: {
      full_name: profile?.full_name ?? "",
      phone: profile?.phone ?? "",
    },
  });

  const handleSaveProfile = async (values: ProfileFormInput) => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: values.full_name,
          phone: values.phone || null,
        })
        .eq("id", profile.id);
      if (error) throw error;
      await logAudit({
        organizationId: activeOrganization?.id,
        action: "profile_updated",
        entityType: "profile",
        entityId: profile.id,
      });
      await refresh();
      queryClient.invalidateQueries();
      toast.success("Profil disimpan", "Data profil berhasil diperbarui.");
    } catch (error) {
      toast.error("Gagal menyimpan", getSafeErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setLogoutOpen(false);
    navigate("/login", { replace: true });
  };

  if (!profile) return null;

  return (
    <div>
      <PageHeader
        title="Pengaturan"
        description="Kelola profil, organisasi, dan keamanan akun kamu."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <form onSubmit={handleSubmit(handleSaveProfile)} noValidate>
            <CardBody className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
                  {getInitials(profile.full_name)}
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-900">
                    {profile.full_name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {profile.id.slice(0, 8)}...
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Nama lengkap"
                  required
                  error={errors.full_name?.message}
                  htmlFor="full_name"
                >
                  <Input
                    id="full_name"
                    error={!!errors.full_name}
                    {...register("full_name")}
                  />
                </Field>
                <Field
                  label="Email"
                  hint="Email diatur melalui Supabase Auth"
                >
                  <Input
                    value={sessionEmail}
                    disabled
                    aria-label="Email"
                  />
                </Field>
                <Field
                  label="Nomor telepon"
                  error={errors.phone?.message}
                  htmlFor="phone"
                >
                  <Input
                    id="phone"
                    inputMode="tel"
                    placeholder="081234567890"
                    error={!!errors.phone}
                    {...register("phone")}
                  />
                </Field>
                <Field label="Role aktif">
                  <Input
                    value={activeRole ? ROLE_LABELS[activeRole] : "-"}
                    disabled
                    aria-label="Role aktif"
                  />
                </Field>
              </div>

              <div className="flex justify-end border-t border-slate-100 pt-4">
                <Button type="submit" loading={saving}>
                  Simpan Profil
                </Button>
              </div>
            </CardBody>
          </form>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardBody className="space-y-4">
              <h3 className="text-base font-semibold text-slate-900">
                Organisasi
              </h3>
              {memberships.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-slate-100 p-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">
                      {m.organization.name}
                    </p>
                    <Badge tone={m.status === "active" ? "green" : "gray"}>
                      {m.status === "active" ? "Aktif" : m.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {ROLE_LABELS[m.role]}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {ROLE_DESCRIPTIONS[m.role]}
                  </p>
                </div>
              ))}
              {activeOrganization && (
                <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                  Tipe organisasi:{" "}
                  {activeOrganization.type === "business"
                    ? "Usaha"
                    : activeOrganization.type === "consultant_agency"
                      ? "Agensi Konsultan"
                      : activeOrganization.type === "platform"
                        ? "Platform"
                        : "Pemerintah"}
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-4">
              <h3 className="text-base font-semibold text-slate-900">
                Keamanan
              </h3>
              <ul className="space-y-2.5 text-sm text-slate-600">
                <li className="flex gap-2.5">
                  <svg
                    className="h-5 w-5 flex-shrink-0 text-emerald-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Autentikasi via Supabase Auth
                </li>
                <li className="flex gap-2.5">
                  <svg
                    className="h-5 w-5 flex-shrink-0 text-emerald-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Row Level Security aktif
                </li>
                <li className="flex gap-2.5">
                  <svg
                    className="h-5 w-5 flex-shrink-0 text-emerald-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Dokumen tersimpan di storage private
                </li>
                {isPlatformAdmin && (
                  <li className="flex gap-2.5">
                    <Badge tone="violet">Admin Platform</Badge>
                  </li>
                )}
              </ul>
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => navigate("/verify-email")}
                >
                  Atur Ulang Password
                </Button>
                <Button
                  variant="danger"
                  fullWidth
                  onClick={() => setLogoutOpen(true)}
                >
                  Logout
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={logoutOpen}
        title="Logout dari ReguFlow?"
        message="Kamu perlu login kembali untuk mengakses dashboard dan dokumen."
        confirmLabel="Ya, logout"
        danger
        onConfirm={handleSignOut}
        onCancel={() => setLogoutOpen(false)}
      />
    </div>
  );
}
