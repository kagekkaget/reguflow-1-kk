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

---

## Tech Stack

**Frontend**
- React 18 + TypeScript
- Vite 6 (build cepat, code splitting otomatis via lazy loading)
- Tailwind CSS 3 (mobile-first, custom theme)
- React Router 6 (protected routes + role-based guards)
- React Hook Form + Zod (validasi form dengan pesan Bahasa Indonesia)
- TanStack Query 5 (caching & invalidation data)
- Zustand (state ringan: auth store)

**Backend / Database**
- Supabase (Auth, PostgreSQL, Storage, Row Level Security)
- Tidak ada backend custom untuk MVP — semua akses data melalui RLS Supabase
- Storage bucket dokumen **private**, akses file via **signed URL**

---

## Cara Install

### 1. Clone & install dependencies

```bash
git clone <repo-url>
cd reguflow
npm install
```

### 2. Setup environment variables

Salin `.env.example` menjadi `.env` dan isi dengan kredensial Supabase kamu:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

Dapatkan nilai ini di **Supabase Dashboard → Settings → API**.

> ⚠️ **JANGAN** pernah memasukkan `SUPABASE_SERVICE_ROLE_KEY` ke frontend atau
> file `.env` frontend. Service role key hanya untuk server/admin scripts.

### 3. Setup database Supabase

Buka **Supabase Dashboard → SQL Editor** dan jalankan file-file SQL berikut
**secara berurutan**:

```bash
# 1. Schema (tabel, index, trigger)
supabase/migrations/0001_schema.sql

# 2. RLS Policies (WAJIB - keamanan data)
supabase/migrations/0002_policies.sql

# 3. Storage bucket private + policy storage
supabase/migrations/0003_storage.sql

# 4. Seed data (compliance domains, requirements, rules)
supabase/seed.sql
```

Atau dengan Supabase CLI:

```bash
npx supabase db push
```

### 4. Setup Storage bucket

File `0003_storage.sql` sudah membuat bucket `documents` dengan:
- `public = false` (PRIVATE — jangan ubah!)
- Maksimal 10MB per file
- Hanya MIME type dokumen yang diizinkan

Verifikasi di **Dashboard → Storage**: bucket `documents` harus **tidak
berlogo "Public"**.

### 5. Jalankan development server

```bash
npm run dev
```

Buka `http://localhost:5173`.

---

## Setup Roles: Admin & Consultant Pertama

### Buat Admin Platform pertama

1. Daftar akun biasa lewat aplikasi (mis. `admin@reguflow.test`).
2. Dapatkan user ID:
   ```sql
   select id, email from auth.users;
   ```
3. Jalankan SQL (ganti `<ADMIN_USER_ID>`):
   ```sql
   insert into public.organizations (id, name, type, created_by)
   values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ReguFlow Platform', 'platform', '<ADMIN_USER_ID>')
   on conflict (id) do nothing;

   insert into public.organization_members (organization_id, user_id, role, status)
   values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '<ADMIN_USER_ID>', 'admin', 'active')
   on conflict (organization_id, user_id) do nothing;

   update public.profiles set default_role = 'admin' where id = '<ADMIN_USER_ID>';
   ```
4. Logout lalu login kembali. Menu **Admin** akan muncul di sidebar.

### Buat user Consultant

```sql
insert into public.organizations (name, type, created_by)
values ('Konsultan Sejahtera', 'consultant_agency', '<CONSULTANT_USER_ID>');

insert into public.organization_members (organization_id, user_id, role, status)
values ('<org_id_baru>', '<CONSULTANT_USER_ID>', 'consultant', 'active');

update public.profiles set default_role = 'consultant' where id = '<CONSULTANT_USER_ID>';
```

---

## Build & Preview

```bash
npm run build      # typecheck + production build
npm run preview    # preview build hasil
npm run typecheck  # cek TypeScript tanpa build
npm audit          # cek dependency security
```

---

## Struktur Project

