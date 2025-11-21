import { ref } from 'vue'
import { useUserStore } from '@stores/user'
import { useNotificationStore } from '@stores/notification'
import { authAPI } from '@api/client'

export function useAuth() {
  const userStore = useUserStore()
  const notificationStore = useNotificationStore()

  const isLoading = ref(false)
  const error = ref(null)

  async function register(username, email, password) {
    isLoading.value = true
    error.value = null

    try {
      const response = await authAPI.register(username, email, password)

      if (response.token && response.user) {
        userStore.login(response.user, response.token)
        notificationStore.success('Account created successfully!')
        return { success: true, user: response.user }
      }
    } catch (err) {
      error.value = err.message
      notificationStore.error(err.message || 'Registration failed')
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  async function login(username, password) {
    isLoading.value = true
    error.value = null

    try {
      const response = await authAPI.login(username, password)

      if (response.token && response.user) {
        userStore.login(response.user, response.token)
        notificationStore.success(`Welcome back, ${response.user.username}!`)
        return { success: true, user: response.user }
      }
    } catch (err) {
      error.value = err.message
      notificationStore.error(err.message || 'Login failed')
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  async function logout() {
    isLoading.value = true

    try {
      await authAPI.logout()
      userStore.logout()
      notificationStore.info('You have been logged out')
      return { success: true }
    } catch (err) {
      // Even if API call fails, still logout locally
      userStore.logout()
      return { success: true }
    } finally {
      isLoading.value = false
    }
  }

  async function checkAuth() {
    const token = userStore.restoreSession()
    if (!token) {
      return { isAuthenticated: false }
    }

    isLoading.value = true

    try {
      const response = await authAPI.getCurrentUser()
      if (response.user) {
        userStore.login(response.user, token)
        return { isAuthenticated: true, user: response.user }
      }
    } catch (err) {
      // Token invalid, clear it
      userStore.logout()
      return { isAuthenticated: false }
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    error,
    register,
    login,
    logout,
    checkAuth
  }
}
