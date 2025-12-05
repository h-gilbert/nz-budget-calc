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

          <h2>Edit Transaction</h2>

          <div class="form-group">
            <label>Amount</label>
            <div class="amount-input-wrapper">
              <span class="currency-symbol">$</span>
              <input
                v-model.number="form.amount"
                type="number"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          <div class="form-group">
            <label>Date</label>
            <input
              v-model="form.transaction_date"
              type="date"
              class="date-input"
            />
          </div>

          <div class="form-group">
            <label>Type</label>
            <select v-model="form.transaction_type" class="select-input">
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>

          <div class="form-group">
            <label>Account</label>
            <select v-model="form.account_id" class="select-input">
              <option :value="null">No Account</option>
              <option v-for="account in accounts" :key="account.id" :value="account.id">
                {{ account.name }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Description</label>
            <input
              v-model="form.description"
              type="text"
              class="text-input"
              placeholder="Transaction description"
            />
          </div>

          <div class="form-group">
            <label>Category</label>
            <input
              v-model="form.category"
              type="text"
              class="text-input"
              placeholder="e.g., Groceries, Utilities"
            />
          </div>

          <div v-if="balanceChangePreview" class="balance-preview" :class="balanceChangeClass">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{{ balanceChangePreview }}</span>
          </div>

          <div class="modal-actions">
            <button class="btn btn-secondary" @click="close">Cancel</button>
            <button class="btn btn-primary" @click="save" :disabled="saving">
              {{ saving ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { transactionAPI } from '@/api/client'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  transaction: {
    type: Object,
    default: null
  },
  accounts: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'saved'])

const form = ref({
  amount: 0,
  transaction_date: '',
  transaction_type: 'expense',
  account_id: null,
  description: '',
  category: ''
})

const saving = ref(false)

// Compute balance change preview
const balanceChangePreview = computed(() => {
  if (!props.transaction || !form.value.account_id) return null

  const oldAmount = props.transaction.amount
  const newAmount = form.value.amount
  const oldType = props.transaction.transaction_type
  const newType = form.value.transaction_type

  // Calculate net effect (positive = account gains money, negative = account loses money)
  const oldEffect = oldType === 'income' ? oldAmount : -oldAmount
  const newEffect = newType === 'income' ? newAmount : -newAmount
  const netChange = newEffect - oldEffect

  if (netChange === 0) return 'No change to account balance'
  if (netChange > 0) return `Account balance will increase by $${netChange.toFixed(2)}`
  return `Account balance will decrease by $${Math.abs(netChange).toFixed(2)}`
})

const balanceChangeClass = computed(() => {
  if (!props.transaction || !form.value.account_id) return ''

  const oldAmount = props.transaction.amount
  const newAmount = form.value.amount
  const oldType = props.transaction.transaction_type
  const newType = form.value.transaction_type

  const oldEffect = oldType === 'income' ? oldAmount : -oldAmount
  const newEffect = newType === 'income' ? newAmount : -newAmount
  const netChange = newEffect - oldEffect

  if (netChange === 0) return 'neutral'
  if (netChange > 0) return 'positive'
  return 'negative'
})

function close() {
  emit('close')
}

async function save() {
  if (saving.value || !props.transaction) return
  saving.value = true

  try {
    const updates = {
      amount: form.value.amount,
      transaction_date: form.value.transaction_date,
      transaction_type: form.value.transaction_type,
      account_id: form.value.account_id,
      description: form.value.description,
      category: form.value.category
    }

    const result = await transactionAPI.update(props.transaction.id, updates)
    emit('saved', result.transaction)
    close()
  } catch (error) {
    console.error('Failed to save transaction:', error)
  } finally {
    saving.value = false
  }
}

// Initialize form when transaction changes
watch(() => props.transaction, (tx) => {
  if (tx) {
    form.value = {
      amount: tx.amount || 0,
      transaction_date: tx.transaction_date || '',
      transaction_type: tx.transaction_type || 'expense',
      account_id: tx.account_id || null,
      description: tx.description || '',
      category: tx.category || ''
    }
  }
}, { immediate: true })

// Reset form when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen && props.transaction) {
    form.value = {
      amount: props.transaction.amount || 0,
      transaction_date: props.transaction.transaction_date || '',
      transaction_type: props.transaction.transaction_type || 'expense',
      account_id: props.transaction.account_id || null,
      description: props.transaction.description || '',
      category: props.transaction.category || ''
    }
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
  max-height: 90vh;
  overflow-y: auto;
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

.date-input,
.text-input,
.select-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.95rem;
}

.select-input {
  cursor: pointer;
}

.text-input::placeholder {
  color: var(--text-muted);
}

.balance-preview {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  margin-bottom: 1.25rem;
  font-size: 0.875rem;
}

.balance-preview.positive {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.balance-preview.negative {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.balance-preview.neutral {
  background: var(--bg-secondary);
  color: var(--text-secondary);
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
