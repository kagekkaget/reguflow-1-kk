-- ============================================================================
-- ReguFlow - Row Level Security (RLS) Policies
-- ----------------------------------------------------------------------------
-- WAJIB dijalankan setelah 0001_schema.sql.
-- Prinsip: secure by default, least privilege, private by default.
--
-- Aturan akses:
--  1. User hanya bisa melihat data organization miliknya.
--  2. Owner bisa mengelola data organisasi.
--  3. Staff mengelola data sesuai role (write dibatasi owner/staff/admin).
--  4. Konsultan hanya bisa melihat data UMKM yang memiliki engagement aktif.
--  5. Admin platform bisa melihat semua data.
--  6. Public assessment: insert only, tidak bisa read.
-- ============================================================================

-- Aktifkan RLS di semua tabel user-owned
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.businesses enable row level security;
alter table public.products enable row level security;
alter table public.suppliers enable row level security;
alter table public.ingredients enable row level security;
alter table public.product_ingredients enable row level security;
alter table public.compliance_domains enable row level security;
alter table public.compliance_rules enable row level security;
alter table public.requirements enable row level security;
alter table public.compliance_cases enable row level security;
alter table public.checklist_items enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.tasks enable row level security;
alter table public.reminders enable row level security;
alter table public.consultant_engagements enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.assessments enable row level security;

-- ============================================================================
-- Reference data (read-only untuk semua user terautentikasi, tulis hanya admin)
-- ============================================================================
create policy "domains_select_authenticated"
  on public.compliance_domains for select
  to authenticated
  using (true);

create policy "rules_select_authenticated"
  on public.compliance_rules for select
  to authenticated
  using (is_active = true or public.is_platform_admin());

create policy "rules_write_admin"
  on public.compliance_rules for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "requirements_select_authenticated"
  on public.requirements for select
  to authenticated
  using (true);

create policy "requirements_write_admin"
  on public.requirements for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- ============================================================================
-- profiles (milik user sendiri)
-- ============================================================================
create policy "profiles_self_select"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_platform_admin());

create policy "profiles_self_update"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ============================================================================
-- organizations
-- ============================================================================
create policy "organizations_member_read"
  on public.organizations for select
  to authenticated
  using (
    id = any(public.current_user_org_ids())
    or id = any(public.consultant_client_org_ids())
    or public.is_platform_admin()
  );

create policy "organizations_owner_insert"
  on public.organizations for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "organizations_owner_update"
  on public.organizations for update
  to authenticated
  using (
    id = any(public.current_user_org_ids())
    and exists (
      select 1 from public.organization_members om
      where om.organization_id = id
        and om.user_id = auth.uid()
        and om.role in ('owner','admin')
    )
  )
  with check (
    id = any(public.current_user_org_ids())
    and exists (
      select 1 from public.organization_members om
      where om.organization_id = id
        and om.user_id = auth.uid()
        and om.role in ('owner','admin')
    )
  );

create policy "organizations_admin_delete"
  on public.organizations for delete
  to authenticated
  using (public.is_platform_admin());

-- ============================================================================
-- organization_members
-- ============================================================================
create policy "members_org_read"
  on public.organization_members for select
  to authenticated
  using (
    organization_id = any(public.current_user_org_ids())
    or organization_id = any(public.consultant_client_org_ids())
    or public.is_platform_admin()
  );

create policy "members_self_join"
  on public.organization_members for insert
  to authenticated
  with check (
    user_id = auth.uid()
    or (
      organization_id = any(public.current_user_org_ids())
      and exists (
        select 1 from public.organization_members om2
        where om2.organization_id = organization_id
          and om2.user_id = auth.uid()
          and om2.role in ('owner','admin')
      )
    )
    or public.is_platform_admin()
  );

create policy "members_owner_manage"
  on public.organization_members for update
  to authenticated
  using (
    organization_id = any(public.current_user_org_ids())
    and exists (
      select 1 from public.organization_members om2
      where om2.organization_id = organization_id
        and om2.user_id = auth.uid()
        and om2.role in ('owner','admin')
    )
  )
  with check (
    organization_id = any(public.current_user_org_ids())
    and exists (
      select 1 from public.organization_members om2
      where om2.organization_id = organization_id
        and om2.user_id = auth.uid()
        and om2.role in ('owner','admin')
    )
  );

