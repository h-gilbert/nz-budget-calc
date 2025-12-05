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

          <h2>Edit Payment</h2>

          <div class="payment-info">
            <div class="info-row">
              <span class="label">Expense:</span>
              <span class="value">{{ payment?.expenseName }}</span>
            </div>
            <div class="info-row">
              <span class="label">Expected Amount:</span>
              <span class="value">${{ formatCurrency(payment?.amountDue) }}</span>
            </div>
          </div>

          <div class="form-group">
            <label>Amount Paid</label>
            <div class="amount-input-wrapper">
              <span class="currency-symbol">$</span>
              <input
                v-model.number="form.amount_paid"
                type="number"
                step="0.01"
                min="0"
              />
            </div>
            <div v-if="amountDiff !== 0" class="amount-diff" :class="{ positive: amountDiff > 0, negative: amountDiff < 0 }">
              <span v-if="amountDiff > 0">+${{ formatCurrency(amountDiff) }} more than expected</span>
              <span v-else>${{ formatCurrency(Math.abs(amountDiff)) }} less than expected</span>
            </div>
          </div>

          <div class="form-group">
            <label>Payment Date</label>
            <input
              v-model="form.payment_date"
              type="date"
              class="date-input"
            />
          </div>

          <div class="form-group">
            <label>Notes (optional)</label>
            <textarea
              v-model="form.notes"
              rows="2"
              placeholder="e.g., Paid early, got discount"
            ></textarea>
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
import { paymentAPI } from '@/api/client'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  payment: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'saved'])

const form = ref({
  amount_paid: 0,
  payment_date: '',
  notes: ''
})

const saving = ref(false)

function formatCurrency(amount) {
  return parseFloat(amount || 0).toFixed(2)
}

const amountDiff = computed(() => {
  if (!props.payment) return 0
  return form.value.amount_paid - props.payment.amountDue
})

const balanceChangePreview = computed(() => {
  if (!props.payment) return null

  const originalPaid = props.payment.amountPaid
  const newPaid = form.value.amount_paid
  const diff = newPaid - originalPaid

  if (diff === 0) return 'No change to sub-account balance'
  if (diff > 0) return `Sub-account balance will decrease by $${formatCurrency(diff)}`
  return `Sub-account balance will increase by $${formatCurrency(Math.abs(diff))}`
})

const balanceChangeClass = computed(() => {
  if (!props.payment) return ''

  const originalPaid = props.payment.amountPaid
  const newPaid = form.value.amount_paid
  const diff = newPaid - originalPaid

  if (diff === 0) return 'neutral'
  if (diff > 0) return 'negative' // paying more = less balance
  return 'positive' // paying less = more balance
})

function close() {
  emit('close')
}

async function save() {
  if (saving.value || !props.payment) return
  saving.value = true

  try {
    const updates = {
      amount_paid: form.value.amount_paid,
      payment_date: form.value.payment_date,
      notes: form.value.notes
    }

    await paymentAPI.update(props.payment.id, updates)
    emit('saved')
    close()
  } catch (error) {
    console.error('Failed to save payment:', error)
  } finally {
    saving.value = false
  }
}

// Initialize form when payment changes
watch(() => props.payment, (p) => {
  if (p) {
    form.value = {
      amount_paid: p.amountPaid || 0,
      payment_date: p.paymentDate || '',
      notes: p.notes || ''
    }
  }
}, { immediate: true })

// Reset form when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen && props.payment) {
    form.value = {
      amount_paid: props.payment.amountPaid || 0,
      payment_date: props.payment.paymentDate || '',
      notes: props.payment.notes || ''
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

.payment-info {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
}

.info-row .label {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.info-row .value {
  font-weight: 500;
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

.amount-diff {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  padding: 0.5rem;
  border-radius: 6px;
}

.amount-diff.positive {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.amount-diff.negative {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.date-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.95rem;
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
