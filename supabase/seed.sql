-- ============================================================================
-- ReguFlow - Seed Data
-- ----------------------------------------------------------------------------
-- Jalankan setelah migration schema + policies.
-- Berisi: compliance_domains, requirements dasar, rules contoh, dan data
-- dummy (usaha, produk, checklist, task, dokumen metadata TANPA file asli).
-- ============================================================================

-- ============================================================================
-- compliance_domains
-- ============================================================================
insert into public.compliance_domains (code, name, description) values
  ('nib', 'NIB (Nomor Induk Berusaha)', 'Identitas usaha wajib dari OSS. Dasar semua proses compliance UMKM.'),
  ('halal', 'Sertifikasi Halal (SIHALAL)', 'Sertifikasi halal produk melalui portal resmi SIHALAL/BPJPH.'),
  ('spp_irt', 'SPP-IRT (Pangan Rumah Tangga)', 'Registrasi pangan skala rumah tangga untuk usaha mikro kecil.'),
  ('bpom', 'Registrasi BPOM', 'Registrasi produk kosmetik/obat/suplemen melalui BPOM.'),
  ('pajak', 'Pajak Usaha', 'NPWP, e-Faktur, dan kewajiban pajak usaha (DJP).'),
  ('merek', 'Merek Dagang', 'Pendaftaran merek ke Dirjen KI (HKI).'),
  ('labeling', 'Label Produk', 'Label kemasan sesuai aturan pangan/kosmetik (informasi gizi, expired, produsen).'),
  ('dokumen_usaha', 'Dokumen Usaha Dasar', 'KTP pemilik, NPWP, NIB, dan dokumen identitas usaha lainnya.')
on conflict (code) do nothing;

-- ============================================================================
-- compliance_rules (contoh rule engine)
-- ============================================================================
insert into public.compliance_rules (domain_id, code, title, description, condition_json, action_json, priority, is_active) values
  (
    (select id from public.compliance_domains where code = 'nib'),
    'RUL-NIB-001',
    'Usaha belum memiliki NIB',
    'Semua usaha wajib memiliki NIB sebagai identitas usaha.',
    '{"field": "business.nib", "op": "empty"}'::jsonb,
    '{"case": "nib", "missing_document": "NIB", "recommendation": "Lengkapi atau upload NIB terlebih dahulu. NIB diterbitkan gratis melalui OSS."}'::jsonb,
    90, true
  ),
  (
    (select id from public.compliance_domains where code = 'halal'),
    'RUL-HALAL-001',
    'Produk makanan/minuman butuh sertifikasi halal',
    'Produk makanan dan minuman disarankan memiliki sertifikasi halal melalui SIHALAL.',
    '{"field": "product.is_food_or_beverage", "op": "eq", "value": true}'::jsonb,
    '{"case": "halal"}'::jsonb,
    80, true
  ),
  (
    (select id from public.compliance_domains where code = 'spp_irt'),
    'RUL-SPP-001',
    'Pangan rumah tangga butuh SPP-IRT',
    'Usaha pangan skala rumah tangga (mikro) perlu registrasi SPP-IRT.',
    '{"field": "product.is_food_or_beverage", "op": "eq", "value": true, "and": {"field": "business.business_scale", "op": "in", "value": ["mikro","kecil"]}}'::jsonb,
    '{"case": "spp_irt"}'::jsonb,
    75, true
  ),
  (
    (select id from public.compliance_domains where code = 'labeling'),
    'RUL-LBL-001',
    'Produk belum memiliki label kemasan',
    'Label kemasan wajib berisi nama produk, komposisi, expired, dan identitas produsen.',
    '{"field": "answers.has_product_label", "op": "eq", "value": false}'::jsonb,
    '{"case": "labeling", "missing_document": "Label produk"}'::jsonb,
    60, true
  )
on conflict (code) do nothing;

