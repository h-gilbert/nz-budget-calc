<template>
  <div class="sticky top-24 space-y-4">
    <!-- Main Result Card -->
    <div class="bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-gray-100 p-6">
      <div class="text-center">
        <p class="text-sm font-semibold text-slate-500 uppercase tracking-wide">Weekly Spending Power</p>
        <p
          :class="[
            'text-4xl font-mono font-bold mt-2 transition-colors',
            weeklyDiscretionary >= 0 ? 'text-teal-600' : 'text-red-500',
          ]"
        >
          ${{ formatMoney(Math.abs(weeklyDiscretionary)) }}
        </p>
        <p class="text-sm text-slate-500 mt-1">
          {{ weeklyDiscretionary >= 0 ? 'available per week' : 'over budget per week' }}
        </p>
      </div>

      <!-- Breakdown -->
      <div class="mt-6 pt-6 border-t border-slate-100 space-y-3">
        <div class="flex justify-between text-sm">
          <span class="text-slate-600">Income</span>
          <span class="font-mono font-medium text-green-600">+${{ formatMoney(weeklyIncome) }}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-slate-600">Expenses</span>
          <span class="font-mono font-medium text-red-500">-${{ formatMoney(budgetStore.totalExpenses) }}</span>
        </div>
        <div class="flex justify-between text-sm pt-3 border-t border-slate-100">
          <span class="font-semibold text-slate-800">Remaining</span>
          <span
            :class="[
              'font-mono font-bold',
              weeklyDiscretionary >= 0 ? 'text-teal-600' : 'text-red-500',
            ]"
          >
            ${{ formatMoney(weeklyDiscretionary) }}
          </span>
        </div>
      </div>

      <!-- Annual Summary -->
      <div class="mt-6 pt-6 border-t border-slate-100">
        <h4 class="text-sm font-semibold text-slate-700 mb-3">Annual Summary</h4>
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-slate-50 rounded-xl p-3 text-center">
            <p class="text-xs text-slate-500">Gross Income</p>
            <p class="text-lg font-mono font-semibold text-slate-800">${{ formatCompact(annualGross) }}</p>
          </div>
          <div class="bg-slate-50 rounded-xl p-3 text-center">
            <p class="text-xs text-slate-500">Take-home</p>
            <p class="text-lg font-mono font-semibold text-slate-800">${{ formatCompact(annualNet) }}</p>
          </div>
          <div class="bg-slate-50 rounded-xl p-3 text-center">
            <p class="text-xs text-slate-500">Expenses</p>
            <p class="text-lg font-mono font-semibold text-red-500">${{ formatCompact(annualExpenses) }}</p>
          </div>
          <div class="bg-slate-50 rounded-xl p-3 text-center">
            <p class="text-xs text-slate-500">Savings</p>
            <p
              :class="[
                'text-lg font-mono font-semibold',
                annualSavings >= 0 ? 'text-teal-600' : 'text-red-500',
              ]"
            >
              ${{ formatCompact(annualSavings) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Save CTA for logged out users -->
    <div
      v-if="hasData && !userStore.isAuthenticated"
      class="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-5 border border-teal-100"
    >
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0 w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
          <svg class="w-5 h-5 text-teal-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="flex-1">
          <p class="font-semibold text-teal-800">Save your progress</p>
          <p class="text-sm text-teal-600 mt-1">Create a free account to save your budget and access it from anywhere.</p>
          <AppButton
            size="sm"
            class="mt-3"
            @click="$emit('openLogin')"
          >
            Create Account
          </AppButton>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import { useUserStore } from '@/stores/user'
import AppButton from '@/components/common/AppButton.vue'

const emit = defineEmits(['openLogin'])

const budgetStore = useBudgetStore()
const userStore = useUserStore()

// Calculate weekly income based on input
const weeklyIncome = computed(() => {
  let amount = budgetStore.payAmount || 0

  // Convert to weekly
  if (budgetStore.payType === 'hourly') {
    const hours = budgetStore.hoursType === 'fixed'
      ? budgetStore.fixedHours
      : (budgetStore.minHours + budgetStore.maxHours) / 2
    amount = amount * hours
  } else if (budgetStore.payType === 'fortnightly') {
    amount = amount / 2
  } else if (budgetStore.payType === 'monthly') {
    amount = amount / 4.33
  } else if (budgetStore.payType === 'annually') {
    amount = amount / 52
  }

  // If gross, calculate net
  if (budgetStore.incomeMode === 'gross') {
    const annual = amount * 52
    let tax = 0

    // 2025-2026 NZ tax brackets (from 1 April 2025)
    if (annual <= 15600) {
      tax = annual * 0.105
    } else if (annual <= 53500) {
      tax = 15600 * 0.105 + (annual - 15600) * 0.175
    } else if (annual <= 78100) {
      tax = 15600 * 0.105 + 37900 * 0.175 + (annual - 53500) * 0.30
    } else if (annual <= 180000) {
      tax = 15600 * 0.105 + 37900 * 0.175 + 24600 * 0.30 + (annual - 78100) * 0.33
    } else {
      tax = 15600 * 0.105 + 37900 * 0.175 + 24600 * 0.30 + 101900 * 0.33 + (annual - 180000) * 0.39
    }

    // ACC levy (1.67% for 2025-2026)
    tax += annual * 0.0167

    // KiwiSaver
    if (budgetStore.kiwisaver) {
      const rate = parseFloat(budgetStore.kiwisaverRate) / 100
      tax += annual * rate
    }

    // Student loan
    if (budgetStore.studentLoan && annual > 24128) {
      tax += (annual - 24128) * 0.12
    }

    amount = (annual - tax) / 52

    // IETC credit (with abatement for income $66k-$70k)
    if (budgetStore.ietcEligible && budgetStore.isIetcIncomeEligible) {
      if (annual >= 24000 && annual <= 66000) {
        amount += 10 // Full credit
      } else if (annual > 66000 && annual <= 70000) {
        // Abates at 13 cents per dollar over $66,000
        const reduction = (annual - 66000) * 0.13
        amount += Math.max(0, 520 - reduction) / 52
      }
    }
  }

  // Add after-tax allowance
  const allowance = budgetStore.allowanceAmount || 0
  if (allowance > 0) {
    switch (budgetStore.allowanceFrequency) {
      case 'fortnightly': amount += allowance / 2; break
      case 'monthly': amount += allowance / 4.33; break
      case 'annual': amount += allowance / 52; break
      default: amount += allowance // weekly
    }
  }

  return Math.max(0, amount)
})

const weeklyDiscretionary = computed(() => {
  return weeklyIncome.value - budgetStore.totalExpenses
})

const annualGross = computed(() => {
  let amount = budgetStore.payAmount || 0

  if (budgetStore.payType === 'hourly') {
    const hours = budgetStore.hoursType === 'fixed'
      ? budgetStore.fixedHours
      : (budgetStore.minHours + budgetStore.maxHours) / 2
    amount = amount * hours * 52
  } else if (budgetStore.payType === 'weekly') {
    amount = amount * 52
  } else if (budgetStore.payType === 'fortnightly') {
    amount = amount * 26
  } else if (budgetStore.payType === 'monthly') {
    amount = amount * 12
  }

  return amount
})

const annualNet = computed(() => weeklyIncome.value * 52)
const annualExpenses = computed(() => budgetStore.totalExpenses * 52)
const annualSavings = computed(() => weeklyDiscretionary.value * 52)

const hasData = computed(() => {
  return budgetStore.payAmount > 0 || budgetStore.expenses.length > 0
})

function formatMoney(value) {
  return (value || 0).toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatCompact(value) {
  if (Math.abs(value) >= 1000) {
    return (value / 1000).toFixed(1) + 'k'
  }
  return value.toFixed(0)
}
</script>
