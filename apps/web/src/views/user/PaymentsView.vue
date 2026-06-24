<script setup lang="ts">
import { Edit3, Plus, Trash2 } from "lucide-vue-next";
import { useQuery } from "@tanstack/vue-query";
import { computed, reactive, ref, watch } from "vue";
import AppModal from "../../components/AppModal.vue";
import EmptyState from "../../components/EmptyState.vue";
import { queries, type Payment, type Subscription } from "../../api/queries";
import { useI18n, type MessageKey } from "../../i18n";

type BillingCycle = Subscription["currentCycle"];
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
  cycleSnapshot: "" | BillingCycle;
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
const filters = reactive({
  search: "",
  subscriptionId: "",
  category: "",
  tag: "",
  fromDate: "",
  toDate: "",
  amountMin: "",
  amountMax: "",
  sort: "dateDesc"
});
const cycleOptions: Array<{ value: BillingCycle; labelKey: MessageKey }> = [
  { value: "weekly", labelKey: "weekly" },
  { value: "monthly", labelKey: "monthly" },
  { value: "quarterly", labelKey: "quarterly" },
  { value: "yearly", labelKey: "yearly" },
  { value: "one_time", labelKey: "oneTime" },
  { value: "custom", labelKey: "custom" }
];
const subscriptionById = computed(() => new Map((subscriptionsQuery.data.value ?? []).map((item) => [item.id, item])));
const categories = computed(() => [...new Set((subscriptionsQuery.data.value ?? []).map((item) => item.category?.name).filter(Boolean))] as string[]);
const tags = computed(() => [...new Set((subscriptionsQuery.data.value ?? []).flatMap((item) => (item.tags ?? []).map((tag) => tag.name)))]);

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

