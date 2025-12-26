<template>
  <div class="space-y-6">
    <!-- Filters -->
    <div v-if="showFilters" class="flex flex-wrap gap-3">
      <!-- Date Range -->
      <div class="flex items-center gap-2">
        <input
          v-model="filters.from_date"
          type="date"
          class="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          placeholder="From"
        />
        <span class="text-slate-400">to</span>
        <input
          v-model="filters.to_date"
          type="date"
          class="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          placeholder="To"
        />
      </div>

      <!-- Type Filter -->
      <select
        v-model="filters.transaction_type"
        class="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
      >
        <option value="">All Types</option>
        <option value="income">Income</option>
        <option value="expense">Expense</option>
        <option value="transfer">Transfer</option>
      </select>

      <!-- Apply Filters -->
      <button
        @click="applyFilters"
        class="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors"
      >
        Apply
      </button>

      <button
        @click="clearFilters"
        class="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
      >
        Clear
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!transactions || transactions.length === 0"
      class="text-center py-12 bg-white rounded-3xl border border-gray-100"
    >
      <svg class="w-12 h-12 mx-auto text-slate-300 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
      <p class="text-slate-500">No transactions found</p>
      <p class="text-sm text-slate-400 mt-1">Transactions will appear here once you log them</p>
    </div>

    <!-- Transaction Groups -->
    <div v-else class="space-y-6">
      <div
        v-for="group in groupedTransactions"
        :key="group.date"
        class="space-y-2"
      >
        <!-- Date Header -->
        <div class="flex items-center justify-between px-1">
          <h3 class="text-sm font-semibold text-slate-600">{{ group.label }}</h3>
          <span class="text-sm text-slate-400">{{ group.total }}</span>
        </div>

        <!-- Transactions in Group -->
        <div class="space-y-2">
          <TransactionItem
            v-for="transaction in group.transactions"
            :key="transaction.id"
            :transaction="transaction"
            @edit="$emit('edit', $event)"
            @delete="$emit('delete', $event)"
          />
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div
      v-if="total > transactions.length"
      class="flex justify-center pt-4"
    >
      <button
        @click="$emit('load-more')"
        class="px-6 py-2 text-sm font-medium text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-xl transition-colors"
      >
        Load More ({{ transactions.length }} of {{ total }})
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import TransactionItem from './TransactionItem.vue'

const props = defineProps({
  transactions: {
    type: Array,
    default: () => []
  },
  total: {
    type: Number,
    default: 0
  },
  loading: {
    type: Boolean,
    default: false
  },
  showFilters: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['edit', 'delete', 'load-more', 'filter'])

// Filter state
const filters = ref({
  from_date: '',
  to_date: '',
  transaction_type: ''
})

// Group transactions by date
const groupedTransactions = computed(() => {
  if (!props.transactions || props.transactions.length === 0) return []

  const groups = {}
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const transaction of props.transactions) {
    const date = transaction.transaction_date
    if (!groups[date]) {
      groups[date] = {
        date,
        label: formatDateLabel(date, today),
        transactions: [],
        totalAmount: 0
      }
    }
    groups[date].transactions.push(transaction)

    // Calculate running total for the day
    if (transaction.transaction_type === 'income') {
      groups[date].totalAmount += parseFloat(transaction.amount)
    } else {
      groups[date].totalAmount -= parseFloat(transaction.amount)
    }
  }

  // Convert to array and add formatted total
  return Object.values(groups)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(group => ({
      ...group,
      total: formatTotal(group.totalAmount)
    }))
})

// Format date label
function formatDateLabel(dateStr, today) {
  const date = new Date(dateStr)
  date.setHours(0, 0, 0, 0)

  const diffDays = Math.floor((today - date) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) {
    return date.toLocaleDateString('en-NZ', { weekday: 'long' })
  }

  return date.toLocaleDateString('en-NZ', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
  })
}

// Format total
function formatTotal(amount) {
  const sign = amount >= 0 ? '+' : ''
  return `${sign}$${Math.abs(amount).toFixed(2)}`
}

// Filter actions
function applyFilters() {
  emit('filter', { ...filters.value })
}

function clearFilters() {
  filters.value = {
    from_date: '',
    to_date: '',
    transaction_type: ''
  }
  emit('filter', {})
}
</script>
