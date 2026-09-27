import { Link } from "react-router-dom";
import { Card, CardBody, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { DISCLAIMER } from "@/lib/constants";

const plans = [
  {
    name: "Gratis",
    price: "Rp0",
    period: "selamanya",
    description: "Cocok untuk mulai mengecek kesiapan dokumen.",
    cta: "Daftar Sekarang",
    ctaTo: "/register",
    highlight: false,
    features: [
      "Cek kesiapan tanpa batas",
      "1 profil usaha",
      "Hingga 5 produk",
      "Brankas dokumen hingga 50 file",
      "Checklist compliance dasar",
      "Reminder in-app",
    ],
  },
  {
    name: "Bisnis",
    price: "Rp49.000",
    period: "per bulan",
    description: "Untuk UMKM yang sedang menyiapkan sertifikasi serius.",
    cta: "Mulai dari Gratis",
    ctaTo: "/register",
    highlight: true,
    features: [
      "Semua fitur Gratis",
      "Produk tanpa batas",
      "Brankas dokumen hingga 500 file",
      "Semua checklist compliance (halal, SPP-IRT, NIB, label)",
      "Prioritas reminder & task",
      "Akses minta review pendamping",
    ],
  },
  {
    name: "Pendamping/Konsultan",
    price: "Kustom",
    period: "hubungi kami",
    description: "Untuk konsultan yang mendampingi banyak klien UMKM.",
    cta: "Cek Kesiapan Gratis",
    ctaTo: "/cek-kesiapan",
    highlight: false,
    features: [
      "Dashboard konsultan",
      "Kelola banyak klien UMKM",
      "Review checklist & dokumen klien",
      "Assign task ke klien",
      "Komentar & kolaborasi",
    ],
  },
];

export default function HargaPage() {
  return (
    <div className="bg-slate-50">
      <div className="container-page py-12 sm:py-16">
        <PageHeader
          title="Harga ReguFlow"
          description="Mulai gratis. Upgrade saat usaha kamu sudah siap untuk sertifikasi."
          className="text-center [&_h1]:text-center [&_p]:mx-auto [&_p]:max-w-2xl"
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={
                plan.highlight
                  ? "relative border-brand-300 shadow-card-lg ring-1 ring-brand-200"
                  : "relative"
              }
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge tone="blue">Paling Populer</Badge>
                </span>
              )}
              <CardBody className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold text-slate-900">
                      {plan.price}
                    </span>
                    <span className="text-sm text-slate-500">{plan.period}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{plan.description}</p>
                </div>
                <ul className="space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2.5 text-sm text-slate-600">
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
                      {f}
                    </li>
                  ))}
                </ul>
              </CardBody>
              <CardFooter className="block">
                <Link to={plan.ctaTo}>
                  <Button
                    fullWidth
                    variant={plan.highlight ? "primary" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>

        <Card className="mt-10 border-amber-200 bg-amber-50/60">
          <CardBody>
            <h3 className="text-sm font-semibold text-slate-900">Catatan</h3>
            <p className="mt-1 text-sm text-slate-600">{DISCLAIMER}</p>
            <p className="mt-2 text-sm text-slate-600">
              Biaya ini hanya untuk penggunaan platform ReguFlow dan tidak
              mencakup biaya resmi ke portal pemerintah (OSS, SIHALAL, BPOM) atau
              jasa konsultan independen.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
