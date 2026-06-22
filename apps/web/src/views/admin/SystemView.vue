<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import StatCard from "../../components/StatCard.vue";
import { queries } from "../../api/queries";

const query = useQuery({ queryKey: ["admin-system"], queryFn: queries.system });
</script>

<template>
  <section class="page-grid">
    <StatCard label="Database" :value="query.data.value?.databaseDriver ?? '-'" detail="Configured driver" />
    <StatCard label="Users" :value="String(query.data.value?.userCount ?? 0)" detail="Known accounts" />
    <StatCard label="Version" :value="query.data.value?.appVersion ?? '-'" detail="Server release" />
  </section>
  <section class="table-panel">
    <header><h1>Storage</h1></header>
    <div class="data-row"><span>{{ query.data.value?.storagePath ?? "-" }}</span></div>
  </section>
</template>
