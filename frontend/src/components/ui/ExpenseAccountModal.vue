<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content expense-modal">
          <button class="modal-close" @click="closeModal">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <div v-if="account" class="modal-body">
            <!-- Account Header -->
            <div class="account-header">
              <div class="account-title-section">
                <h2>{{ account.name }}</h2>
                <span class="account-badge expense">Expense Account</span>
              </div>
              <div class="total-balance">
                <span class="balance-label">Total Balance</span>
                <div v-if="editingTotalBalance" class="balance-edit-inline">
                  <span class="currency-prefix">$</span>
                  <input
                    ref="totalBalanceInput"
                    v-model.number="editTotalBalanceValue"
                    type="number"
                    step="0.01"
                    class="balance-input-large"
                    @keyup.enter="saveTotalBalance"
                    @keyup.escape="cancelEditTotalBalance"
                  />
                  <button class="btn-save-inline" @click="saveTotalBalance" title="Save">✓</button>
                  <button class="btn-cancel-inline" @click="cancelEditTotalBalance" title="Cancel">✕</button>
                </div>
                <div v-else class="balance-display" @click="startEditTotalBalance">
                  <span class="balance-amount" :class="getBalanceClass(getTotalBalance())">
                    ${{ formatBalance(getTotalBalance()) }}
                  </span>
                  <span class="edit-hint">click to edit</span>
                </div>
              </div>
            </div>

            <!-- Record Transfer Section -->
            <div class="transfer-section">
              <div class="section-header">
                <h3>Record Transfer</h3>
                <span class="section-hint">Add funds and auto-distribute to expense sub-accounts</span>
              </div>
              <div class="transfer-input-row">
                <div class="transfer-input-group">
                  <span class="currency-prefix">$</span>
                  <input
                    v-model.number="transferAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    class="transfer-input"
                  />
                </div>
                <button
                  class="btn-transfer"
                  :disabled="!transferAmount || transferAmount <= 0"
                  @click="recordTransfer"
                >
                  Auto-Allocate Transfer
                </button>
              </div>
              <div class="transfer-info">
                <div class="info-item recommended" v-if="recommendedTransfer > 0">
                  <span class="info-label">Recommended:</span>
                  <span class="info-value highlight">
                    ${{ formatBalance(recommendedTransfer) }}
                    <span v-if="catchUpAmount > 0" class="catch-up-note">
                      (incl. ${{ formatBalance(catchUpAmount) }} catch-up)
                    </span>
                  </span>
                </div>
                <div class="info-item">
                  <span class="info-label">Equilibrium:</span>
                  <span class="info-value">${{ formatBalance(budgetStore.totalExpenses) }}/week</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Effective Need:</span>
                  <span class="info-value" :class="effectiveEquilibrium < budgetStore.totalExpenses ? 'text-success' : ''">
                    ${{ formatBalance(effectiveEquilibrium) }}/week
                  </span>
                </div>
              </div>
              <!-- Allocation Result -->
              <div v-if="lastAllocationResult" class="allocation-result" :class="lastAllocationResult.success ? 'success' : 'error'">
                <div class="result-header">
                  <span class="result-icon">{{ lastAllocationResult.success ? '✓' : '!' }}</span>
                  <span class="result-message">{{ lastAllocationResult.message }}</span>
                </div>
                <div v-if="lastAllocationResult.allocations && lastAllocationResult.allocations.length > 0" class="allocation-breakdown">
                  <div v-for="alloc in lastAllocationResult.allocations" :key="alloc.expenseId" class="allocation-item">
                    <span class="alloc-name">{{ alloc.expenseName }}</span>
                    <span class="alloc-amount">+${{ formatBalance(alloc.allocated) }}</span>
                  </div>
                  <div v-if="lastAllocationResult.unallocated > 0" class="allocation-item unallocated">
                    <span class="alloc-name">Unallocated Buffer</span>
                    <span class="alloc-amount">+${{ formatBalance(lastAllocationResult.unallocated) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Expense Funds List (Virtual Sub-accounts) - Grouped Display -->
            <div class="sub-accounts-section">
              <div class="section-header">
                <h3>Expense Funds</h3>
                <span class="fund-count">{{ expenses.length }} expenses</span>
              </div>

              <div v-if="expenses.length > 0" class="expense-groups-container">
                <!-- Grouped expenses -->
                <div
                  v-for="group in budgetStore.groupedExpenses"
                  :key="group.id"
                  class="expense-group"
                >
                  <div class="group-header" :style="{ borderLeftColor: group.color }">
                    <div class="group-title">
                      <h4>{{ group.name }}</h4>
                      <span class="group-count">{{ group.expenses.length }} expenses</span>
                    </div>
                    <div class="group-totals">
                      <span class="group-balance">${{ formatBalance(group.totalBalance) }}</span>
                      <span class="group-weekly">${{ formatBalance(group.totalWeekly) }}/week</span>
                    </div>
                  </div>

                  <div class="sub-accounts-grid">
                    <div
                      v-for="expense in group.expenses"
                      :key="expense.id"
                      class="sub-account-card"
                      :class="{ 'overfunded': isOverfunded(expense) }"
                    >
                      <div class="sub-account-header">
                        <div class="sub-account-icon">{{ isOverfunded(expense) ? '✓' : '💰' }}</div>
                        <div class="sub-account-info">
                          <h4>{{ expense.name || 'Unnamed Expense' }}</h4>
                          <div class="sub-account-meta">
                            <span class="meta-item">
                              ${{ formatBalance(expense.amount) }}/{{ expense.frequency }}
                            </span>
                            <span v-if="expense.frequency === 'one-off' && expense.date" class="meta-item">
                              · {{ budgetStore.weeksUntilDate(expense.date) }}w left
                            </span>
                          </div>
                        </div>
                      </div>
                      <div class="sub-account-balance-section">
                        <div v-if="editingExpenseId === expense.id" class="balance-edit-inline small">
                          <span class="currency-prefix">$</span>
                          <input
                            ref="expenseBalanceInput"
                            v-model.number="editExpenseBalanceValue"
                            type="number"
                            step="0.01"
                            class="balance-input"
                            @keyup.enter="saveExpenseBalance(expense.id)"
                            @keyup.escape="cancelEditExpenseBalance"
                          />
                          <button class="btn-save-inline small" @click="saveExpenseBalance(expense.id)" title="Save">✓</button>
                          <button class="btn-cancel-inline small" @click="cancelEditExpenseBalance" title="Cancel">✕</button>
                        </div>
                        <div v-else class="balance-display clickable" @click="startEditExpenseBalance(expense)">
                          <div class="balance" :class="getBalanceClass(expense.sub_account?.balance)">
                            ${{ formatBalance(expense.sub_account?.balance || 0) }}
                          </div>
                          <span class="balance-label">Allocated <span class="edit-hint-small">(click to edit)</span></span>
                        </div>
                        <!-- Progress to target -->
                        <div class="target-progress">
                          <div class="progress-bar">
                            <div
                              class="progress-fill"
                              :class="getProgressClass(expense)"
                              :style="{ width: getProgressPercent(expense) + '%' }"
                            ></div>
                          </div>
                          <span class="progress-text" :class="getProgressClass(expense)">
                            {{ Math.round(getProgressPercent(expense)) }}% of ${{ formatBalance(budgetStore.calculateTargetBalance(expense)) }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-else class="no-funds-message">
                <p>No expenses configured yet. Add expenses in the Budget Calculator.</p>
              </div>
            </div>

            <!-- Summary Footer -->
            <div class="modal-footer">
              <div class="summary-row">
                <span class="summary-label">Unallocated:</span>
                <span class="summary-value">${{ formatBalance(account?.balance || 0) }}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Allocated to Expenses:</span>
                <span class="summary-value">${{ formatBalance(getSubAccountsTotal()) }}</span>
              </div>
              <div class="summary-row total-row">
                <span class="summary-label">Total Balance:</span>
                <span class="summary-value">${{ formatBalance(getTotalBalance()) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, ref, nextTick, watch, onMounted } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import { budgetAPI } from '@/api/client'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  account: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])
const budgetStore = useBudgetStore()

// Transfer state
const transferAmount = ref(null)
const lastAllocationResult = ref(null)

// Recommended transfer (including catch-up)
const recommendedTransfer = ref(0)
const catchUpAmount = ref(0)

// Load catch-up schedule when modal opens
async function loadRecommendedTransfer() {
  try {
    const schedule = await budgetStore.calculateCatchUpSchedule(52)
    if (schedule && schedule.schedule && schedule.schedule.length > 0) {
      const firstWeek = schedule.schedule[0]
      recommendedTransfer.value = firstWeek.transferAmount || 0
      catchUpAmount.value = firstWeek.catchUpAmount || 0
    } else {
      // No catch-up needed, use equilibrium
      recommendedTransfer.value = budgetStore.totalExpenses
      catchUpAmount.value = 0
    }
  } catch (err) {
    console.error('Error loading catch-up schedule:', err)
    recommendedTransfer.value = budgetStore.totalExpenses
    catchUpAmount.value = 0
  }
}

// Load when modal opens
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    loadRecommendedTransfer()
  }
}, { immediate: true })

