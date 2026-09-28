// Execute migration SQL via standard pg Client (Neon pooler)
import { config } from "dotenv";
import { Client } from "pg";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

config();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = join(__dirname, "..", "migrations");

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

(async () => {
  try {
    await client.connect();

    await client.query('CREATE SCHEMA IF NOT EXISTS "drizzle"');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
        id serial PRIMARY KEY,
        hash text NOT NULL,
        created_at timestamptz DEFAULT now()
      )
    `);

    const files = readdirSync(migrationsFolder).filter((f) => f.endsWith(".sql"));

    for (const file of files) {
      const sql = readFileSync(join(migrationsFolder, file), "utf-8");
      const cleanSql = sql.replace(/--> statement-breakpoint/g, "").trim();
      await client.query(cleanSql);
      console.log(`Applied: ${file}`);
    }

    console.log("Migration complete!");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
