import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { DISCLAIMER } from "@/lib/constants";

export default function KebijakanPrivasiPage() {
  return (
    <div className="container-narrow py-12 sm:py-16">
      <PageHeader
        title="Kebijakan Privasi"
        description="Privasi kamu prioritas kami. Dokumen sensitif disimpan secara private."
      />

      <div className="space-y-6">
        <Card>
          <CardBody className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">
              1. Data yang Kami Kumpulkan
            </h2>
            <p className="text-sm text-slate-600">
              ReguFlow mengumpulkan data yang kamu berikan saat mendaftar dan
              menggunakan aplikasi: nama, email, nomor WhatsApp, data profil usaha,
              data produk, dan dokumen yang kamu unggah. Kami juga mencatat log
              aktivitas (audit log) untuk keperluan keamanan dan akuntabilitas.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">
              2. Penyimpanan Dokumen Sensitif
            </h2>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex gap-3">
                <span className="h-1.5 w-1.5 flex-shrink-0 translate-y-2 rounded-full bg-brand-500" />
                Semua dokumen disimpan di storage <strong>private</strong> — tidak
                ada public URL untuk dokumen kamu.
              </li>
              <li className="flex gap-3">
                <span className="h-1.5 w-1.5 flex-shrink-0 translate-y-2 rounded-full bg-brand-500" />
                Akses preview/download hanya melalui <strong>signed URL</strong>{" "}
                yang berlaku singkat dan dibuat setelah pengecekan izin (Row Level
                Security).
              </li>
              <li className="flex gap-3">
                <span className="h-1.5 w-1.5 flex-shrink-0 translate-y-2 rounded-full bg-brand-500" />
                Data kamu hanya bisa diakses oleh kamu, anggota organisasi kamu,
                konsultan yang memiliki engagement aktif, atau admin platform.
              </li>
              <li className="flex gap-3">
                <span className="h-1.5 w-1.5 flex-shrink-0 translate-y-2 rounded-full bg-brand-500" />
                Setiap akses dokumen (upload, lihat, download, hapus) tercatat di
                audit log.
              </li>
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">
              3. Bagaimana Data Digunakan
            </h2>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex gap-3">
                <span className="h-1.5 w-1.5 flex-shrink-0 translate-y-2 rounded-full bg-brand-500" />
                Menampilkan hasil asesmen dan rekomendasi compliance.
              </li>
              <li className="flex gap-3">
                <span className="h-1.5 w-1.5 flex-shrink-0 translate-y-2 rounded-full bg-brand-500" />
                Membuat checklist dan reminder yang relevan.
              </li>
              <li className="flex gap-3">
                <span className="h-1.5 w-1.5 flex-shrink-0 translate-y-2 rounded-full bg-brand-500" />
                Menghubungkan kamu dengan pendamping/konsultan jika kamu meminta.
              </li>
              <li className="flex gap-3">
                <span className="h-1.5 w-1.5 flex-shrink-0 translate-y-2 rounded-full bg-brand-500" />
                Peningkatan layanan dan keamanan platform.
              </li>
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">
              4. Hak Kamu
            </h2>
            <p className="text-sm text-slate-600">
              Kamu berhak mengakses, memperbarui, dan menghapus data kamu. Kamu
              dapat menghapus dokumen dari brankas kapan saja melalui halaman
              Brankas Dokumen. Untuk penghapusan akun sepenuhnya, hubungi kami.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">
              5. Keamanan
            </h2>
            <p className="text-sm text-slate-600">
              Kami menerapkan keamanan berlapis: autentikasi Supabase, Row Level
              Security pada database, storage dokumen private, validasi ketat
              terhadap unggahan file, serta pencatatan audit log. Tidak ada sistem
              yang 100% aman, tetapi kami memprioritaskan keamanan sejak awal
              pengembangan.
            </p>
          </CardBody>
        </Card>

        <Card className="border-amber-200 bg-amber-50/60">
          <CardBody>
            <h2 className="text-sm font-semibold text-slate-900">Disclaimer</h2>
            <p className="mt-1 text-sm text-slate-600">{DISCLAIMER}</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
