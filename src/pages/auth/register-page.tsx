import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  registerSchema,
  type RegisterInput,
} from "@/lib/validation";
import { getSafeErrorMessage } from "@/lib/utils";
import { useAuthStore } from "@/lib/api/auth-store";

export default function RegisterPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const signUp = useAuthStore((s) => s.signUp);
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
    setLoading(true);
    try {
      // Backend membuat user + organisasi default + membership sekaligus.
      await signUp({
        email: data.email,
        password: data.password,
        full_name: data.full_name,
        phone: data.whatsapp,
      });

      toast.success(
        "Pendaftaran berhasil!",
        "Akun kamu sudah siap. Lanjut lengkapi data usaha."
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
