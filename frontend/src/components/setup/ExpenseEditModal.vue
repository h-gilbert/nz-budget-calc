<template>
  <AppModal v-model="isOpen" :title="localExpense.name || 'Edit Expense'" size="md">
    <div class="space-y-5">
      <!-- Name -->
      <AppInput
        v-model="localExpense.name"
        label="Expense Name"
        placeholder="e.g., Rent, Power, Internet"
      />

      <!-- Amount & Frequency -->
      <div class="grid grid-cols-2 gap-4">
        <AppInput
          v-model="localExpense.amount"
          type="number"
          label="Amount"
          prefix="$"
          :step="0.01"
          :min="0"
          mono
        />
        <AppSelect
          v-model="localExpense.frequency"
          label="Frequency"
          :options="frequencyOptions"
        />
      </div>

      <!-- Account Selector -->
      <AppSelect
        v-model="localExpense.accountId"
        label="Paid from Account"
        :options="accountOptions"
        placeholder="Select account..."
      />

      <!-- Weekly Equivalent -->
      <div class="flex items-center justify-between p-3 bg-teal-50 rounded-xl border border-teal-100">
        <span class="text-sm text-teal-700">Weekly equivalent</span>
        <span class="font-mono font-bold text-teal-600">${{ formatWeekly }}</span>
      </div>

      <!-- Payment Mode Selector -->
      <div class="space-y-2">
        <label class="text-sm font-semibold text-gray-700 block">Payment Mode</label>
        <div class="flex gap-2">
          <button
            type="button"
            @click="localExpense.paymentMode = 'automatic'"
            :class="[
              'flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-all',
              (!localExpense.paymentMode || localExpense.paymentMode === 'automatic')
                ? 'bg-teal-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            ]"
          >
            Automatic
          </button>
          <button
            type="button"
            @click="localExpense.paymentMode = 'manual'"
            :class="[
              'flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-all',
              localExpense.paymentMode === 'manual'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            ]"
          >
            Manual
          </button>
        </div>
        <p class="text-xs text-slate-500">
          {{ localExpense.paymentMode === 'manual'
            ? 'You log actual spending - amounts can vary from budget'
            : 'Transaction created automatically on due date for exact budgeted amount' }}
        </p>
      </div>

      <!-- Due Date Section -->
      <div class="space-y-3">
        <label class="text-sm font-semibold text-gray-700 block">Due Date</label>

        <!-- Weekly: Day of week buttons -->
        <div v-if="localExpense.frequency === 'weekly'" class="flex gap-1.5">
          <button
            v-for="day in daysOfWeek"
            :key="day.value"
            type="button"
            @click="localExpense.dueDay = day.value"
            :class="[
              'w-10 h-10 text-sm font-medium rounded-xl transition-all',
              localExpense.dueDay === day.value
                ? 'bg-teal-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            ]"
          >
            {{ day.label }}
          </button>
        </div>

        <!-- Fortnightly: Starting date -->
        <div v-else-if="localExpense.frequency === 'fortnightly'" class="flex items-center gap-2">
          <span class="text-sm text-slate-500">Starting from</span>
          <input
            type="date"
            v-model="localExpense.dueDate"
            class="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
          />
        </div>

        <!-- Monthly: Day of month -->
        <div v-else-if="localExpense.frequency === 'monthly'" class="flex items-center gap-2">
          <span class="text-sm text-slate-500">Due on the</span>
          <input
            type="number"
            v-model.number="localExpense.dueDay"
            min="1"
            max="31"
            class="w-16 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
          />
          <span class="text-sm text-slate-500">{{ getOrdinalSuffix(localExpense.dueDay || 1) }}</span>
        </div>

        <!-- Annually: Month + Day -->
        <div v-else-if="localExpense.frequency === 'annually'" class="flex items-center gap-2">
          <span class="text-sm text-slate-500">Due on</span>
          <select
            :value="getAnnualMonth(localExpense.dueDate)"
            @change="updateAnnualDate(parseInt($event.target.value), getAnnualDay(localExpense.dueDate))"
            class="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
          >
            <option v-for="(month, index) in months" :key="index" :value="index + 1">{{ month }}</option>
          </select>
          <select
            :value="getAnnualDay(localExpense.dueDate)"
            @change="updateAnnualDate(getAnnualMonth(localExpense.dueDate), parseInt($event.target.value))"
            class="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
          >
            <option v-for="day in getDaysInMonth(getAnnualMonth(localExpense.dueDate))" :key="day" :value="day">{{ day }}</option>
          </select>
        </div>

        <!-- One-off: Full date -->
        <div v-else-if="localExpense.frequency === 'one-off'" class="flex items-center gap-2">
          <span class="text-sm text-slate-500">Due on</span>
          <input
            type="date"
            v-model="localExpense.date"
            class="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-between">
        <!-- Delete Button -->
        <button
          type="button"
          @click="showDeleteConfirm = true"
          class="flex items-center gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </button>

        <!-- Save/Cancel Buttons -->
        <div class="flex gap-3">
          <AppButton variant="secondary" @click="close">Cancel</AppButton>
          <AppButton @click="save">Save Changes</AppButton>
        </div>
      </div>
    </template>
  </AppModal>

  <!-- Delete Confirmation Modal -->
  <ConfirmModal
    v-model="showDeleteConfirm"
    title="Delete Expense"
    :message="`Are you sure you want to delete '${localExpense.name || 'this expense'}'? This action cannot be undone.`"
    confirm-text="Delete"
    cancel-text="Keep it"
    variant="danger"
    @confirm="handleDelete"
  />
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import AppModal from '@/components/common/AppModal.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import AppButton from '@/components/common/AppButton.vue'

