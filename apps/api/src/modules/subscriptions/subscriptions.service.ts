import { randomUUID } from "node:crypto";
import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import type { AuthUser } from "../../common/decorators/current-user.decorator.js";
import { DbService } from "../../db/db.service.js";
import { subscriptionVersions, subscriptions } from "../../db/schema.js";

const billingCycles = ["weekly", "monthly", "quarterly", "yearly", "custom"] as const;
const subscriptionStatuses = ["active", "expired", "paused", "cancelled", "unavailable"] as const;
const currencySchema = z.string().trim().length(3).transform((value) => value.toUpperCase());
const createSubscriptionSchema = z.object({
  name: z.string().trim().min(1).max(160),
  siteUrl: z.string().url().optional().or(z.literal("")).default(""),
  paymentMethod: z.string().trim().max(80).optional().default(""),
  currentCycle: z.enum(billingCycles),
  currentPrice: z.number().nonnegative(),
  currentCurrency: currencySchema.default("CNY"),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  nextDueDate: z.string().datetime(),
  status: z.enum(subscriptionStatuses).default("active"),
  autoRenew: z.boolean().default(false),
  categoryId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional().default(""),
  remindersEnabled: z.boolean().default(true)
});
const updateSubscriptionSchema = createSubscriptionSchema.partial();
type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;

@Injectable()
export class SubscriptionsService {
  constructor(@Inject(DbService) private readonly db: DbService) {}

  parseCreate(body: unknown) {
    return createSubscriptionSchema.parse(body);
  }

  parseUpdate(body: unknown) {
    return updateSubscriptionSchema.parse(body);
  }

  async list(user: AuthUser) {
    return this.db.db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.userId, user.id), isNull(subscriptions.deletedAt)));
  }

  async get(user: AuthUser, id: string) {
    const subscription = await this.findOwned(user, id);
    if (!subscription || subscription.deletedAt) {
      throw new NotFoundException("Subscription not found");
    }
    return subscription;
  }

  async create(user: AuthUser, input: CreateSubscriptionInput) {
    const id = randomUUID();
    const now = new Date().toISOString();
    await this.db.db.insert(subscriptions).values({
      id,
      userId: user.id,
      categoryId: input.categoryId,
      name: input.name,
      siteUrl: input.siteUrl,
      paymentMethod: input.paymentMethod,
      currentCycle: input.currentCycle,
      currentPrice: input.currentPrice,
      currentCurrency: input.currentCurrency,
      startDate: input.startDate,
      endDate: input.endDate,
      nextDueDate: input.nextDueDate,
      status: input.status,
      autoRenew: input.autoRenew,
      remindersEnabled: input.remindersEnabled,
      notes: input.notes,
      version: 1,
      createdAt: now,
      updatedAt: now
    });

    const created = await this.get(user, id);
    await this.writeVersion(created, 1, now);
    return created;
  }

  async update(user: AuthUser, id: string, input: UpdateSubscriptionInput) {
    const current = await this.get(user, id);
    const nextVersion = current.version + 1;
    await this.db.db
      .update(subscriptions)
      .set({
        ...input,
        version: nextVersion,
        updatedAt: new Date().toISOString()
      })
      .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, user.id)));

    const updated = await this.get(user, id);
    await this.writeVersion(updated, nextVersion, new Date().toISOString());
    return updated;
  }

  async softDelete(user: AuthUser, id: string) {
    const current = await this.get(user, id);
    await this.db.db
      .update(subscriptions)
      .set({ deletedAt: new Date().toISOString(), version: current.version + 1, updatedAt: new Date().toISOString() })
      .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, user.id)));
    return { ok: true };
  }

  async versions(user: AuthUser, id: string) {
    await this.get(user, id);
    return this.db.db
      .select()
      .from(subscriptionVersions)
      .where(eq(subscriptionVersions.subscriptionId, id));
  }

  private async findOwned(user: AuthUser, id: string) {
    const rows = await this.db.db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, user.id)))
      .limit(1);
    return rows[0];
  }

  private async writeVersion(subscription: typeof subscriptions.$inferSelect, version: number, effectiveFrom: string) {
    await this.db.db.insert(subscriptionVersions).values({
      id: randomUUID(),
      subscriptionId: subscription.id,
      userId: subscription.userId,
      version,
      name: subscription.name,
      siteUrl: subscription.siteUrl,
      paymentMethod: subscription.paymentMethod,
      billingCycle: subscription.currentCycle,
      price: subscription.currentPrice,
      currency: subscription.currentCurrency,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      status: subscription.status,
      autoRenew: subscription.autoRenew,
      notes: subscription.notes,
      effectiveFrom
    });
  }

  assertOwned(subscription: typeof subscriptions.$inferSelect | undefined, userId: string) {
    if (!subscription || subscription.userId !== userId) {
      throw new ForbiddenException("Subscription is not accessible");
    }
  }
}
