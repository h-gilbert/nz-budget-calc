<template>
  <div class="automation-dashboard">
    <div class="card-header">
      <h3>Automation</h3>
      <p class="subtitle">Automatic transfers and expense payments</p>
    </div>

    <div v-if="loading" class="loading-state">
      Loading automation status...
    </div>

    <div v-else class="card-content">
      <!-- Global Toggles -->
      <div class="automation-toggles">
        <label class="toggle-item">
          <input
            type="checkbox"
            :checked="budgetStore.automationState.autoTransferEnabled"
            @change="handleToggleAutoTransfer($event.target.checked)"
          />
          <span class="toggle-label">
            <strong>Auto Weekly Transfers</strong>
            <small>Automatically allocate equilibrium transfers on Monday</small>
          </span>
        </label>
        <label class="toggle-item">
          <input
            type="checkbox"
            :checked="budgetStore.automationState.autoExpenseEnabled"
            @change="handleToggleAutoExpense($event.target.checked)"
          />
          <span class="toggle-label">
            <strong>Auto Expense Payments</strong>
            <small>Automatically deduct expenses when due</small>
          </span>
        </label>
      </div>

      <!-- Pending Transfer -->
      <div v-if="budgetStore.pendingActions.transfer" class="pending-transfer-compact">
        <div class="transfer-info">
          <span class="transfer-label">Weekly Transfer Due</span>
          <span class="transfer-date">{{ formatDate(budgetStore.pendingActions.transfer.weekDate) }}</span>
          <span v-if="budgetStore.pendingActions.transfer.missedWeeks > 1" class="missed-badge">
            {{ budgetStore.pendingActions.transfer.missedWeeks }} weeks
          </span>
        </div>
        <div class="transfer-action">
          <span class="transfer-amount">{{ formatCurrency(budgetStore.pendingActions.transfer.equilibriumAmount) }}</span>
          <button class="btn btn-primary btn-sm" @click="processTransfer" :disabled="processing">
            Process
          </button>
        </div>
      </div>

      <!-- Manual Expenses Awaiting Confirmation -->
      <div v-if="manualExpenses.length > 0" class="manual-expenses-section">
        <h4>Manual Payments</h4>
        <p class="section-hint">Expenses with auto-pay disabled - confirm when paid</p>
        <div class="manual-expenses-list">
          <div
            v-for="expense in manualExpenses"
            :key="expense.expenseId"
            class="manual-expense-row"
            :class="{ 'has-deficit': expense.willGoNegative, 'past-due': expense.isPastDue }"
          >
            <div class="expense-info">
              <span class="expense-name">{{ expense.expenseName }}</span>
              <span class="expense-due">Due {{ formatDate(expense.dueDate) }}</span>
            </div>
            <div class="expense-amounts">
              <span class="expense-balance" :class="{ 'negative': expense.willGoNegative }">
                {{ formatCurrency(expense.subAccountBalance) }} saved
              </span>
              <span class="expense-total">{{ formatCurrency(expense.amount) }}</span>
            </div>
            <div class="expense-actions">
              <button class="btn btn-primary btn-xs" @click="processExpense(expense)" :disabled="processing">
                Paid
              </button>
              <button class="btn btn-ghost btn-xs" @click="skipExpense(expense)" :disabled="processing">
                Skip
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- No Pending Actions -->
      <div v-if="!budgetStore.pendingActions.transfer && manualExpenses.length === 0" class="no-pending">
        <div class="no-pending-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <p>All caught up! No pending actions.</p>
        <small v-if="budgetStore.automationState.lastTransferDate">
          Last transfer: {{ formatDate(budgetStore.automationState.lastTransferDate) }}
        </small>
      </div>

      <!-- Recent Payments -->
      <div v-if="budgetStore.recentPayments.length > 0" class="recent-section">
        <h4>Recent Payments</h4>
        <div class="payments-list">
          <div
            v-for="payment in budgetStore.recentPayments.slice(0, 10)"
            :key="payment.id"
            class="payment-item"
            :class="{ 'skipped': payment.paymentType === 'skipped', 'negative': payment.wentNegative }"
          >
            <div class="payment-info">
              <span class="payment-name">{{ payment.expenseName }}</span>
              <span class="payment-date">{{ formatDate(payment.dueDate) }}</span>
            </div>
            <div class="payment-amount">
              <span v-if="payment.paymentType === 'skipped'" class="skipped-badge">Skipped</span>
              <span v-else>{{ formatCurrency(payment.amountPaid) }}</span>
              <span v-if="payment.wentNegative" class="negative-indicator" title="Balance went negative">!</span>
            </div>
            <span class="payment-type-badge" :class="payment.paymentType">
              {{ payment.paymentType }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useBudgetStore } from '@/stores/budget'

const budgetStore = useBudgetStore()
const loading = ref(true)
const processing = ref(false)

// Filter for manual expenses only (ones that require user confirmation)
const manualExpenses = computed(() => {
  return budgetStore.pendingActions.expenses.filter(e => e.isManual)
})

// Format currency
function formatCurrency(value) {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD'
  }).format(value || 0)
}

