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
      <!-- Expense Accounts -->
      <div
        v-for="rec in expenseRecommendations"
        :key="rec.accountId"
        class="p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
      >
        <!-- Account name and balance -->
        <div class="flex justify-between items-start mb-2">
          <div class="flex items-center gap-2">
            <span class="text-xs px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full">Expense</span>
            <span class="font-medium text-slate-800 text-sm truncate">{{ rec.accountName || 'Unnamed' }}</span>
          </div>
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

        <!-- Catch-up lump sum -->
        <div v-if="getLumpSum(rec.accountId) > 0" class="flex items-center justify-between pt-2 border-t border-slate-200 mt-2">
          <span class="text-xs text-slate-400">Catch-up:</span>
          <span class="text-xs font-mono text-amber-600 font-medium">
            ${{ formatMoney(getLumpSum(rec.accountId)) }}
          </span>
        </div>
      </div>

      <!-- Savings Accounts (compact) -->
      <div
        v-for="savings in savingsProjections"
        :key="savings.accountId"
        class="p-3 bg-blue-50 rounded-xl border border-blue-100"
      >
        <!-- Account name and balance -->
        <div class="flex justify-between items-start mb-2">
          <div class="flex items-center gap-2">
            <span class="text-xs px-2 py-0.5 bg-blue-200 text-blue-700 rounded-full">Savings</span>
            <span class="font-medium text-slate-800 text-sm truncate">{{ savings.accountName || 'Unnamed' }}</span>
          </div>
          <span class="font-mono text-blue-600 font-semibold text-sm whitespace-nowrap">
            ${{ formatMoney(savings.currentBalance) }}
          </span>
        </div>

        <!-- Progress bar (if goal set) -->
        <div v-if="savings.goalTarget" class="mb-2">
          <div class="h-2 bg-blue-100 rounded-full overflow-hidden">
            <div
              class="h-full bg-blue-500 transition-all"
              :style="{ width: `${Math.min(100, savings.progressPercent || 0)}%` }"
            ></div>
          </div>
          <div class="flex justify-between text-xs mt-1">
            <span class="text-blue-600 font-medium">{{ Math.round(savings.progressPercent || 0) }}%</span>
            <span class="text-slate-500">${{ formatMoney(savings.goalTarget) }}</span>
          </div>
        </div>

        <!-- Weekly contribution -->
        <div class="flex justify-between text-xs text-slate-500">
          <span>Weekly:</span>
          <span class="font-mono text-blue-600 font-medium">${{ formatMoney(savings.currentRate) }}</span>
        </div>

        <!-- On track indicator (compact) -->
        <div v-if="savings.goalTarget" class="flex items-center gap-1 mt-1">
          <span v-if="savings.isOnTrack" class="text-xs text-green-600 flex items-center gap-1">
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
            </svg>
            On track
          </span>
          <span v-else class="text-xs text-amber-600 flex items-center gap-1">
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
            </svg>
            Behind
          </span>
        </div>
      </div>
    </div>

    <!-- View Savings Details Link -->
    <div v-if="savingsProjections.length > 0" class="mt-4 pt-4 border-t border-gray-100">
      <router-link
        to="/savings"
        class="flex items-center justify-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
      >
        View Savings Details
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </router-link>
    </div>

    <!-- Total catch-up lump sum summary -->
    <div v-if="catchupData.totalLumpSum > 0" class="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
      <div class="flex justify-between items-center">
        <div>
          <span class="text-sm font-medium text-amber-800">Total Catch-up Lump Sum</span>
          <p class="text-xs text-amber-600 mt-0.5">One-time transfer to reach equilibrium</p>
        </div>
        <span class="font-mono font-semibold text-lg text-amber-700">
          ${{ formatMoney(catchupData.totalLumpSum) }}
        </span>
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
const catchupData = computed(() => budgetStore.calculateCatchupLumpSum())

// Filter expense accounts from recommendations
const expenseRecommendations = computed(() =>
  recommendations.value.recommendations.filter(r => r.accountType !== 'savings')
)

// Get savings projections
const savingsProjections = computed(() => {
  const savingsAccounts = budgetStore.getSavingsAccounts()
  return savingsAccounts.map(acc => budgetStore.calculateSavingsProjection(acc.id)).filter(Boolean)
})

function getLumpSum(accountId) {
  return catchupData.value.accounts.find(a => a.accountId === accountId)?.lumpSumNeeded || 0
}

function updateAcceleration(accountId, value) {
  const amount = parseFloat(value) || 0
  budgetStore.updateAccount(accountId, 'accelerationAmount', Math.max(0, amount))
}

function formatMoney(value) {
  return (value || 0).toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>