-- ============================================================================
-- requirements - HALAL
-- ============================================================================
insert into public.requirements (domain_code, name, description, required_document_type, is_mandatory, sort_order) values
  ('halal', 'NIB tersedia', 'Usaha sudah memiliki NIB aktif.', 'NIB', true, 1),
  ('halal', 'Data pelaku usaha lengkap', 'Nama legal, alamat produksi, dan kontak usaha terisi.', null, true, 2),
  ('halal', 'Nama dan foto produk', 'Setiap produk memiliki nama jelas dan foto kemasan.', 'Foto produk', true, 3),
  ('halal', 'Daftar bahan (ingredient list)', 'Semua bahan tercatat lengkap beserta takaran.', 'Daftar bahan', true, 4),
  ('halal', 'Data supplier bahan', 'Supplier bahan baku tercatat lengkap.', 'Data supplier', true, 5),
  ('halal', 'Bukti kehalalan bahan', 'Sertifikat halal atau keterangan kehalalan setiap bahan.', 'Sertifikat halal', true, 6),
  ('halal', 'Alur proses produksi', 'Alur produksi dari bahan hingga kemasan tergambar.', 'SOP produksi', true, 7),
  ('halal', 'Penyelia halal (internal)', 'Minimal satu penyelia halal internal ditunjuk.', null, false, 8),
  ('halal', 'Manual SJPH', 'Manual Sistem Jaminan Produk Halal tersedia.', 'Manual SJPH', true, 9),
  ('halal', 'Review pendamping', 'Pendamping/konsultan sudah mereview kelengkapan.', null, false, 10),
  ('halal', 'Siap submit ke portal resmi', 'Semua dokumen siap untuk pengajuan resmi.', null, false, 11)
on conflict do nothing;

-- requirements - NIB
insert into public.requirements (domain_code, name, description, required_document_type, is_mandatory, sort_order) values
  ('nib', 'KTP pemilik usaha', 'Scan KTP pemilik usaha untuk proses OSS.', 'KTP owner', true, 1),
  ('nib', 'Tempat usaha jelas', 'Alamat tempat usaha/produksi tercatat.', null, true, 2),
  ('nib', 'Bentuk usaha ditentukan', 'Bentuk badan usaha sudah ditetapkan (perorangan/PT/CV).', null, true, 3),
  ('nib', 'KBLI dipilih', 'Kode KBLI utama sudah dipilih.', null, true, 4),
  ('nib', 'NIB diterbitkan', 'NIB sudah terbit dari OSS.', 'NIB', true, 5)
on conflict do nothing;

-- requirements - SPP-IRT
insert into public.requirements (domain_code, name, description, required_document_type, is_mandatory, sort_order) values
  ('spp_irt', 'NIB tersedia', 'SPP-IRT memerlukan NIB aktif.', 'NIB', true, 1),
  ('spp_irt', 'Produk pangan rumah tangga', 'Produk tercatat sebagai pangan rumah tangga.', null, true, 2),
  ('spp_irt', 'Sertifikat halal (jika ada)', 'Sertifikasi halal mempermudah proses SPP-IRT.', 'Sertifikat halal', false, 3),
  ('spp_irt', 'Label produk', 'Label kemasan sederhana sesuai aturan.', 'Label produk', true, 4),
  ('spp_irt', 'SOP kebersihan produksi', 'Dokumen SOP kebersihan dan higiene.', 'SOP kebersihan', true, 5)
on conflict do nothing;

-- requirements - LABELING
insert into public.requirements (domain_code, name, description, required_document_type, is_mandatory, sort_order) values
  ('labeling', 'Foto kemasan jelas', 'Foto kemasan produk terlihat jelas.', 'Foto produk', true, 1),
  ('labeling', 'Daftar bahan di label', 'Komposisi tertulis di label.', 'Daftar bahan', true, 2),
  ('labeling', 'Informasi produsen', 'Nama dan alamat produsen di label.', null, true, 3),
  ('labeling', 'Tanggal kadaluarsa', 'Tanggal expired tertera.', null, true, 4)
on conflict do nothing;

-- requirements - DOKUMEN USAHA
insert into public.requirements (domain_code, name, description, required_document_type, is_mandatory, sort_order) values
  ('dokumen_usaha', 'KTP pemilik', 'Identitas pemilik usaha.', 'KTP owner', true, 1),
  ('dokumen_usaha', 'NIB', 'Identitas usaha dari OSS.', 'NIB', true, 2),
  ('dokumen_usaha', 'NPWP (opsional)', 'Nomor pokok wajib pajak usaha.', 'NPWP', false, 3),
  ('dokumen_usaha', 'Foto usaha/produksi', 'Foto tempat usaha dan proses produksi.', 'Foto produk', false, 4)
on conflict do nothing;

-- ============================================================================
-- DUMMY DATA (contoh UMKM)
-- Dijalankan manual/opsional. Menggunakan auth.users id placeholder.
-- Ganti <OWNER_USER_ID> dengan UUID user yang sudah register.
-- ============================================================================
-- Contoh (tidak dijalankan otomatis - uncomment lalu ganti ID):

