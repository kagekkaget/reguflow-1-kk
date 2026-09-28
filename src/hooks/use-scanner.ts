// ============================================================================
// ReguFlow - Compliance scanner hook
// ----------------------------------------------------------------------------
// Menggabungkan data usaha, produk, dokumen, lalu menjalankan scanner engine.
// Membuat compliance case & checklist otomatis via API (server yang membuat
// checklist dari requirements domain).
// ============================================================================

import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useAuthStore } from "@/lib/api/auth-store";
import {
  useBusiness,
  useDocuments,
  useProducts,
  queryKeys,
} from "@/hooks/use-queries";
import { calculateComplianceScore } from "@/lib/compliance/scanner";
import { DOMAIN_CODE_LABELS } from "@/lib/constants";
import type { ScannerInput, ScannerResult } from "@/types";

interface ApiCase {
  id: string;
  businessId: string;
  domainCode: string;
  title: string;
  status: string;
}

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
    const existingCases = await api.get<ApiCase[]>(
      `/api/compliance/cases?business_id=${encodeURIComponent(business.id)}`
    );
    const existingDomains = new Set(existingCases.map((c) => c.domainCode));

    for (const domainCode of result.suggestedCases) {
      if (existingDomains.has(domainCode)) continue;

      await api.post<ApiCase>("/api/compliance/cases", {
        business_id: business.id,
        domain_code: domainCode,
        title: `${DOMAIN_CODE_LABELS[domainCode] ?? domainCode} — ${business.legal_name}`,
      });
      // Server membuat checklist otomatis dari requirements domain.
    }

    queryClient.invalidateQueries({ queryKey: queryKeys.complianceCases });

    return result;
  };

  return { result, loading, runScannerAndCreateCases };
}
