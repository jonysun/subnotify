<script setup lang="ts">
import { DatabaseBackup, RotateCcw } from "lucide-vue-next";
import { useQuery } from "@tanstack/vue-query";
import EmptyState from "../../components/EmptyState.vue";
import StatusBadge from "../../components/StatusBadge.vue";
import { queries } from "../../api/queries";

const query = useQuery({ queryKey: ["admin-backups"], queryFn: queries.backups });

async function create() {
  await queries.createBackup();
  await query.refetch();
}

async function restore(id: string) {
  await queries.restoreBackup(id);
  await query.refetch();
}
</script>

<template>
  <section class="table-panel">
    <header>
      <h1>Backups</h1>
      <button class="primary-button compact-button" type="button" @click="create"><DatabaseBackup :size="18" /> <span>Create</span></button>
    </header>
    <EmptyState v-if="query.data.value?.length === 0" title="No backups" text="SQLite backup records will appear here after creation." />
    <div v-else class="row-list">
      <div v-for="item in query.data.value" :key="item.id" class="data-row admin-row">
        <span>{{ item.createdAt.slice(0, 10) }}</span><span>{{ item.filename }}</span><span>{{ Math.round(item.sizeBytes / 1024) }} KB</span><StatusBadge :status="item.status" />
        <button class="small-button" type="button" @click="restore(item.id)"><RotateCcw :size="15" /> <span>Restore</span></button>
      </div>
    </div>
  </section>
</template>
