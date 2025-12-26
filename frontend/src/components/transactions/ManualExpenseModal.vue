<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @keydown.escape="$emit('close')"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="$emit('close')"
        />

        <!-- Modal Content -->
        <div class="relative w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-gray-100">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-slate-800">Log Expense</h2>
              <button
                @click="$emit('close')"
                class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Form -->
          <form @submit.prevent="handleSave" class="p-6 space-y-4">
            <!-- Expense Category -->
            <CustomDropdown
              v-model="form.expenseId"
              :options="expenseOptions"
              label="Category"
              placeholder="Select category..."
              required
            >
              <template #selected="{ option }">
                <div class="flex items-center justify-between w-full min-w-0 pr-2">
                  <span class="font-medium text-slate-800 truncate">{{ option.name }}</span>
                  <span class="text-sm text-slate-500 flex-shrink-0 ml-2">
                    ${{ formatAmount(option.amount) }}<span class="text-slate-400">/{{ formatFrequency(option.frequency) }}</span>
                  </span>
                </div>
              </template>
              <template #option="{ option, selected }">
                <div class="flex items-center justify-between">
                  <div class="flex flex-col min-w-0">
                    <span class="font-medium truncate" :class="selected ? 'text-teal-800' : 'text-slate-800'">
                      {{ option.name }}
                    </span>
                    <span class="text-xs" :class="selected ? 'text-teal-600' : 'text-slate-400'">
                      {{ option.expenseType === 'budget' ? 'Budget envelope' : 'Bill' }}
                    </span>
                  </div>
                  <div class="flex items-center gap-2 flex-shrink-0 ml-3">
                    <span class="text-sm font-semibold" :class="selected ? 'text-teal-700' : 'text-slate-700'">
                      ${{ formatAmount(option.amount) }}
                    </span>
                    <span class="text-xs px-2 py-0.5 rounded-full" :class="selected ? 'bg-teal-200 text-teal-700' : 'bg-slate-100 text-slate-500'">
                      {{ formatFrequency(option.frequency) }}
                    </span>
                    <svg
                      v-if="selected"
                      class="w-5 h-5 text-teal-600"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                    </svg>
                  </div>
                </div>
              </template>
            </CustomDropdown>

            <!-- Amount -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Amount ($)</label>
              <input
                v-model.number="form.amount"
                type="number"
                step="0.01"
                min="0"
                class="w-full px-4 py-3 text-lg font-medium border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="0.00"
                required
              />
            </div>

            <!-- Date -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Date</label>
              <input
                v-model="form.date"
                type="date"
                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                required
              />
            </div>

            <!-- Notes -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Notes (optional)</label>
              <input
                v-model="form.notes"
                type="text"
                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="E.g., Fuel at Z Station"
              />
            </div>

            <!-- Budget Status for Budget Envelopes -->
            <div
              v-if="selectedExpense && form.amount > 0 && isBudgetEnvelope"
              class="p-4 rounded-2xl"
              :class="budgetStatus.overBudget ? 'bg-amber-50' : 'bg-teal-50'"
            >
              <div class="space-y-2">
                <div class="flex justify-between text-sm">
                  <span :class="budgetStatus.overBudget ? 'text-amber-700' : 'text-teal-700'">Weekly Budget</span>
                  <span class="font-medium" :class="budgetStatus.overBudget ? 'text-amber-800' : 'text-teal-800'">
                    ${{ budgetStatus.weeklyBudget.toFixed(2) }}
                  </span>
                </div>
                <div class="flex justify-between text-sm">
                  <span :class="budgetStatus.overBudget ? 'text-amber-700' : 'text-teal-700'">This expense</span>
                  <span class="font-medium" :class="budgetStatus.overBudget ? 'text-amber-800' : 'text-teal-800'">
                    ${{ form.amount.toFixed(2) }}
                  </span>
                </div>
                <div class="pt-2 border-t" :class="budgetStatus.overBudget ? 'border-amber-200' : 'border-teal-200'">
                  <div class="flex justify-between">
                    <span class="font-medium" :class="budgetStatus.overBudget ? 'text-amber-800' : 'text-teal-800'">
                      {{ budgetStatus.overBudget ? 'Over budget' : 'Remaining' }}
                    </span>
                    <span class="font-bold text-lg" :class="budgetStatus.overBudget ? 'text-amber-600' : 'text-teal-600'">
                      {{ budgetStatus.overBudget ? '+' : '' }}${{ Math.abs(budgetStatus.variance).toFixed(2) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Payment Info for Bills -->
            <div
              v-if="selectedExpense && !isBudgetEnvelope"
              class="p-4 rounded-2xl bg-blue-50"
            >
              <div class="space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="text-blue-700">Expected Payment</span>
                  <span class="font-medium text-blue-800">
                    ${{ formatAmount(selectedExpense.amount) }}/{{ formatFrequency(selectedExpense.frequency) }}
                  </span>
                </div>
                <div v-if="form.amount > 0" class="flex justify-between text-sm">
                  <span class="text-blue-700">You're paying</span>
                  <span class="font-medium text-blue-800">${{ form.amount.toFixed(2) }}</span>
                </div>
                <div v-if="form.amount > 0 && billPaymentStatus.difference !== 0" class="pt-2 border-t border-blue-200">
                  <div class="flex justify-between">
                    <span class="font-medium text-blue-800">
                      {{ billPaymentStatus.difference > 0 ? 'Paying extra' : 'Paying less' }}
                    </span>
                    <span class="font-bold text-lg" :class="billPaymentStatus.difference > 0 ? 'text-amber-600' : 'text-blue-600'">
                      {{ billPaymentStatus.difference > 0 ? '+' : '-' }}${{ Math.abs(billPaymentStatus.difference).toFixed(2) }}
                    </span>
                  </div>
                </div>
                <div v-else-if="form.amount > 0" class="pt-2 border-t border-blue-200">
                  <div class="flex justify-between items-center">
                    <span class="font-medium text-green-700">Exact amount</span>
                    <svg class="w-5 h-5 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <!-- Quick Amount Buttons for Budget Envelopes -->
            <div v-if="selectedExpense && isBudgetEnvelope" class="flex flex-wrap gap-2">
              <button
                v-for="amount in quickAmounts"
                :key="amount"
                type="button"
                @click="form.amount = amount"
                class="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                ${{ amount }}
              </button>
              <button
                type="button"
                @click="form.amount = getWeeklyBudget(selectedExpense)"
                class="px-3 py-1.5 text-sm font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
              >
                Use budget (${{ getWeeklyBudget(selectedExpense).toFixed(2) }})
              </button>
            </div>

            <!-- Quick Amount Button for Bills -->
            <div v-if="selectedExpense && !isBudgetEnvelope" class="flex flex-wrap gap-2">
              <button
                type="button"
                @click="form.amount = parseFloat(selectedExpense.amount)"
                class="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                Pay full amount (${{ formatAmount(selectedExpense.amount) }})
              </button>
            </div>

            <!-- Actions -->
            <div class="flex gap-3 pt-2">
              <button
                type="button"
                @click="$emit('close')"
                class="flex-1 px-4 py-3 font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="saving || !form.expenseId || !form.amount"
                class="flex-1 px-4 py-3 font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-xl transition-colors"
              >
                {{ saving ? 'Saving...' : 'Log Expense' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import CustomDropdown from '@/components/common/CustomDropdown.vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'save'])

const budgetStore = useBudgetStore()
const saving = ref(false)

// Helper to format date as YYYY-MM-DD in local time (not UTC)
function formatDateLocal(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Form state
const form = ref({
  expenseId: '',
  amount: 0,
  date: formatDateLocal(new Date()),
  notes: ''
})

// Reset form when modal opens
watch(() => props.show, (isOpen) => {
  if (isOpen) {
    form.value = {
      expenseId: '',
      amount: 0,
      date: formatDateLocal(new Date()),
      notes: ''
    }
  }
})

// Get manual expenses and budget envelopes
const manualExpenses = computed(() => {
  return budgetStore.expenses.filter(e =>
    e.paymentMode === 'manual' ||
    e.expenseType === 'budget' ||
    !e.paymentMode // Include legacy expenses without paymentMode
  )
})

// Transform expenses into dropdown options with actual amounts
const expenseOptions = computed(() => {
  return manualExpenses.value.map(expense => ({
    value: expense.id,
    label: expense.name || expense.description,
    name: expense.name || expense.description,
    amount: parseFloat(expense.amount) || 0,
    frequency: expense.frequency || 'weekly',
    expenseType: expense.expenseType || 'bill',
    searchTerms: `${expense.name} ${expense.description}`
  }))
})

// Format amount to 2 decimal places, removing trailing zeros
function formatAmount(amount) {
  const formatted = parseFloat(amount).toFixed(2)
  // Remove unnecessary trailing zeros
  return formatted.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
}

// Format frequency for display
function formatFrequency(frequency) {
  const labels = {
    'weekly': 'week',
    'fortnightly': 'fortnight',
    'monthly': 'month',
    'annually': 'year',
    'one-off': 'one-off'
  }
  return labels[frequency] || frequency
}

// Selected expense
const selectedExpense = computed(() => {
  if (!form.value.expenseId) return null
  return budgetStore.expenses.find(e => e.id === form.value.expenseId)
})

// Check if selected expense is a budget envelope
const isBudgetEnvelope = computed(() => {
  return selectedExpense.value?.expenseType === 'budget'
})

// Get weekly budget for an expense
function getWeeklyBudget(expense) {
  return budgetStore.getWeeklyAmount(expense)
}

// Budget status calculation (for budget envelopes)
const budgetStatus = computed(() => {
  if (!selectedExpense.value) {
    return { weeklyBudget: 0, variance: 0, overBudget: false }
  }

  const weeklyBudget = getWeeklyBudget(selectedExpense.value)
  const variance = form.value.amount - weeklyBudget

  return {
    weeklyBudget,
    variance,
    overBudget: variance > 0
  }
})

// Bill payment status (for bills - compares against actual bill amount, not weekly-ised)
const billPaymentStatus = computed(() => {
  if (!selectedExpense.value) {
    return { expectedAmount: 0, difference: 0 }
  }

  const expectedAmount = parseFloat(selectedExpense.value.amount) || 0
  const difference = form.value.amount - expectedAmount

  return {
    expectedAmount,
    difference
  }
})

// Quick amount buttons
const quickAmounts = computed(() => {
  if (!selectedExpense.value) return [20, 50, 100]

  const budget = getWeeklyBudget(selectedExpense.value)
  const amounts = [
    Math.round(budget * 0.5),
    Math.round(budget * 0.75),
    Math.round(budget * 1.25)
  ].filter(a => a > 0 && a !== Math.round(budget))

  return [...new Set(amounts)].sort((a, b) => a - b).slice(0, 3)
})

// Handle save
async function handleSave() {
  if (!form.value.expenseId || !form.value.amount) return

  saving.value = true
  try {
    emit('save', {
      expenseId: form.value.expenseId,
      amount: form.value.amount,
      date: form.value.date,
      notes: form.value.notes
    })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
}
</style>
