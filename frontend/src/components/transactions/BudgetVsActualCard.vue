<template>
  <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <h3 class="text-lg font-semibold text-slate-800">Budget vs Actual</h3>
        <!-- Info tooltip -->
        <div class="relative group">
          <button
            type="button"
            class="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 108.94 6.94zM10 15a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
            </svg>
          </button>
          <div class="absolute left-0 top-full mt-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
            <p class="font-medium mb-1">Rolling {{ weeks }}-week period</p>
            <p class="text-slate-300">Compares your spending from the last {{ weeks }} weeks against your weekly budget × {{ weeks }}.</p>
            <p class="text-slate-400 mt-2">Some weeks you'll be over, some under — it smooths out over time!</p>
            <div class="absolute -top-1.5 left-3 w-3 h-3 bg-slate-800 rotate-45"></div>
          </div>
        </div>
      </div>
      <select
        v-model="weeks"
        @change="$emit('change-weeks', weeks)"
        class="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
      >
        <option :value="4">4 weeks</option>
        <option :value="8">8 weeks</option>
        <option :value="12">12 weeks</option>
      </select>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!summaries || summaries.length === 0"
      class="text-center py-8"
    >
      <svg class="w-10 h-10 mx-auto text-slate-300 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
      <p class="text-sm text-slate-500">No budget envelopes to track</p>
      <p class="text-xs text-slate-400 mt-1">Add a "Budget Envelope" expense (e.g., Food, Fuel) to track spending</p>
    </div>

    <!-- Expense Summaries -->
    <div v-else class="space-y-4">
      <div
        v-for="summary in summaries"
        :key="summary.expense_id"
        class="space-y-2"
      >
        <!-- Header -->
        <div class="flex items-center justify-between">
          <span class="font-medium text-slate-700">{{ summary.expense_name }}</span>
          <span
            :class="[
              'text-sm font-medium',
              summary.on_track ? 'text-green-600' : 'text-red-600'
            ]"
          >
            {{ summary.on_track ? 'On track' : `$${Math.abs(summary.variance).toFixed(2)} over` }}
          </span>
        </div>

        <!-- Progress Bar -->
        <div class="relative h-3 bg-slate-100 rounded-full overflow-hidden">
          <!-- Budget line at 100% -->
          <div class="absolute inset-y-0 left-0 bg-slate-200 rounded-full" style="width: 100%"></div>

          <!-- Actual fill -->
          <div
            :class="[
              'absolute inset-y-0 left-0 rounded-full transition-all duration-300',
              summary.on_track ? 'bg-green-500' : 'bg-red-500'
            ]"
            :style="{ width: `${Math.min(100, (summary.total_actual / summary.total_budget) * 100)}%` }"
          ></div>

          <!-- Overflow indicator -->
          <div
            v-if="summary.total_actual > summary.total_budget"
            class="absolute inset-y-0 right-0 bg-red-300 rounded-r-full"
            :style="{ width: `${Math.min(20, ((summary.total_actual - summary.total_budget) / summary.total_budget) * 100)}%` }"
          ></div>
        </div>

        <!-- Stats -->
        <div class="flex justify-between text-xs text-slate-500">
          <span>Actual: ${{ summary.total_actual.toFixed(2) }}</span>
          <span>Budget: ${{ summary.total_budget.toFixed(2) }}</span>
        </div>
      </div>
    </div>

    <!-- Totals -->
    <div v-if="summaries && summaries.length > 0" class="mt-6 pt-4 border-t border-gray-100 space-y-2">
      <div class="flex justify-between">
        <span class="text-slate-600">Total Budget</span>
        <span class="font-semibold text-slate-800">${{ totalBudget.toFixed(2) }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-slate-600">Total Actual</span>
        <span class="font-semibold text-slate-800">${{ totalActual.toFixed(2) }}</span>
      </div>
      <div class="flex justify-between pt-2 border-t border-gray-100">
        <span class="font-medium" :class="totalVariance <= 0 ? 'text-green-700' : 'text-red-700'">
          {{ totalVariance <= 0 ? 'Under budget' : 'Over budget' }}
        </span>
        <span class="font-bold text-lg" :class="totalVariance <= 0 ? 'text-green-600' : 'text-red-600'">
          {{ totalVariance > 0 ? '+' : '-' }}${{ Math.abs(totalVariance).toFixed(2) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  summaries: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  initialWeeks: {
    type: Number,
    default: 4
  }
})

defineEmits(['change-weeks'])

const weeks = ref(props.initialWeeks)

// Totals
const totalBudget = computed(() => {
  if (!props.summaries) return 0
  return props.summaries.reduce((sum, s) => sum + s.total_budget, 0)
})

const totalActual = computed(() => {
  if (!props.summaries) return 0
  return props.summaries.reduce((sum, s) => sum + s.total_actual, 0)
})

const totalVariance = computed(() => {
  return totalActual.value - totalBudget.value
})
</script>