// Total balance editing state
const editingTotalBalance = ref(false)
const editTotalBalanceValue = ref(0)
const totalBalanceInput = ref(null)

// Individual expense balance editing state
const editingExpenseId = ref(null)
const editExpenseBalanceValue = ref(0)
const expenseBalanceInput = ref(null)

// Get expenses from the budget store (these are the virtual sub-accounts)
const expenses = computed(() => {
  return budgetStore.expenses || []
})

// Calculate effective equilibrium (considering overfunded accounts)
const effectiveEquilibrium = computed(() => {
  return budgetStore.calculateEffectiveEquilibrium()
})

function closeModal() {
  emit('update:modelValue', false)
}

function getTotalBalance() {
  // Total = expense account balance + all sub_account balances
  const accountBalance = parseFloat(props.account?.balance) || 0
  const subAccountsTotal = expenses.value.reduce((total, expense) => {
    return total + (parseFloat(expense.sub_account?.balance) || 0)
  }, 0)
  return accountBalance + subAccountsTotal
}

function getSubAccountsTotal() {
  return expenses.value.reduce((total, expense) => {
    return total + (parseFloat(expense.sub_account?.balance) || 0)
  }, 0)
}

function formatBalance(amount) {
  return parseFloat(amount || 0).toFixed(2)
}

