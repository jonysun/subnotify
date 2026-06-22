import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DbService } from "../../db/db.service.js";
import { exchangeRates } from "../../db/schema.js";

export const mockRates: Record<string, number> = {
  "CNY:USD": 0.14,
  "USD:CNY": 7.1,
  "CNY:EUR": 0.13,
  "EUR:CNY": 7.8,
  "CNY:JPY": 21,
  "JPY:CNY": 0.048
};

@Injectable()
export class ExchangeRatesService {
  constructor(@Inject(DbService) private readonly db: DbService) {}

  async getRate(baseCurrency: string, quoteCurrency: string, provider = "mock", at = new Date()) {
    const base = baseCurrency.toUpperCase();
    const quote = quoteCurrency.toUpperCase();
    const rateDate = at.toISOString().slice(0, 10);
    const rate = base === quote ? 1 : (mockRates[`${base}:${quote}`] ?? 1);

    const existing = await this.db.db
      .select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.baseCurrency, base),
          eq(exchangeRates.quoteCurrency, quote),
          eq(exchangeRates.provider, provider),
          eq(exchangeRates.rateDate, rateDate)
        )
      )
      .limit(1);

    if (existing[0]) {
      return existing[0];
    }

    const id = randomUUID();
    await this.db.db.insert(exchangeRates).values({
      id,
      baseCurrency: base,
      quoteCurrency: quote,
      rate,
      provider,
      rateDate
    });
    const created = await this.db.db.select().from(exchangeRates).where(eq(exchangeRates.id, id)).limit(1);
    return created[0]!;
  }

  async refresh(baseCurrency: string, quoteCurrency: string) {
    return this.getRate(baseCurrency, quoteCurrency, "mock", new Date());
  }
}
