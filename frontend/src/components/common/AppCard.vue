<template>
  <div
    :class="[
      'bg-white border border-gray-100 transition-all duration-200',
      rounded,
      padded ? padding : '',
      shadow,
      hoverable
        ? 'hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:border-teal-200 cursor-pointer'
        : '',
    ]"
  >
    <slot />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  padded: {
    type: Boolean,
    default: true,
  },
  padding: {
    type: String,
    default: 'p-6',
  },
  hoverable: Boolean,
  rounded: {
    type: String,
    default: 'rounded-3xl',
  },
  shadow: {
    type: String,
    default: 'shadow-[0_4px_20px_rgba(0,0,0,0.05)]',
  },
})
</script>