// Format date
function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-NZ', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })
}

// Load automation data and auto-process if enabled
async function loadData() {
  loading.value = true
  try {
    await budgetStore.loadAutomationState()
    await budgetStore.checkPendingActions()

    // Auto-process transfer if enabled and pending
    if (budgetStore.automationState.autoTransferEnabled && budgetStore.pendingActions.transfer) {
      console.log('Auto-processing weekly transfer...')
      await processTransfer()
    }

    // Auto-process expenses if enabled and pending
    if (budgetStore.automationState.autoExpenseEnabled && budgetStore.pendingActions.expenses.length > 0) {
      console.log('Auto-processing ' + budgetStore.pendingActions.expenses.length + ' pending expenses...')
      await autoProcessAllExpenses()
    }

    await budgetStore.loadPaymentHistory({ limit: 10 })
  } catch (error) {
    console.error('Error loading automation data:', error)
  } finally {
    loading.value = false
  }
}

// Toggle handlers
async function handleToggleAutoTransfer(enabled) {
  await budgetStore.toggleAutoTransfer(enabled)
}

async function handleToggleAutoExpense(enabled) {
  await budgetStore.toggleAutoExpense(enabled)
}

// Process single transfer (includes catch-up if needed)
async function processTransfer() {
  processing.value = true
  try {
    const equilibrium = budgetStore.totalExpenses

    // Calculate catch-up amount needed
    const catchUpSchedule = await budgetStore.calculateCatchUpSchedule(52)
    let transferAmount = equilibrium

    if (catchUpSchedule && catchUpSchedule.schedule && catchUpSchedule.schedule.length > 0) {
      // Use the first week's recommended transfer (includes catch-up)
      const firstWeek = catchUpSchedule.schedule[0]
      if (firstWeek && firstWeek.transferAmount > equilibrium) {
        transferAmount = firstWeek.transferAmount
        console.log('Catch-up transfer: $' + transferAmount.toFixed(2) + ' (equilibrium $' + equilibrium.toFixed(2) + ' + catch-up $' + (transferAmount - equilibrium).toFixed(2) + ')')
      }
    }

    budgetStore.autoAllocateTransfer(transferAmount)
    await budgetStore.updateAutomationState({
      lastTransferDate: new Date().toISOString().split('T')[0]
    })
    await budgetStore.checkPendingActions()
  } catch (error) {
    console.error('Error processing transfer:', error)
  } finally {
    processing.value = false
  }
}

// Process single expense
async function processExpense(expense) {
  processing.value = true
  try {
    await budgetStore.processExpensePayment(expense.expenseId, {
      dueDate: expense.dueDate,
      paymentType: 'manual'
    })
    await budgetStore.checkPendingActions()
    await budgetStore.loadPaymentHistory({ limit: 10 })
  } catch (error) {
    console.error('Error processing expense:', error)
  } finally {
    processing.value = false
  }
}

// Auto-process only auto-pay expenses (not manual ones)
async function autoProcessAllExpenses() {
  processing.value = true
  try {
    const pendingExpenses = [...budgetStore.pendingActions.expenses]
    // Only auto-process expenses that are NOT marked as manual
    const autoPayExpenses = pendingExpenses.filter(e => !e.isManual)

    if (autoPayExpenses.length > 0) {
      console.log('Auto-paying ' + autoPayExpenses.length + ' expenses (skipping ' + (pendingExpenses.length - autoPayExpenses.length) + ' manual)...')
      for (const expense of autoPayExpenses) {
        console.log('Auto-paying: ' + expense.name + ' ($' + expense.amount + ') due ' + expense.dueDate)
        await budgetStore.processExpensePayment(expense.expenseId, {
          dueDate: expense.dueDate,
          paymentType: 'automatic'
        })
      }
    }
    // Update last expense check date to today
    await budgetStore.updateAutomationState({
      lastExpenseCheckDate: new Date().toISOString().split('T')[0]
    })
    await budgetStore.checkPendingActions()
    await budgetStore.loadPaymentHistory({ limit: 10 })
  } catch (error) {
    console.error('Error auto-processing expenses:', error)
  } finally {
    processing.value = false
  }
}

// Skip expense
async function skipExpense(expense) {
  try {
    await budgetStore.skipExpensePayment(expense.expenseId, 'Manually skipped')
    await budgetStore.checkPendingActions()
    await budgetStore.loadPaymentHistory({ limit: 10 })
  } catch (error) {
    console.error('Error skipping expense:', error)
  }
}

// Process all pending actions
async function processAll() {
  processing.value = true
  try {
    await budgetStore.processAutomation()
    await budgetStore.loadPaymentHistory({ limit: 10 })
  } catch (error) {
    console.error('Error processing automation:', error)
  } finally {
    processing.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.automation-dashboard {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid var(--border-color);
}

.card-header {
  margin-bottom: 1.5rem;
}

.card-header h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.card-header .subtitle {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.loading-state {
  padding: 2rem;
  text-align: center;
  color: var(--text-secondary);
}

/* Toggles */
.automation-toggles {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 12px;
  margin-bottom: 1.5rem;
}

.toggle-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  cursor: pointer;
}

.toggle-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--primary-teal);
  cursor: pointer;
  margin-top: 2px;
}

