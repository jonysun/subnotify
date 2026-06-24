<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { computed } from "vue";
import EmptyState from "../../components/EmptyState.vue";
import StatCard from "../../components/StatCard.vue";
import StatusBadge from "../../components/StatusBadge.vue";
import { queries, type Subscription } from "../../api/queries";
import { useI18n } from "../../i18n";

const subscriptionsQuery = useQuery({ queryKey: ["subscriptions"], queryFn: queries.subscriptions });
const paymentsQuery = useQuery({ queryKey: ["payments"], queryFn: queries.payments });
const { t } = useI18n();
const activeCount = computed(() => subscriptionsQuery.data.value?.filter((item) => item.status === "active").length ?? 0);
const spend = computed(() => (paymentsQuery.data.value ?? []).reduce((sum, item) => sum + item.baseAmount, 0));
const now = new Date();
const upcoming = computed(() => {
  const start = startOfDay(now);
  const end = new Date(start.getTime());
  end.setUTCDate(end.getUTCDate() + 15);
  return [...(subscriptionsQuery.data.value ?? [])]
    .filter((item) => item.status === "active" && isBetween(item.nextDueDate, start, end))
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
});
const monthlyAverage = computed(() => activeSubscriptions().reduce((sum, item) => sum + monthlyAmount(item), 0));
const yearlyAverage = computed(() => activeSubscriptions().reduce((sum, item) => sum + yearlyAmount(item), 0));
const nextMonthSpend = computed(() => {
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 1));
  return activeSubscriptions()
    .filter((item) => isBetween(item.nextDueDate, nextMonth, monthEnd, false))
    .reduce((sum, item) => sum + renewalAmount(item), 0);
});

function activeSubscriptions() {
  return (subscriptionsQuery.data.value ?? []).filter((item) => item.status === "active");
}

function startOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function isBetween(value: string, start: Date, end: Date, includeEnd = true) {
  const date = new Date(value);
  return date >= start && (includeEnd ? date <= end : date < end);
}

function renewalAmount(item: Subscription) {
  return item.renewalPrice > 0 ? item.renewalPrice : item.currentPrice;
}

function monthlyAmount(item: Subscription) {
  const amount = renewalAmount(item);
  if (item.currentCycle === "weekly") return (amount * 52) / 12;
  if (item.currentCycle === "quarterly") return amount / 3;
  if (item.currentCycle === "yearly") return amount / 12;
  if (item.currentCycle === "one_time") return 0;
  return amount;
}

function yearlyAmount(item: Subscription) {
  if (item.currentCycle === "one_time") {
    const due = new Date(item.nextDueDate);
    const end = new Date(now.getTime());
    end.setUTCFullYear(end.getUTCFullYear() + 1);
    return due >= now && due <= end ? renewalAmount(item) : 0;
  }
  return monthlyAmount(item) * 12;
}
</script>
<template>
  <section class="page-grid">
    <StatCard :label="t('activeSubscriptions')" :value="String(activeCount)" :detail="t('currentlyUsableRecords')" />
    <StatCard :label="t('recordedSpend')" :value="spend.toFixed(2)" :detail="t('baseCurrencyTotal')" />
    <StatCard :label="t('upcomingRenewals')" :value="String(upcoming.length)" :detail="t('nextDueRecords')" />
    <StatCard :label="t('averageMonthlySpend')" :value="monthlyAverage.toFixed(2)" :detail="t('currentlyUsableRecords')" />
    <StatCard :label="t('nextMonthSpend')" :value="nextMonthSpend.toFixed(2)" :detail="t('baseCurrencyTotal')" />
    <StatCard :label="t('averageYearlySpend')" :value="yearlyAverage.toFixed(2)" :detail="t('baseCurrencyTotal')" />
  </section>
  <section class="table-panel">
    <header><h1>{{ t("upcoming") }}</h1></header>
    <EmptyState v-if="upcoming.length === 0" :title="t('noRenewals')" text="Upcoming subscription renewals will appear here." />
    <div v-else class="row-list">
      <div v-for="item in upcoming" :key="item.id" class="data-row">
        <span>{{ item.name }}</span><span>{{ item.nextDueDate.slice(0, 10) }}</span><StatusBadge :status="item.status" />
      </div>
    </div>
  </section>
</template>
