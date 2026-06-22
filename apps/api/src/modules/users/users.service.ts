import { randomUUID } from "node:crypto";
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { DbService } from "../../db/db.service.js";
import { userSettings, users } from "../../db/schema.js";
import { toPublicUser } from "../auth/auth.service.js";

@Injectable()
export class UsersService {
  constructor(@Inject(DbService) private readonly db: DbService) {}

  async listUsers() {
    const rows = await this.db.db.select().from(users);
    return rows.map(toPublicUser);
  }

  async createUser(input: { username: string; displayName: string; password: string; role?: "admin" | "user" }) {
    const existing = await this.db.db.select().from(users).where(eq(users.username, input.username)).limit(1);
    if (existing.length > 0) {
      throw new BadRequestException("Username already exists");
    }

    const userId = randomUUID();
    await this.db.db.insert(users).values({
      id: userId,
      username: input.username,
      displayName: input.displayName,
      passwordHash: await argon2.hash(input.password),
      role: input.role ?? "user",
      status: "active"
    });
    await this.db.db.insert(userSettings).values({
      id: randomUUID(),
      userId,
      baseCurrency: "CNY",
      exchangeRateProvider: "mock",
      dataSharingEnabled: false
    });

    const created = await this.db.db.select().from(users).where(eq(users.id, userId)).limit(1);
    return toPublicUser(created[0]!);
  }

  async updateStatus(id: string, status: "active" | "disabled") {
    await this.db.db.update(users).set({ status, updatedAt: new Date().toISOString() }).where(eq(users.id, id));
    const rows = await this.db.db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!rows[0]) {
      throw new NotFoundException("User not found");
    }
    return toPublicUser(rows[0]);
  }

  async resetPassword(id: string, password: string) {
    await this.db.db
      .update(users)
      .set({ passwordHash: await argon2.hash(password), updatedAt: new Date().toISOString() })
      .where(eq(users.id, id));
    const rows = await this.db.db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!rows[0]) {
      throw new NotFoundException("User not found");
    }
    return toPublicUser(rows[0]);
  }
}
