// ============================================================================
// ReguFlow - Compliance scanner hook
// ----------------------------------------------------------------------------
// Menggabungkan data usaha, produk, dokumen, lalu menjalankan scanner engine.
// Juga menyediakan mutasi untuk membuat compliance case & checklist otomatis.
// ============================================================================

import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/supabase/auth-store";
import { useBusiness, useDocuments, useProducts, queryKeys } from "@/hooks/use-queries";
import { calculateComplianceScore } from "@/lib/compliance/scanner";
import { DOMAIN_CODE_LABELS } from "@/lib/constants";
import { logAudit } from "@/lib/security/audit";
import type { ScannerInput, ScannerResult } from "@/types";

export function useComplianceScanner(): {
  result: ScannerResult | null;
  loading: boolean;
  runScannerAndCreateCases: () => Promise<ScannerResult | null>;
} {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const { data: businesses, isLoading: loadingBusiness } = useBusiness();
  const { data: products, isLoading: loadingProducts } = useProducts();
  const { data: documents, isLoading: loadingDocuments } = useDocuments();
  const queryClient = useQueryClient();

  const result = useMemo<ScannerResult | null>(() => {
    if (!businesses || !products || !documents) return null;
    const input: ScannerInput = {
      business: businesses[0] ?? null,
      products,
      documents,
      answers: {},
    };
    return calculateComplianceScore(input);
  }, [businesses, products, documents]);

  const loading = loadingBusiness || loadingProducts || loadingDocuments;

  const runScannerAndCreateCases = async (): Promise<ScannerResult | null> => {
    if (!orgId || !businesses || businesses.length === 0 || !result) {
      return null;
    }
    const business = businesses[0]!;
    const existing = result.suggestedCases;

    for (const domainCode of existing) {
      // cek apakah case sudah ada
      const { data: found } = await supabase
        .from("compliance_cases")
        .select("id")
        .eq("business_id", business.id)
        .eq("domain_code", domainCode)
        .maybeSingle();

      if (found) continue;

      const { data: created, error } = await supabase
        .from("compliance_cases")
        .insert({
          business_id: business.id,
          domain_code: domainCode,
          title: `${DOMAIN_CODE_LABELS[domainCode] ?? domainCode} — ${business.legal_name}`,
          status: "not_started",
          score: 0,
        })
        .select()
        .single();

      if (error) continue;

      // buat checklist awal dari result + requirements default
      const { data: requirements } = await supabase
        .from("requirements")
        .select("name, description, sort_order, is_mandatory")
        .eq("domain_code", domainCode)
        .order("sort_order", { ascending: true });

      const items = (requirements ?? []).map((r, idx) => ({
        compliance_case_id: (created as { id: string }).id,
        requirement_id: null,
        title: r.name,
        description: r.description,
        status: "todo" as const,
        sort_order: r.sort_order ?? idx,
      }));

      if (items.length > 0) {
        await supabase.from("checklist_items").insert(items);
      }
    }

    await logAudit({
      organizationId: orgId,
      action: "scanner_run",
      entityType: "business",
      entityId: business.id,
      metadata: { score: result.score, cases: existing },
    });

    queryClient.invalidateQueries({ queryKey: queryKeys.complianceCases });
    queryClient.invalidateQueries({ queryKey: queryKeys.business });

    return result;
  };

  return { result, loading, runScannerAndCreateCases };
}
