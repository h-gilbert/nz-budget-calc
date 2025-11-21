<template>
  <div class="goal-timeline-card">
    <div class="card-header">
      <div class="header-content">
        <h2>Goal Timeline Planner</h2>
        <p class="subtitle">Calculate how long it will take to reach your savings goals</p>
      </div>
    </div>

    <div class="card-body">
      <!-- Input Section -->
      <div class="input-section">
        <div class="surplus-input">
          <label for="weekly-surplus">Weekly Surplus Available:</label>
          <div class="input-group">
            <span class="currency">$</span>
            <input
              id="weekly-surplus"
              v-model.number="weeklySurplus"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              @keyup.enter="calculateTimeline"
            />
          </div>
          <small class="help-text">How much can you allocate weekly to reach your goals?</small>
        </div>
        <button
          class="btn btn-primary btn-calculate"
          :disabled="!weeklySurplus || weeklySurplus <= 0 || isCalculating"
          @click="calculateTimeline"
        >
          {{ isCalculating ? 'Calculating...' : 'Calculate Timeline' }}
        </button>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="error-message">
        <strong>Error:</strong> {{ error }}
      </div>

      <!-- Results Section -->
      <div v-if="timelineData" class="results-section">
        <!-- Insufficient Surplus Warning -->
        <div v-if="timelineData.summary && !timelineData.summary.canAffordGoals" class="warning-message">
          <strong>⚠️ No Surplus Available for Goals</strong>
          <p>You currently have no surplus cashflow available to allocate towards savings goals.</p>
          <p><strong>To reach your savings goals, you need to:</strong></p>
          <ul>
            <li>Increase your income</li>
            <li>Reduce your expenses</li>
            <li>Or both, to create positive cashflow</li>
          </ul>
        </div>

        <!-- Savings Goals Summary -->
        <div class="section goals-section">
          <h3>🎯 Savings Goals Progress</h3>
          <div v-if="timelineData.goalAccounts && timelineData.goalAccounts.length > 0" class="goals-grid">
            <div
              v-for="goal in timelineData.goalAccounts"
              :key="goal.accountId"
              class="goal-card"
            >
              <div class="goal-header">
                <h4>{{ goal.name }}</h4>
                <span v-if="goal.completed" class="goal-status completed">✓ Complete</span>
                <span v-else class="goal-status pending">In Progress</span>
              </div>

              <div class="goal-progress">
                <div class="progress-bar">
                  <div
                    class="progress-fill"
                    :class="getProgressClass(goal)"
                    :style="{ width: getProgressPercent(goal) + '%' }"
                  ></div>
                </div>
                <div class="progress-labels">
                  <span>${{ formatBalance(goal.currentBalance) }}</span>
                  <span class="progress-percent">{{ getProgressPercent(goal) }}%</span>
                  <span>${{ formatBalance(goal.targetBalance) }}</span>
                </div>
              </div>

              <div class="goal-details">
                <div class="detail-row">
                  <span class="detail-label">Remaining:</span>
                  <span class="detail-value">${{ formatBalance(goal.targetBalance - goal.currentBalance) }}</span>
                </div>
                <div v-if="goal.completionWeek" class="detail-row completion">
                  <span class="detail-label">Completion:</span>
                  <span class="detail-value">Week {{ goal.completionWeek }} ({{ formatDate(goal.completionDate) }})</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="no-goals">
            <p>No active savings goals found. Set target amounts for your accounts to see timeline projections.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useBudgetStore } from '@stores/budget'
import { budgetAPI } from '@/api/client'

const budgetStore = useBudgetStore()

const weeklySurplus = ref(null)
const timelineData = ref(null)
const isCalculating = ref(false)
const error = ref(null)

// Initialize with stored value
onMounted(() => {
  if (budgetStore.weeklySurplus && budgetStore.weeklySurplus > 0) {
    weeklySurplus.value = budgetStore.weeklySurplus
  }
})

async function calculateTimeline() {
  if (!weeklySurplus.value || weeklySurplus.value <= 0) {
    error.value = 'Please enter a valid weekly surplus amount'
    return
  }

  isCalculating.value = true
  error.value = null
  timelineData.value = null

  try {
    // Update and save the weekly surplus to the budget store
    budgetStore.weeklySurplus = weeklySurplus.value

    // Save to backend
    try {
      const budgetData = budgetStore.getBudgetData()
      await budgetAPI.save(budgetData)
    } catch (saveError) {
      console.error('Failed to save weekly surplus:', saveError)
      // Don't block the calculation if save fails
    }

    const result = await budgetStore.calculateGoalTimeline(weeklySurplus.value)
    timelineData.value = result
  } catch (err) {
    error.value = err.message || 'Failed to calculate timeline'
    console.error('Calculate timeline error:', err)
  } finally {
    isCalculating.value = false
  }
}

