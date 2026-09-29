# ReguFlow

**Compliance Assistant untuk UMKM Indonesia**

> Cek kesiapan legalitas dan sertifikasi UMKM kamu tanpa bingung.

ReguFlow adalah web app yang membantu pelaku UMKM mengecek kesiapan legalitas
dan sertifikasi (NIB, Halal, SPP-IRT, dokumen usaha), menyimpan dokumen penting
secara aman, mengikuti checklist kepatuhan, dan mendapatkan reminder — semua
dalam satu tempat.

**PENTING:** ReguFlow adalah **alat bantu pengelolaan dokumen dan kesiapan
kepatuhan**. ReguFlow BUKAN portal resmi pemerintah dan tidak melakukan submit
resmi ke OSS, SIHALAL, BPOM, DJP, atau portal lainnya. Keputusan akhir dan
pengajuan resmi tetap dilakukan melalui portal resmi pemerintah atau
pendamping/konsultan terkait.

ReguFlow **gratis, tanpa iklan, dan source code-nya terbuka** (MIT). Lihat
bagian [Dukungan & Sumber Terbuka](#dukungan--sumber-terbuka).

---

## Tech Stack

**Frontend** (`/` — Vite + React)
- React 18 + TypeScript (strict mode)
- Vite 6 (code splitting otomatis + manual chunks untuk vendor)
- Tailwind CSS 3 (mobile-first, custom theme `brand`)
- React Router 7 (protected routes + role-based guards)
- TanStack Query 5 (caching & invalidation, `staleTime` 30s)
- React Hook Form + Zod (validasi dengan pesan Bahasa Indonesia)
- Zustand 5 (auth store + toast store)
- `qrcode` (MIT) — QR dibuat **lokal** sebagai SVG, tanpa CDN

**Backend** (`/server` — API khusus)
- Node.js + Express 5 + TypeScript
- Drizzle ORM + **Neon** (PostgreSQL serverless, via `@neondatabase/serverless`)
- JWT access token (short-lived, 15 menit) + refresh token di **httpOnly cookie**
  (refresh token disimpan di tabel `refresh_tokens` sehingga bisa dicabut)
- `bcryptjs` (hash password) + `zod` (validasi input di server)
- `helmet` + `express-rate-limit` (100 request / 15 menit / IP)
- `multer` — dokumen diunggah ke folder **private** (`UPLOAD_DIR`) dan disajikan
  lewat endpoint terautentikasi, bukan URL publik

> Catatan: versi awal proyek ini memakai Supabase + Row Level Security. Sekarang
> seluruh otorisasi ditegakkan di lapisan API Express (lihat
> [Keamanan](#keamanan)).

---

## Struktur Project

```
/                        frontend (Vite + React + Tailwind)
  src/app/               App, router, layout
  src/pages/             halaman (public, dashboard, admin, consultant)
  src/components/ui/     komponen dasar (button, modal, qr-code, dll.)
  src/components/common/ komponen bersama (trakteer-widget)
  src/lib/api/           API client, auth store, hooks query
  src/lib/constants/     constants (termasuk trakteer.ts)
  src/lib/utils/         helper (termasuk qr.ts)
server/                  backend (Express + Drizzle + Neon)
  src/routes/            endpoint per domain
  src/middleware/        auth, error handler, logger, upload
  src/db/                schema.ts, client.ts, seed.ts
  migrations/            SQL migration hasil drizzle-kit
vercel.json              SPA fallback + security headers (CSP)
_headers                 versi Netlify/Cloudflare dari security headers
```

## Cara Install

### 1. Clone & install dependencies

```bash
git clone https://github.com/kagekkaget/reguflow-1-kk.git
cd reguflow-1-kk
npm install
cd server && npm install && cd ..
```

### 2. Environment variables

**Frontend** — salin `.env.example` menjadi `.env` di root:

```env
VITE_API_URL=http://localhost:3000
```

**Backend** — salin `server/.env.example` menjadi `server/.env`:

```env
DATABASE_URL=postgresql://user:password@ep-xxx.pooler.neon.tech/neondb?sslmode=require
JWT_ACCESS_SECRET=ganti-dengan-random-string-panjang
JWT_REFRESH_SECRET=ganti-dengan-random-string-lain
PORT=3000
FRONTEND_URL=http://localhost:5173
UPLOAD_DIR=./storage/documents
MAX_UPLOAD_BYTES=10485760
NODE_ENV=development
```

Generate secret dengan:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> ⚠️ `DATABASE_URL` dan kedua JWT secret **hanya** ada di `server/.env`
> (sudah di-`.gitignore`). Jangan pernah menambahkannya ke file `.env` frontend.

### 3. Setup database (Neon)

1. Buat project di [neon.tech](https://neon.tech), salin *connection string*
   (gunakan pooled connection + `sslmode=require`).
2. Apply schema:

   ```bash
   cd server
   npm run db:migrate   # apply server/migrations/*.sql
   # npm run db:push    # alternatif saat pengembangan (tanpa file migration)
   ```
3. Isi data master (idempotent — aman dijalankan berulang):

   ```bash
   npm run db:seed      # compliance domains + requirements
   ```
4. Inspeksi data kalau perlu: `npm run db:studio` (Drizzle Studio).

### 4. Jalankan development server

```bash
# terminal 1 — API
cd server && npm run dev        # http://localhost:3000  (GET /health)

# terminal 2 — frontend
npm run dev                     # http://localhost:5173
```

---

## Setup Role: Admin & Consultant Pertama

Role disimpan di kolom `users.default_role` (enum: `owner`, `staff`,
`consultant`, `admin`, `viewer`), dan keanggotaan per organisasi di
`organization_members.role`. Role selalu dibaca ulang dari database setiap
request, jadi mengubahnya langsung berlaku setelah login ulang.

1. Daftar akun biasa lewat aplikasi (mis. `admin@reguflow.test`).
2. Naikkan role-nya di **Neon SQL Editor** atau Drizzle Studio:

   ```sql
   update public.users
   set default_role = 'admin'
   where email = 'admin@reguflow.test';
   ```
3. Login ulang — menu admin (`/admin/*`) langsung terbuka.

Untuk konsultan, set `default_role = 'consultant'`; akses ke data klien tetap
dibatasi lewat tabel `consultant_engagements` (hanya engagement berstatus
`active` yang terlihat).

---

## API Overview

| Prefix | Fungsi |
| --- | --- |
| `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `GET /auth/me`, `PATCH /auth/me` | Auth & profil |
| `/businesses` | CRUD usaha + metrik skala kecil |
| `/products`, `/ingredients`, `/suppliers` | Data produk (skala kecil) |
| `/assessments` | Kuis / assessment mandiri |
| `/compliance` | Case kepatuhan + checklist items |
| `/documents` | Upload, versi, preview & download (file private) |
| `/tasks`, `/reminders` | Tugas & pengingat |
| `/organizations`, `/engagements`, `/comments`, `/notifications` | Multi-tenant + kerja sama konsultan |
| `/rules` | Katalog regulasi (sumber tunggal aturan) |
| `/admin/*` | Statistik, user, bisnis, dokumen, audit log (khusus admin) |
| `GET /health` | Liveness probe |

Event audit tercatat di `audit_logs` (`user_login`, `user_registered`,
`member_invited`, `profile_updated`, `business_updated`, `scanner_run`).

## Keamanan

- **Auth:** access token JWT berumur pendek (15 menit) di memory + localStorage,
  refresh token di **httpOnly cookie** (tidak bisa dibaca JS). Refresh token
  disimpan di `refresh_tokens` sehingga bisa dirotasi dan dicabut saat logout.
- **Otorisasi di API:** middleware `authenticate` memuat user, role, dan
  organisasi **dari database** (payload JWT tidak dipercaya), tiap route
  mengecek kepemilikan organisasi, dan `/admin/*` dilindungi `requireAdmin`.
- **Password** di-hash `bcryptjs`; input divalidasi Zod di server dan client.
- **Rate limiting** 100 request / 15 menit / IP + `helmet` + CORS dibatasi ke
  `FRONTEND_URL` (dengan `credentials`).
- **Dokumen:** disimpan di `UPLOAD_DIR` (folder private, tidak di-serve statis),
  maks 10MB per file, hanya bisa diakses lewat endpoint terautentikasi, dan
  soft delete lewat `deleted_at`.
- **Audit trail** event penting tercatat di `audit_logs`.
- **CSP** `script-src 'self'` (lihat `vercel.json`) — tidak ada script pihak
  ketiga sama sekali, termasuk widget dukungan (makanya QR dibuat lokal).
- Tidak ada secret di repository: `.env`, `server/.env`, dan `server/storage`
  sudah di-`.gitignore`.

---

## Dukungan & Sumber Terbuka

ReguFlow dirilis sebagai proyek terbuka di bawah lisensi **MIT** — boleh
dipakai, dimodifikasi, dan disebarluaskan secara gratis, tanpa iklan dan tanpa
akun berbayar. Atribut yang diminta: **Open Source oleh MZF - 2026**.

```bash
git clone https://github.com/kagekkaget/reguflow-1-kk.git
```

Unduhan cepat: `https://github.com/kagekkaget/reguflow-1-kk/archive/refs/heads/main.zip`

Kalau ReguFlow membantu kamu (atau kamu cuma mau traktir kopi), tersedia widget
dukungan mengambang di kanan bawah aplikasi.

### Widget Trakteer + QR

Komponen: `src/components/common/trakteer-widget.tsx` (dimuat *lazy* dari
`src/app/App.tsx`, jadi tidak menambah bundle awal).

**Tab "Traktir"**
- Nominal dasar **Rp6.000** — tombol cepat adalah kelipatannya: Rp6.000,
  Rp12.000, Rp18.000, Rp24.000, Rp30.000, Rp36.000.
- Nominal custom diterima dan otomatis dibulatkan ke kelipatan Rp6.000 terdekat
  (batas atas Rp1.000.000).
- Setiap pilihan menampilkan **QR code** yang berisi tautan
  `https://trakteer.id/<username>/tip?amount=<nominal>` — pindai dengan kamera
  HP untuk membayar dari perangkat lain.
- Tombol **Buka Trakteer** membuka tab baru; pembayaran selalu diselesaikan di
  halaman resmi Trakteer. Tidak ada data akun ReguFlow yang dikirim, dan
  tidak ada pembayaran yang diproses di sisi aplikasi (Trakteer tidak
  menyediakan API auto-checkout).

**Tab "Source code"**
- Tombol **Download ZIP** dan tautan repositori.
- Perintah `git clone` + URL repositori yang bisa disalin sekali klik.
- QR tambahan untuk membuka arsip ZIP langsung dari browser HP.

Tombol **Sembunyikan** hanya menyembunyikan widget untuk sesi itu
(`sessionStorage`), jadi widget muncul lagi di kunjungan berikutnya.

### Kenapa tidak memakai widget/iframe resmi Trakteer?

CSP aplikasi mengunci `script-src 'self'`, yang otomatis memblokir script dan
iframe Trakteer. Menambah origin Trakteer ke `script-src` berarti membuka celah
XSS — lebih mahal daripada nilainya. Solusinya: QR dihasilkan **lokal** dan
tautan dibuka lewat tab baru, sehingga widget tetap berfungsi 100% tanpa
melonggarkan CSP.

### Menyesuaikan widget

Semua nilai ada di `src/lib/constants/trakteer.ts` — tidak perlu menyentuh
komponen:

| Konstanta | Arti |
| --- | --- |
| `TRAKTEER_USERNAME` | Tujuan traktiran (`https://trakteer.id/<username>`) |
| `TRAKTEER_BASE_NOMINAL` | Nominal dasar / kelipatan (default `6000`) |
| `TRAKTEER_QUICK_PICK_COUNT` | Jumlah tombol nominal cepat (default `6`) |
| `TRAKTEER_MAX_NOMINAL` | Batas nominal custom (default `1000000`) |
| `TRAKTEER_WIDGET_MESSAGE`, `TRAKTEER_QR_CAPTION` | Teks di widget |
| `REPO_URL`, `REPO_BRANCH` | Sumber tautan ZIP & atribut sumber terbuka |
| `OPEN_SOURCE_CREDIT`, `OPEN_SOURCE_LICENSE` | Teks atribut di widget & README |

Generator QR: `src/lib/utils/qr.ts` (`buildQrGrid` + `qrGridToSvgPath`) dengan
error correction level **M**, dirender oleh `src/components/ui/qr-code.tsx`
sebagai SVG (`shapeRendering="crispEdges"`, quiet zone 2 modul). Tidak ada
request jaringan sama sekali saat QR ditampilkan.

## Skrip yang Tersedia

| Perintah | Lokasi | Fungsi |
| --- | --- | --- |
| `npm run dev` | root | Vite dev server (port 5173) |
| `npm run build` | root | `tsc --noEmit` + build produksi ke `dist/` |
| `npm run preview` | root | Coba hasil build secara lokal |
| `npm run typecheck` | root | Type-check frontend |
| `npm run lint` | root | ESLint (butuh `eslint.config.js`; belum ada di repo) |
| `npm run audit` | root | `npm audit` untuk frontend |
| `npm run dev` | `server/` | API dengan `tsx watch` (port 3000) |
| `npm run build` / `npm start` | `server/` | Compile TS ke `dist/` lalu jalankan |
| `npm run typecheck` | `server/` | Type-check backend |
| `npm run db:generate` / `db:migrate` / `db:push` | `server/` | Drizzle Kit (migration) |
| `npm run db:seed` | `server/` | Isi compliance domains + requirements |
| `npm run db:studio` | `server/` | Drizzle Studio |

---

## Performance

- Lazy loading seluruh halaman (code splitting) — widget dukungan juga *lazy*,
  hanya dimuat sebagai chunk terpisah (~14 kB gzip) setelah aplikasi tampil.
- Manual chunks untuk React, TanStack Query, dan library form.
- Skeleton loading + TanStack Query caching (`staleTime` 30s).
- Debounced search dan index pada kolom yang sering difilter.
- Build target ES2020, tanpa sourcemap di production.

---

## Production Checklist

- [ ] `DATABASE_URL` produksi dengan `sslmode=require` (branch/cluster terpisah dari dev)
- [ ] JWT secret baru & berbeda (`JWT_ACCESS_SECRET` ≠ `JWT_REFRESH_SECRET`), `NODE_ENV=production`
- [ ] `FRONTEND_URL` = domain frontend produksi (untuk CORS `credentials`)
- [ ] `UPLOAD_DIR` di persistent volume atau dipindah ke object storage
- [ ] Backup Neon (PITR / scheduled backup) aktif
- [ ] `VITE_API_URL` benar saat build; bila API beda origin, tambahkan ke `connect-src` CSP
- [ ] Rate limiting / WAF di depan API bila perlu
- [ ] `npm audit` (root & `server/`) bersih
- [ ] Security headers terpasang (`vercel.json` atau `_headers`)
- [ ] Uji silang role: owner, staff, consultant (hanya klien aktif), viewer (read-only), admin
- [ ] Uji alur dokumen: upload → preview → download → delete (soft delete)
- [ ] Pastikan tidak ada secret yang ter-commit (`.env`, `server/.env`, `server/storage/`)
- [ ] Sesuaikan `TRAKTEER_USERNAME` / `REPO_URL` bila kamu mem-brand ulang

### Contoh security headers

Vercel memakai `vercel.json`; Netlify/Cloudflare memakai `_headers`.

```
Content-Security-Policy: default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self' data:;
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

> `connect-src 'self'` berarti frontend hanya boleh memanggil API di origin yang
> sama. Kalau API di-host di domain terpisah, ubah menjadi
> `connect-src 'self' https://api.example.com` **atau** proxy `/api` lewat
> rewrite hosting agar tetap same-origin.

---

## Deployment

**Frontend (Vercel)**
1. Import repo → framework Vite (dipilih otomatis oleh `vercel.json`).
2. Build command `npm run build`, output `dist`.
3. Environment variable: `VITE_API_URL`.
4. SPA rewrite sudah dikonfigurasi (`/(*)` → `/index.html`) + security headers.
   Alternatif Netlify/Cloudflare: gunakan file `_headers`.

**Backend (`server/`)**
1. Deploy ke runtime Node (Railway, Render, Fly.io, atau VPS) — build
   `npm run build`, start `npm start`.
2. Jalankan `npm run db:migrate` setiap rilis.
3. Isi env: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
   `FRONTEND_URL`, `PORT`, `UPLOAD_DIR`, `NODE_ENV`.
4. Jika filesystem instan bersifat sementara, pasang persistent disk (atau
   pindahkan penyimpanan file ke object storage) supaya dokumen tidak hilang.
5. Cek sehat dengan `GET /health`.

---

## Development Notes

- Semua teks aplikasi dan pesan error formulir dalam **Bahasa Indonesia**.
- Jalankan `npm run typecheck` di root **dan** `server/` sebelum commit.
- Kolom `channel` di tabel `reminders` sudah disiapkan untuk pengiriman
  reminder via email/WhatsApp.

## TODO (Pengembangan Selanjutnya)

- [ ] Pengiriman reminder via email/WhatsApp (struktur DB sudah siap)
- [ ] UI versi dokumen (`document_versions` sudah ada)
- [ ] Notifikasi real-time (tabel `notifications` sudah ada)
- [ ] Export laporan PDF
- [ ] Multi-business per organisasi
- [ ] Menyimpan dokumen di object storage (S3-compatible)

---

## Lisensi & Kredit

- **Lisensi:** MIT © 2026 MZF — lihat [`LICENSE`](./LICENSE)
- **QR code:** [`qrcode`](https://github.com/soldair/node-qrcode) (MIT), dipakai
  tanpa dependensi CDN/client-side fetch
- **Dukungan pengembangan:** Trakteer — [`trakteer.id/perpus_opera`](https://trakteer.id/perpus_opera)
- **Atribut:** *Open Source oleh MZF - 2026* — mohon pertahankan kredit ini pada
  turunan proyek.

---

## Disclaimer

ReguFlow adalah alat bantu pengelolaan dokumen dan kesiapan kepatuhan. Keputusan
akhir dan pengajuan resmi tetap dilakukan melalui portal resmi pemerintah atau
pendamping/konsultan terkait.



