// ============================================================================
// ReguFlow - Audit log helper (client-side)
// ----------------------------------------------------------------------------
// Audit log ditulis via RLS-insert policy (actor_id = auth.uid()).
// Service role key TIDAK digunakan di frontend.
// ============================================================================

import { supabase } from "@/lib/supabase/client";
import { AUDIT_ACTIONS, type AuditAction } from "@/lib/constants";

export interface AuditParams {
  organizationId?: string | null;
  action: AuditAction | string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Catat audit log. Tidak melempar error ke caller agar tidak mengganggu UX;
   kegagalan logging hanya dicetak di console (dev).
 */
export async function logAudit({
  organizationId,
  action,
  entityType,
  entityId,
  metadata,
}: AuditParams): Promise<void> {
  try {
    const { error } = await supabase.from("audit_logs").insert({
      organization_id: organizationId ?? null,
      actor_id: (await supabase.auth.getUser()).data.user?.id ?? null,
      action,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
      metadata: metadata ?? {},
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
    if (error && import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("[audit] gagal mencatat log:", error.message);
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("[audit] error:", err);
    }
  }
}

export { AUDIT_ACTIONS };
