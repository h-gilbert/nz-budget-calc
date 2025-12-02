<template>
  <div class="accounts-dashboard">
    <!-- Expense Account Modal (kept for detailed transfer management) -->
    <ExpenseAccountModal
      v-model="showExpenseModal"
      :account="expenseAccount"
    />

    <!-- Loading & Auth States -->
    <div v-if="!userStore.isAuthenticated" class="state-message">
      <div class="state-icon">🔐</div>
      <p>Please log in to view your accounts</p>
    </div>

    <div v-else-if="isLoading" class="state-message">
      <div class="loader"></div>
      <p>Loading your financial data...</p>
    </div>

    <div v-else-if="loadError" class="state-message error">
      <div class="state-icon">⚠️</div>
      <p>{{ loadError }}</p>
    </div>

    <!-- Main Dashboard Content -->
    <div v-else class="dashboard-content">
      <!-- Header with Summary Stats -->
      <header class="dashboard-header">
        <div class="header-title">
          <h1>Financial Overview</h1>
          <p class="header-date">{{ currentDate }}</p>
        </div>

        <div class="quick-actions">
          <button class="btn-record-transfer" @click="openExpenseModal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Record Transfer
          </button>
        </div>
      </header>

      <!-- Summary Stats Bar -->
      <div class="stats-bar">
        <div class="stat-card primary">
          <div class="stat-label">Total in Expenses</div>
          <div class="stat-value">${{ formatCurrency(totalExpenseBalance) }}</div>
          <div class="stat-sub">across {{ budgetStore.groupedExpenses.length }} groups</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Weekly Need</div>
          <div class="stat-value">${{ formatCurrency(targetDateAwareEquilibrium) }}</div>
          <div class="stat-sub" v-if="targetDateAwareEquilibrium > budgetStore.totalExpenses">
            target-date-aware (equilibrium: ${{ formatCurrency(budgetStore.totalExpenses) }})
          </div>
          <div class="stat-sub" v-else>equilibrium transfer</div>
        </div>

        <div class="stat-card highlight" v-if="recommendedTransfer > 0">
          <div class="stat-label">Recommended Transfer</div>
          <div class="stat-value">${{ formatCurrency(recommendedTransfer) }}</div>
          <div class="stat-sub" v-if="catchUpAmount > 0">
            includes ${{ formatCurrency(catchUpAmount) }} catch-up
          </div>
          <div class="stat-sub" v-else>at equilibrium</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Unallocated Buffer</div>
          <div class="stat-value">${{ formatCurrency(unallocatedBalance) }}</div>
          <div class="stat-sub">available to distribute</div>
        </div>
      </div>

      <!-- Expense Groups Section -->
      <section class="groups-section">
        <div class="section-header">
          <h2>Expense Groups</h2>
          <span class="section-meta">{{ budgetStore.expenses.length }} expenses tracked</span>
        </div>

        <div class="groups-grid">
          <div
            v-for="group in budgetStore.groupedExpenses"
            :key="group.id"
            class="group-card"
            :class="{ 'expanded': expandedGroups[group.id] }"
            @click="toggleGroup(group.id)"
          >
            <div class="group-color-bar" :style="{ background: group.color }"></div>

            <div class="group-content">
              <div class="group-header">
                <div class="group-info">
                  <h3 class="group-name">{{ group.name }}</h3>
                  <span class="group-count">{{ group.expenses.length }} expense{{ group.expenses.length !== 1 ? 's' : '' }}</span>
                </div>

                <div class="group-metrics">
                  <div class="group-balance">
                    <span class="balance-value">${{ formatCurrency(group.totalBalance) }}</span>
                    <span class="balance-label">allocated</span>
                  </div>
                </div>
              </div>

              <!-- Progress Ring -->
              <div class="group-progress-section">
                <div class="progress-ring-container">
                  <svg class="progress-ring" viewBox="0 0 36 36">
                    <path
                      class="progress-ring-bg"
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      class="progress-ring-fill"
                      :style="{
                        strokeDasharray: `${getGroupProgress(group)}, 100`,
                        stroke: group.color
                      }"
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div class="progress-ring-text">{{ Math.round(getGroupProgress(group)) }}%</div>
                </div>
                <div class="progress-details">
                  <div class="progress-row">
                    <span class="progress-label">Weekly need</span>
                    <span class="progress-value">${{ formatCurrency(group.totalWeekly) }}</span>
                  </div>
                  <div class="progress-row">
                    <span class="progress-label">Target balance</span>
                    <span class="progress-value">${{ formatCurrency(getGroupTarget(group)) }}</span>
                  </div>
                </div>
              </div>

              <!-- Expand Icon -->
              <div class="expand-indicator">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline :points="expandedGroups[group.id] ? '18 15 12 9 6 15' : '6 9 12 15 18 9'"></polyline>
                </svg>
              </div>
            </div>

            <!-- Expanded Expense List -->
            <Transition name="expand">
              <div v-if="expandedGroups[group.id]" class="group-expenses" @click.stop>
                <div class="expenses-list">
                  <div
                    v-for="expense in group.expenses"
                    :key="expense.id"
                    class="expense-row"
                    :class="{ 'fully-funded': isExpenseFullyFunded(expense) }"
                  >
                    <div class="expense-info">
                      <span class="expense-status">{{ isExpenseFullyFunded(expense) ? '✓' : '○' }}</span>
                      <div class="expense-details">
                        <span class="expense-name">{{ expense.name }}</span>
                        <span class="expense-frequency">${{ formatCurrency(expense.amount) }}/{{ expense.frequency }}</span>
                      </div>
                    </div>
                    <div class="expense-balance-section">
                      <div class="expense-progress-bar">
                        <div
                          class="expense-progress-fill"
                          :style="{
                            width: getExpenseProgress(expense) + '%',
                            background: group.color
                          }"
                        ></div>
                      </div>
                      <div class="expense-balance">
                        <span class="allocated">${{ formatCurrency(expense.sub_account?.balance || 0) }}</span>
                        <span class="separator">/</span>
                        <span class="target">${{ formatCurrency(budgetStore.calculateTargetBalance(expense)) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </section>

      <!-- Savings Accounts Section -->
      <section class="savings-section" v-if="savingsAccounts.length > 0">
        <div class="section-header">
          <h2>Savings Goals</h2>
          <span class="section-meta">{{ savingsAccounts.length }} account{{ savingsAccounts.length !== 1 ? 's' : '' }}</span>
        </div>

        <div class="savings-grid">
          <div
            v-for="account in savingsAccounts"
            :key="account.id"
            class="savings-card"
          >
            <div class="savings-header">
              <h3>{{ account.name }}</h3>
              <span v-if="getProgressPercentage(account) >= 100" class="goal-badge">Goal Reached!</span>
            </div>

            <div class="savings-balance">
              <span class="current">${{ formatCurrency(account.balance) }}</span>
              <span v-if="account.target" class="target">of ${{ formatCurrency(account.target) }}</span>
            </div>

            <div v-if="account.target" class="savings-progress">
              <div class="savings-progress-bar">
                <div
                  class="savings-progress-fill"
                  :style="{ width: Math.min(getProgressPercentage(account), 100) + '%' }"
                ></div>
              </div>
              <div class="savings-progress-text">
                <span v-if="account.balance < account.target">
                  ${{ formatCurrency(account.target - account.balance) }} to go
                </span>
                <span v-else class="achieved">✓ Achieved</span>
              </div>
            </div>
          </div>
        </div>
      </section>
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

const expandedGroups = ref({})
const isLoading = ref(false)
const loadError = ref(null)
const showExpenseModal = ref(false)

// Recommended transfer state
const recommendedTransfer = ref(0)
const catchUpAmount = ref(0)

const currentDate = computed(() => {
  return new Date().toLocaleDateString('en-NZ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

const expenseAccount = computed(() => {
  return budgetStore.accounts.find(a => a.isExpenseAccount)
})

const savingsAccounts = computed(() => {
  return budgetStore.accounts.filter(a => !a.isExpenseAccount && !a.isSpendingAccount)
})

const allocatedBalance = computed(() => {
  // Sum of all virtual sub-account allocations
  return budgetStore.expenses.reduce((total, expense) => {
    return total + (parseFloat(expense.sub_account?.balance) || 0)
  }, 0)
})

const unallocatedBalance = computed(() => {
  // Unallocated pool stored in expense account balance
  return parseFloat(expenseAccount.value?.balance) || 0
})

const totalExpenseBalance = computed(() => {
  // Total = unallocated pool + all allocated sub-accounts
  return unallocatedBalance.value + allocatedBalance.value
})

const targetDateAwareEquilibrium = computed(() => {
  // Calculate the target-date-aware equilibrium (may be higher than regular equilibrium
  // if expenses are approaching their due dates)
  return budgetStore.calculateTargetDateAwareEquilibrium()
})

function formatCurrency(amount) {
  return parseFloat(amount || 0).toFixed(2)
}

function toggleGroup(groupId) {
  expandedGroups.value[groupId] = !expandedGroups.value[groupId]
}

function getGroupProgress(group) {
  const target = getGroupTarget(group)
  if (target <= 0) return 100
  return Math.min(100, (group.totalBalance / target) * 100)
}

function getGroupTarget(group) {
  return group.expenses.reduce((total, expense) => {
    return total + budgetStore.calculateTargetBalance(expense)
  }, 0)
}

function getExpenseProgress(expense) {
  const balance = parseFloat(expense.sub_account?.balance) || 0
  const target = budgetStore.calculateTargetBalance(expense)
  if (target <= 0) return 100
  return Math.min(100, (balance / target) * 100)
}

function isExpenseFullyFunded(expense) {
  const balance = parseFloat(expense.sub_account?.balance) || 0
  const target = budgetStore.calculateTargetBalance(expense)
  return balance >= target
}

function getProgressPercentage(account) {
  const balance = parseFloat(account.balance) || 0
  const target = parseFloat(account.target) || 0
  if (target === 0) return 0
  return Math.round((balance / target) * 100)
}

function openExpenseModal() {
  showExpenseModal.value = true
}

async function loadRecommendedTransfer() {
  try {
    const schedule = await budgetStore.calculateCatchUpSchedule(52)
    if (schedule && schedule.schedule && schedule.schedule.length > 0) {
      const firstWeek = schedule.schedule[0]
      recommendedTransfer.value = firstWeek.transferAmount || 0
      catchUpAmount.value = firstWeek.catchUpAmount || 0
    } else {
      recommendedTransfer.value = budgetStore.totalExpenses
      catchUpAmount.value = 0
    }
  } catch (err) {
    console.error('Error loading catch-up schedule:', err)
    recommendedTransfer.value = budgetStore.totalExpenses
    catchUpAmount.value = 0
  }
}

async function loadAccountData() {
  if (!userStore.isAuthenticated) return

  isLoading.value = true
  loadError.value = null

  try {
    const { budgetAPI } = await import('@/api/client')
    const defaultBudget = await budgetAPI.load()

    if (defaultBudget) {
      budgetStore.loadBudgetData(defaultBudget)
      await loadRecommendedTransfer()
    } else {
      loadError.value = 'No budget data found'
    }
  } catch (error) {
    console.error('Failed to load account data:', error)
    loadError.value = error.message || 'Failed to load accounts'
  } finally {
    isLoading.value = false
  }
}

watch(() => userStore.isAuthenticated, (isAuth) => {
  if (isAuth) {
    loadAccountData()
  }
})

onMounted(async () => {
  if (userStore.isAuthenticated) {
    await loadAccountData()
  }
})
</script>

<style scoped>
.accounts-dashboard {
  min-height: 100vh;
  background: var(--bg-primary, #f8f7f4);
  font-family: 'Bricolage Grotesque', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* State Messages */
.state-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 1rem;
  color: #64635e;
}

.state-message.error {
  color: #c53030;
}

.state-icon {
  font-size: 3rem;
}

.loader {
  width: 40px;
  height: 40px;
  border: 3px solid #e8e6e1;
  border-top-color: #1a1917;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Dashboard Content */
.dashboard-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem 3rem;
}

/* Header */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2.5rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid #e8e6e1;
}

.header-title h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text-primary, #1a1917);
  margin: 0 0 0.25rem 0;
  letter-spacing: -0.02em;
}

.header-date {
  font-size: 0.9rem;
  color: #8a8985;
  margin: 0;
}

.quick-actions {
  display: flex;
  gap: 1rem;
}

.btn-record-transfer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  background: var(--primary-teal, #14b8a6);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-record-transfer:hover {
  background: var(--primary-blue, #0d9488);
  transform: translateY(-1px);
}

/* Stats Bar */
.stats-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.25rem;
  margin-bottom: 3rem;
}

.stat-card {
  background: #fff;
  border: 1px solid #e8e6e1;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s ease;
}

.stat-card:hover {
  border-color: #d4d2cd;
  box-shadow: 0 4px 12px rgba(0,0,0,0.04);
}

.stat-card.primary {
  background: #1a1917;
  border-color: #1a1917;
}

.stat-card.primary .stat-label,
.stat-card.primary .stat-sub {
  color: rgba(255,255,255,0.7);
}

.stat-card.primary .stat-value {
  color: #fff;
}

.stat-card.highlight {
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  border-color: #86efac;
}

.stat-card.highlight .stat-value {
  color: #166534;
}

.stat-label {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #8a8985;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary, #1a1917);
  line-height: 1.1;
}

.stat-sub {
  font-size: 0.8rem;
  color: #8a8985;
  margin-top: 0.5rem;
}

/* Sections */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 1.5rem;
}

.section-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary, #1a1917);
  margin: 0;
}

.section-meta {
  font-size: 0.875rem;
  color: #8a8985;
}

/* Groups Section */
.groups-section {
  margin-bottom: 3rem;
}

.groups-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 1.25rem;
}

.group-card {
  background: #fff;
  border: 1px solid #e8e6e1;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.25s ease;
  position: relative;
}

.group-card:hover {
  border-color: #d4d2cd;
  box-shadow: 0 8px 24px rgba(0,0,0,0.06);
  transform: translateY(-2px);
}

.group-card.expanded {
  box-shadow: 0 12px 32px rgba(0,0,0,0.08);
}

.group-color-bar {
  height: 4px;
  width: 100%;
}

.group-content {
  padding: 1.5rem;
  position: relative;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.25rem;
}

.group-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1a1917;
  margin: 0 0 0.25rem 0;
}

