<template>
  <nav class="navbar">
    <div class="nav-container">
      <router-link to="/" class="logo">
        <h1>NZ Budget Calculator</h1>
      </router-link>

      <div class="nav-links">
        <router-link to="/" class="nav-link">Home</router-link>
        <router-link to="/calculator" class="nav-link">Budget Setup</router-link>
        <router-link to="/accounts" class="nav-link">Accounts</router-link>
        <router-link to="/dashboard" class="nav-link">Dashboard</router-link>

        <div v-if="userStore.isAuthenticated" class="user-menu">
          <span class="user-info">{{ userStore.username }}</span>
          <button @click="handleLogout" class="btn btn-secondary btn-sm">
            Logout
          </button>
        </div>
        <button v-else @click="emit('openLogin')" class="btn btn-primary btn-sm">
          Login
        </button>
      </div>

      <!-- Mobile menu button -->
      <button class="mobile-menu-btn" @click="mobileMenuOpen = !mobileMenuOpen">
        <svg v-if="!mobileMenuOpen" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
        <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

    <!-- Mobile menu -->
    <Transition name="mobile-menu">
      <div v-if="mobileMenuOpen" class="mobile-menu">
        <router-link to="/" class="mobile-link" @click="mobileMenuOpen = false">Home</router-link>
        <router-link to="/calculator" class="mobile-link" @click="mobileMenuOpen = false">Budget Setup</router-link>
        <router-link to="/accounts" class="mobile-link" @click="mobileMenuOpen = false">Accounts</router-link>
        <router-link to="/dashboard" class="mobile-link" @click="mobileMenuOpen = false">Dashboard</router-link>

        <div v-if="userStore.isAuthenticated" class="mobile-user-section">
          <span class="mobile-user-info">{{ userStore.username }}</span>
          <button @click="handleLogout" class="btn btn-secondary btn-sm">
            Logout
          </button>
        </div>
        <button v-else @click="emit('openLogin'); mobileMenuOpen = false" class="btn btn-primary btn-sm">
          Login
        </button>
      </div>
    </Transition>
  </nav>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@stores/user'
import { useNotificationStore } from '@stores/notification'

const emit = defineEmits(['openLogin'])

const router = useRouter()
const userStore = useUserStore()
const notificationStore = useNotificationStore()

const mobileMenuOpen = ref(false)

function handleLogout() {
  userStore.logout()
  notificationStore.success('Logged out successfully')
  mobileMenuOpen.value = false
  router.push('/')
}
</script>

<style scoped>
.navbar {
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-light);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.95);
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  text-decoration: none;
  color: inherit;
}

.logo h1 {
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary-teal), var(--primary-blue));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.nav-link {
  text-decoration: none;
  color: var(--text-secondary);
  font-weight: 500;
  transition: color 0.2s ease;
  position: relative;
}

.nav-link:hover {
  color: var(--primary-teal);
}

.nav-link.router-link-active {
  color: var(--primary-teal);
}

.nav-link.router-link-active::after {
  content: '';
  position: absolute;
  bottom: -0.5rem;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--primary-teal);
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-info {
  color: var(--text-primary);
  font-weight: 500;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary-teal), var(--primary-blue));
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(20, 184, 166, 0.3);
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-light);
}

.btn-secondary:hover {
  background: var(--bg-hover);
}

.mobile-menu-btn {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  color: var(--text-primary);
}

.mobile-menu {
  display: none;
  padding: 1rem 2rem 2rem;
  background: var(--bg-card);
  border-top: 1px solid var(--border-light);
}

.mobile-link {
  display: block;
  padding: 1rem;
  text-decoration: none;
  color: var(--text-secondary);
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.mobile-link:hover,
.mobile-link.router-link-active {
  background: var(--bg-hover);
  color: var(--primary-teal);
}

.mobile-user-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  margin-top: 1rem;
  background: var(--bg-hover);
  border-radius: 8px;
}

.mobile-user-info {
  color: var(--text-primary);
  font-weight: 500;
}

/* Mobile menu transitions */
.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: all 0.3s ease;
}

.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@media (max-width: 768px) {
  .nav-links {
    display: none;
  }

  .mobile-menu-btn {
    display: block;
  }

  .mobile-menu {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
}

@media (min-width: 769px) {
  .mobile-menu {
    display: none !important;
  }
}
</style>
