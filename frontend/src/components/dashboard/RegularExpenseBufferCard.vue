<template>
  <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
    <h2 class="text-lg font-semibold text-slate-800 mb-2">Expense Buffer Analysis</h2>
    <p class="text-sm text-slate-500 mb-4">
      Shows weeks when expenses exceed your weekly transfer, combining monthly and annual bills.
    </p>

    <!-- Empty state -->
    <div v-if="projections.length === 0" class="text-center py-6 text-slate-500">
      <p>No expenses configured for any account.</p>
    </div>

    <!-- Per-account projection -->
    <div v-else class="space-y-6">
      <div
        v-for="proj in projections"
        :key="proj.accountId"
        class="border rounded-2xl overflow-hidden"
        :class="proj.isOnTrack ? 'border-green-200' : 'border-red-200'"
      >
        <!-- Account header -->
        <div
          :class="[
            'p-4',
            proj.isOnTrack ? 'bg-green-50' : 'bg-red-50'
          ]"
        >
          <div class="flex justify-between items-start">
            <div>
              <span class="font-semibold text-slate-800">{{ proj.accountName || 'Unnamed Account' }}</span>
              <div class="text-xs text-slate-500 mt-1">
                Equilibrium: ${{ formatMoney(proj.weeklyEquilibrium) }}/wk
                <span v-if="proj.acceleration > 0" class="text-teal-600">
                  + ${{ formatMoney(proj.acceleration) }} accel
                </span>
              </div>
            </div>
            <div class="text-right">
              <span
                :class="[
                  'font-mono font-semibold text-lg',
                  proj.isOnTrack ? 'text-green-600' : 'text-red-600'
                ]"
              >
                {{ proj.isOnTrack ? 'On Track' : `$${formatMoney(proj.shortfall)} short` }}
              </span>
              <div class="text-xs text-slate-500">
                {{ proj.totalSpikeWeeks }} spike weeks in next year
              </div>
            </div>
          </div>

          <!-- Buffer bar -->
          <div class="mt-3">
            <div class="flex justify-between text-xs text-slate-600 mb-1">
              <span>Current: ${{ formatMoney(proj.currentBalance) }}</span>
              <span>Buffer needed: ${{ formatMoney(proj.bufferNeeded) }}</span>
            </div>
            <div class="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all"
                :class="proj.isOnTrack ? 'bg-green-500' : 'bg-red-400'"
                :style="{ width: Math.min(100, proj.bufferNeeded > 0 ? (proj.currentBalance / proj.bufferNeeded) * 100 : 100) + '%' }"
              ></div>
            </div>
          </div>
        </div>

        <!-- Spike weeks timeline (collapsible) -->
        <div v-if="proj.spikeWeeks.length > 0" class="bg-white">
          <!-- Collapsible header -->
          <button
            @click="toggleExpanded(proj.accountId)"
            class="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
          >
            <div class="flex items-center gap-2">
              <svg
                class="w-4 h-4 text-slate-400 transition-transform duration-200"
                :class="{ 'rotate-90': isExpanded(proj.accountId) }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
              <span class="text-sm font-medium text-slate-700">Upcoming Spike Weeks</span>
              <span class="text-xs text-slate-400">({{ proj.spikeWeeks.length }} shown)</span>
            </div>
            <span class="text-xs text-slate-400">
              {{ isExpanded(proj.accountId) ? 'Click to collapse' : 'Click to expand' }}
            </span>
          </button>

          <!-- Collapsible content -->
          <div
            class="overflow-hidden transition-all duration-300 ease-in-out"
            :class="isExpanded(proj.accountId) ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'"
          >
            <div class="px-4 pb-4 space-y-2">
              <div
                v-for="spike in proj.spikeWeeks"
                :key="spike.week"
                :class="[
                  'p-3 rounded-xl border text-sm',
                  spike.balanceAfter < 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
                ]"
              >
                <div class="flex justify-between items-start">
                  <div>
                    <span class="font-medium text-slate-800">Week {{ spike.week }}</span>
                    <span class="text-slate-400 text-xs ml-2">{{ formatDateRange(spike.weekStart, spike.weekEnd) }}</span>
                  </div>
                  <div class="text-right">
                    <span class="font-mono" :class="spike.balanceAfter < 0 ? 'text-red-600' : 'text-amber-600'">
                      ${{ formatMoney(spike.expenses) }}
                    </span>
                    <span class="text-xs text-slate-400 ml-1">expenses</span>
                  </div>
                </div>

                <!-- Expense breakdown -->
                <div class="mt-2 flex flex-wrap gap-1">
                  <span
                    v-for="item in spike.breakdown"
                    :key="item.label"
                    :class="[
                      'text-xs px-2 py-0.5 rounded-full',
                      item.type === 'annual' ? 'bg-purple-100 text-purple-700' :
                      item.type === 'monthly' ? 'bg-blue-100 text-blue-700' :
                      item.type === 'fortnightly' ? 'bg-cyan-100 text-cyan-700' :
                      'bg-slate-100 text-slate-600'
                    ]"
                  >
                    {{ item.type === 'weekly' ? 'Weekly' : item.type === 'fortnightly' ? 'Fortnightly' : '' }}
                    {{ item.type === 'monthly' || item.type === 'annual' ? item.label : '' }}
                    ${{ formatMoney(item.amount) }}
                  </span>
                </div>

                <!-- Balance after -->
                <div class="mt-2 flex justify-between text-xs">
                  <span class="text-slate-500">
                    Transfer: +${{ formatMoney(spike.transfer) }}
                  </span>
                  <span :class="spike.balanceAfter < 0 ? 'text-red-600 font-medium' : 'text-slate-500'">
                    Balance after: ${{ formatMoney(spike.balanceAfter) }}
                    <span v-if="spike.balanceAfter < 0" class="ml-1">⚠️</span>
                  </span>
                </div>
              </div>

              <!-- Show more indicator -->
              <div v-if="proj.totalSpikeWeeks > proj.spikeWeeks.length" class="mt-3 text-center">
                <span class="text-xs text-slate-400">
                  + {{ proj.totalSpikeWeeks - proj.spikeWeeks.length }} more spike weeks this year
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- No spikes message -->
        <div v-else class="p-4 bg-white text-center text-sm text-slate-500">
          No expense spikes in the next year - your weekly transfer covers everything evenly.
        </div>

        <!-- Minimum balance warning -->
        <div v-if="proj.minBalance < 0" class="p-3 bg-red-100 border-t border-red-200">
          <div class="flex items-center gap-2 text-sm text-red-700">
            <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <span>
              Balance drops to <strong>${{ formatMoney(proj.minBalance) }}</strong> in week {{ proj.minBalanceWeek }}.
              Need <strong>${{ formatMoney(proj.shortfall) }}</strong> more buffer or increase acceleration.
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useBudgetStore } from '@/stores/budget'

const budgetStore = useBudgetStore()

// Track expanded state per account
const expandedAccounts = ref({})

function toggleExpanded(accountId) {
  expandedAccounts.value[accountId] = !expandedAccounts.value[accountId]
}

function isExpanded(accountId) {
  return expandedAccounts.value[accountId] || false
}

const projections = computed(() => {
  const results = budgetStore.calculateUnifiedExpenseProjection(52)
  // Only show accounts that have some expenses
  return results.filter(r => r.weeklyEquilibrium > 0)
})

function formatMoney(value) {
  return (value || 0).toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDateRange(start, end) {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const startStr = startDate.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
  const endStr = endDate.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
  return `${startStr} - ${endStr}`
}
</script>
