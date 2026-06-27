<script setup lang="ts">
import { Play, Plus } from "lucide-vue-next";
import { useQuery } from "@tanstack/vue-query";
import { computed, reactive, watch } from "vue";
import EmptyState from "../../components/EmptyState.vue";
import { queries } from "../../api/queries";

const channels = useQuery({ queryKey: ["notification-channels"], queryFn: queries.notificationChannels });
const rules = useQuery({ queryKey: ["reminder-rules"], queryFn: queries.reminderRules });
const logs = useQuery({ queryKey: ["notification-logs"], queryFn: queries.notificationLogs });

const channelTypes = [
  { type: "telegram", label: "Telegram", template: { dryRun: true, botToken: "", chatId: "" } },
  { type: "wechatbot", label: "企业微信机器人", template: { dryRun: true, webhook: "" } },
  { type: "email", label: "Email / Resend", template: { dryRun: true, resendApiKey: "", from: "", to: "" } },
  { type: "webhook", label: "Webhook", template: { dryRun: true, url: "", method: "POST" } },
  { type: "bark", label: "Bark", template: { dryRun: true, endpoint: "" } },
  { type: "gotify", label: "Gotify", template: { dryRun: true, serverUrl: "", appToken: "" } },
  { type: "serverchan", label: "Server 酱", template: { dryRun: true, sendKey: "" } },
  { type: "pushplus", label: "PushPlus", template: { dryRun: true, token: "" } },
  { type: "notifyx", label: "NotifyX", template: { dryRun: true, apiKey: "" } },
  { type: "smtp", label: "SMTP/Webhook 兼容", template: { dryRun: true, host: "", to: "" } }
];

const channelForm = reactive({ type: "telegram", name: "Telegram", configText: JSON.stringify(channelTypes[0].template, null, 2) });
const ruleForm = reactive({ name: "到期前 3 天", daysBefore: 3, channelIds: [] as string[] });
const lastResult = reactive({ text: "" });
const selectedType = computed(() => channelTypes.find((item) => item.type === channelForm.type) ?? channelTypes[0]);

watch(
  () => channelForm.type,
  () => {
    channelForm.name = selectedType.value.label;
    channelForm.configText = JSON.stringify(selectedType.value.template, null, 2);
  }
);

async function createChannel() {
  await queries.createNotificationChannel({ type: channelForm.type, name: channelForm.name, config: JSON.parse(channelForm.configText) });
  await channels.refetch();
}

async function testChannel(id: string) {
  const log = await queries.testNotificationChannel(id);
  lastResult.text = `${log.status}: ${log.title}`;
  await logs.refetch();
}

async function createRule() {
  await queries.createReminderRule({ name: ruleForm.name, daysBefore: ruleForm.daysBefore, channelIds: ruleForm.channelIds });
  await rules.refetch();
}
</script>

<template>
  <section class="split-page">
    <div class="form-panel stacked">
      <form @submit.prevent="createChannel">
        <h1>通知渠道</h1>
        <label><span>渠道类型</span><select v-model="channelForm.type"><option v-for="item in channelTypes" :key="item.type" :value="item.type">{{ item.label }}</option></select></label>
        <label><span>名称</span><input v-model="channelForm.name" /></label>
        <label><span>配置 JSON</span><textarea v-model="channelForm.configText" /></label>
        <button class="primary-button" type="submit"><Plus :size="18" /> <span>新增渠道</span></button>
      </form>
      <form @submit.prevent="createRule">
        <h1>全局默认提醒</h1>
        <label><span>名称</span><input v-model="ruleForm.name" /></label>
        <label><span>提前天数</span><input v-model.number="ruleForm.daysBefore" type="number" min="0" /></label>
        <label><span>通知渠道</span><select v-model="ruleForm.channelIds" multiple><option v-for="item in channels.data.value" :key="item.id" :value="item.id">{{ item.name }} / {{ item.type }}</option></select></label>
        <button class="primary-button" type="submit"><Plus :size="18" /> <span>新增全局规则</span></button>
      </form>
    </div>
    <section class="table-panel">
      <header><h1>通知设置</h1><span v-if="lastResult.text" class="muted-text">{{ lastResult.text }}</span></header>
      <EmptyState v-if="channels.data.value?.length === 0 && rules.data.value?.length === 0" title="暂无通知设置" text="先添加渠道，再添加全局默认提醒规则。" />
      <div class="row-list">
        <div v-for="item in channels.data.value" :key="item.id" class="data-row notification-row">
          <span>{{ item.name }}</span><span>{{ item.type }}</span><span>{{ item.enabled ? "启用" : "停用" }}</span>
          <button class="small-button" type="button" @click="testChannel(item.id)"><Play :size="14" /> <span>测试</span></button>
        </div>
        <div v-for="item in rules.data.value" :key="item.id" class="data-row notification-row muted"><span>{{ item.name }}</span><span>{{ item.subscriptionId ? "订阅专属" : "全局默认" }}</span><span>提前 {{ item.daysBefore }} 天</span><span>{{ item.enabled ? "启用" : "停用" }}</span></div>
        <div v-for="item in logs.data.value" :key="item.id" class="data-row notification-row muted"><span>{{ item.sentAt.slice(0, 16).replace('T', ' ') }}</span><span>{{ item.title }}</span><span>{{ item.type }}</span><span>{{ item.status }}</span></div>
      </div>
    </section>
  </section>
</template>
