<template>
  <div
    :class="[
      'group relative p-4 rounded-2xl hover:opacity-90 transition-colors',
      isSavings ? 'bg-blue-50' : 'bg-slate-50'
    ]"
  >
    <!-- Delete Button - Absolute on mobile, inline on desktop -->
    <button
      type="button"
      @click="$emit('remove')"
      class="absolute top-3 right-3 sm:hidden p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
    >
      <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clip-rule="evenodd" />
      </svg>
    </button>

    <!-- Desktop Layout -->
    <div class="hidden sm:block">
      <div class="flex items-center gap-4">
        <!-- Account Type Badge + Icon -->
        <div class="flex-shrink-0 flex items-center gap-2">
          <div
            :class="[
              'w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border',
              isSavings ? 'bg-blue-100 border-blue-200' : 'bg-white border-slate-100'
            ]"
          >
            <svg v-if="isSavings" class="w-5 h-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-4.75a.75.75 0 001.5 0V8.66l1.95 2.1a.75.75 0 101.1-1.02l-3.25-3.5a.75.75 0 00-1.1 0L6.2 9.74a.75.75 0 101.1 1.02l1.95-2.1v4.59z" clip-rule="evenodd" />
            </svg>
            <svg v-else class="w-5 h-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M1 4a1 1 0 011-1h16a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V4zm12 4a3 3 0 11-6 0 3 3 0 016 0zM4 9a1 1 0 100-2 1 1 0 000 2zm13-1a1 1 0 11-2 0 1 1 0 012 0zM1.75 14.5a.75.75 0 000 1.5c4.417 0 8.693.603 12.749 1.73 1.111.309 2.251-.512 2.251-1.696v-.784a.75.75 0 00-1.5 0v.784a.272.272 0 01-.35.25A49.043 49.043 0 001.75 14.5z" clip-rule="evenodd" />
            </svg>
          </div>
          <span
            :class="[
              'text-xs px-2 py-0.5 rounded-full',
              isSavings ? 'bg-blue-200 text-blue-700' : 'bg-slate-200 text-slate-600'
            ]"
          >
            {{ isSavings ? 'Savings' : 'Expense' }}
          </span>
        </div>

        <!-- Account Name -->
        <div class="flex-1 min-w-0">
          <input
            type="text"
            :value="account.name"
            @input="budgetStore.updateAccount(account.id, 'name', $event.target.value)"
            :placeholder="isSavings ? 'e.g., Emergency Fund' : 'Account name'"
            :class="[
              'w-full px-0 py-1 bg-transparent border-0 border-b-2 border-transparent text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none transition-colors',
              isSavings ? 'focus:border-blue-400' : 'focus:border-teal-400'
            ]"
          />
        </div>

        <!-- Current Balance -->
        <div class="flex-shrink-0 w-32">
          <label class="text-xs text-slate-500 mb-1 block">Balance</label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input
              type="number"
              :value="formattedBalance"
              @input="budgetStore.updateAccount(account.id, 'balance', parseFloat($event.target.value) || 0)"
              placeholder="0.00"
              :class="[
                'w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono transition-all',
                isSavings ? 'focus:ring-blue-500/20 focus:border-blue-400' : 'focus:ring-teal-500/20 focus:border-teal-400',
                'focus:outline-none focus:ring-2'
              ]"
              step="0.01"
              min="0"
            />
          </div>
        </div>

        <!-- Expense Account: Weekly Load -->
        <template v-if="!isSavings">
          <div class="flex-shrink-0 text-right w-28">
            <div class="text-xs text-slate-500">{{ linkedExpenseCount }} expense{{ linkedExpenseCount !== 1 ? 's' : '' }}</div>
            <div class="font-mono font-semibold text-teal-600">${{ formatMoney(weeklyLoad) }}/wk</div>
          </div>
        </template>

        <!-- Savings Account: Weekly Contribution -->
        <template v-else>
          <div class="flex-shrink-0 w-32">
            <label class="text-xs text-slate-500 mb-1 block">Weekly</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number"
                :value="account.savingsWeeklyContribution || 0"
                @input="budgetStore.updateAccount(account.id, 'savingsWeeklyContribution', parseFloat($event.target.value) || 0)"
                placeholder="0.00"
                class="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                step="10"
                min="0"
              />
            </div>
          </div>
        </template>

        <!-- Delete Button - Desktop -->
        <button
          type="button"
          @click="$emit('remove')"
          class="flex-shrink-0 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
        >
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>

      <!-- Savings Goal Section (expandable) -->
      <div v-if="isSavings" class="mt-4 pt-4 border-t border-blue-100">
        <button
          @click="showGoalDetails = !showGoalDetails"
          class="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
        >
          <svg
            :class="['w-4 h-4 transition-transform', showGoalDetails ? 'rotate-90' : '']"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
          </svg>
          {{ showGoalDetails ? 'Hide' : 'Set' }} savings goal
        </button>

        <div v-if="showGoalDetails" class="mt-3 grid grid-cols-3 gap-4">
          <div>
            <label class="text-xs text-slate-500 mb-1 block">Target Amount</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number"
                :value="account.savingsGoalTarget || ''"
                @input="budgetStore.updateAccount(account.id, 'savingsGoalTarget', parseFloat($event.target.value) || null)"
                placeholder="10,000"
                class="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                step="100"
                min="0"
              />
            </div>
          </div>
          <div>
            <label class="text-xs text-slate-500 mb-1 block">Target Date</label>
            <input
              type="date"
              :value="account.savingsGoalDeadline || ''"
              @input="budgetStore.updateAccount(account.id, 'savingsGoalDeadline', $event.target.value || null)"
              class="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
          </div>
          <div>
            <label class="text-xs text-slate-500 mb-1 block">Interest Rate</label>
            <div class="relative">
              <input
                type="number"
                :value="(account.savingsInterestRate || 0) * 100 || ''"
                @input="budgetStore.updateAccount(account.id, 'savingsInterestRate', (parseFloat($event.target.value) || 0) / 100)"
                placeholder="4.5"
                class="w-full px-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                step="0.1"
                min="0"
                max="20"
              />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile Layout -->
    <div class="sm:hidden space-y-3">
      <!-- Row 1: Icon + Badge + Name -->
      <div class="flex items-center gap-3 pr-10">
        <div
          :class="[
            'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border',
            isSavings ? 'bg-blue-100 border-blue-200' : 'bg-white border-slate-100'
          ]"
        >
          <svg v-if="isSavings" class="w-5 h-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-4.75a.75.75 0 001.5 0V8.66l1.95 2.1a.75.75 0 101.1-1.02l-3.25-3.5a.75.75 0 00-1.1 0L6.2 9.74a.75.75 0 101.1 1.02l1.95-2.1v4.59z" clip-rule="evenodd" />
          </svg>
          <svg v-else class="w-5 h-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M1 4a1 1 0 011-1h16a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V4zm12 4a3 3 0 11-6 0 3 3 0 016 0zM4 9a1 1 0 100-2 1 1 0 000 2zm13-1a1 1 0 11-2 0 1 1 0 012 0zM1.75 14.5a.75.75 0 000 1.5c4.417 0 8.693.603 12.749 1.73 1.111.309 2.251-.512 2.251-1.696v-.784a.75.75 0 00-1.5 0v.784a.272.272 0 01-.35.25A49.043 49.043 0 001.75 14.5z" clip-rule="evenodd" />
          </svg>
        </div>
        <input
          type="text"
          :value="account.name"
          @input="budgetStore.updateAccount(account.id, 'name', $event.target.value)"
          :placeholder="isSavings ? 'e.g., Emergency Fund' : 'Account name'"
          :class="[
            'flex-1 min-w-0 px-0 py-1 bg-transparent border-0 border-b-2 border-transparent text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none transition-colors',
            isSavings ? 'focus:border-blue-400' : 'focus:border-teal-400'
          ]"
        />
      </div>

      <!-- Row 2: Balance + Weekly Load/Contribution -->
      <div class="flex items-end justify-between gap-4">
        <div class="flex-1">
          <label class="text-xs text-slate-500 mb-1 block">Balance</label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input
              type="number"
              :value="formattedBalance"
              @input="budgetStore.updateAccount(account.id, 'balance', parseFloat($event.target.value) || 0)"
              placeholder="0.00"
              :class="[
                'w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono transition-all',
                isSavings ? 'focus:ring-blue-500/20 focus:border-blue-400' : 'focus:ring-teal-500/20 focus:border-teal-400',
                'focus:outline-none focus:ring-2'
              ]"
              step="0.01"
              min="0"
            />
          </div>
        </div>

        <template v-if="!isSavings">
          <div class="text-right pb-1">
            <div class="text-xs text-slate-500">{{ linkedExpenseCount }} expense{{ linkedExpenseCount !== 1 ? 's' : '' }}</div>
            <div class="font-mono font-semibold text-teal-600">${{ formatMoney(weeklyLoad) }}/wk</div>
          </div>
        </template>

        <template v-else>
          <div class="flex-1">
            <label class="text-xs text-slate-500 mb-1 block">Weekly</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number"
                :value="account.savingsWeeklyContribution || 0"
                @input="budgetStore.updateAccount(account.id, 'savingsWeeklyContribution', parseFloat($event.target.value) || 0)"
                placeholder="0.00"
                class="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                step="10"
                min="0"
              />
            </div>
          </div>
        </template>
      </div>

      <!-- Mobile Savings Goal Section -->
      <div v-if="isSavings" class="pt-3 border-t border-blue-100">
        <button
          @click="showGoalDetails = !showGoalDetails"
          class="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
        >
          <svg
            :class="['w-4 h-4 transition-transform', showGoalDetails ? 'rotate-90' : '']"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
          </svg>
          {{ showGoalDetails ? 'Hide' : 'Set' }} savings goal
        </button>

        <div v-if="showGoalDetails" class="mt-3 space-y-3">
          <div>
            <label class="text-xs text-slate-500 mb-1 block">Target Amount</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number"
                :value="account.savingsGoalTarget || ''"
                @input="budgetStore.updateAccount(account.id, 'savingsGoalTarget', parseFloat($event.target.value) || null)"
                placeholder="10,000"
                class="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                step="100"
                min="0"
              />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-slate-500 mb-1 block">Target Date</label>
              <input
                type="date"
                :value="account.savingsGoalDeadline || ''"
                @input="budgetStore.updateAccount(account.id, 'savingsGoalDeadline', $event.target.value || null)"
                class="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
            <div>
              <label class="text-xs text-slate-500 mb-1 block">Interest %</label>
              <input
                type="number"
                :value="(account.savingsInterestRate || 0) * 100 || ''"
                @input="budgetStore.updateAccount(account.id, 'savingsInterestRate', (parseFloat($event.target.value) || 0) / 100)"
                placeholder="4.5"
                class="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                step="0.1"
                min="0"
                max="20"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useBudgetStore } from '@/stores/budget'

const props = defineProps({
  account: {
    type: Object,
    required: true,
  },
})

defineEmits(['remove'])

const budgetStore = useBudgetStore()
const showGoalDetails = ref(false)

// Check if this is a savings account
const isSavings = computed(() => props.account.type === 'savings')

// Get expenses linked to this account
const linkedExpenses = computed(() => {
  return budgetStore.getExpensesForAccount(props.account.id)
})

// Count of linked expenses
const linkedExpenseCount = computed(() => {
  return linkedExpenses.value.length
})

// Weekly load from linked expenses
const weeklyLoad = computed(() => {
  return budgetStore.getAccountWeeklyLoad(props.account.id)
})

// Format balance to 2 decimal places for display
const formattedBalance = computed(() => {
  const balance = props.account.balance || 0
  return Math.round(balance * 100) / 100
})

// Format money helper
function formatMoney(value) {
  return (value || 0).toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>
