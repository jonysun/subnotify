import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import type { AuthUser } from "../../common/decorators/current-user.decorator.js";
import { DbService } from "../../db/db.service.js";
import { categories, payments, schedulerLogs, subscriptions } from "../../db/schema.js";

type PaymentRow = typeof payments.$inferSelect;
type SubscriptionRow = typeof subscriptions.$inferSelect;

@Injectable()
export class DashboardService {
  constructor(@Inject(DbService) private readonly db: DbService) {}

  async stats(user: AuthUser, nowInput?: string) {
    const now = nowInput ? new Date(nowInput) : new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const nextYearStart = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1));
    const recentStart = this.addDays(now, -7);
    const soonEnd = this.addDays(now, 7);

    const [subscriptionRows, paymentRows, categoryRows, schedulerRows] = await Promise.all([
      this.db.db.select().from(subscriptions).where(and(eq(subscriptions.userId, user.id), isNull(subscriptions.deletedAt))),
      this.db.db.select().from(payments).where(and(eq(payments.userId, user.id), isNull(payments.deletedAt))),
      this.db.db.select().from(categories).where(and(eq(categories.userId, user.id), isNull(categories.deletedAt))),
      this.db.db.select().from(schedulerLogs).where(eq(schedulerLogs.userId, user.id))
    ]);
    const schedulerStatusHistory = schedulerRows.sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 10);
    const latestScheduler = schedulerStatusHistory[0];

    const subscriptionById = new Map(subscriptionRows.map((subscription) => [subscription.id, subscription]));
    const categoryById = new Map(categoryRows.map((category) => [category.id, category]));
    const paymentsThisMonth = paymentRows.filter((payment) => this.isWithin(payment.paidAt, monthStart, nextMonthStart));
    const paymentsThisYear = paymentRows.filter((payment) => this.isWithin(payment.paidAt, yearStart, nextYearStart));
    const monthlyAmount = this.sum(paymentsThisMonth);
    const yearlyAmount = this.sum(paymentsThisYear);
    const activeSubscriptions = subscriptionRows.filter((subscription) => subscription.status === "active");
    const expiringSoon = activeSubscriptions.filter((subscription) => this.isWithin(subscription.nextDueDate, now, soonEnd));

    return {
      monthlyExpense: { amount: monthlyAmount, currency: this.pickCurrency(paymentsThisMonth, paymentRows) },
      yearlyExpense: { amount: yearlyAmount, monthlyAverage: Number((yearlyAmount / 12).toFixed(2)), currency: this.pickCurrency(paymentsThisYear, paymentRows) },
      activeSubscriptions: { active: activeSubscriptions.length, total: subscriptionRows.length, expiringSoon: expiringSoon.length },
      recentPayments: paymentRows
        .filter((payment) => this.isWithin(payment.paidAt, recentStart, now, true))
        .sort((a, b) => b.paidAt.localeCompare(a.paidAt))
        .slice(0, 8)
        .map((payment) => this.paymentSummary(payment, subscriptionById.get(payment.subscriptionId ?? ""))),
      upcomingRenewals: activeSubscriptions
        .filter((subscription) => this.isWithin(subscription.nextDueDate, now, soonEnd, true))
        .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))
        .slice(0, 8)
        .map((subscription) => this.renewalSummary(subscription, now)),
      expenseByCategory: this.expenseByCategory(paymentsThisYear, subscriptionById, categoryById),
      expenseByType: this.expenseByType(paymentsThisYear, subscriptionById),
      schedulerStatus: latestScheduler
        ? {
            lastRunAt: latestScheduler.startedAt,
            checkedSubscriptions: latestScheduler.checkedCount,
            expiringMatched: latestScheduler.matchedCount,
            dedupedCount: latestScheduler.dedupedCount,
            sentCount: latestScheduler.sentCount,
            failedCount: latestScheduler.failedCount,
            status: latestScheduler.status,
            reason: latestScheduler.reason,
            extra: latestScheduler.metadata
          }
        : null,
      schedulerStatusHistory
    };
  }

  private paymentSummary(payment: PaymentRow, subscription?: SubscriptionRow) {
    return {
      id: payment.id,
      subscriptionId: payment.subscriptionId,
      name: subscription?.name ?? "未关联支付",
      amount: payment.baseAmount,
      currency: payment.baseCurrency,
      originalAmount: payment.originalAmount,
      originalCurrency: payment.originalCurrency,
      paidAt: payment.paidAt,
      source: payment.source
    };
  }

  private renewalSummary(subscription: SubscriptionRow, now: Date) {
    const amount = subscription.renewalPrice > 0 ? subscription.renewalPrice : subscription.currentPrice;
    const currency = subscription.renewalPrice > 0 ? subscription.renewalCurrency : subscription.currentCurrency;
    return {
      id: subscription.id,
      name: subscription.name,
      amount,
      currency,
      renewalDate: subscription.nextDueDate,
      daysUntilRenewal: Math.ceil((new Date(subscription.nextDueDate).getTime() - now.getTime()) / 86_400_000),
      autoRenew: subscription.autoRenew
    };
  }

  private expenseByCategory(
    paymentRows: PaymentRow[],
    subscriptionById: Map<string, SubscriptionRow>,
    categoryById: Map<string, typeof categories.$inferSelect>
  ) {
    const totals = new Map<string, number>();
    for (const payment of paymentRows) {
      const subscription = subscriptionById.get(payment.subscriptionId ?? "");
      const category = subscription?.categoryId ? categoryById.get(subscription.categoryId)?.name : undefined;
      const key = category || "未分类";
      totals.set(key, (totals.get(key) ?? 0) + payment.baseAmount);
    }
    return this.rank(totals, this.sum(paymentRows), "category");
  }

  private expenseByType(paymentRows: PaymentRow[], subscriptionById: Map<string, SubscriptionRow>) {
    const totals = new Map<string, number>();
    for (const payment of paymentRows) {
      const subscription = subscriptionById.get(payment.subscriptionId ?? "");
      const key = this.cycleLabel(subscription?.currentCycle ?? payment.cycleSnapshot ?? "custom");
      totals.set(key, (totals.get(key) ?? 0) + payment.baseAmount);
    }
    return this.rank(totals, this.sum(paymentRows), "type");
  }

  private rank(totals: Map<string, number>, total: number, keyName: "category" | "type") {
    return [...totals.entries()]
      .map(([label, amount]) => ({
        [keyName]: label,
        amount: Number(amount.toFixed(2)),
        percentage: total > 0 ? Number(((amount / total) * 100).toFixed(2)) : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  private sum(paymentRows: PaymentRow[]) {
    return Number(paymentRows.reduce((total, payment) => total + payment.baseAmount, 0).toFixed(2));
  }

  private pickCurrency(preferred: PaymentRow[], fallback: PaymentRow[]) {
    return preferred[0]?.baseCurrency ?? fallback[0]?.baseCurrency ?? "CNY";
  }

  private isWithin(value: string, start: Date, end: Date, includeEnd = false) {
    const timestamp = new Date(value).getTime();
    return timestamp >= start.getTime() && (includeEnd ? timestamp <= end.getTime() : timestamp < end.getTime());
  }

  private addDays(value: Date, days: number) {
    return new Date(value.getTime() + days * 86_400_000);
  }

  private cycleLabel(cycle: string) {
    const labels: Record<string, string> = {
      weekly: "周付",
      monthly: "月付",
      quarterly: "季付",
      yearly: "年付",
      custom: "自定义",
      one_time: "一次性"
    };
    return labels[cycle] ?? cycle;
  }
}
