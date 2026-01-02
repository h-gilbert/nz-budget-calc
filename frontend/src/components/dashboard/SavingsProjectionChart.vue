<template>
  <div class="savings-projection-chart">
    <div class="relative" style="height: 180px;">
      <Line v-if="chartData" :data="chartData" :options="chartOptions" />
    </div>

    <!-- Key stats -->
    <div class="grid grid-cols-2 gap-2 mt-3 text-xs">
      <div class="bg-white rounded-lg p-2">
        <div class="text-slate-500">Current Rate</div>
        <div class="font-mono font-semibold text-blue-600">${{ formatMoney(projection.currentRate) }}/wk</div>
      </div>
      <div v-if="projection.requiredRate" class="bg-white rounded-lg p-2">
        <div class="text-slate-500">Required Rate</div>
        <div class="font-mono font-semibold" :class="projection.isOnTrack ? 'text-green-600' : 'text-amber-600'">
          ${{ formatMoney(projection.requiredRate) }}/wk
        </div>
      </div>
      <div v-if="projection.projectedGoalDate" class="bg-white rounded-lg p-2">
        <div class="text-slate-500">Goal Date</div>
        <div class="font-mono font-semibold text-blue-600">{{ formatDate(projection.projectedGoalDate) }}</div>
      </div>
      <div class="bg-white rounded-lg p-2">
        <div class="text-slate-500">Projected (52wk)</div>
        <div class="font-mono font-semibold text-blue-600">${{ formatMoney(projection.projectedFinalBalance) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const props = defineProps({
  projection: {
    type: Object,
    required: true
  }
})

const chartData = computed(() => {
  if (!props.projection || !props.projection.projection) return null

  // Show every 4th week for cleaner labels
  const data = props.projection.projection
  const labels = data.map((p, i) => i % 4 === 0 ? `W${p.week}` : '')
  const balanceData = data.map(p => p.balance)

  const datasets = [
    {
      label: 'Projected Balance',
      data: balanceData,
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.3,
      borderWidth: 2,
      pointRadius: 0
    }
  ]

  // Add goal target line if exists
  if (props.projection.goalTarget) {
    datasets.push({
      label: 'Goal',
      data: Array(data.length).fill(props.projection.goalTarget),
      borderColor: '#10B981',
      borderDash: [5, 5],
      borderWidth: 2,
      pointRadius: 0,
      fill: false
    })
  }

  return { labels, datasets }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      titleColor: '#334155',
      bodyColor: '#475569',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      padding: 10,
      displayColors: false,
      callbacks: {
        title: (items) => {
          const week = props.projection.projection[items[0].dataIndex]
          return `Week ${week.week}`
        },
        label: (context) => {
          if (context.dataset.label === 'Goal') {
            return `Goal: $${context.raw.toLocaleString()}`
          }
          return `Balance: $${context.raw.toLocaleString()}`
        }
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        font: { size: 10 },
        color: '#94a3b8',
        maxRotation: 0
      }
    },
    y: {
      grid: {
        color: '#f1f5f9'
      },
      ticks: {
        callback: (value) => `$${value.toLocaleString()}`,
        font: { size: 10 },
        color: '#94a3b8'
      }
    }
  }
}))

function formatMoney(value) {
  return (value || 0).toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-NZ', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>