.group-count {
  font-size: 0.8rem;
  color: #8a8985;
}

.group-balance {
  text-align: right;
}

.balance-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary, #1a1917);
  line-height: 1.2;
}

.balance-label {
  font-size: 0.75rem;
  color: #8a8985;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

/* Progress Ring */
.group-progress-section {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #f0eeeb;
}

.progress-ring-container {
  position: relative;
  width: 64px;
  height: 64px;
  flex-shrink: 0;
}

.progress-ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.progress-ring-bg {
  fill: none;
  stroke: #f0eeeb;
  stroke-width: 3;
}

.progress-ring-fill {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
  transition: stroke-dasharray 0.5s ease;
}

.progress-ring-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.875rem;
  font-weight: 600;
  color: #1a1917;
}

.progress-details {
  flex: 1;
}

.progress-row {
  display: flex;
  justify-content: space-between;
  padding: 0.35rem 0;
}

.progress-label {
  font-size: 0.8rem;
  color: #8a8985;
}

.progress-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1a1917;
}

.expand-indicator {
  position: absolute;
  bottom: 1rem;
  right: 1.5rem;
  color: #c4c3be;
  transition: transform 0.3s ease, color 0.2s ease;
}

.group-card:hover .expand-indicator {
  color: #8a8985;
}