create policy "members_owner_delete"
  on public.organization_members for delete
  to authenticated
  using (
    organization_id = any(public.current_user_org_ids())
    and exists (
      select 1 from public.organization_members om2
      where om2.organization_id = organization_id
        and om2.user_id = auth.uid()
        and om2.role in ('owner','admin')
    )
  );

-- ============================================================================
-- businesses (akses via organization)
-- ============================================================================
create policy "businesses_member_read"
  on public.businesses for select
  to authenticated
  using (
    organization_id = any(public.current_user_org_ids())
    or organization_id = any(public.consultant_client_org_ids())
    or public.is_platform_admin()
  );

create policy "businesses_member_write"
  on public.businesses for insert
  to authenticated
  with check (
    organization_id = any(public.current_user_org_ids())
    or public.is_platform_admin()
  );

create policy "businesses_member_update"
  on public.businesses for update
  to authenticated
  using (
    organization_id = any(public.current_user_org_ids())
    or organization_id = any(public.consultant_client_org_ids())
    or public.is_platform_admin()
  )
  with check (
    organization_id = any(public.current_user_org_ids())
    or public.is_platform_admin()
  );

create policy "businesses_admin_delete"
  on public.businesses for delete
  to authenticated
  using (public.is_platform_admin());

-- ============================================================================
-- products / suppliers / ingredients / product_ingredients
-- (akses via business -> organization)
-- ============================================================================
create policy "products_member_read"
  on public.products for select
  to authenticated
  using (
    business_id in (
      select b.id from public.businesses b
      where b.organization_id = any(public.current_user_org_ids())
         or b.organization_id = any(public.consultant_client_org_ids())
         or public.is_platform_admin()
    )
  );

create policy "products_member_write"
  on public.products for insert
  to authenticated
  with check (
    business_id in (
      select b.id from public.businesses b
      where b.organization_id = any(public.current_user_org_ids())
         or public.is_platform_admin()
    )
  );

create policy "products_member_update"
  on public.products for update
  to authenticated
  using (
    business_id in (
      select b.id from public.businesses b
      where b.organization_id = any(public.current_user_org_ids())
         or b.organization_id = any(public.consultant_client_org_ids())
         or public.is_platform_admin()
    )
  )
  with check (
    business_id in (
      select b.id from public.businesses b
      where b.organization_id = any(public.current_user_org_ids())
         or public.is_platform_admin()
    )
  );

create policy "products_member_delete"
  on public.products for delete
  to authenticated
  using (
    business_id in (
      select b.id from public.businesses b
      where b.organization_id = any(public.current_user_org_ids())
         or public.is_platform_admin()
    )
  );

create policy "suppliers_member_read"
  on public.suppliers for select
  to authenticated
  using (
    business_id in (
      select b.id from public.businesses b
      where b.organization_id = any(public.current_user_org_ids())
         or b.organization_id = any(public.consultant_client_org_ids())
         or public.is_platform_admin()
    )
  );

create policy "suppliers_member_write"
  on public.suppliers for insert
  to authenticated
  with check (
    business_id in (
      select b.id from public.businesses b
      where b.organization_id = any(public.current_user_org_ids())
         or public.is_platform_admin()
    )
  );

create policy "suppliers_member_update"
  on public.suppliers for update
  to authenticated
  using (
    business_id in (
      select b.id from public.businesses b
      where b.organization_id = any(public.current_user_org_ids())
         or b.organization_id = any(public.consultant_client_org_ids())
         or public.is_platform_admin()
    )
  )
  with check (
    business_id in (
      select b.id from public.businesses b
      where b.organization_id = any(public.current_user_org_ids())
         or public.is_platform_admin()
    )
  );

create policy "suppliers_member_delete"
  on public.suppliers for delete
  to authenticated
  using (
    business_id in (
      select b.id from public.businesses b
      where b.organization_id = any(public.current_user_org_ids())
         or public.is_platform_admin()
    )
  );

