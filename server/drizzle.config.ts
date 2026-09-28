import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  require("dotenv").config();
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL belum diset. Copy .env.example ke .env dan isi kredensial Neon.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
