<template>
  <div class="calculator-page">
    <div class="calculator-container">
      <div class="calculator-header">
        <h1>Budget Setup</h1>
        <p class="subtitle">Set up your income, expenses, and accounts</p>
      </div>

      <!-- Main Calculator Sections -->
      <div class="calculator-sections">
        <!-- Section 1: Income & Deductions -->
        <div class="section-card">
          <div class="section-header" @click="toggleSection('income')">
            <div class="section-title">
              <div class="section-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <h2>1. Income & Deductions</h2>
            </div>
            <button class="toggle-btn" :class="{ expanded: expandedSections.income }">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          </div>

          <div v-show="expandedSections.income" class="section-content">
            <div class="form-grid">
              <div class="form-group">
                <label for="pay-amount">Pay Amount</label>
                <div class="input-with-prefix">
                  <span class="prefix">$</span>
                  <input
                    id="pay-amount"
                    v-model="budgetStore.payAmount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div class="form-group">
                <label for="pay-type">Pay Frequency</label>
                <select id="pay-type" v-model="budgetStore.payType">
                  <option value="hourly">Hourly</option>
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                  <option value="annually">Annual Salary</option>
                </select>
              </div>

              <div v-if="budgetStore.payType === 'hourly'" class="form-group">
                <label for="fixed-hours">Hours per Week</label>
                <input
                  id="fixed-hours"
                  v-model="budgetStore.fixedHours"
                  type="number"
                  step="0.5"
                  placeholder="40"
                />
              </div>

              <div class="form-group">
                <label for="allowance-amount">Additional Allowance</label>
                <div class="input-with-prefix">
                  <span class="prefix">$</span>
                  <input
                    id="allowance-amount"
                    v-model="budgetStore.allowanceAmount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div class="form-group">
                <label for="allowance-frequency">Allowance Frequency</label>
                <select id="allowance-frequency" v-model="budgetStore.allowanceFrequency">
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
            </div>

            <div class="deductions-section">
              <h3>Deductions</h3>
              <div class="checkboxes-grid">
                <label class="checkbox-label">
                  <input
                    id="kiwisaver"
                    v-model="budgetStore.kiwisaver"
                    type="checkbox"
                  />
                  <span>Contributing to KiwiSaver</span>
                </label>

                <div v-if="budgetStore.kiwisaver" class="form-group">
                  <label for="kiwisaver-rate">KiwiSaver Rate</label>
                  <select id="kiwisaver-rate" v-model="budgetStore.kiwisaverRate">
                    <option value="3">3%</option>
                    <option value="4">4%</option>
                    <option value="6">6%</option>
                    <option value="8">8%</option>
                    <option value="10">10%</option>
                  </select>
                </div>

                <label class="checkbox-label">
                  <input
                    id="student-loan"
                    v-model="budgetStore.studentLoan"
                    type="checkbox"
                  />
                  <span>Have a student loan</span>
                </label>

                <label class="checkbox-label">
                  <input
                    id="ietc"
                    v-model="budgetStore.ietcEligible"
                    type="checkbox"
                  />
                  <span>Eligible for IETC</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Section 2: Expenses -->
        <div class="section-card">
          <div class="section-header" @click="toggleSection('expenses')">
            <div class="section-title">
              <div class="section-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                  <line x1="2" y1="10" x2="22" y2="10"></line>
                </svg>
              </div>
              <h2>2. Expenses</h2>
            </div>
            <button class="toggle-btn" :class="{ expanded: expandedSections.expenses }">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          </div>

          <div v-show="expandedSections.expenses" class="section-content">
            <div class="section-actions">
              <p class="help-text">Track your regular expenses in any period - we'll calculate the weekly total</p>
              <Button variant="secondary" size="sm" @click="handleAddExpense">
                Add Expense
              </Button>
            </div>

            <div v-if="budgetStore.expenses.length === 0" class="empty-state">
              No expenses added yet. Click "Add Expense" to get started.
            </div>

            <div v-else class="expenses-list">
              <div
                v-for="expense in budgetStore.expenses"
                :key="expense.id"
                class="expense-item"
              >
                <div class="expense-fields">
                  <div class="form-group">
                    <label>Name</label>
                    <input
                      :value="expense.name"
                      type="text"
                      placeholder="e.g., Rent, Groceries"
                      @input="budgetStore.updateExpense(expense.id, 'name', $event.target.value)"
                    />
                  </div>
                  <div class="form-group">
                    <label>Amount</label>
                    <div class="input-with-prefix">
                      <span class="prefix">$</span>
                      <input
                        :value="expense.amount"
                        type="number"
                        step="0.01"
                        @input="budgetStore.updateExpense(expense.id, 'amount', parseFloat($event.target.value) || 0)"
                      />
                    </div>
                  </div>
                  <div class="form-group">
                    <label>Frequency</label>
                    <select
                      :value="expense.frequency"
                      @change="budgetStore.updateExpense(expense.id, 'frequency', $event.target.value)"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="fortnightly">Fortnightly</option>
                      <option value="monthly">Monthly</option>
                      <option value="annually">Annually</option>
                    </select>
                  </div>
                  <div v-if="expense.frequency === 'monthly' || expense.frequency === 'annually'" class="form-group">
                    <label>Next Due Date</label>
                    <input
                      :value="expense.date"
                      type="date"
                      @input="budgetStore.updateExpense(expense.id, 'date', $event.target.value)"
                    />
                  </div>
                </div>
                <button class="btn-remove" @click="budgetStore.removeExpense(expense.id)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>

              <div class="expenses-total">
                <strong>Total Weekly Expenses: ${{ budgetStore.totalExpenses.toFixed(2) }}</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- Section 3: Accounts -->
        <div class="section-card">
          <div class="section-header" @click="toggleSection('accounts')">
            <div class="section-title">
              <div class="section-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                  <line x1="1" y1="10" x2="23" y2="10"></line>
                </svg>
              </div>
              <h2>3. Accounts</h2>
            </div>
            <button class="toggle-btn" :class="{ expanded: expandedSections.accounts }">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          </div>

          <div v-show="expandedSections.accounts" class="section-content">
            <div class="section-actions">
              <p class="help-text">Define your accounts and starting balances</p>
              <Button variant="secondary" size="sm" @click="handleAddAccount">
                Add Account
              </Button>
            </div>

            <div v-if="budgetStore.accounts.length === 0" class="empty-state">
              No accounts added yet. Click "Add Account" to get started.
            </div>

            <div v-else class="accounts-list">
              <div
                v-for="account in budgetStore.accounts"
                :key="account.id"
                class="account-item"
              >
                <div class="account-fields">
                  <div class="form-group">
                    <label>Account Name</label>
                    <input
                      :value="account.name"
                      type="text"
                      placeholder="e.g., Emergency Fund"
                      @input="budgetStore.updateAccount(account.id, 'name', $event.target.value)"
                    />
                  </div>
                  <div class="form-group">
                    <label>Starting Balance</label>
                    <div class="input-with-prefix">
                      <span class="prefix">$</span>
                      <input
                        :value="account.balance"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        @input="budgetStore.updateAccount(account.id, 'balance', parseFloat($event.target.value) || 0)"
                      />
                    </div>
                    <small v-if="account.isExpenseAccount" class="field-hint">{{ account.sub_accounts && account.sub_accounts.length > 0 ? 'Total balance across all sub-accounts' : 'Current balance in this account. If using safety buffer, this should ideally cover first 2 weeks of expenses' }}</small>
                  </div>
                  <div v-if="!account.isExpenseAccount" class="form-group">
                    <label>Target Balance</label>
                    <div class="input-with-prefix">
                      <span class="prefix">$</span>
                      <input
                        :value="account.target"
                        type="number"
                        step="0.01"
                        placeholder="Optional"
                        @input="budgetStore.updateAccount(account.id, 'target', $event.target.value ? parseFloat($event.target.value) : null)"
                      />
                    </div>
                  </div>
                  <div class="form-group">
                    <label class="checkbox-label">
                      <input
                        type="checkbox"
                        :checked="account.isExpenseAccount"
                        @change="budgetStore.updateAccount(account.id, 'isExpenseAccount', $event.target.checked)"
                      />
                      Expense Account
                    </label>
                  </div>

                  <!-- Transfer Planning Fields (shown only for expense account) -->
                  <template v-if="account.isExpenseAccount">
                    <div class="form-group">
                      <label>Planning Start Date</label>
                      <input
                        :value="account.startingBalanceDate ?? ''"
                        type="date"
                        @input="budgetStore.updateAccount(account.id, 'startingBalanceDate', $event.target.value)"
                      />
                      <small class="field-hint">Date for calculating catch-up transfers (defaults to next Monday)</small>
                    </div>
                    <div class="form-group checkbox-group">
                      <label class="checkbox-label">
                        <input
                          type="checkbox"
                          :checked="account.isWeekAhead"
                          @change="budgetStore.updateAccount(account.id, 'isWeekAhead', $event.target.checked)"
                        />
                        <span>Maintain 1-week safety buffer</span>
                      </label>
                      <small class="field-hint">Recommended: Always keep next week's expenses ready in your account to avoid late payment issues</small>
                    </div>
                  </template>
                </div>
                <button class="btn-remove" @click="budgetStore.removeAccount(account.id)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>

                <!-- Sub-Accounts Section (Auto-generated) -->
                <div v-if="account.isExpenseAccount" class="sub-accounts-section">
                  <div class="sub-accounts-header">
                    <h4>Expense Funds (Auto-Generated)</h4>
                    <small class="text-muted">Each expense automatically gets its own dedicated fund</small>
                  </div>

                  <div v-if="!account.sub_accounts || account.sub_accounts.length === 0" class="sub-accounts-empty">
                    <p>No expense funds yet. Add expenses above and a dedicated fund will be created automatically for each one.</p>
                  </div>

                  <div v-else class="sub-accounts-list sub-accounts-readonly">
                    <div
                      v-for="subAccount in account.sub_accounts"
                      :key="subAccount.id"
                      class="sub-account-item readonly"
                    >
                      <div class="sub-account-display">
                        <div class="sub-account-name">{{ subAccount.name || 'Unnamed Expense' }}</div>
                        <div class="sub-account-balance">
                          <label>Current Balance:</label>
                          <div class="input-with-prefix">
                            <span class="prefix">$</span>
                            <input
                              :value="subAccount.balance"
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              @input="budgetStore.updateSubAccount(account.id, subAccount.id, 'balance', parseFloat($event.target.value) || 0)"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <small class="text-muted">💡 Tip: When you delete an expense, its fund is automatically removed too.</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Section 4: Save Budget -->
        <div v-if="userStore.isAuthenticated" class="section-card calculate-section">
          <div class="section-header">
            <div class="section-title">
              <div class="section-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
              </div>
              <h2>4. Save Budget</h2>
            </div>
          </div>

          <div class="section-content">
            <div class="summary-grid">
              <div class="summary-card">
                <div class="summary-label">Income</div>
                <div class="summary-value">${{ budgetStore.payAmount || 0 }} {{ budgetStore.payType }}</div>
              </div>
              <div class="summary-card">
                <div class="summary-label">Expenses</div>
                <div class="summary-value">{{ budgetStore.expenses.length }} items</div>
              </div>
              <div class="summary-card">
                <div class="summary-label">Accounts</div>
                <div class="summary-value">{{ budgetStore.accounts.length }} defined</div>
              </div>
            </div>

            <div class="calculate-actions">
              <button class="btn btn-primary btn-large" @click="navigateToDashboard">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
                Go to Dashboard
              </button>

              <button class="btn btn-secondary" @click="showSaveModal = true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                Save Budget
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Results Section -->
      <div v-if="budgetStore.hasCalculated" class="results-section">
        <h2>Your Budget Results</h2>
        <div class="results-grid">
          <div class="result-card">
            <div class="result-label">Weekly Gross</div>
            <div class="result-value">${{ budgetStore.weeklyGrossIncome?.toFixed(2) || '0.00' }}</div>
          </div>
          <div class="result-card">
            <div class="result-label">Weekly Net</div>
            <div class="result-value">${{ budgetStore.weeklyNetIncome?.toFixed(2) || '0.00' }}</div>
          </div>
          <div class="result-card">
            <div class="result-label">After Expenses</div>
            <div class="result-value">${{ budgetStore.weeklyDiscretionary?.toFixed(2) || '0.00' }}</div>
          </div>
        </div>
      </div>

      <!-- Saved Budgets (only if logged in) -->
      <div v-if="userStore.isAuthenticated && userStore.savedBudgets.length > 0" class="saved-budgets-section">
        <h3>Your Saved Budgets</h3>
        <div class="budgets-list">
          <div
            v-for="budget in userStore.savedBudgets"
            :key="budget.id"
            class="budget-card"
            @click="loadBudget(budget.id)"
          >
            <div class="budget-info">
              <h4>{{ budget.budget_name }}</h4>
              <p>Last updated: {{ formatDate(budget.updated_at) }}</p>
            </div>
            <div class="budget-actions">
              <button class="btn-icon" @click.stop="deleteBudget(budget.id)" title="Delete budget">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Save Budget Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showSaveModal" class="modal-overlay" @click.self="showSaveModal = false">
          <div class="modal-content">
            <button class="modal-close" @click="showSaveModal = false">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <h2>Save Budget</h2>
            <div class="form-group">
              <label for="budget-name">Budget Name</label>
              <input
                id="budget-name"
                v-model="budgetStore.budgetName"
                type="text"
                placeholder="e.g., Monthly Budget"
              />
            </div>

            <label class="checkbox-label">
              <input
                id="set-default"
                v-model="budgetStore.setAsDefault"
                type="checkbox"
              />
              <span>Set as default budget</span>
            </label>

            <div class="modal-actions">
              <button class="btn btn-primary" @click="saveBudget" :disabled="!budgetStore.budgetName">
                Save Budget
              </button>
              <button class="btn btn-secondary" @click="showSaveModal = false">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useBudgetStore } from '@stores/budget'
