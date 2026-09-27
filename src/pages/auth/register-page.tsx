import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  registerSchema,
  type RegisterInput,
} from "@/lib/validation";
import { getSafeErrorMessage } from "@/lib/utils";

export default function RegisterPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      acceptTerms: false,
    },
  });

  const acceptTerms = watch("acceptTerms");

  const onSubmit = async (data: RegisterInput) => {
    if (!isSupabaseConfigured) {
      toast.error(
        "Belum bisa daftar",
        "Supabase belum dikonfigurasi. Hubungi admin atau set file .env."
      );
      return;
    }

    setLoading(true);
    try {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
            phone: data.whatsapp,
          },
        },
      });

      if (error) {
        const message =
          error.message?.includes("already registered")
            ? "Email sudah terdaftar. Silakan login."
            : "Pendaftaran gagal. Coba lagi.";
        toast.error("Pendaftaran gagal", message);
        return;
      }

      // Buat organisasi default (type business) untuk UMKM baru
      if (signUpData.user) {
        try {
          const { data: org } = await supabase
            .from("organizations")
            .insert({
              name: `Usaha ${data.full_name}`,
              type: "business",
              created_by: signUpData.user.id,
            })
            .select()
            .single();

          if (org) {
            await supabase.from("organization_members").insert({
              organization_id: org.id,
              user_id: signUpData.user.id,
              role: "owner",
              status: "active",
            });
          }
        } catch {
          // Jika organisasi gagal dibuat, user tetap bisa lanjut via onboarding
        }
      }

      toast.success(
        "Pendaftaran berhasil!",
        "Cek email kamu untuk verifikasi (jika diminta), lalu login."
      );
      navigate("/onboarding", { replace: true });
    } catch (error) {
      toast.error("Pendaftaran gagal", getSafeErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Field
        label="Nama lengkap"
        htmlFor="full_name"
        error={errors.full_name?.message}
        required
      >
        <Input
          id="full_name"
          autoComplete="name"
          placeholder="Nama lengkap kamu"
          error={!!errors.full_name}
          {...register("full_name")}
        />
      </Field>

      <Field
        label="Email"
        htmlFor="email"
        error={errors.email?.message}
        required
      >
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="kamu@email.com"
          error={!!errors.email}
          {...register("email")}
        />
      </Field>

      <Field
        label="Nomor WhatsApp"
        htmlFor="whatsapp"
        error={errors.whatsapp?.message}
        required
        hint="Untuk notifikasi & bantuan (opsional digunakan)"
      >
        <Input
          id="whatsapp"
          inputMode="tel"
          placeholder="081234567890"
          error={!!errors.whatsapp}
          {...register("whatsapp")}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        error={errors.password?.message}
        required
        hint="Minimal 8 karakter, harus mengandung huruf dan angka."
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="Minimal 8 karakter"
          error={!!errors.password}
          {...register("password")}
        />
      </Field>

      <Field
        label="Ulangi password"
        htmlFor="confirmPassword"
        error={errors.confirmPassword?.message}
        required
      >
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Ketik ulang password"
          error={!!errors.confirmPassword}
          {...register("confirmPassword")}
        />
      </Field>

      <div>
        <Checkbox
          id="acceptTerms"
          label="Saya menyetujui Syarat & Ketentuan dan Kebijakan Privasi ReguFlow"
          {...register("acceptTerms")}
        />
        {errors.acceptTerms && (
          <p className="error-text" role="alert">
            {errors.acceptTerms.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        fullWidth
        size="lg"
        loading={loading}
        disabled={!acceptTerms}
      >
        Daftar Sekarang
      </Button>

      <p className="text-center text-sm text-slate-600">
        Sudah punya akun?{" "}
        <Link to="/login" className="link-brand">
          Masuk di sini
        </Link>
      </p>
    </form>
  );
}
