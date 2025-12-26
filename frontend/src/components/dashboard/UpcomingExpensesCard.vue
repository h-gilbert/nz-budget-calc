<template>
  <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
    <h2 class="text-lg font-semibold text-slate-800 mb-4">Upcoming Lump-Sum Expenses</h2>

    <!-- Empty state -->
    <div v-if="lumpSums.length === 0" class="text-center py-8 text-slate-500">
      <svg class="w-12 h-12 mx-auto mb-3 text-slate-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path fill-rule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z" clip-rule="evenodd" />
      </svg>
      <p>No upcoming lump-sum expenses.</p>
      <p class="text-sm mt-1">Annual and one-off expenses will appear here.</p>
    </div>

    <!-- Lump-sum list -->
    <div v-else class="space-y-3">
      <div
        v-for="ls in lumpSums"
        :key="ls.expenseId"
        :class="[
          'p-4 rounded-2xl border',
          getCardStyle(ls)
        ]"
      >
        <!-- Header -->
        <div class="flex justify-between items-start">
          <div>
            <span class="font-medium text-slate-800">{{ ls.expenseName }}</span>
            <span class="block text-xs text-slate-500 mt-0.5">
              Due {{ formatDate(ls.dueDate) }}
            </span>
          </div>
          <div class="text-right">
            <span
              :class="[
                'font-mono font-semibold',
                getTimeColor(ls)
              ]"
            >
              {{ ls.weeksUntilDue }} weeks
            </span>
            <span v-if="!ls.isOnTrack" class="block text-xs text-red-500 font-medium">Shortfall</span>
            <span v-else-if="ls.isPriority" class="block text-xs text-amber-500 font-medium">Priority</span>
          </div>
        </div>

        <!-- Progress bar - now shows projected funding -->
        <div class="mt-3">
          <div class="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-300"
              :class="progressColor(ls)"
              :style="{ width: Math.min(100, (ls.projectedBalanceAtDue / ls.totalAmount) * 100) + '%' }"
            ></div>
          </div>
          <div class="flex justify-between text-xs mt-1">
            <span :class="ls.isOnTrack ? 'text-slate-500' : 'text-red-500'">
              ${{ formatMoney(ls.projectedBalanceAtDue) }} projected
            </span>
            <span class="text-slate-500">
              ${{ formatMoney(ls.totalAmount) }} needed
            </span>
          </div>
        </div>

        <!-- Status section -->
        <div class="mt-3 pt-3 border-t" :class="getBorderColor(ls)">
          <!-- On Track status -->
          <div v-if="ls.isOnTrack" class="flex justify-between items-center">
            <span class="text-sm text-green-600 font-medium flex items-center gap-1">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              On track
            </span>
            <span class="text-xs text-slate-500">
              ${{ formatMoney(Math.abs(ls.balanceAfterPayment)) }} {{ ls.balanceAfterPayment >= 0 ? 'surplus' : 'short' }} after
            </span>
          </div>

          <!-- Shortfall warning -->
          <div v-else>
            <div class="flex justify-between items-center">
              <span class="text-sm text-red-600 font-medium flex items-center gap-1">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                ${{ formatMoney(ls.shortfall) }} shortfall
              </span>
              <span class="font-mono font-semibold text-red-600">
                +${{ formatMoney(ls.weeklyContribution) }}/wk
              </span>
            </div>
            <div class="text-xs text-slate-500 mt-1">
              Need extra ${{ formatMoney(ls.weeklyContribution) }}/wk to cover by due date
            </div>
          </div>
        </div>

        <!-- Sequence indicator (if multiple expenses in same account) -->
        <div v-if="ls.totalInSequence > 1" class="mt-2 text-xs text-slate-400">
          Payment {{ ls.sequentialPosition }} of {{ ls.totalInSequence }} from this account
        </div>
      </div>
    </div>

    <!-- Summary if there are shortfalls -->
    <div v-if="totalShortfall > 0" class="mt-4 p-3 bg-red-50 rounded-xl border border-red-200">
      <div class="flex justify-between items-center">
        <span class="text-sm text-red-700 font-medium">Total weekly shortfall</span>
        <span class="font-mono font-semibold text-red-700">
          +${{ formatMoney(totalWeeklyNeeded) }}/wk
        </span>
      </div>
      <p class="text-xs text-red-600 mt-1">
        Increase weekly contributions by this amount to meet all expenses on time
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useBudgetStore } from '@/stores/budget'

const budgetStore = useBudgetStore()

const lumpSums = computed(() => budgetStore.calculateLumpSumContributions())

const totalShortfall = computed(() => {
  return lumpSums.value.reduce((sum, ls) => sum + (ls.shortfall || 0), 0)
})

const totalWeeklyNeeded = computed(() => {
  return lumpSums.value.reduce((sum, ls) => sum + (ls.weeklyContribution || 0), 0)
})

function getCardStyle(ls) {
  if (!ls.isOnTrack) return 'bg-red-50 border-red-200'
  if (ls.isPriority) return 'bg-amber-50 border-amber-200'
  return 'bg-slate-50 border-slate-100'
}

function getTimeColor(ls) {
  if (!ls.isOnTrack) return 'text-red-600'
  if (ls.isPriority) return 'text-amber-600'
  return 'text-slate-600'
}

function getBorderColor(ls) {
  if (!ls.isOnTrack) return 'border-red-200'
  if (ls.isPriority) return 'border-amber-200'
  return 'border-slate-200'
}

function progressColor(ls) {
  const progress = ls.projectedBalanceAtDue / ls.totalAmount
  if (progress >= 1) return 'bg-green-500'
  if (!ls.isOnTrack) return 'bg-red-400'
  if (ls.isPriority && progress < 0.5) return 'bg-amber-500'
  return 'bg-teal-500'
}

function formatMoney(value) {
  return (value || 0).toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(date) {
  if (!date) return 'Unknown'
  return new Date(date).toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}
</script>