import { useUserStore } from '@stores/user'
import { useNotificationStore } from '@stores/notification'
import { budgetAPI } from '@api/client'
import Button from '@components/ui/Button.vue'

const router = useRouter()
const budgetStore = useBudgetStore()
const userStore = useUserStore()
const notificationStore = useNotificationStore()

const expandedSections = reactive({
  income: false,
  expenses: false,
  accounts: false
})

const showSaveModal = ref(false)

function toggleSection(section) {
  expandedSections[section] = !expandedSections[section]
}

function handleAddExpense() {
  budgetStore.addExpense()
  expandedSections.expenses = true
}

function handleAddAccount() {
  budgetStore.addAccount()
  expandedSections.accounts = true
}

function navigateToDashboard() {
  router.push('/dashboard')
}

async function saveBudget() {
  if (!userStore.isAuthenticated) {
    console.warn('Please login to save budgets')
    return
  }

  if (!budgetStore.budgetName) {
    console.warn('Please enter a budget name')
    return
  }

  try {
    notificationStore.setSaving()
    const budgetData = budgetStore.getBudgetData()

    // budgetData includes budgetId if editing existing budget
    // Backend will update existing or create new based on budgetId presence
    const result = await budgetAPI.save(budgetData)

    // Store the budget ID (for new budgets or confirm existing ID)
    if (result && result.budgetId) {
      budgetStore.budgetId = result.budgetId
    }

    notificationStore.setSaved()
    showSaveModal.value = false
    await loadUserBudgets()
  } catch (error) {
    notificationStore.setError(error.message || 'Failed to save budget')
  }
}

