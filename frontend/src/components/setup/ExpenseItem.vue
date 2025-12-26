<template>
  <div class="group flex items-start gap-3 p-4 bg-slate-50 rounded-2xl hover:bg-slate-100/80 transition-colors">
    <!-- Expense Icon -->
    <div class="flex-shrink-0 w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
      <svg class="w-5 h-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M1 4a1 1 0 011-1h16a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V4zm12 4a3 3 0 11-6 0 3 3 0 016 0zM4 9a1 1 0 100-2 1 1 0 000 2zm13-1a1 1 0 11-2 0 1 1 0 012 0zM1.75 14.5a.75.75 0 000 1.5c4.417 0 8.693.603 12.749 1.73 1.111.309 2.251-.512 2.251-1.696v-.784a.75.75 0 00-1.5 0v.784a.272.272 0 01-.35.25A49.043 49.043 0 001.75 14.5z" clip-rule="evenodd" />
      </svg>
    </div>

    <!-- Expense Details -->
    <div class="flex-1 min-w-0 space-y-3">
      <!-- Name Input -->
      <div class="relative inline-flex items-center gap-1.5 group/name">
        <input
          type="text"
          :value="expense.name"
          @input="budgetStore.updateExpense(expense.id, 'name', $event.target.value)"
          placeholder="Expense name (e.g., Rent, Power, Internet)"
          class="px-0 py-1 bg-transparent border-0 border-b border-dashed border-slate-300 text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none focus:border-solid focus:border-teal-400 hover:border-slate-400 transition-colors"
        />
        <svg class="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover/name:opacity-100 transition-opacity" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
        </svg>
      </div>

      <!-- Amount and Frequency -->
      <div class="flex flex-wrap items-center gap-3">
        <div class="relative flex-shrink-0 w-32">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
          <input
            type="number"
            :value="expense.amount"
            @input="budgetStore.updateExpense(expense.id, 'amount', parseFloat($event.target.value) || 0)"
            placeholder="0.00"
            class="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
            step="0.01"
            min="0"
          />
        </div>

        <select
          :value="expense.frequency"
          @change="budgetStore.updateExpense(expense.id, 'frequency', $event.target.value)"
          class="flex-shrink-0 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
        >
          <option value="weekly">Weekly</option>
          <option value="fortnightly">Fortnightly</option>
          <option value="monthly">Monthly</option>
          <option value="annually">Annually</option>
          <option value="one-off">One-off</option>
        </select>

        <!-- Weekly equivalent -->
        <span class="text-xs text-slate-500 ml-auto">
          ${{ formatWeekly(expense) }}/wk
        </span>
      </div>

      <!-- Expense Type Selector -->
      <div class="flex items-center gap-3 pt-1">
        <span class="text-xs text-slate-500">Type:</span>
        <div class="flex gap-1">
          <button
            type="button"
            @click="budgetStore.updateExpense(expense.id, 'expenseType', 'bill')"
            :class="[
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
              (!expense.expenseType || expense.expenseType === 'bill')
                ? 'bg-blue-500 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            ]"
            title="Fixed bill with specific due date"
          >
            Bill
          </button>
          <button
            type="button"
            @click="handleBudgetTypeSelect()"
            :class="[
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
              expense.expenseType === 'budget'
                ? 'bg-purple-500 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            ]"
            title="Budget envelope - no due date, variable spending"
          >
            Budget
          </button>
        </div>
        <span v-if="expense.expenseType === 'budget'" class="text-xs text-purple-600 font-medium">
          Envelope
        </span>
      </div>

      <!-- Due Date Selectors based on frequency - only for bill types -->
      <div v-if="expense.expenseType !== 'budget'" class="flex flex-wrap items-center gap-2">
        <!-- Weekly: Day of week -->
        <template v-if="expense.frequency === 'weekly'">
          <span class="text-xs text-slate-500">Due every</span>
          <div class="flex gap-1">
            <button
              v-for="day in daysOfWeek"
              :key="day.value"
              type="button"
              @click="budgetStore.updateExpense(expense.id, 'dueDay', day.value)"
              :class="[
                'w-8 h-8 text-xs font-medium rounded-lg transition-all',
                expense.dueDay === day.value
                  ? 'bg-teal-500 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
              ]"
            >
              {{ day.label }}
            </button>
          </div>
        </template>

        <!-- Fortnightly: Starting date -->
        <template v-else-if="expense.frequency === 'fortnightly'">
          <span class="text-xs text-slate-500">Starting from</span>
          <input
            type="date"
            :value="expense.dueDate"
            @input="budgetStore.updateExpense(expense.id, 'dueDate', $event.target.value)"
            class="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
          />
        </template>

        <!-- Monthly: Day of month -->
        <template v-else-if="expense.frequency === 'monthly'">
          <span class="text-xs text-slate-500">Due on the</span>
          <div class="flex items-center gap-1">
            <input
              type="number"
              :value="expense.dueDay"
              @input="budgetStore.updateExpense(expense.id, 'dueDay', Math.min(31, Math.max(1, parseInt($event.target.value) || 1)))"
              min="1"
              max="31"
              class="w-14 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
            />
            <span class="text-xs text-slate-500">{{ getOrdinalSuffix(expense.dueDay || 1) }}</span>
          </div>
        </template>

        <!-- Annually: Date (month + day) -->
        <template v-else-if="expense.frequency === 'annually'">
          <span class="text-xs text-slate-500">Due on</span>
          <select
            :value="getAnnualMonth(expense.dueDate)"
            @change="updateAnnualDate(expense.id, parseInt($event.target.value), getAnnualDay(expense.dueDate))"
            class="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
          >
            <option v-for="(month, index) in months" :key="index" :value="index + 1">{{ month }}</option>
          </select>
          <select
            :value="getAnnualDay(expense.dueDate)"
            @change="updateAnnualDate(expense.id, getAnnualMonth(expense.dueDate), parseInt($event.target.value))"
            class="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
          >
            <option v-for="day in getDaysInMonth(getAnnualMonth(expense.dueDate))" :key="day" :value="day">{{ day }}</option>
          </select>
        </template>

        <!-- One-off: Full date -->
        <template v-else-if="expense.frequency === 'one-off'">
          <span class="text-xs text-slate-500">Due on</span>
          <input
            type="date"
            :value="expense.date"
            @input="budgetStore.updateExpense(expense.id, 'date', $event.target.value)"
            class="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
          />
        </template>
      </div>

      <!-- Payment Mode Selector - only for bill types -->
      <div v-if="expense.expenseType !== 'budget'" class="flex items-center gap-3 pt-1">
        <span class="text-xs text-slate-500">Payment mode:</span>
        <div class="flex gap-1">
          <button
            type="button"
            @click="budgetStore.updateExpense(expense.id, 'paymentMode', 'automatic')"
            :class="[
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
              (!expense.paymentMode || expense.paymentMode === 'automatic')
                ? 'bg-teal-500 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            ]"
            title="Transaction created automatically on due date for exact budgeted amount"
          >
            Automatic
          </button>
          <button
            type="button"
            @click="budgetStore.updateExpense(expense.id, 'paymentMode', 'manual')"
            :class="[
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
              expense.paymentMode === 'manual'
                ? 'bg-amber-500 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            ]"
            title="Log actual spending manually - amounts can vary from budget"
          >
            Manual
          </button>
        </div>
        <span v-if="expense.paymentMode === 'manual'" class="text-xs text-amber-600 font-medium">
          Variable amount
        </span>
      </div>

      <!-- Budget envelope info -->
      <div v-else class="px-3 py-2 bg-purple-50 rounded-lg border border-purple-100">
        <span class="text-xs text-purple-700">
          Log purchases as you spend - amounts can vary from budget
        </span>
      </div>
    </div>

    <!-- Delete Button with Confirmation -->
    <div class="flex-shrink-0">
      <button
        v-if="!confirmingDelete"
        type="button"
        @click="confirmingDelete = true"
        class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
      >
        <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clip-rule="evenodd" />
        </svg>
      </button>
      <div v-else class="flex items-center gap-1">
        <button
          type="button"
          @click="$emit('remove')"
          class="px-2 py-1 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
        >
          Delete
        </button>
        <button
          type="button"
          @click="confirmingDelete = false"
          class="px-2 py-1 text-xs font-medium text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useBudgetStore } from '@/stores/budget'

