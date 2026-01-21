<template>
  <div id="app" class="min-h-screen flex flex-col">
    <AppHeader
      @openLogin="showLoginModal = true"
      @openPasswordChange="showPasswordModal = true"
    />

    <main class="flex-1">
      <router-view v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" @openLogin="showLoginModal = true" />
        </Transition>
      </router-view>
    </main>

    <!-- Modals -->
    <LoginModal v-model="showLoginModal" @loginSuccess="handleLoginSuccess" />
    <PasswordModal v-model="showPasswordModal" />

    <!-- Indicators -->
    <LoadingIndicator />
    <SaveIndicator />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useBudgetStore } from '@/stores/budget'
import { authAPI, budgetAPI } from '@/api/client'

import AppHeader from '@/components/layout/AppHeader.vue'
import LoginModal from '@/components/auth/LoginModal.vue'
import PasswordModal from '@/components/auth/PasswordModal.vue'
import LoadingIndicator from '@/components/common/LoadingIndicator.vue'
import SaveIndicator from '@/components/common/SaveIndicator.vue'

const userStore = useUserStore()
const budgetStore = useBudgetStore()
const showLoginModal = ref(false)
const showPasswordModal = ref(false)

async function handleLoginSuccess() {
  budgetStore.clearLocalStorage()
  // Auto-load the user's default budget after login
  await loadUserBudget()
}

async function loadUserBudget() {
  try {
    const budget = await budgetAPI.getDefault()
    if (budget) {
      budgetStore.loadBudgetData(budget)
    }
  } catch (error) {
    console.log('No default budget found, starting fresh')
  }
}

// Handle 401 unauthorized events from API interceptor
function handleUnauthorized() {
  userStore.logout()
  budgetStore.loadFromLocalStorage()
}

onMounted(async () => {
  // Listen for unauthorized events
  window.addEventListener('auth:unauthorized', handleUnauthorized)

  const token = userStore.restoreSession()
  if (token) {
    try {
      const userData = await authAPI.getCurrentUser()
      if (userData?.user) {
        userStore.login(userData.user, token)
        // Apply budget mode preference if available
        if (userData.preferences?.budget_mode) {
          budgetStore.budgetMode = userData.preferences.budget_mode
        }
        budgetStore.clearLocalStorage()
        // Auto-load the user's default budget on page refresh
        await loadUserBudget()
      }
    } catch (error) {
      console.error('Failed to restore session:', error)
      userStore.logout()
      budgetStore.loadFromLocalStorage()
    }
  } else {
    budgetStore.loadFromLocalStorage()
  }
})

onUnmounted(() => {
  window.removeEventListener('auth:unauthorized', handleUnauthorized)
})
</script>

<style>
/* Page transitions */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