.group-card.expanded .expand-indicator {
  transform: rotate(180deg);
}

/* Expanded Expenses */
.group-expenses {
  padding: 0 1.5rem 1.5rem;
  border-top: 1px solid #f0eeeb;
  margin-top: 1rem;
}

.expenses-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 1rem;
}

.expense-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.875rem 1rem;
  background: #fafaf8;
  border-radius: 10px;
  transition: background 0.2s ease;
}

.expense-row:hover {
  background: #f5f4f1;
}

.expense-row.fully-funded {
  background: #f0fdf4;
}

.expense-row.fully-funded .expense-status {
  color: #16a34a;
}

.expense-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.expense-status {
  font-size: 0.875rem;
  color: #c4c3be;
}

.expense-details {
  display: flex;
  flex-direction: column;
}

.expense-name {
  font-weight: 500;
  color: #1a1917;
  font-size: 0.9rem;
}

.expense-frequency {
  font-size: 0.75rem;
  color: #8a8985;
}

.expense-balance-section {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.35rem;
  min-width: 140px;
}

.expense-progress-bar {
  width: 100%;
  height: 4px;
  background: #e8e6e1;
  border-radius: 2px;
  overflow: hidden;
}

.expense-progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.expense-balance {
  font-size: 0.8rem;
}

