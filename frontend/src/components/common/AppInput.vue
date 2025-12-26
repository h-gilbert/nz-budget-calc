<template>
  <div class="w-full">
    <label v-if="label" :for="id" class="text-sm font-semibold text-gray-700 mb-2 block">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <div class="relative">
      <span
        v-if="prefix"
        class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none"
      >
        {{ prefix }}
      </span>
      <input
        :id="id"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :min="min"
        :max="max"
        :step="step"
        :class="[
          'w-full bg-gray-50 border border-gray-200 rounded-2xl',
          'focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400',
          'transition-all duration-200 placeholder:text-gray-400',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          sizeClasses,
          prefix ? 'pl-8' : '',
          suffix ? 'pr-12' : '',
          mono ? 'font-mono' : '',
          error ? 'border-red-300 focus:border-red-400 focus:ring-red-500/20' : '',
        ]"
        @input="$emit('update:modelValue', $event.target.value)"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
      />
      <span
        v-if="suffix"
        class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"
      >
        {{ suffix }}
      </span>
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
  type: {
    type: String,
    default: 'text',
  },
  id: String,
  disabled: Boolean,
  required: Boolean,
  prefix: String,
  suffix: String,
  hint: String,
  error: String,
  mono: Boolean,
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
  min: [String, Number],
  max: [String, Number],
  step: [String, Number],
})

defineEmits(['update:modelValue', 'blur', 'focus'])

const sizeClasses = computed(() => {
  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-4 py-4 text-xl font-semibold',
  }
  return sizes[props.size]
})
</script>
