import { randomUUID } from "node:crypto";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import type { AuthUser } from "../../common/decorators/current-user.decorator.js";
import { DbService } from "../../db/db.service.js";
import { notificationChannels, notificationLogs, reminderRules, subscriptions } from "../../db/schema.js";
import { NotificationsService } from "../notifications/notifications.service.js";

const createRuleSchema = z.object({
  subscriptionId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  daysBefore: z.number().int().min(0).max(365).optional(),
  type: z.enum(["before_expiry", "on_expiry", "after_expiry"]).default("before_expiry"),
  value: z.number().int().min(0).max(365).default(0),
  unit: z.enum(["days", "hours"]).default("days"),
  repeatIntervalHours: z.number().int().min(0).max(720).default(0),
  repeatUntil: z.enum(["renewed", "acknowledged", "never"]).default("renewed"),
  enabled: z.boolean().default(true),
  channelIds: z.array(z.string().uuid()).default([])
});
const updateRuleSchema = createRuleSchema.partial();
const replaceSubscriptionRulesSchema = z.object({ rules: z.array(createRuleSchema.omit({ subscriptionId: true })).max(20) });

type CreateRuleInput = z.infer<typeof createRuleSchema>;
type UpdateRuleInput = z.infer<typeof updateRuleSchema>;

@Injectable()
export class RemindersService {
  constructor(
    @Inject(DbService) private readonly db: DbService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService
  ) {}

  parseCreate(body: unknown) {
    return createRuleSchema.parse(body);
  }

  parseUpdate(body: unknown) {
    return updateRuleSchema.parse(body);
  }

  parseReplaceSubscriptionRules(body: unknown) {
    return replaceSubscriptionRulesSchema.parse(body);
  }

  async list(user: AuthUser) {
    return this.db.db.select().from(reminderRules).where(eq(reminderRules.userId, user.id));
  }

  async create(user: AuthUser, input: CreateRuleInput) {
    const id = randomUUID();
    await this.db.db.insert(reminderRules).values({ id, userId: user.id, ...this.normalizeCreateRuleInput(input) });
    return this.get(user, id);
  }

  async update(user: AuthUser, id: string, input: UpdateRuleInput) {
    await this.get(user, id);
    await this.db.db.update(reminderRules).set({ ...this.normalizeRuleInput(input), updatedAt: new Date().toISOString() }).where(eq(reminderRules.id, id));
    return this.get(user, id);
  }

  async listForSubscription(user: AuthUser, subscriptionId: string) {
    await this.assertSubscriptionOwned(user.id, subscriptionId);
    const rules = await this.db.db.select().from(reminderRules).where(and(eq(reminderRules.userId, user.id), eq(reminderRules.subscriptionId, subscriptionId)));
    return { rules };
  }

  async replaceForSubscription(user: AuthUser, subscriptionId: string, input: z.infer<typeof replaceSubscriptionRulesSchema>) {
    await this.assertSubscriptionOwned(user.id, subscriptionId);
    await this.db.db.delete(reminderRules).where(and(eq(reminderRules.userId, user.id), eq(reminderRules.subscriptionId, subscriptionId)));
    for (const rule of input.rules) {
      await this.db.db.insert(reminderRules).values({
        id: randomUUID(),
        userId: user.id,
        subscriptionId,
        ...this.normalizeCreateRuleInput({ ...rule, subscriptionId })
      });
    }
    return this.listForSubscription(user, subscriptionId);
  }

  async delete(user: AuthUser, id: string) {
    await this.get(user, id);
    await this.db.db.update(reminderRules).set({ enabled: false, updatedAt: new Date().toISOString() }).where(eq(reminderRules.id, id));
    return { ok: true };
  }

