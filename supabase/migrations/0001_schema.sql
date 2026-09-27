-- ============================================================================
-- ReguFlow - Database Schema (PostgreSQL / Supabase)
-- ----------------------------------------------------------------------------
-- Jalankan di Supabase SQL Editor (Dashboard > SQL Editor) atau via supabase CLI:
--   supabase db push
--
-- Catatan keamanan:
-- - Semua tabel menggunakan UUID primary key.
-- - RLS diaktifkan di policies.sql (jalankan setelah file ini).
-- - Tidak ada password/token yang disimpan di database ini.
-- ============================================================================

-- ============================================================================
-- ENUM / TYPES
-- ============================================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'organization_type') then
    create type organization_type as enum ('business', 'consultant_agency', 'government', 'platform');
  end if;
  if not exists (select 1 from pg_type where typname = 'member_role') then
    create type member_role as enum ('owner', 'staff', 'consultant', 'admin', 'viewer');
  end if;
  if not exists (select 1 from pg_type where typname = 'member_status') then
    create type member_status as enum ('active', 'invited', 'suspended', 'left');
  end if;
  if not exists (select 1 from pg_type where typname = 'document_status') then
    create type document_status as enum ('pending', 'valid', 'invalid', 'revision_needed', 'expired');
  end if;
  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type task_status as enum ('todo', 'in_progress', 'done', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'task_priority') then
    create type task_priority as enum ('low', 'medium', 'high', 'urgent');
  end if;
  if not exists (select 1 from pg_type where typname = 'case_status') then
    create type case_status as enum (
      'not_started', 'data_collected', 'internal_review', 'consultant_review',
      'ready_to_submit', 'submitted', 'revision', 'approved', 'expired'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'checklist_status') then
    create type checklist_status as enum ('todo', 'in_progress', 'done', 'blocked');
  end if;
  if not exists (select 1 from pg_type where typname = 'engagement_status') then
    create type engagement_status as enum ('pending', 'active', 'paused', 'ended', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'reminder_channel') then
    create type reminder_channel as enum ('in_app', 'email', 'whatsapp');
  end if;
  if not exists (select 1 from pg_type where typname = 'reminder_status') then
    create type reminder_status as enum ('pending', 'sent', 'failed', 'cancelled');
  end if;
end$$;

-- ============================================================================
-- updated_at helper
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- 1. profiles
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text default null,
  avatar_url text default null,
  default_role member_role not null default 'owner',
  onboarding_completed boolean not null default false,
  onboarding_step int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile saat user register (via trigger pada auth.users)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 2. organizations
-- ============================================================================
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type organization_type not null default 'business',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_organizations_type on public.organizations(type);

-- ============================================================================
-- 3. organization_members
-- ============================================================================
create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role member_role not null default 'staff',
  status member_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists idx_org_members_user on public.organization_members(user_id);
create index if not exists idx_org_members_org on public.organization_members(organization_id);

-- ============================================================================
-- 4. businesses
-- ============================================================================
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  legal_name text not null,
  brand_name text,
  nib text,
  npwp text,
  entity_type text default 'perorangan',
  business_scale text default 'mikro',
  annual_revenue numeric(18,2),
  employee_count int default 0,
  address text,
  province text,
  city text,
  postal_code text,
  kbli text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_businesses_org on public.businesses(organization_id);
create index if not exists idx_businesses_city on public.businesses(city);
create index if not exists idx_businesses_nib on public.businesses(nib);

-- ============================================================================
-- 5. products
-- ============================================================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  sku text,
  category text,
  subcategory text,
  description text,
  is_food_or_beverage boolean not null default true,
  is_cosmetic boolean not null default false,
  is_imported boolean not null default false,
  uses_animal_derived_material boolean not null default false,
  uses_alcohol_related_material boolean not null default false,
  simple_production_process boolean not null default true,
  packaging_type text,
  sales_channel text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_business on public.products(business_id);
create index if not exists idx_products_category on public.products(category);

-- ============================================================================
-- 6. suppliers
-- ============================================================================
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  contact_name text,
  phone text,
  address text,
  nib text,
  has_halal_certificate boolean not null default false,
  halal_certificate_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_suppliers_business on public.suppliers(business_id);