async function loadBudget(id) {
  try {
    isLoadingBudget.value = true // Prevent auto-save during load
    notificationStore.startLoading()
    const data = await budgetAPI.load(id)
    budgetStore.loadBudgetData(data)
    budgetStore.migrateExpensesToSubAccounts()
    console.log('✓ Budget loaded successfully')
  } catch (error) {
    notificationStore.setError(error.message || 'Failed to load budget')
  } finally {
    notificationStore.stopLoading()
    // Small delay to ensure watch doesn't trigger before flag is checked
    setTimeout(() => {
      isLoadingBudget.value = false
    }, 100)
  }
}

async function deleteBudget(id) {
  if (!confirm('Are you sure you want to delete this budget?')) return

  try {
    notificationStore.startLoading()
    await budgetAPI.delete(id)
    console.log('✓ Budget deleted successfully')
    await loadUserBudgets()
  } catch (error) {
    notificationStore.setError(error.message || 'Failed to delete budget')
  } finally {
    notificationStore.stopLoading()
  }
}

async function loadUserBudgets() {
  if (!userStore.isAuthenticated) return

  try {
    const response = await budgetAPI.getAll()
    if (response && response.budgets) {
      userStore.setSavedBudgets(response.budgets)
    }
  } catch (error) {
    console.error('Failed to load budgets:', error)
  }
}

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-NZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

