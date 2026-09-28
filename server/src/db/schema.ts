// ============================================================================
// ReguFlow - Drizzle ORM Schema (Neon PostgreSQL)
// ============================================================================

import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  date,
  jsonb,
  pgEnum,
   primaryKey,
   index,
   bigint,
   inet,
} from "drizzle-orm/pg-core";

// ---- Enums -------------------------------------------------------------------

export const organizationType = pgEnum("organization_type", [
  "business",
  "consultant_agency",
  "government",
  "platform",
]);

export const memberRole = pgEnum("member_role", [
  "owner",
  "staff",
  "consultant",
  "admin",
  "viewer",
]);

export const memberStatus = pgEnum("member_status", [
  "active",
  "invited",
  "suspended",
  "left",
]);

export const documentStatus = pgEnum("document_status", [
  "pending",
  "valid",
  "invalid",
  "revision_needed",
  "expired",
]);

export const taskStatus = pgEnum("task_status", [
  "todo",
  "in_progress",
  "done",
  "cancelled",
]);

export const taskPriority = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const caseStatus = pgEnum("case_status", [
  "not_started",
  "data_collected",
  "internal_review",
  "consultant_review",
  "ready_to_submit",
  "submitted",
  "revision",
  "approved",
  "expired",
]);

export const checklistStatus = pgEnum("checklist_status", [
  "todo",
  "in_progress",
  "done",
  "blocked",
]);

export const engagementStatus = pgEnum("engagement_status", [
  "pending",
  "active",
  "paused",
  "ended",
  "cancelled",
]);

export const reminderChannel = pgEnum("reminder_channel", [
  "in_app",
  "email",
  "whatsapp",
]);

export const reminderStatus = pgEnum("reminder_status", [
  "pending",
  "sent",
  "failed",
  "cancelled",
]);

// ---- 0. users (autentikasi own-service: bcrypt + JWT) ------------------------

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull().default(""),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  defaultRole: memberRole("default_role").notNull().default("owner"),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  onboardingStep: integer("onboarding_step").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- 1. organizations ---------------------------------------------------------

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  type: organizationType("type").notNull().default("business"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- 2. organization_members --------------------------------------------------

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRole("role").notNull().default("staff"),
    status: memberStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.organizationId, t.userId] }),
    index("organization_members_user_idx").on(t.userId),
  ]
);

// ---- 3. businesses ------------------------------------------------------------

