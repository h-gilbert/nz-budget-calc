<template>
  <div class="transfer-planning-card">
    <div class="card-header">
      <h3>Transfer Planning</h3>
      <p class="subtitle">Reach equilibrium with your expense account</p>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <div v-else-if="planData" class="card-content">
      <!-- Summary Section -->
      <div class="summary-section">
        <div class="summary-item">
          <span class="label">Starting Balance:</span>
          <span class="value">{{ formatCurrency(planData.startingBalance) }}</span>
        </div>
        <div v-if="planData.isWeekAhead" class="summary-item info">
          <span class="label">Safety Buffer Active:</span>
          <span class="value">1-Week Ahead</span>
          <small class="buffer-note">Transfers calculated to always keep next week's expenses (~{{ formatCurrency(planData.weekAheadBuffer) }}) ready</small>
        </div>
        <div class="summary-item">
          <span class="label">Starting Date:</span>
          <span class="value">{{ formatDate(planData.startingDate) }}</span>
        </div>
        <div class="summary-item highlight">
          <span class="label">Equilibrium Weekly Transfer:</span>
          <span class="value positive">{{ formatCurrency(planData.equilibriumTransfer) }}</span>
        </div>
        <div v-if="planData.equilibriumWeek" class="summary-item success">
          <span class="label">Equilibrium Reached:</span>
          <span class="value">Week {{ planData.equilibriumWeek }}</span>
        </div>
        <div v-else class="summary-item warning">
          <span class="label">Status:</span>
          <span class="value">More weeks needed to reach equilibrium</span>
        </div>
      </div>

      <!-- Transfer Schedule Table -->
      <div class="schedule-section">
        <h4>Transfer Schedule (First {{ displayWeeks }} Weeks)</h4>
        <div class="schedule-controls">
          <span class="control-label">Show weeks:</span>
          <div class="week-selector">
            <button
              v-for="option in weekOptions"
              :key="option.value"
              @click="displayWeeks = option.value"
              :class="['week-option', { 'active': displayWeeks === option.value }]"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
        <div class="table-container">
          <table class="schedule-table">
            <thead>
              <tr>
                <th class="col-expand"></th>
                <th>Week</th>
                <th>Date</th>
                <th>Items</th>
                <th>Expenses Due</th>
                <th>Transfer Amount</th>
                <th>Catch-up Extra</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="week in displayedSchedule" :key="week.weekNumber">
                <tr
                  :class="{ 'equilibrium-reached': week.isEquilibrium, 'has-expenses': week.expenseDetails && week.expenseDetails.length > 0, 'main-row': true }"
                  @click="toggleExpand(week.weekNumber)"
                >
                  <td class="col-expand">
                    <span v-if="week.expenseDetails && week.expenseDetails.length > 0" class="expand-icon">
                      {{ expandedRows.has(week.weekNumber) ? '▼' : '▶' }}
                    </span>
                  </td>
                  <td>{{ week.weekNumber }}</td>
                  <td>{{ formatDate(week.weekDate) }}</td>
                  <td class="col-items">{{ week.expenseDetails ? week.expenseDetails.length : 0 }}</td>
                  <td>{{ formatCurrency(week.expensesDue) }}</td>
                  <td class="transfer-amount">
                    {{ formatCurrency(week.transferAmount) }}
                  </td>
                  <td>
                    <span v-if="week.catchUpAmount > 0" class="catch-up-badge">
                      +{{ formatCurrency(week.catchUpAmount) }}
                    </span>
                    <span v-else class="equilibrium-badge">-</span>
                  </td>
                  <td>
                    <span v-if="week.isEquilibrium" class="status-badge success">Equilibrium</span>
                    <span v-else class="status-badge warning">Catching up</span>
                  </td>
                </tr>
                <tr v-if="expandedRows.has(week.weekNumber)" class="detail-row">
                  <td colspan="8">
                    <!-- Show sub-account fund distribution if available -->
                    <div v-if="week.subAccountDistribution && week.subAccountDistribution.length > 0" class="subaccount-distribution">
                      <h4>Transfer Distribution to Sub-Accounts:</h4>
                      <div class="distribution-grid">
                        <div
                          v-for="(dist, idx) in week.subAccountDistribution"
                          :key="idx"
                          class="distribution-card"
                        >
                          <div class="dist-header">
                            <span class="dist-name">{{ dist.subAccountName }}</span>
                            <span class="dist-amount">{{ formatCurrency(dist.transferAmount) }}</span>
                          </div>
                          <div class="dist-details">
                            <div class="dist-stat">
                              <span>Expenses:</span>
                              <span>{{ formatCurrency(dist.expenses) }}</span>
                            </div>
                            <div class="dist-stat">
                              <span>Current:</span>
                              <span :class="{'text-warning': dist.currentBalance < dist.required, 'text-danger': dist.currentBalance < 0}">
                                {{ formatCurrency(dist.currentBalance) }}
                              </span>
                            </div>
                            <div class="dist-stat">
                              <span>After Transfer:</span>
                              <span class="text-success">{{ formatCurrency(dist.balanceAfter) }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="distribution-total">
                        <span>Total Distribution:</span>
                        <span class="total-amount">{{ formatCurrency(week.transferAmount) }}</span>
                      </div>
                    </div>

                    <!-- Fallback to expenses view if no sub-accounts -->
                    <div v-else-if="week.expenseDetails && week.expenseDetails.length > 0" class="expense-details">
                      <h4>Expenses Due This Week:</h4>
                      <ul>
                        <li v-for="(expense, expenseIndex) in week.expenseDetails" :key="expenseIndex">
                          <span class="expense-name">{{ expense.name }}</span>
                          <span class="expense-amount">{{ formatCurrency(expense.amount) }}</span>
                          <span class="expense-frequency">({{ expense.frequency }})</span>
                        </li>
                      </ul>
                    </div>

                    <div v-else class="no-details">
                      No expenses or distribution details for this week
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Info Box -->
      <div class="info-box">
        <p><strong>How it works:</strong></p>
        <ul>
          <li>Transfer the specified amount each week to your expense account</li>
          <li>During catch-up phase, you'll transfer more than equilibrium to build reserves</li>
          <li>Once equilibrium is reached, transfer the same amount each week</li>
          <li>Transfers are capped at your take-home pay ({{ formatCurrency(planData.maxTransfer) }}/week)</li>
        </ul>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>Configure an expense account with a starting balance to see your transfer plan.</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useBudgetStore } from '@/stores/budget'