async function loadDefaultBudget() {
  if (!userStore.isAuthenticated) return

  try {
    isLoadingBudget.value = true // Prevent auto-save during load
    const defaultBudget = await budgetAPI.load()
    if (defaultBudget) {
      budgetStore.loadBudgetData(defaultBudget)
      budgetStore.migrateExpensesToSubAccounts()
    }
  } catch (error) {
    console.error('Failed to load default budget:', error)
  } finally {
    // Small delay to ensure watch doesn't trigger before flag is checked
    setTimeout(() => {
      isLoadingBudget.value = false
    }, 100)
  }
}

onMounted(async () => {
  // Load data if already authenticated
  if (userStore.isAuthenticated) {
    await loadUserBudgets()
    await loadDefaultBudget()
  }
})

// Watch for authentication changes and load data when user logs in
watch(() => userStore.isAuthenticated, async (isAuth) => {
  if (isAuth) {
    await loadUserBudgets()
    await loadDefaultBudget()
  }
})

// Auto-save functionality
const hasUnsavedChanges = ref(false)
const autoSaveTimeout = ref(null)
const isSaving = ref(false)
const isLoadingBudget = ref(false) // Flag to prevent auto-save during budget load

// Debounced auto-save function
async function autoSave() {
  if (!userStore.isAuthenticated || !budgetStore.budgetName || isSaving.value) {
    return
  }

  try {
    isSaving.value = true
    notificationStore.setSaving()

    const budgetData = budgetStore.getBudgetData()

    // budgetData already includes budgetId from getBudgetData()
    // The backend /api/budget/save endpoint handles both create and update
    // based on whether budgetId is present
    const result = await budgetAPI.save(budgetData)

    // Store the budget ID for new budgets (will be the same for updates)
    if (result && result.budgetId) {
      budgetStore.budgetId = result.budgetId
    }

    hasUnsavedChanges.value = false
    notificationStore.setSaved()
  } catch (error) {
    notificationStore.setError(error.message || 'Failed to save')
  } finally {
    isSaving.value = false
  }
}

