// Drop & recreate schema public + drizzle (dev reset for Neon)
import { config } from "dotenv";
import { Client } from "pg";

config();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  try {
    await client.connect();
    await client.query('DROP SCHEMA public CASCADE');
    await client.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
    await client.query('CREATE SCHEMA public');
    await client.query('CREATE SCHEMA IF NOT EXISTS drizzle');
    console.log("DB reset done");
  } catch (err) {
    console.error("Reset failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
