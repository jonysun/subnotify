import { randomUUID } from "node:crypto";
import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import type { AuthUser } from "../../common/decorators/current-user.decorator.js";
import { DbService } from "../../db/db.service.js";
import { categories, subscriptionTags, subscriptionVersions, subscriptions, syncEvents, tags } from "../../db/schema.js";
import { PaymentsService } from "../payments/payments.service.js";

const billingCycles = ["weekly", "monthly", "quarterly", "yearly", "custom", "one_time"] as const;
const subscriptionStatuses = ["active", "expired", "paused", "cancelled", "unavailable"] as const;
const currencySchema = z.string().trim().length(3).transform((value) => value.toUpperCase());
const namesSchema = z.array(z.string().trim().min(1).max(40)).max(12).optional().default([]);
const createSubscriptionSchema = z.object({
  name: z.string().trim().min(1).max(160),
  siteUrl: z.string().url().optional().or(z.literal("")).default(""),
  paymentMethod: z.string().trim().max(80).optional().default(""),
  currentCycle: z.enum(billingCycles),
  currentPrice: z.number().nonnegative(),
  currentCurrency: currencySchema.default("CNY"),
  introPeriods: z.number().int().nonnegative().optional().default(0),
  introPrice: z.number().nonnegative().optional().default(0),
  renewalPrice: z.number().nonnegative().optional().default(0),
  renewalCurrency: currencySchema.optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  nextDueDate: z.string().datetime(),
  status: z.enum(subscriptionStatuses).default("active"),
  autoRenew: z.boolean().default(false),
  categoryId: z.string().uuid().optional(),
  categoryName: z.string().trim().min(1).max(40).optional().or(z.literal("")),
  tagNames: namesSchema,
  notes: z.string().max(2000).optional().default(""),
  remindersEnabled: z.boolean().default(true),
  initialPaymentPaid: z.boolean().default(false)
});
const updateSubscriptionSchema = createSubscriptionSchema.partial();
type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;

@Injectable()
export class SubscriptionsService {
  constructor(
    @Inject(DbService) private readonly db: DbService,
    @Inject(PaymentsService) private readonly payments: PaymentsService
  ) {}

  parseCreate(body: unknown) {
    return createSubscriptionSchema.parse(body);
  }

  parseUpdate(body: unknown) {
    return updateSubscriptionSchema.parse(body);
  }