```
reguflow/
├── src/
│   ├── app/                    # App entry & router (lazy loading)
│   │   ├── App.tsx
│   │   └── router.tsx
│   ├── components/
│   │   ├── ui/                 # Button, Card, Input, Modal, Toast, dll
│   │   ├── layout/             # PublicLayout, DashboardLayout, guards
│   │   ├── common/             # CommentSection
│   │   └── compliance/         # ComplianceJourney
│   ├── features/               # (opsional - feature modules)
│   ├── hooks/                  # use-queries, use-scanner, use-document-vault
│   ├── lib/
│   │   ├── supabase/           # client, auth-store
│   │   ├── validation/         # Zod schemas (pesan Bahasa Indonesia)
│   │   ├── security/           # sanitasi, file validation, audit, guards
│   │   ├── compliance/         # scanner engine
│   │   ├── constants/          # label, opsi form, navigation
│   │   └── utils/              # cn, format tanggal, dll
│   ├── pages/
│   │   ├── public/             # landing, cek-kesiapan, tentang, harga, privasi
│   │   ├── auth/               # login, register, verify-email
│   │   ├── dashboard/          # UMKM app pages
│   │   ├── consultant/         # consultant panel
│   │   └── admin/              # admin panel
│   ├── types/                  # TypeScript types (database rows & domain)
│   └── styles/                 # Tailwind
├── supabase/
│   ├── migrations/
│   │   ├── 0001_schema.sql     # semua tabel + index + trigger
│   │   ├── 0002_policies.sql   # RLS policies (WAJIB)
│   │   └── 0003_storage.sql    # bucket private + storage policies
│   └── seed.sql                # compliance domains, requirements, rules
├── .env.example
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

---

## Fitur MVP

- ✅ Landing page (hero, problem, solusi, fitur, cara kerja, pricing, disclaimer)
- ✅ Cek kesiapan gratis (public, insert-only via RLS)
- ✅ Register / Login / Logout (Supabase Auth)
- ✅ Protected routes + role-based access (owner, staff, consultant, admin, viewer)
- ✅ Dashboard UMKM (skor kesiapan, dokumen kurang, task mendesak, rekomendasi)
- ✅ Onboarding wizard 4 langkah (simpan draft)
- ✅ Profil usaha CRUD
- ✅ Produk CRUD + detail multi-tab (ringkasan, bahan, dokumen, checklist, komentar)
- ✅ Compliance scanner (rule engine sederhana, skor 0-100)
- ✅ Compliance case otomatis + checklist dinamis
- ✅ Document vault (upload private, filter, search, preview/download signed URL)
- ✅ Task CRUD (prioritas, jatuh tempo, status)
- ✅ Reminder (dokumen kadaluarsa + task jatuh tempo, in-app)
- ✅ Pendamping/konsultan (request engagement, riwayat)
- ✅ Consultant dashboard + client list + client detail
- ✅ Admin dashboard (stats, users, businesses, rules, templates, documents, reports)
- ✅ Audit log (login, upload, view, delete, status update, dll)
- ✅ Security hardening (lihat di bawah)

### Aplikasi TIDAK melakukan:
- ❌ Submit resmi ke OSS / SIHALAL / BPOM / DJP
- ❌ Menggantikan portal pemerintah
- ❌ Menggantikan konsultan hukum / pajak

---

## Compliance Scanner

Scanner (`src/lib/compliance/scanner.ts`) membaca:
- Data usaha (NIB, skala, lokasi)
- Data produk (makanan/minuman, kosmetik, bahan hewani, dll)
- Dokumen yang sudah diupload
- Jawaban assessment publik

Output:
- **Skor 0-100** dengan bobot: NIB (15), data usaha (10), produk (10), daftar
  bahan (15), supplier (10), foto produk (10), alur produksi (10), Manual SJPH
  (15), SOP kebersihan (5)
- **Status**: 0-30 Belum Siap · 31-60 Perlu Dilengkapi · 61-80 Hampir Siap ·
  81-100 Siap Direview
- Dokumen yang kurang, rekomendasi, compliance case yang disarankan

---

## Security Checklist — Yang Sudah Diterapkan

### Auth & Authorization
- ✅ Supabase Auth (tidak ada password manual di database)
- ✅ Protected route untuk semua halaman dashboard
- ✅ Role-based route protection (`RequireAuth`, `RequireAdmin`, `RequireConsultant`)
- ✅ Cek role di **frontend DAN database (RLS)** — never trust client
- ✅ Auto-create profile via trigger saat user register

### Database (RLS)
- ✅ RLS aktif di **semua** tabel user-owned
- ✅ User hanya bisa akses data organization miliknya
- ✅ Konsultan hanya bisa akses klien dengan engagement aktif
- ✅ Admin platform bisa akses semua data
- ✅ Assessment publik: **insert-only**, tidak bisa read (anon)
- ✅ Policy insert/update/delete dengan `with check` untuk mencegah horizontal privilege escalation
- ✅ Foreign key constraints + indexes di kolom filter/search

### Storage
- ✅ Bucket `documents` **private** (`public = false`)
- ✅ Tidak ada public URL untuk dokumen sensitif
- ✅ Preview/download **hanya** via signed URL (berlaku 60 detik)
- ✅ Validasi file: ukuran maks 10MB, MIME type allowlist, extension allowlist
- ✅ Tolak executable (exe, sh, bat, js, html, php, py, jar, zip, dll)
- ✅ Sanitasi nama file & path storage berbentuk `documents/<org_id>/<doc_id>/<filename>`
- ✅ Storage policy memverifikasi org_id di path folder (RLS storage)

### Application Security
- ✅ Validasi semua form dengan Zod (pesan Bahasa Indonesia)
- ✅ Escape output user-generated content (React default + `escapeHtml` util)
- ✅ Tidak menggunakan `dangerouslySetInnerHTML`
- ✅ Deteksi pola berbahaya (XSS, path traversal) di input
- ✅ Sanitasi input text (kontrol karakter, panjang)
- ✅ IDOR protection via RLS + validasi ownership
- ✅ Error message aman (tidak membocorkan stack trace ke user)
- ✅ Validasi route params UUID (`validateUuidParam`)
- ✅ Loading / empty / error state di semua halaman
- ✅ Service role key TIDAK PERNAH di frontend

### Audit Log
Mencatat: `user_login`, `user_logout`, `document_uploaded`, `document_viewed`,
`document_downloaded`, `document_deleted`, `compliance_status_updated`,
`checklist_updated`, `task_created`, `role_changed`, `member_invited`,
`profile_updated`, `business_updated`, `scanner_run`

---

## Production Checklist

Sebelum deploy ke production, pastikan:

- [ ] **RLS aktif** — verifikasi dengan query test sebagai user berbeda
- [ ] **Bucket `documents` private** — cek di Dashboard → Storage
- [ ] Semua **environment variables** benar (hanya anon key di frontend)
- [ ] **Service role key** hanya di server environment, TIDAK di frontend
- [ ] Aktifkan **email verification** di Supabase Auth (jika perlu)
- [ ] Setup **backup database** (Supabase automated backups / PITR)
- [ ] Setup **error monitoring** (mis. Sentry)
- [ ] Setup **rate limiting** jika menambah backend custom
- [ ] Setup **security headers** di hosting/CDN:
  - `Content-Security-Policy`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy`
