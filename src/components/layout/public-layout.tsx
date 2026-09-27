import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

const navLinks = [
  { to: "/#fitur", label: "Fitur" },
  { to: "/#cara-kerja", label: "Cara Kerja" },
  { to: "/harga", label: "Harga" },
  { to: "/tentang", label: "Tentang" },
];

export function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <nav className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex-shrink-0" aria-label="ReguFlow beranda">
          <Logo />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <NavLink
              key={link.label}
              to={link.to}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Login
            </Button>
          </Link>
          <Link to="/register">
            <Button size="sm">Daftar Sekarang</Button>
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 md:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Buka menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            </svg>
          )}
        </button>
      </nav>

      {mobileOpen && (
        <div className="border-t border-slate-100 bg-white md:hidden">
          <div className="container-page flex flex-col gap-1 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <Link to="/login" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" fullWidth>
                  Login
                </Button>
              </Link>
              <Link to="/register" onClick={() => setMobileOpen(false)}>
                <Button fullWidth>Daftar Sekarang</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="container-page py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-3 max-w-sm text-sm text-slate-500">
              Alat bantu pengelolaan dokumen dan kesiapan kepatuhan untuk UMKM
              Indonesia. Cek kesiapan, simpan dokumen, dan ikuti checklist tanpa
              bingung.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Produk</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link to="/cek-kesiapan" className="text-slate-500 hover:text-brand-600">
                  Cek Kesiapan Gratis
                </Link>
              </li>
              <li>
                <Link to="/#fitur" className="text-slate-500 hover:text-brand-600">
                  Fitur
                </Link>
              </li>
              <li>
                <Link to="/harga" className="text-slate-500 hover:text-brand-600">
                  Harga
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Lainnya</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link to="/tentang" className="text-slate-500 hover:text-brand-600">
                  Tentang Kami
                </Link>
              </li>
              <li>
                <Link to="/kebijakan-privasi" className="text-slate-500 hover:text-brand-600">
                  Kebijakan Privasi
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-slate-500 hover:text-brand-600">
                  Login
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-slate-100 pt-6">
          <p className="text-xs leading-relaxed text-slate-400">
            {String.fromCharCode(169)} {new Date().getFullYear()} ReguFlow.
            ReguFlow adalah alat bantu pengelolaan dokumen dan kesiapan kepatuhan.
            Keputusan akhir dan pengajuan resmi tetap dilakukan melalui portal
            resmi pemerintah atau pendamping/konsultan terkait.
          </p>
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <PublicNavbar />
      <main className={cn("flex-1")}>{children}</main>
      <PublicFooter />
    </div>
  );
}
