<template>
  <div class="tab-navigation">
    <div class="tab-list" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab-button', { active: modelValue === tab.id }]"
        :aria-selected="modelValue === tab.id"
        @click="$emit('update:modelValue', tab.id)"
        role="tab"
      >
        <span class="tab-icon" v-if="tab.icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
        <span v-if="tab.badge" class="tab-badge">{{ tab.badge }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  tabs: {
    type: Array,
    required: true
    // Format: [{ id: 'accounts', label: 'Accounts', icon: '💰', badge: null }]
  },
  modelValue: {
    type: String,
    required: true
  }
})

defineEmits(['update:modelValue'])
</script>

<style scoped>
.tab-navigation {
  width: 100%;
}

.tab-list {
  display: flex;
  gap: 0.5rem;
  border-bottom: 2px solid var(--border-light);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; /* Firefox */
}

.tab-list::-webkit-scrollbar {
  display: none; /* Chrome, Safari */
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  position: relative;
  margin-bottom: -2px;
}

.tab-button:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.tab-button.active {
  color: var(--primary-teal);
  border-bottom-color: var(--primary-teal);
}

.tab-icon {
  font-size: 1.25rem;
  line-height: 1;
}

.tab-label {
  font-weight: 600;
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.375rem;
  background: var(--danger-red);
  color: white;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 600;
}

/* Responsive Tab Navigation */
@media (max-width: 768px) {
  .tab-button {
    padding: 0.625rem 1rem;
    font-size: 0.875rem;
  }

  .tab-icon {
    font-size: 1.1rem;
  }

  .tab-label {
    font-size: 0.8rem;
  }
}
</style>
