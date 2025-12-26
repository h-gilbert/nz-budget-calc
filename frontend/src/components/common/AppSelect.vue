<template>
  <div class="w-full">
    <label v-if="label" :for="id" class="text-sm font-semibold text-gray-700 mb-2 block">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <div class="relative">
      <select
        :id="id"
        :value="modelValue"
        :disabled="disabled"
        :required="required"
        :class="[
          'w-full bg-gray-50 border border-gray-200 rounded-2xl appearance-none',
          'focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400',
          'transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'pr-10',
          sizeClasses,
          error ? 'border-red-300 focus:border-red-400 focus:ring-red-500/20' : '',
        ]"
        @change="$emit('update:modelValue', $event.target.value)"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option v-for="option in normalizedOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <svg
        class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fill-rule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
          clip-rule="evenodd"
        />
      </svg>
    </div>
    <p v-if="error" class="mt-1.5 text-sm text-red-500">{{ error }}</p>
    <p v-else-if="hint" class="mt-1.5 text-sm text-gray-500">{{ hint }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: [String, Number],
  label: String,
  placeholder: String,
  options: {
    type: Array,
    required: true,
  },
  id: String,
  disabled: Boolean,
  required: Boolean,
  hint: String,
  error: String,
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
})

defineEmits(['update:modelValue'])

const normalizedOptions = computed(() => {
  return props.options.map((opt) => {
    if (typeof opt === 'object') {
      return opt
    }
    return { value: opt, label: opt }
  })
})

const sizeClasses = computed(() => {
  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-4 py-4 text-lg',
  }
  return sizes[props.size]
})
</script>
