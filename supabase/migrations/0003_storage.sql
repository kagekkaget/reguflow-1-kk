-- ============================================================================
-- ReguFlow - Storage setup: bucket DOKUMEN WAJIB PRIVATE
-- ----------------------------------------------------------------------------
-- Jalankan setelah 0001_schema.sql dan 0002_policies.sql.
--
-- Aturan keamanan storage:
-- - Bucket "documents" TIDAK public (public = false).
-- - Tidak ada public URL untuk dokumen sensitif.
-- - Akses baca/tulis via signed URL yang dibuat setelah RLS metadata dokumen lolos.
-- - Policy storage mengikuti aturan organisasi yang sama dengan tabel documents.
-- ============================================================================

-- 1. Buat bucket private "documents"
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,                    -- PRIVATE. JANGAN ubah ke true.
  10485760,                 -- 10 MB maksimal per file
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2. Helper: path dokumen berbentuk documents/<org_id>/<doc_id>/<filename>
--    Policy memastikan user hanya bisa akses path milik organisation-nya.

-- READ: anggota org, konsultan aktif untuk org klien, atau admin platform
create policy "storage_documents_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documents'
    and (
      (storage.foldername(name))[1] = any(public.current_user_org_ids()::text[])
      or (storage.foldername(name))[1] = any(public.consultant_client_org_ids()::text[])
      or public.is_platform_admin()
    )
  );

-- WRITE (upload/update): anggota org sendiri
create policy "storage_documents_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = any(public.current_user_org_ids()::text[])
  );

create policy "storage_documents_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = any(public.current_user_org_ids()::text[])
  )
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = any(public.current_user_org_ids()::text[])
  );

-- DELETE: admin platform saja (dokumen dihapus via metadata soft-delete + purge terpisah)
create policy "storage_documents_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and public.is_platform_admin()
  );
