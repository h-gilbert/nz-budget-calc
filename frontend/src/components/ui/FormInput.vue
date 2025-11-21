<template>
  <div class="form-group">
    <label v-if="label" :for="inputId" class="form-label">
      {{ label }}
      <span v-if="required" class="text-error">*</span>
    </label>

    <input
      v-if="type !== 'textarea' && type !== 'select'"
      :id="inputId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :class="inputClasses"
      @input="handleInput"
      @blur="handleBlur"
    />

    <textarea
      v-else-if="type === 'textarea'"
      :id="inputId"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :rows="rows"
      :class="textareaClasses"
      @input="handleInput"
      @blur="handleBlur"
    ></textarea>

    <select
      v-else-if="type === 'select'"
      :id="inputId"
      :value="modelValue"
      :disabled="disabled"
      :required="required"
      :class="selectClasses"
      @change="handleChange"
      @blur="handleBlur"
    >
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>

    <span v-if="error" class="form-error">{{ error }}</span>
    <span v-else-if="help" class="form-help">{{ help }}</span>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  label: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  required: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  },
  help: {
    type: String,
    default: ''
  },
  rows: {
    type: Number,
    default: 4
  },
  options: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'blur'])

const inputId = ref(`input-${Math.random().toString(36).substring(7)}`)

const baseClasses = computed(() => {
  const classes = []
  if (props.error) classes.push('error')
  return classes
})

const inputClasses = computed(() => ['form-input', ...baseClasses.value].join(' '))
const textareaClasses = computed(() => ['form-textarea', ...baseClasses.value].join(' '))
const selectClasses = computed(() => ['form-select', ...baseClasses.value].join(' '))

function handleInput(event) {
  const value = props.type === 'number' ? parseFloat(event.target.value) || 0 : event.target.value
  emit('update:modelValue', value)
}

function handleChange(event) {
  const value = props.type === 'number' ? parseFloat(event.target.value) || 0 : event.target.value
  emit('update:modelValue', value)
}

function handleBlur(event) {
  emit('blur', event)
}
</script>
