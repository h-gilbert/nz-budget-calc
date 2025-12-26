<template>
  <div>
    <!-- Tab Headers -->
    <div class="flex gap-1 p-1 bg-gray-100 rounded-2xl">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        @click="selectTab(tab.id)"
        :class="[
          'flex-1 px-2 sm:px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200',
          'flex items-center justify-center gap-1 sm:gap-2 min-w-0',
          modelValue === tab.id
            ? 'bg-white text-teal-600 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'
            : 'text-gray-500 hover:text-gray-700',
        ]"
      >
        <component v-if="tab.icon" :is="tab.icon" class="w-5 h-5 flex-shrink-0" />
        <span class="truncate">{{ tab.label }}</span>
        <span
          v-if="tab.badge !== undefined"
          :class="[
            'flex-shrink-0 ml-0.5 sm:ml-1 px-1.5 sm:px-2 py-0.5 text-xs font-bold rounded-full',
            modelValue === tab.id ? 'bg-teal-100 text-teal-700' : 'bg-gray-200 text-gray-600',
          ]"
        >
          {{ tab.badge }}
        </span>
      </button>
    </div>

    <!-- Tab Content -->
    <div class="mt-6">
      <slot :active-tab="modelValue" />
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  tabs: {
    type: Array,
    required: true,
    // Each tab: { id: string, label: string, icon?: Component, badge?: string|number }
  },
  modelValue: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['update:modelValue'])

function selectTab(tabId) {
  emit('update:modelValue', tabId)
}
</script>
