<template>
  <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
    <h2 class="text-lg font-semibold text-slate-800 mb-4">Acceleration Budget</h2>

    <!-- Available budget -->
    <div class="text-center mb-6">
      <div class="text-sm text-slate-500 mb-1">Available for acceleration</div>
      <div class="text-3xl font-bold font-mono text-teal-600">
        ${{ formatMoney(recommendations.availableForAcceleration) }}
        <span class="text-lg text-slate-400 font-normal">/wk</span>
      </div>
      <div class="text-xs text-slate-400 mt-1">
        After expenses (${{ formatMoney(recommendations.totalWeeklyExpenses) }})
      </div>
    </div>

    <!-- Usage gauge -->
    <div class="mb-4">
      <div class="flex justify-between text-sm mb-2">
        <span class="text-slate-600">Acceleration used</span>
        <span class="font-mono">
          ${{ formatMoney(recommendations.totalAcceleration) }} / ${{ formatMoney(recommendations.availableForAcceleration) }}
        </span>
      </div>
      <div class="h-3 bg-slate-100 rounded-full overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-300"
          :class="recommendations.isAccelerationValid ? 'bg-teal-500' : 'bg-red-500'"
          :style="{ width: accelerationPercentage + '%' }"
        ></div>
      </div>
    </div>

    <!-- Per-account acceleration summary -->
    <div v-if="accountsWithAcceleration.length > 0" class="space-y-2 pt-4 border-t border-slate-100">
      <div class="text-xs text-slate-500 mb-2">Acceleration by account:</div>
      <div
        v-for="rec in accountsWithAcceleration"
        :key="rec.accountId"
        class="flex justify-between text-sm"
      >
        <span class="text-slate-600">{{ rec.accountName || 'Unnamed' }}</span>
        <span class="font-mono text-teal-600">+${{ formatMoney(rec.acceleration) }}/wk</span>
      </div>
    </div>

    <!-- Status message -->
    <div
      v-if="!recommendations.isAccelerationValid"
      class="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
    >
      <strong>Over budget!</strong> Reduce acceleration by
      ${{ formatMoney(recommendations.totalAcceleration - recommendations.availableForAcceleration) }}/wk.
    </div>
    <div
      v-else-if="recommendations.totalAcceleration === 0 && recommendations.availableForAcceleration > 0"
      class="mt-4 p-3 bg-teal-50 border border-teal-200 rounded-xl text-sm text-teal-700"
    >
      <strong>Tip:</strong> You have spare capacity! Consider accelerating your expense accounts to build buffers faster.
    </div>
    <div
      v-else-if="recommendations.availableForAcceleration === 0"
      class="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600"
    >
      No room for acceleration. All income is allocated to expenses.
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useBudgetStore } from '@/stores/budget'

const budgetStore = useBudgetStore()

const recommendations = computed(() => budgetStore.calculateTransferRecommendations())

const accelerationPercentage = computed(() => {
  const available = recommendations.value.availableForAcceleration || 1
  return Math.min(100, (recommendations.value.totalAcceleration / available) * 100)
})

const accountsWithAcceleration = computed(() => {
  return recommendations.value.recommendations.filter(r => r.acceleration > 0)
})

function formatMoney(value) {
  return (value || 0).toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>
