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

          <!-- Login Form -->
          <div v-if="!showRegister" class="auth-form">
            <h2>Welcome Back</h2>
            <p class="auth-subtitle">Login to save and access your budgets</p>

            <form @submit.prevent="handleLogin">
              <div class="form-group">
                <label for="login-username">Username</label>
                <input
                  id="login-username"
                  v-model="loginForm.username"
                  type="text"
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div class="form-group">
                <label for="login-password">Password</label>
                <input
                  id="login-password"
                  v-model="loginForm.password"
                  type="password"
                  placeholder="Enter your password"
                  required
                />
              </div>

              <div v-if="loginError" class="error-message">
                {{ loginError }}
              </div>

              <button type="submit" class="btn btn-primary btn-large" :disabled="isLoggingIn">
                {{ isLoggingIn ? 'Logging in...' : 'Login' }}
              </button>
            </form>

            <div class="auth-toggle">
              <p>Don't have an account? <a href="#" @click.prevent="showRegister = true">Register here</a></p>
            </div>
          </div>

          <!-- Register Form -->
          <div v-else class="auth-form">
            <h2>Create Account</h2>
            <p class="auth-subtitle">Sign up to save your budgets and access them anywhere</p>

            <form @submit.prevent="handleRegister">
              <div class="form-group">
                <label for="register-username">Username</label>
                <input
                  id="register-username"
                  v-model="registerForm.username"
                  type="text"
                  placeholder="Choose a username"
                  required
                />
              </div>

              <div class="form-group">
                <label for="register-password">Password</label>
                <input
                  id="register-password"
                  v-model="registerForm.password"
                  type="password"
                  placeholder="Choose a password"
                  required
                  minlength="6"
                />
              </div>

              <div v-if="registerError" class="error-message">
                {{ registerError }}
              </div>

              <button type="submit" class="btn btn-primary btn-large" :disabled="isRegistering">
                {{ isRegistering ? 'Creating account...' : 'Create Account' }}
              </button>
            </form>

            <div class="auth-toggle">
              <p>Already have an account? <a href="#" @click.prevent="showRegister = false">Login here</a></p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useUserStore } from '@stores/user'
import { useNotificationStore } from '@stores/notification'
import { authAPI } from '@api/client'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'loginSuccess'])

const userStore = useUserStore()
const notificationStore = useNotificationStore()

const showRegister = ref(false)
const isLoggingIn = ref(false)
const isRegistering = ref(false)
const loginError = ref('')
const registerError = ref('')

const loginForm = ref({
  username: '',
  password: ''
})

const registerForm = ref({
  username: '',
  password: ''
})

function closeModal() {
  emit('update:modelValue', false)
  resetForms()
}

function resetForms() {
  loginForm.value = { username: '', password: '' }
  registerForm.value = { username: '', password: '' }
  loginError.value = ''
  registerError.value = ''
  showRegister.value = false
}

async function handleLogin() {
  if (isLoggingIn.value) return

  loginError.value = ''
  isLoggingIn.value = true

  try {
    const response = await authAPI.login(
      loginForm.value.username,
      loginForm.value.password
    )

    userStore.login(response.user, response.token)
    notificationStore.success('Welcome back!')
    emit('loginSuccess')
    closeModal()
  } catch (error) {
    loginError.value = error.message || 'Login failed. Please check your credentials.'
  } finally {
    isLoggingIn.value = false
  }
}

async function handleRegister() {
  if (isRegistering.value) return

  registerError.value = ''
  isRegistering.value = true

  try {
    const response = await authAPI.register(
      registerForm.value.username,
      registerForm.value.password
    )

    userStore.login(response.user, response.token)
    notificationStore.success('Account created successfully!')
    emit('loginSuccess')
    closeModal()
  } catch (error) {
    registerError.value = error.message || 'Registration failed. Please try again.'
  } finally {
    isRegistering.value = false
  }
}

watch(() => props.modelValue, (newVal) => {
  if (!newVal) {
    resetForms()
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

.auth-toggle {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border-light);
}

.auth-toggle p {
  color: var(--text-secondary);
  margin: 0;
}

.auth-toggle a {
  color: var(--primary-teal);
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s ease;
}

.auth-toggle a:hover {
  color: var(--primary-blue);
  text-decoration: underline;
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