-- insert into public.organizations (id, name, type, created_by)
-- values ('11111111-1111-1111-1111-111111111111', 'Kue Bu Tina', 'business', '<OWNER_USER_ID>')
-- on conflict (id) do nothing;

-- insert into public.organization_members (organization_id, user_id, role, status)
-- values ('11111111-1111-1111-1111-111111111111', '<OWNER_USER_ID>', 'owner', 'active')
-- on conflict (organization_id, user_id) do nothing;

-- insert into public.businesses (id, organization_id, legal_name, brand_name, nib, entity_type, business_scale, employee_count, address, city, province, status)
-- values (
--   '22222222-2222-2222-2222-222222222222',
--   '11111111-1111-1111-1111-111111111111',
--   'Usaha Kue Bu Tina', 'Kue Bu Tina', '0123456789012', 'perorangan', 'mikro', 3,
--   'Jl. Mawar No. 12', 'Bandung', 'Jawa Barat', 'active'
-- ) on conflict (id) do nothing;

-- insert into public.products (business_id, name, category, description, is_food_or_beverage, packaging_type, sales_channel, status)
-- values (
--   '22222222-2222-2222-2222-222222222222',
--   'Kue Lapis Legit', 'Makanan', 'Kue lapis legit tradisional', true, 'Kotak', 'Online + Toko', 'active'
-- );

-- insert into public.compliance_cases (business_id, product_id, domain_code, title, status, score)
-- values (
--   '22222222-2222-2222-2222-222222222222',
--   (select id from public.products limit 1),
--   'halal', 'Sertifikasi Halal - Kue Lapis Legit', 'data_collected', 45
-- );

-- Contoh metadata dokumen (TANPA file asli - hanya demo struktur):
-- insert into public.documents (organization_id, business_id, uploaded_by, document_type, title, file_path, file_name, mime_type, file_size, expiry_date, verification_status)
-- values (
--   '11111111-1111-1111-1111-111111111111',
--   '22222222-2222-2222-2222-222222222222',
--   '<OWNER_USER_ID>',
--   'NIB', 'NIB Kue Bu Tina', 'documents/11111111-1111-1111-1111-111111111111/xxxx/nib.pdf',
--   'nib.pdf', 'application/pdf', 245000, null, 'valid'
-- );

-- ============================================================================
-- CARA MEMBUAT USER ADMIN PERTAMA
-- ----------------------------------------------------------------------------
-- 1. Register akun biasa melalui aplikasi (mis. admin@reguflow.test).
-- 2. Dapatkan user id dari Dashboard > Authentication > Users, atau:
--      select id, email from auth.users;
-- 3. Buat organization platform dan assign role admin:
--
--    insert into public.organizations (id, name, type, created_by)
--    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ReguFlow Platform', 'platform', '<ADMIN_USER_ID>')
--    on conflict (id) do nothing;
--
--    insert into public.organization_members (organization_id, user_id, role, status)
--    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '<ADMIN_USER_ID>', 'admin', 'active')
--    on conflict (organization_id, user_id) do nothing;
-- 4. Set default_role profile ke 'admin':
--      update public.profiles set default_role = 'admin' where id = '<ADMIN_USER_ID>';
-- 5. Logout lalu login kembali.
-- ============================================================================

-- ============================================================================
-- CARA MEMBUAT USER CONSULTANT
-- ----------------------------------------------------------------------------
-- 1. Register akun konsultan.
-- 2. Buat organization consultant_agency:
--      insert into public.organizations (name, type, created_by)
--      values ('Konsultan Sejahtera', 'consultant_agency', '<CONSULTANT_USER_ID>');
--      insert into public.organization_members (organization_id, user_id, role, status)
--      values (<org_id_baru>, '<CONSULTANT_USER_ID>', 'consultant', 'active');
-- 3. update public.profiles set default_role = 'consultant' where id = '<CONSULTANT_USER_ID>';
-- 4. Engagement dibuat dari /pendamping (status pending/active).
-- ============================================================================

-- ============================================================================
-- RESET (opsional, untuk development)
-- ----------------------------------------------------------------------------
-- delete from public.audit_logs;
-- delete from public.notifications;
-- delete from public.comments;
-- delete from public.reminders;
-- delete from public.tasks;
-- delete from public.checklist_items;
-- delete from public.compliance_cases;
-- delete from public.documents;
-- delete from public.document_versions;
-- delete from public.product_ingredients;
-- delete from public.ingredients;
-- delete from public.suppliers;
-- delete from public.products;
-- delete from public.businesses;
-- delete from public.organization_members;
-- delete from public.organizations;
-- =============================================================================
