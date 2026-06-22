<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { computed } from "vue";
import EmptyState from "../../components/EmptyState.vue";
import StatCard from "../../components/StatCard.vue";
import StatusBadge from "../../components/StatusBadge.vue";
import { queries } from "../../api/queries";

const subscriptionsQuery = useQuery({ queryKey: ["subscriptions"], queryFn: queries.subscriptions });
const paymentsQuery = useQuery({ queryKey: ["payments"], queryFn: queries.payments });
const activeCount = computed(() => subscriptionsQuery.data.value?.filter((item) => item.status === "active").length ?? 0);
const spend = computed(() => (paymentsQuery.data.value ?? []).reduce((sum, item) => sum + item.baseAmount, 0));
const upcoming = computed(() => [...(subscriptionsQuery.data.value ?? [])].sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate)).slice(0, 5));
</script>
<template>
  <section class="page-grid">
    <StatCard label="Active subscriptions" :value="String(activeCount)" detail="Currently usable records" />
    <StatCard label="Recorded spend" :value="spend.toFixed(2)" detail="Base-currency total" />
    <StatCard label="Upcoming renewals" :value="String(upcoming.length)" detail="Next due records" />
  </section>
  <section class="table-panel">
    <header><h1>Upcoming</h1></header>
    <EmptyState v-if="upcoming.length === 0" title="No renewals" text="Upcoming subscription renewals will appear here." />
    <div v-else class="row-list">
      <div v-for="item in upcoming" :key="item.id" class="data-row">
        <span>{{ item.name }}</span><span>{{ item.nextDueDate.slice(0, 10) }}</span><StatusBadge :status="item.status" />
      </div>
    </div>
  </section>
</template>