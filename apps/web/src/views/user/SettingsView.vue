<script setup lang="ts">
import { Save } from "lucide-vue-next";
import { useQuery } from "@tanstack/vue-query";
import { reactive, watchEffect } from "vue";
import { queries } from "../../api/queries";
import { setLocale, useI18n } from "../../i18n";
const query = useQuery({ queryKey: ["settings"], queryFn: queries.settings });
const { t } = useI18n();
const form = reactive({ baseCurrency: "CNY", exchangeRateProvider: "mock", dataSharingEnabled: false, locale: "zh-CN" as "zh-CN" | "en-US" });
watchEffect(() => { if (query.data.value) Object.assign(form, query.data.value); });
async function save() {
  const saved = await queries.updateSettings(form);
  setLocale(saved.locale);
  await query.refetch();
}
</script>
<template>
  <form class="form-panel settings-panel" @submit.prevent="save">
    <h1>{{ t("settings") }}</h1>
    <label><span>{{ t("baseCurrency") }}</span><input v-model="form.baseCurrency" maxlength="3" /></label>
    <label><span>{{ t("exchangeProvider") }}</span><input v-model="form.exchangeRateProvider" /></label>
    <label><span>{{ t("language") }}</span><select v-model="form.locale"><option value="zh-CN">中文</option><option value="en-US">English</option></select></label>
    <label class="check-row"><input v-model="form.dataSharingEnabled" type="checkbox" /><span>{{ t("dataSharing") }}</span></label>
    <button class="primary-button" type="submit"><Save :size="18" /> <span>{{ t("save") }}</span></button>
  </form>
</template>
