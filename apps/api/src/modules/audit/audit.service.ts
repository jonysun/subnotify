import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { desc } from "drizzle-orm";
import { DbService } from "../../db/db.service.js";
import { auditLogs } from "../../db/schema.js";

@Injectable()
export class AuditService {
  constructor(@Inject(DbService) private readonly db: DbService) {}

  async record(actorId: string | null, action: string, targetType: string, targetId = "", metadata: Record<string, unknown> = {}) {
    const id = randomUUID();
    await this.db.db.insert(auditLogs).values({ id, actorId, action, targetType, targetId, metadata });
    return id;
  }

  async list() {
    return this.db.db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));
  }
}