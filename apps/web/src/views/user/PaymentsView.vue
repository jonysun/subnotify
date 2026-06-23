<script setup lang="ts">
import { Edit3, Plus, Trash2 } from "lucide-vue-next";
import { useQuery } from "@tanstack/vue-query";
import { computed, reactive, ref, watch } from "vue";
import AppModal from "../../components/AppModal.vue";
import EmptyState from "../../components/EmptyState.vue";
import { queries, type Payment, type Subscription } from "../../api/queries";
import { useI18n } from "../../i18n";

type PaymentForm = {
  paidAt: string;
  subscriptionId: string;
  periodStart: string;
  periodEnd: string;
  originalAmount: number;
  originalCurrency: string;
  baseAmount: number;
  baseCurrency: string;
  isBaseAmountManual: boolean;
  paymentMethodSnapshot: string;
  cycleSnapshot: "" | Subscription["currentCycle"];
  source: "manual" | "auto_renewal" | "imported";
  notes: string;
};

const paymentsQuery = useQuery({ queryKey: ["payments"], queryFn: queries.payments });
const subscriptionsQuery = useQuery({ queryKey: ["subscriptions"], queryFn: queries.subscriptions });
const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: queries.settings });
const { t } = useI18n();
const today = new Date().toISOString().slice(0, 10);
const modalOpen = ref(false);
const editingId = ref("");
const form = reactive<PaymentForm>(emptyForm());
const subscriptionById = computed(() => new Map((subscriptionsQuery.data.value ?? []).map((item) => [item.id, item])));

function emptyForm(): PaymentForm {
  return {
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
    cycleSnapshot: "",
    source: "manual",
    notes: ""
  };
}

function dateOnly(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function toDateTime(value?: string) {
  return value ? `${value}T00:00:00.000Z` : undefined;
}

function openCreate(subscriptionId = "") {
  Object.assign(form, emptyForm(), { subscriptionId });
  editingId.value = "";
  modalOpen.value = true;
  hydrateFromSubscription();
}

function openEdit(item: Payment) {
  Object.assign(form, {
    paidAt: dateOnly(item.paidAt),
    subscriptionId: item.subscriptionId ?? "",
    periodStart: dateOnly(item.periodStart),
    periodEnd: dateOnly(item.periodEnd),
    originalAmount: item.originalAmount,
    originalCurrency: item.originalCurrency,
    baseAmount: item.baseAmount,
    baseCurrency: item.baseCurrency,
    isBaseAmountManual: item.isBaseAmountManual,
    paymentMethodSnapshot: item.paymentMethodSnapshot,
    cycleSnapshot: item.cycleSnapshot ?? "",
    source: item.source,
    notes: item.notes
  });
  editingId.value = item.id;
  modalOpen.value = true;
}

function hydrateFromSubscription() {
  if (!form.subscriptionId || editingId.value) return;
  const subscription = subscriptionById.value.get(form.subscriptionId);
  if (!subscription) return;
  form.originalAmount = subscription.currentPrice;
  form.originalCurrency = subscription.currentCurrency;
  form.paymentMethodSnapshot = subscription.paymentMethod;
  form.cycleSnapshot = subscription.currentCycle;
  form.periodStart = dateOnly(subscription.startDate);
  form.periodEnd = dateOnly(subscription.nextDueDate);
}

watch(() => form.subscriptionId, hydrateFromSubscription);

async function save() {
  const payload = {
    ...form,
    subscriptionId: form.subscriptionId || undefined,
    paidAt: toDateTime(form.paidAt)!,
    periodStart: toDateTime(form.periodStart),
    periodEnd: toDateTime(form.periodEnd),
    baseCurrency: form.baseCurrency || settingsQuery.data.value?.baseCurrency,
    baseAmount: form.isBaseAmountManual ? form.baseAmount : undefined,
    cycleSnapshot: form.cycleSnapshot || undefined
  };
  if (editingId.value) {
    await queries.updatePayment(editingId.value, payload);
  } else {
    await queries.createPayment(payload);
  }
  modalOpen.value = false;
  await paymentsQuery.refetch();
}

async function remove(item: Payment) {
  if (!window.confirm(t("confirmDelete"))) return;
  await queries.deletePayment(item.id);
  await paymentsQuery.refetch();
}
</script>

<template>
  <section class="table-panel">
    <header>
      <h1>{{ t("payments") }}</h1>
      <button class="primary-button compact-button" type="button" @click="openCreate()"><Plus :size="18" /> <span>{{ t("addPayment") }}</span></button>
    </header>
    <EmptyState v-if="paymentsQuery.data.value?.length === 0" :title="t('noPayments')" text="Payments will appear here after they are recorded." />
    <div v-else class="table-list">
      <div class="table-head payment-grid">
        <span>{{ t("date") }}</span><span>{{ t("subscription") }}</span><span>{{ t("amount") }}</span><span>{{ t("baseAmount") }}</span><span>{{ t("paymentMethod") }}</span><span>{{ t("source") }}</span><span>{{ t("actions") }}</span>
      </div>
      <div v-for="item in paymentsQuery.data.value" :key="item.id" class="table-row payment-grid">
        <span>{{ dateOnly(item.paidAt) }}</span>
        <span>{{ item.subscriptionId ? subscriptionById.get(item.subscriptionId)?.name ?? item.subscriptionId : "-" }}</span>
        <span>{{ item.originalAmount }} {{ item.originalCurrency }}</span>
        <span>{{ item.baseAmount }} {{ item.baseCurrency }}</span>
        <span>{{ item.paymentMethodSnapshot || "-" }}</span>
        <span>{{ item.source }}</span>
        <span class="row-actions"><button class="small-button" type="button" @click="openEdit(item)"><Edit3 :size="15" /> <span>{{ t("edit") }}</span></button><button class="small-button danger-button" type="button" @click="remove(item)"><Trash2 :size="15" /> <span>{{ t("delete") }}</span></button></span>
      </div>
    </div>
  </section>

  <AppModal v-if="modalOpen" :title="editingId ? t('editPayment') : t('addPayment')" @close="modalOpen = false">
    <form class="form-panel modal-form" @submit.prevent="save">
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
      <label class="full-field"><span>{{ t("notes") }}</span><textarea v-model="form.notes" /></label>
      <div class="modal-actions"><button class="small-button" type="button" @click="modalOpen = false">{{ t("cancel") }}</button><button class="primary-button compact-button" type="submit">{{ t("save") }}</button></div>
    </form>
  </AppModal>
</template>