create policy "ingredients_member_read"
  on public.ingredients for select
  to authenticated
  using (
    business_id in (
      select b.id from public.businesses b
      where b.organization_id = any(public.current_user_org_ids())
         or b.organization_id = any(public.consultant_client_org_ids())
         or public.is_platform_admin()
    )
  );

create policy "ingredients_member_write"
  on public.ingredients for insert
  to authenticated
  with check (
    business_id in (
      select b.id from public.businesses b
      where b.organization_id = any(public.current_user_org_ids())
         or public.is_platform_admin()
    )
  );

create policy "ingredients_member_update"
  on public.ingredients for update
  to authenticated
  using (
    business_id in (
      select b.id from public.businesses b
      where b.organization_id = any(public.current_user_org_ids())
         or b.organization_id = any(public.consultant_client_org_ids())
         or public.is_platform_admin()
    )
  )
  with check (
    business_id in (
      select b.id from public.businesses b
      where b.organization_id = any(public.current_user_org_ids())
         or public.is_platform_admin()
    )
  );

create policy "ingredients_member_delete"
  on public.ingredients for delete
  to authenticated
  using (
    business_id in (
      select b.id from public.businesses b
      where b.organization_id = any(public.current_user_org_ids())
         or public.is_platform_admin()
    )
  );

create policy "product_ingredients_member_read"
  on public.product_ingredients for select
  to authenticated
  using (
    product_id in (
      select p.id from public.products p
      join public.businesses b on b.id = p.business_id
      where b.organization_id = any(public.current_user_org_ids())
         or b.organization_id = any(public.consultant_client_org_ids())
         or public.is_platform_admin()
    )
  );

create policy "product_ingredients_member_write"
  on public.product_ingredients for insert
  to authenticated
  with check (
    product_id in (
      select p.id from public.products p
      join public.businesses b on b.id = p.business_id
      where b.organization_id = any(public.current_user_org_ids())
         or public.is_platform_admin()
    )
  );

create policy "product_ingredients_member_update"
  on public.product_ingredients for update
  to authenticated
  using (
    product_id in (
      select p.id from public.products p
      join public.businesses b on b.id = p.business_id
      where b.organization_id = any(public.current_user_org_ids())
         or b.organization_id = any(public.consultant_client_org_ids())
         or public.is_platform_admin()
    )
  )
  with check (
    product_id in (
      select p.id from public.products p
      join public.businesses b on b.id = p.business_id
      where b.organization_id = any(public.current_user_org_ids())
         or public.is_platform_admin()
    )
  );

create policy "product_ingredients_member_delete"
  on public.product_ingredients for delete
  to authenticated
  using (
    product_id in (
      select p.id from public.products p
      join public.businesses b on b.id = p.business_id
      where b.organization_id = any(public.current_user_org_ids())
         or public.is_platform_admin()
    )
  );

-- ============================================================================
-- compliance_cases & checklist_items
-- ============================================================================
create policy "cases_member_read"
  on public.compliance_cases for select
  to authenticated
  using (
    business_id in (
      select b.id from public.businesses b
      where b.organization_id = any(public.current_user_org_ids())
         or b.organization_id = any(public.consultant_client_org_ids())
         or public.is_platform_admin()
    )
  );

create policy "cases_member_write"
  on public.compliance_cases for insert
  to authenticated
  with check (
    business_id in (
      select b.id from public.businesses b
      where b.organization_id = any(public.current_user_org_ids())
         or public.is_platform_admin()
    )
  );

create policy "cases_member_update"
  on public.compliance_cases for update
  to authenticated
  using (
    business_id in (
      select b.id from public.businesses b
      where b.organization_id = any(public.current_user_org_ids())
         or b.organization_id = any(public.consultant_client_org_ids())
         or public.is_platform_admin()
    )
  )
  with check (
    business_id in (
      select b.id from public.businesses b
      where b.organization_id = any(public.current_user_org_ids())
         or public.is_platform_admin()
    )
  );

create policy "cases_member_delete"
  on public.compliance_cases for delete
  to authenticated
  using (
    business_id in (
      select b.id from public.businesses b
      where b.organization_id = any(public.current_user_org_ids())
         or public.is_platform_admin()
    )
  );

