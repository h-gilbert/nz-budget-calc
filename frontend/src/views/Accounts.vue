<template>
  <div class="accounts-page">
    <!-- Expense Account Modal -->
    <ExpenseAccountModal
      v-model="showExpenseModal"
      :account="selectedExpenseAccount"
    />

    <div class="page-header">
      <h1>Your Accounts</h1>
      <p class="subtitle">View and manage all your accounts and expense funds</p>
    </div>

    <div v-if="!userStore.isAuthenticated" class="auth-message">
      <p>Please log in to view your accounts.</p>
    </div>

    <div v-else-if="isLoading" class="loading-message">
      <p>Loading your accounts...</p>
    </div>

    <div v-else-if="loadError" class="error-message">
      <p>Error: {{ loadError }}</p>
      <p class="error-detail">Check the browser console for more details.</p>
    </div>

    <div v-else-if="accounts.length === 0" class="no-accounts">
      <p>No accounts found. Create an account in the Budget Calculator to get started.</p>
      <p class="debug-info">Debug: User authenticated, but no accounts in store.</p>
    </div>

    <div v-else class="accounts-grid">
      <div
        v-for="account in accounts"
        :key="account.id"
        class="account-card"
        :class="{
          'has-subaccounts': hasSubAccounts(account),
          'expanded': expandedAccounts[account.id]
        }"
      >
        <div class="account-card-header" @click="toggleAccount(account.id)">
          <div class="account-info">
            <div class="account-name-row">
              <h3>{{ account.name }}</h3>
              <span v-if="account.isExpenseAccount" class="account-badge expense">Expense</span>
              <span v-else-if="account.isSpendingAccount" class="account-badge spending">Spending</span>
            </div>
            <div class="account-balance">
              <span class="balance-label">Current Balance:</span>
              <span class="balance-amount" :class="getBalanceClass(account)">
                ${{ formatBalance(getAccountBalance(account)) }}
              </span>
            </div>

            <!-- Goal/Target Section -->
            <div v-if="account.target" class="account-goal-section">
              <div class="goal-header">
                <span class="goal-label">Goal: ${{ formatBalance(account.target) }}</span>
                <span class="goal-progress-text" :class="getProgressClass(account)">
                  {{ getProgressPercentage(account) }}%
                </span>
              </div>
              <div class="goal-progress-bar">
                <div
                  class="goal-progress-fill"
                  :class="getProgressClass(account)"
                  :style="{ width: Math.min(getProgressPercentage(account), 100) + '%' }"
                ></div>
              </div>
              <div class="goal-remaining">
                <small v-if="getAccountBalance(account) < account.target">
                  ${{ formatBalance(account.target - getAccountBalance(account)) }} to go
                </small>
                <small v-else class="goal-achieved">
                  ✓ Goal achieved!
                </small>
              </div>
            </div>
          </div>
          <div v-if="hasSubAccounts(account) && !account.isExpenseAccount" class="expand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline :points="expandedAccounts[account.id] ? '18 15 12 9 6 15' : '6 9 12 15 18 9'"></polyline>
            </svg>
          </div>
        </div>

        <!-- Sub-accounts section (expandable) -->
        <div v-if="hasSubAccounts(account) && expandedAccounts[account.id]" class="sub-accounts-section">
          <div class="sub-accounts-header">
            <h4>Expense Funds</h4>
            <small>{{ account.sub_accounts.length }} funds</small>
          </div>
          <div class="sub-accounts-list">
            <div
              v-for="subAccount in account.sub_accounts"
              :key="subAccount.id"
              class="sub-account-item"
            >
              <div class="sub-account-name">
                <span class="fund-icon">💰</span>
                {{ subAccount.name || 'Unnamed Fund' }}
              </div>
              <div class="sub-account-balance" :class="getBalanceClass(subAccount)">
                ${{ formatBalance(subAccount.balance) }}
              </div>
            </div>
          </div>
          <div class="sub-accounts-total">
            <strong>Total:</strong>
            <strong>${{ formatBalance(getAccountBalance(account)) }}</strong>
          </div>
        </div>

        <!-- Account metadata -->
        <div class="account-metadata">
          <small v-if="account.startingBalanceDate" class="metadata-item">
            Started: {{ formatDate(account.startingBalanceDate) }}
          </small>
          <small v-if="account.isWeekAhead" class="metadata-item week-ahead">
            🛡️ Week-ahead buffer active
          </small>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useBudgetStore } from '@stores/budget'
