import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [loading] = useState(false);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Layanan email belum tersedia di ReguFlow self-hosted. Jika kamu lupa
        password atau butuh verifikasi akun, hubungi admin melalui WhatsApp
        tim ReguFlow untuk reset manual.
      </p>
      <Button
        type="button"
        fullWidth
        size="lg"
        loading={loading}
        onClick={() => navigate("/login", { replace: true })}
      >
        Kembali ke Login
      </Button>
      <p className="text-center text-sm text-slate-600">
        Ingat password kamu?{" "}
        <Link to="/login" className="link-brand">
          Masuk di sini
        </Link>
      </p>
    </div>
  );
}