function getBalanceClass(balance) {
  const bal = parseFloat(balance) || 0
  if (bal < 0) return 'balance-negative'
  if (bal < 100) return 'balance-low'
  return 'balance-good'
}

// Check if expense is overfunded
function isOverfunded(expense) {
  const currentBalance = parseFloat(expense.sub_account?.balance) || 0
  const targetBalance = budgetStore.calculateTargetBalance(expense)
  return currentBalance >= targetBalance
}

// Progress percentage toward target
function getProgressPercent(expense) {
  const currentBalance = parseFloat(expense.sub_account?.balance) || 0
  const targetBalance = budgetStore.calculateTargetBalance(expense)
  if (targetBalance <= 0) return 100
  return Math.min(100, (currentBalance / targetBalance) * 100)
}

// Progress styling class
function getProgressClass(expense) {
  const percent = getProgressPercent(expense)
  if (percent >= 100) return 'progress-complete'
  if (percent >= 75) return 'progress-high'
  if (percent >= 50) return 'progress-medium'
  if (percent >= 25) return 'progress-low'
  return 'progress-very-low'
}

// Record a transfer and auto-allocate
async function recordTransfer() {
  if (!transferAmount.value || transferAmount.value <= 0) return

  const amount = transferAmount.value

  // Auto-allocate the transfer across expenses
  // This function handles adding to sub_account.balance and unallocated pool
  const result = budgetStore.autoAllocateTransfer(amount)
  lastAllocationResult.value = result

  // Save to backend
  if (result.success) {
    try {
      const budgetData = budgetStore.getBudgetData()
      await budgetAPI.save(budgetData)
      console.log('Transfer saved successfully')
      transferAmount.value = null
    } catch (error) {
      console.error('Failed to save transfer:', error)
    }
  }
}