import { useUserStore } from '@stores/user'
import ExpenseAccountModal from '@components/ui/ExpenseAccountModal.vue'

const budgetStore = useBudgetStore()
const userStore = useUserStore()

const expandedAccounts = ref({})
const isLoading = ref(false)
const loadError = ref(null)
const showExpenseModal = ref(false)
const selectedExpenseAccount = ref(null)

const accounts = computed(() => {
  console.log('[Accounts] Computing accounts, count:', budgetStore.accounts.length)
  console.log('[Accounts] Accounts data:', budgetStore.accounts)
  return budgetStore.accounts
})

function hasSubAccounts(account) {
  return account.sub_accounts && account.sub_accounts.length > 0
}

function toggleAccount(accountId) {
  // Find the account
  const account = accounts.value.find(acc => acc.id === accountId)

  // If it's an expense account, open modal instead of expanding
  if (account && account.isExpenseAccount) {
    selectedExpenseAccount.value = account
    showExpenseModal.value = true
  } else {
    // For non-expense accounts, use normal expand behavior
    expandedAccounts.value[accountId] = !expandedAccounts.value[accountId]
  }
}

function getAccountBalance(account) {
  // If account has sub-accounts, return aggregated balance
  if (hasSubAccounts(account)) {
    return account.sub_accounts.reduce((total, sub) => {
      return total + (parseFloat(sub.balance) || 0)
    }, 0)
  }
  // Otherwise return the account's own balance
  return parseFloat(account.balance) || 0
}

function getBalanceClass(account) {
  const balance = parseFloat(account.balance) || 0
  const target = parseFloat(account.target) || 0

  if (balance < 0) return 'balance-negative'
  if (target && balance < target * 0.5) return 'balance-low'
  if (target && balance >= target) return 'balance-good'
  return ''
}

function formatBalance(amount) {
  return parseFloat(amount || 0).toFixed(2)
}

function getProgressPercentage(account) {
  const balance = getAccountBalance(account)
  const target = parseFloat(account.target) || 0
  if (target === 0) return 0
  return Math.round((balance / target) * 100)
}

function getProgressClass(account) {
  const percentage = getProgressPercentage(account)
  if (percentage >= 100) return 'progress-complete'
  if (percentage >= 75) return 'progress-high'
  if (percentage >= 50) return 'progress-medium'
  if (percentage >= 25) return 'progress-low'
  return 'progress-very-low'
}

function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-NZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

async function loadAccountData() {
  console.log('[Accounts] loadAccountData called')
  console.log('[Accounts] User authenticated:', userStore.isAuthenticated)
  console.log('[Accounts] Current accounts in store:', budgetStore.accounts.length)

  if (!userStore.isAuthenticated) {
    console.log('[Accounts] User not authenticated, skipping load')
    return
  }

  isLoading.value = true
  loadError.value = null

  try {
    console.log('[Accounts] Loading budget data...')

    // Load the default budget which includes accounts
    const { budgetAPI } = await import('@/api/client')
    const defaultBudget = await budgetAPI.load()

    console.log('[Accounts] Budget loaded:', defaultBudget)

    if (defaultBudget) {
      console.log('[Accounts] Loading budget data into store...')
      budgetStore.loadBudgetData(defaultBudget)

      console.log('[Accounts] Running migration...')
      budgetStore.migrateExpensesToSubAccounts()

      console.log('[Accounts] Accounts after load:', budgetStore.accounts.length)
    } else {
      console.warn('[Accounts] No default budget found')
      loadError.value = 'No budget data found'
    }
  } catch (error) {
    console.error('[Accounts] Failed to load account data:', error)
    loadError.value = error.message || 'Failed to load accounts'
  } finally {
    isLoading.value = false
  }
}

// Watch for authentication changes
watch(() => userStore.isAuthenticated, (isAuth) => {
  console.log('[Accounts] Auth state changed:', isAuth)
  if (isAuth) {
    loadAccountData()
  }
})