.expense-balance .allocated {
  font-weight: 600;
  color: #1a1917;
}

.expense-balance .separator {
  color: #c4c3be;
  margin: 0 0.25rem;
}

.expense-balance .target {
  color: #8a8985;
}

/* Expand Transition */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 500px;
}

/* Savings Section */
.savings-section {
  margin-top: 3rem;
  padding-top: 3rem;
  border-top: 1px solid #e8e6e1;
}

.savings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
}

.savings-card {
  background: #fff;
  border: 1px solid #e8e6e1;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s ease;
}

.savings-card:hover {
  border-color: #d4d2cd;
  box-shadow: 0 4px 12px rgba(0,0,0,0.04);
}

.savings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.savings-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #1a1917;
  margin: 0;
}

.goal-badge {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 0.25rem 0.5rem;
  background: #f0fdf4;
  color: #166534;
  border-radius: 4px;
}

.savings-balance {
  margin-bottom: 1rem;
}

.savings-balance .current {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary, #1a1917);
}

.savings-balance .target {
  font-size: 0.875rem;
  color: #8a8985;
  margin-left: 0.5rem;
}

.savings-progress-bar {
  width: 100%;
  height: 6px;
  background: #f0eeeb;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.savings-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4ade80, #22c55e);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.savings-progress-text {
  font-size: 0.8rem;
  color: #8a8985;
}

.savings-progress-text .achieved {
  color: #16a34a;
  font-weight: 600;
}

/* Responsive */
@media (max-width: 1024px) {
  .dashboard-content {
    padding: 1.5rem;
  }

  .stats-bar {
    grid-template-columns: repeat(2, 1fr);
  }

  .groups-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .dashboard-header {
    flex-direction: column;
    gap: 1.5rem;
  }

  .header-title h1 {
    font-size: 2rem;
  }

  .quick-actions {
    width: 100%;
  }

  .btn-record-transfer {
    width: 100%;
    justify-content: center;
  }

  .stats-bar {
    grid-template-columns: 1fr;
  }

  .stat-value {
    font-size: 1.5rem;
  }

  .group-progress-section {
    flex-direction: column;
    align-items: flex-start;
  }

  .progress-details {
    width: 100%;
  }
}
</style>
