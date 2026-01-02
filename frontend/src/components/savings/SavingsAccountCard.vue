<template>
  <div class="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
    <!-- Header -->
    <div class="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
      <div class="flex justify-between items-start">
        <div>
          <span class="text-xs px-2 py-1 bg-white/20 text-white rounded-full">Savings Goal</span>
          <h3 class="text-xl font-bold text-white mt-2">{{ account.name || 'Unnamed Savings' }}</h3>
        </div>
        <div class="text-right">
          <div class="text-blue-100 text-sm">Current Balance</div>
          <div class="text-2xl font-bold text-white font-mono">${{ formatMoney(account.balance) }}</div>
        </div>
      </div>

      <!-- Progress Bar -->
      <div v-if="projection?.goalTarget" class="mt-4">
        <div class="h-3 bg-white/20 rounded-full overflow-hidden">
          <div
            class="h-full bg-white transition-all duration-500"
            :style="{ width: `${Math.min(100, projection.progressPercent || 0)}%` }"
          ></div>
        </div>
        <div class="flex justify-between mt-2 text-sm">
          <span class="text-white/80">{{ Math.round(projection.progressPercent || 0) }}% complete</span>
          <span class="text-white font-medium">${{ formatMoney(projection.goalTarget) }} goal</span>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="p-6">
      <!-- Stats Grid -->
      <div class="grid sm:grid-cols-4 gap-4 mb-6">
        <div class="bg-slate-50 rounded-xl p-4">
          <div class="text-xs text-slate-500 mb-1">Weekly Contribution</div>
          <div class="text-lg font-bold text-slate-800 font-mono">${{ formatMoney(projection?.currentRate || 0) }}</div>
        </div>
        <div class="bg-slate-50 rounded-xl p-4">
          <div class="text-xs text-slate-500 mb-1">Interest Rate</div>
          <div class="text-lg font-bold text-slate-800">{{ ((account.savingsInterestRate || 0) * 100).toFixed(1) }}% p.a.</div>
        </div>
        <div v-if="projection?.projectedGoalDate" class="bg-slate-50 rounded-xl p-4">
          <div class="text-xs text-slate-500 mb-1">Projected Goal Date</div>
          <div class="text-lg font-bold text-slate-800">{{ formatDate(projection.projectedGoalDate) }}</div>
        </div>
        <div v-if="projection?.goalTarget" class="bg-slate-50 rounded-xl p-4">
          <div class="text-xs text-slate-500 mb-1">Status</div>
          <div class="flex items-center gap-2">
            <span v-if="projection.isOnTrack" class="text-lg font-bold text-green-600 flex items-center gap-1">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
              </svg>
              On Track
            </span>
            <span v-else class="text-lg font-bold text-amber-600 flex items-center gap-1">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
              </svg>
              Behind
            </span>
          </div>
          <div v-if="projection.requiredRate && !projection.isOnTrack" class="text-xs text-amber-600 mt-1">
            Need ${{ formatMoney(projection.requiredRate) }}/wk to reach goal on time
          </div>
        </div>
      </div>

      <!-- Projection Chart -->
      <div v-if="projection" class="mb-6">
        <h4 class="text-sm font-semibold text-slate-700 mb-3">52-Week Projection</h4>
        <SavingsProjectionChart :projection="projection" />
      </div>

      <!-- Target Date Info -->
      <div v-if="account.savingsGoalDeadline" class="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
        <div class="flex items-center gap-2 text-blue-700">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clip-rule="evenodd" />
          </svg>
          <span class="font-medium">Target Date: {{ formatDate(account.savingsGoalDeadline) }}</span>
          <span v-if="weeksToDeadline" class="text-blue-600 text-sm">({{ weeksToDeadline }} weeks away)</span>
        </div>
      </div>

      <!-- Recent Activity -->
      <div v-if="transactions.length > 0">
        <h4 class="text-sm font-semibold text-slate-700 mb-3">Recent Activity</h4>
        <div class="space-y-2">
          <div
            v-for="tx in transactions"
            :key="tx.id"
            class="flex justify-between items-center py-2 border-b border-slate-100 last:border-0"
          >
            <div class="flex items-center gap-3">
              <div
                :class="[
                  'w-8 h-8 rounded-lg flex items-center justify-center',
                  tx.transaction_type === 'withdrawal' ? 'bg-red-100' : 'bg-green-100'
                ]"
              >
                <svg
                  v-if="tx.transaction_type === 'withdrawal'"
                  class="w-4 h-4 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <svg
                  v-else
                  class="w-4 h-4 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </div>
              <div>
                <div class="text-sm font-medium text-slate-800">
                  {{ tx.transaction_type === 'withdrawal' ? 'Withdrawal' : 'Deposit' }}
                </div>
                <div class="text-xs text-slate-500">{{ formatDate(tx.transaction_date) }}</div>
              </div>
            </div>
            <span
              :class="[
                'font-mono font-medium',
                tx.transaction_type === 'withdrawal' ? 'text-red-600' : 'text-green-600'
              ]"
            >
              {{ tx.transaction_type === 'withdrawal' ? '-' : '+' }}${{ formatMoney(tx.amount) }}
            </span>
          </div>
        </div>

        <router-link
          :to="`/transactions?account=${account.id}`"
          class="mt-4 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View all transactions
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </router-link>
      </div>

      <!-- No activity state -->
      <div v-else class="text-center py-6 text-slate-500 text-sm">
        No transactions yet for this savings account.
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import SavingsProjectionChart from './SavingsProjectionChart.vue'

const props = defineProps({
  account: {
    type: Object,
    required: true
  },
  projection: {
    type: Object,
    default: null
  },
  transactions: {
    type: Array,
    default: () => []
  }
})

const weeksToDeadline = computed(() => {
  if (!props.account.savingsGoalDeadline) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadline = new Date(props.account.savingsGoalDeadline)
  deadline.setHours(0, 0, 0, 0)
  const diffTime = deadline - today
  const diffWeeks = Math.ceil(diffTime / (7 * 24 * 60 * 60 * 1000))
  return diffWeeks > 0 ? diffWeeks : null
})

function formatMoney(value) {
  return (value || 0).toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}
</script>
