<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click.self="close">
        <div class="modal-content">
          <button class="modal-close" @click="close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <h2>Record Payment</h2>

          <div class="expense-info">
            <div class="expense-name">{{ expense?.name }}</div>
            <div class="expense-meta">
              Expected: {{ formatCurrency(expense?.amount) }}
              <span v-if="expense?.frequency">/ {{ expense?.frequency }}</span>
            </div>
          </div>

          <div class="balance-info">
            <div class="balance-row">
              <span class="label">Current Sub-Account Balance:</span>
              <span class="value" :class="{ negative: currentBalance < 0 }">
                {{ formatCurrency(currentBalance) }}
              </span>
            </div>
            <div class="balance-row">
              <span class="label">After Payment:</span>
              <span class="value" :class="{ negative: balanceAfter < 0 }">
                {{ formatCurrency(balanceAfter) }}
              </span>
            </div>
          </div>

          <div class="form-group">
            <label>Payment Amount</label>
            <div class="amount-input-wrapper">
              <span class="currency-symbol">$</span>
              <input
                v-model.number="paymentAmount"
                type="number"
                step="0.01"
                min="0"
                @input="updateBalancePreview"
              />
            </div>
            <div v-if="variance !== 0" class="variance-info" :class="{ positive: variance > 0, negative: variance < 0 }">
              <span v-if="variance > 0">+{{ formatCurrency(variance) }} more than expected</span>
              <span v-else>{{ formatCurrency(variance) }} less than expected</span>
            </div>
          </div>

          <div v-if="balanceAfter < 0" class="warning-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>This payment will result in a negative balance of {{ formatCurrency(balanceAfter) }}</span>
          </div>

          <div class="form-group">
            <label>Notes (optional)</label>
            <textarea
              v-model="notes"
              rows="2"
              placeholder="e.g., Paid early, got discount"
            ></textarea>
          </div>

          <div class="modal-actions">
            <button class="btn btn-secondary" @click="close">Cancel</button>
            <button class="btn btn-primary" @click="confirmPayment" :disabled="processing">
              {{ processing ? 'Recording...' : 'Record Payment' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useBudgetStore } from '@/stores/budget'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  expense: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'payment-recorded'])

const budgetStore = useBudgetStore()
const paymentAmount = ref(0)
const notes = ref('')
const processing = ref(false)

// Current balance of the expense's sub-account
const currentBalance = computed(() => {
  if (!props.expense) return 0
  const exp = budgetStore.expenses.find(e => e.id === props.expense.id)
  return exp?.sub_account?.balance || 0
})

// Balance after payment
const balanceAfter = computed(() => {
  return currentBalance.value - paymentAmount.value
})

// Variance from expected amount
const variance = computed(() => {
  if (!props.expense) return 0
  return paymentAmount.value - props.expense.amount
})

// Format currency
function formatCurrency(value) {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD'
  }).format(value || 0)
}

// Update balance preview
function updateBalancePreview() {
  // This is handled by computed properties
}

// Close modal
function close() {
  emit('close')
}

// Confirm payment
async function confirmPayment() {
  if (!props.expense || processing.value) return

  processing.value = true
  try {
    await budgetStore.processExpensePayment(props.expense.id, {
      amount: paymentAmount.value,
      paymentType: 'manual',
      notes: notes.value
    })
    emit('payment-recorded', {
      expenseId: props.expense.id,
      amount: paymentAmount.value,
      notes: notes.value
    })
    close()
  } catch (error) {
    console.error('Error recording payment:', error)
  } finally {
    processing.value = false
  }
}

// Reset form when expense changes
watch(() => props.expense, (newExpense) => {
  if (newExpense) {
    paymentAmount.value = newExpense.amount || 0
    notes.value = ''
  }
}, { immediate: true })

// Reset when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen && props.expense) {
    paymentAmount.value = props.expense.amount || 0
    notes.value = ''
  }
})
</script>

<style scoped>
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
  position: relative;
  background: var(--bg-card);
  border-radius: 20px;
  padding: 2rem;
  max-width: 450px;
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

h2 {
  margin: 0 0 1.5rem 0;
  font-size: 1.5rem;
  color: var(--text-primary);
}

.expense-info {
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 12px;
  margin-bottom: 1rem;
}

.expense-name {
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.expense-meta {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.balance-info {
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 12px;
  margin-bottom: 1.5rem;
}

.balance-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0;
}

.balance-row .label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.balance-row .value {
  font-weight: 600;
  color: var(--primary-teal);
}

.balance-row .value.negative {
  color: #ef4444;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.amount-input-wrapper {
  display: flex;
  align-items: center;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.currency-symbol {
  padding: 0.75rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.amount-input-wrapper input {
  flex: 1;
  padding: 0.75rem 0.75rem 0.75rem 0;
  border: none;
  background: transparent;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  outline: none;
}

.variance-info {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  padding: 0.5rem;
  border-radius: 6px;
}

.variance-info.positive {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.variance-info.negative {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.warning-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  margin-bottom: 1.25rem;
  color: #ef4444;
  font-size: 0.875rem;
}

textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.9rem;
  resize: vertical;
}

textarea::placeholder {
  color: var(--text-muted);
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
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
</style>