create policy "checklist_member_read"
  on public.checklist_items for select
  to authenticated
  using (
    compliance_case_id in (
      select cc.id from public.compliance_cases cc
      join public.businesses b on b.id = cc.business_id
      where b.organization_id = any(public.current_user_org_ids())
         or b.organization_id = any(public.consultant_client_org_ids())
         or public.is_platform_admin()
    )
  );

create policy "checklist_member_write"
  on public.checklist_items for insert
  to authenticated
  with check (
    compliance_case_id in (
      select cc.id from public.compliance_cases cc
      join public.businesses b on b.id = cc.business_id
      where b.organization_id = any(public.current_user_org_ids())
         or public.is_platform_admin()
    )
  );

create policy "checklist_member_update"
  on public.checklist_items for update
  to authenticated
  using (
    compliance_case_id in (
      select cc.id from public.compliance_cases cc
      join public.businesses b on b.id = cc.business_id
      where b.organization_id = any(public.current_user_org_ids())
         or b.organization_id = any(public.consultant_client_org_ids())
         or public.is_platform_admin()
    )
  )
  with check (
    compliance_case_id in (
      select cc.id from public.compliance_cases cc
      join public.businesses b on b.id = cc.business_id
      where b.organization_id = any(public.current_user_org_ids())
         or public.is_platform_admin()
    )
  );

create policy "checklist_member_delete"
  on public.checklist_items for delete
  to authenticated
  using (
    compliance_case_id in (
      select cc.id from public.compliance_cases cc
      join public.businesses b on b.id = cc.business_id
      where b.organization_id = any(public.current_user_org_ids())
         or public.is_platform_admin()
    )
  );

-- ============================================================================
-- documents (metadata) - private, hanya anggota org / konsultan aktif / admin
-- ============================================================================
create policy "documents_member_read"
  on public.documents for select
  to authenticated
  using (
    deleted_at is null
    and (
      organization_id = any(public.current_user_org_ids())
      or organization_id = any(public.consultant_client_org_ids())
      or public.is_platform_admin()
    )
  );

create policy "documents_member_insert"
  on public.documents for insert
  to authenticated
  with check (
    organization_id = any(public.current_user_org_ids())
    and uploaded_by = auth.uid()
  );

create policy "documents_member_update"
  on public.documents for update
  to authenticated
  using (
    organization_id = any(public.current_user_org_ids())
    or organization_id = any(public.consultant_client_org_ids())
    or public.is_platform_admin()
  )
  with check (
    organization_id = any(public.current_user_org_ids())
    or public.is_platform_admin()
  );

create policy "documents_member_delete"
  on public.documents for delete
  to authenticated
  using (
    organization_id = any(public.current_user_org_ids())
    or public.is_platform_admin()
  );

-- document_versions: read via document ownership
create policy "doc_versions_member_read"
  on public.document_versions for select
  to authenticated
  using (
    document_id in (
      select d.id from public.documents d
      where d.deleted_at is null
        and (
          d.organization_id = any(public.current_user_org_ids())
          or d.organization_id = any(public.consultant_client_org_ids())
          or public.is_platform_admin()
        )
    )
  );

create policy "doc_versions_member_insert"
  on public.document_versions for insert
  to authenticated
  with check (
    document_id in (
      select d.id from public.documents d
      where d.organization_id = any(public.current_user_org_ids())
    )
  );

-- ============================================================================
-- tasks
-- ============================================================================
create policy "tasks_member_read"
  on public.tasks for select
  to authenticated
  using (
    organization_id = any(public.current_user_org_ids())
    or organization_id = any(public.consultant_client_org_ids())
    or public.is_platform_admin()
  );

create policy "tasks_member_write"
  on public.tasks for insert
  to authenticated
  with check (
    organization_id = any(public.current_user_org_ids())
    and created_by = auth.uid()
  );

create policy "tasks_member_update"
  on public.tasks for update
  to authenticated
  using (
    organization_id = any(public.current_user_org_ids())
    or organization_id = any(public.consultant_client_org_ids())
    or public.is_platform_admin()
  )
  with check (
    organization_id = any(public.current_user_org_ids())
    or public.is_platform_admin()
  );

