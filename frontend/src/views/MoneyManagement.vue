<template>
  <div class="money-management-page">
    <!-- Page Header -->
    <header class="page-header">
      <div class="header-content">
        <h1>Money Management</h1>
        <p class="subtitle">Manage your accounts, planning, automation, and goals</p>
      </div>
    </header>

    <!-- Tab Navigation - Sticky -->
    <div class="tab-container">
      <TabNavigation
        v-model="activeTab"
        :tabs="tabs"
      />
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      <Transition name="tab-fade" mode="out-in">
        <!-- Accounts Tab -->
        <div v-if="activeTab === 'accounts'" key="accounts" class="tab-panel">
          <AccountsTabContent />
        </div>

        <!-- Planning Tab -->
        <div v-else-if="activeTab === 'planning'" key="planning" class="tab-panel">
          <TransferPlanningCard />
        </div>

        <!-- Automation Tab -->
        <div v-else-if="activeTab === 'automation'" key="automation" class="tab-panel">
          <AutomationDashboard />
        </div>

        <!-- Goals Tab -->
        <div v-else-if="activeTab === 'goals'" key="goals" class="tab-panel">
          <GoalTimelineCard />
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBudgetStore } from '@stores/budget'
import TabNavigation from '@/components/ui/TabNavigation.vue'
import AccountsTabContent from '@/components/money/AccountsTabContent.vue'
import TransferPlanningCard from '@/components/dashboard/TransferPlanningCard.vue'
import AutomationDashboard from '@/components/dashboard/AutomationDashboard.vue'
import GoalTimelineCard from '@/components/dashboard/GoalTimelineCard.vue'

const route = useRoute()
const router = useRouter()
const budgetStore = useBudgetStore()

// Active tab state (supports deep linking)
const activeTab = ref('accounts')

// Tab configuration with dynamic badges
const tabs = computed(() => [
  {
    id: 'accounts',
    label: 'Accounts',
    icon: '💰',
    badge: null
  },
  {
    id: 'planning',
    label: 'Planning',
    icon: '📅',
    badge: budgetStore.pendingActions?.transfer?.missedWeeks > 0
      ? budgetStore.pendingActions.transfer.missedWeeks
      : null
  },
  {
    id: 'automation',
    label: 'Automation',
    icon: '🔄',
    badge: (budgetStore.pendingActions?.manualExpenses?.length || 0) > 0
      ? budgetStore.pendingActions.manualExpenses.length
      : null
  },
  {
    id: 'goals',
    label: 'Goals',
    icon: '🎯',
    badge: null
  }
])

// Support deep linking to specific tabs via query parameter
onMounted(() => {
  if (route.query.tab) {
    const validTabs = ['accounts', 'planning', 'automation', 'goals']
    if (validTabs.includes(route.query.tab)) {
      activeTab.value = route.query.tab
    }
  }
})

// Update URL when tab changes (for bookmarking)
watch(activeTab, (newTab) => {
  router.replace({ query: { tab: newTab } })
})
</script>

<style scoped>
.money-management-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  margin-bottom: 2rem;
}

.header-content h1 {
  font-size: 2rem;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.subtitle {
  font-size: 1rem;
  color: var(--text-secondary);
  margin: 0;
}

.tab-container {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--bg-primary);
  padding: 1rem 0;
  margin: 0 -2rem 2rem;
  padding-left: 2rem;
  padding-right: 2rem;
  border-bottom: 1px solid var(--border-light);
}

.tab-content {
  animation: fadeIn 0.3s ease-in;
}

/* Tab transition */
.tab-fade-enter-active,
.tab-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.tab-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.tab-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .money-management-page {
    padding: 1rem;
  }

  .tab-container {
    margin: 0 -1rem 1.5rem;
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .header-content h1 {
    font-size: 1.5rem;
  }

  .subtitle {
    font-size: 0.875rem;
  }
}
</style>
