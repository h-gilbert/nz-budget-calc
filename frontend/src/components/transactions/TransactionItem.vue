<template>
  <div
    class="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors group"
  >
    <!-- Left: Icon + Details -->
    <div class="flex items-center gap-3 min-w-0 flex-1">
      <!-- Type Icon -->
      <div
        :class="[
          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
          typeStyles.bg
        ]"
      >
        <component :is="typeIcon" :class="['w-5 h-5', typeStyles.icon]" />
      </div>

      <!-- Details -->
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <p class="font-medium text-slate-800 truncate">
            {{ transaction.description || transaction.category || 'Transaction' }}
          </p>
          <span
            v-if="transaction.is_recurring"
            class="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full"
          >
            Recurring
          </span>
        </div>
        <p class="text-sm text-slate-500 truncate">
          {{ transaction.category || typeLabel }} &middot; {{ formattedDate }}
        </p>
      </div>
    </div>

    <!-- Right: Amount + Actions -->
    <div class="flex items-center gap-4">
      <!-- Variance Badge (for manual expenses with budget) -->
      <span
        v-if="showVariance && variance !== 0"
        :class="[
          'text-xs font-medium px-2 py-1 rounded-full',
          variance > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
        ]"
      >
        {{ variance > 0 ? '+' : '' }}${{ Math.abs(variance).toFixed(2) }}
      </span>

      <!-- Amount -->
      <div class="text-right">
        <p
          :class="[
            'font-semibold',
            transaction.transaction_type === 'income' ? 'text-green-600' : 'text-slate-800'
          ]"
        >
          {{ transaction.transaction_type === 'income' ? '+' : '-' }}${{ formatAmount(transaction.amount) }}
        </p>
        <p v-if="transaction.account_name" class="text-xs text-slate-400">
          {{ transaction.account_name }}
        </p>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          @click="$emit('edit', transaction)"
          class="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Edit"
        >
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
            <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
          </svg>
        </button>
        <button
          @click="$emit('delete', transaction)"
          class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete"
        >
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, h } from 'vue'

const props = defineProps({
  transaction: {
    type: Object,
    required: true
  }
})

defineEmits(['edit', 'delete'])

// Type label
const typeLabel = computed(() => {
  const types = {
    income: 'Income',
    expense: 'Expense',
    transfer: 'Transfer'
  }
  return types[props.transaction.transaction_type] || 'Transaction'
})

// Type styles
const typeStyles = computed(() => {
  const styles = {
    income: { bg: 'bg-green-50', icon: 'text-green-600' },
    expense: { bg: 'bg-red-50', icon: 'text-red-600' },
    transfer: { bg: 'bg-blue-50', icon: 'text-blue-600' }
  }
  return styles[props.transaction.transaction_type] || styles.expense
})

// Type icons (inline SVG components)
const IncomeIcon = {
  render() {
    return h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 20 20', fill: 'currentColor' }, [
      h('path', { 'fill-rule': 'evenodd', d: 'M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v4.59L7.3 9.24a.75.75 0 00-1.1 1.02l3.25 3.5a.75.75 0 001.1 0l3.25-3.5a.75.75 0 10-1.1-1.02l-1.95 2.1V6.75z', 'clip-rule': 'evenodd' })
    ])
  }
}

const ExpenseIcon = {
  render() {
    return h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 20 20', fill: 'currentColor' }, [
      h('path', { 'fill-rule': 'evenodd', d: 'M10 18a8 8 0 100-16 8 8 0 000 16zm.75-4.75a.75.75 0 01-1.5 0V8.66L7.3 10.76a.75.75 0 01-1.1-1.02l3.25-3.5a.75.75 0 011.1 0l3.25 3.5a.75.75 0 11-1.1 1.02l-1.95-2.1v4.59z', 'clip-rule': 'evenodd' })
    ])
  }
}

const TransferIcon = {
  render() {
    return h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 20 20', fill: 'currentColor' }, [
      h('path', { 'fill-rule': 'evenodd', d: 'M13.2 2.24a.75.75 0 00.04 1.06l2.1 1.95H6.75a.75.75 0 000 1.5h8.59l-2.1 1.95a.75.75 0 101.02 1.1l3.5-3.25a.75.75 0 000-1.1l-3.5-3.25a.75.75 0 00-1.06.04zm-6.4 8a.75.75 0 00-1.06-.04l-3.5 3.25a.75.75 0 000 1.1l3.5 3.25a.75.75 0 101.02-1.1l-2.1-1.95h8.59a.75.75 0 000-1.5H4.66l2.1-1.95a.75.75 0 00.04-1.06z', 'clip-rule': 'evenodd' })
    ])
  }
}

const typeIcon = computed(() => {
  const icons = {
    income: IncomeIcon,
    expense: ExpenseIcon,
    transfer: TransferIcon
  }
  return icons[props.transaction.transaction_type] || ExpenseIcon
})

// Format date
const formattedDate = computed(() => {
  const date = new Date(props.transaction.transaction_date)
  return date.toLocaleDateString('en-NZ', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })
})

// Show variance for manual expenses with budget
const showVariance = computed(() => {
  return props.transaction.budget_amount && props.transaction.transaction_type === 'expense'
})

const variance = computed(() => {
  if (!props.transaction.budget_amount) return 0
  return props.transaction.amount - props.transaction.budget_amount
})

// Format amount
function formatAmount(amount) {
  return parseFloat(amount || 0).toFixed(2)
}
</script>
