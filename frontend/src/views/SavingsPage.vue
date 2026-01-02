<template>
  <div class="min-h-screen bg-gradient-to-b from-blue-50 to-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-slate-800">Savings Goals</h1>
        <p class="mt-2 text-slate-600">Track progress, view projections, and manage your savings</p>
      </div>

      <!-- Overview Header -->
      <SavingsOverviewHeader v-if="savingsAccounts.length > 0" class="mb-8" />

      <!-- Empty state -->
      <div
        v-if="savingsAccounts.length === 0"
        class="text-center py-16 bg-white rounded-3xl shadow-sm border border-gray-100"
      >
        <div class="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-2xl flex items-center justify-center">
          <svg class="w-8 h-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-4.75a.75.75 0 001.5 0V8.66l1.95 2.1a.75.75 0 101.1-1.02l-3.25-3.5a.75.75 0 00-1.1 0L6.2 9.74a.75.75 0 101.1 1.02l1.95-2.1v4.59z" clip-rule="evenodd" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-slate-800 mb-2">No savings accounts yet</h2>
        <p class="text-slate-600 mb-6 max-w-md mx-auto">
          Create your first savings goal to start tracking your progress toward financial milestones.
        </p>
        <router-link
          to="/setup"
          class="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors"
        >
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          Add Savings Account
        </router-link>
      </div>

      <!-- Savings Account Cards -->
      <div v-else class="space-y-6">
        <SavingsAccountCard
          v-for="account in savingsAccounts"
          :key="account.id"
          :account="account"
          :projection="getProjection(account.id)"
          :transactions="getAccountTransactions(account.id)"
        />
      </div>

      <!-- Quick Links -->
      <div v-if="savingsAccounts.length > 0" class="mt-8 flex justify-center gap-4">
        <router-link
          to="/setup"
          class="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          Add Savings Account
        </router-link>
        <router-link
          to="/transactions"
          class="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-700 font-medium transition-colors"
        >
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M2 3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5v11.75A2.75 2.75 0 0016.75 18h-12A2.75 2.75 0 012 15.25V3.5z" clip-rule="evenodd" />
          </svg>
          View All Transactions
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import SavingsOverviewHeader from '@/components/savings/SavingsOverviewHeader.vue'
import SavingsAccountCard from '@/components/savings/SavingsAccountCard.vue'

const budgetStore = useBudgetStore()

const savingsAccounts = computed(() => budgetStore.getSavingsAccounts())

function getProjection(accountId) {
  return budgetStore.calculateSavingsProjection(accountId)
}

function getAccountTransactions(accountId) {
  // Filter transactions for this savings account
  return budgetStore.transactions
    .filter(t => t.account_id === accountId || t.frontend_account_id === accountId)
    .slice(0, 5) // Last 5 transactions
}

onMounted(async () => {
  // Load transactions if not already loaded
  if (budgetStore.transactions.length === 0) {
    try {
      await budgetStore.loadTransactions({ limit: 100 })
    } catch (error) {
      console.log('Could not load transactions')
    }
  }
})
</script>