// Total balance editing
function startEditTotalBalance() {
  editTotalBalanceValue.value = getTotalBalance()
  editingTotalBalance.value = true
  nextTick(() => {
    totalBalanceInput.value?.focus()
    totalBalanceInput.value?.select()
  })
}

async function saveTotalBalance() {
  const newTotal = parseFloat(editTotalBalanceValue.value) || 0
  const currentTotal = getTotalBalance()
  const difference = newTotal - currentTotal

  if (difference !== 0) {
    // Adjust the expense account's unallocated balance
    const expenseAccount = budgetStore.accounts.find(a => a.isExpenseAccount)
    if (expenseAccount) {
      expenseAccount.balance = (expenseAccount.balance || 0) + difference

      // If we increased the balance, auto-allocate the increase
      if (difference > 0) {
        const result = budgetStore.autoAllocateTransfer(difference)
        lastAllocationResult.value = result
      }

      // Save to backend
      try {
        const budgetData = budgetStore.getBudgetData()
        await budgetAPI.save(budgetData)
        console.log('Balance updated successfully')
      } catch (error) {
        console.error('Failed to save balance:', error)
      }
    }
  }

  editingTotalBalance.value = false
}

function cancelEditTotalBalance() {
  editingTotalBalance.value = false
}

// Individual expense balance editing
function startEditExpenseBalance(expense) {
  editingExpenseId.value = expense.id
  editExpenseBalanceValue.value = expense.sub_account?.balance || 0
  nextTick(() => {
    expenseBalanceInput.value?.focus()
    expenseBalanceInput.value?.select()
  })
}

async function saveExpenseBalance(expenseId) {
  const expense = expenses.value.find(e => e.id === expenseId)
  if (!expense) return

  const oldBalance = parseFloat(expense.sub_account?.balance) || 0
  const newBalance = parseFloat(editExpenseBalanceValue.value) || 0
  const difference = newBalance - oldBalance

  // Update the sub-account balance
  budgetStore.updateExpenseSubAccountBalance(expenseId, newBalance)

  // Adjust the unallocated pool inversely
  const expenseAccount = budgetStore.accounts.find(a => a.isExpenseAccount)
  if (expenseAccount) {
    // If we added to sub-account, subtract from unallocated (and vice versa)
    expenseAccount.balance = (expenseAccount.balance || 0) - difference
  }

  // Save to backend
  try {
    const budgetData = budgetStore.getBudgetData()
    await budgetAPI.save(budgetData)
    console.log('Expense balance updated successfully')
  } catch (error) {
    console.error('Failed to save expense balance:', error)
  }

  editingExpenseId.value = null
}

