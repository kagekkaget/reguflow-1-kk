// ============================================================================
// ReguFlow - Database client (Drizzle + Neon serverless driver)
// ----------------------------------------------------------------------------
// drizzle-orm/neon-serverless membutuhkan Pool dari @neondatabase/serverless
// (bukan fungsi neon() -- itu untuk driver neon-http).
// Catatan: @neondatabase/serverless HARUS ^0.10.x untuk kompatibilitas dengan
// drizzle-orm 0.44.x (v1.x mengubah format payload HTTP).
// DATABASE_URL bersumber dari environment (NEVER commit).
// ============================================================================

import "dotenv/config";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL belum diset. Isi file server/.env (lihat server/.env.example)."
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: Number(process.env.POOL_CONN_TIMEOUT_MS ?? 10000),
});

export const db = drizzle(pool, { schema });
export type DB = typeof db;
export { schema };
