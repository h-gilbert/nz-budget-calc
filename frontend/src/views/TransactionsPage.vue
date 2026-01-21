<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-50 to-white">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-slate-800">Transactions</h1>
          <p class="mt-1 text-sm sm:text-base text-slate-600">Track expenses, transfers, and monitor your budget</p>
        </div>

        <!-- Actions - Stack on mobile -->
        <div class="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <!-- Primary action first on mobile -->
          <button
            @click="showManualExpenseModal = true"
            class="order-first sm:order-last px-4 py-2.5 sm:py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Log Expense
          </button>
          <!-- Secondary actions -->
          <div class="flex gap-2">
            <button
              @click="handleProcessDueTransfers"
              :disabled="processingTransfers"
              class="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors disabled:opacity-50"
            >
              <span class="hidden sm:inline">{{ processingTransfers ? 'Processing...' : 'Process Transfers' }}</span>
              <span class="sm:hidden">{{ processingTransfers ? '...' : 'Transfers' }}</span>
            </button>
            <button
              @click="handleProcessDue"
              :disabled="processingDue"
              class="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors disabled:opacity-50"
            >
              <span class="hidden sm:inline">{{ processingDue ? 'Processing...' : 'Process Expenses' }}</span>
              <span class="sm:hidden">{{ processingDue ? '...' : 'Expenses' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 p-1 bg-slate-100 rounded-2xl mb-6">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-all',
            activeTab === tab.id
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-800'
          ]"
        >
          {{ tab.label }}
          <span
            v-if="tab.count"
            :class="[
              'ml-2 px-2 py-0.5 text-xs rounded-full',
              activeTab === tab.id ? 'bg-teal-100 text-teal-700' : 'bg-slate-200 text-slate-600'
            ]"
          >
            {{ tab.count }}
          </span>
        </button>
      </div>

      <!-- Tab Content -->
      <div class="space-y-6">
        <!-- Upcoming Tab -->
        <div v-if="activeTab === 'upcoming'" class="grid lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2">
            <UpcomingScheduleCard
              :items="budgetStore.upcomingItems"
              :days="30"
              :loading="upcomingLoading"
              @pay-early="handlePayEarly"
            />
          </div>
          <div>
            <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
              <h3 class="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h3>
              <div class="space-y-3">
                <button
                  @click="showManualExpenseModal = true"
                  class="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-3"
                >
                  <svg class="w-5 h-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-4.75a.75.75 0 01-1.5 0V8.66L7.3 10.76a.75.75 0 01-1.1-1.02l3.25-3.5a.75.75 0 011.1 0l3.25 3.5a.75.75 0 11-1.1 1.02l-1.95-2.1v4.59z" clip-rule="evenodd" />
                  </svg>
                  Log Manual Expense
                </button>
                <button
                  @click="showLumpSumTransferModal = true"
                  class="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-3"
                >
                  <svg class="w-5 h-5 text-emerald-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v4.59L7.3 9.24a.75.75 0 00-1.1 1.02l3.25 3.5a.75.75 0 001.1 0l3.25-3.5a.75.75 0 10-1.1-1.02l-1.95 2.1V6.75z" clip-rule="evenodd" />
                  </svg>
                  Add Funds to Account
                </button>
                <button
                  @click="handleProcessDue"
                  :disabled="processingDue"
                  class="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-3 disabled:opacity-50"
                >
                  <svg class="w-5 h-5 text-teal-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clip-rule="evenodd" />
                  </svg>
                  Process Due Expenses
                </button>
                <router-link
                  to="/dashboard"
                  class="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-3"
                >
                  <svg class="w-5 h-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v11.5A2.25 2.25 0 004.25 18h11.5A2.25 2.25 0 0018 15.75V4.25A2.25 2.25 0 0015.75 2H4.25zM15 5.75a.75.75 0 00-1.5 0v8.5a.75.75 0 001.5 0v-8.5zm-8.5 6a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5zM8.584 9a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5a.75.75 0 01.75-.75zm3.58-1.25a.75.75 0 00-1.5 0v6.5a.75.75 0 001.5 0v-6.5z" clip-rule="evenodd" />
                  </svg>
                  View Dashboard
                </router-link>
              </div>
            </div>
          </div>
        </div>

        <!-- History Tab -->
        <div v-if="activeTab === 'history'">
          <TransactionList
            :transactions="budgetStore.transactions"
            :total="budgetStore.transactionsTotal"
            :loading="budgetStore.transactionsLoading"
            :show-filters="true"
            @edit="handleEditTransaction"
            @delete="handleDeleteTransaction"
            @filter="handleFilter"
            @load-more="loadMoreTransactions"
          />
        </div>

        <!-- Budget vs Actual Tab -->
        <div v-if="activeTab === 'budget'" class="grid lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2">
            <BudgetVsActualCard
              :summaries="budgetStore.budgetSummary?.summaries || []"
              :loading="budgetSummaryLoading"
              :initial-weeks="4"
              @change-weeks="handleWeeksChange"
            />
          </div>
          <div>
            <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
              <h3 class="text-lg font-semibold text-slate-800 mb-4">How It Works</h3>
              <div class="space-y-4 text-sm text-slate-600">
                <div class="flex gap-3">
                  <div class="w-6 h-6 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">1</div>
                  <p>Set expenses like fuel and groceries to "manual" mode in Setup</p>
                </div>
                <div class="flex gap-3">
                  <div class="w-6 h-6 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">2</div>
                  <p>A fixed budget amount is transferred weekly to cover these expenses</p>
                </div>
                <div class="flex gap-3">
                  <div class="w-6 h-6 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">3</div>
                  <p>Log your actual spending as you go</p>
                </div>
                <div class="flex gap-3">
                  <div class="w-6 h-6 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">4</div>
                  <p>Over time, some weeks will be over budget and some under &mdash; it smooths out!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <ManualExpenseModal
      :show="showManualExpenseModal"
      @close="showManualExpenseModal = false"
      @save="handleLogExpense"
    />

    <LumpSumTransferModal
      :show="showLumpSumTransferModal"
      @close="showLumpSumTransferModal = false"
      @save="handleAddFunds"
    />

    <TransactionEditModal
      :show="showEditModal"
      :transaction="editingTransaction"
      @close="closeEditModal"
      @save="handleSaveTransaction"
    />

    <EarlyPaymentModal
      :show="showEarlyPaymentModal"
      :expense="selectedExpenseForPayment"
      @close="showEarlyPaymentModal = false; selectedExpenseForPayment = null"
      @confirm="handleConfirmEarlyPayment"
    />

    <!-- Delete Confirmation -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showDeleteConfirm"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showDeleteConfirm = false" />
          <div class="relative w-full max-w-sm bg-white rounded-3xl shadow-xl p-6">
            <h3 class="text-lg font-semibold text-slate-800 mb-2">Delete Transaction?</h3>
            <p class="text-slate-600 mb-6">This will reverse any balance changes. This action cannot be undone.</p>
            <div class="flex gap-3">
              <button
                @click="showDeleteConfirm = false"
                class="flex-1 px-4 py-3 font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                @click="confirmDelete"
                class="flex-1 px-4 py-3 font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import TransactionList from '@/components/transactions/TransactionList.vue'
