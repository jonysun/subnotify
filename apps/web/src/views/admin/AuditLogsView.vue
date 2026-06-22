<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import EmptyState from "../../components/EmptyState.vue";
import { queries } from "../../api/queries";

const query = useQuery({ queryKey: ["admin-audit-logs"], queryFn: queries.auditLogs });
</script>

<template>
  <section class="table-panel">
    <header><h1>Audit Logs</h1></header>
    <EmptyState v-if="query.data.value?.length === 0" title="No audit logs" text="Administrative actions will appear here." />
    <div v-else class="row-list">
      <div v-for="item in query.data.value" :key="item.id" class="data-row audit-row">
        <span>{{ item.createdAt.slice(0, 19).replace("T", " ") }}</span><span>{{ item.action }}</span><span>{{ item.targetType }}</span><span>{{ item.targetId || "-" }}</span><span>{{ JSON.stringify(item.metadata) }}</span>
      </div>
    </div>
  </section>
</template>