// Trigger auto-save with debounce
function triggerAutoSave() {
  if (!userStore.isAuthenticated || isLoadingBudget.value) {
    return // Don't auto-save while loading a budget
  }

  hasUnsavedChanges.value = true

  // Clear existing timeout
  if (autoSaveTimeout.value) {
    clearTimeout(autoSaveTimeout.value)
  }

  // Set new timeout for auto-save after 1.5 seconds of inactivity
  autoSaveTimeout.value = setTimeout(() => {
    autoSave()
  }, 1500)
}

// Watch for changes in budget store and trigger auto-save
watch(
  () => [
    budgetStore.payAmount,
    budgetStore.payType,
    budgetStore.hoursType,
    budgetStore.fixedHours,
    budgetStore.kiwisaver,
    budgetStore.kiwisaverRate,
    budgetStore.studentLoan,
    budgetStore.expenses,
    budgetStore.accounts,
    budgetStore.allowanceAmount,
    budgetStore.ietcEligible
  ],
  () => {
    triggerAutoSave()
  },
  { deep: true }
)
</script>

<style scoped>
.calculator-page {
  min-height: 100vh;
  padding: 2rem;
  background: var(--bg-primary);
}

.calculator-container {
  max-width: 1000px;
  margin: 0 auto;
}

.calculator-header {
  text-align: center;
  margin-bottom: 3rem;
}

.calculator-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary-teal), var(--primary-blue));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 1.125rem;
}

.calculator-sections {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-card {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all 0.3s ease;
}

.section-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  cursor: pointer;
  background: var(--bg-secondary);
  transition: background 0.2s ease;
}

.section-header:hover {
  background: var(--bg-hover);
}

.calculate-section .section-header {
  cursor: default;
  background: linear-gradient(135deg, var(--pastel-mint), var(--pastel-lavender));
}

.calculate-section .section-header:hover {
  background: linear-gradient(135deg, var(--pastel-mint), var(--pastel-lavender));
}

.section-title {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.section-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, var(--primary-teal), var(--primary-blue));
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.section-title h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.toggle-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  color: var(--text-secondary);
  transition: all 0.3s ease;
}

.toggle-btn.expanded {
  transform: rotate(180deg);
}

