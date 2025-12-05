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
        <router-link to="/transactions" class="nav-link">Transactions</router-link>
        <router-link to="/dashboard" class="nav-link">Dashboard</router-link>
        <router-link to="/planning" class="nav-link">Planning</router-link>
        <router-link to="/automation" class="nav-link">Automation</router-link>
        <router-link to="/goals" class="nav-link">Goals</router-link>

        <div v-if="userStore.isAuthenticated" class="user-menu" v-click-outside="() => userDropdownOpen = false">
          <button class="user-menu-trigger" @click="userDropdownOpen = !userDropdownOpen">
            <span class="user-info">{{ userStore.username }}</span>
            <svg class="dropdown-arrow" :class="{ open: userDropdownOpen }" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <Transition name="dropdown">
            <div v-if="userDropdownOpen" class="user-dropdown">
              <button @click="handleChangePassword" class="dropdown-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                Change Password
              </button>
              <button @click="handleLogout" class="dropdown-item dropdown-item-danger">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Logout
              </button>
            </div>
          </Transition>
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
        <router-link to="/transactions" class="mobile-link" @click="mobileMenuOpen = false">Transactions</router-link>
        <router-link to="/dashboard" class="mobile-link" @click="mobileMenuOpen = false">Dashboard</router-link>
        <router-link to="/planning" class="mobile-link" @click="mobileMenuOpen = false">Planning</router-link>
        <router-link to="/automation" class="mobile-link" @click="mobileMenuOpen = false">Automation</router-link>
        <router-link to="/goals" class="mobile-link" @click="mobileMenuOpen = false">Goals</router-link>

        <div v-if="userStore.isAuthenticated" class="mobile-user-section">
          <span class="mobile-user-info">{{ userStore.username }}</span>
          <button @click="emit('openChangePassword'); mobileMenuOpen = false" class="btn btn-ghost btn-sm">
            Change Password
          </button>
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

const emit = defineEmits(['openLogin', 'openChangePassword'])

const router = useRouter()
const userStore = useUserStore()
const notificationStore = useNotificationStore()

const mobileMenuOpen = ref(false)
const userDropdownOpen = ref(false)

// Click outside directive
const vClickOutside = {
  mounted(el, binding) {
    el._clickOutside = (event) => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value(event)
      }
    }
    document.addEventListener('click', el._clickOutside)
  },
  unmounted(el) {
    document.removeEventListener('click', el._clickOutside)
  }
}

function handleChangePassword() {
  userDropdownOpen.value = false
  emit('openChangePassword')
}

function handleLogout() {
  userDropdownOpen.value = false
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
  position: relative;
}

.user-menu-trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.user-menu-trigger:hover {
  background: var(--bg-hover);
}

.user-info {
  color: var(--text-primary);
  font-weight: 500;
}

.dropdown-arrow {
  color: var(--text-secondary);
  transition: transform 0.2s ease;
}

.dropdown-arrow.open {
  transform: rotate(180deg);
}

.user-dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  min-width: 180px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  padding: 0.5rem;
  z-index: 200;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.dropdown-item:hover {
  background: var(--bg-hover);
}

.dropdown-item svg {
  color: var(--text-secondary);
}

.dropdown-item-danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger-red);
}

.dropdown-item-danger:hover svg {
  color: var(--danger-red);
}

/* Dropdown transitions */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
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

.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: none;
}

.btn-ghost:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
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
