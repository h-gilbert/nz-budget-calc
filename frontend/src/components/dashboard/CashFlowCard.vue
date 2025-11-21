<template>
  <SummaryCard
    title="Cash Flow"
    :value="formattedCashFlow"
    :subtitle="cashFlowSubtitle"
    :icon="cashFlowIcon"
    :variant="cashFlowVariant"
    :footer="cashFlowFooter"
  >
    <div class="cashflow-details">
      <div class="detail-item">
        <span class="label">Weekly Income:</span>
        <span class="value positive">{{ formatCurrency(budgetStore.weeklyNetIncome) }}</span>
      </div>
      <div class="detail-item">
        <span class="label">Weekly Expenses:</span>
        <span class="value negative">-{{ formatCurrency(budgetStore.totalExpenses) }}</span>
      </div>
      <div class="detail-item total">
        <span class="label">Available:</span>
        <span class="value" :class="cashFlowClass">
          {{ formattedCashFlow }}
        </span>
      </div>
    </div>
  </SummaryCard>
</template>

<script setup>
import { computed } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import SummaryCard from './SummaryCard.vue'

const budgetStore = useBudgetStore()

const formattedCashFlow = computed(() => {
  return formatCurrency(budgetStore.weeklyDiscretionary)
})

const cashFlowSubtitle = computed(() => {
  const amount = budgetStore.weeklyDiscretionary
  if (amount > 0) {
    return 'Surplus available for savings/spending'
  } else if (amount === 0) {
    return 'Breaking even'
  } else {
    return 'Deficit - expenses exceed income'
  }
})

const cashFlowIcon = computed(() => {
  const amount = budgetStore.weeklyDiscretionary
  if (amount > 0) return '✅'
  if (amount === 0) return '⚖️'
  return '⚠️'
})

const cashFlowVariant = computed(() => {
  const amount = budgetStore.weeklyDiscretionary
  if (amount > 0) return 'success'
  if (amount === 0) return 'warning'
  return 'danger'
})

const cashFlowClass = computed(() => {
  const amount = budgetStore.weeklyDiscretionary
  if (amount > 0) return 'positive'
  if (amount === 0) return 'neutral'
  return 'negative'
})

const cashFlowFooter = computed(() => {
  const weekly = budgetStore.weeklyDiscretionary
  const annual = weekly * 52
  const percentage = budgetStore.weeklyNetIncome > 0
    ? ((weekly / budgetStore.weeklyNetIncome) * 100).toFixed(1)
    : 0

  if (weekly > 0) {
    return `${percentage}% of income available | Annual: ${formatCurrency(annual)}`
  } else if (weekly < 0) {
    return `Budget shortfall of ${formatCurrency(Math.abs(annual))} per year`
  } else {
    return 'No surplus or deficit'
  }
})

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}
</script>

<style scoped>
.cashflow-details {
  font-size: 0.9rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 0.4rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-item.total {
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 2px solid #e0e0e0;
  font-weight: 600;
}

.label {
  color: #6c757d;
}

.value {
  font-weight: 600;
  color: #2c3e50;
}

.value.positive {
  color: #28a745;
}

.value.negative {
  color: #dc3545;
}

.value.neutral {
  color: #6c757d;
}
</style>
