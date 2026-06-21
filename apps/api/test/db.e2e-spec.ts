import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { DbService } from "../src/db/db.service.js";
import { users, userSettings } from "../src/db/schema.js";
import { createTestApp } from "../src/testing/app.js";

const tempDir = fileURLToPath(new URL("./tmp", import.meta.url));
const dbPath = join(tempDir, "db.e2e.sqlite");
const originalDbDriver = process.env.DB_DRIVER;
const originalDatabaseUrl = process.env.DATABASE_URL;

afterEach(async () => {
  process.env.DB_DRIVER = originalDbDriver;
  process.env.DATABASE_URL = originalDatabaseUrl;
  await rm(tempDir, { force: true, recursive: true });
});

describe("database", () => {
  it("creates a user with CNY settings", async () => {
    await mkdir(dirname(dbPath), { recursive: true });
    process.env.DB_DRIVER = "sqlite";
    process.env.DATABASE_URL = `file:${dbPath}`;

    const app = await createTestApp();
    try {
      const db = app.get(DbService).db;
      const id = randomUUID();

      await db.insert(users).values({
        id,
        username: `schema-${id}`,
        displayName: "Schema User",
        passwordHash: "hash",
        role: "user",
        status: "active"
      });
      await db.insert(userSettings).values({
        id: randomUUID(),
        userId: id,
        baseCurrency: "CNY",
        exchangeRateProvider: "mock"
      });

      const rows = await db.select().from(userSettings).where(eq(userSettings.userId, id));

      expect(rows[0]?.baseCurrency).toBe("CNY");
    } finally {
      await app.close();
    }
  });
});