function formatBalance(amount) {
  return parseFloat(amount || 0).toFixed(2)
}

function formatDate(dateString) {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-NZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function getProgressPercent(goal) {
  if (!goal.targetBalance || goal.targetBalance === 0) return 0
  return Math.min(Math.round((goal.currentBalance / goal.targetBalance) * 100), 100)
}

function getProgressClass(goal) {
  const percent = getProgressPercent(goal)
  if (percent >= 100) return 'complete'
  if (percent >= 75) return 'high'
  if (percent >= 50) return 'medium'
  if (percent >= 25) return 'low'
  return 'very-low'
}
</script>

<style scoped>
.goal-timeline-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.card-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
}

.header-content h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.75rem;
}

.subtitle {
  margin: 0;
  opacity: 0.9;
  font-size: 1rem;
}

.card-body {
  padding: 2rem;
}

.input-section {
  display: flex;
  gap: 1.5rem;
  align-items: flex-end;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.surplus-input {
  flex: 1;
}

.surplus-input label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #333;
}

.input-group {
  position: relative;
  display: flex;
  align-items: center;
}

.currency {
  position: absolute;
  left: 1rem;
  color: #666;
  font-weight: 600;
  font-size: 1.125rem;
}

.surplus-input input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2rem;
  font-size: 1.125rem;
  border: 2px solid #ddd;
  border-radius: 6px;
  transition: border-color 0.2s;
}

.surplus-input input:focus {
  outline: none;
  border-color: #667eea;
}

.help-text {
  display: block;
  margin-top: 0.5rem;
  color: #666;
  font-size: 0.875rem;
}

.btn-calculate {
  padding: 0.75rem 2rem;
  white-space: nowrap;
}

.error-message {
  padding: 1rem;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 6px;
  color: #c33;
  margin-bottom: 1.5rem;
}

.warning-message {
  padding: 1.5rem;
  background: #fff3cd;
  border: 2px solid #ffc107;
  border-radius: 8px;
  color: #856404;
  margin-bottom: 1.5rem;
}

.warning-message strong {
  display: block;
  margin-bottom: 0.75rem;
  font-size: 1.125rem;
}

.warning-message ul {
  margin: 0.75rem 0 0 1.5rem;
}

.warning-message li {
  margin-bottom: 0.5rem;
}

.results-section {
  margin-top: 2rem;
}

.section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.section h3 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  color: #333;
}

.goals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.goal-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.25rem;
}

.goal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.goal-header h4 {
  margin: 0;
  font-size: 1.125rem;
  color: #333;
}

.goal-status {
  padding: 0.25rem 0.625rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.goal-status.completed {
  background: #d4edda;
  color: #155724;
}

.goal-status.pending {
  background: #e3f2fd;
  color: #1976d2;
}

.goal-progress {
  margin-bottom: 1rem;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s ease;
  border-radius: 4px;
}

.progress-fill.complete {
  background: linear-gradient(90deg, #26a69a, #00897b);
}

.progress-fill.high {
  background: linear-gradient(90deg, #66bb6a, #43a047);
}

.progress-fill.medium {
  background: linear-gradient(90deg, #fdd835, #fbc02d);
}

.progress-fill.low {
  background: linear-gradient(90deg, #ff9800, #f57c00);
}

.progress-fill.very-low {
  background: linear-gradient(90deg, #ef5350, #e53935);
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: #666;
}

.progress-percent {
  font-weight: 600;
  color: #333;
}

.goal-details {
  border-top: 1px solid #f0f0f0;
  padding-top: 0.75rem;
  margin-top: 0.75rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.detail-row.completion {
  color: #155724;
  font-weight: 600;
}

.detail-label {
  font-size: 0.875rem;
  color: #666;
}

.detail-value {
  font-size: 0.875rem;
  font-weight: 600;
}

.no-goals {
  text-align: center;
  padding: 2rem;
  color: #999;
}

.btn {
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #5568d3;
}

@media (max-width: 768px) {
  .input-section {
    flex-direction: column;
    align-items: stretch;
  }

  .btn-calculate {
    width: 100%;
  }

  .goals-grid {
    grid-template-columns: 1fr;
  }
}
</style>
