import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull, lte } from "drizzle-orm";
import { DbService } from "../../db/db.service.js";
import { payments, subscriptions } from "../../db/schema.js";
import { PaymentsService } from "../payments/payments.service.js";
import { advanceDueDate } from "./billing-cycle.js";

@Injectable()
export class AutoRenewService {
  constructor(
    @Inject(DbService) private readonly db: DbService,
    @Inject(PaymentsService) private readonly paymentsService: PaymentsService
  ) {}

  async processDueSubscriptions(now = new Date()) {
    const due = await this.db.db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, "active"),
          isNull(subscriptions.deletedAt),
          lte(subscriptions.nextDueDate, now.toISOString())
        )
      );

    for (const subscription of due) {
      if (!subscription.autoRenew) {
        await this.db.db
          .update(subscriptions)
          .set({ status: "expired", updatedAt: now.toISOString(), version: subscription.version + 1 })
          .where(eq(subscriptions.id, subscription.id));
        continue;
      }

      const periodStart = subscription.nextDueDate;
      const nextDueDate = advanceDueDate(new Date(subscription.nextDueDate), subscription.currentCycle).toISOString();
      const existingPayment = await this.db.db
        .select()
        .from(payments)
        .where(and(eq(payments.subscriptionId, subscription.id), eq(payments.source, "auto_renewal"), eq(payments.periodStart, periodStart)))
        .limit(1);

      if (existingPayment.length === 0) {
        await this.paymentsService.createAutoRenewal({
          userId: subscription.userId,
          subscriptionId: subscription.id,
          paidAt: subscription.nextDueDate,
          periodStart,
          periodEnd: nextDueDate,
          originalAmount: subscription.currentPrice,
          originalCurrency: subscription.currentCurrency,
          paymentMethodSnapshot: subscription.paymentMethod,
          cycleSnapshot: subscription.currentCycle
        });
      }

      await this.db.db
        .update(subscriptions)
        .set({ nextDueDate, status: "active", updatedAt: now.toISOString(), version: subscription.version + 1 })
        .where(eq(subscriptions.id, subscription.id));
    }

    return { processed: due.length };
  }
}