- [ ] Jalankan `npm audit` dan fix vulnerability
- [ ] Test akses antar role (owner tidak bisa lihat org lain, konsultan hanya
      klien aktifnya, viewer tidak bisa edit)
- [ ] Review dependency — hanya package stabil & terpercaya
- [ ] Pastikan tidak ada secret di repo (`.env` di `.gitignore`)
- [ ] Aktifkan **soft delete** untuk data penting (dokumen sudah soft-delete
      via `deleted_at`)
- [ ] Test alur upload → preview → download → delete dokumen

### Contoh security headers (nginx / vercel.json / _headers)

```
Content-Security-Policy: default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https://*.supabase.co;
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## Deployment

### Vercel / Netlify / Cloudflare Pages

1. Build command: `npm run build`
2. Output directory: `dist`
3. Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
4. Tambahkan security headers di config hosting (lihat di atas)

### Catatan penting
- Pastikan **SPA fallback** aktif (redirect semua route ke `index.html`) karena
  menggunakan React Router
- Gunakan HTTPS (Supabase Auth memerlukan HTTPS di production)

---

## Performance

- Lazy loading semua halaman dashboard/admin/consultant (code splitting)
- Manual chunks untuk react, supabase, query, form libraries
- Skeleton loading & TanStack Query caching (staleTime 30s)
- Debounced search
- Index database di kolom yang sering difilter
- Optimized build (target ES2020, no sourcemap di production)

---

## Development Notes

- Semua teks aplikasi dalam **Bahasa Indonesia**
- Pesan error formulir dalam Bahasa Indonesia
- Gunakan `npm run typecheck` sebelum commit untuk memastikan TypeScript aman
- Struktur database siap untuk fitur masa depan (email/WhatsApp reminder via
  kolom `channel` di tabel `reminders`)

## TODO (Pengembangan Selanjutnya)

- [ ] Pengiriman reminder via email/WhatsApp (struktur DB sudah siap)
- [ ] Manajemen supplier & bahan (tabel sudah ada)
- [ ] Versi dokumen (tabel `document_versions` sudah ada)
- [ ] Notifikasi real-time (tabel `notifications` sudah ada)
- [ ] Export laporan PDF
- [ ] Multi-business per organisasi

---

## Disclaimer

ReguFlow adalah alat bantu pengelolaan dokumen dan kesiapan kepatuhan. Keputusan
akhir dan pengajuan resmi tetap dilakukan melalui portal resmi pemerintah atau
pendamping/konsultan terkait.
