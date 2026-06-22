<script setup lang="ts">
import { Plus } from "lucide-vue-next";
import { useQuery } from "@tanstack/vue-query";
import { reactive } from "vue";
import EmptyState from "../../components/EmptyState.vue";
import StatusBadge from "../../components/StatusBadge.vue";
import { queries, type Subscription } from "../../api/queries";

const query = useQuery({ queryKey: ["subscriptions"], queryFn: queries.subscriptions });
const form = reactive({ name: "", currentPrice: 0, currentCurrency: "CNY", currentCycle: "monthly" as Subscription["currentCycle"], nextDueDate: new Date().toISOString().slice(0, 10), autoRenew: true });
async function create() {
  await queries.createSubscription({ ...form, startDate: new Date().toISOString(), nextDueDate: `${form.nextDueDate}T00:00:00.000Z` });
  form.name = "";
  await query.refetch();
}
</script>
<template>
  <section class="split-page">
    <form class="form-panel" @submit.prevent="create">
      <h1>Subscriptions</h1>
      <label><span>Name</span><input v-model="form.name" required /></label>
      <label><span>Price</span><input v-model.number="form.currentPrice" min="0" step="0.01" type="number" /></label>
      <label><span>Currency</span><input v-model="form.currentCurrency" maxlength="3" /></label>
      <label><span>Cycle</span><select v-model="form.currentCycle"><option>weekly</option><option>monthly</option><option>quarterly</option><option>yearly</option><option>custom</option></select></label>
      <label><span>Next due</span><input v-model="form.nextDueDate" type="date" /></label>
      <label class="check-row"><input v-model="form.autoRenew" type="checkbox" /><span>Auto renew</span></label>
      <button class="primary-button" type="submit"><Plus :size="18" /> <span>Add</span></button>
    </form>
    <section class="table-panel">
      <EmptyState v-if="query.data.value?.length === 0" title="No subscriptions" text="Create a subscription to start tracking renewals." />
      <div v-else class="row-list">
        <div v-for="item in query.data.value" :key="item.id" class="data-row">
          <span>{{ item.name }}</span><span>{{ item.currentPrice }} {{ item.currentCurrency }}</span><span>{{ item.nextDueDate.slice(0, 10) }}</span><StatusBadge :status="item.status" />
        </div>
      </div>
    </section>
  </section>
</template>