export const businesses = pgTable("businesses", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  legalName: text("legal_name").notNull(),
  brandName: text("brand_name"),
  nib: text("nib"),
  npwp: text("npwp"),
  entityType: text("entity_type").default("perorangan"),
  businessScale: text("business_scale").default("mikro"),
  annualRevenue: numeric("annual_revenue", { precision: 18, scale: 2 }),
  employeeCount: integer("employee_count").default(0),
  address: text("address"),
  province: text("province"),
  city: text("city"),
  postalCode: text("postal_code"),
  kbli: text("kbli"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- 4. products --------------------------------------------------------------

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sku: text("sku"),
  category: text("category"),
  subcategory: text("subcategory"),
  description: text("description"),
  isFoodOrBeverage: boolean("is_food_or_beverage").notNull().default(true),
  isCosmetic: boolean("is_cosmetic").notNull().default(false),
  isImported: boolean("is_imported").notNull().default(false),
  usesAnimalDerivedMaterial: boolean("uses_animal_derived_material").notNull().default(false),
  usesAlcoholRelatedMaterial: boolean("uses_alcohol_related_material").notNull().default(false),
  simpleProductionProcess: boolean("simple_production_process").notNull().default(true),
  packagingType: text("packaging_type"),
  salesChannel: text("sales_channel"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- 5. suppliers -------------------------------------------------------------

export const suppliers = pgTable("suppliers", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  phone: text("phone"),
  address: text("address"),
  nib: text("nib"),
  hasHalalCertificate: boolean("has_halal_certificate").notNull().default(false),
  halalCertificateNumber: text("halal_certificate_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- 6. ingredients ------------------------------------------------------------

export const ingredients = pgTable("ingredients", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  supplierId: uuid("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  ingredientType: text("ingredient_type").default("bahan_baku"),
  halalStatus: text("halal_status").default("unknown"),
  halalCertificateNumber: text("halal_certificate_number"),
  expiryDate: date("expiry_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- 7. product_ingredients -----------------------------------------------------

export const productIngredients = pgTable(
  "product_ingredients",
  {
    id: uuid("id").defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    ingredientId: uuid("ingredient_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "cascade" }),
    quantity: numeric("quantity", { precision: 12, scale: 3 }),
    unit: text("unit"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.ingredientId] }),
    index("product_ingredients_ingredient_idx").on(t.ingredientId),
  ]
);

// ---- 8. compliance_domains -------------------------------------------------------

export const complianceDomains = pgTable("compliance_domains", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- 9. compliance_rules ----------------------------------------------------------

export const complianceRules = pgTable("compliance_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  domainId: uuid("domain_id").references(() => complianceDomains.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  conditionJson: jsonb("condition_json").notNull().default({}),
  actionJson: jsonb("action_json").notNull().default({}),
  priority: integer("priority").notNull().default(50),
  effectiveFrom: date("effective_from").notNull().defaultNow(),
  effectiveUntil: date("effective_until"),
  version: integer("version").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- 10. requirements --------------------------------------------------------------

export const requirements = pgTable("requirements", {
  id: uuid("id").defaultRandom().primaryKey(),
  ruleId: uuid("rule_id").references(() => complianceRules.id, { onDelete: "cascade" }),
  domainCode: text("domain_code").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  requiredDocumentType: text("required_document_type"),
  isMandatory: boolean("is_mandatory").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- 11. compliance_cases ----------------------------------------------------------

export const complianceCases = pgTable("compliance_cases", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
  domainCode: text("domain_code").notNull(),
  pathway: text("pathway"),
  title: text("title").notNull(),
  status: caseStatus("status").notNull().default("not_started"),
  score: integer("score").notNull().default(0),
  dueDate: date("due_date"),
  assignedConsultantId: uuid("assigned_consultant_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- 12. checklist_items ------------------------------------------------------------

export const checklistItems = pgTable("checklist_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  complianceCaseId: uuid("compliance_case_id")
    .notNull()
    .references(() => complianceCases.id, { onDelete: "cascade" }),
  requirementId: uuid("requirement_id").references(() => requirements.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  description: text("description"),
  status: checklistStatus("status").notNull().default("todo"),
  assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- 13. documents -------------------------------------------------------------------

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  businessId: uuid("business_id").references(() => businesses.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  uploadedBy: uuid("uploaded_by")
    .notNull()
    .references(() => users.id, { onDelete: "set null" }),
  documentType: text("document_type").notNull(),
  title: text("title").notNull(),
  filePath: text("file_path").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: bigint("file_size", { mode: "number" }).notNull().default(0),
  issueDate: date("issue_date"),
  expiryDate: date("expiry_date"),
  verificationStatus: documentStatus("verification_status").notNull().default("pending"),
  notes: text("notes"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- 14. document_versions ------------------------------------------------------------

export const documentVersions = pgTable("document_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  filePath: text("file_path").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: bigint("file_size", { mode: "number" }).notNull().default(0),
  versionNumber: integer("version_number").notNull().default(1),
  uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- 15. tasks ---------------------------------------------------------------------------

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  complianceCaseId: uuid("compliance_case_id").references(() => complianceCases.id, {
    onDelete: "set null",
  }),
  checklistItemId: uuid("checklist_item_id").references(() => checklistItems.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatus("status").notNull().default("todo"),
  priority: taskPriority("priority").notNull().default("medium"),
  assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
  dueDate: date("due_date"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- 16. reminders --------------------------------------------------------------------------

export const reminders = pgTable("reminders", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  targetType: text("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  channel: reminderChannel("channel").notNull().default("in_app"),
  message: text("message").notNull(),
  remindAt: timestamp("remind_at", { withTimezone: true }).notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  status: reminderStatus("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- 17. consultant_engagements ----------------------------------------------------------------

export const consultantEngagements = pgTable("consultant_engagements", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessOrganizationId: uuid("business_organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  consultantOrganizationId: uuid("consultant_organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  packageName: text("package_name"),
  scope: text("scope"),
  status: engagementStatus("status").notNull().default("pending"),
  price: numeric("price", { precision: 18, scale: 2 }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- 18. comments ------------------------------------------------------------------------------

export const comments = pgTable("comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  targetType: text("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  body: text("body").notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- 19. notifications ---------------------------------------------------------------------------

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- 20. audit_logs -------------------------------------------------------------------------------

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: uuid("entity_id"),
  metadata: jsonb("metadata").notNull().default({}),
  ipAddress: inet("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- 21. assessments (public insert-only) ------------------------------------------------------------

export const assessments = pgTable("assessments", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessName: text("business_name").notNull(),
  ownerName: text("owner_name").notNull(),
  whatsapp: text("whatsapp").notNull(),
  email: text("email"),
  city: text("city").notNull(),
  businessType: text("business_type"),
  productType: text("product_type"),
  hasNib: boolean("has_nib").notNull().default(false),
  hasHalalCertificate: boolean("has_halal_certificate").notNull().default(false),
  hasSppIrt: boolean("has_spp_irt").notNull().default(false),
  hasProductLabel: boolean("has_product_label").notNull().default(false),
  hasIngredientList: boolean("has_ingredient_list").notNull().default(false),
  hasProductPhoto: boolean("has_product_photo").notNull().default(false),
  score: integer("score").notNull().default(0),
  resultJson: jsonb("result_json").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- refresh tokens (untuk rotasi JWT) ---------------------------------------------------------------

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
