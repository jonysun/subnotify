import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import argon2 from "argon2";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DbService } from "../src/db/db.service.js";
import { payments, subscriptions, userSettings, users } from "../src/db/schema.js";
import { createTestApp } from "../src/testing/app.js";

const tempDir = fileURLToPath(new URL("./tmp-admin", import.meta.url));
const dbPath = join(tempDir, "admin.e2e.sqlite");
const backupDir = join(tempDir, "backups");
const originalEnv = {
  BACKUP_DIR: process.env.BACKUP_DIR,
  DATABASE_URL: process.env.DATABASE_URL,
  DB_DRIVER: process.env.DB_DRIVER,
  JWT_SECRET: process.env.JWT_SECRET,
  NODE_ENV: process.env.NODE_ENV
};

beforeEach(async () => {
  await rm(tempDir, { force: true, recursive: true });
  await mkdir(dirname(dbPath), { recursive: true });
  process.env.BACKUP_DIR = backupDir;
  process.env.DB_DRIVER = "sqlite";
  process.env.DATABASE_URL = `file:${dbPath}`;
  process.env.JWT_SECRET = "test-admin-secret";
  process.env.NODE_ENV = "test";
});

afterEach(async () => {
  process.env.BACKUP_DIR = originalEnv.BACKUP_DIR;
  process.env.DATABASE_URL = originalEnv.DATABASE_URL;
  process.env.DB_DRIVER = originalEnv.DB_DRIVER;
  process.env.JWT_SECRET = originalEnv.JWT_SECRET;
  process.env.NODE_ENV = originalEnv.NODE_ENV;
  await rm(tempDir, { force: true, recursive: true });
});

async function createLogin(app: Awaited<ReturnType<typeof createTestApp>>, role: "admin" | "user", sharing = false) {
  const db = app.get(DbService).db;
  const id = randomUUID();
  const username = `${role}-${id}`;
  await db.insert(users).values({
    id,
    username,
    displayName: `${role} user`,
    passwordHash: await argon2.hash("password123"),
    role,
    status: "active"
  });
  await db.insert(userSettings).values({ id: randomUUID(), userId: id, baseCurrency: "CNY", exchangeRateProvider: "mock", dataSharingEnabled: sharing });
  const login = await request(app.getHttpServer()).post("/api/auth/login").send({ username, password: "password123" }).expect(201);
  return { db, id, token: login.body.accessToken as string };
}

describe("admin backups audit and shared data", () => {
  it("backs up data and reads shared user data only when sharing is enabled", async () => {
    const app = await createTestApp();
    try {
      const admin = await createLogin(app, "admin");
      const ordinary = await createLogin(app, "user", false);
      const adminAuth = { Authorization: `Bearer ${admin.token}` };

      const subscriptionId = randomUUID();
      await ordinary.db.insert(subscriptions).values({
        id: subscriptionId,
        userId: ordinary.id,
        name: "Private Service",
        currentCycle: "monthly",
        currentPrice: 9,
        currentCurrency: "CNY",
        startDate: "2026-01-01T00:00:00.000Z",
        nextDueDate: "2026-02-01T00:00:00.000Z"
      });
      await ordinary.db.insert(payments).values({
        id: randomUUID(),
        userId: ordinary.id,
        subscriptionId,
        paidAt: "2026-01-01T00:00:00.000Z",
        originalAmount: 9,
        originalCurrency: "CNY",
        baseAmount: 9,
        baseCurrency: "CNY"
      });

      const system = await request(app.getHttpServer()).get("/api/admin/system").set(adminAuth).expect(200);
      expect(system.body).toMatchObject({ databaseDriver: "sqlite" });

      const backup = await request(app.getHttpServer()).post("/api/admin/backups").set(adminAuth).expect(201);
      expect(backup.body).toMatchObject({ status: "completed", databaseDriver: "sqlite" });

      const restore = await request(app.getHttpServer()).post("/api/admin/backups/restore").set(adminAuth).send({ backupId: backup.body.id }).expect(201);
      expect(restore.body.preRestoreBackupId).toEqual(expect.any(String));

      await request(app.getHttpServer()).get(`/api/admin/shared-users/${ordinary.id}/subscriptions`).set(adminAuth).expect(403);

      await request(app.getHttpServer())
        .patch("/api/me/settings")
        .set({ Authorization: `Bearer ${ordinary.token}` })
        .send({ dataSharingEnabled: true })
        .expect(200);

      const sharedUsers = await request(app.getHttpServer()).get("/api/admin/shared-users").set(adminAuth).expect(200);
      expect(sharedUsers.body.map((user: { id: string }) => user.id)).toContain(ordinary.id);

      const sharedSubscriptions = await request(app.getHttpServer()).get(`/api/admin/shared-users/${ordinary.id}/subscriptions`).set(adminAuth).expect(200);
      expect(sharedSubscriptions.body[0]).toMatchObject({ id: subscriptionId, name: "Private Service" });

      const sharedPayments = await request(app.getHttpServer()).get(`/api/admin/shared-users/${ordinary.id}/payments`).set(adminAuth).expect(200);
      expect(sharedPayments.body[0]).toMatchObject({ subscriptionId, baseAmount: 9 });

      const auditLogs = await request(app.getHttpServer()).get("/api/admin/audit-logs").set(adminAuth).expect(200);
      expect(auditLogs.body.some((log: { action: string }) => log.action === "admin.shared_data.view")).toBe(true);
    } finally {
      await app.close();
    }
  });
});