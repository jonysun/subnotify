import { randomUUID } from "node:crypto";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import type { AuthUser } from "../../common/decorators/current-user.decorator.js";
import { DbService } from "../../db/db.service.js";
import { payments, subscriptions, syncEvents, userSettings } from "../../db/schema.js";
import { ExchangeRatesService } from "../exchange-rates/exchange-rates.service.js";

const billingCycles = ["weekly", "monthly", "quarterly", "yearly", "custom"] as const;
const currencySchema = z.string().trim().length(3).transform((value) => value.toUpperCase());
const createPaymentSchema = z.object({
  subscriptionId: z.string().uuid().optional(),
  paidAt: z.string().datetime(),
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
  originalAmount: z.number().nonnegative(),
  originalCurrency: currencySchema,
  baseAmount: z.number().nonnegative().optional(),
  baseCurrency: currencySchema.optional(),
  isBaseAmountManual: z.boolean().default(false),
  paymentMethodSnapshot: z.string().max(80).optional().default(""),
  cycleSnapshot: z.enum(billingCycles).optional(),
  source: z.enum(["manual", "auto_renewal", "imported"]).default("manual"),
  notes: z.string().max(2000).optional().default("")
});
const updatePaymentSchema = createPaymentSchema.partial();
type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(DbService) private readonly db: DbService,
    @Inject(ExchangeRatesService) private readonly exchangeRates: ExchangeRatesService
  ) {}

  parseCreate(body: unknown) {
    return createPaymentSchema.parse(body);
  }

  parseUpdate(body: unknown) {
    return updatePaymentSchema.parse(body);
  }

  async list(user: AuthUser) {
    return this.db.db
      .select()
      .from(payments)
      .where(and(eq(payments.userId, user.id), isNull(payments.deletedAt)));
  }

  async get(user: AuthUser, id: string) {
    const rows = await this.db.db
      .select()
      .from(payments)
      .where(and(eq(payments.id, id), eq(payments.userId, user.id), isNull(payments.deletedAt)))
      .limit(1);
    if (!rows[0]) {
      throw new NotFoundException("Payment not found");
    }
    return rows[0];
  }

  async create(user: AuthUser, input: CreatePaymentInput) {
    const values = await this.prepareValues(user, input);
    const id = randomUUID();
    await this.db.db.insert(payments).values({ id, userId: user.id, ...values });
    const created = await this.get(user, id);
    await this.db.db.insert(syncEvents).values({ id: randomUUID(), userId: user.id, resource: "payments", resourceId: id, operation: "created", version: created.version, data: created });
    return created;
  }

  async update(user: AuthUser, id: string, input: UpdatePaymentInput) {
    await this.get(user, id);
    const values = await this.prepareValues(user, input);
    await this.db.db.update(payments).set({ ...values, version: 2, updatedAt: new Date().toISOString() }).where(eq(payments.id, id));
    const updated = await this.get(user, id);
    await this.db.db.insert(syncEvents).values({ id: randomUUID(), userId: user.id, resource: "payments", resourceId: id, operation: "updated", version: updated.version, data: updated });
    return updated;
  }

  async softDelete(user: AuthUser, id: string) {
    await this.get(user, id);
    await this.db.db.update(payments).set({ deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).where(eq(payments.id, id));
    await this.db.db.insert(syncEvents).values({ id: randomUUID(), userId: user.id, resource: "payments", resourceId: id, operation: "deleted", version: 1, data: { id, deletedAt: new Date().toISOString() } });
    return { ok: true };
  }

  async createAutoRenewal(input: {
    userId: string;
    subscriptionId: string;
    paidAt: string;
    periodStart: string;
    periodEnd: string;
    originalAmount: number;
    originalCurrency: string;
    paymentMethodSnapshot: string;
    cycleSnapshot: "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
  }) {
    const user = { id: input.userId, username: "", role: "user", status: "active" } as const;
    return this.create(user, { ...input, isBaseAmountManual: false, source: "auto_renewal", notes: "Automatic renewal" });
  }

  private async prepareValues(user: AuthUser, input: Partial<CreatePaymentInput>) {
    if (!input.paidAt || input.originalAmount === undefined || !input.originalCurrency) {
      throw new NotFoundException("Payment fields are incomplete");
    }

    const settingsRows = await this.db.db.select().from(userSettings).where(eq(userSettings.userId, user.id)).limit(1);
    const baseCurrency = input.baseCurrency ?? settingsRows[0]?.baseCurrency ?? "CNY";
    const provider = settingsRows[0]?.exchangeRateProvider ?? "mock";
    const rateRow = await this.exchangeRates.getRate(input.originalCurrency, baseCurrency, provider, new Date(input.paidAt));
    const baseAmount =
      input.isBaseAmountManual && input.baseAmount !== undefined
        ? input.baseAmount
        : Number((input.originalAmount * rateRow.rate).toFixed(2));

    const subscription = input.subscriptionId ? await this.getOwnedSubscription(user.id, input.subscriptionId) : undefined;

    return {
      subscriptionId: input.subscriptionId,
      paidAt: input.paidAt,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      originalAmount: input.originalAmount,
      originalCurrency: input.originalCurrency,
      baseAmount,
      baseCurrency,
      exchangeRate: Number((baseAmount / input.originalAmount).toFixed(6)),
      exchangeRateProvider: provider,
      isBaseAmountManual: input.isBaseAmountManual ?? false,
      paymentMethodSnapshot: input.paymentMethodSnapshot || subscription?.paymentMethod || "",
      cycleSnapshot: input.cycleSnapshot || subscription?.currentCycle,
      source: input.source ?? "manual",
      notes: input.notes ?? ""
    };
  }

  private async getOwnedSubscription(userId: string, id: string) {
    const rows = await this.db.db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId), isNull(subscriptions.deletedAt)))
      .limit(1);
    if (!rows[0]) {
      throw new NotFoundException("Subscription not found");
    }
    return rows[0];
  }
}
