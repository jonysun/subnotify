<script setup lang="ts">
import { Edit3, Plus, Trash2 } from "lucide-vue-next";
import { useQuery } from "@tanstack/vue-query";
import { computed, reactive, ref, watch } from "vue";
import AppModal from "../../components/AppModal.vue";
import EmptyState from "../../components/EmptyState.vue";
import StatusBadge from "../../components/StatusBadge.vue";
import { queries, type ReminderRule, type Subscription } from "../../api/queries";
import { useI18n, type MessageKey } from "../../i18n";

type BillingCycle = Subscription["currentCycle"];
type SubscriptionForm = {
  name: string;
  siteUrl: string;
  paymentMethod: string;
  currentPrice: number;
  currentCurrency: string;
  introPeriods: number;
  introPrice: number;
  renewalPrice: number;
  renewalCurrency: string;
  currentCycle: BillingCycle;
  startDate: string;
  endDate: string;
  nextDueDate: string;
  status: string;
  autoRenew: boolean;
  remindersEnabled: boolean;
  initialPaymentPaid: boolean;
  useGlobalReminders: boolean;
  categoryName: string;
  tagText: string;
  reminderRules: ReminderRuleForm[];
  notes: string;
};
type ReminderRuleForm = {
  name: string;
  type: ReminderRule["type"];
  value: number;
  unit: ReminderRule["unit"];
  repeatIntervalHours: number;
  repeatUntil: ReminderRule["repeatUntil"];
  enabled: boolean;
  channelIds: string[];
};

const subscriptionsQuery = useQuery({ queryKey: ["subscriptions"], queryFn: queries.subscriptions });
const paymentsQuery = useQuery({ queryKey: ["payments"], queryFn: queries.payments });
const channelsQuery = useQuery({ queryKey: ["notification-channels"], queryFn: queries.notificationChannels });
const { t } = useI18n();
const today = new Date().toISOString().slice(0, 10);
const expandedId = ref("");
const editingId = ref("");
const modalOpen = ref(false);
const form = reactive<SubscriptionForm>(emptyForm());
const defaultFilters = {
  search: "",
  category: "",
  tag: "",
  fromDate: "",
  toDate: "",
  amountMin: "",
  amountMax: "",
  sort: "dueAsc"
};
const filters = reactive({ ...defaultFilters });
const appliedFilters = reactive({ ...defaultFilters });
const cycleOptions: Array<{ value: BillingCycle; labelKey: MessageKey }> = [
  { value: "weekly", labelKey: "weekly" },
  { value: "monthly", labelKey: "monthly" },
  { value: "quarterly", labelKey: "quarterly" },
  { value: "yearly", labelKey: "yearly" },
  { value: "one_time", labelKey: "oneTime" },
  { value: "custom", labelKey: "custom" }
];

function emptyForm(): SubscriptionForm {
  return {
    name: "",
    siteUrl: "",
    paymentMethod: "",
    currentPrice: 0,
    currentCurrency: "CNY",
    introPeriods: 0,
    introPrice: 0,
    renewalPrice: 0,
    renewalCurrency: "CNY",
    currentCycle: "monthly",
    startDate: today,
    endDate: "",
    nextDueDate: addCycle(today, "monthly"),
    status: "active",
    autoRenew: true,
    remindersEnabled: true,
    initialPaymentPaid: false,
    useGlobalReminders: true,
    categoryName: "",
    tagText: "",
    reminderRules: defaultReminderRules(),
    notes: ""
  };
}

function defaultReminderRules(): ReminderRuleForm[] {
  return [
    { name: "Before expiry 7 days", type: "before_expiry", value: 7, unit: "days", repeatIntervalHours: 0, repeatUntil: "renewed", enabled: true, channelIds: [] },
    { name: "Before expiry 3 days", type: "before_expiry", value: 3, unit: "days", repeatIntervalHours: 0, repeatUntil: "renewed", enabled: true, channelIds: [] },
    { name: "Before expiry 1 day", type: "before_expiry", value: 1, unit: "days", repeatIntervalHours: 0, repeatUntil: "renewed", enabled: true, channelIds: [] },
    { name: "On expiry day", type: "on_expiry", value: 0, unit: "days", repeatIntervalHours: 0, repeatUntil: "renewed", enabled: true, channelIds: [] },
    { name: "After expiry every 24 hours", type: "after_expiry", value: 0, unit: "hours", repeatIntervalHours: 24, repeatUntil: "renewed", enabled: false, channelIds: [] }
  ];
}

