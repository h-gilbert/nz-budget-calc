<template>
  <div id="app">
    <Navigation
      @openLogin="showLoginModal = true"
      @openChangePassword="showChangePasswordModal = true"
    />

    <main>
      <router-view v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" @openLogin="showLoginModal = true" />
        </Transition>
      </router-view>
    </main>

    <LoginModal v-model="showLoginModal" @loginSuccess="handleLoginSuccess" />
    <ChangePasswordModal v-model="showChangePasswordModal" />
    <LoadingBar />
    <SaveIndicator />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '@stores/user'
import { authAPI } from '@api/client'
import Navigation from '@components/ui/Navigation.vue'
import LoginModal from '@components/ui/LoginModal.vue'
import ChangePasswordModal from '@components/ui/ChangePasswordModal.vue'
import LoadingBar from '@components/ui/LoadingBar.vue'
import SaveIndicator from '@components/ui/SaveIndicator.vue'

const userStore = useUserStore()
const showLoginModal = ref(false)
const showChangePasswordModal = ref(false)

async function handleLoginSuccess() {
  // Optionally reload user data or budgets here
  console.log('Login successful!')
}

// Try to restore session on app load
onMounted(async () => {
  const token = userStore.restoreSession()
  if (token) {
    try {
      const userData = await authAPI.getCurrentUser()
      if (userData && userData.user) {
        userStore.login(userData.user, token)
      }
    } catch (error) {
      console.error('Failed to restore session:', error)
      userStore.logout()
    }
  }
})
</script>

<style>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

main {
  flex: 1;
}

/* Page transitions */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
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