  async run(user: AuthUser, now = new Date()) {
    const activeSubscriptions = await this.db.db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.userId, user.id), eq(subscriptions.status, "active"), eq(subscriptions.remindersEnabled, true), isNull(subscriptions.deletedAt)));

    let logged = 0;
    for (const subscription of activeSubscriptions) {
      const dueRules = await this.rulesForSubscription(user.id, subscription.id);
      for (const rule of dueRules) {
        const bucket = this.reminderBucket(subscription.nextDueDate, now, rule);
        if (!bucket) {
          continue;
        }

        const sentAt = bucket;
        const duplicate = await this.db.db
          .select()
          .from(notificationLogs)
          .where(
            and(
              eq(notificationLogs.userId, user.id),
              eq(notificationLogs.subscriptionId, subscription.id),
              eq(notificationLogs.reminderRuleId, rule.id),
              eq(notificationLogs.type, "subscription_reminder"),
              eq(notificationLogs.sentAt, sentAt)
            )
          )
          .limit(1);
        if (duplicate[0]) {
          continue;
        }

        const channelIds = (rule.channelIds as string[]) ?? [];
        if (channelIds.length === 0) {
          await this.notifications.sendToChannel(
            user.id,
            null,
            "webhook",
            { url: "dry-run" },
            { title: `Subscription due: ${subscription.name}`, body: `${subscription.name} is due on ${subscription.nextDueDate}` },
            "subscription_reminder",
            subscription.id,
            rule.id,
            sentAt
          );
          logged += 1;
          continue;
        }

        for (const channelId of channelIds) {
          const channelRows = await this.db.db
            .select()
            .from(notificationChannels)
            .where(and(eq(notificationChannels.id, channelId), eq(notificationChannels.userId, user.id), isNull(notificationChannels.deletedAt)))
            .limit(1);
          const channel = channelRows[0];
          if (!channel || !channel.enabled) {
            continue;
          }
          await this.notifications.sendToChannel(
            user.id,
            channel.id,
            channel.type,
            channel.config as Record<string, unknown>,
            { title: `Subscription due: ${subscription.name}`, body: `${subscription.name} is due on ${subscription.nextDueDate}` },
            "subscription_reminder",
            subscription.id,
            rule.id,
            sentAt
          );
          logged += 1;
        }
      }
    }

    return { scanned: activeSubscriptions.length, logged };
  }

  @Cron("0 8 * * *")
  async scheduledScan() {
    return { ok: true };
  }

  private async get(user: AuthUser, id: string) {
    const rows = await this.db.db.select().from(reminderRules).where(and(eq(reminderRules.id, id), eq(reminderRules.userId, user.id))).limit(1);
    if (!rows[0]) {
      throw new NotFoundException("Reminder rule not found");
    }
    return rows[0];
  }

  private normalizeCreateRuleInput(input: CreateRuleInput) {
    const daysBefore = input.daysBefore ?? (input.type === "before_expiry" ? input.value ?? 0 : 0);
    return {
      ...input,
      daysBefore,
      value: input.value ?? daysBefore,
      type: input.type ?? "before_expiry",
      unit: input.unit ?? "days",
      repeatIntervalHours: input.repeatIntervalHours ?? 0,
      repeatUntil: input.repeatUntil ?? "renewed"
    };
  }

  private normalizeRuleInput(input: Partial<CreateRuleInput>) {
    const next: Partial<CreateRuleInput> = { ...input };
    if (input.daysBefore !== undefined || input.value !== undefined || input.type !== undefined) {
      const daysBefore = input.daysBefore ?? (input.type === "before_expiry" ? input.value ?? 0 : undefined);
      if (daysBefore !== undefined) next.daysBefore = daysBefore;
      const value = input.value ?? input.daysBefore;
      if (value !== undefined) next.value = value;
    }
    return next;
  }

  private reminderBucket(nextDueDate: string, now: Date, rule: typeof reminderRules.$inferSelect) {
    const due = new Date(nextDueDate);
    const deltaMs = due.getTime() - now.getTime();
    const daysUntilDue = Math.ceil(deltaMs / 86_400_000);
    if (rule.type === "before_expiry") {
      return daysUntilDue > 0 && daysUntilDue <= rule.daysBefore ? now.toISOString() : null;
    }
    if (rule.type === "on_expiry") {
      const sameUtcDay = due.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
      return sameUtcDay ? now.toISOString() : null;
    }
    if (rule.type === "after_expiry") {
      if (now.getTime() < due.getTime()) return null;
      const interval = Math.max(1, rule.repeatIntervalHours || 24);
      const elapsedHours = Math.floor((now.getTime() - due.getTime()) / 3_600_000);
      const bucketStart = Math.floor(elapsedHours / interval) * interval;
      const bucket = new Date(due.getTime());
      bucket.setUTCHours(bucket.getUTCHours() + bucketStart, 0, 0, 0);
      return bucket.toISOString();
    }
    return null;
  }

  private async assertSubscriptionOwned(userId: string, subscriptionId: string) {
    const rows = await this.db.db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.userId, userId), isNull(subscriptions.deletedAt)))
      .limit(1);
    if (!rows[0]) throw new NotFoundException("Subscription not found");
  }

  private async rulesForSubscription(userId: string, subscriptionId: string) {
    const specific = await this.db.db
      .select()
      .from(reminderRules)
      .where(and(eq(reminderRules.userId, userId), eq(reminderRules.subscriptionId, subscriptionId), eq(reminderRules.enabled, true)));
    if (specific.length > 0) {
      return specific;
    }
    return this.db.db
      .select()
      .from(reminderRules)
      .where(and(eq(reminderRules.userId, userId), isNull(reminderRules.subscriptionId), eq(reminderRules.enabled, true)));
  }
}
