import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { loginSchema, type LoginInput } from "@/lib/validation";
import { getSafeErrorMessage } from "@/lib/utils";
import { useAuthStore } from "@/lib/api/auth-store";

export default function LoginPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const signIn = useAuthStore((s) => s.signIn);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    try {
      await signIn(data.email, data.password);

      toast.success("Berhasil masuk", "Selamat datang kembali!");

      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? "/dashboard", { replace: true });
    } catch (error) {
      toast.error("Login gagal", getSafeErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Field label="Email" htmlFor="email" error={errors.email?.message} required>
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
        label="Password"
        htmlFor="password"
        error={errors.password?.message}
        required
      >
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="Minimal 8 karakter"
          error={!!errors.password}
          {...register("password")}
        />
      </Field>

      <Button type="submit" fullWidth size="lg" loading={loading}>
        Masuk
      </Button>

      <p className="text-center text-sm text-slate-600">
        Belum punya akun?{" "}
        <Link to="/register" className="link-brand">
          Daftar gratis
        </Link>
      </p>
      <p className="text-center text-sm text-slate-600">
        Lupa password?{" "}
        <Link to="/verify-email" className="link-brand">
          Verifikasi email
        </Link>
      </p>
    </form>
  );
}
