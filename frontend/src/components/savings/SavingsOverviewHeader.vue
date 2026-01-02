<template>
  <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
    <div class="grid sm:grid-cols-3 gap-6">
      <!-- Total Saved -->
      <div class="text-center sm:text-left">
        <div class="text-sm text-slate-500 mb-1">Total Saved</div>
        <div class="text-3xl font-bold text-blue-600 font-mono">
          ${{ formatMoney(totalSaved) }}
        </div>
      </div>

      <!-- Weekly Contributions -->
      <div class="text-center">
        <div class="text-sm text-slate-500 mb-1">Weekly Contributions</div>
        <div class="text-3xl font-bold text-slate-800 font-mono">
          ${{ formatMoney(totalWeeklyContributions) }}
        </div>
      </div>

      <!-- Combined Progress -->
      <div class="text-center sm:text-right">
        <div class="text-sm text-slate-500 mb-1">Combined Progress</div>
        <div class="text-3xl font-bold text-slate-800">
          {{ Math.round(combinedProgress) }}%
          <span class="text-sm font-normal text-slate-500">across {{ savingsCount }} goal{{ savingsCount !== 1 ? 's' : '' }}</span>
        </div>
      </div>
    </div>

    <!-- Combined Progress Bar -->
    <div class="mt-6">
      <div class="h-3 bg-blue-100 rounded-full overflow-hidden">
        <div
          class="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500"
          :style="{ width: `${Math.min(100, combinedProgress)}%` }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useBudgetStore } from '@/stores/budget'

const budgetStore = useBudgetStore()

const savingsAccounts = computed(() => budgetStore.getSavingsAccounts())
const savingsCount = computed(() => savingsAccounts.value.length)

const totalSaved = computed(() => {
  return savingsAccounts.value.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0)
})

const totalWeeklyContributions = computed(() => {
  return savingsAccounts.value.reduce((sum, acc) => sum + (parseFloat(acc.savingsWeeklyContribution) || 0), 0)
})

const combinedProgress = computed(() => {
  const accountsWithGoals = savingsAccounts.value.filter(acc => acc.savingsGoalTarget)
  if (accountsWithGoals.length === 0) return 0

  const totalBalance = accountsWithGoals.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0)
  const totalGoal = accountsWithGoals.reduce((sum, acc) => sum + (parseFloat(acc.savingsGoalTarget) || 0), 0)

  return totalGoal > 0 ? (totalBalance / totalGoal) * 100 : 0
})

function formatMoney(value) {
  return (value || 0).toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>
