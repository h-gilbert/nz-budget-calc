<template>
  <AppModal v-model="isOpen" title="Change Password" size="sm">
    <div class="space-y-6">
      <!-- Success Message -->
      <div
        v-if="success"
        class="p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-600"
      >
        Password changed successfully!
      </div>

      <!-- Error Message -->
      <div
        v-if="error"
        class="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600"
      >
        {{ error }}
      </div>

      <!-- Form -->
      <form v-if="!success" @submit.prevent="handleSubmit" class="space-y-4">
        <AppInput
          v-model="currentPassword"
          type="password"
          label="Current Password"
          placeholder="Enter your current password"
          required
          :error="fieldErrors.currentPassword"
        />

        <AppInput
          v-model="newPassword"
          type="password"
          label="New Password"
          placeholder="Enter your new password"
          required
          hint="Must be at least 6 characters"
          :error="fieldErrors.newPassword"
        />

        <AppInput
          v-model="confirmPassword"
          type="password"
          label="Confirm New Password"
          placeholder="Confirm your new password"
          required
          :error="fieldErrors.confirmPassword"
        />

        <AppButton
          type="submit"
          :loading="loading"
          class="w-full"
        >
          Change Password
        </AppButton>
      </form>

      <!-- Close button after success -->
      <AppButton
        v-if="success"
        variant="secondary"
        @click="isOpen = false"
        class="w-full"
      >
        Close
      </AppButton>
    </div>
  </AppModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { authAPI } from '@/api/client'
import AppModal from '@/components/common/AppModal.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppButton from '@/components/common/AppButton.vue'

const props = defineProps({
  modelValue: Boolean,
})

const emit = defineEmits(['update:modelValue'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const success = ref(false)
const fieldErrors = ref({})

// Reset form when modal opens/closes
watch(isOpen, (open) => {
  if (open) {
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    error.value = ''
    success.value = false
    fieldErrors.value = {}
  }
})

async function handleSubmit() {
  error.value = ''
  fieldErrors.value = {}

  // Validation
  if (!currentPassword.value) {
    fieldErrors.value.currentPassword = 'Current password is required'
    return
  }

  if (!newPassword.value) {
    fieldErrors.value.newPassword = 'New password is required'
    return
  }

  if (newPassword.value.length < 6) {
    fieldErrors.value.newPassword = 'Password must be at least 6 characters'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    fieldErrors.value.confirmPassword = 'Passwords do not match'
    return
  }

  loading.value = true

  try {
    await authAPI.changePassword(currentPassword.value, newPassword.value)
    success.value = true
  } catch (err) {
    error.value = err.message || 'Failed to change password. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>
