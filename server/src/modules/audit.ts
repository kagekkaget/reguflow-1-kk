// ============================================================================
// ReguFlow - Audit logging module
// ----------------------------------------------------------------------------
// Helper untuk mencatat aktivitas pengguna ke tabel `audit_logs`.
// Kegagalan pencatatan audit tidak boleh gagalkan request.
// ============================================================================

import type { AuthenticatedRequest } from "../middleware/auth";
import { db } from "../db/client";
import { auditLogs } from "../db/schema";

export async function createAuditLog(
  req: AuthenticatedRequest,
  action: string,
  entityType: string,
  entityId?: string | null,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (!req.user) return;

  try {
    await db.insert(auditLogs).values({
      organizationId: req.user.orgId,
      actorId: req.user.id,
      action,
      entityType,
      entityId: entityId ?? null,
      metadata: metadata ?? {},
      ipAddress: (req.ip as unknown as string) ?? null,
      userAgent: req.headers["user-agent"] ?? null,
    });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("[audit] failed to write log:", err);
    }
  }
}
