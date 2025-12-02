<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
          <button class="modal-close" @click="closeModal">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <div class="auth-form">
            <h2>Change Password</h2>
            <p class="auth-subtitle">Update your account password</p>

            <form @submit.prevent="handleChangePassword">
              <div class="form-group">
                <label for="current-password">Current Password</label>
                <input
                  id="current-password"
                  v-model="form.currentPassword"
                  type="password"
                  placeholder="Enter your current password"
                  required
                />
              </div>

              <div class="form-group">
                <label for="new-password">New Password</label>
                <input
                  id="new-password"
                  v-model="form.newPassword"
                  type="password"
                  placeholder="Enter your new password"
                  required
                  minlength="6"
                />
              </div>

              <div class="form-group">
                <label for="confirm-password">Confirm New Password</label>
                <input
                  id="confirm-password"
                  v-model="form.confirmPassword"
                  type="password"
                  placeholder="Confirm your new password"
                  required
                  minlength="6"
                />
              </div>

              <div v-if="error" class="error-message">
                {{ error }}
              </div>

              <div v-if="success" class="success-message">
                {{ success }}
              </div>

              <button type="submit" class="btn btn-primary btn-large" :disabled="isSubmitting">
                {{ isSubmitting ? 'Changing password...' : 'Change Password' }}
              </button>
            </form>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useNotificationStore } from '@stores/notification'
import { authAPI } from '@api/client'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const notificationStore = useNotificationStore()

const isSubmitting = ref(false)
const error = ref('')
const success = ref('')

const form = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

function closeModal() {
  emit('update:modelValue', false)
  resetForm()
}

function resetForm() {
  form.value = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  }
  error.value = ''
  success.value = ''
}

async function handleChangePassword() {
  if (isSubmitting.value) return

  error.value = ''
  success.value = ''

  // Validate passwords match
  if (form.value.newPassword !== form.value.confirmPassword) {
    error.value = 'New passwords do not match'
    return
  }

  // Validate new password is different
  if (form.value.currentPassword === form.value.newPassword) {
    error.value = 'New password must be different from current password'
    return
  }

  isSubmitting.value = true

  try {
    await authAPI.changePassword(
      form.value.currentPassword,
      form.value.newPassword
    )

    success.value = 'Password changed successfully!'
    notificationStore.success('Password changed successfully!')

    // Close modal after a short delay
    setTimeout(() => {
      closeModal()
    }, 1500)
  } catch (err) {
    error.value = err.message || 'Failed to change password. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}

watch(() => props.modelValue, (newVal) => {
  if (!newVal) {
    resetForm()
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  position: relative;
  background: var(--bg-card);
  border-radius: 20px;
  padding: 3rem 2.5rem;
  max-width: 480px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.auth-form {
  text-align: center;
}

.auth-form h2 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, var(--primary-teal), var(--primary-blue));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.auth-subtitle {
  color: var(--text-secondary);
  margin-bottom: 2rem;
}

.auth-form form {
  text-align: left;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-primary);
}

.form-group input {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  font-size: 1rem;
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: all 0.2s ease;
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary-teal);
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1);
}

.error-message {
  padding: 0.875rem 1rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--danger-red);
  border-radius: 8px;
  color: var(--danger-red);
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
}

.success-message {
  padding: 0.875rem 1rem;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid var(--success-green);
  border-radius: 8px;
  color: var(--success-green);
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
}

.btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary-teal), var(--primary-blue));
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(20, 184, 166, 0.3);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.3s ease;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.9);
}

@media (max-width: 640px) {
  .modal-content {
    padding: 2rem 1.5rem;
  }

  .auth-form h2 {
    font-size: 1.75rem;
  }
}
</style>
