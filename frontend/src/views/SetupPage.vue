<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-50 to-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-slate-800">Set Up Your Budget</h1>
        <div class="mt-2 flex items-center justify-center gap-2">
          <p class="text-slate-600">Enter your details to see your weekly spending power</p>
          <span class="text-slate-300">·</span>
          <button
            @click="toggleMode"
            class="text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors inline-flex items-center gap-1 hover:underline"
          >
            {{ budgetStore.budgetMode === 'simple' ? 'Advanced mode' : 'Simple mode' }}
          </button>
        </div>
      </div>

      <!-- Main Layout -->
      <div class="grid lg:grid-cols-3 gap-8">
        <!-- Main Content (Tabs) -->
        <div class="lg:col-span-2">
          <div class="bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-gray-100 p-6">
            <AppTabs :tabs="tabs" v-model="activeTab">
              <template #default="{ activeTab }">
                <IncomeTab v-if="activeTab === 'income'" />
                <ExpensesTab v-if="activeTab === 'expenses'" />
                <AccountsTab v-if="activeTab === 'accounts'" />
              </template>
            </AppTabs>
          </div>
        </div>

        <!-- Results Sidebar -->
        <div class="lg:col-span-1">
          <ResultsSidebar @openLogin="$emit('openLogin')" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import { useUserStore } from '@/stores/user'
import { preferencesAPI } from '@/api/client'
import AppTabs from '@/components/common/AppTabs.vue'
import IncomeTab from '@/components/setup/IncomeTab.vue'
import ExpensesTab from '@/components/setup/ExpensesTab.vue'
import AccountsTab from '@/components/setup/AccountsTab.vue'
import ResultsSidebar from '@/components/results/ResultsSidebar.vue'

defineEmits(['openLogin'])

const budgetStore = useBudgetStore()
const userStore = useUserStore()
const activeTab = ref('income')

const tabs = computed(() => {
  const baseTabs = [
    { id: 'income', label: 'Income' },
    { id: 'expenses', label: 'Expenses', badge: budgetStore.expenses.length || undefined },
  ]

  // Only show Accounts tab in advanced mode
  if (budgetStore.budgetMode === 'advanced') {
    baseTabs.push({ id: 'accounts', label: 'Accounts', badge: budgetStore.accounts.length || undefined })
  }

  return baseTabs
})

async function toggleMode() {
  const newMode = budgetStore.budgetMode === 'simple' ? 'advanced' : 'simple'
  budgetStore.budgetMode = newMode

  // If switching to simple mode and on accounts tab, switch to income
  if (newMode === 'simple' && activeTab.value === 'accounts') {
    activeTab.value = 'income'
  }

  // Save preference to server if logged in
  if (userStore.isAuthenticated) {
    try {
      await preferencesAPI.update({ budget_mode: newMode })
    } catch (error) {
      console.error('Failed to save budget mode preference:', error)
    }
  }
}
</script>
