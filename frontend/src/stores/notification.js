import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useNotificationStore = defineStore('notification', () => {
  // Loading state for top bar
  const isLoading = ref(false)
  const loadingCount = ref(0)

  // Save status for inline indicator
  const saveStatus = ref(null) // null | 'saving' | 'saved' | 'error'
  const saveTimeout = ref(null)

  // Actions for loading bar
  function startLoading() {
    loadingCount.value++
    isLoading.value = true
  }

  function stopLoading() {
    loadingCount.value = Math.max(0, loadingCount.value - 1)
    if (loadingCount.value === 0) {
      isLoading.value = false
    }
  }

  // Actions for save indicator
  function setSaving() {
    if (saveTimeout.value) {
      clearTimeout(saveTimeout.value)
    }
    saveStatus.value = 'saving'
  }

  function setSaved() {
    saveStatus.value = 'saved'

    // Auto-hide after 2 seconds
    if (saveTimeout.value) {
      clearTimeout(saveTimeout.value)
    }
    saveTimeout.value = setTimeout(() => {
      saveStatus.value = null
    }, 2000)
  }

  function setError(message = 'Failed to save') {
    saveStatus.value = 'error'

    // Show error message in console for debugging
    console.error('Save error:', message)

    // Auto-hide after 4 seconds
    if (saveTimeout.value) {
      clearTimeout(saveTimeout.value)
    }
    saveTimeout.value = setTimeout(() => {
      saveStatus.value = null
    }, 4000)
  }

  function clearSaveStatus() {
    if (saveTimeout.value) {
      clearTimeout(saveTimeout.value)
    }
    saveStatus.value = null
  }

  // Legacy compatibility methods (for existing code using old toast system)
  function success(message, duration = null) {
    console.log('✓', message)
    setSaved()
  }

  function error(message, duration = null) {
    console.error('✕', message)
    setError(message)
  }

  function warning(message, duration = null) {
    console.warn('⚠', message)
  }

  function info(message, duration = null) {
    console.info('ℹ', message)
  }

  return {
    // Loading state
    isLoading,
    loadingCount,
    startLoading,
    stopLoading,

    // Save status
    saveStatus,
    setSaving,
    setSaved,
    setError,
    clearSaveStatus,

    // Legacy compatibility
    success,
    error,
    warning,
    info
  }
})
