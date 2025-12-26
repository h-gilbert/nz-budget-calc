<template>
  <div class="space-y-4">
    <!-- Header with Add Button -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h3 class="font-semibold text-slate-800">Your Accounts</h3>
        <p class="text-sm text-slate-500">Set up your bank accounts for allocation planning</p>
      </div>
      <AppButton size="sm" @click="budgetStore.addAccount()" class="self-start sm:self-auto">
        <template #icon-left>
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
        </template>
        Add Account
      </AppButton>
    </div>

    <!-- Empty State -->
    <div
      v-if="budgetStore.accounts.length === 0"
      class="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200"
    >
      <svg class="w-12 h-12 mx-auto text-slate-300 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
      </svg>
      <p class="text-slate-600 font-medium mb-2">No accounts yet</p>
      <p class="text-sm text-slate-500 mb-4">Add your bank accounts to plan your money allocation</p>
      <AppButton size="sm" @click="budgetStore.addAccount()">
        Add Your First Account
      </AppButton>
    </div>

    <!-- Account List -->
    <TransitionGroup v-else name="list" tag="div" class="space-y-3">
      <AccountItem
        v-for="account in budgetStore.accounts"
        :key="account.id"
        :account="account"
        @remove="budgetStore.removeAccount(account.id)"
      />
    </TransitionGroup>

    <!-- Info Box -->
    <div
      v-if="budgetStore.accounts.length > 0"
      class="flex items-start gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100"
    >
      <svg class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" />
      </svg>
      <div class="text-sm">
        <p class="font-medium text-blue-800">How accounts work</p>
        <p class="text-blue-600 mt-1">
          Link your expenses to accounts in the Expenses tab to see how much you spend from each account weekly.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useBudgetStore } from '@/stores/budget'
import AppButton from '@/components/common/AppButton.vue'
import AccountItem from './AccountItem.vue'

const budgetStore = useBudgetStore()
</script>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.list-move {
  transition: transform 0.3s ease;
}
</style>
