<template>
  <div class="expense-account-table">
    <div class="table-header">
      <h3>Expense Account Planning</h3>
      <div class="controls">
        <label for="projection-period">Show next:</label>
        <select
          id="projection-period"
          v-model="projectionWeeks"
          class="period-selector"
        >
          <option :value="4">4 weeks</option>
          <option :value="8">8 weeks</option>
          <option :value="12">12 weeks (3 months)</option>
          <option :value="26">26 weeks (6 months)</option>
          <option :value="52">52 weeks (1 year)</option>
        </select>
      </div>
    </div>

    <div v-if="!expenseAccount" class="no-account-warning">
      <p>⚠️ No expense account configured. Please set up an expense account in Budget Setup.</p>
    </div>

    <div v-else class="table-container">
      <table class="requirements-table">
        <thead>
          <tr>
            <th class="col-expand"></th>
            <th class="col-week">Week</th>
            <th class="col-date">Starting</th>
            <th class="col-expenses-due">Items</th>
            <th class="col-total">Required</th>
            <th class="col-transfer">Transfer Needed</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(week, index) in weeklyData" :key="index">
            <tr
              :class="getRowClass(week)"
              @click="toggleExpand(index)"
              class="main-row"
            >
              <td class="col-expand">
                <span v-if="week.expensesDue.length > 0" class="expand-icon">
                  {{ expandedRows.has(index) ? '▼' : '▶' }}
                </span>
              </td>
              <td class="col-week">{{ week.weekNumber }}</td>
              <td class="col-date">{{ formatDate(week.startDate) }}</td>
              <td class="col-expenses-due">{{ week.expensesDue.length }}</td>
              <td class="col-total">{{ formatCurrency(week.totalExpensesDue) }}</td>
              <td class="col-transfer">
                {{ week.recommendedTransfer ? formatCurrency(week.recommendedTransfer) : '-' }}
              </td>
            </tr>
            <tr v-if="expandedRows.has(index)" class="detail-row">
              <td colspan="6">
                <!-- Show sub-account breakdown if available -->
                <div v-if="week.subAccounts && week.subAccounts.length > 0" class="subaccount-breakdown">
                  <h4>Sub-Account Breakdown:</h4>
                  <div class="subaccount-grid">
                    <div
                      v-for="(subAcc, subIdx) in week.subAccounts"
                      :key="subIdx"
                      class="subaccount-card"
                      :class="{ 'has-warning': subAcc.transferNeeded > 0 }"
                    >
                      <div class="subaccount-header">
                        <h5>{{ subAcc.subAccountName }}</h5>
                        <span class="subaccount-balance" :class="getBalanceClass({ isNegative: subAcc.currentBalance < 0, isLow: subAcc.currentBalance < subAcc.total })">
                          {{ formatCurrency(subAcc.currentBalance) }}
                        </span>
                      </div>
                      <div class="subaccount-stats">
                        <div class="stat">
                          <span class="label">Expenses:</span>
                          <span class="value">{{ formatCurrency(subAcc.total) }}</span>
                        </div>
                        <div class="stat">
                          <span class="label">Required:</span>
                          <span class="value">{{ formatCurrency(subAcc.requiredBalance) }}</span>
                        </div>
                        <div v-if="subAcc.transferNeeded > 0" class="stat transfer-stat">
                          <span class="label">Transfer:</span>
                          <span class="value transfer-amount">{{ formatCurrency(subAcc.transferNeeded) }}</span>
                        </div>
                      </div>
                      <div v-if="subAcc.expenses && subAcc.expenses.length > 0" class="subaccount-expenses">
                        <details>
                          <summary>{{ subAcc.expenses.length }} expense(s)</summary>
                          <ul>
                            <li v-for="(exp, expIdx) in subAcc.expenses" :key="expIdx">
                              <span>{{ exp.name }}</span>
                              <span>{{ formatCurrency(exp.amount) }}</span>
                            </li>
                          </ul>
                        </details>
                      </div>
                    </div>
                  </div>
                  <div v-if="week.unallocatedExpenses && week.unallocatedExpenses.length > 0" class="unallocated-warning">
                    <strong>⚠️ Unassigned expenses:</strong> {{ week.unallocatedExpenses.length }} expense(s) not assigned to any sub-account
                  </div>
                </div>

                <!-- Fallback to old view if no sub-accounts -->
                <div v-else-if="week.expensesDue && week.expensesDue.length > 0" class="expense-details">
                  <h4>Expenses Due This Week:</h4>
                  <ul>
                    <li v-for="(expense, expenseIndex) in week.expensesDue" :key="expenseIndex">
                      <span class="expense-name">{{ expense.name }}</span>
                      <span class="expense-amount">{{ formatCurrency(expense.amount) }}</span>
                      <span class="expense-frequency">({{ expense.frequency }})</span>
                    </li>
                  </ul>
                </div>

                <div v-else class="no-expenses">
                  No expenses due this week
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>

      <div v-if="weeklyData.length === 0" class="no-data">
        <p>No expense data available. Add expenses in the calculator to see your weekly requirements.</p>
      </div>
    </div>

    <div v-if="hasNegativeBalance" class="warning-box">
      <strong>⚠️ Warning:</strong> Your expense account balance will go negative in some weeks.
      Consider adjusting your budget or increasing transfers to your expense account.
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useBudgetStore } from '@/stores/budget'