-- ============================================================================
-- 7. ingredients
-- ============================================================================
create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  name text not null,
  ingredient_type text default 'bahan_baku',
  halal_status text default 'unknown',
  halal_certificate_number text,
  expiry_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ingredients_business on public.ingredients(business_id);
create index if not exists idx_ingredients_supplier on public.ingredients(supplier_id);

-- ============================================================================
-- 8. product_ingredients
-- ============================================================================
create table if not exists public.product_ingredients (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  quantity numeric(12,3),
  unit text,
  created_at timestamptz not null default now(),
  unique (product_id, ingredient_id)
);

create index if not exists idx_prod_ingredients_product on public.product_ingredients(product_id);
create index if not exists idx_prod_ingredients_ingredient on public.product_ingredients(ingredient_id);

-- ============================================================================
-- 9. compliance_domains
-- ============================================================================
create table if not exists public.compliance_domains (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 10. compliance_rules
-- ============================================================================
create table if not exists public.compliance_rules (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid references public.compliance_domains(id) on delete cascade,
  code text not null unique,
  title text not null,
  description text,
  condition_json jsonb not null default '{}'::jsonb,
  action_json jsonb not null default '{}'::jsonb,
  priority int not null default 50,
  effective_from date not null default current_date,
  effective_until date,
  version int not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_rules_domain on public.compliance_rules(domain_id);
create index if not exists idx_rules_active on public.compliance_rules(is_active);

-- ============================================================================
-- 11. requirements
-- ============================================================================
create table if not exists public.requirements (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid references public.compliance_rules(id) on delete cascade,
  domain_code text not null,
  name text not null,
  description text,
  required_document_type text,
  is_mandatory boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_requirements_domain on public.requirements(domain_code);

-- ============================================================================
-- 12. compliance_cases
-- ============================================================================
create table if not exists public.compliance_cases (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  domain_code text not null,
  pathway text,
  title text not null,
  status case_status not null default 'not_started',
  score int not null default 0,
  due_date date,
  assigned_consultant_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cases_business on public.compliance_cases(business_id);
create index if not exists idx_cases_product on public.compliance_cases(product_id);
create index if not exists idx_cases_domain on public.compliance_cases(domain_code);
create index if not exists idx_cases_status on public.compliance_cases(status);
create index if not exists idx_cases_consultant on public.compliance_cases(assigned_consultant_id);

-- ============================================================================
-- 13. checklist_items
-- ============================================================================
create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  compliance_case_id uuid not null references public.compliance_cases(id) on delete cascade,
  requirement_id uuid references public.requirements(id) on delete set null,
  title text not null,
  description text,
  status checklist_status not null default 'todo',
  assigned_to uuid references auth.users(id) on delete set null,
  due_date date,
  completed_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_checklist_case on public.checklist_items(compliance_case_id);
create index if not exists idx_checklist_status on public.checklist_items(status);

-- ============================================================================
-- 14. documents
-- ============================================================================
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  uploaded_by uuid not null references auth.users(id) on delete set null,
  document_type text not null,
  title text not null,
  file_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null default 0,
  issue_date date,
  expiry_date date,
  verification_status document_status not null default 'pending',
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_documents_org on public.documents(organization_id);
create index if not exists idx_documents_business on public.documents(business_id);
create index if not exists idx_documents_product on public.documents(product_id);
create index if not exists idx_documents_type on public.documents(document_type);
create index if not exists idx_documents_status on public.documents(verification_status);
create index if not exists idx_documents_expiry on public.documents(expiry_date);
create index if not exists idx_documents_deleted on public.documents(deleted_at);

-- ============================================================================
-- 15. document_versions
-- ============================================================================
create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null default 0,
  version_number int not null default 1,
  uploaded_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_doc_versions_document on public.document_versions(document_id);

-- ============================================================================
-- 16. tasks
-- ============================================================================
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  compliance_case_id uuid references public.compliance_cases(id) on delete set null,
  checklist_item_id uuid references public.checklist_items(id) on delete set null,
  title text not null,
  description text,
  status task_status not null default 'todo',
  priority task_priority not null default 'medium',
  assigned_to uuid references auth.users(id) on delete set null,
  due_date date,
  created_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tasks_org on public.tasks(organization_id);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_priority on public.tasks(priority);
create index if not exists idx_tasks_assigned on public.tasks(assigned_to);
create index if not exists idx_tasks_case on public.tasks(compliance_case_id);

-- ============================================================================
-- 17. reminders
-- ============================================================================
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  channel reminder_channel not null default 'in_app',
  message text not null,
  remind_at timestamptz not null,
  sent_at timestamptz,
  status reminder_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists idx_reminders_org on public.reminders(organization_id);
create index if not exists idx_reminders_status on public.reminders(status);
create index if not exists idx_reminders_target on public.reminders(target_type, target_id);
create index if not exists idx_reminders_remind_at on public.reminders(remind_at);

-- ============================================================================
-- 18. consultant_engagements
-- ============================================================================
create table if not exists public.consultant_engagements (
  id uuid primary key default gen_random_uuid(),
  business_organization_id uuid not null references public.organizations(id) on delete cascade,
  consultant_organization_id uuid not null references public.organizations(id) on delete cascade,
  package_name text,
  scope text,
  status engagement_status not null default 'pending',
  price numeric(18,2),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_engagements_business on public.consultant_engagements(business_organization_id);
create index if not exists idx_engagements_consultant on public.consultant_engagements(consultant_organization_id);
create index if not exists idx_engagements_status on public.consultant_engagements(status);

-- ============================================================================
-- 19. comments
-- ============================================================================
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  body text not null,
  created_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_comments_target on public.comments(target_type, target_id);
create index if not exists idx_comments_org on public.comments(organization_id);

-- ============================================================================
-- 20. notifications
-- ============================================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications(user_id);
create index if not exists idx_notifications_read on public.notifications(is_read);

-- ============================================================================
-- 21. audit_logs
-- ============================================================================
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_org on public.audit_logs(organization_id);
create index if not exists idx_audit_actor on public.audit_logs(actor_id);
create index if not exists idx_audit_action on public.audit_logs(action);
create index if not exists idx_audit_created on public.audit_logs(created_at);

-- ============================================================================
-- 22. assessments (public, insert-only)
-- ============================================================================
create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  owner_name text not null,
  whatsapp text not null,
  email text,
  city text not null,
  business_type text,
  product_type text,
  has_nib boolean not null default false,
  has_halal_certificate boolean not null default false,
  has_spp_irt boolean not null default false,
  has_product_label boolean not null default false,
  has_ingredient_list boolean not null default false,
  has_product_photo boolean not null default false,
  score int not null default 0,
  result_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_assessments_created on public.assessments(created_at);

-- ============================================================================
-- updated_at triggers
-- ============================================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','organizations','organization_members','businesses','products',
    'suppliers','ingredients','compliance_rules','compliance_cases','checklist_items',
    'documents','tasks','consultant_engagements'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I;', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at();', t);
  end loop;
end$$;

-- ============================================================================
-- Helper: dapatkan daftar organization_id milik user (aktif)
-- ============================================================================
create or replace function public.current_user_org_ids()
returns uuid[]
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    array_agg(distinct om.organization_id),
    array[]::uuid[]
  )
  from public.organization_members om
  where om.user_id = auth.uid()
    and om.status = 'active';
$$;

-- Helper: apakah user adalah admin platform
create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.organization_members om
    join public.organizations o on o.id = om.organization_id
    where om.user_id = auth.uid()
      and om.status = 'active'
      and o.type = 'platform'
      and om.role = 'admin'
  );
$$;

-- Helper: daftar organization klien yang dimentor user (sebagai konsultan aktif)
create or replace function public.consultant_client_org_ids()
returns uuid[]
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    array_agg(distinct ce.business_organization_id),
    array[]::uuid[]
  )
  from public.consultant_engagements ce
  join public.organization_members om
    on om.organization_id = ce.consultant_organization_id
  where om.user_id = auth.uid()
    and om.status = 'active'
    and om.role in ('consultant','admin')
    and ce.status in ('pending','active','paused');
$$;
