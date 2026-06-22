import { Module } from "@nestjs/common";
import { DbModule } from "../../db/db.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { ExchangeRatesModule } from "../exchange-rates/exchange-rates.module.js";
import { PaymentsController } from "./payments.controller.js";
import { PaymentsService } from "./payments.service.js";

@Module({
  imports: [AuthModule, DbModule, ExchangeRatesModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService]
})
export class PaymentsModule {}
