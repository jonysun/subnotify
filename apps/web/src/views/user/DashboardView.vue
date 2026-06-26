<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import EmptyState from "../../components/EmptyState.vue";
import StatCard from "../../components/StatCard.vue";
import { queries } from "../../api/queries";

const dashboardQuery = useQuery({ queryKey: ["dashboard-stats"], queryFn: queries.dashboardStats });

function money(amount?: number, currency?: string) {
  return `${(amount ?? 0).toFixed(2)} ${currency ?? "CNY"}`;
}

function dateOnly(value?: string) {
  return value ? value.slice(0, 10) : "";
}
</script>

<template>
  <section class="page-grid">
    <StatCard label="本月支出" :value="money(dashboardQuery.data.value?.monthlyExpense.amount, dashboardQuery.data.value?.monthlyExpense.currency)" detail="按实际支付记录统计" />
    <StatCard label="今年支出" :value="money(dashboardQuery.data.value?.yearlyExpense.amount, dashboardQuery.data.value?.yearlyExpense.currency)" :detail="`月均 ${money(dashboardQuery.data.value?.yearlyExpense.monthlyAverage, dashboardQuery.data.value?.yearlyExpense.currency)}`" />
    <StatCard label="有效订阅" :value="String(dashboardQuery.data.value?.activeSubscriptions.active ?? 0)" :detail="`总计 ${dashboardQuery.data.value?.activeSubscriptions.total ?? 0} 条`" />
    <StatCard label="即将到期" :value="String(dashboardQuery.data.value?.activeSubscriptions.expiringSoon ?? 0)" detail="未来 7 天需要关注" />
  </section>

  <section class="dashboard-layout">
    <article class="table-panel">
      <header><h1>近期支付</h1></header>
      <EmptyState v-if="(dashboardQuery.data.value?.recentPayments ?? []).length === 0" title="暂无近期支付" text="最近 7 天的支付会显示在这里。" />
      <div v-else class="row-list">
        <div class="table-head dashboard-row"><span>订阅</span><span>日期</span><span>金额</span><span>来源</span></div>
        <div v-for="payment in dashboardQuery.data.value?.recentPayments" :key="payment.id" class="data-row dashboard-row">
          <span>{{ payment.name }}</span>
          <span>{{ dateOnly(payment.paidAt) }}</span>
          <span>{{ money(payment.amount, payment.currency) }}</span>
          <span>{{ payment.source }}</span>
        </div>
      </div>
    </article>

    <article class="table-panel">
      <header><h1>即将续费</h1></header>
      <EmptyState v-if="(dashboardQuery.data.value?.upcomingRenewals ?? []).length === 0" title="暂无续费计划" text="未来 7 天的续费会显示在这里。" />
      <div v-else class="row-list">
        <div class="table-head dashboard-row"><span>订阅</span><span>到期日</span><span>金额</span><span>状态</span></div>
        <div v-for="renewal in dashboardQuery.data.value?.upcomingRenewals" :key="renewal.id" class="data-row dashboard-row">
          <span>{{ renewal.name }}</span>
          <span>{{ dateOnly(renewal.renewalDate) }}</span>
          <span>{{ money(renewal.amount, renewal.currency) }}</span>
          <span>{{ renewal.autoRenew ? "自动续费" : `${renewal.daysUntilRenewal} 天后` }}</span>
        </div>
      </div>
    </article>
  </section>

  <section class="dashboard-layout">
    <article class="table-panel">
      <header><h1>分类支出排行</h1></header>
      <EmptyState v-if="(dashboardQuery.data.value?.expenseByCategory ?? []).length === 0" title="暂无分类统计" text="有支付记录后会按分类汇总。" />
      <div v-else class="rank-list">
        <div v-for="item in dashboardQuery.data.value?.expenseByCategory" :key="item.category" class="rank-row">
          <div><strong>{{ item.category }}</strong><span>{{ money(item.amount, dashboardQuery.data.value?.yearlyExpense.currency) }}</span></div>
          <progress :value="item.percentage" max="100" />
        </div>
      </div>
    </article>

    <article class="table-panel">
      <header><h1>周期支出排行</h1></header>
      <EmptyState v-if="(dashboardQuery.data.value?.expenseByType ?? []).length === 0" title="暂无周期统计" text="有支付记录后会按账期汇总。" />
      <div v-else class="rank-list">
        <div v-for="item in dashboardQuery.data.value?.expenseByType" :key="item.type" class="rank-row">
          <div><strong>{{ item.type }}</strong><span>{{ money(item.amount, dashboardQuery.data.value?.yearlyExpense.currency) }}</span></div>
          <progress :value="item.percentage" max="100" />
        </div>
      </div>
    </article>
  </section>
</template>
