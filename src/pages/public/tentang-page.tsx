import { Link } from "react-router-dom";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";

export default function TentangPage() {
  return (
    <div className="container-narrow py-12 sm:py-16">
      <PageHeader
        title="Tentang ReguFlow"
        description="Compliance assistant untuk UMKM Indonesia."
      />

      <div className="space-y-6">
        <Card>
          <CardBody className="prose prose-sm max-w-none">
            <h2 className="text-lg font-semibold text-slate-900">Misi Kami</h2>
            <p className="mt-3 text-slate-600">
              ReguFlow dibangun untuk membantu pelaku UMKM Indonesia menyiapkan
              legalitas dan sertifikasi usaha mereka tanpa kebingungan. Banyak
              pemilik usaha yang ingin naik kelas — masuk marketplace, ekspor, atau
              akses pendanaan — tetapi terhambat karena dokumen belum lengkap
              atau tidak tahu harus mulai dari mana.
            </p>
            <p className="mt-3 text-slate-600">
              Kami percaya kesiapan dokumen adalah jembatan pertama menuju
              pertumbuhan usaha. ReguFlow hadir untuk membuat jembatan itu
              sesederhana mungkin.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="text-lg font-semibold text-slate-900">Apa yang Kami Lakukan</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {[
                "Membantu asesmen awal kesiapan legalitas & sertifikasi.",
                "Membuat checklist kepatuhan yang mudah diikuti.",
                "Menyimpan dokumen penting di brankas digital yang aman.",
                "Memberi reminder untuk dokumen yang akan kadaluarsa.",
                "Menghubungkan UMKM dengan pendamping/konsultan untuk review.",
              ].map((item, idx) => (
                <li key={idx} className="flex gap-3">
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
                  {item}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card className="border-amber-200 bg-amber-50/60">
          <CardBody>
            <h2 className="text-lg font-semibold text-slate-900">Yang Tidak Kami Lakukan</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {[
                "ReguFlow BUKAN portal resmi pemerintah (OSS, SIHALAL, BPOM, DJP).",
                "ReguFlow tidak melakukan submit resmi atas nama kamu.",
                "ReguFlow bukan pengganti konsultan hukum atau pajak.",
                "Hasil asesmen ReguFlow adalah gambaran umum, bukan keputusan resmi.",
              ].map((item, idx) => (
                <li key={idx} className="flex gap-3">
                  <svg
                    className="h-5 w-5 flex-shrink-0 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <div className="text-center">
          <Link to="/cek-kesiapan">
            <Button size="lg">Cek Kesiapan Gratis</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
