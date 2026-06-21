import { defineConfig } from "drizzle-kit";

const driver = process.env.DB_DRIVER ?? "sqlite";

export default defineConfig({
  schema: "./apps/api/src/db/schema.ts",
  out: "./drizzle",
  dialect: driver === "postgres" ? "postgresql" : "sqlite",
  dbCredentials:
    driver === "postgres"
      ? { url: process.env.DATABASE_URL ?? "postgres://sem:sem@localhost:5432/sem" }
      : { url: (process.env.DATABASE_URL ?? "file:./data/app.db").replace(/^file:/, "") }
});
