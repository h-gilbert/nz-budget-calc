<template>
  <div class="space-y-4">
    <!-- Header with Add Button -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="font-semibold text-slate-800">Your Expenses</h3>
        <p class="text-sm text-slate-500">Add your recurring bills and expenses</p>
      </div>
      <AppButton size="sm" @click="budgetStore.addExpense()">
        <template #icon-left>
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
        </template>
        Add Expense
      </AppButton>
    </div>

    <!-- Empty State -->
    <div
      v-if="budgetStore.expenses.length === 0"
      class="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200"
    >
      <svg class="w-12 h-12 mx-auto text-slate-300 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
      <p class="text-slate-600 font-medium mb-2">No expenses yet</p>
      <p class="text-sm text-slate-500 mb-4">Add your bills to see how much you can spend each week</p>
      <AppButton size="sm" @click="budgetStore.addExpense()">
        Add Your First Expense
      </AppButton>
    </div>

    <!-- Expense Table -->
    <div v-else class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <!-- Table Header - Hidden on mobile -->
      <div class="hidden md:grid grid-cols-[1fr_100px_100px_110px_90px] gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
        <button
          @click="toggleSort('name')"
          class="flex items-center gap-1 text-left hover:text-teal-600 transition-colors"
        >
          Name
          <SortIcon v-if="sortField === 'name'" :direction="sortDirection" />
        </button>
        <button
          @click="toggleSort('amount')"
          class="flex items-center gap-1 justify-end hover:text-teal-600 transition-colors"
        >
          Amount
          <SortIcon v-if="sortField === 'amount'" :direction="sortDirection" />
        </button>
        <button
          @click="toggleSort('frequency')"
          class="flex items-center gap-1 hover:text-teal-600 transition-colors"
        >
          Frequency
          <SortIcon v-if="sortField === 'frequency'" :direction="sortDirection" />
        </button>
        <button
          @click="toggleSort('account')"
          class="flex items-center gap-1 hover:text-teal-600 transition-colors"
        >
          Account
          <SortIcon v-if="sortField === 'account'" :direction="sortDirection" />
        </button>
        <button
          @click="toggleSort('weeklyCost')"
          class="flex items-center gap-1 justify-end hover:text-teal-600 transition-colors"
        >
          Weekly
          <SortIcon v-if="sortField === 'weeklyCost'" :direction="sortDirection" />
        </button>
      </div>

      <!-- Mobile Sort Button -->
      <div class="md:hidden flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <span class="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          {{ budgetStore.expenses.length }} expense{{ budgetStore.expenses.length !== 1 ? 's' : '' }}
        </span>
        <button
          @click="cycleMobileSort"
          class="flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-700"
        >
          Sort: {{ mobileSortLabel }}
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M2.24 6.8a.75.75 0 001.06-.04l1.95-2.1v8.59a.75.75 0 001.5 0V4.66l1.95 2.1a.75.75 0 101.1-1.02l-3.25-3.5a.75.75 0 00-1.1 0L2.2 5.74a.75.75 0 00.04 1.06zm8 6.4a.75.75 0 00-.04 1.06l3.25 3.5a.75.75 0 001.1 0l3.25-3.5a.75.75 0 10-1.1-1.02l-1.95 2.1V6.75a.75.75 0 00-1.5 0v8.59l-1.95-2.1a.75.75 0 00-1.06-.04z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>

      <!-- Table Body - Card on mobile, grid on desktop -->
      <TransitionGroup name="list" tag="div">
        <div
          v-for="expense in sortedExpenses"
          :key="expense.id"
          @click="openEditModal(expense)"
          class="border-b border-slate-100 last:border-b-0 hover:bg-slate-50 cursor-pointer transition-colors group"
        >
          <!-- Desktop: Grid layout -->
          <div class="hidden md:grid grid-cols-[1fr_100px_100px_110px_90px] gap-2 px-4 py-3">
            <span class="text-slate-800 font-medium truncate flex items-center gap-1.5">
              {{ expense.name || 'Unnamed expense' }}
              <span v-if="expense.expenseType === 'budget'" class="px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-600 rounded">
                Budget
              </span>
            </span>
            <span class="text-right font-mono text-slate-600 text-sm">${{ formatMoney(expense.amount) }}</span>
            <span class="text-slate-500 text-sm capitalize">{{ expense.frequency }}</span>
            <span class="text-slate-500 text-sm truncate">{{ getAccountName(expense.accountId) }}</span>
            <span class="text-right font-mono text-teal-600 font-semibold text-sm">${{ formatMoney(getWeeklyCost(expense)) }}</span>
          </div>

          <!-- Mobile: Card layout -->
          <div class="md:hidden px-4 py-3 space-y-2">
            <div class="flex items-start justify-between gap-3">
              <span class="text-slate-800 font-medium flex-1 min-w-0 flex items-center gap-1.5">
                {{ expense.name || 'Unnamed expense' }}
                <span v-if="expense.expenseType === 'budget'" class="px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-600 rounded">
                  Budget
                </span>
              </span>
              <span class="font-mono text-teal-600 font-semibold text-sm whitespace-nowrap">${{ formatMoney(getWeeklyCost(expense)) }}/wk</span>
            </div>
            <div class="flex items-center gap-3 text-sm text-slate-500">
              <span class="font-mono">${{ formatMoney(expense.amount) }}</span>
              <span class="text-slate-300">•</span>
              <span class="capitalize">{{ expense.frequency }}</span>
              <span v-if="expense.accountId" class="text-slate-300">•</span>
              <span v-if="expense.accountId" class="truncate">{{ getAccountName(expense.accountId) }}</span>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- Summary -->
    <div
      v-if="budgetStore.expenses.length > 0"
      class="flex items-center justify-between p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-2xl border border-teal-100"
    >
      <div>
        <span class="text-sm text-teal-700">Total Weekly Expenses</span>
        <span class="block text-xs text-teal-600">{{ budgetStore.expenses.length }} expense{{ budgetStore.expenses.length !== 1 ? 's' : '' }}</span>
      </div>
      <span class="text-2xl font-mono font-bold text-teal-600">
        ${{ formatMoney(budgetStore.totalExpenses) }}
      </span>
    </div>

    <!-- Edit Modal -->
    <ExpenseEditModal
      v-model="showEditModal"
      :expense="editingExpense"
      @delete="handleDelete"
    />
  </div>
