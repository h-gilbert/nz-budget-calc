<template>
  <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
    <h2 class="text-lg font-semibold text-slate-800 mb-4">Weekly Summary</h2>

    <div class="space-y-4">
      <!-- Weekly Take-home -->
      <div class="flex justify-between items-center">
        <span class="text-slate-600">Take-home Pay</span>
        <span class="font-mono font-semibold text-xl text-slate-800">${{ formatMoney(recommendations.weeklyNet) }}</span>
      </div>

      <div class="h-px bg-slate-100"></div>

      <!-- Weekly Expenses (all expenses weekly-ised) -->
      <div class="flex justify-between items-center">
        <span class="text-slate-600">Expenses</span>
        <span class="font-mono text-slate-700">-${{ formatMoney(recommendations.totalWeeklyExpenses) }}</span>
      </div>

      <!-- Acceleration -->
      <div v-if="recommendations.totalAcceleration > 0" class="flex justify-between items-center">
        <span class="text-slate-600">Acceleration</span>
        <span class="font-mono text-teal-600">-${{ formatMoney(recommendations.totalAcceleration) }}</span>
      </div>

      <!-- Savings Contributions -->
      <div v-if="recommendations.totalSavingsContributions > 0" class="flex justify-between items-center">
        <span class="text-slate-600">Savings</span>
        <span class="font-mono text-blue-600">-${{ formatMoney(recommendations.totalSavingsContributions) }}</span>
      </div>

      <div class="h-px bg-slate-100"></div>

      <!-- Remaining -->
      <div class="flex justify-between items-center">
        <span class="font-medium text-slate-800">Remaining</span>
        <span
          class="font-mono font-bold text-xl"
          :class="recommendations.remainingAfterTransfers >= 0 ? 'text-teal-600' : 'text-red-500'"
        >
          ${{ formatMoney(recommendations.remainingAfterTransfers) }}
        </span>
      </div>

      <!-- Warning if over budget -->
      <div
        v-if="!recommendations.isWithinBudget"
        class="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
      >
        <strong>Over budget!</strong> Your transfers exceed your weekly income by
        ${{ formatMoney(Math.abs(recommendations.remainingAfterTransfers)) }}.
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useBudgetStore } from '@/stores/budget'

const budgetStore = useBudgetStore()

const recommendations = computed(() => budgetStore.calculateTransferRecommendations())

function formatMoney(value) {
  return (value || 0).toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>
