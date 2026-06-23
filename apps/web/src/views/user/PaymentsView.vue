<script setup lang="ts">
import { Plus } from "lucide-vue-next";
import { useQuery } from "@tanstack/vue-query";
import { reactive } from "vue";
import EmptyState from "../../components/EmptyState.vue";
import { queries, type Subscription } from "../../api/queries";
import { useI18n } from "../../i18n";

const query = useQuery({ queryKey: ["payments"], queryFn: queries.payments });
const subscriptionsQuery = useQuery({ queryKey: ["subscriptions"], queryFn: queries.subscriptions });
const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: queries.settings });
const { t } = useI18n();
const today = new Date().toISOString().slice(0, 10);
const form = reactive({
  paidAt: today,
  subscriptionId: "",
  periodStart: "",
  periodEnd: "",
  originalAmount: 0,
  originalCurrency: "CNY",
  baseAmount: 0,
  baseCurrency: "",
  isBaseAmountManual: false,
  paymentMethodSnapshot: "",
  cycleSnapshot: "" as "" | Subscription["currentCycle"],
  source: "manual" as "manual" | "auto_renewal" | "imported",
  notes: ""
});
async function create() {
  await queries.createPayment({
    ...form,
    subscriptionId: form.subscriptionId || undefined,
    paidAt: `${form.paidAt}T00:00:00.000Z`,
    periodStart: form.periodStart ? `${form.periodStart}T00:00:00.000Z` : undefined,
    periodEnd: form.periodEnd ? `${form.periodEnd}T00:00:00.000Z` : undefined,
    baseCurrency: form.baseCurrency || settingsQuery.data.value?.baseCurrency,
    baseAmount: form.isBaseAmountManual ? form.baseAmount : undefined,
    cycleSnapshot: form.cycleSnapshot || undefined
  });
  form.originalAmount = 0;
  form.baseAmount = 0;
  form.notes = "";
  await query.refetch();
}
</script>
<template>
  <section class="split-page">
    <form class="form-panel" @submit.prevent="create">
      <h1>{{ t("payments") }}</h1>
      <label><span>{{ t("date") }}</span><input v-model="form.paidAt" type="date" /></label>
      <label><span>{{ t("subscription") }}</span><select v-model="form.subscriptionId"><option value="">-</option><option v-for="item in subscriptionsQuery.data.value" :key="item.id" :value="item.id">{{ item.name }}</option></select></label>
      <label><span>{{ t("periodStart") }}</span><input v-model="form.periodStart" type="date" /></label>
      <label><span>{{ t("periodEnd") }}</span><input v-model="form.periodEnd" type="date" /></label>
      <label><span>{{ t("amount") }}</span><input v-model.number="form.originalAmount" min="0" step="0.01" type="number" /></label>
      <label><span>{{ t("currency") }}</span><input v-model="form.originalCurrency" maxlength="3" /></label>
      <label class="check-row"><input v-model="form.isBaseAmountManual" type="checkbox" /><span>{{ t("manualBaseAmount") }}</span></label>
      <label><span>{{ t("baseAmount") }}</span><input v-model.number="form.baseAmount" :disabled="!form.isBaseAmountManual" min="0" step="0.01" type="number" /></label>
      <label><span>{{ t("baseCurrency") }}</span><input v-model="form.baseCurrency" :placeholder="settingsQuery.data.value?.baseCurrency ?? 'CNY'" maxlength="3" /></label>
      <label><span>{{ t("paymentMethod") }}</span><input v-model="form.paymentMethodSnapshot" /></label>
      <label><span>{{ t("cycle") }}</span><select v-model="form.cycleSnapshot"><option value="">-</option><option>weekly</option><option>monthly</option><option>quarterly</option><option>yearly</option><option>custom</option></select></label>
      <label><span>{{ t("source") }}</span><select v-model="form.source"><option>manual</option><option>auto_renewal</option><option>imported</option></select></label>
      <label><span>{{ t("notes") }}</span><textarea v-model="form.notes" /></label>
      <button class="primary-button" type="submit"><Plus :size="18" /> <span>{{ t("add") }}</span></button>
    </form>
    <section class="table-panel">
      <EmptyState v-if="query.data.value?.length === 0" :title="t('noPayments')" text="Payments will appear here after they are recorded." />
      <div v-else class="row-list">
        <div v-for="item in query.data.value" :key="item.id" class="data-row">
          <span>{{ item.paidAt.slice(0, 10) }}</span><span>{{ item.originalAmount }} {{ item.originalCurrency }}</span><span>{{ item.baseAmount }} {{ item.baseCurrency }}</span><span>{{ item.paymentMethodSnapshot || "-" }}</span><span>{{ item.source }}</span>
        </div>
      </div>
    </section>
  </section>
</template>
