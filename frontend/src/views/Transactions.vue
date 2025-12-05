<template>
  <div class="transactions-page">
    <!-- Edit Modal -->
    <PaymentEditModal
      :isOpen="showEditModal"
      :payment="selectedPayment"
      @close="showEditModal = false"
      @saved="handlePaymentSaved"
    />

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
          <div class="modal-content delete-modal">
            <h2>Delete Payment</h2>
            <p class="delete-warning">
              Are you sure you want to delete this payment?
            </p>
            <div v-if="paymentToDelete" class="delete-details">
              <div class="detail-row">
                <span class="label">Expense:</span>
                <span class="value">{{ paymentToDelete.expenseName }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Amount Paid:</span>
                <span class="value expense">${{ formatCurrency(paymentToDelete.amountPaid) }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Date:</span>
                <span class="value">{{ formatDate(paymentToDelete.paymentDate) }}</span>
              </div>
            </div>
            <div class="balance-warning">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>This will restore ${{ formatCurrency(paymentToDelete?.amountPaid || 0) }} to the expense's sub-account balance</span>
            </div>
            <div class="modal-actions">
              <button class="btn btn-secondary" @click="showDeleteModal = false">Cancel</button>
              <button class="btn btn-danger" @click="handleDeleteConfirmed" :disabled="deleting">
                {{ deleting ? 'Deleting...' : 'Delete Payment' }}
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
          <p class="header-subtitle">View and manage all your payment history</p>
        </div>
      </header>

      <!-- Summary Stats -->
      <div class="stats-bar" v-if="payments.length > 0">
        <div class="stat-card">
          <div class="stat-label">Total Payments</div>
          <div class="stat-value">{{ payments.length }}</div>
        </div>
        <div class="stat-card expense">
          <div class="stat-label">Total Paid</div>
          <div class="stat-value">${{ formatCurrency(totalPaid) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Automatic</div>
          <div class="stat-value">{{ automaticCount }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Manual</div>
          <div class="stat-value">{{ manualCount }}</div>
        </div>
      </div>

      <!-- Payments List -->
      <div class="transactions-list">
        <div v-if="payments.length === 0" class="empty-state">
          <div class="empty-icon">📋</div>
          <p>No transactions found</p>
          <p class="empty-subtitle">Transactions will appear here when you record expense payments</p>
        </div>

        <div v-else class="transactions-table">
          <div class="table-header">
            <span class="col-date">Date</span>
            <span class="col-expense">Expense</span>
            <span class="col-due">Due Date</span>
            <span class="col-type">Type</span>
            <span class="col-amount">Amount Paid</span>
            <span class="col-actions">Actions</span>
          </div>

          <div
            v-for="payment in payments"
            :key="payment.id"
            class="transaction-row"
            :class="{ 'went-negative': payment.wentNegative }"
          >
            <span class="col-date">{{ formatDate(payment.paymentDate) }}</span>
            <span class="col-expense">{{ payment.expenseName }}</span>
            <span class="col-due">{{ formatDate(payment.dueDate) }}</span>
            <span class="col-type">
              <span class="type-badge" :class="payment.paymentType">
                {{ payment.paymentType }}
              </span>
            </span>
            <span class="col-amount">
              <span class="amount-value" :class="{ 'went-negative': payment.wentNegative }">${{ formatCurrency(payment.amountPaid) }}</span>
              <span class="amount-expected" v-if="payment.amountPaid !== payment.amountDue">
                (expected: ${{ formatCurrency(payment.amountDue) }})
              </span>
            </span>
            <div class="col-actions">
              <button class="btn-icon" @click="openEditModal(payment)" title="Edit">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button class="btn-icon btn-danger" @click="confirmDelete(payment)" title="Delete">
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
import { paymentAPI } from '@/api/client'
import PaymentEditModal from '@/components/ui/PaymentEditModal.vue'

const userStore = useUserStore()

// Loading state
const isLoading = ref(false)
const loadError = ref(null)

// Data
const payments = ref([])

// Modal state
const showEditModal = ref(false)
const selectedPayment = ref(null)
const showDeleteModal = ref(false)
const paymentToDelete = ref(null)
const deleting = ref(false)

// Computed stats
const totalPaid = computed(() => {
  return payments.value.reduce((sum, p) => sum + p.amountPaid, 0)
})

const automaticCount = computed(() => {
  return payments.value.filter(p => p.paymentType === 'automatic').length
})

const manualCount = computed(() => {
  return payments.value.filter(p => p.paymentType === 'manual').length
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

function openEditModal(payment) {
  selectedPayment.value = { ...payment }
  showEditModal.value = true
}

function confirmDelete(payment) {
  paymentToDelete.value = payment
  showDeleteModal.value = true
}

async function handlePaymentSaved() {
  await loadPayments()
}

async function handleDeleteConfirmed() {
  if (!paymentToDelete.value || deleting.value) return

  deleting.value = true
  try {
    await paymentAPI.delete(paymentToDelete.value.id)
    await loadPayments()
    showDeleteModal.value = false
    paymentToDelete.value = null
  } catch (error) {
    console.error('Delete failed:', error)
  } finally {
    deleting.value = false
  }
}

async function loadPayments() {
  try {
    const response = await paymentAPI.getHistory({ limit: 100 })
    payments.value = response.payments || []
  } catch (error) {
    console.error('Failed to load payments:', error)
    loadError.value = error.message || 'Failed to load payments'
  }
}

async function loadData() {
  if (!userStore.isAuthenticated) return

  isLoading.value = true
  loadError.value = null

  try {
    await loadPayments()
  } catch (error) {
    console.error('Failed to load data:', error)
    loadError.value = error.message || 'Failed to load data'
  } finally {
    isLoading.value = false
  }
}

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
  grid-template-columns: 100px 1fr 100px 100px 150px 80px;
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
  grid-template-columns: 100px 1fr 100px 100px 150px 80px;
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

.transaction-row.went-negative {
  background: rgba(239, 68, 68, 0.05);
}

.col-expense {
  font-weight: 500;
  color: var(--text-primary);
}

.col-date,
.col-due {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.col-amount {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.amount-value {
  font-weight: 600;
  color: var(--text-primary);
}

.amount-value.went-negative {
  color: #ef4444;
}

.amount-expected {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.type-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
}

.type-badge.automatic {
  background: rgba(20, 184, 166, 0.1);
  color: var(--primary-teal);
}

.type-badge.manual {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
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

.detail-row .value.expense {
  color: #ef4444;
}

.balance-warning {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 8px;
  margin-bottom: 1.5rem;
  color: #22c55e;
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

  .col-expense {
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

  .stats-bar {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
