import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { AuthUser } from "../../common/decorators/current-user.decorator.js";
import { DbService } from "../../db/db.service.js";
import { userSettings } from "../../db/schema.js";

@Injectable()
export class UserSettingsService {
  constructor(@Inject(DbService) private readonly db: DbService) {}

  async getSettings(user: AuthUser) {
    const existing = await this.db.db.select().from(userSettings).where(eq(userSettings.userId, user.id)).limit(1);
    if (existing[0]) {
      return existing[0];
    }

    const id = randomUUID();
    await this.db.db.insert(userSettings).values({
      id,
      userId: user.id,
      baseCurrency: "CNY",
      exchangeRateProvider: "mock",
      dataSharingEnabled: false
    });
    const created = await this.db.db.select().from(userSettings).where(eq(userSettings.id, id)).limit(1);
    return created[0]!;
  }

  async updateSettings(
    user: AuthUser,
    input: Partial<{ baseCurrency: string; exchangeRateProvider: string; dataSharingEnabled: boolean; locale: "zh-CN" | "en-US" }>
  ) {
    await this.getSettings(user);
    await this.db.db
      .update(userSettings)
      .set({
        ...input,
        baseCurrency: input.baseCurrency?.toUpperCase(),
        updatedAt: new Date().toISOString()
      })
      .where(eq(userSettings.userId, user.id));

    return this.getSettings(user);
  }
}
