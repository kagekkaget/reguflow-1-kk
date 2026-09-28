// ============================================================================
// ReguFlow - Audit log helper (client-side)
// ----------------------------------------------------------------------------
// Setelah migrasi ke backend sendiri (Neon + Express), audit log ditulis di
// sisi server oleh route handlers (modules/audit.ts) — termasuk IP & user
// agent. Client tidak lagi menulis audit langsung ke DB.
//
// Fungsi ini dipertahankan sebagai no-op agar call site yang ada tidak perlu
// diubah; logging sebenarnya terjadi di server.
// ============================================================================

import { AUDIT_ACTIONS, type AuditAction } from "@/lib/constants";

export interface AuditParams {
  organizationId?: string | null;
  action: AuditAction | string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * No-op: audit logging sekarang dilakukan di sisi server.
 * Dipertahankan untuk kompatibilitas call site yang ada.
 */
export async function logAudit(_params: AuditParams): Promise<void> {
  // Server-side audit (modules/audit.ts) sudah mencatat aksi pengguna.
  return;
}

export { AUDIT_ACTIONS };
