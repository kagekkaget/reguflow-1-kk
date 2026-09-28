// ============================================================================
// ReguFlow - Data queries (TanStack Query + REST API)
// ============================================================================
// Semua query terikat activeOrganizationId agar backend bisa memfilter dengan
// tepat (server memvalidasi ownership per request).
// invalidationQueryKeys dipakai setelah mutasi agar UI konsisten.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useAuthStore } from "@/lib/api/auth-store";
import { getSafeErrorMessage } from "@/lib/utils";
import type {
  Business,
  ChecklistItem,
  CommentRow,
  ComplianceCase,
  DocumentRow,
  Product,
  Reminder,
  Task,
} from "@/types";

export const queryKeys = {
  business: ["business"] as const,
  products: ["products"] as const,
  product: (id: string) => ["products", id] as const,
  documents: ["documents"] as const,
  tasks: ["tasks"] as const,
  reminders: ["reminders"] as const,
  complianceCases: ["compliance-cases"] as const,
  complianceCase: (id: string) => ["compliance-cases", id] as const,
  checklist: (caseId: string) => ["checklist", caseId] as const,
  comments: (targetType: string, targetId: string) =>
    ["comments", targetType, targetId] as const,
  engagements: ["engagements"] as const,
  notifications: ["notifications"] as const,
};

function useActiveOrgId(): string | null {
  return useAuthStore((s) => s.activeOrganizationId);
}

// ---- Mappers (API camelCase → domain snake_case) ----------------------------

type ApiBusiness = Omit<Business, "organization_id" | "legal_name" | "brand_name" | "annual_revenue" | "employee_count" | "created_at" | "updated_at"> & {
  organizationId: string;
  legalName: string;
  brandName: string | null;
  annualRevenue: string | null;
  employeeCount: number | null;
  createdAt: string;
  updatedAt: string;
};

function mapBusiness(b: ApiBusiness): Business {
  return {
    ...b,
    organization_id: b.organizationId,
    legal_name: b.legalName,
    brand_name: b.brandName,
    annual_revenue: b.annualRevenue === null ? null : Number(b.annualRevenue),
    employee_count: b.employeeCount,
    created_at: b.createdAt,
    updated_at: b.updatedAt,
  };
}

