<template>
  <AppModal v-model="isOpen" title="Welcome Back" size="sm">
    <div class="space-y-6">
      <!-- Tab Toggle -->
      <div class="flex gap-1 p-1 bg-gray-100 rounded-xl">
        <button
          v-for="tab in ['login', 'register']"
          :key="tab"
          @click="activeTab = tab"
          :class="[
            'flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all',
            activeTab === tab
              ? 'bg-white text-teal-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700',
          ]"
        >
          {{ tab === 'login' ? 'Login' : 'Create Account' }}
        </button>
      </div>

      <!-- Error Message -->
      <div
        v-if="error"
        class="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600"
      >
        {{ error }}
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <AppInput
          v-model="username"
          label="Username"
          placeholder="Enter your username"
          required
          :error="fieldErrors.username"
        />

        <AppInput
          v-model="password"
          type="password"
          label="Password"
          placeholder="Enter your password"
          required
          :error="fieldErrors.password"
        />

        <AppInput
          v-if="activeTab === 'register'"
          v-model="confirmPassword"
          type="password"
          label="Confirm Password"
          placeholder="Confirm your password"
          required
          :error="fieldErrors.confirmPassword"
        />

        <AppButton
          type="submit"
          :loading="loading"
          class="w-full"
        >
          {{ activeTab === 'login' ? 'Login' : 'Create Account' }}
        </AppButton>
      </form>
    </div>
  </AppModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { authAPI } from '@/api/client'
import AppModal from '@/components/common/AppModal.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppButton from '@/components/common/AppButton.vue'

const props = defineProps({
  modelValue: Boolean,
})

const emit = defineEmits(['update:modelValue', 'loginSuccess'])

const userStore = useUserStore()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const activeTab = ref('login')
const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const fieldErrors = ref({})

// Reset form when modal opens/closes or tab changes
watch([isOpen, activeTab], () => {
  username.value = ''
  password.value = ''
  confirmPassword.value = ''
  error.value = ''
  fieldErrors.value = {}
})

async function handleSubmit() {
  error.value = ''
  fieldErrors.value = {}

  // Validation
  if (!username.value.trim()) {
    fieldErrors.value.username = 'Username is required'
    return
  }

  if (!password.value) {
    fieldErrors.value.password = 'Password is required'
    return
  }

  if (activeTab.value === 'register') {
    if (password.value.length < 6) {
      fieldErrors.value.password = 'Password must be at least 6 characters'
      return
    }
    if (password.value !== confirmPassword.value) {
      fieldErrors.value.confirmPassword = 'Passwords do not match'
      return
    }
  }

  loading.value = true

  try {
    let response
    if (activeTab.value === 'login') {
      response = await authAPI.login(username.value, password.value)
    } else {
      response = await authAPI.register(username.value, password.value)
    }

    if (response?.token && response?.user) {
      userStore.login(response.user, response.token)
      emit('loginSuccess')
      isOpen.value = false
    }
  } catch (err) {
    error.value = err.message || 'An error occurred. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>
