import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import Calculator from '@/views/Calculator.vue'
import Dashboard from '@/views/Dashboard.vue'
import Accounts from '@/views/Accounts.vue'
import Transactions from '@/views/Transactions.vue'
import Planning from '@/views/Planning.vue'
import Automation from '@/views/Automation.vue'
import Goals from '@/views/Goals.vue'

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
    path: '/accounts',
    name: 'Accounts',
    component: Accounts
  },
  {
    path: '/transactions',
    name: 'Transactions',
    component: Transactions
  },
  {
    path: '/planning',
    name: 'Planning',
    component: Planning
  },
  {
    path: '/automation',
    name: 'Automation',
    component: Automation
  },
  {
    path: '/goals',
    name: 'Goals',
    component: Goals
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
