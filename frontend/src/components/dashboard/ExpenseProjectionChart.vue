<template>
  <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
    <div class="flex justify-between items-start mb-4">
      <div>
        <h2 class="text-lg font-semibold text-slate-800">Can I Cover My Expenses?</h2>
        <p class="text-sm text-slate-500">
          Green line must stay above red line to avoid shortfall
        </p>
      </div>

      <!-- Account selector if multiple accounts -->
      <select
        v-if="accountOptions.length > 1"
        v-model="selectedAccountId"
        class="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
      >
        <option v-for="opt in accountOptions" :key="opt.id" :value="opt.id">
          {{ opt.name }}
        </option>
      </select>
    </div>

    <!-- Equilibrium & Buffer Control -->
    <div v-if="selectedProjection && selectedProjection.acceleration > 0" class="mb-4 p-4 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl border border-teal-100">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <!-- Equilibrium Info -->
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-sm font-medium text-teal-800">Equilibrium reached:</span>
            <span v-if="selectedProjection.equilibriumWeek" class="text-sm font-semibold text-teal-600">
              Week {{ selectedProjection.equilibriumWeek }}
              <span class="text-teal-500 font-normal">({{ formatDateNice(selectedProjection.equilibriumDate) }})</span>
            </span>
            <span v-else class="text-sm text-amber-600 font-medium">Not within projection</span>
          </div>
          <p class="text-xs text-slate-500">
            After equilibrium, only ${{ formatMoney(selectedProjection.weeklyEquilibrium) }}/wk is needed to cover all expenses.
          </p>
        </div>

        <!-- Buffer Weeks Control -->
        <div v-if="selectedProjection.equilibriumWeek" class="flex items-center gap-3">
          <div class="text-right">
            <label class="text-xs text-slate-500 block mb-1">Buffer weeks after equilibrium</label>
            <div class="flex items-center gap-2">
              <button
                @click="decrementBuffer"
                :disabled="currentBufferWeeks <= 0"
                class="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
              >
                −
              </button>
              <span class="w-8 text-center font-mono font-semibold text-teal-700">{{ currentBufferWeeks }}</span>
              <button
                @click="incrementBuffer"
                :disabled="currentBufferWeeks >= 12"
                class="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Acceleration Stop Info -->
      <div v-if="selectedProjection.accelerationStopWeek" class="mt-3 pt-3 border-t border-teal-100 flex items-center gap-2">
        <svg class="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <span class="text-xs text-slate-600">
          Acceleration stops <strong class="text-teal-700">Week {{ selectedProjection.accelerationStopWeek }}</strong>
          <span v-if="accelerationStopDate" class="text-slate-500">({{ accelerationStopDate }})</span>
          — then transfers drop from
          <span class="font-mono text-amber-600">${{ formatMoney(selectedProjection.actualWeeklyTransfer) }}</span>
          to
          <span class="font-mono text-teal-600">${{ formatMoney(selectedProjection.weeklyEquilibrium) }}</span>/wk
        </span>
      </div>
    </div>

    <!-- Chart container -->
    <div class="relative" style="height: 320px;">
      <Line v-if="chartData" :data="chartData" :options="chartOptions" />
      <div v-else class="flex items-center justify-center h-full text-slate-400">
        No projection data available
      </div>
    </div>

    <!-- Legend -->
    <div class="mt-4 flex flex-wrap gap-6 text-sm">
      <div class="flex items-center gap-2">
        <span class="w-4 h-1 bg-teal-500 rounded"></span>
        <span class="text-slate-600">Available (balance + transfer)</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="w-4 h-1 bg-red-400 rounded"></span>
        <span class="text-slate-600">Expenses due</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="w-4 h-4 rounded bg-red-100 border border-red-300"></span>
        <span class="text-slate-600">Shortfall (can't cover)</span>
      </div>
    </div>

    <!-- Key stats -->
    <div v-if="selectedProjection" class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="bg-slate-50 rounded-xl p-3">
        <div class="text-xs text-slate-500">Closest Call</div>
        <div
          class="font-mono font-semibold"
          :class="minSurplus < 0 ? 'text-red-600' : 'text-slate-800'"
        >
          ${{ formatMoney(minSurplus) }}
        </div>
        <div class="text-xs text-slate-400">Week {{ minSurplusWeek }}</div>
      </div>
      <div class="bg-slate-50 rounded-xl p-3">
        <div class="text-xs text-slate-500">Extra Buffer Needed</div>
        <div class="font-mono font-semibold text-slate-800">
          ${{ formatMoney(selectedProjection.bufferNeeded) }}
        </div>
      </div>
      <div class="bg-slate-50 rounded-xl p-3">
        <div class="text-xs text-slate-500">High Expense Weeks</div>
        <div class="font-mono font-semibold text-amber-600">
          {{ selectedProjection.totalSpikeWeeks }}
        </div>
        <div class="text-xs text-slate-400">of 52 weeks</div>
      </div>
      <div class="bg-slate-50 rounded-xl p-3">
        <div class="text-xs text-slate-500">Status</div>
        <div
          class="font-semibold"
          :class="selectedProjection.isOnTrack ? 'text-green-600' : 'text-red-600'"
        >
          {{ selectedProjection.isOnTrack ? 'All Covered' : `$${formatMoney(selectedProjection.shortfall)} Short` }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { useBudgetStore } from '@/stores/budget'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const budgetStore = useBudgetStore()

// Get all projections - 130 weeks (2.5 years) to show full annual expense cycle
const projections = computed(() => {
  return budgetStore.calculateUnifiedExpenseProjection(130)
    .filter(p => p.weeklyEquilibrium > 0)
})

// Account options for dropdown
const accountOptions = computed(() => {
  return projections.value.map(p => ({
    id: p.accountId,
    name: p.accountName || 'Unnamed Account'
  }))
})

// Selected account
const selectedAccountId = ref(null)

// Set default selection when projections load
watch(projections, (newVal) => {
  if (newVal.length > 0 && !selectedAccountId.value) {
    selectedAccountId.value = newVal[0].accountId
  }
}, { immediate: true })

// Get selected projection
const selectedProjection = computed(() => {
  if (!selectedAccountId.value) return null
  return projections.value.find(p => p.accountId === selectedAccountId.value)
})

// Get current buffer weeks from account
const currentBufferWeeks = computed(() => {
  if (!selectedAccountId.value) return 0
  const account = budgetStore.findAccountById(selectedAccountId.value)
  return account?.accelerationBufferWeeks || 0
})

// Get acceleration stop date formatted nicely
const accelerationStopDate = computed(() => {
  const proj = selectedProjection.value
  if (!proj || !proj.accelerationStopWeek || !proj.projection) return null
  const stopWeekData = proj.projection.find(w => w.week === proj.accelerationStopWeek)
  if (!stopWeekData) return null
  return formatDateNice(stopWeekData.weekEnd)
})

// Buffer control functions
function incrementBuffer() {
  if (!selectedAccountId.value) return
  const account = budgetStore.findAccountById(selectedAccountId.value)
  if (account && (account.accelerationBufferWeeks || 0) < 12) {
    budgetStore.updateAccount(selectedAccountId.value, 'accelerationBufferWeeks', (account.accelerationBufferWeeks || 0) + 1)
  }
}

function decrementBuffer() {
  if (!selectedAccountId.value) return
  const account = budgetStore.findAccountById(selectedAccountId.value)
  if (account && (account.accelerationBufferWeeks || 0) > 0) {
    budgetStore.updateAccount(selectedAccountId.value, 'accelerationBufferWeeks', account.accelerationBufferWeeks - 1)
  }
}

function formatDateNice(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Calculate available balance (what you have to spend) vs expenses (what you need to pay)
// Available = previous week's ending balance + this week's transfer
const chartCalculations = computed(() => {
  const proj = selectedProjection.value
  if (!proj || !proj.projection) return null

  const available = [] // What you have available each week
  const expenses = []  // What you need to pay each week
  const surplus = []   // Available - Expenses (positive = good, negative = shortfall)

  for (let i = 0; i < proj.projection.length; i++) {
    const week = proj.projection[i]
    // Available = balance before expenses this week
    // Which is: previous week's ending balance + this week's transfer
    const availableThisWeek = week.balanceBefore + week.transfer
    available.push(availableThisWeek)
    expenses.push(week.expenses)
    surplus.push(availableThisWeek - week.expenses)
  }

  // Find minimum surplus (closest call)
  let minSurplusVal = Infinity
  let minSurplusWeekNum = 0
  for (let i = 0; i < surplus.length; i++) {
    if (surplus[i] < minSurplusVal) {
      minSurplusVal = surplus[i]
      minSurplusWeekNum = i + 1
    }
  }

  return { available, expenses, surplus, minSurplus: minSurplusVal, minSurplusWeek: minSurplusWeekNum }
})

const minSurplus = computed(() => chartCalculations.value?.minSurplus || 0)
const minSurplusWeek = computed(() => chartCalculations.value?.minSurplusWeek || 0)

// Build chart data - simple two-line comparison
const chartData = computed(() => {
  const proj = selectedProjection.value
  const calc = chartCalculations.value
  if (!proj || !proj.projection || !calc) return null

  const weeks = proj.projection.map(w => `W${w.week}`)

  return {
    labels: weeks,
    datasets: [
      // Available balance line (green/teal) - what you have
      {
        label: 'Available',
        data: calc.available,
        borderColor: '#14b8a6', // teal-500
        backgroundColor: 'rgba(20, 184, 166, 0.1)',
        fill: false,
        tension: 0.2,
        borderWidth: 3,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#14b8a6',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
        order: 1
      },
      // Expenses line (red) - what you need
      {
        label: 'Expenses',
        data: calc.expenses,
        borderColor: '#f87171', // red-400
        backgroundColor: 'rgba(248, 113, 113, 0.1)',
        fill: false,
        tension: 0.2,
        borderWidth: 3,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#f87171',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
        order: 2
      },
      // Shortfall highlighting - shows red area where expenses > available
      {
        label: 'Shortfall',
        data: calc.surplus.map(s => s < 0 ? Math.abs(s) : null),
        type: 'bar',
        backgroundColor: 'rgba(239, 68, 68, 0.3)',
        borderColor: 'rgba(239, 68, 68, 0.5)',
        borderWidth: 1,
        borderRadius: 2,
        order: 3
      }
    ]
  }
})

// Chart options
const chartOptions = computed(() => {
  const proj = selectedProjection.value
  const calc = chartCalculations.value
  if (!proj || !calc) return {}

  const maxValue = Math.max(...calc.available, ...calc.expenses)
  const minValue = Math.min(...calc.available, ...calc.expenses, 0)

  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        display: false // We have custom legend
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#fff',
        bodyColor: '#e2e8f0',
        borderColor: 'rgba(148, 163, 184, 0.3)',
        borderWidth: 1,
        cornerRadius: 12,
        padding: 16,
        callbacks: {
          title: (items) => {
            if (!items.length) return ''
            const weekIdx = items[0].dataIndex
            const week = proj.projection[weekIdx]
            return `Week ${week.week}: ${formatDateShort(week.weekStart)} - ${formatDateShort(week.weekEnd)}`
          },
          label: (context) => {
            const label = context.dataset.label
            const value = context.raw
            if (value === null) return null
            if (label === 'Shortfall') return null // Hide shortfall from tooltip
            return `${label}: $${formatMoney(value)}`
          },
          afterBody: (items) => {
            if (!items.length) return ''
            const weekIdx = items[0].dataIndex
            const surplusVal = calc.surplus[weekIdx]
            const week = proj.projection[weekIdx]

            const lines = []
            lines.push('')
            if (surplusVal >= 0) {
              lines.push(`✓ Surplus: $${formatMoney(surplusVal)}`)
            } else {
              lines.push(`⚠️ SHORTFALL: -$${formatMoney(Math.abs(surplusVal))}`)
            }

            // Show expense breakdown if there are non-weekly items
            if (week.breakdown.length > 1 || (week.breakdown.length === 1 && week.breakdown[0].type !== 'weekly')) {
              const details = week.breakdown
                .filter(b => b.type !== 'weekly')
                .map(b => `  • ${b.label}: $${formatMoney(b.amount)}`)
              if (details.length > 0) {
                lines.push('')
                lines.push('This week includes:')
                lines.push(...details)
              }
            }
            return lines
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxTicksLimit: 13,
          color: '#94a3b8',
          font: { size: 11 }
        }
      },
      y: {
        min: Math.floor(minValue / 100) * 100 - 50,
        max: Math.ceil(maxValue / 100) * 100 + 100,
        grid: {
          color: 'rgba(148, 163, 184, 0.15)'
        },
        ticks: {
          color: '#94a3b8',
          font: { size: 11 },
          callback: (value) => `$${value.toLocaleString()}`
        }
      }
    }
  }
})

function formatMoney(value) {
  return (value || 0).toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDateShort(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
}
</script>
