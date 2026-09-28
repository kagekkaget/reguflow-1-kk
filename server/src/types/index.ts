// ============================================================================
// ReguFlow - Shared server types (mirror of frontend domain enums)
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

export interface JwtUser {
  sub: string;
  email: string;
  role: MemberRole;
  iat?: number;
  exp?: number;
}

export interface AuthedRequest {
  user: JwtUser;
  organizationId: string | null;
  isPlatformAdmin: boolean;
  isConsultant: boolean;
  orgIds: string[];
  clientOrgIds: string[];
}

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

export type StatusTone = "gray" | "red" | "amber" | "yellow" | "green" | "blue";