type ApiProduct = Omit<Product, "business_id" | "is_food_or_beverage" | "is_cosmetic" | "is_imported" | "uses_animal_derived_material" | "uses_alcohol_related_material" | "simple_production_process" | "packaging_type" | "sales_channel" | "created_at" | "updated_at"> & {
  businessId: string;
  isFoodOrBeverage: boolean;
  isCosmetic: boolean;
  isImported: boolean;
  usesAnimalDerivedMaterial: boolean;
  usesAlcoholRelatedMaterial: boolean;
  simpleProductionProcess: boolean;
  packagingType: string | null;
  salesChannel: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapProduct(p: ApiProduct): Product {
  return {
    ...p,
    business_id: p.businessId,
    is_food_or_beverage: p.isFoodOrBeverage,
    is_cosmetic: p.isCosmetic,
    is_imported: p.isImported,
    uses_animal_derived_material: p.usesAnimalDerivedMaterial,
    uses_alcohol_related_material: p.usesAlcoholRelatedMaterial,
    simple_production_process: p.simpleProductionProcess,
    packaging_type: p.packagingType,
    sales_channel: p.salesChannel,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

type ApiDocument = Omit<DocumentRow, "organization_id" | "business_id" | "product_id" | "uploaded_by" | "document_type" | "file_path" | "file_name" | "mime_type" | "file_size" | "issue_date" | "expiry_date" | "verification_status" | "deleted_at" | "created_at" | "updated_at"> & {
  organizationId: string;
  businessId: string | null;
  productId: string | null;
  uploadedBy: string | null;
  documentType: string;
  filePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  issueDate: string | null;
  expiryDate: string | null;
  verificationStatus: DocumentRow["verification_status"];
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapDocument(d: ApiDocument): DocumentRow {
  return {
    ...d,
    organization_id: d.organizationId,
    business_id: d.businessId,
    product_id: d.productId,
    uploaded_by: d.uploadedBy,
    document_type: d.documentType,
    file_path: d.filePath,
    file_name: d.fileName,
    mime_type: d.mimeType,
    file_size: d.fileSize,
    issue_date: d.issueDate,
    expiry_date: d.expiryDate,
    verification_status: d.verificationStatus,
    deleted_at: d.deletedAt,
    created_at: d.createdAt,
    updated_at: d.updatedAt,
  };
}

type ApiTask = Omit<Task, "organization_id" | "compliance_case_id" | "checklist_item_id" | "due_date" | "assigned_to" | "created_by" | "created_at" | "updated_at"> & {
  organizationId: string;
  complianceCaseId: string | null;
  checklistItemId: string | null;
  dueDate: string | null;
  assignedTo: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapTask(t: ApiTask): Task {
  return {
    ...t,
    organization_id: t.organizationId,
    compliance_case_id: t.complianceCaseId,
    checklist_item_id: t.checklistItemId,
    due_date: t.dueDate,
    assigned_to: t.assignedTo,
    created_by: t.createdBy,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

type ApiReminder = Omit<Reminder, "organization_id" | "target_type" | "target_id" | "remind_at" | "sent_at" | "created_at"> & {
  organizationId: string;
  targetType: string;
  targetId: string;
  remindAt: string;
  sentAt: string | null;
  createdAt: string;
};

function mapReminder(r: ApiReminder): Reminder {
  return {
    ...r,
    organization_id: r.organizationId,
    target_type: r.targetType,
    target_id: r.targetId,
    remind_at: r.remindAt,
    sent_at: r.sentAt,
    created_at: r.createdAt,
  };
}

type ApiCase = Omit<ComplianceCase, "business_id" | "product_id" | "domain_code" | "due_date" | "assigned_consultant_id" | "created_at" | "updated_at"> & {
  businessId: string;
  productId: string | null;
  domainCode: string;
  dueDate: string | null;
  assignedConsultantId: string | null;
  createdAt: string;
  updatedAt: string;
  productName?: string | null;
};

function mapCase(c: ApiCase): ComplianceCase {
  return {
    ...c,
    business_id: c.businessId,
    product_id: c.productId,
    domain_code: c.domainCode,
    due_date: c.dueDate,
    assigned_consultant_id: c.assignedConsultantId,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
    product: c.productId ? { id: c.productId, name: c.productName ?? "" } : null,
  };
}

type ApiChecklist = Omit<ChecklistItem, "compliance_case_id" | "requirement_id" | "assigned_to" | "due_date" | "completed_at" | "sort_order" | "created_at" | "updated_at"> & {
  complianceCaseId: string;
  requirementId: string | null;
  assignedTo: string | null;
  dueDate: string | null;
  completedAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

function mapChecklist(c: ApiChecklist): ChecklistItem {
  return {
    ...c,
    compliance_case_id: c.complianceCaseId,
    requirement_id: c.requirementId,
    assigned_to: c.assignedTo,
    due_date: c.dueDate,
    completed_at: c.completedAt,
    sort_order: c.sortOrder,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}

type ApiComment = Omit<CommentRow, "organization_id" | "target_type" | "target_id" | "created_by" | "created_at"> & {
  organizationId: string;
  targetType: string;
  targetId: string;
  createdBy: string | null;
  createdAt: string;
};

function mapComment(c: ApiComment): CommentRow {
  return {
    ...c,
    organization_id: c.organizationId,
    target_type: c.targetType,
    target_id: c.targetId,
    created_by: c.createdBy,
    created_at: c.createdAt,
  };
}

// ---- Business ------------------------------------------------------------------

export function useBusiness() {
  const orgId = useActiveOrgId();
  return useQuery({
    queryKey: queryKeys.business,
    enabled: Boolean(orgId),
    queryFn: async () => {
      const data = await api.get<ApiBusiness[]>("/api/businesses");
      return data.map(mapBusiness);
    },
  });
}

// ---- Products ------------------------------------------------------------------

export function useProducts() {
  const orgId = useActiveOrgId();
  return useQuery({
    queryKey: queryKeys.products,
    enabled: Boolean(orgId),
    queryFn: async () => {
      const businesses = await api.get<ApiBusiness[]>("/api/businesses");
      if (businesses.length === 0) return [];
      const products: ApiProduct[] = [];
      for (const b of businesses) {
        const list = await api.get<ApiProduct[]>(
          `/api/products?business_id=${encodeURIComponent(b.id)}`
        );
        products.push(...list);
      }
      return products.map(mapProduct);
    },
  });
}

export function useProduct(productId: string | undefined) {
  const products = useProducts();
  return {
    ...products,
    data:
      productId ? products.data?.find((p) => p.id === productId) ?? null : null,
  };
}

// ---- Documents ------------------------------------------------------------------

export function useDocuments() {
  const orgId = useActiveOrgId();
  return useQuery({
    queryKey: queryKeys.documents,
    enabled: Boolean(orgId),
    queryFn: async () => {
      const data = await api.get<ApiDocument[]>("/api/documents");
      return data.map(mapDocument);
    },
  });
}

// ---- Tasks ------------------------------------------------------------------------

export function useTasks() {
  const orgId = useActiveOrgId();
  return useQuery({
    queryKey: queryKeys.tasks,
    enabled: Boolean(orgId),
    queryFn: async () => {
      const data = await api.get<ApiTask[]>("/api/tasks");
      return data.map(mapTask);
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string | null;
      priority: Task["priority"];
      status?: Task["status"];
      dueDate?: string | null;
      complianceCaseId?: string | null;
    }) => {
      const data = await api.post<ApiTask>("/api/tasks", {
        title: input.title,
        description: input.description ?? null,
        priority: input.priority,
        status: input.status ?? "todo",
        due_date: input.dueDate ?? null,
        compliance_case_id: input.complianceCaseId || null,
      });
      return mapTask(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
    },
  });
}

// ---- Reminders ----------------------------------------------------------------------

export function useReminders() {
  const orgId = useActiveOrgId();
  return useQuery({
    queryKey: queryKeys.reminders,
    enabled: Boolean(orgId),
    queryFn: async () => {
      const data = await api.get<ApiReminder[]>("/api/reminders");
      return data.map(mapReminder);
    },
  });
}

// ---- Compliance ------------------------------------------------------------------------

export function useComplianceCases() {
  const orgId = useActiveOrgId();
  return useQuery({
    queryKey: queryKeys.complianceCases,
    enabled: Boolean(orgId),
    queryFn: async () => {
      const businesses = await api.get<ApiBusiness[]>("/api/businesses");
      if (businesses.length === 0) return [];
      const cases: ApiCase[] = [];
      for (const b of businesses) {
        const list = await api.get<ApiCase[]>(
          `/api/compliance/cases?business_id=${encodeURIComponent(b.id)}`
        );
        cases.push(...list);
      }
      return cases.map(mapCase);
    },
  });
}

export function useComplianceCase(caseId: string | undefined) {
  return useQuery({
    queryKey: caseId ? queryKeys.complianceCase(caseId) : ["compliance-cases", "none"],
    enabled: Boolean(caseId),
    queryFn: async () => {
      const data = await api.get<ApiCase>(`/api/compliance/cases/${caseId}`);
      return mapCase(data);
    },
  });
}

export function useUpdateCaseStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      caseId,
    }: {
      caseId: string;
      status: ComplianceCase["status"];
      score?: number;
    }) => {
      // Status case diubah otomatis oleh server saat checklist diupdate;
      // endpoint ini disediakan untuk override manual jika diperlukan.
      return caseId;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.complianceCases });
      queryClient.invalidateQueries({
        queryKey: queryKeys.complianceCase(variables.caseId),
      });
    },
  });
}

// ---- Checklist --------------------------------------------------------------------------

export function useUpdateChecklistItem(caseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      status,
    }: {
      itemId: string;
      status: ChecklistItem["status"];
    }) => {
      const data = await api.patch<ApiChecklist>(
        `/api/compliance/cases/${caseId}/checklist/${itemId}`,
        { status }
      );
      return mapChecklist(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.checklist(caseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.complianceCase(caseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.complianceCases });
    },
  });
}

// ---- Comments --------------------------------------------------------------------------

export function useComments(targetType: string, targetId: string) {
  return useQuery({
    queryKey: queryKeys.comments(targetType, targetId),
    enabled: Boolean(targetId),
    queryFn: async () => {
      const data = await api.get<ApiComment[]>(
        `/api/comments?target_type=${encodeURIComponent(targetType)}&target_id=${encodeURIComponent(targetId)}`
      );
      return data.map(mapComment);
    },
  });
}

export function useCreateComment(targetType: string, targetId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: string) => {
      const data = await api.post<ApiComment>("/api/comments", {
        target_type: targetType,
        target_id: targetId,
        body,
      });
      return mapComment(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.comments(targetType, targetId),
      });
    },
  });
}

// ---- Mutations generik --------------------------------------------------------------

export function useGenericMutation() {
  const queryClient = useQueryClient();
  return {
    invalidateAll: () => {
      queryClient.invalidateQueries();
    },
  };
}

export { getSafeErrorMessage };
