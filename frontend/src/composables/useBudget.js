import { ref } from 'vue'
import { useBudgetStore } from '@stores/budget'
import { useUserStore } from '@stores/user'
import { useNotificationStore } from '@stores/notification'
import { budgetAPI } from '@api/client'

export function useBudget() {
  const budgetStore = useBudgetStore()
  const userStore = useUserStore()
  const notificationStore = useNotificationStore()

  const isLoading = ref(false)
  const isSaving = ref(false)
  const isCalculating = ref(false)
  const error = ref(null)

  async function calculate() {
    isCalculating.value = true
    error.value = null

    try {
      const budgetData = budgetStore.getBudgetData()
      const response = await budgetAPI.calculate(budgetData)

      if (response && response.results) {
        budgetStore.setResults(response.results)
        notificationStore.success('Budget calculated successfully!')
        return { success: true, results: response.results }
      }
    } catch (err) {
      error.value = err.message
      notificationStore.error(err.message || 'Calculation failed')
      return { success: false, error: err.message }
    } finally {
      isCalculating.value = false
    }
  }

  async function save() {
    if (!userStore.isAuthenticated) {
      notificationStore.warning('Please log in to save your budget')
      return { success: false, error: 'Not authenticated' }
    }

    isSaving.value = true
    error.value = null

    try {
      const budgetData = budgetStore.getBudgetData()
      const response = await budgetAPI.save(budgetData)

      if (response) {
        notificationStore.success('Budget saved successfully!')
        return { success: true, budgetId: response.budgetId }
      }
    } catch (err) {
      error.value = err.message
      notificationStore.error(err.message || 'Failed to save budget')
      return { success: false, error: err.message }
    } finally {
      isSaving.value = false
    }
  }

  async function update(budgetId) {
    if (!userStore.isAuthenticated) {
      notificationStore.warning('Please log in to update your budget')
      return { success: false, error: 'Not authenticated' }
    }

    isSaving.value = true
    error.value = null

    try {
      const budgetData = budgetStore.getBudgetData()
      const response = await budgetAPI.update(budgetId, budgetData)

      if (response) {
        notificationStore.success('Budget updated successfully!')
        return { success: true }
      }
    } catch (err) {
      error.value = err.message
      notificationStore.error(err.message || 'Failed to update budget')
      return { success: false, error: err.message }
    } finally {
      isSaving.value = false
    }
  }

  async function load(budgetId) {
    isLoading.value = true
    error.value = null

    try {
      const budget = await budgetAPI.getById(budgetId)

      if (budget) {
        budgetStore.loadBudgetData(budget)
        notificationStore.success('Budget loaded successfully!')
        return { success: true, budget }
      }
    } catch (err) {
      error.value = err.message
      notificationStore.error(err.message || 'Failed to load budget')
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  async function loadDefault() {
    if (!userStore.isAuthenticated) {
      return { success: false, error: 'Not authenticated' }
    }

    isLoading.value = true
    error.value = null

    try {
      const budget = await budgetAPI.getDefault()

      if (budget) {
        budgetStore.loadBudgetData(budget)
        userStore.setDefaultBudget(budget)
        return { success: true, budget }
      }
    } catch (err) {
      // Default budget might not exist, that's okay
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  async function loadAll() {
    if (!userStore.isAuthenticated) {
      return { success: false, error: 'Not authenticated' }
    }

    isLoading.value = true
    error.value = null

    try {
      const response = await budgetAPI.getAll()

      if (response && response.budgets) {
        userStore.setSavedBudgets(response.budgets)
        return { success: true, budgets: response.budgets }
      }
    } catch (err) {
      error.value = err.message
      notificationStore.error(err.message || 'Failed to load budgets')
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  async function deleteBudget(budgetId) {
    if (!userStore.isAuthenticated) {
      notificationStore.warning('Please log in to delete budgets')
      return { success: false, error: 'Not authenticated' }
    }

    isLoading.value = true
    error.value = null

    try {
      await budgetAPI.delete(budgetId)
      userStore.removeSavedBudget(budgetId)
      notificationStore.success('Budget deleted successfully!')
      return { success: true }
    } catch (err) {
      error.value = err.message
      notificationStore.error(err.message || 'Failed to delete budget')
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  async function setAsDefault(budgetId) {
    if (!userStore.isAuthenticated) {
      return { success: false, error: 'Not authenticated' }
    }

    isLoading.value = true
    error.value = null

    try {
      const response = await budgetAPI.setDefault(budgetId)

      if (response) {
        notificationStore.success('Default budget set!')
        return { success: true }
      }
    } catch (err) {
      error.value = err.message
      notificationStore.error(err.message || 'Failed to set default budget')
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    isSaving,
    isCalculating,
    error,
    calculate,
    save,
    update,
    load,
    loadDefault,
    loadAll,
    deleteBudget,
    setAsDefault
  }
}