function dateOnly(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function toDateTime(value?: string) {
  return value ? `${value}T00:00:00.000Z` : undefined;
}

function addCycle(dateText: string, cycle: BillingCycle) {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return dateText;
  if (cycle === "weekly") date.setUTCDate(date.getUTCDate() + 7);
  if (cycle === "monthly" || cycle === "custom") date.setUTCMonth(date.getUTCMonth() + 1);
  if (cycle === "quarterly") date.setUTCMonth(date.getUTCMonth() + 3);
  if (cycle === "yearly") date.setUTCFullYear(date.getUTCFullYear() + 1);
  return cycle === "one_time" ? dateText : date.toISOString().slice(0, 10);
}

function cycleLabel(cycle?: BillingCycle) {
  const option = cycleOptions.find((item) => item.value === cycle);
  return option ? t(option.labelKey) : "-";
}

function tagNames(text: string) {
  return [...new Set(text.split(/[,]/).map((tag) => tag.trim()).filter(Boolean))];
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
    introPeriods: item.introPeriods ?? 0,
    introPrice: item.introPrice ?? 0,
    renewalPrice: item.renewalPrice ?? 0,
    renewalCurrency: item.renewalCurrency || item.currentCurrency,
    currentCycle: item.currentCycle,
    startDate: dateOnly(item.startDate),
    endDate: dateOnly(item.endDate),
    nextDueDate: dateOnly(item.nextDueDate),
    status: item.status,
    autoRenew: item.autoRenew,
    remindersEnabled: item.remindersEnabled,
    initialPaymentPaid: false,
    useGlobalReminders: true,
    categoryName: item.category?.name ?? "",
    tagText: (item.tags ?? []).map((tag) => tag.name).join(", "),
    reminderRules: [],
    notes: item.notes
  });
  editingId.value = item.id;
  modalOpen.value = true;
  loadReminderRules(item.id);
}

async function loadReminderRules(subscriptionId: string) {
  const result = await queries.subscriptionReminderRules(subscriptionId);
  form.useGlobalReminders = result.rules.length === 0;
  form.reminderRules = result.rules.length > 0 ? result.rules.map(toReminderForm) : defaultReminderRules();
}

function toReminderForm(rule: ReminderRule): ReminderRuleForm {
  return {
    name: rule.name,
    type: rule.type,
    value: rule.value ?? rule.daysBefore,
    unit: rule.unit ?? "days",
    repeatIntervalHours: rule.repeatIntervalHours ?? 0,
    repeatUntil: rule.repeatUntil ?? "renewed",
    enabled: rule.enabled,
    channelIds: rule.channelIds ?? []
  };
}

function addReminderRule() {
  form.reminderRules.push({ name: "Before expiry 7 days", type: "before_expiry", value: 7, unit: "days", repeatIntervalHours: 0, repeatUntil: "renewed", enabled: true, channelIds: [] });
}

function removeReminderRule(index: number) {
  form.reminderRules.splice(index, 1);
}

watch(
  () => [form.startDate, form.currentCycle] as const,
  ([startDate, cycle]) => {
    if (!editingId.value) form.nextDueDate = addCycle(startDate, cycle);
  }
);

