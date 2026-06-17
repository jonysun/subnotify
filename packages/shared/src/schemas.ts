import { z } from "zod";
import { BILLING_CYCLES, NOTIFICATION_CHANNELS, PAYMENT_SOURCES, SUBSCRIPTION_STATUSES } from "./enums.js";

export const currencySchema = z.string().trim().length(3).transform((value) => value.toUpperCase());

export const createSubscriptionSchema = z.object({
  name: z.string().trim().min(1).max(160),
  siteUrl: z.string().url().optional().or(z.literal("")).default(""),
  paymentMethod: z.string().trim().max(80).optional().default(""),
  currentCycle: z.enum(BILLING_CYCLES),
  currentPrice: z.number().nonnegative(),
  currentCurrency: currencySchema.default("CNY"),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  nextDueDate: z.string().datetime(),
  status: z.enum(SUBSCRIPTION_STATUSES).default("active"),
  autoRenew: z.boolean().default(false),
  categoryId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional().default(""),
  remindersEnabled: z.boolean().default(true)
});

export const createPaymentSchema = z.object({
  subscriptionId: z.string().uuid().optional(),
  paidAt: z.string().datetime(),
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
  originalAmount: z.number().nonnegative(),
  originalCurrency: currencySchema,
  baseAmount: z.number().nonnegative().optional(),
  baseCurrency: currencySchema.default("CNY"),
  isBaseAmountManual: z.boolean().default(false),
  paymentMethodSnapshot: z.string().max(80).optional().default(""),
  cycleSnapshot: z.enum(BILLING_CYCLES).optional(),
  source: z.enum(PAYMENT_SOURCES).default("manual"),
  notes: z.string().max(2000).optional().default("")
});

export const createNotificationChannelSchema = z.object({
  type: z.enum(NOTIFICATION_CHANNELS),
  name: z.string().trim().min(1).max(120),
  enabled: z.boolean().default(true),
  config: z.record(z.unknown())
});