create policy "tasks_member_delete"
  on public.tasks for delete
  to authenticated
  using (
    organization_id = any(public.current_user_org_ids())
    or public.is_platform_admin()
  );

-- ============================================================================
-- reminders
-- ============================================================================
create policy "reminders_member_read"
  on public.reminders for select
  to authenticated
  using (
    organization_id = any(public.current_user_org_ids())
    or organization_id = any(public.consultant_client_org_ids())
    or public.is_platform_admin()
  );

create policy "reminders_member_write"
  on public.reminders for insert
  to authenticated
  with check (
    organization_id = any(public.current_user_org_ids())
    or public.is_platform_admin()
  );

create policy "reminders_member_update"
  on public.reminders for update
  to authenticated
  using (
    organization_id = any(public.current_user_org_ids())
    or public.is_platform_admin()
  )
  with check (
    organization_id = any(public.current_user_org_ids())
    or public.is_platform_admin()
  );

create policy "reminders_member_delete"
  on public.reminders for delete
  to authenticated
  using (
    organization_id = any(public.current_user_org_ids())
    or public.is_platform_admin()
  );

-- ============================================================================
-- consultant_engagements
-- ============================================================================
create policy "engagements_both_sides_read"
  on public.consultant_engagements for select
  to authenticated
  using (
    business_organization_id = any(public.current_user_org_ids())
    or consultant_organization_id = any(public.current_user_org_ids())
    or public.is_platform_admin()
  );

create policy "engagements_business_request"
  on public.consultant_engagements for insert
  to authenticated
  with check (
    business_organization_id = any(public.current_user_org_ids())
    or consultant_organization_id = any(public.current_user_org_ids())
    or public.is_platform_admin()
  );

create policy "engagements_both_sides_update"
  on public.consultant_engagements for update
  to authenticated
  using (
    business_organization_id = any(public.current_user_org_ids())
    or consultant_organization_id = any(public.current_user_org_ids())
    or public.is_platform_admin()
  )
  with check (
    business_organization_id = any(public.current_user_org_ids())
    or consultant_organization_id = any(public.current_user_org_ids())
    or public.is_platform_admin()
  );

create policy "engagements_admin_delete"
  on public.consultant_engagements for delete
  to authenticated
  using (public.is_platform_admin());

-- ============================================================================
-- comments
-- ============================================================================
create policy "comments_member_read"
  on public.comments for select
  to authenticated
  using (
    organization_id = any(public.current_user_org_ids())
    or organization_id = any(public.consultant_client_org_ids())
    or public.is_platform_admin()
  );

create policy "comments_member_insert"
  on public.comments for insert
  to authenticated
  with check (
    organization_id = any(public.current_user_org_ids())
    and created_by = auth.uid()
  );

create policy "comments_author_delete"
  on public.comments for delete
  to authenticated
  using (created_by = auth.uid() or public.is_platform_admin());

-- ============================================================================
-- notifications (milik user sendiri)
-- ============================================================================
create policy "notifications_self_read"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "notifications_self_update"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notifications_self_delete"
  on public.notifications for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================================
-- audit_logs (write-only untuk user, read hanya admin)
-- ============================================================================
create policy "audit_logs_insert_self"
  on public.audit_logs for insert
  to authenticated
  with check (actor_id = auth.uid() or actor_id is null);

create policy "audit_logs_admin_read"
  on public.audit_logs for select
  to authenticated
  using (public.is_platform_admin());

-- ============================================================================
-- assessments (PUBLIC: insert only, tidak ada read untuk anon/public)
-- ============================================================================
create policy "assessments_public_insert"
  on public.assessments for insert
  to anon, authenticated
  with check (true);

-- Tidak ada policy SELECT anon publik. Hanya admin yang bisa membaca.
create policy "assessments_admin_read"
  on public.assessments for select
  to authenticated
  using (public.is_platform_admin());

-- ============================================================================
-- STORAGE: bucket dokumen PRIVATE + policy akses berbasis org
-- Jalankan juga storage.sql
-- ============================================================================