.toggle-label {
  display: flex;
  flex-direction: column;
}

.toggle-label strong {
  font-size: 0.9rem;
  color: var(--text-primary);
}

.toggle-label small {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Compact Pending Transfer */
.pending-transfer-compact {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: rgba(45, 212, 191, 0.1);
  border-radius: 8px;
  margin-bottom: 1rem;
  border: 1px solid rgba(45, 212, 191, 0.2);
}

.transfer-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.transfer-label {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.transfer-date {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.transfer-action {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.transfer-amount {
  font-weight: 700;
  color: var(--primary-teal);
  font-size: 1.1rem;
}

/* Manual Expenses Section */
.manual-expenses-section {
  margin-top: 1rem;
}

.manual-expenses-section h4 {
  font-size: 0.95rem;
  margin: 0 0 0.25rem 0;
  color: var(--text-primary);
}

.section-hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin: 0 0 0.75rem 0;
}

.manual-expenses-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.manual-expense-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.75rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  gap: 1rem;
  border-left: 3px solid var(--primary-teal);
}

.manual-expense-row.has-deficit {
  border-left-color: #ef4444;
}

.manual-expense-row.past-due {
  background: rgba(251, 191, 36, 0.1);
  border-left-color: #f59e0b;
}

.manual-expense-row.past-due.has-deficit {
  border-left-color: #ef4444;
}

.expense-info {
  display: flex;
  flex-direction: column;
  min-width: 120px;
}

.expense-name {
  font-weight: 500;
  color: var(--text-primary);
  font-size: 0.875rem;
}

.expense-due {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.expense-amounts {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  justify-content: flex-end;
}

.expense-balance {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.expense-balance.negative {
  color: #ef4444;
}

.expense-total {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.expense-actions {
  display: flex;
  gap: 0.35rem;
}

.btn-xs {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.btn-ghost:hover {
  background: var(--bg-hover);
}

/* Legacy pending styles (keeping for backwards compatibility) */
.pending-section h4 {
  font-size: 1rem;
  margin: 0 0 1rem 0;
  color: var(--text-primary);
}

.pending-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 12px;
  margin-bottom: 0.75rem;
  border: 1px solid rgba(45, 212, 191, 0.1);
}

.pending-item.will-go-negative {
  border-color: rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.05);
}

.pending-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(45, 212, 191, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-teal);
  flex-shrink: 0;
}

.pending-icon.expense-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
}

.pending-details {
  flex: 1;
  min-width: 0;
}

.pending-title {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.pending-meta {
  font-size: 0.8rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.pending-balance {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.pending-amount {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--primary-teal);
  white-space: nowrap;
}

.pending-actions {
  display: flex;
  gap: 0.5rem;
}

.missed-badge,
.deficit-badge {
  font-size: 0.7rem;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-weight: 500;
}

.missed-badge {
  background: rgba(251, 191, 36, 0.2);
  color: #f59e0b;
}

.deficit-badge {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.process-all {
  margin-top: 1rem;
  text-align: center;
}

/* No Pending State */
.no-pending {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.no-pending-icon {
  color: var(--primary-teal);
  margin-bottom: 1rem;
}

.no-pending p {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
}

.no-pending small {
  font-size: 0.8rem;
  opacity: 0.7;
}

/* Recent Payments */
.recent-section {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.recent-section h4 {
  font-size: 1rem;
  margin: 0 0 1rem 0;
  color: var(--text-primary);
}

.payments-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.payment-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  font-size: 0.875rem;
}

.payment-item.skipped {
  opacity: 0.7;
}

.payment-item.negative {
  border-left: 3px solid #ef4444;
}

.payment-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.payment-name {
  font-weight: 500;
  color: var(--text-primary);
}

.payment-date {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.payment-amount {
  font-weight: 600;
  color: var(--primary-teal);
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.skipped-badge {
  color: var(--text-secondary);
  font-weight: normal;
  font-style: italic;
}

.negative-indicator {
  color: #ef4444;
  font-weight: bold;
}

.payment-type-badge {
  font-size: 0.65rem;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  text-transform: uppercase;
  font-weight: 600;
}

.payment-type-badge.automatic {
  background: rgba(45, 212, 191, 0.2);
  color: var(--primary-teal);
}

.payment-type-badge.manual {
  background: rgba(99, 102, 241, 0.2);
  color: #6366f1;
}

.payment-type-badge.skipped {
  background: rgba(156, 163, 175, 0.2);
  color: #9ca3af;
}

/* Buttons */
.btn {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-sm {
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
}

.btn-primary {
  background: var(--primary-teal);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-teal-dark);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

@media (max-width: 640px) {
  .pending-item {
    flex-wrap: wrap;
  }

  .pending-amount {
    order: -1;
    flex-basis: 100%;
    text-align: right;
    margin-bottom: 0.5rem;
  }

  .pending-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