</template>

<script setup>
import { ref, computed, h } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import AppButton from '@/components/common/AppButton.vue'
import ExpenseEditModal from './ExpenseEditModal.vue'

const budgetStore = useBudgetStore()

// Sorting state
const sortField = ref('weeklyCost')
const sortDirection = ref('desc')

// Modal state
const showEditModal = ref(false)
const editingExpense = ref(null)

// Frequency order for sorting
const frequencyOrder = {
  weekly: 1,
  fortnightly: 2,
  monthly: 3,
  annually: 4,
  'one-off': 5,
}

// Get account name by ID
function getAccountName(accountId) {
  if (!accountId) return '-'
  const account = budgetStore.findAccountById(accountId)
  return account?.name || 'Unknown'
}

// Computed sorted expenses
const sortedExpenses = computed(() => {
  return [...budgetStore.expenses].sort((a, b) => {
    let comparison = 0

    switch (sortField.value) {
      case 'weeklyCost':
        comparison = getWeeklyCost(a) - getWeeklyCost(b)
        break
      case 'frequency':
        comparison = frequencyOrder[a.frequency] - frequencyOrder[b.frequency]
        break
      case 'name':
        comparison = (a.name || '').localeCompare(b.name || '')
        break
      case 'amount':
        comparison = (a.amount || 0) - (b.amount || 0)
        break
      case 'account':
        comparison = getAccountName(a.accountId).localeCompare(getAccountName(b.accountId))
        break
    }

    return sortDirection.value === 'asc' ? comparison : -comparison
  })
})

// Toggle sort on column click
function toggleSort(field) {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    // Alphabetical fields default to ascending, numeric fields to descending
    sortDirection.value = (field === 'name' || field === 'account') ? 'asc' : 'desc'
  }
}

// Mobile sort cycling
const mobileSortOptions = ['weeklyCost', 'name', 'amount', 'frequency']
const mobileSortLabels = {
  weeklyCost: 'Weekly cost',
  name: 'Name',
  amount: 'Amount',
  frequency: 'Frequency',
}

const mobileSortLabel = computed(() => mobileSortLabels[sortField.value] || 'Weekly cost')

function cycleMobileSort() {
  const currentIndex = mobileSortOptions.indexOf(sortField.value)
  const nextIndex = (currentIndex + 1) % mobileSortOptions.length
  const nextField = mobileSortOptions[nextIndex]

  sortField.value = nextField
  sortDirection.value = (nextField === 'name') ? 'asc' : 'desc'
}

// Get weekly cost for an expense
function getWeeklyCost(expense) {
  const amount = parseFloat(expense.amount) || 0
  const frequency = expense.frequency || 'weekly'

  switch (frequency) {
    case 'weekly':
      return amount
    case 'fortnightly':
      return amount / 2
    case 'monthly':
      return amount / 4.33
    case 'annually':
      return amount / 52
    case 'one-off':
      if (expense.date) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const targetDate = new Date(expense.date)
        targetDate.setHours(0, 0, 0, 0)
        const diffTime = targetDate - today
        const weeks = Math.max(1, Math.ceil(diffTime / (7 * 24 * 60 * 60 * 1000)))
        return amount / weeks
      }
      return amount
    default:
      return amount
  }
}

// Format money helper
function formatMoney(value) {
  return (value || 0).toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Modal handlers
function openEditModal(expense) {
  editingExpense.value = expense
  showEditModal.value = true
}

function handleDelete(expenseId) {
  budgetStore.removeExpense(expenseId)
  showEditModal.value = false
}

// Sort icon component (using render function to avoid runtime compilation)
const SortIcon = {
  props: ['direction'],
  render() {
    const ascPath = 'M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z'
    const descPath = 'M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z'

    return h('svg', {
      class: 'w-3.5 h-3.5 text-teal-500',
      viewBox: '0 0 20 20',
      fill: 'currentColor'
    }, [
      h('path', {
        'fill-rule': 'evenodd',
        'clip-rule': 'evenodd',
        d: this.direction === 'asc' ? ascPath : descPath
      })
    ])
  }
}
</script>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.list-move {
  transition: transform 0.3s ease;
}
</style>
