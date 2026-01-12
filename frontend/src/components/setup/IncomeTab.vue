<template>
  <div class="space-y-6">
    <!-- Income Mode Toggle -->
    <div>
      <label class="text-sm font-semibold text-slate-700 mb-3 block">What are you entering?</label>
      <div class="grid grid-cols-2 gap-3">
        <button
          v-for="mode in incomeModes"
          :key="mode.value"
          type="button"
          @click="budgetStore.incomeMode = mode.value"
          :class="[
            'p-4 rounded-2xl border-2 text-left transition-all',
            budgetStore.incomeMode === mode.value
              ? 'border-teal-500 bg-teal-50'
              : 'border-gray-200 hover:border-gray-300',
          ]"
        >
          <span class="font-semibold text-slate-800">{{ mode.label }}</span>
          <span class="block text-sm text-slate-500 mt-1">{{ mode.description }}</span>
        </button>
      </div>
    </div>

    <!-- Pay Type Selection -->
    <div>
      <label class="text-sm font-semibold text-slate-700 mb-3 block">How are you paid?</label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="type in payTypes"
          :key="type.value"
          type="button"
          @click="budgetStore.payType = type.value"
          :class="[
            'px-4 py-2.5 rounded-xl font-medium transition-all',
            budgetStore.payType === type.value
              ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20'
              : 'bg-gray-100 text-slate-600 hover:bg-gray-200',
          ]"
        >
          {{ type.label }}
        </button>
      </div>
    </div>

    <!-- Amount Input -->
    <div>
      <label class="text-sm font-semibold text-slate-700 mb-2 block">
        {{ amountLabel }}
      </label>
      <div class="relative">
        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl font-medium">$</span>
        <input
          type="number"
          :value="budgetStore.payAmount"
          @input="budgetStore.payAmount = parseFloat($event.target.value) || 0"
          class="w-full pl-10 pr-4 py-4 text-2xl font-mono font-semibold bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
          placeholder="0.00"
          step="0.01"
          min="0"
        />
      </div>
    </div>

    <!-- Hours (for hourly rate) -->
    <div v-if="budgetStore.payType === 'hourly'" class="space-y-4">
      <div>
        <label class="text-sm font-semibold text-slate-700 mb-3 block">Hours worked</label>
        <div class="flex gap-3">
          <button
            v-for="type in hoursTypes"
            :key="type.value"
            type="button"
            :disabled="type.value === 'variable' && budgetStore.incomeMode === 'gross'"
            @click="!(type.value === 'variable' && budgetStore.incomeMode === 'gross') && (budgetStore.hoursType = type.value)"
            :class="[
              'px-4 py-2.5 rounded-xl font-medium transition-all',
              budgetStore.hoursType === type.value
                ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20'
                : type.value === 'variable' && budgetStore.incomeMode === 'gross'
                  ? 'bg-gray-100 text-slate-400 cursor-not-allowed'
                  : 'bg-gray-100 text-slate-600 hover:bg-gray-200',
            ]"
          >
            {{ type.label }}
          </button>
        </div>
      </div>

      <div v-if="budgetStore.hoursType === 'fixed'">
        <label class="text-sm font-semibold text-slate-700 mb-2 block">Hours per week</label>
        <input
          type="number"
          :value="budgetStore.fixedHours"
          @input="budgetStore.fixedHours = parseFloat($event.target.value) || 0"
          class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
          placeholder="40"
          min="0"
          max="168"
        />
      </div>

      <div v-else class="grid grid-cols-2 gap-4">
        <div>
          <label class="text-sm font-semibold text-slate-700 mb-2 block">Min hours</label>
          <input
            type="number"
            :value="budgetStore.minHours"
            @input="budgetStore.minHours = parseFloat($event.target.value) || 0"
            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
            placeholder="20"
            min="0"
          />
        </div>
        <div>
          <label class="text-sm font-semibold text-slate-700 mb-2 block">Max hours</label>
          <input
            type="number"
            :value="budgetStore.maxHours"
            @input="budgetStore.maxHours = parseFloat($event.target.value) || 0"
            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
            placeholder="40"
            min="0"
          />
        </div>
      </div>
    </div>

    <!-- Deductions (for gross income) -->
    <div v-if="budgetStore.incomeMode === 'gross'" class="space-y-3">
      <label class="text-sm font-semibold text-slate-700 block">Deductions</label>

      <!-- KiwiSaver -->
      <div
        :class="[
          'flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all',
          budgetStore.kiwisaver ? 'bg-teal-50 border-2 border-teal-200' : 'bg-slate-50 border-2 border-transparent hover:border-slate-200',
        ]"
        @click="budgetStore.kiwisaver = !budgetStore.kiwisaver"
      >
        <div class="flex items-center gap-3">
          <input
            type="checkbox"
            :checked="budgetStore.kiwisaver"
            class="w-5 h-5 accent-teal-500 rounded"
            @click.stop
            @change="budgetStore.kiwisaver = $event.target.checked"
          />
          <div>
            <span class="font-medium text-slate-800">KiwiSaver</span>
            <span class="block text-xs text-slate-500">Employee contribution</span>
          </div>
        </div>
        <select
          v-if="budgetStore.kiwisaver"
          :value="budgetStore.kiwisaverRate"
          @change="budgetStore.kiwisaverRate = $event.target.value"
          @click.stop
          class="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        >
          <option value="3">3%</option>
          <option value="4">4%</option>
          <option value="6">6%</option>
          <option value="8">8%</option>
          <option value="10">10%</option>
        </select>
      </div>

      <!-- Student Loan -->
      <div
        :class="[
          'flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all',
          budgetStore.studentLoan ? 'bg-teal-50 border-2 border-teal-200' : 'bg-slate-50 border-2 border-transparent hover:border-slate-200',
        ]"
        @click="budgetStore.studentLoan = !budgetStore.studentLoan"
      >
        <div class="flex items-center gap-3">
          <input
            type="checkbox"
            :checked="budgetStore.studentLoan"
            class="w-5 h-5 accent-teal-500 rounded"
            @click.stop
            @change="budgetStore.studentLoan = $event.target.checked"
          />
          <div>
            <span class="font-medium text-slate-800">Student Loan</span>
            <span class="block text-xs text-slate-500">12% over $24,128/year</span>
          </div>
        </div>
      </div>

      <!-- IETC -->
      <div
        :class="[
          'flex items-center justify-between p-4 rounded-2xl transition-all',
          !budgetStore.isIetcIncomeEligible ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          budgetStore.ietcEligible && budgetStore.isIetcIncomeEligible ? 'bg-green-50 border-2 border-green-200' : 'bg-slate-50 border-2 border-transparent',
          budgetStore.isIetcIncomeEligible ? 'hover:border-slate-200' : '',
        ]"
        @click="budgetStore.isIetcIncomeEligible && (budgetStore.ietcEligible = !budgetStore.ietcEligible)"
      >
        <div class="flex items-center gap-3">
          <input
            type="checkbox"
            :checked="budgetStore.ietcEligible"
            :disabled="!budgetStore.isIetcIncomeEligible"
            class="w-5 h-5 accent-teal-500 rounded"
            @click.stop
            @change="budgetStore.ietcEligible = $event.target.checked"
          />
          <div>
            <span class="font-medium text-slate-800">IETC</span>
            <span class="block text-xs text-slate-500">
              {{ budgetStore.isIetcIncomeEligible ? 'Independent Earner Tax Credit' : 'Income must be $24k-$70k/year' }}
            </span>
          </div>
        </div>
        <span
          v-if="budgetStore.isIetcIncomeEligible && budgetStore.ietcEligible"
          class="text-sm font-semibold text-green-600"
        >
          +${{ formatMoney(estimatedIetc) }}/wk
        </span>
      </div>
    </div>

    <!-- After-Tax Allowance (only for gross income mode) -->
    <div v-if="budgetStore.incomeMode === 'gross'" class="space-y-3">
      <label class="text-sm font-semibold text-slate-700 block">After-tax allowance</label>
      <p class="text-xs text-slate-500 -mt-2">Additional income received after tax (e.g., travel allowance, meal allowance)</p>

      <div class="flex gap-3">
        <div class="flex-1 relative">
          <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
          <input
            type="number"
            :value="budgetStore.allowanceAmount"
            @input="budgetStore.allowanceAmount = parseFloat($event.target.value) || 0"
            class="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all font-mono"
            placeholder="0.00"
            step="0.01"
            min="0"
          />
        </div>
        <select
          :value="budgetStore.allowanceFrequency"
          @change="budgetStore.allowanceFrequency = $event.target.value"
          class="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 min-w-[130px]"
        >
          <option value="weekly">Weekly</option>
          <option value="fortnightly">Fortnightly</option>
          <option value="monthly">Monthly</option>
          <option value="annual">Annually</option>
        </select>
      </div>
    </div>

    <!-- Live Tax Preview -->
    <div v-if="budgetStore.payAmount > 0 && budgetStore.incomeMode === 'gross'" class="bg-slate-50 rounded-2xl p-5 space-y-3">
      <h4 class="text-sm font-semibold text-slate-700">Tax Breakdown (estimated)</h4>
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-slate-600">Gross Weekly</span>
          <span class="font-mono font-medium text-slate-800">${{ formatMoney(weeklyGross) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-600">PAYE + ACC</span>
          <span class="font-mono font-medium text-red-500">-${{ formatMoney(estimatedPaye) }}</span>
        </div>
        <div v-if="budgetStore.kiwisaver" class="flex justify-between">
          <span class="text-slate-600">KiwiSaver ({{ budgetStore.kiwisaverRate }}%)</span>
          <span class="font-mono font-medium text-red-500">-${{ formatMoney(estimatedKiwisaver) }}</span>
        </div>
        <div v-if="budgetStore.studentLoan && weeklyGross * 52 > 24128" class="flex justify-between">
          <span class="text-slate-600">Student Loan</span>
          <span class="font-mono font-medium text-red-500">-${{ formatMoney(estimatedStudentLoan) }}</span>
        </div>
        <div v-if="estimatedIetc > 0" class="flex justify-between">
          <span class="text-slate-600">IETC Credit</span>
          <span class="font-mono font-medium text-green-500">+${{ formatMoney(estimatedIetc) }}</span>
        </div>
        <div v-if="weeklyAllowance > 0" class="flex justify-between">
          <span class="text-slate-600">After-tax Allowance</span>
          <span class="font-mono font-medium text-green-500">+${{ formatMoney(weeklyAllowance) }}</span>
        </div>
        <div class="flex justify-between pt-2 border-t border-slate-200">
          <span class="font-semibold text-slate-800">Take-home Weekly</span>
          <span class="font-mono font-bold text-teal-600">${{ formatMoney(estimatedNetWeekly + weeklyAllowance) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useBudgetStore } from '@/stores/budget'

const budgetStore = useBudgetStore()

const incomeModes = [
  { value: 'gross', label: 'Before Tax', description: 'Gross/salary amount' },
  { value: 'net', label: 'After Tax', description: 'Take-home pay' },
]

const payTypes = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'annually', label: 'Yearly' },
]

const hoursTypes = [
  { value: 'fixed', label: 'Fixed hours' },
  { value: 'variable', label: 'Variable hours' },
]

const amountLabel = computed(() => {
  if (budgetStore.payType === 'hourly') return 'Hourly rate'
  if (budgetStore.incomeMode === 'gross') return `${payTypes.find(t => t.value === budgetStore.payType)?.label} gross income`
  return `${payTypes.find(t => t.value === budgetStore.payType)?.label} take-home pay`
})

// Calculate weekly gross from input
const weeklyGross = computed(() => {
  let amount = budgetStore.payAmount || 0

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

  return amount
})

// Calculate PAYE using 2025-2026 NZ tax brackets (from 1 April 2025)
const estimatedPaye = computed(() => {
  const annual = weeklyGross.value * 52
  let tax = 0

  // 2025-2026 NZ tax brackets
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

  // Add ACC levy (1.67% for 2025-2026)
  tax += annual * 0.0167

  return tax / 52
})

const estimatedKiwisaver = computed(() => {
  if (!budgetStore.kiwisaver) return 0
  const rate = parseFloat(budgetStore.kiwisaverRate) / 100
  return weeklyGross.value * rate
})

const estimatedStudentLoan = computed(() => {
  if (!budgetStore.studentLoan) return 0
  const annual = weeklyGross.value * 52
  if (annual <= 24128) return 0
  return ((annual - 24128) * 0.12) / 52
})

// Calculate IETC with abatement for income $66k-$70k
const estimatedIetc = computed(() => {
  if (!budgetStore.ietcEligible || !budgetStore.isIetcIncomeEligible) return 0
  const annual = weeklyGross.value * 52

  if (annual >= 24000 && annual <= 66000) {
    return 520 / 52 // Full credit: $10/week
  } else if (annual > 66000 && annual <= 70000) {
    // Abates at 13 cents per dollar over $66,000
    const reduction = (annual - 66000) * 0.13
    return Math.max(0, 520 - reduction) / 52
  }
  return 0
})

// Calculate weekly allowance from any frequency
const weeklyAllowance = computed(() => {
  const amount = budgetStore.allowanceAmount || 0
  if (amount <= 0) return 0

  switch (budgetStore.allowanceFrequency) {
    case 'fortnightly': return amount / 2
    case 'monthly': return amount / 4.33
    case 'annual': return amount / 52
    default: return amount // weekly
  }
})

const estimatedNetWeekly = computed(() => {
  let net = weeklyGross.value - estimatedPaye.value - estimatedKiwisaver.value - estimatedStudentLoan.value
  net += estimatedIetc.value // Add IETC credit (with abatement if applicable)
  return Math.max(0, net)
})

function formatMoney(value) {
  return (value || 0).toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>
