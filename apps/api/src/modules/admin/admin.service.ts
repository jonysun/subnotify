import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { and, eq, isNull } from "drizzle-orm";
import type { AuthUser } from "../../common/decorators/current-user.decorator.js";
import type { AppEnv } from "../../config/env.js";
import { DbService } from "../../db/db.service.js";
import { payments, subscriptions, userSettings, users } from "../../db/schema.js";
import { AuditService } from "../audit/audit.service.js";

@Injectable()
export class AdminService {
  constructor(
    @Inject(DbService) private readonly db: DbService,
    @Inject(ConfigService) private readonly config: ConfigService<AppEnv, true>,
    @Inject(AuditService) private readonly audit: AuditService
  ) {}

  async system() {
    const userCount = await this.db.db.select().from(users);
    return {
      databaseDriver: this.config.get("DB_DRIVER", { infer: true }),
      appVersion: "0.1.0",
      storagePath: this.config.get("DATABASE_URL", { infer: true }),
      userCount: userCount.length
    };
  }

  async sharedUsers() {
    const rows = await this.db.db
      .select({ id: users.id, username: users.username, displayName: users.displayName, role: users.role, status: users.status })
      .from(users)
      .innerJoin(userSettings, eq(userSettings.userId, users.id))
      .where(eq(userSettings.dataSharingEnabled, true));
    return rows;
  }

  async sharedSubscriptions(actor: AuthUser, userId: string) {
    await this.assertSharing(userId);
    await this.audit.record(actor.id, "admin.shared_data.view", "subscriptions", userId, {});
    return this.db.db.select().from(subscriptions).where(and(eq(subscriptions.userId, userId), isNull(subscriptions.deletedAt)));
  }

  async sharedPayments(actor: AuthUser, userId: string) {
    await this.assertSharing(userId);
    await this.audit.record(actor.id, "admin.shared_data.view", "payments", userId, {});
    return this.db.db.select().from(payments).where(and(eq(payments.userId, userId), isNull(payments.deletedAt)));
  }

  async auditLogs() {
    return this.audit.list();
  }

  private async assertSharing(userId: string) {
    const rows = await this.db.db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
    if (!rows[0]?.dataSharingEnabled) {
      throw new ForbiddenException("User has not enabled data sharing");
    }
  }
}