.section-content {
  padding: 2rem 1.5rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-primary);
}

.input-with-prefix {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-prefix .prefix {
  position: absolute;
  left: 1rem;
  color: var(--text-secondary);
  font-weight: 500;
  pointer-events: none;
}

.input-with-prefix input {
  padding-left: 2rem;
}

.deductions-section {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border-light);
}

.deductions-section h3 {
  font-size: 1.125rem;
  margin-bottom: 1rem;
}

.checkboxes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  padding: 0.75rem;
  border-radius: 8px;
  transition: background 0.2s ease;
}

.checkbox-label:hover {
  background: var(--bg-hover);
}

.checkbox-label input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.section-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.help-text {
  color: var(--text-secondary);
  margin: 0;
}

.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  color: var(--text-secondary);
  background: var(--bg-hover);
  border-radius: 12px;
}

.expenses-list,
.accounts-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.expense-item,
.account-item {
  padding: 1.5rem;
  background: var(--bg-hover);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.account-item > div:first-child {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.expense-fields {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  align-items: start;
}

.account-fields {
  flex: 1;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  gap: 1rem;
  align-items: start;
}

.btn-remove {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s ease;
  margin-top: 1.5rem;
}

.btn-remove:hover {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger-red);
}

/* Sub-Accounts Styles */
.sub-accounts-section {
  width: 100%;
  padding: 1.25rem;
  background: var(--bg-primary);
  border-radius: 8px;
  border-left: 3px solid var(--primary-teal);
}

.sub-accounts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.sub-accounts-header h4 {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.sub-accounts-empty {
  padding: 1.5rem;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.9rem;
  background: var(--bg-hover);
  border-radius: 6px;
}

.sub-accounts-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.sub-account-item {
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  border: 1px solid rgba(45, 212, 191, 0.1);
}

.sub-account-fields {
  flex: 1;
  display: grid;
  grid-template-columns: 2fr 1.5fr auto;
  gap: 0.75rem;
  align-items: start;
}

.btn-remove-sub {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0.4rem;
  border-radius: 4px;
  transition: all 0.2s ease;
  margin-top: 1.5rem;
  opacity: 0.6;
}

.btn-remove-sub:hover {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger-red);
  opacity: 1;
}

.expenses-total {
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  text-align: right;
  font-size: 1.125rem;
  margin-top: 1rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.summary-card {
  padding: 1.5rem;
  background: var(--bg-hover);
  border-radius: 12px;
  text-align: center;
}

.summary-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.summary-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--primary-teal);
}

.calculate-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.results-section {
  margin-top: 3rem;
  padding: 2rem;
  background: linear-gradient(135deg, var(--pastel-mint), var(--pastel-lavender));
  border-radius: 16px;
}

.results-section h2 {
  text-align: center;
  font-size: 1.75rem;
  margin-bottom: 2rem;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.result-card {
  background: var(--bg-card);
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
}

.result-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.result-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--primary-teal);
  font-family: var(--font-mono);
}

.saved-budgets-section {
  margin-top: 3rem;
  padding: 2rem;
  background: var(--bg-card);
  border-radius: 16px;
  border: 1px solid var(--border-light);
}

.saved-budgets-section h3 {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
}

.budgets-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.budget-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem;
  background: var(--bg-hover);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.budget-card:hover {
  background: var(--bg-secondary);
  transform: translateX(4px);
}

.budget-info h4 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.budget-info p {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

.budget-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-icon {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  color: var(--text-secondary);
  border-radius: 6px;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background: var(--bg-primary);
  color: var(--danger-red);
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  position: relative;
  background: var(--bg-card);
  border-radius: 20px;
  padding: 2.5rem;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.modal-content h2 {
  margin-bottom: 1.5rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.modal-actions .btn {
  flex: 1;
}

/* Modal transitions */
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

@media (max-width: 768px) {
  .calculator-page {
    padding: 1rem;
  }

  .calculator-header h1 {
    font-size: 2rem;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .expense-fields,
  .account-fields {
    grid-template-columns: 1fr;
  }

  .btn-remove {
    margin-top: 0;
  }

  .summary-grid,
  .results-grid {
    grid-template-columns: 1fr;
  }

  .calculate-actions {
    flex-direction: column;
  }

  .calculate-actions .btn {
    width: 100%;
  }
}
</style>
