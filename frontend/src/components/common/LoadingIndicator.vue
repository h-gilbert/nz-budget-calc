<template>
  <Transition name="fade">
    <div
      v-if="notificationStore.isLoading"
      class="fixed top-0 left-0 right-0 z-[100] h-1 bg-gray-200 overflow-hidden"
    >
      <div class="h-full bg-gradient-to-r from-teal-400 via-teal-500 to-teal-400 animate-loading" />
    </div>
  </Transition>
</template>

<script setup>
import { useNotificationStore } from '@/stores/notification'

const notificationStore = useNotificationStore()
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes loading {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.animate-loading {
  animation: loading 1.5s ease-in-out infinite;
  width: 50%;
}
</style>
