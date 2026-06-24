export type BillingCycle = "weekly" | "monthly" | "quarterly" | "yearly" | "custom" | "one_time";

export function advanceDueDate(date: Date, cycle: BillingCycle) {
  const next = new Date(date.getTime());

  if (cycle === "weekly") {
    next.setUTCDate(next.getUTCDate() + 7);
    return next;
  }

  if (cycle === "quarterly") {
    next.setUTCMonth(next.getUTCMonth() + 3);
    return next;
  }

  if (cycle === "yearly") {
    next.setUTCFullYear(next.getUTCFullYear() + 1);
    return next;
  }

  if (cycle === "one_time") {
    return next;
  }

  next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}
