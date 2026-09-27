// ============================================================================
// ReguFlow - Data queries (TanStack Query)
// ============================================================================
// Semua query terikat activeOrganizationId agar RLS bisa memfilter dengan tepat.
// invalidationQueryKeys dipakai setelah mutasi agar UI konsisten.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/supabase/auth-store";
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
import { logAudit } from "@/lib/security/audit";

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

// ---- Business ------------------------------------------------------------------

export function useBusiness() {
  const orgId = useActiveOrgId();
  return useQuery({
    queryKey: queryKeys.business,
    enabled: Boolean(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Business[];
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
      const { data: businesses } = await supabase
        .from("businesses")
        .select("id")
        .eq("organization_id", orgId!);
      if (!businesses || businesses.length === 0) return [];
      const ids = businesses.map((b) => b.id);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .in("business_id", ids)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });
}

export function useProduct(productId: string | undefined) {
  return useQuery({
    queryKey: productId ? queryKeys.product(productId) : ["products", "none"],
    enabled: Boolean(productId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId!)
        .maybeSingle();
      if (error) throw error;
      return (data as Product | null) ?? null;
    },
  });
}

// ---- Documents ------------------------------------------------------------------

export function useDocuments() {
  const orgId = useActiveOrgId();
  return useQuery({
    queryKey: queryKeys.documents,
    enabled: Boolean(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .is("deleted_at", null)
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DocumentRow[];
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
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const orgId = useActiveOrgId();
  const userId = useAuthStore((s) => s.profile?.id ?? null);

  return useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string | null;
      priority: Task["priority"];
      status?: Task["status"];
      dueDate?: string | null;
      complianceCaseId?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          organization_id: orgId!,
          title: input.title,
          description: input.description ?? null,
          priority: input.priority,
          status: input.status ?? "todo",
          due_date: input.dueDate ?? null,
          compliance_case_id: input.complianceCaseId || null,
          created_by: userId,
        })
        .select()
        .single();
      if (error) throw error;
      await logAudit({
        organizationId: orgId,
        action: "task_created",
        entityType: "task",
        entityId: (data as Task).id,
      });
      return data as Task;
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
      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .eq("organization_id", orgId!)
        .order("remind_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Reminder[];
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
      const { data: businesses } = await supabase
        .from("businesses")
        .select("id")
        .eq("organization_id", orgId!);
      if (!businesses || businesses.length === 0) return [];
      const ids = businesses.map((b) => b.id);
      const { data, error } = await supabase
        .from("compliance_cases")
        .select(
          "*, business:businesses(id, legal_name, brand_name), product:products(id, name)"
        )
        .in("business_id", ids)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ComplianceCase[];
    },
  });
}

export function useComplianceCase(caseId: string | undefined) {
  return useQuery({
    queryKey: caseId ? queryKeys.complianceCase(caseId) : ["compliance-cases", "none"],
    enabled: Boolean(caseId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compliance_cases")
        .select(
          "*, business:businesses(*), product:products(*), checklist_items:checklist_items(*)"
        )
        .eq("id", caseId!)
        .maybeSingle();
      if (error) throw error;
      return (data as ComplianceCase | null) ?? null;
    },
  });
}

export function useUpdateCaseStatus() {
  const queryClient = useQueryClient();
  const orgId = useActiveOrgId();

  return useMutation({
    mutationFn: async ({
      caseId,
      status,
      score,
    }: {
      caseId: string;
      status: ComplianceCase["status"];
      score?: number;
    }) => {
      const update: Record<string, unknown> = { status };
      if (typeof score === "number") update.score = score;
      const { data, error } = await supabase
        .from("compliance_cases")
        .update(update)
        .eq("id", caseId)
        .select()
        .single();
      if (error) throw error;
      await logAudit({
        organizationId: orgId,
        action: "compliance_status_updated",
        entityType: "compliance_case",
        entityId: caseId,
        metadata: { status, score },
      });
      return data as ComplianceCase;
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
  const orgId = useActiveOrgId();

  return useMutation({
    mutationFn: async ({
      itemId,
      status,
    }: {
      itemId: string;
      status: ChecklistItem["status"];
    }) => {
      const update: Record<string, unknown> = {
        status,
        completed_at: status === "done" ? new Date().toISOString() : null,
      };
      const { data, error } = await supabase
        .from("checklist_items")
        .update(update)
        .eq("id", itemId)
        .select()
        .single();
      if (error) throw error;
      await logAudit({
        organizationId: orgId,
        action: "checklist_updated",
        entityType: "checklist_item",
        entityId: itemId,
        metadata: { status },
      });
      return data as ChecklistItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.checklist(caseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.complianceCase(caseId) });
    },
  });
}

// ---- Comments --------------------------------------------------------------------------

export function useComments(targetType: string, targetId: string) {
  return useQuery({
    queryKey: queryKeys.comments(targetType, targetId),
    enabled: Boolean(targetId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*, profile:profiles!comments_created_by_fkey(full_name)")
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CommentRow[];
    },
  });
}

export function useCreateComment(targetType: string, targetId: string) {
  const queryClient = useQueryClient();
  const orgId = useActiveOrgId();
  const userId = useAuthStore((s) => s.profile?.id ?? null);

  return useMutation({
    mutationFn: async (body: string) => {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          organization_id: orgId!,
          target_type: targetType,
          target_id: targetId,
          body,
          created_by: userId,
        })
        .select()
        .single();
      if (error) throw error;
      return data as CommentRow;
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
