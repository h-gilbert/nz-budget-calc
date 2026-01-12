import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const APP_NAME = 'NZ Budget Calculator'

const routes = [
  {
    path: '/',
    name: 'Landing',
    component: () => import('@/views/LandingPage.vue'),
    meta: { title: 'Home' }
  },
  {
    path: '/setup',
    name: 'Setup',
    component: () => import('@/views/SetupPage.vue'),
    meta: { title: 'Budget Setup' }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { title: 'Dashboard' }
  },
  {
    path: '/transactions',
    name: 'Transactions',
    component: () => import('@/views/TransactionsPage.vue'),
    meta: { title: 'Transactions' }
  },
  {
    path: '/savings',
    name: 'Savings',
    component: () => import('@/views/SavingsPage.vue'),
    meta: { title: 'Savings' }
  },
  // Backwards-compatible redirects
  {
    path: '/calculator',
    redirect: '/setup'
  },
  {
    path: '/home',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

// Redirect authenticated users from landing to dashboard
router.beforeEach((to) => {
  if (to.name === 'Landing') {
    const userStore = useUserStore()
    if (userStore.isAuthenticated) {
      return { name: 'Dashboard' }
    }
  }
})

// Update document title on navigation
router.afterEach((to) => {
  const pageTitle = to.meta?.title
  document.title = pageTitle ? `${pageTitle} | ${APP_NAME}` : APP_NAME
})

export default router