async function save() {
  const payload = {
    name: form.name,
    siteUrl: form.siteUrl,
    paymentMethod: form.paymentMethod,
    currentPrice: form.currentPrice,
    currentCurrency: form.currentCurrency,
    introPeriods: form.introPeriods,
    introPrice: form.introPrice,
    renewalPrice: form.renewalPrice,
    renewalCurrency: form.renewalCurrency || form.currentCurrency,
    currentCycle: form.currentCycle,
    startDate: toDateTime(form.startDate)!,
    endDate: toDateTime(form.endDate),
    nextDueDate: toDateTime(form.nextDueDate)!,
    status: form.status,
    autoRenew: form.autoRenew,
    remindersEnabled: form.remindersEnabled,
    initialPaymentPaid: form.initialPaymentPaid,
    categoryName: form.categoryName,
    tagNames: tagNames(form.tagText),
    notes: form.notes
  };
  let saved: Subscription;
  if (editingId.value) {
    const { initialPaymentPaid: _initialPaymentPaid, ...updatePayload } = payload;
    saved = await queries.updateSubscription(editingId.value, updatePayload);
  } else {
    saved = await queries.createSubscription(payload);
  }
  await queries.replaceSubscriptionReminderRules(saved.id, form.useGlobalReminders ? [] : form.reminderRules);
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

async function renew(item: Subscription) {
  const amountText = window.prompt("Renewal amount", String(item.renewalPrice || item.currentPrice));
  if (amountText === null) return;
  const amount = Number(amountText);
  if (!Number.isFinite(amount) || amount < 0) return;
  await queries.renewSubscription(item.id, {
    paidAt: new Date().toISOString(),
    amount,
    currency: item.renewalCurrency || item.currentCurrency,
    periods: 1,
    note: "Manual renewal"
  });
  await subscriptionsQuery.refetch();
  await paymentsQuery.refetch();
}

async function toggleStatus(item: Subscription) {
  await queries.updateSubscriptionStatus(item.id, item.status === "active" ? "paused" : "active");
  await subscriptionsQuery.refetch();
}

function applyFilters() {
  Object.assign(appliedFilters, filters);
}

function resetFilters() {
  Object.assign(filters, defaultFilters);
  Object.assign(appliedFilters, defaultFilters);
}

const categories = computed(() => [...new Set((subscriptionsQuery.data.value ?? []).map((item) => item.category?.name).filter(Boolean))] as string[]);
const tags = computed(() => [...new Set((subscriptionsQuery.data.value ?? []).flatMap((item) => (item.tags ?? []).map((tag) => tag.name)))]);

const filteredSubscriptions = computed(() => {
  const query = appliedFilters.search.trim().toLowerCase();
  const min = appliedFilters.amountMin === "" ? undefined : Number(appliedFilters.amountMin);
  const max = appliedFilters.amountMax === "" ? undefined : Number(appliedFilters.amountMax);
  return [...(subscriptionsQuery.data.value ?? [])]
    .filter((item) => {
      const searchable = [item.name, item.siteUrl, item.paymentMethod, item.notes, item.category?.name, ...(item.tags ?? []).map((tag) => tag.name)].join(" ").toLowerCase();
      if (query && !searchable.includes(query)) return false;
      if (appliedFilters.category && item.category?.name !== appliedFilters.category) return false;
      if (appliedFilters.tag && !(item.tags ?? []).some((tag) => tag.name === appliedFilters.tag)) return false;
      const due = dateOnly(item.nextDueDate);
      if (appliedFilters.fromDate && due < appliedFilters.fromDate) return false;
      if (appliedFilters.toDate && due > appliedFilters.toDate) return false;
      if (min !== undefined && item.currentPrice < min) return false;
      if (max !== undefined && item.currentPrice > max) return false;
      return true;
    })
    .sort((a, b) => {
      if (appliedFilters.sort === "dueDesc") return b.nextDueDate.localeCompare(a.nextDueDate);
      if (appliedFilters.sort === "amountAsc") return a.currentPrice - b.currentPrice;
      if (appliedFilters.sort === "amountDesc") return b.currentPrice - a.currentPrice;
      if (appliedFilters.sort === "nameAsc") return a.name.localeCompare(b.name);
      if (appliedFilters.sort === "nameDesc") return b.name.localeCompare(a.name);
      return a.nextDueDate.localeCompare(b.nextDueDate);
    });
});

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
    <div class="filter-panel">
      <label><span>{{ t("search") }}</span><input v-model="filters.search" :placeholder="t('name')" /></label>
      <label><span>{{ t("category") }}</span><select v-model="filters.category"><option value="">{{ t("all") }}</option><option v-for="category in categories" :key="category" :value="category">{{ category }}</option></select></label>
      <label><span>{{ t("tags") }}</span><select v-model="filters.tag"><option value="">{{ t("all") }}</option><option v-for="tag in tags" :key="tag" :value="tag">{{ tag }}</option></select></label>
      <label><span>{{ t("fromDate") }}</span><input v-model="filters.fromDate" type="date" /></label>
      <label><span>{{ t("toDate") }}</span><input v-model="filters.toDate" type="date" /></label>
      <label><span>{{ t("amountMin") }}</span><input v-model="filters.amountMin" min="0" step="0.01" type="number" /></label>
      <label><span>{{ t("amountMax") }}</span><input v-model="filters.amountMax" min="0" step="0.01" type="number" /></label>
      <label><span>{{ t("sort") }}</span><select v-model="filters.sort"><option value="dueAsc">Due asc</option><option value="dueDesc">Due desc</option><option value="amountAsc">Amount asc</option><option value="amountDesc">Amount desc</option><option value="nameAsc">Name asc</option><option value="nameDesc">Name desc</option></select></label>
      <div class="filter-actions">
        <button class="primary-button compact-button" type="button" @click="applyFilters">{{ t("search") }}</button>
        <button class="small-button" type="button" @click="resetFilters">{{ t("reset") }}</button>
      </div>
    </div>
    <EmptyState v-if="subscriptionsQuery.data.value?.length === 0" :title="t('noSubscriptions')" text="Create a subscription to start tracking renewals." />
    <div v-else class="table-list subscription-list">
      <div class="table-head subscription-grid">
        <span>{{ t("name") }}</span><span>{{ t("price") }}</span><span>{{ t("cycle") }}</span><span>{{ t("category") }}</span><span>{{ t("nextDue") }}</span><span>{{ t("status") }}</span><span>{{ t("autoRenew") }}</span>
      </div>
      <article v-for="item in filteredSubscriptions" :key="item.id" class="expand-card">
        <button class="table-row subscription-grid" type="button" @click="expandedId = expandedId === item.id ? '' : item.id">
          <span>{{ item.name }}</span><span>{{ item.currentPrice }} {{ item.currentCurrency }}</span><span>{{ cycleLabel(item.currentCycle) }}</span><span>{{ item.category?.name || "-" }}</span><span>{{ dateOnly(item.nextDueDate) }}</span><StatusBadge :status="item.status" /><span>{{ item.autoRenew ? t("enabled") : t("disabled") }}</span>
        </button>
        <section v-if="expandedId === item.id" class="detail-panel">
          <div class="detail-grid">
            <span>{{ t("siteUrl") }}: {{ item.siteUrl || "-" }}</span>
            <span>{{ t("paymentMethod") }}: {{ item.paymentMethod || "-" }}</span>
            <span>{{ t("introPeriods") }}: {{ item.introPeriods ?? 0 }}</span>
            <span>{{ t("introPrice") }}: {{ item.introPrice ?? 0 }} {{ item.currentCurrency }}</span>
            <span>{{ t("renewalPrice") }}: {{ item.renewalPrice || item.currentPrice }} {{ item.renewalCurrency || item.currentCurrency }}</span>
            <span>{{ t("tags") }}: {{ (item.tags ?? []).map((tag) => tag.name).join(", ") || "-" }}</span>
            <span>{{ t("startDate") }}: {{ dateOnly(item.startDate) }}</span>
            <span>{{ t("endDate") }}: {{ dateOnly(item.endDate) || "-" }}</span>
            <span>{{ t("remindersEnabled") }}: {{ item.remindersEnabled ? t("enabled") : t("disabled") }}</span>
            <span>{{ t("notes") }}: {{ item.notes || "-" }}</span>
          </div>
          <div class="detail-actions">
            <button class="small-button" type="button" @click="renew(item)">Manual renew</button>
            <button class="small-button" type="button" @click="toggleStatus(item)">{{ item.status === "active" ? "Pause" : "Activate" }}</button>
            <button class="small-button" type="button" @click="openEdit(item)"><Edit3 :size="15" /> <span>{{ t("edit") }}</span></button>
            <button class="small-button danger-button" type="button" @click="remove(item)"><Trash2 :size="15" /> <span>{{ t("delete") }}</span></button>
          </div>
          <h2>{{ t("relatedPayments") }}</h2>
          <div class="row-list compact-list">
            <div v-if="(paymentsBySubscription.get(item.id) ?? []).length > 0" class="table-head payment-detail-grid">
              <span>{{ t("date") }}</span><span>{{ t("amount") }}</span><span>{{ t("baseAmount") }}</span><span>{{ t("source") }}</span>
            </div>
            <div v-for="payment in paymentsBySubscription.get(item.id) ?? []" :key="payment.id" class="data-row payment-detail-grid payment-detail-row">
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
      <label><span>{{ t("category") }}</span><input v-model="form.categoryName" /></label>
      <label class="full-field"><span>{{ t("tags") }}</span><input v-model="form.tagText" :placeholder="t('tagInputHint')" /></label>
      <label><span>{{ t("price") }}</span><input v-model.number="form.currentPrice" min="0" step="0.01" type="number" /></label>
      <label><span>{{ t("currency") }}</span><input v-model="form.currentCurrency" maxlength="3" /></label>
      <label><span>{{ t("introPeriods") }}</span><input v-model.number="form.introPeriods" min="0" step="1" type="number" /></label>
      <label><span>{{ t("introPrice") }}</span><input v-model.number="form.introPrice" min="0" step="0.01" type="number" /></label>
      <label><span>{{ t("renewalPrice") }}</span><input v-model.number="form.renewalPrice" min="0" step="0.01" type="number" /></label>
      <label><span>{{ t("renewalCurrency") }}</span><input v-model="form.renewalCurrency" maxlength="3" /></label>
      <label><span>{{ t("cycle") }}</span><select v-model="form.currentCycle"><option v-for="option in cycleOptions" :key="option.value" :value="option.value">{{ t(option.labelKey) }}</option></select></label>
      <label><span>{{ t("startDate") }}</span><input v-model="form.startDate" type="date" /></label>
      <label><span>{{ t("endDate") }}</span><input v-model="form.endDate" type="date" /></label>
      <label><span>{{ t("nextDue") }}</span><input v-model="form.nextDueDate" type="date" /></label>
      <label><span>{{ t("status") }}</span><select v-model="form.status"><option>active</option><option>expired</option><option>paused</option><option>cancelled</option><option>unavailable</option></select></label>
      <label class="check-row"><input v-model="form.autoRenew" type="checkbox" /><span>{{ t("autoRenew") }}</span></label>
      <label class="check-row"><input v-model="form.remindersEnabled" type="checkbox" /><span>{{ t("remindersEnabled") }}</span></label>
      <label v-if="!editingId" class="check-row"><input v-model="form.initialPaymentPaid" type="checkbox" /><span>{{ t("firstPeriodPaid") }}</span></label>
      <section class="full-field reminder-editor">
        <div class="section-heading">
          <h3>Reminder rules</h3>
          <button class="small-button" type="button" @click="addReminderRule">Add rule</button>
        </div>
        <label class="check-row"><input v-model="form.useGlobalReminders" type="checkbox" /><span>Use global default reminder rules</span></label>
        <div class="reminder-rule-row reminder-rule-head">
          <span>On</span><span>Name</span><span>Type</span><span>Value</span><span>Unit</span><span>Channels</span><span>Action</span>
        </div>
        <div v-for="(rule, index) in form.reminderRules" :key="index" class="reminder-rule-row" :class="{ muted: form.useGlobalReminders }">
          <input v-model="rule.enabled" :disabled="form.useGlobalReminders" type="checkbox" />
          <input v-model="rule.name" :disabled="form.useGlobalReminders" />
          <select v-model="rule.type" :disabled="form.useGlobalReminders"><option value="before_expiry">Before</option><option value="on_expiry">On day</option><option value="after_expiry">After</option></select>
          <input v-model.number="rule.value" :disabled="form.useGlobalReminders" min="0" type="number" />
          <select v-model="rule.unit" :disabled="form.useGlobalReminders"><option value="days">Days</option><option value="hours">Hours</option></select>
          <select v-model="rule.channelIds" :disabled="form.useGlobalReminders" multiple><option v-for="channel in channelsQuery.data.value" :key="channel.id" :value="channel.id">{{ channel.name }} / {{ channel.type }}</option></select>
          <button class="small-button danger-button" type="button" @click="removeReminderRule(index)">Delete</button>
        </div>
      </section>
      <label class="full-field"><span>{{ t("notes") }}</span><textarea v-model="form.notes" /></label>
      <div class="modal-actions"><button class="small-button" type="button" @click="modalOpen = false">{{ t("cancel") }}</button><button class="primary-button compact-button" type="submit">{{ t("save") }}</button></div>
    </form>
  </AppModal>
</template>
