import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase/client";
import { loginSchema, type LoginInput } from "@/lib/validation";
import { getSafeErrorMessage } from "@/lib/utils";

export default function VerifyEmailPage() {
  const toast = useToast();
  const navigate = useNavigate();
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
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) {
        toast.error("Gagal", getSafeErrorMessage(error));
        return;
      }
      toast.success(
        "Tautan terkirim",
        "Cek email kamu untuk mengatur ulang password atau verifikasi akun."
      );
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error("Gagal", getSafeErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Masukkan email kamu. Kami akan kirim tautan untuk verifikasi atau
        mengatur ulang password.
      </p>
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
        <Button type="submit" fullWidth size="lg" loading={loading}>
          Kirim Tautan
        </Button>
      </form>
      <p className="text-center text-sm text-slate-600">
        Ingat password kamu?{" "}
        <Link to="/login" className="link-brand">
          Kembali ke login
        </Link>
      </p>
    </div>
  );
}
