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
              <h2 class="text-lg font-semibold text-slate-800">Pay Expense Early</h2>
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
          <form @submit.prevent="handleConfirm" class="p-6 space-y-4">
            <!-- Expense Info -->
            <div class="p-4 rounded-2xl bg-slate-50">
              <div class="space-y-2">
                <div class="flex justify-between">
                  <span class="text-sm text-slate-600">Expense</span>
                  <span class="font-semibold text-slate-800">{{ expense?.name }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm text-slate-600">Original Due Date</span>
                  <span class="font-medium text-slate-700">{{ formatDisplayDate(expense?.due_date) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm text-slate-600">Expected Amount</span>
                  <span class="font-medium text-slate-700">${{ formatAmount(expense?.amount) }}</span>
                </div>
                <div v-if="expense?.account_name" class="flex justify-between">
                  <span class="text-sm text-slate-600">Account</span>
                  <span class="font-medium text-slate-700">{{ expense?.account_name }}</span>
                </div>
              </div>
            </div>

            <!-- Amount -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Payment Amount ($)</label>
              <input
                v-model.number="form.amount"
                type="number"
                step="0.01"
                min="0"
                class="w-full px-4 py-3 text-lg font-medium border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="0.00"
                required
              />
              <!-- Amount Difference Warning -->
              <p
                v-if="amountDifferencePercent !== 0"
                class="mt-2 text-sm"
                :class="Math.abs(amountDifferencePercent) > 10 ? 'text-amber-600' : 'text-slate-500'"
              >
                <span v-if="amountDifferencePercent > 0">
                  {{ Math.abs(amountDifferencePercent).toFixed(0) }}% more than expected
                </span>
                <span v-else>
                  {{ Math.abs(amountDifferencePercent).toFixed(0) }}% less than expected
                </span>
              </p>
            </div>

            <!-- Payment Date -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Payment Date</label>
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
                placeholder="E.g., Paid early due to discount"
              />
            </div>

            <!-- Balance Preview -->
            <div
              v-if="expense?.account_balance !== undefined && form.amount > 0"
              class="p-4 rounded-2xl"
              :class="newBalance < 0 ? 'bg-red-50' : 'bg-teal-50'"
            >
              <div class="space-y-2">
                <div class="flex justify-between text-sm">
                  <span :class="newBalance < 0 ? 'text-red-700' : 'text-teal-700'">Current Balance</span>
                  <span class="font-medium" :class="newBalance < 0 ? 'text-red-800' : 'text-teal-800'">
                    ${{ formatAmount(expense?.account_balance) }}
                  </span>
                </div>
                <div class="flex justify-between text-sm">
                  <span :class="newBalance < 0 ? 'text-red-700' : 'text-teal-700'">Payment</span>
                  <span class="font-medium" :class="newBalance < 0 ? 'text-red-800' : 'text-teal-800'">
                    -${{ formatAmount(form.amount) }}
                  </span>
                </div>
                <div class="pt-2 border-t" :class="newBalance < 0 ? 'border-red-200' : 'border-teal-200'">
                  <div class="flex justify-between">
                    <span class="font-medium" :class="newBalance < 0 ? 'text-red-800' : 'text-teal-800'">New Balance</span>
                    <span class="font-bold text-lg" :class="newBalance < 0 ? 'text-red-600' : 'text-teal-600'">
                      ${{ formatAmount(newBalance) }}
                    </span>
                  </div>
                </div>
              </div>
              <!-- Low Balance Warning -->
              <p v-if="newBalance < 0" class="mt-3 text-sm text-red-600">
                Warning: This payment will result in a negative balance.
              </p>
            </div>

            <!-- Quick Amount Button -->
            <div v-if="expense?.amount" class="flex flex-wrap gap-2">
              <button
                type="button"
                @click="form.amount = expense.amount"
                class="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Use expected (${{ formatAmount(expense.amount) }})
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
                :disabled="saving || !form.amount"
                class="flex-1 px-4 py-3 font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-xl transition-colors"
              >
                {{ saving ? 'Processing...' : 'Confirm Payment' }}
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

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  expense: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'confirm'])

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
  amount: 0,
  date: formatDateLocal(new Date()),
  notes: ''
})

// Reset form when modal opens with expense data
watch(() => props.show, (isOpen) => {
  if (isOpen && props.expense) {
    form.value = {
      amount: props.expense.amount || 0,
      date: formatDateLocal(new Date()),
      notes: ''
    }
  }
})

// Also update when expense changes
watch(() => props.expense, (newExpense) => {
  if (props.show && newExpense) {
    form.value.amount = newExpense.amount || 0
  }
})

// Format amount to 2 decimal places
function formatAmount(amount) {
  return parseFloat(amount || 0).toFixed(2)
}

// Format date for display
function formatDisplayDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-NZ', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })
}

// Calculate new balance
const newBalance = computed(() => {
  if (props.expense?.account_balance === undefined) return null
  return (props.expense.account_balance || 0) - (form.value.amount || 0)
})

// Calculate amount difference percentage
const amountDifferencePercent = computed(() => {
  if (!props.expense?.amount || !form.value.amount) return 0
  const expected = props.expense.amount
  const actual = form.value.amount
  return ((actual - expected) / expected) * 100
})

// Handle confirm
async function handleConfirm() {
  if (!form.value.amount || !props.expense) return

  saving.value = true
  try {
    emit('confirm', {
      expenseId: props.expense.id,
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
