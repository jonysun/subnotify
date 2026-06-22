import { Module } from "@nestjs/common";
import { DbModule } from "../../db/db.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { PaymentsModule } from "../payments/payments.module.js";
import { AutoRenewService } from "./auto-renew.service.js";
import { SubscriptionsController } from "./subscriptions.controller.js";
import { SubscriptionsService } from "./subscriptions.service.js";

@Module({
  imports: [AuthModule, DbModule, PaymentsModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, AutoRenewService],
  exports: [SubscriptionsService, AutoRenewService]
})
export class SubscriptionsModule {}