import UpcomingScheduleCard from '@/components/transactions/UpcomingScheduleCard.vue'
import BudgetVsActualCard from '@/components/transactions/BudgetVsActualCard.vue'
import ManualExpenseModal from '@/components/transactions/ManualExpenseModal.vue'
import LumpSumTransferModal from '@/components/transactions/LumpSumTransferModal.vue'
import TransactionEditModal from '@/components/transactions/TransactionEditModal.vue'
import EarlyPaymentModal from '@/components/transactions/EarlyPaymentModal.vue'

const budgetStore = useBudgetStore()

// Tab state
const activeTab = ref('upcoming')
const tabs = computed(() => [
  { id: 'upcoming', label: 'Upcoming', count: budgetStore.upcomingItems?.length || 0 },
  { id: 'history', label: 'History', count: budgetStore.transactionsTotal || null },
  { id: 'budget', label: 'Budget vs Actual', count: null }
])

// Loading states
const upcomingLoading = ref(false)
const budgetSummaryLoading = ref(false)
const processingDue = ref(false)
const processingTransfers = ref(false)

// Modal states
const showManualExpenseModal = ref(false)
const showLumpSumTransferModal = ref(false)
const showEarlyPaymentModal = ref(false)
const showEditModal = ref(false)
const showDeleteConfirm = ref(false)
const editingTransaction = ref(null)
const deletingTransaction = ref(null)
const selectedExpenseForPayment = ref(null)

// Current filters
const currentFilters = ref({})
const currentOffset = ref(0)

// Load data on mount
onMounted(async () => {
  await Promise.all([
    loadUpcoming(),
    loadTransactions(),
    loadBudgetSummary()
  ])
})

// Load upcoming items
async function loadUpcoming() {
  upcomingLoading.value = true
  try {
    await budgetStore.loadUpcoming(30)
  } catch (error) {
    console.error('Failed to load upcoming:', error)
  } finally {
    upcomingLoading.value = false
  }
}

