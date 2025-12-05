import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import Calculator from '@/views/Calculator.vue'
import Dashboard from '@/views/Dashboard.vue'
import MoneyManagement from '@/views/MoneyManagement.vue'
import Transactions from '@/views/Transactions.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/calculator',
    name: 'Calculator',
    component: Calculator
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard
  },
  {
    path: '/money',
    name: 'MoneyManagement',
    component: MoneyManagement,
    meta: { title: 'Money Management' }
  },
  {
    path: '/transactions',
    name: 'Transactions',
    component: Transactions
  },

  // Backwards-compatible redirects for old routes
  {
    path: '/accounts',
    redirect: { name: 'MoneyManagement', query: { tab: 'accounts' } }
  },
  {
    path: '/planning',
    redirect: { name: 'MoneyManagement', query: { tab: 'planning' } }
  },
  {
    path: '/automation',
    redirect: { name: 'MoneyManagement', query: { tab: 'automation' } }
  },
  {
    path: '/goals',
    redirect: { name: 'MoneyManagement', query: { tab: 'goals' } }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // Scroll to top when changing routes
    // But preserve scroll when changing tabs within MoneyManagement
    if (to.name === 'MoneyManagement' && from.name === 'MoneyManagement') {
      return savedPosition || { top: 0 }
    }
    return { top: 0 }
  }
})

export default router
