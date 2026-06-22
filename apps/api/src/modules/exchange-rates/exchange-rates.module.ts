import { Module } from "@nestjs/common";
import { DbModule } from "../../db/db.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { ExchangeRatesController } from "./exchange-rates.controller.js";
import { ExchangeRatesService } from "./exchange-rates.service.js";

@Module({
  imports: [AuthModule, DbModule],
  controllers: [ExchangeRatesController],
  providers: [ExchangeRatesService],
  exports: [ExchangeRatesService]
})
export class ExchangeRatesModule {}
