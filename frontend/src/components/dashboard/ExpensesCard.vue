<template>
  <SummaryCard
    title="Weekly Expenses"
    :value="formattedExpenses"
    :subtitle="expensesSubtitle"
    icon="📊"
    variant="info"
    :footer="expensesFooter"
  >
    <div class="expense-summary">
      <div class="summary-item">
        <span class="label">Total Items:</span>
        <span class="value">{{ budgetStore.expenses.length }}</span>
      </div>
      <div class="summary-item" v-if="expensesByFrequency.weekly > 0">
        <span class="label">Weekly:</span>
        <span class="value">{{ expensesByFrequency.weekly }}</span>
      </div>
      <div class="summary-item" v-if="expensesByFrequency.monthly > 0">
        <span class="label">Monthly:</span>
        <span class="value">{{ expensesByFrequency.monthly }}</span>
      </div>
      <div class="summary-item" v-if="expensesByFrequency.annual > 0">
        <span class="label">Annual:</span>
        <span class="value">{{ expensesByFrequency.annual }}</span>
      </div>
    </div>
  </SummaryCard>
</template>

<script setup>
import { computed } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import SummaryCard from './SummaryCard.vue'

const budgetStore = useBudgetStore()

const formattedExpenses = computed(() => {
  return formatCurrency(budgetStore.totalExpenses)
})

const expensesSubtitle = computed(() => {
  const count = budgetStore.expenses.length
  return `${count} ${count === 1 ? 'expense' : 'expenses'} tracked`
})

const expensesFooter = computed(() => {
  const annual = budgetStore.totalExpenses * 52
  return `Annual: ${formatCurrency(annual)}`
})

const expensesByFrequency = computed(() => {
  return budgetStore.expenses.reduce((acc, expense) => {
    const freq = expense.frequency || 'weekly'
    if (freq === 'weekly' || freq === 'fortnightly') {
      acc.weekly++
    } else if (freq === 'monthly') {
      acc.monthly++
    } else if (freq === 'annually') {
      acc.annual++
    }
    return acc
  }, { weekly: 0, monthly: 0, annual: 0 })
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
.expense-summary {
  font-size: 0.9rem;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  padding: 0.4rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.summary-item:last-child {
  border-bottom: none;
}

.label {
  color: #6c757d;
}

.value {
  font-weight: 600;
  color: #2c3e50;
}
</style>
