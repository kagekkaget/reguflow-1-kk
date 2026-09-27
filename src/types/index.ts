// ============================================================================
// ReguFlow - Type definitions (Database row types & app domain types)
// ============================================================================

export type MemberRole = "owner" | "staff" | "consultant" | "admin" | "viewer";
export type OrganizationType =
  | "business"
  | "consultant_agency"
  | "government"
  | "platform";
export type MemberStatus = "active" | "invited" | "suspended" | "left";
export type DocumentStatus =
  | "pending"
  | "valid"
  | "invalid"
  | "revision_needed"
  | "expired";
export type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type CaseStatus =
  | "not_started"
  | "data_collected"
  | "internal_review"
  | "consultant_review"
  | "ready_to_submit"
  | "submitted"
  | "revision"
  | "approved"
  | "expired";
export type ChecklistStatus = "todo" | "in_progress" | "done" | "blocked";
export type EngagementStatus =
  | "pending"
  | "active"
  | "paused"
  | "ended"
  | "cancelled";
export type ReminderChannel = "in_app" | "email" | "whatsapp";
export type ReminderStatus = "pending" | "sent" | "failed" | "cancelled";

// ---- Database rows -------------------------------------------------------

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  default_role: MemberRole;
  onboarding_completed: boolean;
  onboarding_step: number;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: MemberRole;
  status: MemberStatus;
  created_at: string;
  updated_at: string;
  // join opsional
  profile?: Profile | null;
}

export interface Business {
  id: string;
  organization_id: string;
  legal_name: string;
  brand_name: string | null;
  nib: string | null;
  npwp: string | null;
  entity_type: string | null;
  business_scale: string | null;
  annual_revenue: number | null;
  employee_count: number | null;
  address: string | null;
  province: string | null;
  city: string | null;
  postal_code: string | null;
  kbli: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  sku: string | null;
  category: string | null;
  subcategory: string | null;
  description: string | null;
  is_food_or_beverage: boolean;
  is_cosmetic: boolean;
  is_imported: boolean;
  uses_animal_derived_material: boolean;
  uses_alcohol_related_material: boolean;
  simple_production_process: boolean;
  packaging_type: string | null;
  sales_channel: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  business_id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  address: string | null;
  nib: string | null;
  has_halal_certificate: boolean;
  halal_certificate_number: string | null;
  notes: string | null;
  created_at: string;
}

export interface Ingredient {
  id: string;
  business_id: string;
  supplier_id: string | null;
  name: string;
  ingredient_type: string | null;
  halal_status: string | null;
  halal_certificate_number: string | null;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface ComplianceDomain {
  id: string;
  code: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface ComplianceRule {
  id: string;
  domain_id: string | null;
  code: string;
  title: string;
  description: string | null;
  condition_json: Record<string, unknown>;
  action_json: Record<string, unknown>;
  priority: number;
  effective_from: string;
  effective_until: string | null;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Requirement {
  id: string;
  rule_id: string | null;
  domain_code: string;
  name: string;
  description: string | null;
  required_document_type: string | null;
  is_mandatory: boolean;
  sort_order: number;
  created_at: string;
}

export interface ComplianceCase {
  id: string;
  business_id: string;
  product_id: string | null;
  domain_code: string;
  pathway: string | null;
  title: string;
  status: CaseStatus;
  score: number;
  due_date: string | null;
  assigned_consultant_id: string | null;
  created_at: string;
  updated_at: string;
  // join opsional
  business?: Pick<Business, "id" | "legal_name" | "brand_name"> | null;
  product?: Pick<Product, "id" | "name"> | null;
  checklist_items?: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  compliance_case_id: string;
  requirement_id: string | null;
  title: string;
  description: string | null;
  status: ChecklistStatus;
  assigned_to: string | null;
  due_date: string | null;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentRow {
  id: string;
  organization_id: string;
  business_id: string | null;
  product_id: string | null;
  uploaded_by: string | null;
  document_type: string;
  title: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  issue_date: string | null;
  expiry_date: string | null;
  verification_status: DocumentStatus;
  notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  version_number: number;
  uploaded_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  organization_id: string;
  compliance_case_id: string | null;
  checklist_item_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: string | null;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  organization_id: string;
  target_type: string;
  target_id: string;
  channel: ReminderChannel;
  message: string;
  remind_at: string;
  sent_at: string | null;
  status: ReminderStatus;
  created_at: string;
}

export interface ConsultantEngagement {
  id: string;
  business_organization_id: string;
  consultant_organization_id: string;
  package_name: string | null;
  scope: string | null;
  status: EngagementStatus;
  price: number | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
  // join opsional
  business_organization?: Pick<Organization, "id" | "name"> | null;
  consultant_organization?: Pick<Organization, "id" | "name"> | null;
}

export interface CommentRow {
  id: string;
  organization_id: string;
  target_type: string;
  target_id: string;
  body: string;
  created_by: string | null;
  created_at: string;
  profile?: Pick<Profile, "full_name"> | null;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  organization_id: string | null;
  actor_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ---- Scanner -------------------------------------------------------------

export interface AssessmentAnswers {
  business_name: string;
  owner_name: string;
  whatsapp: string;
  email?: string;
  city: string;
  business_type?: string;
  product_type?: string;
  has_nib: boolean;
  has_halal_certificate: boolean;
  has_spp_irt: boolean;
  has_product_label: boolean;
  has_ingredient_list: boolean;
  has_product_photo: boolean;
}

export interface ScannerInput {
  business: Pick<
    Business,
    | "legal_name"
    | "nib"
    | "business_scale"
    | "city"
    | "address"
    | "entity_type"
    | "kbli"
    | "employee_count"
  > | null;
  products: Product[];
  documents: Pick<DocumentRow, "document_type" | "expiry_date" | "verification_status">[];
  answers: Partial<AssessmentAnswers>;
}

export interface ScannerResult {
  score: number;
  statusLabel: string;
  statusTone: StatusTone;
  missingDocuments: string[];
  recommendations: string[];
  suggestedCases: string[];
  checklistItems: { domainCode: string; title: string }[];
  breakdown: { label: string; points: number; earned: number }[];
}

export type StatusTone = "gray" | "red" | "amber" | "yellow" | "green" | "blue";

// ---- Auth context --------------------------------------------------------

export interface AuthContextValue {
  session: import("@supabase/supabase-js").Session | null;
  profile: Profile | null;
  memberships: (OrganizationMember & { organization: Organization })[];
  activeOrganization: Organization | null;
  activeRole: MemberRole | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setActiveOrganizationId: (orgId: string) => void;
}
