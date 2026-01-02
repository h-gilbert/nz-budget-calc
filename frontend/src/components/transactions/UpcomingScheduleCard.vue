<template>
  <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-slate-800">Upcoming</h3>
      <span class="text-sm text-slate-500">Next {{ days }} days</span>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!items || items.length === 0"
      class="text-center py-8"
    >
      <svg class="w-10 h-10 mx-auto text-slate-300 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
      <p class="text-sm text-slate-500">No upcoming items</p>
    </div>

    <!-- Upcoming Items -->
    <div v-else class="space-y-3">
      <div
        v-for="item in displayItems"
        :key="`${item.item_type}-${item.id}`"
        @click="handleItemClick(item)"
        class="flex items-center justify-between p-3 rounded-xl transition-colors"
        :class="[
          isPastDue(item.due_date) ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-slate-100',
          item.item_type === 'expense' ? 'cursor-pointer' : ''
        ]"
      >
        <div class="flex items-center gap-3">
          <!-- Icon -->
          <div
            :class="[
              'w-8 h-8 rounded-lg flex items-center justify-center',
              item.item_type === 'transfer' ? 'bg-blue-100' : 'bg-red-100'
            ]"
          >
            <!-- Transfer Icon -->
            <svg
              v-if="item.item_type === 'transfer'"
              class="w-4 h-4 text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path fill-rule="evenodd" d="M13.2 2.24a.75.75 0 00.04 1.06l2.1 1.95H6.75a.75.75 0 000 1.5h8.59l-2.1 1.95a.75.75 0 101.02 1.1l3.5-3.25a.75.75 0 000-1.1l-3.5-3.25a.75.75 0 00-1.06.04zm-6.4 8a.75.75 0 00-1.06-.04l-3.5 3.25a.75.75 0 000 1.1l3.5 3.25a.75.75 0 101.02-1.1l-2.1-1.95h8.59a.75.75 0 000-1.5H4.66l2.1-1.95a.75.75 0 00.04-1.06z" clip-rule="evenodd" />
            </svg>
            <!-- Expense Icon -->
            <svg
              v-else
              class="w-4 h-4 text-red-600"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-4.75a.75.75 0 01-1.5 0V8.66L7.3 10.76a.75.75 0 01-1.1-1.02l3.25-3.5a.75.75 0 011.1 0l3.25 3.5a.75.75 0 11-1.1 1.02l-1.95-2.1v4.59z" clip-rule="evenodd" />
            </svg>
          </div>

          <!-- Details -->
          <div>
            <p class="font-medium text-slate-800 text-sm">
              {{ item.item_type === 'transfer' ? `Transfer to ${item.to_account_name}` : item.name }}
            </p>
            <p class="text-xs text-slate-500">
              {{ formatDate(item.due_date) }}
              <span v-if="isPastDue(item.due_date)" class="text-red-500 font-medium"> (Overdue)</span>
            </p>
          </div>
        </div>

        <!-- Amount -->
        <span class="font-semibold text-slate-700">${{ formatAmount(item.amount) }}</span>
      </div>

      <!-- Show More -->
      <button
        v-if="items.length > maxItems"
        @click="showAll = !showAll"
        class="w-full py-2 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
      >
        {{ showAll ? 'Show less' : `Show ${items.length - maxItems} more` }}
      </button>
    </div>

    <!-- Summary -->
    <div v-if="items && items.length > 0" class="mt-4 pt-4 border-t border-gray-100">
      <div class="flex justify-between text-sm">
        <span class="text-slate-600">Total upcoming</span>
        <span class="font-semibold text-slate-800">${{ totalAmount.toFixed(2) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  days: {
    type: Number,
    default: 7
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['pay-early'])

// Handle clicking on an upcoming item
function handleItemClick(item) {
  // Only allow clicking on expense items (not transfers)
  if (item.item_type === 'expense') {
    emit('pay-early', item)
  }
}

const maxItems = 5
const showAll = ref(false)

// Display items (limited or all)
const displayItems = computed(() => {
  if (showAll.value || !props.items) return props.items
  return props.items.slice(0, maxItems)
})

// Total amount
const totalAmount = computed(() => {
  if (!props.items) return 0
  return props.items.reduce((sum, item) => sum + parseFloat(item.amount), 0)
})

// Format date
function formatDate(dateStr) {
  const date = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const dateOnly = new Date(dateStr)
  dateOnly.setHours(0, 0, 0, 0)

  if (dateOnly.getTime() === today.getTime()) return 'Today'
  if (dateOnly.getTime() === tomorrow.getTime()) return 'Tomorrow'

  return date.toLocaleDateString('en-NZ', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })
}

// Check if past due
function isPastDue(dateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(dateStr)
  date.setHours(0, 0, 0, 0)
  return date < today
}

// Format amount
function formatAmount(amount) {
  return parseFloat(amount || 0).toFixed(2)
}
</script>