onMounted(async () => {
  console.log('[Accounts] Page mounted')
  // Try to load immediately if already authenticated
  if (userStore.isAuthenticated) {
    await loadAccountData()
  } else {
    console.log('[Accounts] Not authenticated on mount, waiting for auth...')
  }
})
</script>

<style scoped>
.accounts-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  color: #1a1a1a;
}

.subtitle {
  color: #666;
  font-size: 1rem;
}

.auth-message,
.no-accounts,
.loading-message,
.error-message {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.loading-message {
  font-size: 1.125rem;
}

.error-message {
  color: #d32f2f;
}

.error-detail {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #666;
}

.debug-info {
  margin-top: 1rem;
  font-size: 0.75rem;
  color: #999;
  font-family: monospace;
}

.accounts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.account-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.account-card.has-subaccounts {
  cursor: pointer;
}

.account-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.account-card.expanded {
  grid-column: span 1;
}

.account-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.account-info {
  flex: 1;
}

.account-name-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.account-name-row h3 {
  font-size: 1.25rem;
  margin: 0;
  color: #1a1a1a;
}

.account-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.account-badge.expense {
  background: #e3f2fd;
  color: #1976d2;
}

.account-badge.spending {
  background: #f3e5f5;
  color: #7b1fa2;
}

.account-balance {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.balance-label {
  font-size: 0.875rem;
  color: #666;
}

.balance-amount {
  font-size: 1.75rem;
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

.account-goal-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #f0f0f0;
}

.goal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.goal-label {
  font-weight: 600;
  color: #666;
  font-size: 0.875rem;
}

.goal-progress-text {
  font-weight: 700;
  font-size: 0.875rem;
}

.goal-progress-bar {
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.goal-progress-fill {
  height: 100%;
  transition: width 0.3s ease, background 0.3s ease;
  border-radius: 4px;
}

.goal-progress-fill.progress-very-low {
  background: linear-gradient(90deg, #ef5350, #e53935);
}

.goal-progress-fill.progress-low {
  background: linear-gradient(90deg, #ff9800, #f57c00);
}

.goal-progress-fill.progress-medium {
  background: linear-gradient(90deg, #fdd835, #fbc02d);
}

.goal-progress-fill.progress-high {
  background: linear-gradient(90deg, #66bb6a, #43a047);
}

.goal-progress-fill.progress-complete {
  background: linear-gradient(90deg, #26a69a, #00897b);
}

.goal-progress-text.progress-very-low {
  color: #d32f2f;
}

.goal-progress-text.progress-low {
  color: #f57c00;
}

.goal-progress-text.progress-medium {
  color: #f9a825;
}

.goal-progress-text.progress-high {
  color: #388e3c;
}

.goal-progress-text.progress-complete {
  color: #00897b;
}

.goal-remaining {
  text-align: right;
}

.goal-remaining small {
  color: #666;
  font-size: 0.8rem;
}

.goal-achieved {
  color: #00897b !important;
  font-weight: 600;
}

.expand-icon {
  flex-shrink: 0;
  margin-left: 1rem;
  color: #666;
  transition: transform 0.3s ease;
}

.account-card.expanded .expand-icon {
  transform: rotate(180deg);
}

.sub-accounts-section {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 2px solid #f0f0f0;
}

.sub-accounts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.sub-accounts-header h4 {
  margin: 0;
  font-size: 1rem;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sub-accounts-header small {
  color: #999;
}

.sub-accounts-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.sub-account-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 8px;
  transition: background 0.2s ease;
}

.sub-account-item:hover {
  background: #e9ecef;
}

.sub-account-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: #1a1a1a;
}

.fund-icon {
  font-size: 1.25rem;
}

.sub-account-balance {
  font-weight: 700;
  font-size: 1.125rem;
}

.sub-accounts-total {
  display: flex;
  justify-content: space-between;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
  font-size: 1.125rem;
}

.account-metadata {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #f0f0f0;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.metadata-item {
  color: #666;
  font-size: 0.875rem;
}

.metadata-item.week-ahead {
  color: #1976d2;
  font-weight: 500;
}

@media (max-width: 768px) {
  .accounts-page {
    padding: 1rem;
  }

  .accounts-grid {
    grid-template-columns: 1fr;
  }

  .account-card {
    padding: 1rem;
  }

  .balance-amount {
    font-size: 1.5rem;
  }
}
</style>
