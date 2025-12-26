<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-50 to-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-slate-800">Set Up Your Budget</h1>
        <p class="mt-2 text-slate-600">Enter your details to see your weekly spending power</p>
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
import AppTabs from '@/components/common/AppTabs.vue'
import IncomeTab from '@/components/setup/IncomeTab.vue'
import ExpensesTab from '@/components/setup/ExpensesTab.vue'
import AccountsTab from '@/components/setup/AccountsTab.vue'
import ResultsSidebar from '@/components/results/ResultsSidebar.vue'

defineEmits(['openLogin'])

const budgetStore = useBudgetStore()
const activeTab = ref('income')

const tabs = computed(() => [
  { id: 'income', label: 'Income' },
  { id: 'expenses', label: 'Expenses', badge: budgetStore.expenses.length || undefined },
  { id: 'accounts', label: 'Accounts', badge: budgetStore.accounts.length || undefined },
])
</script>
