<template>
  <Teleport to="body">
    <Transition name="confirm-modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[60] flex items-center justify-center p-4"
        @click.self="handleBackdropClick"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" />

        <!-- Modal Content -->
        <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
          <!-- Icon & Content -->
          <div class="px-6 pt-6 pb-4 text-center">
            <!-- Icon -->
            <div
              :class="[
                'w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center',
                variantClasses.iconBg
              ]"
            >
              <!-- Warning/Danger Icon -->
              <svg
                v-if="variant === 'danger'"
                class="w-7 h-7 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <!-- Warning Icon -->
              <svg
                v-else-if="variant === 'warning'"
                class="w-7 h-7 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <!-- Info Icon -->
              <svg
                v-else
                class="w-7 h-7 text-teal-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            <!-- Title -->
            <h3 class="text-lg font-bold text-gray-900 mb-2">{{ title }}</h3>

            <!-- Message -->
            <p class="text-sm text-gray-500">{{ message }}</p>
          </div>

          <!-- Actions -->
          <div class="px-6 pb-6 flex gap-3">
            <button
              type="button"
              @click="cancel"
              class="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              {{ cancelText }}
            </button>
            <button
              type="button"
              @click="confirm"
              :class="[
                'flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors',
                variantClasses.confirmBtn
              ]"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  title: {
    type: String,
    default: 'Are you sure?'
  },
  message: {
    type: String,
    default: 'This action cannot be undone.'
  },
  confirmText: {
    type: String,
    default: 'Confirm'
  },
  cancelText: {
    type: String,
    default: 'Cancel'
  },
  variant: {
    type: String,
    default: 'danger',
    validator: (v) => ['danger', 'warning', 'info'].includes(v)
  },
  closeOnBackdrop: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

const variantClasses = computed(() => {
  const variants = {
    danger: {
      iconBg: 'bg-red-100',
      confirmBtn: 'bg-red-500 hover:bg-red-600'
    },
    warning: {
      iconBg: 'bg-amber-100',
      confirmBtn: 'bg-amber-500 hover:bg-amber-600'
    },
    info: {
      iconBg: 'bg-teal-100',
      confirmBtn: 'bg-teal-500 hover:bg-teal-600'
    }
  }
  return variants[props.variant]
})

function confirm() {
  emit('confirm')
  emit('update:modelValue', false)
}

function cancel() {
  emit('cancel')
  emit('update:modelValue', false)
}

function handleBackdropClick() {
  if (props.closeOnBackdrop) {
    cancel()
  }
}
</script>

<style scoped>
.confirm-modal-enter-active,
.confirm-modal-leave-active {
  transition: opacity 0.15s ease;
}

.confirm-modal-enter-active > div:last-child,
.confirm-modal-leave-active > div:last-child {
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.confirm-modal-enter-from,
.confirm-modal-leave-to {
  opacity: 0;
}

.confirm-modal-enter-from > div:last-child,
.confirm-modal-leave-to > div:last-child {
  transform: scale(0.95);
  opacity: 0;
}
</style>