// Load transactions
async function loadTransactions(filters = {}) {
  currentFilters.value = filters
  currentOffset.value = 0
  try {
    await budgetStore.loadTransactions({ ...filters, limit: 50, offset: 0 })
  } catch (error) {
    console.error('Failed to load transactions:', error)
  }
}

// Load more transactions
async function loadMoreTransactions() {
  currentOffset.value += 50
  try {
    const response = await budgetStore.loadTransactions({
      ...currentFilters.value,
      limit: 50,
      offset: currentOffset.value
    })
    // Append to existing
    budgetStore.transactions.push(...response.transactions)
  } catch (error) {
    console.error('Failed to load more transactions:', error)
  }
}

// Load budget summary
async function loadBudgetSummary(weeks = 4) {
  budgetSummaryLoading.value = true
  try {
    await budgetStore.loadBudgetSummary({ weeks })
  } catch (error) {
    console.error('Failed to load budget summary:', error)
  } finally {
    budgetSummaryLoading.value = false
  }
}

// Handle filter change
function handleFilter(filters) {
  loadTransactions(filters)
}

// Handle weeks change for budget summary
function handleWeeksChange(weeks) {
  loadBudgetSummary(weeks)
}

// Handle log expense
async function handleLogExpense(data) {
  try {
    await budgetStore.logManualExpense(data.expenseId, data.amount, data.date, data.notes)
    showManualExpenseModal.value = false
    await loadTransactions(currentFilters.value)
    await loadBudgetSummary()
  } catch (error) {
    console.error('Failed to log expense:', error)
    alert('Failed to log expense: ' + error.message)
  }
}

// Handle add funds to account
async function handleAddFunds(data) {
  try {
    await budgetStore.addFundsToAccount(data.accountId, data.amount, data.date, data.notes)
    showLumpSumTransferModal.value = false
    await loadTransactions(currentFilters.value)
    await loadUpcoming()
  } catch (error) {
    console.error('Failed to add funds:', error)
    alert('Failed to add funds: ' + error.message)
  }
}

// Handle edit transaction
function handleEditTransaction(transaction) {
  editingTransaction.value = transaction
  showEditModal.value = true
}

// Close edit modal
function closeEditModal() {
  showEditModal.value = false
  editingTransaction.value = null
}

// Handle save transaction
async function handleSaveTransaction({ id, updates }) {
  try {
    await budgetStore.updateTransaction(id, updates)
    closeEditModal()
    await loadBudgetSummary()
  } catch (error) {
    console.error('Failed to update transaction:', error)
    alert('Failed to update transaction: ' + error.message)
  }
}

// Handle delete transaction
function handleDeleteTransaction(transaction) {
  deletingTransaction.value = transaction
  showDeleteConfirm.value = true
}

// Confirm delete
async function confirmDelete() {
  if (!deletingTransaction.value) return

  try {
    await budgetStore.deleteTransaction(deletingTransaction.value.id)
    showDeleteConfirm.value = false
    deletingTransaction.value = null
    await loadBudgetSummary()
  } catch (error) {
    console.error('Failed to delete transaction:', error)
    alert('Failed to delete transaction: ' + error.message)
  }
}

// Process due expenses
async function handleProcessDue() {
  processingDue.value = true
  try {
    const result = await budgetStore.processDueExpenses()
    if (result.processed_count > 0) {
      alert(`Processed ${result.processed_count} due expenses`)
    } else {
      alert('No expenses due to process')
    }
  } catch (error) {
    console.error('Failed to process due expenses:', error)
    alert('Failed to process due expenses: ' + error.message)
  } finally {
    processingDue.value = false
  }
}

// Process due transfers
async function handleProcessDueTransfers() {
  processingTransfers.value = true
  try {
    const result = await budgetStore.processDueTransfers()
    if (result.processed_count > 0) {
      alert(`Processed ${result.processed_count} due transfers`)
      await loadUpcoming()
    } else {
      alert('No transfers due to process')
    }
  } catch (error) {
    console.error('Failed to process due transfers:', error)
    alert('Failed to process due transfers: ' + error.message)
  } finally {
    processingTransfers.value = false
  }
}

// Handle pay early from upcoming schedule card
function handlePayEarly(item) {
  selectedExpenseForPayment.value = item
  showEarlyPaymentModal.value = true
}

// Handle confirm early payment
async function handleConfirmEarlyPayment(data) {
  try {
    await budgetStore.payExpenseEarly(data.expenseId, data.amount, data.date, data.notes)
    showEarlyPaymentModal.value = false
    selectedExpenseForPayment.value = null
    // Data is already reloaded by store action
  } catch (error) {
    console.error('Failed to pay expense early:', error)
    alert('Failed to pay expense early: ' + error.message)
  }
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