const budgetStore = useBudgetStore()
const displayWeeks = ref(8)
const planData = ref(null)
const expandedRows = ref(new Set())

const weekOptions = [
  { value: 4, label: '4w' },
  { value: 8, label: '8w' },
  { value: 12, label: '12w' },
  { value: 26, label: '26w' },
  { value: 52, label: '52w' },
  { value: 104, label: '104w' }
]

async function loadPlanData() {
  if (!budgetStore.hasCalculated) {
    planData.value = null
    return
  }

  const expenseAccount = budgetStore.accounts.find(a => a.isExpenseAccount)
  if (!expenseAccount) {
    planData.value = null
    return
  }

  // Check if balance exists (it can be 0, which is valid)
  if (expenseAccount.balance === null || expenseAccount.balance === undefined) {
    planData.value = null
    return
  }

  try {
    planData.value = await budgetStore.calculateCatchUpSchedule(52)
  } catch (err) {
    console.error('Error calculating catch-up schedule:', err)
    planData.value = null
  }
}

// Watch for changes and reload
watch(() => budgetStore.hasCalculated, loadPlanData, { immediate: true })

const error = computed(() => {
  if (planData.value && planData.value.error) {
    return planData.value.error
  }
  return null
})

const displayedSchedule = computed(() => {
  if (!planData.value || !planData.value.schedule) return []
  return planData.value.schedule.slice(0, displayWeeks.value)
})

function toggleExpand(weekNumber) {
  if (expandedRows.value.has(weekNumber)) {
    expandedRows.value.delete(weekNumber)
  } else {
    expandedRows.value.add(weekNumber)
  }
}

// Clear expanded rows when displayWeeks changes
watch(displayWeeks, () => {
  expandedRows.value.clear()
})

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}
</script>

<style scoped>
.transfer-planning-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
}

.card-header {
  margin-bottom: 1.5rem;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 1rem;
}

.card-header h3 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
  font-size: 1.5rem;
}

.subtitle {
  margin: 0;
  color: #6c757d;
  font-size: 0.9rem;
}

.error-message {
  background: #fff3cd;
  border: 1px solid #ffc107;
  color: #856404;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.summary-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 6px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.summary-item .label {
  font-size: 0.85rem;
  color: #6c757d;
  font-weight: 500;
}

.summary-item .value {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2c3e50;
}

.summary-item.highlight {
  background: #e3f2fd;
  padding: 0.75rem;
  border-radius: 4px;
  border: 2px solid #2196f3;
}

.summary-item.highlight .value {
  font-size: 1.3rem;
  color: #1976d2;
}

.summary-item.success {
  background: #d4edda;
  padding: 0.75rem;
  border-radius: 4px;
}

.summary-item.success .value {
  color: #28a745;
}

.summary-item.warning {
  background: #fff3cd;
  padding: 0.75rem;
  border-radius: 4px;
}

.summary-item.warning .value {
  color: #856404;
}

