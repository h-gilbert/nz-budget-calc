<template>
  <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-semibold text-slate-800">Account Overview</h2>
      <span class="text-sm text-slate-500">{{ budgetStore.accounts.length }} accounts</span>
    </div>

    <!-- Empty state -->
    <div v-if="budgetStore.accounts.length === 0" class="text-center py-8 text-slate-500">
      <p>No accounts set up yet.</p>
      <p class="text-sm mt-1">Add accounts in the Setup page to see transfer recommendations.</p>
    </div>

    <!-- Account cards grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <div
        v-for="rec in recommendations.recommendations"
        :key="rec.accountId"
        class="p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
      >
        <!-- Account name and balance -->
        <div class="flex justify-between items-start mb-2">
          <span class="font-medium text-slate-800 text-sm truncate mr-2">{{ rec.accountName || 'Unnamed' }}</span>
          <span class="font-mono text-teal-600 font-semibold text-sm whitespace-nowrap">
            ${{ formatMoney(rec.currentBalance) }}
          </span>
        </div>

        <!-- Compact stats row -->
        <div class="flex justify-between text-xs text-slate-500 mb-2">
          <span>${{ formatMoney(rec.weeklyEquilibrium) }}/wk</span>
          <span class="font-medium text-slate-700">${{ formatMoney(rec.recommendedTransfer) }}/wk</span>
        </div>

        <!-- Inline acceleration -->
        <div class="flex items-center justify-between pt-2 border-t border-slate-200">
          <span class="text-xs text-slate-400">Accel:</span>
          <div class="flex items-center gap-1">
            <span class="text-slate-400 text-xs">$</span>
            <input
              type="number"
              :value="rec.acceleration"
              @input="updateAcceleration(rec.accountId, $event.target.value)"
              class="w-14 px-1.5 py-0.5 text-xs font-mono rounded border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500/20 focus:border-teal-400"
              placeholder="0"
              min="0"
              step="10"
            />
            <span class="text-xs text-slate-400">/wk</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Acceleration budget warning -->
    <div
      v-if="!recommendations.isAccelerationValid"
      class="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700"
    >
      <strong>Acceleration exceeds budget!</strong> You've set
      ${{ formatMoney(recommendations.totalAcceleration) }}/wk but only
      ${{ formatMoney(recommendations.availableForAcceleration) }}/wk is available.
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useBudgetStore } from '@/stores/budget'

const budgetStore = useBudgetStore()

const recommendations = computed(() => budgetStore.calculateTransferRecommendations())

function updateAcceleration(accountId, value) {
  const amount = parseFloat(value) || 0
  budgetStore.updateAccount(accountId, 'accelerationAmount', Math.max(0, amount))
}

function formatMoney(value) {
  return (value || 0).toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>
