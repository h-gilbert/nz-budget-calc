<template>
  <Teleport to="body">
    <div v-if="isLoading" class="loading-bar-container">
      <div class="loading-bar" :class="{ complete: isComplete }"></div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useNotificationStore } from '@stores/notification'

const notificationStore = useNotificationStore()
const isLoading = computed(() => notificationStore.isLoading)
const isComplete = ref(false)

// Watch for loading completion to trigger animation
watch(isLoading, (newVal) => {
  if (!newVal && !isComplete.value) {
    // Show complete state briefly before hiding
    isComplete.value = true
    setTimeout(() => {
      isComplete.value = false
    }, 300)
  }
})
</script>

<style scoped>
.loading-bar-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: 9999;
  pointer-events: none;
}

.loading-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-teal), var(--primary-blue));
  box-shadow: 0 0 10px rgba(110, 198, 192, 0.5);
  transform-origin: left;
  animation: loading 1.5s ease-in-out infinite;
}

.loading-bar.complete {
  animation: complete 0.3s ease-out forwards;
}

@keyframes loading {
  0% {
    transform: scaleX(0);
    transform-origin: left;
  }
  50% {
    transform: scaleX(0.7);
    transform-origin: left;
  }
  100% {
    transform: scaleX(0.9);
    transform-origin: left;
  }
}

@keyframes complete {
  0% {
    transform: scaleX(0.9);
    transform-origin: left;
  }
  100% {
    transform: scaleX(1);
    transform-origin: left;
    opacity: 0;
  }
}
</style>