const props = defineProps({
  modelValue: Boolean,
  expense: Object,
})

const emit = defineEmits(['update:modelValue', 'delete'])

const budgetStore = useBudgetStore()
const showDeleteConfirm = ref(false)
const localExpense = ref({})

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

// Frequency options for select
const frequencyOptions = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'annually', label: 'Annually' },
  { value: 'one-off', label: 'One-off' },
]

// Days of week (value is JS day index: 0=Sun, 1=Mon, etc.)
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

// Account options for select
const accountOptions = computed(() => {
  return [
    { value: null, label: '(No account)' },
    ...budgetStore.accounts.map(a => ({
      value: a.id,
      label: a.name || 'Unnamed account'
    }))
  ]
})

// Watch for expense prop changes to copy to local state
watch(
  () => props.expense,
  (newExpense) => {
    if (newExpense) {
      localExpense.value = { ...newExpense }
    }
    showDeleteConfirm.value = false
  },
  { immediate: true }
)

// Computed weekly cost
const formatWeekly = computed(() => {
  const amount = parseFloat(localExpense.value.amount) || 0
  const frequency = localExpense.value.frequency || 'weekly'

  let weekly = amount
  if (frequency === 'one-off') {
    if (localExpense.value.date) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const targetDate = new Date(localExpense.value.date)
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
})

// Ordinal suffix helper
function getOrdinalSuffix(day) {
  if (day > 3 && day < 21) return 'th'
  switch (day % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}

// Days in month helper
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
function updateAnnualDate(month, day) {
  const year = new Date().getFullYear()
  localExpense.value.dueDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function save() {
  if (props.expense) {
    // Update all fields in the store
    const fields = ['name', 'amount', 'frequency', 'dueDay', 'dueDate', 'date', 'accountId', 'paymentMode']
    fields.forEach((key) => {
      budgetStore.updateExpense(props.expense.id, key, localExpense.value[key])
    })
  }
  close()
}

function handleDelete() {
  emit('delete', props.expense?.id)
  close()
}

function close() {
  showDeleteConfirm.value = false
  emit('update:modelValue', false)
}
</script>
