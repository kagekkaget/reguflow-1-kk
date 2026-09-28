// ============================================================================
// ReguFlow - Error handler middleware
// ----------------------------------------------------------------------------
// Tangkap semua error, kembalikan response generik & aman (jangan bocorkan
// stack trace). Error teknis hanya dicatat di console (development) atau
// dikirim ke error monitoring (production).
// ============================================================================

import type { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const isDev = process.env.NODE_ENV !== "production";
  if (isDev) {
    // eslint-disable-next-line no-console
    console.error("[api] unhandled error:", err);
  }

  if (res.headersSent) {
    return;
  }

  res.status(500).json({
    error: "Terjadi kesalahan internal. Coba lagi beberapa saat.",
    // Debug info hanya di development:
    ...(isDev
      ? {
          details:
            err instanceof Error ? err.message : String(err),
        }
      : {}),
  });
}

/** Error helper: bangun Error dengan properti status & message aman. */
export interface ApiError extends Error {
  status?: number;
}

export function apiError(status: number, message: string): ApiError {
  const error = new Error(message) as ApiError;
  error.status = status;
  return error;
}
