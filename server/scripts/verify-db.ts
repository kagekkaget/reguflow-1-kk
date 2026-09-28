// Verify seeded counts
import "dotenv/config";
import { Client } from "pg";

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  await client.connect();
  const d = await client.query("select count(*) from compliance_domains");
  const r = await client.query("select count(*) from requirements");
  console.log("domains:", d.rows[0].count, "| requirements:", r.rows[0].count);
  await client.end();
})();
