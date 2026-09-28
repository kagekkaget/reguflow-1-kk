// ============================================================================
// ReguFlow - Logger & not-found middleware
// ============================================================================

import type { Request, Response, NextFunction } from "express";

export function logger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[api] ${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`
    );
  });
  next();
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: "Endpoint tidak ditemukan." });
}
