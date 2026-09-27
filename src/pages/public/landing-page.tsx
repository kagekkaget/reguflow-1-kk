import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DISCLAIMER, APP_TAGLINE } from "@/lib/constants";

const problems = [
  {
    title: "Bingung dokumen apa yang dibutuhkan",
    desc: "NIB, halal, SPP-IRT, BPOM — aturannya banyak dan teknis. Susah tahu mulai dari mana.",
    icon: "M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z",
  },
  {
    title: "Dokumen berserakan di banyak tempat",
    desc: "Ada di WhatsApp, email, laptop, dan kertas. Saat dibutuhkan, susah dicari.",
    icon: "M2.25 12.76V5.25a2.25 2.25 0 0 1 2.25-2.25h13.5a2.25 2.25 0 0 1 2.25 2.25v13.5a2.25 2.25 0 0 1-2.25 2.25H6.75a2.25 2.25 0 0 1-2.25-2.25v-.75m0 0a1.5 1.5 0 0 1 1.5-1.5h6a1.5 1.5 0 0 1 1.5 1.5m0 0V18",
  },
  {
    title: "Tidak tahu dokumen sudah expired",
    desc: "Sertifikat halal dan dokumen lain punya masa berlaku. Lupa = harus mengulang proses.",
    icon: "M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  },
  {
    title: "Tidak yakin produk perlu sertifikasi apa",
    desc: "Makanan? Kosmetik? Skala rumah tangga? Jawabannya menentukan syarat yang berbeda.",
    icon: "M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75",
  },
];

const features = [
  {
    title: "Cek Kesiapan Gratis",
    desc: "Jawab beberapa pertanyaan, langsung tahu dokumen apa yang kurang dan langkah berikutnya.",
    icon: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  },
  {
    title: "Brankas Dokumen Privat",
    desc: "Simpan semua dokumen penting di satu tempat aman. Akses hanya via tautan privat (signed URL).",
    icon: "M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h9M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 0 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 0 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z",
  },
  {
    title: "Checklist Kepatuhan",
    desc: "Checklist otomatis untuk halal, NIB, SPP-IRT, dan label. Tahu persis apa yang masih kurang.",
    icon: "M9 12.75 11.25 15 15 9.75M7.5 21h9.75M6.75 6.75h.008v.008H6.75V6.75Z",
  },
  {
    title: "Reminder Kadaluarsa & Task",
    desc: "Pengingat untuk dokumen yang akan expired dan tugas yang harus segera dikerjakan.",
    icon: "M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.748V7.5a8.967 8.967 0 0 0-2.312-6.022A24.18 24.18 0 0 0 12 1.5a24.18 24.18 0 0 0-3.688.478A8.967 8.967 0 0 0 6 7.5v2.248c0 2.322-.836 4.453-2.222 6.024a23.85 23.85 0 0 0 5.454 1.31",
  },
  {
    title: "Scanner Compliance",
    desc: "Sistem cek otomatis: baca data usaha, produk, dan dokumen — langsung hitung skor kesiapan.",
    icon: "M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15",
  },
  {
    title: "Pendamping & Konsultan",
    desc: "Minta review dari pendamping yang bisa bantu cek kelengkapan sebelum diajukan resmi.",
    icon: "M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719",
  },
];

const steps = [
  {
    num: "1",
    title: "Cek kesiapan",
    desc: "Jawab pertanyaan singkat tentang usaha dan produk kamu. Gratis, tanpa daftar.",
  },
  {
    num: "2",
    title: "Lengkapi data & dokumen",
    desc: "Buat akun, isi profil usaha, produk, dan upload dokumen ke brankas privat.",
  },
  {
    num: "3",
    title: "Ikuti checklist",
    desc: "Kerjakan checklist sesuai rekomendasi. Minta review pendamping saat sudah siap.",
  },
];

function Icon({ path, className }: { path: string; className?: string }) {
  return (
    <svg
      className={className ?? "h-6 w-6"}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white">
        <div
          className="absolute inset-0 -z-10 opacity-40"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(60% 60% at 50% 0%, rgba(37,99,235,0.12) 0%, rgba(255,255,255,0) 70%)",
          }}
        />
        <div className="container-page py-16 sm:py-20 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              <Icon path="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" className="h-4 w-4" />
              Compliance assistant untuk UMKM
            </span>
            <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              Urus Legalitas & Sertifikasi UMKM Tanpa Bingung
            </h1>
            <p className="mt-5 text-base text-slate-600 sm:text-lg">
              {APP_TAGLINE} Cek dokumen apa saja yang kamu butuhkan, simpan file
              penting dengan aman, dan ikuti checklist sampai siap direview.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/cek-kesiapan" className="w-full sm:w-auto">
                <Button size="lg" fullWidth className="sm:w-auto">
                  Cek Kesiapan Gratis
                </Button>
              </Link>
              <Link to="/register" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" fullWidth className="sm:w-auto">
                  Daftar Sekarang
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Gratis untuk mulai · Tidak perlu kartu kredit
            </p>
          </div>

          {/* Preview card */}
          <div className="mx-auto mt-14 max-w-4xl">
            <Card className="overflow-hidden p-0 shadow-card-lg">
              <div className="grid gap-0 sm:grid-cols-3">
                <div className="border-b border-slate-100 p-6 sm:border-b-0 sm:border-r">
                  <p className="text-xs font-medium text-slate-500">Skor kesiapan</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">
                    72<span className="text-base font-normal text-slate-400">/100</span>
                  </p>
                  <span className="mt-2 inline-flex rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-700">
                    Hampir Siap
                  </span>
                </div>
                <div className="border-b border-slate-100 p-6 sm:border-b-0 sm:border-r">
                  <p className="text-xs font-medium text-slate-500">Dokumen kurang</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">3</p>
                  <p className="mt-2 text-xs text-slate-500">Manual SJPH, Daftar bahan, Label produk</p>
                </div>
                <div className="p-6">
                  <p className="text-xs font-medium text-slate-500">Task mendesak</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">2</p>
                  <p className="mt-2 text-xs text-slate-500">Upload NIB, Cek SPP-IRT</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="bg-slate-50 py-16 sm:py-20" id="masalah">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Masalah yang Sering Dialami UMKM
            </h2>
            <p className="mt-3 text-slate-600">
              Banyak pemilik usaha gagal lanjut ke sertifikasi bukan karena tidak
              mampu, tapi karena tidak tahu urutan dan dokumen yang benar.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {problems.map((p) => (
              <Card key={p.title} className="p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <Icon path={p.icon} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{p.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="bg-white py-16 sm:py-20">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Solusi ReguFlow
            </h2>
            <p className="mt-3 text-slate-600">
              ReguFlow bukan menggantikan portal resmi. ReguFlow membantu kamu
              <strong> siap sebelum mengajukan</strong> — sehingga proses di portal
              resmi jadi lebih cepat dan tidak berulang-ulang.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} className="p-6 transition-shadow hover:shadow-card-lg">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon path={f.icon} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Cara kerja */}
      <section className="bg-slate-50 py-16 sm:py-20" id="cara-kerja">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Cara Kerja ReguFlow
            </h2>
            <p className="mt-3 text-slate-600">
              Tiga langkah sederhana, tanpa istilah hukum yang membingungkan.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {steps.map((s, idx) => (
              <div key={s.num} className="relative">
                <Card className="h-full p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                    {s.num}
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">{s.desc}</p>
                </Card>
                {idx < steps.length - 1 && (
                  <div
                    className="absolute right-0 top-1/2 hidden -translate-y-1/2 translate-x-1/2 text-slate-300 md:block"
                    aria-hidden="true"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="bg-white py-12">
        <div className="container-narrow">
          <Card className="border-amber-200 bg-amber-50/60 p-6">
            <div className="flex gap-4">
              <svg
                className="h-6 w-6 flex-shrink-0 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m0 3.75h.007M5.25 18.75h13.5a.75.75 0 0 0 .65-1.13l-6.75-11.7a.75.75 0 0 0-1.3 0l-6.75 11.7a.75.75 0 0 0 .65 1.13Z"
                />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Disclaimer</h3>
                <p className="mt-1 text-sm text-slate-600">{DISCLAIMER}</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-brand-600 to-teal-600 py-16 sm:py-20">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Mulai Cek Kesiapan Usaha Kamu Sekarang
            </h2>
            <p className="mt-3 text-brand-100">
              Gratis, hanya butuh 2 menit. Kamu langsung tahu dokumen apa yang
              masih kurang.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/cek-kesiapan" className="w-full sm:w-auto">
                <Button size="lg" variant="secondary" fullWidth className="sm:w-auto">
                  Cek Kesiapan Gratis
                </Button>
              </Link>
              <Link to="/register" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  fullWidth
                  className="border-white/40 bg-white/10 text-white hover:bg-white/20 sm:w-auto"
                >
                  Daftar Sekarang
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
