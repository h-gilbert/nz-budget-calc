<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <div class="header-content">
        <h1>Financial Dashboard</h1>
        <p class="subtitle">Your budget overview and expense planning</p>
      </div>
      <div class="header-actions">
        <button @click="navigateToCalculator" class="btn btn-secondary">
          ✏️ Edit Budget
        </button>
        <button @click="handleCalculate" class="btn btn-primary">
          📊 Calculate Budget
        </button>
      </div>
    </div>

    <div v-if="!budgetStore.hasCalculated" class="no-data-message">
      <div class="message-box">
        <h2>No Budget Data Available</h2>
        <p>Set up your income and expenses, then click "Calculate Budget" to see your dashboard.</p>
        <button @click="navigateToCalculator" class="btn btn-primary">
          Go to Budget Setup
        </button>
      </div>
    </div>

    <div v-else class="dashboard-content">
      <!-- Summary Cards Grid -->
      <div class="summary-grid">
        <IncomeCard />
        <ExpensesCard />
        <CashFlowCard />
      </div>

      <!-- Automation Dashboard -->
      <AutomationDashboard />

      <!-- Goal Timeline Planner Card -->
      <GoalTimelineCard />

      <!-- Transfer Planning Card -->
      <TransferPlanningCard />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useBudgetStore } from '@/stores/budget'
import { useUserStore } from '@/stores/user'
import { useNotificationStore } from '@/stores/notification'
import { budgetAPI } from '@/api/client'
import IncomeCard from '@/components/dashboard/IncomeCard.vue'
import ExpensesCard from '@/components/dashboard/ExpensesCard.vue'
import CashFlowCard from '@/components/dashboard/CashFlowCard.vue'
import GoalTimelineCard from '@/components/dashboard/GoalTimelineCard.vue'
import TransferPlanningCard from '@/components/dashboard/TransferPlanningCard.vue'
import AutomationDashboard from '@/components/dashboard/AutomationDashboard.vue'

const router = useRouter()
const budgetStore = useBudgetStore()
const userStore = useUserStore()
const notificationStore = useNotificationStore()

// Load default budget from backend
async function loadDefaultBudget() {
  if (!userStore.isAuthenticated) return

  try {
    const defaultBudget = await budgetAPI.load()
    if (defaultBudget) {
      budgetStore.loadBudgetData(defaultBudget)
      console.log('Loaded default budget from backend')
    }
  } catch (error) {
    console.error('Failed to load default budget:', error)
  }
}

// Auto-load and calculate on mount if authenticated
onMounted(async () => {
  if (userStore.isAuthenticated) {
    await loadDefaultBudget()
    // Auto-calculate after loading data if we have income data
    if (budgetStore.payAmount > 0 && !budgetStore.hasCalculated) {
      console.log('Auto-calculating on Dashboard mount...')
      handleCalculate()
    }
  }
})

// Watch for authentication changes and load data when user logs in
watch(() => userStore.isAuthenticated, async (isAuth) => {
  if (isAuth) {
    await loadDefaultBudget()
    if (budgetStore.payAmount > 0) {
      handleCalculate()
    }
  }
})

function navigateToCalculator() {
  router.push('/calculator')
}

async function handleCalculate() {
  try {
    // Load the latest budget data from backend before calculating
    if (userStore.isAuthenticated) {
      await loadDefaultBudget()
    }

    // Perform calculation
    budgetStore.calculate()

    // No notification needed - dashboard updates automatically
  } catch (error) {
    console.error('Calculation error:', error)
    notificationStore.error('Error calculating budget. Please check your inputs.')
  }
}
</script>

<style scoped>
.dashboard {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid #e9ecef;
}

.header-content h1 {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  color: #2c3e50;
}

.subtitle {
  margin: 0;
  color: #6c757d;
  font-size: 1.1rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #42b983;
  color: white;
}

.btn-primary:hover {
  background-color: #38a372;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(66, 185, 131, 0.3);
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #5a6268;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(108, 117, 125, 0.3);
}

.no-data-message {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.message-box {
  text-align: center;
  padding: 3rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.dashboard-content {
  animation: fadeIn 0.5s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.test-card {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
  font-size: 1.2rem;
  color: #6c757d;
}
</style>
