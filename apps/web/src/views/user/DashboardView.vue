<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { computed } from "vue";
import EmptyState from "../../components/EmptyState.vue";
import StatCard from "../../components/StatCard.vue";
import StatusBadge from "../../components/StatusBadge.vue";
import { queries } from "../../api/queries";
import { useI18n } from "../../i18n";

const subscriptionsQuery = useQuery({ queryKey: ["subscriptions"], queryFn: queries.subscriptions });
const paymentsQuery = useQuery({ queryKey: ["payments"], queryFn: queries.payments });
const { t } = useI18n();
const activeCount = computed(() => subscriptionsQuery.data.value?.filter((item) => item.status === "active").length ?? 0);
const spend = computed(() => (paymentsQuery.data.value ?? []).reduce((sum, item) => sum + item.baseAmount, 0));
const upcoming = computed(() => [...(subscriptionsQuery.data.value ?? [])].sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate)).slice(0, 5));
</script>
<template>
  <section class="page-grid">
    <StatCard :label="t('activeSubscriptions')" :value="String(activeCount)" :detail="t('currentlyUsableRecords')" />
    <StatCard :label="t('recordedSpend')" :value="spend.toFixed(2)" :detail="t('baseCurrencyTotal')" />
    <StatCard :label="t('upcomingRenewals')" :value="String(upcoming.length)" :detail="t('nextDueRecords')" />
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
