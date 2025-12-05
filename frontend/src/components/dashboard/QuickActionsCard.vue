<template>
  <div class="quick-actions-card">
    <div class="card-header">
      <h3>Quick Actions</h3>
      <p class="subtitle">Access detailed tools and planning features</p>
    </div>

    <div class="actions-grid">
      <!-- Automation Column -->
      <router-link to="/automation" class="action-column">
        <div class="column-icon">🔄</div>
        <h4>Automation</h4>
        <div class="status-indicator" :class="automationStatusClass">
          {{ automationStatus }}
        </div>
        <div class="metrics">
          <div v-if="budgetStore.pendingActions.transfer" class="metric">
            <span class="metric-label">Next transfer:</span>
            <span class="metric-value">{{ formatDate(budgetStore.pendingActions.transfer.weekDate) }}</span>
          </div>
          <div v-else class="metric">
            <span class="metric-value">✓ All current</span>
          </div>
        </div>
        <div class="action-link">
          View Details →
        </div>
      </router-link>

      <!-- Planning Column -->
      <router-link to="/planning" class="action-column">
        <div class="column-icon">📅</div>
        <h4>Planning</h4>
        <div v-if="loading" class="status-indicator">Loading...</div>
        <div v-else class="metrics">
          <div class="metric">
            <span class="metric-label">Equilibrium:</span>
            <span class="metric-value">{{ formatCurrency(equilibriumAmount) }}/week</span>
          </div>
          <div v-if="weeksToEquilibrium > 0" class="metric">
            <span class="metric-label">Weeks remaining:</span>
            <span class="metric-value">{{ weeksToEquilibrium }} weeks</span>
          </div>
          <div v-else class="metric">
            <span class="metric-value status-success">✓ Equilibrium reached</span>
          </div>
        </div>
        <div class="action-link">
          View Details →
        </div>
      </router-link>

      <!-- Goals Column -->
      <router-link to="/goals" class="action-column">
        <div class="column-icon">🎯</div>
        <h4>Goals</h4>
        <div class="metrics">
          <div class="metric">
            <span class="metric-label">Active goals:</span>
            <span class="metric-value">{{ activeGoalsCount }} {{ activeGoalsCount === 1 ? 'goal' : 'goals' }}</span>
          </div>
          <div v-if="nextGoalCompletion" class="metric">
            <span class="metric-label">Next completion:</span>
            <span class="metric-value">{{ nextGoalCompletion }}</span>
          </div>
          <div v-else class="metric">
            <span class="metric-value">No active goals</span>
          </div>
        </div>
        <div class="action-link">
          View Details →
        </div>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useBudgetStore } from '@/stores/budget'

const budgetStore = useBudgetStore()

const loading = ref(true)
const equilibriumAmount = ref(0)
const weeksToEquilibrium = ref(0)

// Automation status
const automationStatus = computed(() => {
  const pendingTransfer = budgetStore.pendingActions.transfer
  const manualExpensesCount = budgetStore.pendingActions.manualExpenses?.length || 0

  if (pendingTransfer && pendingTransfer.missedWeeks > 0) {
    return `⚠️ ${pendingTransfer.missedWeeks} ${pendingTransfer.missedWeeks === 1 ? 'week' : 'weeks'} pending`
  }

  if (manualExpensesCount > 0) {
    return `⚠️ ${manualExpensesCount} manual ${manualExpensesCount === 1 ? 'payment' : 'payments'}`
  }

  return '✓ All current'
})

const automationStatusClass = computed(() => {
  if (automationStatus.value.includes('⚠️')) {
    return 'status-warning'
  }
  return 'status-success'
})

// Goals info
const activeGoalsCount = computed(() => {
  return budgetStore.accounts.filter(a => a.target && a.target > 0).length
})

const nextGoalCompletion = computed(() => {
  const goalsWithTarget = budgetStore.accounts.filter(a => a.target && a.target > 0)
  if (goalsWithTarget.length === 0) return null

  // Find the goal closest to completion (highest percentage)
  const sortedGoals = goalsWithTarget
    .map(g => ({
      name: g.name,
      progress: (g.balance || 0) / g.target
    }))
    .sort((a, b) => b.progress - a.progress)

  if (sortedGoals.length > 0) {
    return sortedGoals[0].name
  }
  return null
})

// Load planning data
async function loadPlanningData() {
  if (!budgetStore.hasCalculated) {
    loading.value = false
    return
  }

  try {
    const planData = await budgetStore.calculateCatchUpSchedule(52)
    equilibriumAmount.value = planData.equilibriumTransfer || 0
    weeksToEquilibrium.value = planData.equilibriumWeek > 0 ? planData.equilibriumWeek : 0
  } catch (error) {
    console.error('Failed to load planning data:', error)
  } finally {
    loading.value = false
  }
}

// Utility functions
function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-NZ', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })
}

function formatCurrency(amount) {
  if (typeof amount !== 'number') return '0.00'
  return amount.toFixed(2)
}

// Load data on mount and when budget changes
onMounted(loadPlanningData)
watch(() => budgetStore.hasCalculated, loadPlanningData, { immediate: true })
</script>

<style scoped>
.quick-actions-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  margin-top: 2rem;
}

.card-header {
  margin-bottom: 1.5rem;
}

.card-header h3 {
  font-size: 1.5rem;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.subtitle {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.action-column {
  padding: 1.5rem;
  background: var(--bg-secondary, #f8f9fa);
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  display: flex;
  flex-direction: column;
}

.action-column:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: var(--primary-teal, #14b8a6);
}

.column-icon {
  font-size: 2rem;
  margin-bottom: 0.75rem;
}

.action-column h4 {
  font-size: 1.125rem;
  color: var(--text-primary);
  margin: 0 0 0.75rem 0;
}

.status-indicator {
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 1rem;
  display: inline-block;
}

.status-success {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.status-warning {
  background: rgba(234, 179, 8, 0.1);
  color: #ca8a04;
}

.metrics {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.metric-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.metric-value {
  font-size: 0.875rem;
  color: var(--text-primary);
  font-weight: 600;
}

.metric-value.status-success {
  color: #22c55e;
}

.action-link {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-light, #e5e7eb);
  color: var(--primary-teal, #14b8a6);
  font-weight: 500;
  font-size: 0.875rem;
}

.action-column:hover .action-link {
  color: var(--primary-teal-dark, #0d9488);
}

@media (max-width: 768px) {
  .actions-grid {
    grid-template-columns: 1fr;
  }

  .quick-actions-card {
    padding: 1rem;
  }

  .action-column {
    padding: 1rem;
  }
}
</style>
