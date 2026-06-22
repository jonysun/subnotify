import { randomUUID } from "node:crypto";
import { Inject, Injectable, NotImplementedException } from "@nestjs/common";
import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";
import type { AuthUser } from "../../common/decorators/current-user.decorator.js";
import { DbService } from "../../db/db.service.js";
import { payments, subscriptions, syncEvents } from "../../db/schema.js";

const pushSchema = z.object({
  events: z.array(z.object({
    resource: z.string(),
    resourceId: z.string().uuid(),
    version: z.number().int().nonnegative(),
    data: z.record(z.unknown())
  }))
});

@Injectable()
export class SyncService {
  constructor(@Inject(DbService) private readonly db: DbService) {}

  parsePush(body: unknown) { return pushSchema.parse(body); }

  async pull(user: AuthUser, since?: string) {
    const where = since ? and(eq(syncEvents.userId, user.id), gt(syncEvents.createdAt, since)) : eq(syncEvents.userId, user.id);
    const events = await this.db.db.select().from(syncEvents).where(where);
    const cursor = events.reduce((latest, event) => event.createdAt > latest ? event.createdAt : latest, since ?? new Date(0).toISOString());
    return { cursor, events };
  }

  async push(user: AuthUser, input: z.infer<typeof pushSchema>) {
    let applied = 0;
    for (const event of input.events) {
      if (event.resource === "subscriptions") {
        const rows = await this.db.db.select().from(subscriptions).where(and(eq(subscriptions.id, event.resourceId), eq(subscriptions.userId, user.id))).limit(1);
        const current = rows[0];
        if (current && event.version >= current.version) {
          await this.db.db.update(subscriptions).set({ ...(event.data as Partial<typeof subscriptions.$inferInsert>), version: event.version, updatedAt: new Date().toISOString() }).where(eq(subscriptions.id, event.resourceId));
          await this.record(user.id, "subscriptions", event.resourceId, "updated", event.version, event.data);
          applied += 1;
        }
        continue;
      }

      if (event.resource === "payments") {
        const rows = await this.db.db.select().from(payments).where(and(eq(payments.id, event.resourceId), eq(payments.userId, user.id))).limit(1);
        const current = rows[0];
        if (current && event.version >= current.version) {
          await this.db.db.update(payments).set({ ...(event.data as Partial<typeof payments.$inferInsert>), version: event.version, updatedAt: new Date().toISOString() }).where(eq(payments.id, event.resourceId));
          await this.record(user.id, "payments", event.resourceId, "updated", event.version, event.data);
          applied += 1;
        }
        continue;
      }

      throw new NotImplementedException(`Unsupported sync resource: ${event.resource}`);
    }
    return { applied };
  }

  async record(userId: string, resource: string, resourceId: string, operation: "created" | "updated" | "deleted", version: number, data: Record<string, unknown>) {
    await this.db.db.insert(syncEvents).values({ id: randomUUID(), userId, resource, resourceId, operation, version, data });
  }
}