<script setup lang="ts">
import { Edit3, Plus, Trash2 } from "lucide-vue-next";
import { useQuery } from "@tanstack/vue-query";
import { computed, reactive, ref } from "vue";
import AppModal from "../../components/AppModal.vue";
import EmptyState from "../../components/EmptyState.vue";
import StatusBadge from "../../components/StatusBadge.vue";
import { queries, type Subscription } from "../../api/queries";
import { useI18n } from "../../i18n";

type SubscriptionForm = {
  name: string;
  siteUrl: string;
  paymentMethod: string;
  currentPrice: number;
  currentCurrency: string;
  currentCycle: Subscription["currentCycle"];
  startDate: string;
  endDate: string;
  nextDueDate: string;
  status: string;
  autoRenew: boolean;
  remindersEnabled: boolean;
  initialPaymentPaid: boolean;
  notes: string;
};

const subscriptionsQuery = useQuery({ queryKey: ["subscriptions"], queryFn: queries.subscriptions });
const paymentsQuery = useQuery({ queryKey: ["payments"], queryFn: queries.payments });
const { t } = useI18n();
const today = new Date().toISOString().slice(0, 10);
const expandedId = ref("");
const editingId = ref("");
const modalOpen = ref(false);
const form = reactive<SubscriptionForm>(emptyForm());

function emptyForm(): SubscriptionForm {
  return {
    name: "",
    siteUrl: "",
    paymentMethod: "",
    currentPrice: 0,
    currentCurrency: "CNY",
    currentCycle: "monthly",
    startDate: today,
    endDate: "",
    nextDueDate: today,
    status: "active",
    autoRenew: true,
    remindersEnabled: true,
    initialPaymentPaid: false,
    notes: ""
  };
}

function dateOnly(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function toDateTime(value?: string) {
  return value ? `${value}T00:00:00.000Z` : undefined;
}

function openCreate() {
  Object.assign(form, emptyForm());
  editingId.value = "";
  modalOpen.value = true;
}

function openEdit(item: Subscription) {
  Object.assign(form, {
    name: item.name,
    siteUrl: item.siteUrl,
    paymentMethod: item.paymentMethod,
    currentPrice: item.currentPrice,
    currentCurrency: item.currentCurrency,
    currentCycle: item.currentCycle,
    startDate: dateOnly(item.startDate),
    endDate: dateOnly(item.endDate),
    nextDueDate: dateOnly(item.nextDueDate),
    status: item.status,
    autoRenew: item.autoRenew,
    remindersEnabled: item.remindersEnabled,
    initialPaymentPaid: false,
    notes: item.notes
  });
  editingId.value = item.id;
  modalOpen.value = true;
}

async function save() {
  const payload = {
    ...form,
    startDate: toDateTime(form.startDate)!,
    endDate: toDateTime(form.endDate),
    nextDueDate: toDateTime(form.nextDueDate)!
  };
  if (editingId.value) {
    const { initialPaymentPaid: _initialPaymentPaid, ...updatePayload } = payload;
    await queries.updateSubscription(editingId.value, updatePayload);
  } else {
    await queries.createSubscription(payload);
  }
  modalOpen.value = false;
  await subscriptionsQuery.refetch();
  await paymentsQuery.refetch();
}

async function remove(item: Subscription) {
  if (!window.confirm(t("confirmDelete"))) return;
  await queries.deleteSubscription(item.id);
  if (expandedId.value === item.id) expandedId.value = "";
  await subscriptionsQuery.refetch();
}

const paymentsBySubscription = computed(() => {
  const map = new Map<string, typeof paymentsQuery.data.value>();
  for (const payment of paymentsQuery.data.value ?? []) {
    if (!payment.subscriptionId) continue;
    const list = map.get(payment.subscriptionId) ?? [];
    list.push(payment);
    map.set(payment.subscriptionId, list);
  }
  return map;
});
</script>

<template>
  <section class="table-panel">
    <header>
      <h1>{{ t("subscriptions") }}</h1>
      <button class="primary-button compact-button" type="button" @click="openCreate"><Plus :size="18" /> <span>{{ t("addSubscription") }}</span></button>
    </header>
    <EmptyState v-if="subscriptionsQuery.data.value?.length === 0" :title="t('noSubscriptions')" text="Create a subscription to start tracking renewals." />
    <div v-else class="table-list subscription-list">
      <div class="table-head subscription-grid">
        <span>{{ t("name") }}</span><span>{{ t("price") }}</span><span>{{ t("cycle") }}</span><span>{{ t("paymentMethod") }}</span><span>{{ t("nextDue") }}</span><span>{{ t("status") }}</span><span>{{ t("autoRenew") }}</span>
      </div>
      <article v-for="item in subscriptionsQuery.data.value" :key="item.id" class="expand-card">
        <button class="table-row subscription-grid" type="button" @click="expandedId = expandedId === item.id ? '' : item.id">
          <span>{{ item.name }}</span><span>{{ item.currentPrice }} {{ item.currentCurrency }}</span><span>{{ item.currentCycle }}</span><span>{{ item.paymentMethod || "-" }}</span><span>{{ dateOnly(item.nextDueDate) }}</span><StatusBadge :status="item.status" /><span>{{ item.autoRenew ? t("enabled") : t("disabled") }}</span>
        </button>
        <section v-if="expandedId === item.id" class="detail-panel">
          <div class="detail-grid">
            <span>{{ t("siteUrl") }}: {{ item.siteUrl || "-" }}</span>
            <span>{{ t("startDate") }}: {{ dateOnly(item.startDate) }}</span>
            <span>{{ t("endDate") }}: {{ dateOnly(item.endDate) || "-" }}</span>
            <span>{{ t("remindersEnabled") }}: {{ item.remindersEnabled ? t("enabled") : t("disabled") }}</span>
            <span>{{ t("notes") }}: {{ item.notes || "-" }}</span>
          </div>
          <div class="detail-actions">
            <button class="small-button" type="button" @click="openEdit(item)"><Edit3 :size="15" /> <span>{{ t("edit") }}</span></button>
            <button class="small-button danger-button" type="button" @click="remove(item)"><Trash2 :size="15" /> <span>{{ t("delete") }}</span></button>
          </div>
          <h2>{{ t("relatedPayments") }}</h2>
          <div class="row-list compact-list">
            <div v-for="payment in paymentsBySubscription.get(item.id) ?? []" :key="payment.id" class="data-row">
              <span>{{ dateOnly(payment.paidAt) }}</span><span>{{ payment.originalAmount }} {{ payment.originalCurrency }}</span><span>{{ payment.baseAmount }} {{ payment.baseCurrency }}</span><span>{{ payment.source }}</span>
            </div>
            <p v-if="(paymentsBySubscription.get(item.id) ?? []).length === 0" class="muted-text">{{ t("noPayments") }}</p>
          </div>
        </section>
      </article>
    </div>
  </section>

  <AppModal v-if="modalOpen" :title="editingId ? t('editSubscription') : t('addSubscription')" @close="modalOpen = false">
    <form class="form-panel modal-form" @submit.prevent="save">
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
      <label v-if="!editingId" class="check-row"><input v-model="form.initialPaymentPaid" type="checkbox" /><span>{{ t("firstPeriodPaid") }}</span></label>
      <label class="full-field"><span>{{ t("notes") }}</span><textarea v-model="form.notes" /></label>
      <div class="modal-actions"><button class="small-button" type="button" @click="modalOpen = false">{{ t("cancel") }}</button><button class="primary-button compact-button" type="submit">{{ t("save") }}</button></div>
    </form>
  </AppModal>
</template>
