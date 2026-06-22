<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { computed, ref, watchEffect } from "vue";
import EmptyState from "../../components/EmptyState.vue";
import StatusBadge from "../../components/StatusBadge.vue";
import { queries } from "../../api/queries";

const users = useQuery({ queryKey: ["admin-shared-users"], queryFn: queries.sharedUsers });
const selectedUserId = ref("");
watchEffect(() => {
  if (!selectedUserId.value && users.data.value?.[0]) selectedUserId.value = users.data.value[0].id;
});
const selectedUser = computed(() => users.data.value?.find((item) => item.id === selectedUserId.value));
const subscriptions = useQuery({ queryKey: ["admin-shared-subscriptions", selectedUserId], queryFn: () => queries.sharedSubscriptions(selectedUserId.value), enabled: computed(() => Boolean(selectedUserId.value)) });
const payments = useQuery({ queryKey: ["admin-shared-payments", selectedUserId], queryFn: () => queries.sharedPayments(selectedUserId.value), enabled: computed(() => Boolean(selectedUserId.value)) });
</script>

<template>
  <section class="split-page">
    <section class="table-panel">
      <header><h1>Shared Users</h1></header>
      <EmptyState v-if="users.data.value?.length === 0" title="No shared data" text="Users must enable data sharing before admins can read records." />
      <div v-else class="row-list">
        <button v-for="item in users.data.value" :key="item.id" class="data-row select-row" :class="{ selected: item.id === selectedUserId }" type="button" @click="selectedUserId = item.id">
          <span>{{ item.displayName }}</span><span>{{ item.username }}</span><StatusBadge :status="item.status" />
        </button>
      </div>
    </section>
    <section class="table-panel">
      <header><h1>{{ selectedUser?.displayName ?? "Read-only data" }}</h1></header>
      <div class="row-list">
        <div v-for="item in subscriptions.data.value" :key="item.id" class="data-row"><span>{{ item.name }}</span><span>{{ item.currentPrice }} {{ item.currentCurrency }}</span><span>{{ item.nextDueDate.slice(0, 10) }}</span><StatusBadge :status="item.status" /></div>
        <div v-for="item in payments.data.value" :key="item.id" class="data-row muted"><span>{{ item.paidAt.slice(0, 10) }}</span><span>{{ item.originalAmount }} {{ item.originalCurrency }}</span><span>{{ item.baseAmount }} {{ item.baseCurrency }}</span></div>
      </div>
    </section>
  </section>
</template>
