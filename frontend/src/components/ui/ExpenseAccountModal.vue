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
                <span class="balance-amount" :class="getBalanceClass(getTotalBalance())">
                  ${{ formatBalance(getTotalBalance()) }}
                </span>
              </div>
            </div>

            <!-- Sub-accounts List -->
            <div class="sub-accounts-section">
              <div class="section-header">
                <h3>Expense Funds</h3>
                <span class="fund-count">{{ account.sub_accounts?.length || 0 }} funds</span>
              </div>

              <div v-if="account.sub_accounts && account.sub_accounts.length > 0" class="sub-accounts-grid">
                <div
                  v-for="subAccount in account.sub_accounts"
                  :key="subAccount.id"
                  class="sub-account-card"
                >
                  <div class="sub-account-header">
                    <div class="sub-account-icon">💰</div>
                    <div class="sub-account-info">
                      <h4>{{ subAccount.name || 'Unnamed Fund' }}</h4>
                      <div class="sub-account-meta">
                        <span v-if="subAccount.target" class="meta-item">
                          Goal: ${{ formatBalance(subAccount.target) }}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div class="sub-account-balance-section">
                    <div class="balance" :class="getBalanceClass(subAccount.balance)">
                      ${{ formatBalance(subAccount.balance) }}
                    </div>
                    <!-- Progress bar if target exists -->
                    <div v-if="subAccount.target" class="progress-section">
                      <div class="progress-bar">
                        <div
                          class="progress-fill"
                          :class="getProgressClass(subAccount)"
                          :style="{ width: Math.min(getProgressPercentage(subAccount), 100) + '%' }"
                        ></div>
                      </div>
                      <span class="progress-text" :class="getProgressClass(subAccount)">
                        {{ getProgressPercentage(subAccount) }}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div v-else class="no-funds-message">
                <p>No expense funds configured yet.</p>
              </div>
            </div>

            <!-- Summary Footer -->
            <div class="modal-footer">
              <div class="summary-row">
                <span class="summary-label">Total Allocated:</span>
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
import { computed } from 'vue'

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

function closeModal() {
  emit('update:modelValue', false)
}

function getTotalBalance() {
  if (!props.account?.sub_accounts) return 0
  return props.account.sub_accounts.reduce((total, sub) => {
    return total + (parseFloat(sub.balance) || 0)
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

function getProgressPercentage(subAccount) {
  const balance = parseFloat(subAccount.balance) || 0
  const target = parseFloat(subAccount.target) || 0
  if (target === 0) return 0
  return Math.round((balance / target) * 100)
}

function getProgressClass(subAccount) {
  const percentage = getProgressPercentage(subAccount)
  if (percentage >= 100) return 'progress-complete'
  if (percentage >= 75) return 'progress-high'
  if (percentage >= 50) return 'progress-medium'
  if (percentage >= 25) return 'progress-low'
  return 'progress-very-low'
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
}
</style>
