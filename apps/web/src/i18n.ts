import { computed, ref } from "vue";

export type Locale = "zh-CN" | "en-US";

const locale = ref<Locale>("zh-CN");

const messages = {
  "zh-CN": {
    dashboard: "仪表盘",
    subscriptions: "订阅",
    payments: "支付",
    calendar: "日历",
    notifications: "通知",
    settings: "设置",
    users: "用户",
    backups: "备份",
    system: "系统",
    shared: "共享",
    audit: "审计",
    admin: "管理员",
    user: "用户",
    logout: "退出",
    workspace: "工作台",
    name: "名称",
    siteUrl: "原站链接",
    paymentMethod: "付款方式",
    price: "金额",
    currency: "币种",
    cycle: "周期",
    startDate: "起始日期",
    endDate: "结束日期",
    nextDue: "下次到期",
    status: "状态",
    autoRenew: "自动续费",
    remindersEnabled: "启用提醒",
    firstPeriodPaid: "第一期已支付",
    notes: "备注",
    add: "新增",
    date: "日期",
    subscription: "关联订阅",
    periodStart: "服务周期开始",
    periodEnd: "服务周期结束",
    amount: "原币金额",
    baseAmount: "本位币金额",
    baseCurrency: "本位币",
    manualBaseAmount: "手动输入本位币金额",
    source: "来源",
    save: "保存",
    language: "语言",
    exchangeProvider: "汇率来源",
    dataSharing: "数据分享",
    due: "到期",
    paid: "支付",
    today: "今天",
    previousMonth: "上一月",
    nextMonth: "下一月",
    noSubscriptions: "暂无订阅",
    noPayments: "暂无支付记录"
  },
  "en-US": {
    dashboard: "Dashboard",
    subscriptions: "Subscriptions",
    payments: "Payments",
    calendar: "Calendar",
    notifications: "Notifications",
    settings: "Settings",
    users: "Users",
    backups: "Backups",
    system: "System",
    shared: "Shared",
    audit: "Audit",
    admin: "Admin",
    user: "User",
    logout: "Logout",
    workspace: "Workspace",
    name: "Name",
    siteUrl: "Original site",
    paymentMethod: "Payment method",
    price: "Price",
    currency: "Currency",
    cycle: "Cycle",
    startDate: "Start date",
    endDate: "End date",
    nextDue: "Next due",
    status: "Status",
    autoRenew: "Auto renew",
    remindersEnabled: "Enable reminders",
    firstPeriodPaid: "First period paid",
    notes: "Notes",
    add: "Add",
    date: "Date",
    subscription: "Subscription",
    periodStart: "Period start",
    periodEnd: "Period end",
    amount: "Original amount",
    baseAmount: "Base amount",
    baseCurrency: "Base currency",
    manualBaseAmount: "Manual base amount",
    source: "Source",
    save: "Save",
    language: "Language",
    exchangeProvider: "Exchange provider",
    dataSharing: "Data sharing",
    due: "Due",
    paid: "Paid",
    today: "Today",
    previousMonth: "Previous",
    nextMonth: "Next",
    noSubscriptions: "No subscriptions",
    noPayments: "No payments"
  }
} as const;

export function setLocale(nextLocale?: string) {
  locale.value = nextLocale === "en-US" ? "en-US" : "zh-CN";
}

export function useI18n() {
  const currentLocale = computed(() => locale.value);
  function t(key: MessageKey) {
    return messages[locale.value][key];
  }
  return { locale: currentLocale, t };
}

export type MessageKey = keyof typeof messages["zh-CN"];