const budgetStore = useBudgetStore()

const projectionWeeks = ref(12) // Default to 12 weeks
const expandedRows = ref(new Set())

// Get expense account
const expenseAccount = computed(() => {
  return budgetStore.accounts.find(a => a.isExpenseAccount)
})

// Calculate weekly requirements
const weeklyData = ref([])

async function loadWeeklyData() {
  weeklyData.value = await budgetStore.calculateWeeklyRequirements(projectionWeeks.value)
}

// Watch for changes and reload
watch(projectionWeeks, loadWeeklyData, { immediate: true })

// Check if any weeks have negative balance
const hasNegativeBalance = computed(() => {
  return weeklyData.value.some(week => week.isNegative)
})

// Toggle row expansion
function toggleExpand(index) {
  if (weeklyData.value[index].expensesDue.length === 0) return

  if (expandedRows.value.has(index)) {
    expandedRows.value.delete(index)
  } else {
    expandedRows.value.add(index)
  }
}

// Get row CSS class based on week status
function getRowClass(week) {
  const classes = []
  if (week.isNegative) classes.push('negative-balance')
  else if (week.isLow) classes.push('low-balance')
  if (week.expensesDue.length > 0) classes.push('has-expenses')
  return classes.join(' ')
}

// Get balance cell CSS class
function getBalanceClass(week) {
  if (week.isNegative) return 'text-danger'
  if (week.isLow) return 'text-warning'
  return 'text-success'
}

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

// Clear expanded rows when projection period changes
watch(projectionWeeks, () => {
  expandedRows.value.clear()
})
</script>

<style scoped>
.expense-account-table {
  margin: 2rem 0;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.table-header h3 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #2c3e50;
}

.controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.controls label {
  font-weight: 500;
  color: #555;
  font-size: 0.95rem;
}

.period-selector {
  padding: 0.625rem 1.25rem;
  border: 1.5px solid #ddd;
  border-radius: 6px;
  font-size: 0.95rem;
  background-color: white;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.period-selector:hover {
  border-color: #42b983;
  background-color: #f8fffe;
}

.period-selector:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.1);
}

.no-account-warning {
  padding: 1.25rem;
  background-color: #fff3cd;
  border-left: 4px solid #ffc107;
  border-radius: 6px;
  color: #856404;
  font-weight: 500;
}

.table-container {
  overflow-x: auto;
  border-radius: 10px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e7eb;
}

.requirements-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background-color: white;
}

