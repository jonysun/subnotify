<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import EmptyState from "../../components/EmptyState.vue";
import StatusBadge from "../../components/StatusBadge.vue";
import { queries } from "../../api/queries";
const query = useQuery({ queryKey: ["subscriptions"], queryFn: queries.subscriptions });
</script>
<template>
  <section class="table-panel">
    <header><h1>Calendar</h1></header>
    <EmptyState v-if="query.data.value?.length === 0" title="No dates" text="Renewal dates from subscriptions will appear here." />
    <div v-else class="row-list">
      <div v-for="item in query.data.value" :key="item.id" class="data-row">
        <span>{{ item.nextDueDate.slice(0, 10) }}</span><span>{{ item.name }}</span><span>{{ item.currentCycle }}</span><StatusBadge :status="item.status" />
      </div>
    </div>
  </section>
</template>