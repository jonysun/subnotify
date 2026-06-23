<script setup lang="ts">
import { Plus } from "lucide-vue-next";
import { useQuery } from "@tanstack/vue-query";
import { reactive } from "vue";
import EmptyState from "../../components/EmptyState.vue";
import StatusBadge from "../../components/StatusBadge.vue";
import { queries, type Subscription } from "../../api/queries";
import { useI18n } from "../../i18n";

const query = useQuery({ queryKey: ["subscriptions"], queryFn: queries.subscriptions });
const { t } = useI18n();
const today = new Date().toISOString().slice(0, 10);
const form = reactive({
  name: "",
  siteUrl: "",
  paymentMethod: "",
  currentPrice: 0,
  currentCurrency: "CNY",
  currentCycle: "monthly" as Subscription["currentCycle"],
  startDate: today,
  endDate: "",
  nextDueDate: today,
  status: "active",
  autoRenew: true,
  remindersEnabled: true,
  initialPaymentPaid: false,
  notes: ""
});
async function create() {
  await queries.createSubscription({
    ...form,
    startDate: `${form.startDate}T00:00:00.000Z`,
    endDate: form.endDate ? `${form.endDate}T00:00:00.000Z` : undefined,
    nextDueDate: `${form.nextDueDate}T00:00:00.000Z`
  });
  form.name = "";
  form.siteUrl = "";
  form.paymentMethod = "";
  form.currentPrice = 0;
  form.initialPaymentPaid = false;
  form.notes = "";
  await query.refetch();
}
</script>
<template>
  <section class="split-page">
    <form class="form-panel" @submit.prevent="create">
      <h1>{{ t("subscriptions") }}</h1>
      <label><span>{{ t("name") }}</span><input v-model="form.name" required /></label>
      <label><span>{{ t("siteUrl") }}</span><input v-model="form.siteUrl" type="url" /></label>
      <label><span>{{ t("paymentMethod") }}</span><input v-model="form.paymentMethod" /></label>
      <label><span>{{ t("price") }}</span><input v-model.number="form.currentPrice" min="0" step="0.01" type="number" /></label>
      <label><span>{{ t("currency") }}</span><input v-model="form.currentCurrency" maxlength="3" /></label>
      <label><span>{{ t("cycle") }}</span><select v-model="form.currentCycle"><option>weekly</option><option>monthly</option><option>quarterly</option><option>yearly</option><option>custom</option></select></label>
      <label><span>{{ t("startDate") }}</span><input v-model="form.startDate" type="date" /></label>
      <label><span>{{ t("endDate") }}</span><input v-model="form.endDate" type="date" /></label>
      <label><span>{{ t("nextDue") }}</span><input v-model="form.nextDueDate" type="date" /></label>
      <label><span>{{ t("status") }}</span><select v-model="form.status"><option>active</option><option>expired</option><option>paused</option><option>cancelled</option><option>unavailable</option></select></label>
      <label class="check-row"><input v-model="form.autoRenew" type="checkbox" /><span>{{ t("autoRenew") }}</span></label>
      <label class="check-row"><input v-model="form.remindersEnabled" type="checkbox" /><span>{{ t("remindersEnabled") }}</span></label>
      <label class="check-row"><input v-model="form.initialPaymentPaid" type="checkbox" /><span>{{ t("firstPeriodPaid") }}</span></label>
      <label><span>{{ t("notes") }}</span><textarea v-model="form.notes" /></label>
      <button class="primary-button" type="submit"><Plus :size="18" /> <span>{{ t("add") }}</span></button>
    </form>
    <section class="table-panel">
      <EmptyState v-if="query.data.value?.length === 0" :title="t('noSubscriptions')" text="Create a subscription to start tracking renewals." />
      <div v-else class="row-list">
        <div v-for="item in query.data.value" :key="item.id" class="data-row">
          <span>{{ item.name }}</span><span>{{ item.currentPrice }} {{ item.currentCurrency }}</span><span>{{ item.currentCycle }}</span><span>{{ item.paymentMethod || "-" }}</span><span>{{ item.nextDueDate.slice(0, 10) }}</span><StatusBadge :status="item.status" />
        </div>
      </div>
    </section>
  </section>
</template>