  async list(user: AuthUser) {
    const rows = await this.db.db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.userId, user.id), isNull(subscriptions.deletedAt)));
    return this.hydrateRows(user.id, rows);
  }

  async get(user: AuthUser, id: string) {
    const subscription = await this.findOwned(user, id);
    if (!subscription || subscription.deletedAt) {
      throw new NotFoundException("Subscription not found");
    }
    return this.hydrateRow(user.id, subscription);
  }

  async create(user: AuthUser, input: CreateSubscriptionInput) {
    const id = randomUUID();
    const now = new Date().toISOString();
    const categoryId = await this.resolveCategoryId(user.id, input.categoryId, input.categoryName);
    await this.db.db.insert(subscriptions).values({
      id,
      userId: user.id,
      categoryId,
      name: input.name,
      siteUrl: input.siteUrl,
      paymentMethod: input.paymentMethod,
      currentCycle: input.currentCycle,
      currentPrice: input.currentPrice,
      currentCurrency: input.currentCurrency,
      introPeriods: input.introPeriods,
      introPrice: input.introPrice,
      renewalPrice: input.renewalPrice,
      renewalCurrency: input.renewalCurrency ?? input.currentCurrency,
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
    await this.replaceTags(user.id, id, input.tagNames);

    const created = await this.get(user, id);
    await this.writeVersion(created, 1, now);
    if (input.initialPaymentPaid) {
      await this.payments.create(user, {
        subscriptionId: id,
        paidAt: input.startDate,
        periodStart: input.startDate,
        periodEnd: input.nextDueDate,
        originalAmount: input.introPeriods > 0 && input.introPrice > 0 ? input.introPrice : input.currentPrice,
        originalCurrency: input.currentCurrency,
        isBaseAmountManual: false,
        paymentMethodSnapshot: input.paymentMethod,
        cycleSnapshot: input.currentCycle,
        source: "manual",
        notes: "Initial period payment"
      });
    }
    await this.db.db.insert(syncEvents).values({ id: randomUUID(), userId: user.id, resource: "subscriptions", resourceId: id, operation: "created", version: 1, data: created });
    return created;
  }

  async update(user: AuthUser, id: string, input: UpdateSubscriptionInput) {
    const current = await this.get(user, id);
    const nextVersion = current.version + 1;
    const { initialPaymentPaid: _initialPaymentPaid, categoryName, tagNames, ...rawValues } = input;
    const values = {
      ...rawValues,
      ...(input.categoryId !== undefined || categoryName !== undefined
        ? { categoryId: await this.resolveCategoryId(user.id, input.categoryId, categoryName) }
        : {})
    };
    await this.db.db
      .update(subscriptions)
      .set({
        ...values,
        version: nextVersion,
        updatedAt: new Date().toISOString()
      })
      .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, user.id)));
    if (tagNames !== undefined) {
      await this.replaceTags(user.id, id, tagNames);
    }

    const updated = await this.get(user, id);
    await this.writeVersion(updated, nextVersion, new Date().toISOString());
    await this.db.db.insert(syncEvents).values({ id: randomUUID(), userId: user.id, resource: "subscriptions", resourceId: id, operation: "updated", version: nextVersion, data: updated });
    return updated;
  }

  async softDelete(user: AuthUser, id: string) {
    const current = await this.get(user, id);
    await this.db.db
      .update(subscriptions)
      .set({ deletedAt: new Date().toISOString(), version: current.version + 1, updatedAt: new Date().toISOString() })
      .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, user.id)));
    await this.db.db.insert(syncEvents).values({ id: randomUUID(), userId: user.id, resource: "subscriptions", resourceId: id, operation: "deleted", version: current.version + 1, data: { id, deletedAt: new Date().toISOString() } });
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

  private async hydrateRows(userId: string, rows: Array<typeof subscriptions.$inferSelect>) {
    if (rows.length === 0) return [];
    const categoryIds = [...new Set(rows.map((row) => row.categoryId).filter(Boolean))] as string[];
    const categoryRows =
      categoryIds.length > 0
        ? await this.db.db.select().from(categories).where(and(eq(categories.userId, userId), inArray(categories.id, categoryIds), isNull(categories.deletedAt)))
        : [];
    const categoryById = new Map(categoryRows.map((category) => [category.id, category]));
    const subscriptionIds = rows.map((row) => row.id);
    const tagRows = await this.db.db
      .select({ subscriptionId: subscriptionTags.subscriptionId, id: tags.id, name: tags.name, color: tags.color })
      .from(subscriptionTags)
      .innerJoin(tags, eq(subscriptionTags.tagId, tags.id))
      .where(and(inArray(subscriptionTags.subscriptionId, subscriptionIds), eq(tags.userId, userId), isNull(tags.deletedAt)));
    const tagsBySubscription = new Map<string, Array<{ id: string; name: string; color: string }>>();
    for (const tag of tagRows) {
      const list = tagsBySubscription.get(tag.subscriptionId) ?? [];
      list.push({ id: tag.id, name: tag.name, color: tag.color });
      tagsBySubscription.set(tag.subscriptionId, list);
    }
    return rows.map((row) => ({
      ...row,
      category: row.categoryId ? categoryById.get(row.categoryId) ?? null : null,
      tags: tagsBySubscription.get(row.id) ?? []
    }));
  }

  private async hydrateRow(userId: string, row: typeof subscriptions.$inferSelect) {
    const rows = await this.hydrateRows(userId, [row]);
    return rows[0];
  }

  private async resolveCategoryId(userId: string, categoryId?: string, categoryName?: string) {
    if (categoryId) {
      const existing = await this.db.db
        .select()
        .from(categories)
        .where(and(eq(categories.id, categoryId), eq(categories.userId, userId), isNull(categories.deletedAt)))
        .limit(1);
      if (!existing[0]) throw new NotFoundException("Category not found");
      return categoryId;
    }
    const name = categoryName?.trim();
    if (!name) return undefined;
    const existing = await this.db.db
      .select()
      .from(categories)
      .where(and(eq(categories.userId, userId), eq(categories.name, name), isNull(categories.deletedAt)))
      .limit(1);
    if (existing[0]) return existing[0].id;
    const id = randomUUID();
    await this.db.db.insert(categories).values({ id, userId, name, color: "#4f46e5" });
    return id;
  }

  private async replaceTags(userId: string, subscriptionId: string, tagNames: string[]) {
    await this.db.db.delete(subscriptionTags).where(eq(subscriptionTags.subscriptionId, subscriptionId));
    const uniqueNames = [...new Set(tagNames.map((name) => name.trim()).filter(Boolean))];
    for (const name of uniqueNames) {
      const existing = await this.db.db
        .select()
        .from(tags)
        .where(and(eq(tags.userId, userId), eq(tags.name, name), isNull(tags.deletedAt)))
        .limit(1);
      const tagId = existing[0]?.id ?? randomUUID();
      if (!existing[0]) {
        await this.db.db.insert(tags).values({ id: tagId, userId, name, color: "#0f766e" });
      }
      await this.db.db.insert(subscriptionTags).values({ subscriptionId, tagId }).onConflictDoNothing();
    }
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
      introPeriods: subscription.introPeriods,
      introPrice: subscription.introPrice,
      renewalPrice: subscription.renewalPrice,
      renewalCurrency: subscription.renewalCurrency,
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
