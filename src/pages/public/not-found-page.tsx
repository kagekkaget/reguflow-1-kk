import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="text-6xl font-bold text-brand-600 sm:text-7xl">404</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">
        Halaman Tidak Ditemukan
      </h1>
      <p className="mt-2 max-w-md text-slate-600">
        Maaf, halaman yang kamu cari tidak ada atau sudah dipindahkan.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link to="/">
          <Button>Kembali ke Beranda</Button>
        </Link>
        <Link to="/cek-kesiapan">
          <Button variant="outline">Cek Kesiapan Gratis</Button>
        </Link>
      </div>
    </div>
  );
}
