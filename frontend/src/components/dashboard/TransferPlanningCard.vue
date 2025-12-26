<template>
  <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
    <h2 class="text-lg font-semibold text-slate-800 mb-4">Weekly Transfer Plan</h2>

    <!-- Summary bar -->
    <div class="mb-6">
      <div class="flex justify-between text-sm mb-2">
        <span class="text-slate-600">Total Transfers</span>
        <span class="font-mono font-medium">
          ${{ formatMoney(recommendations.totalRecommended) }} / ${{ formatMoney(recommendations.weeklyNet) }}
        </span>
      </div>
      <div class="h-4 bg-slate-100 rounded-full overflow-hidden">
        <div class="h-full flex">
          <!-- Expenses (all expenses weekly-ised) -->
          <div
            class="bg-slate-400 transition-all"
            :style="{ width: barWidth(recommendations.totalWeeklyExpenses) }"
          ></div>
          <!-- Acceleration -->
          <div
            class="bg-teal-400 transition-all"
            :style="{ width: barWidth(recommendations.totalAcceleration) }"
          ></div>
        </div>
      </div>
      <div class="flex justify-between mt-2 text-xs">
        <div class="flex items-center gap-4">
          <span class="flex items-center gap-1">
            <span class="w-3 h-3 rounded bg-slate-400"></span>
            <span class="text-slate-600">Expenses</span>
          </span>
          <span class="flex items-center gap-1">
            <span class="w-3 h-3 rounded bg-teal-400"></span>
            <span class="text-slate-600">Acceleration</span>
          </span>
        </div>
        <span
          class="font-medium"
          :class="recommendations.isWithinBudget ? 'text-slate-500' : 'text-red-500'"
        >
          {{ Math.round((recommendations.totalRecommended / recommendations.weeklyNet) * 100) }}%
        </span>
      </div>
    </div>

    <!-- Per-account breakdown -->
    <div class="space-y-3">
      <div
        v-for="rec in recommendations.recommendations.filter(r => r.recommendedTransfer > 0)"
        :key="rec.accountId"
        class="p-4 bg-slate-50 rounded-xl"
      >
        <div class="flex justify-between items-center mb-2">
          <span class="font-medium text-slate-800">{{ rec.accountName || 'Unnamed' }}</span>
          <span class="font-mono font-semibold text-teal-600">
            ${{ formatMoney(rec.recommendedTransfer) }}/wk
          </span>
        </div>

        <!-- Mini stacked bar -->
        <div class="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div class="h-full flex">
            <div
              class="bg-slate-400"
              :style="{ width: accountBarWidth(rec, rec.weeklyEquilibrium) }"
            ></div>
            <div
              class="bg-teal-400"
              :style="{ width: accountBarWidth(rec, rec.acceleration) }"
            ></div>
          </div>
        </div>

        <!-- Breakdown text -->
        <div class="flex gap-4 mt-2 text-xs text-slate-500">
          <span v-if="rec.weeklyEquilibrium > 0">
            Expenses: ${{ formatMoney(rec.weeklyEquilibrium) }}
          </span>
          <span v-if="rec.acceleration > 0" class="text-teal-600">
            Accel: ${{ formatMoney(rec.acceleration) }}
          </span>
        </div>

        <!-- Equilibrium date indicator (when acceleration is configured) -->
        <div v-if="getEquilibriumInfo(rec.accountId)" class="mt-3 pt-3 border-t border-slate-200">
          <div v-if="getEquilibriumInfo(rec.accountId).weeksUntilEquilibrium" class="flex items-center gap-2">
            <svg class="w-4 h-4 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
            </svg>
            <span class="text-sm text-slate-600">
              Equilibrium in <strong class="text-teal-600">{{ getEquilibriumInfo(rec.accountId).weeksUntilEquilibrium }} weeks</strong>
              <span class="text-slate-400">({{ formatDate(getEquilibriumInfo(rec.accountId).equilibriumDate) }})</span>
            </span>
          </div>
          <div v-else-if="getEquilibriumInfo(rec.accountId).acceleration > 0" class="flex items-center gap-2 text-amber-600">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <span class="text-sm">Equilibrium not reachable within 2 years at current acceleration</span>
          </div>
        </div>
      </div>
    </div>

    <!-- No transfers message -->
    <div
      v-if="recommendations.recommendations.every(r => r.recommendedTransfer === 0)"
      class="text-center py-6 text-slate-500"
    >
      No transfers scheduled. Link expenses to accounts to see recommendations.
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useBudgetStore } from '@/stores/budget'

const budgetStore = useBudgetStore()

const recommendations = computed(() => budgetStore.calculateTransferRecommendations())
const equilibriumDates = computed(() => budgetStore.calculateEquilibriumDate())

function getEquilibriumInfo(accountId) {
  return equilibriumDates.value.find(e => e.accountId === accountId && e.acceleration > 0)
}

function barWidth(amount) {
  const weeklyNet = recommendations.value.weeklyNet || 1
  const percentage = Math.min(100, (amount / weeklyNet) * 100)
  return `${percentage}%`
}

function accountBarWidth(rec, amount) {
  const total = rec.recommendedTransfer || 1
  const percentage = (amount / total) * 100
  return `${percentage}%`
}

function formatMoney(value) {
  return (value || 0).toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}
</script>
