<script setup lang="ts">
import { Plus } from "lucide-vue-next";
import { useQuery } from "@tanstack/vue-query";
import { reactive } from "vue";
import EmptyState from "../../components/EmptyState.vue";
import { queries } from "../../api/queries";

const query = useQuery({ queryKey: ["payments"], queryFn: queries.payments });
const form = reactive({ paidAt: new Date().toISOString().slice(0, 10), originalAmount: 0, originalCurrency: "CNY", notes: "" });
async function create() {
  await queries.createPayment({ ...form, paidAt: `${form.paidAt}T00:00:00.000Z` });
  form.originalAmount = 0;
  form.notes = "";
  await query.refetch();
}
</script>
<template>
  <section class="split-page">
    <form class="form-panel" @submit.prevent="create">
      <h1>Payments</h1>
      <label><span>Date</span><input v-model="form.paidAt" type="date" /></label>
      <label><span>Amount</span><input v-model.number="form.originalAmount" min="0" step="0.01" type="number" /></label>
      <label><span>Currency</span><input v-model="form.originalCurrency" maxlength="3" /></label>
      <label><span>Notes</span><input v-model="form.notes" /></label>
      <button class="primary-button" type="submit"><Plus :size="18" /> <span>Add</span></button>
    </form>
    <section class="table-panel">
      <EmptyState v-if="query.data.value?.length === 0" title="No payments" text="Payments will appear here after they are recorded." />
      <div v-else class="row-list">
        <div v-for="item in query.data.value" :key="item.id" class="data-row">
          <span>{{ item.paidAt.slice(0, 10) }}</span><span>{{ item.originalAmount }} {{ item.originalCurrency }}</span><span>{{ item.baseAmount }} {{ item.baseCurrency }}</span><span>{{ item.source }}</span>
        </div>
      </div>
    </section>
  </section>
</template>