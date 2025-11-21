<template>
  <SummaryCard
    title="Weekly Income"
    :value="formattedIncome"
    :subtitle="incomeSubtitle"
    icon="💰"
    variant="success"
    :footer="incomeFooter"
  >
    <div class="income-breakdown">
      <div class="breakdown-item">
        <span class="label">Gross Income:</span>
        <span class="value">{{ formatCurrency(budgetStore.weeklyGrossIncome) }}</span>
      </div>
      <div class="breakdown-item">
        <span class="label">Deductions:</span>
        <span class="value deduction">
          -{{ formatCurrency(deductions) }}
        </span>
      </div>
      <div class="breakdown-item total">
        <span class="label">Net Income:</span>
        <span class="value">{{ formatCurrency(budgetStore.weeklyNetIncome) }}</span>
      </div>
    </div>
  </SummaryCard>
</template>

<script setup>
import { computed } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import SummaryCard from './SummaryCard.vue'

const budgetStore = useBudgetStore()

const formattedIncome = computed(() => {
  return formatCurrency(budgetStore.weeklyNetIncome)
})

const incomeSubtitle = computed(() => {
  const payType = budgetStore.payType
  return `After tax and deductions (${payType})`
})

const incomeFooter = computed(() => {
  const annual = budgetStore.weeklyNetIncome * 52
  return `Annual: ${formatCurrency(annual)}`
})

const deductions = computed(() => {
  if (!budgetStore.results) return 0
  return (
    (budgetStore.results.paye || 0) +
    (budgetStore.results.kiwisaverDeduction || 0) +
    (budgetStore.results.studentLoanDeduction || 0)
  )
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
.income-breakdown {
  font-size: 0.9rem;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  padding: 0.4rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.breakdown-item:last-child {
  border-bottom: none;
}

.breakdown-item.total {
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

.value.deduction {
  color: #dc3545;
}
</style>
