import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  // State
  const currentUser = ref(null)
  const isAuthenticated = ref(false)
  const authToken = ref(null)
  const savedBudgets = ref([])
  const defaultBudget = ref(null)

  // Computed
  const username = computed(() => currentUser.value?.username || null)
  const userEmail = computed(() => currentUser.value?.email || null)

  // Actions
  function login(userData, token) {
    currentUser.value = userData
    authToken.value = token
    isAuthenticated.value = true

    // Store token in localStorage
    if (token) {
      localStorage.setItem('authToken', token)
    }
  }

  function logout() {
    currentUser.value = null
    authToken.value = null
    isAuthenticated.value = false
    savedBudgets.value = []
    defaultBudget.value = null

    // Clear token from localStorage
    localStorage.removeItem('authToken')
  }

  function updateUser(userData) {
    if (currentUser.value) {
      currentUser.value = { ...currentUser.value, ...userData }
    }
  }

  function setSavedBudgets(budgets) {
    savedBudgets.value = budgets
  }

  function addSavedBudget(budget) {
    savedBudgets.value.push(budget)
  }

  function updateSavedBudget(budgetId, budgetData) {
    const index = savedBudgets.value.findIndex(b => b.id === budgetId)
    if (index > -1) {
      savedBudgets.value[index] = { ...savedBudgets.value[index], ...budgetData }
    }
  }

  function removeSavedBudget(budgetId) {
    const index = savedBudgets.value.findIndex(b => b.id === budgetId)
    if (index > -1) {
      savedBudgets.value.splice(index, 1)
    }
  }

  function setDefaultBudget(budget) {
    defaultBudget.value = budget
  }

  function restoreSession() {
    // Try to restore session from localStorage
    const token = localStorage.getItem('authToken')
    if (token) {
      authToken.value = token
      // Note: The actual user data should be fetched from API
      // This will be handled by the composable/API layer
      return token
    }
    return null
  }

  return {
    // State
    currentUser,
    isAuthenticated,
    authToken,
    savedBudgets,
    defaultBudget,

    // Computed
    username,
    userEmail,

    // Actions
    login,
    logout,
    updateUser,
    setSavedBudgets,
    addSavedBudget,
    updateSavedBudget,
    removeSavedBudget,
    setDefaultBudget,
    restoreSession
  }
})
