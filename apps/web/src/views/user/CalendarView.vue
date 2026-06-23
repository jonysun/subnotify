<script setup lang="ts">
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import { useQuery } from "@tanstack/vue-query";
import { computed, ref } from "vue";
import EmptyState from "../../components/EmptyState.vue";
import { queries } from "../../api/queries";
import { useI18n } from "../../i18n";

const subscriptionsQuery = useQuery({ queryKey: ["subscriptions"], queryFn: queries.subscriptions });
const paymentsQuery = useQuery({ queryKey: ["payments"], queryFn: queries.payments });
const { locale, t } = useI18n();
const cursor = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
const weekLabels = computed(() => (locale.value === "zh-CN" ? ["一", "二", "三", "四", "五", "六", "日"] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]));
const title = computed(() => new Intl.DateTimeFormat(locale.value, { year: "numeric", month: "long" }).format(cursor.value));

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function moveMonth(delta: number) {
  cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() + delta, 1);
}

const eventsByDate = computed(() => {
  const map = new Map<string, Array<{ type: "due" | "paid"; label: string; detail: string }>>();
  const add = (key: string, event: { type: "due" | "paid"; label: string; detail: string }) => {
    const events = map.get(key) ?? [];
    events.push(event);
    map.set(key, events);
  };
  for (const item of subscriptionsQuery.data.value ?? []) {
    add(item.nextDueDate.slice(0, 10), { type: "due", label: `${t("due")} ${item.name}`, detail: `${item.currentPrice} ${item.currentCurrency}` });
  }
  for (const item of paymentsQuery.data.value ?? []) {
    add(item.paidAt.slice(0, 10), { type: "paid", label: `${t("paid")} ${item.originalAmount} ${item.originalCurrency}`, detail: item.source });
  }
  return map;
});

const days = computed(() => {
  const first = cursor.value;
  const firstOffset = (first.getDay() + 6) % 7;
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - firstOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = dateKey(date);
    return {
      key,
      day: date.getDate(),
      inMonth: date.getMonth() === cursor.value.getMonth(),
      isToday: key === dateKey(new Date()),
      events: eventsByDate.value.get(key) ?? []
    };
  });
});
</script>

<template>
  <section class="table-panel">
    <header>
      <h1>{{ t("calendar") }}</h1>
      <div class="calendar-actions">
        <button class="small-button" type="button" @click="moveMonth(-1)"><ChevronLeft :size="16" /> <span>{{ t("previousMonth") }}</span></button>
        <strong>{{ title }}</strong>
        <button class="small-button" type="button" @click="moveMonth(1)"><span>{{ t("nextMonth") }}</span><ChevronRight :size="16" /></button>
      </div>
    </header>
    <EmptyState v-if="(subscriptionsQuery.data.value?.length ?? 0) === 0 && (paymentsQuery.data.value?.length ?? 0) === 0" title="No dates" text="Renewal and payment dates will appear here." />
    <div v-else class="calendar-grid">
      <div v-for="label in weekLabels" :key="label" class="calendar-weekday">{{ label }}</div>
      <div v-for="day in days" :key="day.key" class="calendar-day" :class="{ muted: !day.inMonth, today: day.isToday }">
        <strong>{{ day.day }}</strong>
        <div class="calendar-events">
          <span v-for="event in day.events" :key="`${event.type}-${event.label}-${event.detail}`" class="calendar-event" :data-type="event.type">
            {{ event.label }}
          </span>
        </div>
      </div>
    </div>
  </section>
</template>
