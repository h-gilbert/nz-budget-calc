<template>
  <button
    :type="type"
    :class="[
      'inline-flex items-center justify-center font-semibold transition-all duration-200',
      'active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
      variantClasses,
      sizeClasses,
    ]"
    :disabled="disabled || loading"
  >
    <svg
      v-if="loading"
      class="animate-spin -ml-1 mr-2 h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
    <slot name="icon-left" />
    <slot />
    <slot name="icon-right" />
  </button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'ghost', 'danger'].includes(v),
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
  type: {
    type: String,
    default: 'button',
  },
  loading: Boolean,
  disabled: Boolean,
})

const variantClasses = computed(() => {
  const variants = {
    primary:
      'bg-teal-500 text-white hover:bg-teal-600 shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-2xl',
    secondary:
      'bg-white text-gray-700 border border-gray-200 hover:border-teal-300 hover:text-teal-600 shadow-[0_4px_20px_rgba(0,0,0,0.05)] rounded-2xl',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 rounded-2xl',
    danger:
      'bg-red-500 text-white hover:bg-red-600 shadow-[0_4px_20px_rgba(0,0,0,0.05)] rounded-2xl',
  }
  return variants[props.variant]
})

const sizeClasses = computed(() => {
  const sizes = {
    sm: 'px-4 py-2 text-sm gap-1.5',
    md: 'px-6 py-3 text-base gap-2',
    lg: 'px-8 py-4 text-lg gap-2.5',
  }
  return sizes[props.size]
})
</script>
