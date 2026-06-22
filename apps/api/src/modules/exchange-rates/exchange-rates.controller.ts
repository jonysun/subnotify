import { Controller, Get, Inject, Post, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard.js";
import { ExchangeRatesService } from "./exchange-rates.service.js";

const querySchema = z.object({
  base: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  quote: z.string().trim().length(3).transform((value) => value.toUpperCase())
});

@Controller("exchange-rates")
@UseGuards(JwtAuthGuard)
export class ExchangeRatesController {
  constructor(@Inject(ExchangeRatesService) private readonly exchangeRates: ExchangeRatesService) {}

  @Get()
  getRate(@Query() query: unknown) {
    const input = querySchema.parse(query);
    return this.exchangeRates.getRate(input.base, input.quote);
  }

  @Post("refresh")
  refresh(@Query() query: unknown) {
    const input = querySchema.parse(query);
    return this.exchangeRates.refresh(input.base, input.quote);
  }
}
