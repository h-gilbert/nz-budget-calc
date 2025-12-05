<template>
  <div class="transactions-page">
    <!-- Edit Modal -->
    <TransactionEditModal
      :isOpen="showEditModal"
      :transaction="selectedTransaction"
      :accounts="accounts"
      @close="showEditModal = false"
      @saved="handleTransactionSaved"
    />

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
          <div class="modal-content delete-modal">
            <h2>Delete Transaction</h2>
            <p class="delete-warning">
              Are you sure you want to delete this transaction?
            </p>
            <div v-if="transactionToDelete" class="delete-details">
              <div class="detail-row">
                <span class="label">Description:</span>
                <span class="value">{{ transactionToDelete.description || 'No description' }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Amount:</span>
                <span class="value" :class="transactionToDelete.transaction_type">
                  {{ transactionToDelete.transaction_type === 'income' ? '+' : '-' }}${{ formatCurrency(transactionToDelete.amount) }}
                </span>
              </div>
              <div class="detail-row">
                <span class="label">Date:</span>
                <span class="value">{{ formatDate(transactionToDelete.transaction_date) }}</span>
              </div>
            </div>
            <div class="balance-warning" v-if="transactionToDelete?.account_id">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>This will {{ transactionToDelete.transaction_type === 'income' ? 'decrease' : 'increase' }} account balance by ${{ formatCurrency(transactionToDelete.amount) }}</span>
            </div>
            <div class="modal-actions">
              <button class="btn btn-secondary" @click="showDeleteModal = false">Cancel</button>
              <button class="btn btn-danger" @click="handleDeleteConfirmed" :disabled="deleting">
                {{ deleting ? 'Deleting...' : 'Delete Transaction' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Loading & Auth States -->
    <div v-if="!userStore.isAuthenticated" class="state-message">
      <div class="state-icon">🔐</div>
      <p>Please log in to view your transactions</p>
    </div>

    <div v-else-if="isLoading" class="state-message">
      <div class="loader"></div>
      <p>Loading transactions...</p>
    </div>

    <div v-else-if="loadError" class="state-message error">
      <div class="state-icon">⚠️</div>
      <p>{{ loadError }}</p>
    </div>

    <!-- Main Content -->
    <div v-else class="page-content">
      <!-- Header -->
      <header class="page-header">
        <div class="header-title">
          <h1>Transactions</h1>
          <p class="header-subtitle">View and manage all your transactions</p>
        </div>
      </header>

      <!-- Filters Section -->
      <div class="filters-section">
        <div class="filter-group">
          <label>Account</label>
          <select v-model="filters.account_id" class="filter-select">
            <option :value="null">All Accounts</option>
            <option v-for="account in accounts" :key="account.id" :value="account.id">
              {{ account.name }}
            </option>
          </select>
        </div>

        <div class="filter-group">
          <label>Type</label>
          <select v-model="filters.transaction_type" class="filter-select">
            <option :value="null">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>

        <button class="btn-clear-filters" @click="clearFilters" v-if="filters.account_id || filters.transaction_type">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          Clear Filters
        </button>
      </div>

      <!-- Summary Stats -->
      <div class="stats-bar" v-if="transactions.length > 0">
        <div class="stat-card">
          <div class="stat-label">Total Transactions</div>
          <div class="stat-value">{{ transactions.length }}</div>
        </div>
        <div class="stat-card income">
          <div class="stat-label">Total Income</div>
          <div class="stat-value">+${{ formatCurrency(totalIncome) }}</div>
        </div>
        <div class="stat-card expense">
          <div class="stat-label">Total Expenses</div>
          <div class="stat-value">-${{ formatCurrency(totalExpenses) }}</div>
        </div>
        <div class="stat-card" :class="netAmount >= 0 ? 'income' : 'expense'">
          <div class="stat-label">Net</div>
          <div class="stat-value">{{ netAmount >= 0 ? '+' : '' }}${{ formatCurrency(netAmount) }}</div>
        </div>
      </div>

      <!-- Transactions List -->
      <div class="transactions-list">
        <div v-if="transactions.length === 0" class="empty-state">
          <div class="empty-icon">📋</div>
          <p>No transactions found</p>
          <p class="empty-subtitle">Transactions will appear here when you record income, expenses, or transfers</p>
        </div>

        <div v-else class="transactions-table">
          <div class="table-header">
            <span class="col-date">Date</span>
            <span class="col-description">Description</span>
            <span class="col-category">Category</span>
            <span class="col-account">Account</span>
            <span class="col-type">Type</span>
            <span class="col-amount">Amount</span>
            <span class="col-actions">Actions</span>
          </div>

          <div
            v-for="transaction in transactions"
            :key="transaction.id"
            class="transaction-row"
          >
            <span class="col-date">{{ formatDate(transaction.transaction_date) }}</span>
            <span class="col-description">{{ transaction.description || '-' }}</span>
            <span class="col-category">{{ transaction.category || '-' }}</span>
            <span class="col-account">{{ getAccountName(transaction.account_id) }}</span>
            <span class="col-type">
              <span class="type-badge" :class="transaction.transaction_type">
                {{ transaction.transaction_type }}
              </span>
            </span>
            <span class="col-amount" :class="transaction.transaction_type">
              {{ transaction.transaction_type === 'income' ? '+' : '-' }}${{ formatCurrency(transaction.amount) }}
            </span>
            <div class="col-actions">
              <button class="btn-icon" @click="openEditModal(transaction)" title="Edit">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button class="btn-icon btn-danger" @click="confirmDelete(transaction)" title="Delete">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { transactionAPI, accountAPI } from '@/api/client'
import TransactionEditModal from '@/components/ui/TransactionEditModal.vue'

const userStore = useUserStore()

// Loading state
const isLoading = ref(false)
const loadError = ref(null)

// Data
const transactions = ref([])
const accounts = ref([])

// Filters
const filters = ref({
  account_id: null,
  transaction_type: null
})

// Modal state
const showEditModal = ref(false)
const selectedTransaction = ref(null)
const showDeleteModal = ref(false)
const transactionToDelete = ref(null)
const deleting = ref(false)

// Computed stats
const totalIncome = computed(() => {
  return transactions.value
    .filter(t => t.transaction_type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
})

const totalExpenses = computed(() => {
  return transactions.value
    .filter(t => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
})

const netAmount = computed(() => {
  return totalIncome.value - totalExpenses.value
})

// Methods
function formatCurrency(amount) {
  return parseFloat(amount || 0).toFixed(2)
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function getAccountName(accountId) {
  if (!accountId) return '-'
  const account = accounts.value.find(a => a.id === accountId)
  return account ? account.name : '-'
}

function clearFilters() {
  filters.value = {
    account_id: null,
    transaction_type: null
  }
}

function openEditModal(transaction) {
  selectedTransaction.value = { ...transaction }
  showEditModal.value = true
}

function confirmDelete(transaction) {
  transactionToDelete.value = transaction
  showDeleteModal.value = true
}

async function handleTransactionSaved() {
  await loadTransactions()
  await loadAccounts()
}

async function handleDeleteConfirmed() {
  if (!transactionToDelete.value || deleting.value) return

  deleting.value = true
  try {
    await transactionAPI.delete(transactionToDelete.value.id)
    await loadTransactions()
    await loadAccounts()
    showDeleteModal.value = false
    transactionToDelete.value = null
  } catch (error) {
    console.error('Delete failed:', error)
  } finally {
    deleting.value = false
  }
}

async function loadTransactions() {
  try {
    const params = {}
    if (filters.value.account_id) params.account_id = filters.value.account_id
    if (filters.value.transaction_type) params.transaction_type = filters.value.transaction_type

    const response = await transactionAPI.getAll(params)
    transactions.value = response.transactions || []
  } catch (error) {
    console.error('Failed to load transactions:', error)
    loadError.value = error.message || 'Failed to load transactions'
  }
}

async function loadAccounts() {
  try {
    const response = await accountAPI.getAll()
    accounts.value = response.accounts || response || []
  } catch (error) {
    console.error('Failed to load accounts:', error)
  }
}

async function loadData() {
  if (!userStore.isAuthenticated) return

  isLoading.value = true
  loadError.value = null

  try {
    await Promise.all([loadTransactions(), loadAccounts()])
  } catch (error) {
    console.error('Failed to load data:', error)
    loadError.value = error.message || 'Failed to load data'
  } finally {
    isLoading.value = false
  }
}

// Watch filters and reload
watch(filters, () => {
  loadTransactions()
}, { deep: true })

// Watch auth state
watch(() => userStore.isAuthenticated, (isAuth) => {
  if (isAuth) {
    loadData()
  }
})

// Initial load
onMounted(async () => {
  if (userStore.isAuthenticated) {
    await loadData()
  }
})
</script>

<style scoped>
.transactions-page {
  min-height: 100vh;
  background: var(--bg-primary, #f8f7f4);
  font-family: 'Bricolage Grotesque', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.page-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

/* Header */
.page-header {
  margin-bottom: 2rem;
}

.header-title h1 {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.header-subtitle {
  color: var(--text-secondary);
  font-size: 1rem;
  margin: 0;
}

/* Filters */
.filters-section {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  align-items: flex-end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.filter-select {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 0.875rem;
  min-width: 150px;
  cursor: pointer;
}

.btn-clear-filters {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-clear-filters:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

/* Stats Bar */
.stats-bar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 1rem 1.5rem;
  border: 1px solid var(--border-light);
}

.stat-card.income .stat-value {
  color: #22c55e;
}

.stat-card.expense .stat-value {
  color: #ef4444;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

/* Transactions List */
.transactions-list {
  background: var(--bg-card);
  border-radius: 16px;
  border: 1px solid var(--border-light);
  overflow: hidden;
}

.transactions-table {
  width: 100%;
}

.table-header {
  display: grid;
  grid-template-columns: 100px 1fr 120px 120px 90px 100px 80px;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.transaction-row {
  display: grid;
  grid-template-columns: 100px 1fr 120px 120px 90px 100px 80px;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-light);
  align-items: center;
  transition: background 0.2s ease;
}

.transaction-row:last-child {
  border-bottom: none;
}

.transaction-row:hover {
  background: var(--bg-hover);
}

.col-description {
  font-weight: 500;
  color: var(--text-primary);
}

.col-category,
.col-account,
.col-date {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.col-amount {
  font-weight: 600;
  text-align: right;
}

.col-amount.income {
  color: #22c55e;
}

.col-amount.expense {
  color: #ef4444;
}

.col-amount.transfer {
  color: var(--primary-teal);
}

.type-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
}

.type-badge.income {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.type-badge.expense {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.type-badge.transfer {
  background: rgba(20, 184, 166, 0.1);
  color: var(--primary-teal);
}

.col-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.btn-icon {
  padding: 0.5rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.btn-icon.btn-danger:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

/* Empty State */
.empty-state {
  padding: 4rem 2rem;
  text-align: center;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-state p {
  color: var(--text-secondary);
  margin: 0;
}

.empty-subtitle {
  font-size: 0.875rem;
  margin-top: 0.5rem !important;
}

/* Loading & Auth States */
.state-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 1rem;
  color: var(--text-secondary);
}

.state-icon {
  font-size: 3rem;
}

.state-message.error {
  color: #ef4444;
}

.loader {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-light);
  border-top-color: var(--primary-teal);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Delete Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: var(--bg-card);
  border-radius: 20px;
  padding: 2rem;
  max-width: 450px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.delete-modal h2 {
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  color: var(--text-primary);
}

.delete-warning {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

.delete-details {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
}

.detail-row .label {
  color: var(--text-secondary);
}

.detail-row .value {
  font-weight: 500;
  color: var(--text-primary);
}

.detail-row .value.income {
  color: #22c55e;
}

.detail-row .value.expense {
  color: #ef4444;
}

.balance-warning {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(234, 179, 8, 0.1);
  border: 1px solid rgba(234, 179, 8, 0.3);
  border-radius: 8px;
  margin-bottom: 1.5rem;
  color: #ca8a04;
  font-size: 0.875rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
}

.btn {
  flex: 1;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  font-size: 0.95rem;
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

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

/* Responsive */
@media (max-width: 900px) {
  .table-header {
    display: none;
  }

  .transaction-row {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
  }

  .transaction-row::before {
    content: attr(data-date);
  }

  .col-description {
    font-size: 1rem;
  }

  .col-actions {
    width: 100%;
    justify-content: flex-start;
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--border-light);
  }
}

@media (max-width: 600px) {
  .page-content {
    padding: 1rem;
  }

  .filters-section {
    flex-direction: column;
  }

  .filter-group {
    width: 100%;
  }

  .filter-select {
    width: 100%;
  }

  .stats-bar {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
