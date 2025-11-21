<template>
  <Transition name="fade">
    <div v-if="status" class="save-indicator" :class="`status-${status}`">
      <div class="indicator-content">
        <span class="indicator-icon">{{ icon }}</span>
        <span class="indicator-text">{{ message }}</span>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'
import { useNotificationStore } from '@stores/notification'

const notificationStore = useNotificationStore()
const status = computed(() => notificationStore.saveStatus)

const icon = computed(() => {
  switch (status.value) {
    case 'saving':
      return '●'
    case 'saved':
      return '✓'
    case 'error':
      return '✕'
    default:
      return ''
  }
})

const message = computed(() => {
  switch (status.value) {
    case 'saving':
      return 'Saving...'
    case 'saved':
      return 'All changes saved'
    case 'error':
      return 'Failed to save'
    default:
      return ''
  }
})
</script>

<style scoped>
.save-indicator {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  pointer-events: none;
}

.indicator-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--bg-card);
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  font-size: 0.875rem;
  font-weight: 500;
}

.indicator-icon {
  font-size: 1rem;
  line-height: 1;
}

.status-saving .indicator-icon {
  color: var(--primary-teal);
  animation: pulse 1.5s ease-in-out infinite;
}

.status-saved .indicator-icon {
  color: var(--success);
}

.status-error .indicator-icon {
  color: var(--error);
}

.indicator-text {
  color: var(--text-secondary);
  white-space: nowrap;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.2);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@media (max-width: 768px) {
  .save-indicator {
    top: 10px;
    right: 10px;
  }

  .indicator-content {
    padding: 0.4rem 0.75rem;
    font-size: 0.8125rem;
  }
}
</style>
