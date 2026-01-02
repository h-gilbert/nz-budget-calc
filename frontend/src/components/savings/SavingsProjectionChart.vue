<template>
  <div class="h-64 sm:h-80">
    <Line v-if="chartData" :data="chartData" :options="chartOptions" />
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
import annotationPlugin from 'chartjs-plugin-annotation'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin
)

const props = defineProps({
  projection: {
    type: Object,
    required: true
  }
})

const chartData = computed(() => {
  if (!props.projection?.projection) return null

  const labels = props.projection.projection.map(p => {
    if (p.week === 0) return 'Now'
    if (p.week % 4 === 0) return `Week ${p.week}`
    return ''
  })

  return {
    labels,
    datasets: [
      {
        label: 'Projected Balance',
        data: props.projection.projection.map(p => p.balance),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#3B82F6',
        borderWidth: 2
      }
    ]
  }
})

const chartOptions = computed(() => {
  const annotations = {}

  // Goal line
  if (props.projection?.goalTarget) {
    annotations.goalLine = {
      type: 'line',
      yMin: props.projection.goalTarget,
      yMax: props.projection.goalTarget,
      borderColor: '#22C55E',
      borderWidth: 2,
      borderDash: [6, 6],
      label: {
        display: true,
        content: `Goal: $${props.projection.goalTarget.toLocaleString()}`,
        position: 'end',
        backgroundColor: '#22C55E',
        color: 'white',
        font: { size: 11 }
      }
    }
  }

  // Goal deadline marker
  if (props.projection?.goalDeadline && props.projection?.projection) {
    const deadline = new Date(props.projection.goalDeadline)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weeksToDeadline = Math.ceil((deadline - today) / (7 * 24 * 60 * 60 * 1000))

    if (weeksToDeadline > 0 && weeksToDeadline <= 52) {
      annotations.deadlineLine = {
        type: 'line',
        xMin: weeksToDeadline,
        xMax: weeksToDeadline,
        borderColor: '#EAB308',
        borderWidth: 2,
        borderDash: [4, 4],
        label: {
          display: true,
          content: 'Target Date',
          position: 'start',
          backgroundColor: '#EAB308',
          color: 'white',
          font: { size: 11 }
        }
      }
    }
  }

  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
        callbacks: {
          title: (items) => {
            const week = items[0].dataIndex
            if (week === 0) return 'Current'
            const date = props.projection.projection[week]?.date
            return date ? `Week ${week} (${formatDate(date)})` : `Week ${week}`
          },
          label: (item) => {
            return `Balance: $${item.raw.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}`
          }
        }
      },
      annotation: {
        annotations
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 13,
          color: '#94A3B8'
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          callback: (value) => `$${value.toLocaleString()}`,
          color: '#94A3B8'
        }
      }
    }
  }
})

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'short'
  })
}
</script>
