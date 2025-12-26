import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Landing',
    component: () => import('@/views/LandingPage.vue')
  },
  {
    path: '/setup',
    name: 'Setup',
    component: () => import('@/views/SetupPage.vue')
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue')
  },
  {
    path: '/transactions',
    name: 'Transactions',
    component: () => import('@/views/TransactionsPage.vue')
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

export default router
