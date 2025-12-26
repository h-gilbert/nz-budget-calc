<template>
  <div class="relative" ref="dropdownRef">
    <label v-if="label" class="block text-sm font-medium text-slate-700 mb-2">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>

    <!-- Trigger Button -->
    <button
      type="button"
      @click="toggleDropdown"
      class="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl transition-all duration-200 text-left"
      :class="[
        isOpen ? 'ring-2 ring-teal-500 border-transparent' : 'hover:border-gray-300',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      ]"
      :disabled="disabled"
    >
      <span v-if="selectedOption" class="flex items-center gap-3 min-w-0">
        <slot name="selected" :option="selectedOption">
          <span class="text-slate-800 truncate">{{ selectedOption.label }}</span>
        </slot>
      </span>
      <span v-else class="text-slate-400">{{ placeholder }}</span>

      <!-- Chevron -->
      <svg
        class="w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-200"
        :class="{ 'rotate-180': isOpen }"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
      </svg>
    </button>

    <!-- Dropdown Panel -->
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div
        v-if="isOpen"
        class="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden"
      >
        <!-- Search (optional) -->
        <div v-if="searchable" class="p-2 border-b border-gray-100">
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="text"
            :placeholder="searchPlaceholder"
            class="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
          />
        </div>

        <!-- Options List -->
        <div class="max-h-64 overflow-y-auto py-1">
          <div v-if="filteredOptions.length === 0" class="px-4 py-3 text-sm text-slate-500 text-center">
            No options found
          </div>
          <button
            v-for="option in filteredOptions"
            :key="option.value"
            type="button"
            @click="selectOption(option)"
            class="w-full px-4 py-3 text-left transition-colors duration-150"
            :class="[
              option.value === modelValue
                ? 'bg-teal-50 text-teal-800'
                : 'hover:bg-gray-50 text-slate-700'
            ]"
          >
            <slot name="option" :option="option" :selected="option.value === modelValue">
              <div class="flex items-center justify-between">
                <span>{{ option.label }}</span>
                <svg
                  v-if="option.value === modelValue"
                  class="w-5 h-5 text-teal-600"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                </svg>
              </div>
            </slot>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  modelValue: [String, Number],
  options: {
    type: Array,
    required: true
  },
  label: String,
  placeholder: {
    type: String,
    default: 'Select an option...'
  },
  disabled: Boolean,
  required: Boolean,
  searchable: Boolean,
  searchPlaceholder: {
    type: String,
    default: 'Search...'
  }
})

const emit = defineEmits(['update:modelValue'])

const dropdownRef = ref(null)
const searchInput = ref(null)
const isOpen = ref(false)
const searchQuery = ref('')

const selectedOption = computed(() => {
  return props.options.find(opt => opt.value === props.modelValue)
})

const filteredOptions = computed(() => {
  if (!searchQuery.value) return props.options
  const query = searchQuery.value.toLowerCase()
  return props.options.filter(opt =>
    opt.label.toLowerCase().includes(query) ||
    (opt.searchTerms && opt.searchTerms.toLowerCase().includes(query))
  )
})

function toggleDropdown() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
  if (isOpen.value && props.searchable) {
    nextTick(() => searchInput.value?.focus())
  }
}

function selectOption(option) {
  emit('update:modelValue', option.value)
  isOpen.value = false
  searchQuery.value = ''
}

function handleClickOutside(event) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    isOpen.value = false
    searchQuery.value = ''
  }
}

function handleEscape(event) {
  if (event.key === 'Escape' && isOpen.value) {
    isOpen.value = false
    searchQuery.value = ''
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleEscape)
})

// Reset search when dropdown closes
watch(isOpen, (open) => {
  if (!open) searchQuery.value = ''
})
</script>
