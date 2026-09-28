// ============================================================================
// ReguFlow - Constants & shared configuration used across server
// ----------------------------------------------------------------------------

export const UPLOAD_DIR_DEFAULT = "uploads";
export const MAX_UPLOAD_BYTES_DEFAULT = 25 * 1024 * 1024; // 25 MB
export const BCRYPT_SALT_ROUNDS = 12;
export const REFRESH_TOKEN_EXPIRY_DAYS = 30;

export enum AuditAction {
  CREATE = "create",
  READ = "read",
  UPDATE = "update",
  DELETE = "delete",
  LOGIN = "login",
  LOGOUT = "logout",
  UPLOAD = "upload",
  EXPORT = "export",
}

export const AUDIT_TABLE_MAP: Record<string, string> = {
  // Map logical entity name → table name (if different)
};
