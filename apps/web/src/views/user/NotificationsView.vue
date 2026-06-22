<script setup lang="ts">
import { Plus } from "lucide-vue-next";
import { useQuery } from "@tanstack/vue-query";
import { reactive } from "vue";
import EmptyState from "../../components/EmptyState.vue";
import { queries } from "../../api/queries";
const channels = useQuery({ queryKey: ["notification-channels"], queryFn: queries.notificationChannels });
const rules = useQuery({ queryKey: ["reminder-rules"], queryFn: queries.reminderRules });
const logs = useQuery({ queryKey: ["notification-logs"], queryFn: queries.notificationLogs });
const channelForm = reactive({ type: "webhook", name: "Webhook", configText: '{"url":"https://example.com/hook"}' });
const ruleForm = reactive({ name: "Three days", daysBefore: 3 });
async function createChannel() { await queries.createNotificationChannel({ type: channelForm.type, name: channelForm.name, config: JSON.parse(channelForm.configText) }); await channels.refetch(); }
async function createRule() { await queries.createReminderRule({ name: ruleForm.name, daysBefore: ruleForm.daysBefore, channelIds: [] }); await rules.refetch(); }
</script>
<template>
  <section class="split-page">
    <div class="form-panel stacked">
      <form @submit.prevent="createChannel"><h1>Channels</h1><label><span>Type</span><select v-model="channelForm.type"><option>smtp</option><option>telegram</option><option>webhook</option><option>bark</option><option>serverchan</option><option>pushplus</option></select></label><label><span>Name</span><input v-model="channelForm.name" /></label><label><span>Config JSON</span><textarea v-model="channelForm.configText" /></label><button class="primary-button" type="submit"><Plus :size="18" /> <span>Add channel</span></button></form>
      <form @submit.prevent="createRule"><h1>Rules</h1><label><span>Name</span><input v-model="ruleForm.name" /></label><label><span>Days before</span><input v-model.number="ruleForm.daysBefore" type="number" min="0" /></label><button class="primary-button" type="submit"><Plus :size="18" /> <span>Add rule</span></button></form>
    </div>
    <section class="table-panel"><EmptyState v-if="channels.data.value?.length === 0 && rules.data.value?.length === 0" title="No notification setup" text="Create channels and rules to receive renewal reminders." /><div class="row-list"><div v-for="item in channels.data.value" :key="item.id" class="data-row"><span>{{ item.name }}</span><span>{{ item.type }}</span><span>{{ item.enabled ? "enabled" : "disabled" }}</span></div><div v-for="item in rules.data.value" :key="item.id" class="data-row"><span>{{ item.name }}</span><span>{{ item.daysBefore }} days</span><span>{{ item.enabled ? "enabled" : "disabled" }}</span></div><div v-for="item in logs.data.value" :key="item.id" class="data-row muted"><span>{{ item.sentAt.slice(0, 10) }}</span><span>{{ item.title }}</span><span>{{ item.status }}</span></div></div></section>
  </section>
</template>