function cancelEditExpenseBalance() {
  editingExpenseId.value = null
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content.expense-modal {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 800px;
  max-height: 85vh;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10;
}

.modal-close:hover {
  background: rgba(0, 0, 0, 0.1);
  transform: rotate(90deg);
}

.modal-body {
  padding: 2rem;
  overflow-y: auto;
  flex: 1;
}

.account-header {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid #f0f0f0;
}

.account-title-section {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.account-title-section h2 {
  font-size: 1.75rem;
  margin: 0;
  color: #1a1a1a;
}

.account-badge {
  padding: 0.375rem 0.875rem;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.account-badge.expense {
  background: #e3f2fd;
  color: #1976d2;
}

.total-balance {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.balance-label {
  font-size: 0.875rem;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.balance-amount {
  font-size: 2rem;
  font-weight: 700;
  color: #1a1a1a;
}

.balance-amount.balance-negative {
  color: #d32f2f;
}

.balance-amount.balance-low {
  color: #f57c00;
}

.balance-amount.balance-good {
  color: #388e3c;
}

.sub-accounts-section {
  margin-bottom: 1.5rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header h3 {
  margin: 0;
  font-size: 1.125rem;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.fund-count {
  color: #999;
  font-size: 0.875rem;
}

/* Expense Groups */
.expense-groups-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.expense-group {
  background: #fafbfc;
  border-radius: 12px;
  padding: 1rem;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-left: 1rem;
  border-left: 4px solid #4CAF50;
}

.group-title h4 {
  margin: 0 0 2px 0;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

.group-count {
  font-size: 0.75rem;
  color: #888;
}

.group-totals {
  text-align: right;
}

.group-balance {
  display: block;
  font-size: 1.125rem;
  font-weight: 600;
  color: #333;
}

.group-weekly {
  display: block;
  font-size: 0.75rem;
  color: #888;
}

.sub-accounts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.sub-account-card {
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 1.25rem;
  transition: all 0.2s ease;
}

.sub-account-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #1976d2;
}

.sub-account-header {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.sub-account-icon {
  font-size: 1.75rem;
  flex-shrink: 0;
}

.sub-account-info {
  flex: 1;
  min-width: 0;
}

.sub-account-info h4 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sub-account-meta {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.meta-item {
  font-size: 0.75rem;
  color: #666;
}

.sub-account-balance-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sub-account-balance-section .balance {
  font-size: 1.5rem;
  font-weight: 700;
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s ease, background 0.3s ease;
  border-radius: 3px;
}

.progress-fill.progress-very-low {
  background: linear-gradient(90deg, #ef5350, #e53935);
}

.progress-fill.progress-low {
  background: linear-gradient(90deg, #ff9800, #f57c00);
}

.progress-fill.progress-medium {
  background: linear-gradient(90deg, #fdd835, #fbc02d);
}

.progress-fill.progress-high {
  background: linear-gradient(90deg, #66bb6a, #43a047);
}

.progress-fill.progress-complete {
  background: linear-gradient(90deg, #26a69a, #00897b);
}

.progress-text {
  font-size: 0.75rem;
  font-weight: 600;
}

.progress-text.progress-very-low {
  color: #d32f2f;
}

.progress-text.progress-low {
  color: #f57c00;
}

.progress-text.progress-medium {
  color: #f9a825;
}

.progress-text.progress-high {
  color: #388e3c;
}

.progress-text.progress-complete {
  color: #00897b;
}

.no-funds-message {
  text-align: center;
  padding: 3rem 1rem;
  color: #999;
}

.modal-footer {
  border-top: 2px solid #f0f0f0;
  padding-top: 1.5rem;
  margin-top: 1rem;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1.25rem;
}

.summary-label {
  font-weight: 600;
  color: #666;
}

.summary-value {
  font-weight: 700;
  color: #1a1a1a;
}

/* Modal Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.3s ease;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.9);
}

/* Transfer Section */
.transfer-section {
  background: linear-gradient(135deg, #e8f5e9 0%, #e3f2fd 100%);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid #c8e6c9;
}

.transfer-section .section-header {
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
  margin-bottom: 1rem;
}

.section-hint {
  font-size: 0.8rem;
  color: #666;
  font-weight: normal;
}

.transfer-input-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.transfer-input-group {
  display: flex;
  align-items: center;
  background: white;
  border: 2px solid #c8e6c9;
  border-radius: 8px;
  padding: 0 0.75rem;
  flex: 1;
  max-width: 200px;
}

.currency-prefix {
  color: #666;
  font-weight: 600;
  font-size: 1.1rem;
}

.transfer-input {
  border: none;
  background: transparent;
  font-size: 1.25rem;
  font-weight: 600;
  padding: 0.75rem 0.5rem;
  width: 100%;
  outline: none;
}

.btn-transfer {
  background: linear-gradient(135deg, #43a047 0%, #2e7d32 100%);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-transfer:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(46, 125, 50, 0.3);
}

.btn-transfer:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.transfer-info {
  display: flex;
  gap: 2rem;
  font-size: 0.875rem;
}

.info-item {
  display: flex;
  gap: 0.5rem;
}

.info-label {
  color: #666;
}

.info-value {
  font-weight: 600;
  color: #1a1a1a;
}

.text-success {
  color: #2e7d32 !important;
}

.info-item.recommended {
  background: #e3f2fd;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: 1px solid #90caf9;
}

.info-value.highlight {
  color: #1565c0;
  font-size: 1rem;
}

.catch-up-note {
  font-size: 0.75rem;
  color: #666;
  font-weight: normal;
}

/* Allocation Result */
.allocation-result {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 8px;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.allocation-result.success {
  background: #e8f5e9;
  border: 1px solid #a5d6a7;
}

.allocation-result.error {
  background: #ffebee;
  border: 1px solid #ef9a9a;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.result-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: bold;
}

.allocation-result.success .result-icon {
  background: #43a047;
  color: white;
}

.allocation-result.error .result-icon {
  background: #e53935;
  color: white;
}

.result-message {
  font-weight: 500;
  color: #1a1a1a;
}

.allocation-breakdown {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-left: 2rem;
}

.allocation-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.alloc-name {
  color: #666;
}

.alloc-amount {
  font-weight: 600;
  color: #2e7d32;
}

.allocation-item.unallocated {
  padding-top: 0.5rem;
  border-top: 1px dashed #c8e6c9;
}

/* Balance Editing */
.balance-display {
  cursor: pointer;
  position: relative;
}

.balance-display.clickable:hover {
  opacity: 0.8;
}

.edit-hint {
  display: block;
  font-size: 0.7rem;
  color: #999;
  margin-top: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.balance-display:hover .edit-hint {
  opacity: 1;
}

.edit-hint-small {
  font-size: 0.65rem;
  color: #999;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.balance-display:hover .edit-hint-small {
  opacity: 1;
}

.balance-edit-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.balance-edit-inline.small {
  gap: 0.25rem;
}

.balance-input-large {
  font-size: 1.75rem;
  font-weight: 700;
  border: 2px solid #1976d2;
  border-radius: 8px;
  padding: 0.25rem 0.5rem;
  width: 150px;
  outline: none;
}

.balance-input {
  font-size: 1.25rem;
  font-weight: 700;
  border: 2px solid #1976d2;
  border-radius: 6px;
  padding: 0.2rem 0.4rem;
  width: 100px;
  outline: none;
}

.btn-save-inline,
.btn-cancel-inline {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.btn-save-inline.small,
.btn-cancel-inline.small {
  width: 26px;
  height: 26px;
  font-size: 0.85rem;
}

.btn-save-inline {
  background: #43a047;
  color: white;
}

.btn-save-inline:hover {
  background: #2e7d32;
}

.btn-cancel-inline {
  background: #e0e0e0;
  color: #666;
}

.btn-cancel-inline:hover {
  background: #bdbdbd;
}

/* Overfunded card */
.sub-account-card.overfunded {
  background: #e8f5e9;
  border-color: #a5d6a7;
}

.sub-account-card.overfunded .sub-account-icon {
  color: #2e7d32;
}

/* Target Progress */
.target-progress {
  margin-top: 0.5rem;
}

.target-progress .progress-bar {
  height: 4px;
  margin-bottom: 0.25rem;
}

.target-progress .progress-text {
  font-size: 0.7rem;
}

/* Responsive */
@media (max-width: 768px) {
  .modal-content.expense-modal {
    width: 95%;
    max-height: 90vh;
  }

  .modal-body {
    padding: 1.5rem;
  }

  .account-title-section h2 {
    font-size: 1.5rem;
  }

  .balance-amount {
    font-size: 1.75rem;
  }

  .sub-accounts-grid {
    grid-template-columns: 1fr;
  }

  .transfer-input-row {
    flex-direction: column;
  }

  .transfer-input-group {
    max-width: none;
  }

  .transfer-info {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
