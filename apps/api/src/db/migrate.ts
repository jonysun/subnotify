import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { parseEnv } from "../config/env.js";
import { migrateSqlite } from "./migrations.js";

const env = parseEnv(process.env);

if (env.DB_DRIVER !== "sqlite") {
  throw new Error("Manual migration currently supports SQLite. PostgreSQL schema compatibility is defined but not migrated by this command yet.");
}

const filename = env.DATABASE_URL.replace(/^file:/, "");
await mkdir(dirname(filename), { recursive: true });
const database = new Database(filename);

try {
  migrateSqlite(database);
  console.log(`Migrated SQLite database at ${filename}`);
} finally {
  database.close();
}