.requirements-table thead {
  background: linear-gradient(to bottom, #f8f9fa, #e9ecef);
  border-bottom: 2px solid #cbd5e0;
}

.requirements-table th {
  padding: 1.125rem 1.25rem;
  text-align: left;
  font-weight: 700;
  color: #1a202c;
  font-size: 0.8125rem;
  text-transform: uppercase;
  letter-spacing: 0.75px;
  white-space: nowrap;
  border-right: 1px solid #cbd5e0;
}

.requirements-table th:last-child {
  border-right: none;
}

.requirements-table tbody tr.main-row {
  transition: background-color 0.15s ease;
}

.requirements-table tbody tr.main-row:nth-child(4n+1),
.requirements-table tbody tr.main-row:nth-child(4n+2) {
  background-color: #ffffff;
}

.requirements-table tbody tr.main-row:nth-child(4n+3),
.requirements-table tbody tr.main-row:nth-child(4n+4) {
  background-color: #f9fafb;
}

.requirements-table tbody tr.main-row.has-expenses {
  cursor: pointer;
}

.requirements-table tbody tr.main-row.negative-balance {
  background-color: #fef2f2 !important;
  border-left: 4px solid #ef4444;
}

.requirements-table tbody tr.main-row.low-balance {
  background-color: #fffbeb !important;
  border-left: 4px solid #f59e0b;
}

/* Hover must come AFTER all other background rules to override them */
.requirements-table tbody tr.main-row:hover {
  background-color: #a5f3fc !important;
}

.requirements-table td {
  padding: 1rem 1.25rem;
  font-size: 0.9375rem;
  border-bottom: 1px solid #f1f3f5;
  border-right: 1px solid #e5e7eb;
  color: #374151;
}

.requirements-table td:last-child {
  border-right: none;
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

.col-week {
  width: 100px;
  font-weight: 600;
  font-size: 1rem;
  color: #1f2937;
  text-align: center;
}

.requirements-table th.col-week {
  text-align: center;
}

.col-date {
  width: 160px;
  color: #4b5563;
  text-align: left;
}

.requirements-table th.col-date {
  text-align: left;
}

.col-expenses-due {
  width: 100px;
  text-align: center;
  font-weight: 600;
  font-size: 1rem;
}

.requirements-table th.col-expenses-due {
  text-align: center;
}

.col-total {
  text-align: right;
  font-weight: 600;
  font-size: 1rem;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
  color: #374151;
  width: 150px;
}

.requirements-table th.col-total {
  text-align: right;
}

.col-transfer {
  text-align: right;
  font-weight: 600;
  font-size: 1rem;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
  color: #42b983;
  width: 180px;
}

.requirements-table th.col-transfer {
  text-align: right;
}

.text-success {
  color: #10b981 !important;
}

.text-warning {
  color: #f59e0b !important;
  font-weight: 700;
  background-color: #fffbeb;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.text-danger {
  color: #ef4444 !important;
  font-weight: 700;
  background-color: #fef2f2;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.detail-row {
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

/* Sub-Account Breakdown Styles */
.subaccount-breakdown {
  padding: 1.5rem 2rem;
}

.subaccount-breakdown h4 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: #374151;
  font-weight: 600;
}

.subaccount-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.subaccount-card {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s;
}

.subaccount-card.has-warning {
  border-color: #fbbf24;
  background: #fffbeb;
}

.subaccount-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}

.subaccount-header h5 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #1f2937;
}

.subaccount-balance {
  font-size: 1rem;
  font-weight: 700;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
}

.subaccount-stats {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.subaccount-stats .stat {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.subaccount-stats .stat .label {
  color: #6b7280;
}

.subaccount-stats .stat .value {
  font-weight: 600;
  color: #374151;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
}

.subaccount-stats .transfer-stat {
  background: #ecfdf5;
  padding: 0.5rem;
  border-radius: 4px;
  margin-top: 0.25rem;
}

.subaccount-stats .transfer-amount {
  color: #059669;
  font-weight: 700;
}

.subaccount-expenses details {
  margin-top: 0.5rem;
  cursor: pointer;
}

.subaccount-expenses summary {
  font-size: 0.875rem;
  color: #6b7280;
  padding: 0.5rem;
  background: #f9fafb;
  border-radius: 4px;
  user-select: none;
}

.subaccount-expenses summary:hover {
  background: #f3f4f6;
}

.subaccount-expenses ul {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 0 0;
}

.subaccount-expenses li {
  display: flex;
  justify-content: space-between;
  padding: 0.375rem 0.5rem;
  font-size: 0.8125rem;
  border-bottom: 1px solid #f3f4f6;
}

.subaccount-expenses li:last-child {
  border-bottom: none;
}

.unallocated-warning {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: #fff3cd;
  border-left: 4px solid #ffc107;
  border-radius: 4px;
  font-size: 0.875rem;
  color: #856404;
}

.no-expenses {
  padding: 2rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.875rem;
  font-style: italic;
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

.no-data {
  padding: 3rem;
  text-align: center;
  color: #6c757d;
}

.warning-box {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  color: #856404;
}

.warning-box strong {
  color: #e63900;
}

@media (max-width: 768px) {
  .table-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .requirements-table {
    font-size: 0.875rem;
  }

  .requirements-table th,
  .requirements-table td {
    padding: 0.5rem;
  }

  .col-date,
  .col-transfer {
    display: none;
  }
}
</style>
