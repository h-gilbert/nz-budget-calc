import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import Calculator from '@/views/Calculator.vue'
import Dashboard from '@/views/Dashboard.vue'
import Accounts from '@/views/Accounts.vue'

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
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