.summary-item.info {
  background: #e7f3ff;
  padding: 0.75rem;
  border-radius: 4px;
  border: 1px solid #2196f3;
}

.summary-item.info .value {
  color: #1976d2;
  font-weight: 600;
}

.buffer-note {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #6c757d;
  font-style: italic;
}

.value.positive {
  color: #28a745;
}

.schedule-section {
  margin-bottom: 1.5rem;
}

.schedule-section h4 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
}

.schedule-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.control-label {
  font-size: 0.95rem;
  font-weight: 500;
  color: #495057;
}

.week-selector {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.week-option {
  padding: 0.5rem 1rem;
  border: 2px solid #dee2e6;
  background: white;
  color: #495057;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 60px;
}

.week-option:hover {
  border-color: #42b983;
  color: #42b983;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(66, 185, 131, 0.2);
}

.week-option.active {
  background: #42b983;
  border-color: #42b983;
  color: white;
  box-shadow: 0 2px 6px rgba(66, 185, 131, 0.3);
}

.week-option.active:hover {
  background: #38a372;
  border-color: #38a372;
}

.table-container {
  overflow-x: auto;
}

.schedule-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.schedule-table th {
  background: #f8f9fa;
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: #495057;
  border-bottom: 2px solid #dee2e6;
}

.schedule-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #dee2e6;
}

.schedule-table tr.main-row {
  transition: background-color 0.15s ease;
}

.schedule-table tr.main-row.has-expenses {
  cursor: pointer;
}

.schedule-table tr.main-row:hover {
  background: #f8f9fa;
}

.schedule-table tr.equilibrium-reached {
  background: #d4edda;
}

.schedule-table tr.equilibrium-reached:hover {
  background: #c3e6cb;
}

.col-expand {
  width: 50px;
  text-align: center;
  padding-left: 1rem !important;
}

.expand-icon {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: bold;
}

.col-items {
  text-align: center;
  font-weight: 600;
}

.detail-row {
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

.expense-details {
  padding: 1rem 2rem;
}

.expense-details h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.95rem;
  color: #495057;
}

.expense-details ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.expense-details li {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e9ecef;
}

.expense-details li:last-child {
  border-bottom: none;
}

.expense-name {
  flex: 1;
  font-weight: 500;
  color: #212529;
}

.expense-amount {
  margin-left: 1rem;
  font-weight: 600;
  color: #495057;
}

.expense-frequency {
  margin-left: 0.5rem;
  color: #6c757d;
  font-size: 0.875rem;
  font-style: italic;
}

/* Sub-Account Distribution Styles */
.subaccount-distribution {
  padding: 1.5rem 2rem;
}

.subaccount-distribution h4 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: #374151;
  font-weight: 600;
}

.distribution-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.distribution-card {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s;
}

.distribution-card:hover {
  border-color: #2dd4bf;
  box-shadow: 0 2px 8px rgba(45, 212, 191, 0.15);
}

.dist-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.75rem;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}

.dist-name {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.9rem;
}

.dist-amount {
  font-size: 1.1rem;
  font-weight: 700;
  color: #059669;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
}

.dist-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dist-stat {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.dist-stat span:first-child {
  color: #6b7280;
}

.dist-stat span:last-child {
  font-weight: 600;
  color: #374151;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
}

.distribution-total {
  display: flex;
  justify-content: space-between;
  padding: 1rem;
  background: #f0fdf4;
  border-radius: 8px;
  border: 1px solid #86efac;
  font-weight: 600;
  margin-top: 1rem;
}

.total-amount {
  font-size: 1.2rem;
  color: #059669;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
}

.no-details {
  padding: 2rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.875rem;
  font-style: italic;
}

.text-success {
  color: #10b981 !important;
}

.text-warning {
  color: #f59e0b !important;
}

.text-danger {
  color: #ef4444 !important;
}

.transfer-amount {
  font-weight: 600;
  color: #2c3e50;
}

.catch-up-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: #fff3cd;
  color: #856404;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.85rem;
}

.equilibrium-badge {
  color: #6c757d;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
  font-size: 0.85rem;
}

.status-badge.success {
  background: #d4edda;
  color: #155724;
}

.status-badge.warning {
  background: #fff3cd;
  color: #856404;
}

.info-box {
  background: #e7f3ff;
  border-left: 4px solid #2196f3;
  padding: 1rem;
  border-radius: 4px;
  font-size: 0.9rem;
}

.info-box p {
  margin: 0 0 0.5rem 0;
}

.info-box ul {
  margin: 0;
  padding-left: 1.5rem;
}

.info-box li {
  margin-bottom: 0.25rem;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #6c757d;
}

.empty-state p {
  margin: 0;
  font-size: 1rem;
}
</style>