function cycleLabel(cycle?: BillingCycle | "") {
  const option = cycleOptions.find((item) => item.value === cycle);
  return option ? t(option.labelKey) : "-";
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
  const introAmount = subscription.introPeriods > 0 && subscription.introPrice > 0 ? subscription.introPrice : subscription.currentPrice;
  form.originalAmount = introAmount;
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

const filteredPayments = computed(() => {
  const query = filters.search.trim().toLowerCase();
  const min = filters.amountMin === "" ? undefined : Number(filters.amountMin);
  const max = filters.amountMax === "" ? undefined : Number(filters.amountMax);
  return [...(paymentsQuery.data.value ?? [])]
    .filter((item) => {
      const subscription = item.subscriptionId ? subscriptionById.value.get(item.subscriptionId) : undefined;
      const searchable = [subscription?.name, subscription?.category?.name, ...(subscription?.tags ?? []).map((tag) => tag.name), item.paymentMethodSnapshot, item.source, item.notes].join(" ").toLowerCase();
      if (query && !searchable.includes(query)) return false;
      if (filters.subscriptionId && item.subscriptionId !== filters.subscriptionId) return false;
      if (filters.category && subscription?.category?.name !== filters.category) return false;
      if (filters.tag && !(subscription?.tags ?? []).some((tag) => tag.name === filters.tag)) return false;
      const paid = dateOnly(item.paidAt);
      if (filters.fromDate && paid < filters.fromDate) return false;
      if (filters.toDate && paid > filters.toDate) return false;
      if (min !== undefined && item.baseAmount < min) return false;
      if (max !== undefined && item.baseAmount > max) return false;
      return true;
    })
    .sort((a, b) => {
      if (filters.sort === "dateAsc") return a.paidAt.localeCompare(b.paidAt);
      if (filters.sort === "amountAsc") return a.baseAmount - b.baseAmount;
      if (filters.sort === "amountDesc") return b.baseAmount - a.baseAmount;
      if (filters.sort === "subscriptionAsc") return (subscriptionById.value.get(a.subscriptionId ?? "")?.name ?? "").localeCompare(subscriptionById.value.get(b.subscriptionId ?? "")?.name ?? "");
      return b.paidAt.localeCompare(a.paidAt);
    });
});
</script>

<template>
  <section class="table-panel">
    <header>
      <h1>{{ t("payments") }}</h1>
      <button class="primary-button compact-button" type="button" @click="openCreate()"><Plus :size="18" /> <span>{{ t("addPayment") }}</span></button>
    </header>
    <div class="filter-panel">
      <label><span>{{ t("search") }}</span><input v-model="filters.search" :placeholder="t('subscription')" /></label>
      <label><span>{{ t("subscription") }}</span><select v-model="filters.subscriptionId"><option value="">{{ t("all") }}</option><option v-for="item in subscriptionsQuery.data.value" :key="item.id" :value="item.id">{{ item.name }}</option></select></label>
      <label><span>{{ t("category") }}</span><select v-model="filters.category"><option value="">{{ t("all") }}</option><option v-for="category in categories" :key="category" :value="category">{{ category }}</option></select></label>
      <label><span>{{ t("tags") }}</span><select v-model="filters.tag"><option value="">{{ t("all") }}</option><option v-for="tag in tags" :key="tag" :value="tag">{{ tag }}</option></select></label>
      <label><span>{{ t("fromDate") }}</span><input v-model="filters.fromDate" type="date" /></label>
      <label><span>{{ t("toDate") }}</span><input v-model="filters.toDate" type="date" /></label>
      <label><span>{{ t("amountMin") }}</span><input v-model="filters.amountMin" min="0" step="0.01" type="number" /></label>
      <label><span>{{ t("amountMax") }}</span><input v-model="filters.amountMax" min="0" step="0.01" type="number" /></label>
      <label><span>{{ t("sort") }}</span><select v-model="filters.sort"><option value="dateDesc">{{ t("date") }} ↓</option><option value="dateAsc">{{ t("date") }} ↑</option><option value="amountDesc">{{ t("baseAmount") }} ↓</option><option value="amountAsc">{{ t("baseAmount") }} ↑</option><option value="subscriptionAsc">{{ t("subscription") }} ↑</option></select></label>
    </div>
    <EmptyState v-if="paymentsQuery.data.value?.length === 0" :title="t('noPayments')" text="Payments will appear here after they are recorded." />
    <div v-else class="table-list">
      <div class="table-head payment-grid">
        <span>{{ t("date") }}</span><span>{{ t("subscription") }}</span><span>{{ t("amount") }}</span><span>{{ t("baseAmount") }}</span><span>{{ t("paymentMethod") }}</span><span>{{ t("cycle") }}</span><span>{{ t("actions") }}</span>
      </div>
      <div v-for="item in filteredPayments" :key="item.id" class="table-row payment-grid">
        <span>{{ dateOnly(item.paidAt) }}</span>
        <span>{{ item.subscriptionId ? subscriptionById.get(item.subscriptionId)?.name ?? item.subscriptionId : "-" }}</span>
        <span>{{ item.originalAmount }} {{ item.originalCurrency }}</span>
        <span>{{ item.baseAmount }} {{ item.baseCurrency }}</span>
        <span>{{ item.paymentMethodSnapshot || "-" }}</span>
        <span>{{ cycleLabel(item.cycleSnapshot) }}</span>
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
      <label><span>{{ t("cycle") }}</span><select v-model="form.cycleSnapshot"><option value="">-</option><option v-for="option in cycleOptions" :key="option.value" :value="option.value">{{ t(option.labelKey) }}</option></select></label>
      <label><span>{{ t("source") }}</span><select v-model="form.source"><option>manual</option><option>auto_renewal</option><option>imported</option></select></label>
      <label class="full-field"><span>{{ t("notes") }}</span><textarea v-model="form.notes" /></label>
      <div class="modal-actions"><button class="small-button" type="button" @click="modalOpen = false">{{ t("cancel") }}</button><button class="primary-button compact-button" type="submit">{{ t("save") }}</button></div>
    </form>
  </AppModal>
</template>