const props = defineProps({
  expense: {
    type: Object,
    required: true,
  },
})

defineEmits(['remove'])

const confirmingDelete = ref(false)

const budgetStore = useBudgetStore()

// Handle switching to budget type - also sets payment mode to manual
function handleBudgetTypeSelect() {
  budgetStore.updateExpense(props.expense.id, 'expenseType', 'budget')
  budgetStore.updateExpense(props.expense.id, 'paymentMode', 'manual')
}

// Days of week starting Monday (value is JS day index: 0=Sun, 1=Mon, etc.)
const daysOfWeek = [
  { label: 'M', value: 1 },
  { label: 'T', value: 2 },
  { label: 'W', value: 3 },
  { label: 'T', value: 4 },
  { label: 'F', value: 5 },
  { label: 'S', value: 6 },
  { label: 'S', value: 0 },
]

// Months for annual selector
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Get ordinal suffix (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(day) {
  if (day > 3 && day < 21) return 'th'
  switch (day % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}

// Get days in a month (for annual selector)
function getDaysInMonth(month) {
  const daysPerMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return daysPerMonth[(month || 1) - 1] || 31
}

// Parse annual date to get month (1-12)
function getAnnualMonth(dateStr) {
  if (!dateStr) return 1
  const date = new Date(dateStr)
  return isNaN(date.getTime()) ? 1 : date.getMonth() + 1
}

// Parse annual date to get day (1-31)
function getAnnualDay(dateStr) {
  if (!dateStr) return 1
  const date = new Date(dateStr)
  return isNaN(date.getTime()) ? 1 : date.getDate()
}

// Update annual date from month and day
function updateAnnualDate(expenseId, month, day) {
  const year = new Date().getFullYear()
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  budgetStore.updateExpense(expenseId, 'dueDate', dateStr)
}

function formatWeekly(expense) {
  const amount = parseFloat(expense.amount) || 0
  const frequency = expense.frequency || 'weekly'

  let weekly = amount
  if (frequency === 'one-off') {
    // Calculate weeks until date
    if (expense.date) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const targetDate = new Date(expense.date)
      targetDate.setHours(0, 0, 0, 0)
      const diffTime = targetDate - today
      const weeks = Math.max(1, Math.ceil(diffTime / (7 * 24 * 60 * 60 * 1000)))
      weekly = amount / weeks
    }
  } else if (frequency === 'monthly') {
    weekly = amount / 4.33
  } else if (frequency === 'fortnightly') {
    weekly = amount / 2
  } else if (frequency === 'annually') {
    weekly = amount / 52
  }

  return weekly.toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>
