<template>
  <div :class="['summary-card', variantClass]">
    <div class="card-header">
      <div class="icon-wrapper" v-if="icon">
        <span class="icon">{{ icon }}</span>
      </div>
      <h3 class="card-title">{{ title }}</h3>
    </div>
    <div class="card-body">
      <div class="primary-value">{{ value }}</div>
      <div class="secondary-info" v-if="subtitle">{{ subtitle }}</div>
      <div class="additional-info" v-if="$slots.default">
        <slot></slot>
      </div>
    </div>
    <div class="card-footer" v-if="footer">
      <small>{{ footer }}</small>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  value: {
    type: [String, Number],
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  },
  footer: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: ''
  },
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'success', 'warning', 'danger', 'info'].includes(value)
  }
})

const variantClass = computed(() => {
  return props.variant !== 'default' ? `variant-${props.variant}` : ''
})
</script>

<style scoped>
.summary-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #f0f0f0;
  flex-shrink: 0;
}

.icon {
  font-size: 1.25rem;
}

.card-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.card-body {
  flex: 1;
}

.primary-value {
  font-size: 2rem;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 0.5rem;
  line-height: 1.2;
}

.secondary-info {
  font-size: 0.95rem;
  color: #6c757d;
  margin-bottom: 0.5rem;
}

.additional-info {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e9ecef;
}

.card-footer {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e9ecef;
  color: #6c757d;
  font-size: 0.875rem;
}

/* Variant styles */
.variant-success {
  border-left: 4px solid #28a745;
}

.variant-success .icon-wrapper {
  background-color: #d4edda;
  color: #28a745;
}

.variant-success .primary-value {
  color: #28a745;
}

.variant-warning {
  border-left: 4px solid #ffc107;
}

.variant-warning .icon-wrapper {
  background-color: #fff3cd;
  color: #856404;
}

.variant-warning .primary-value {
  color: #856404;
}

.variant-danger {
  border-left: 4px solid #dc3545;
}

.variant-danger .icon-wrapper {
  background-color: #f8d7da;
  color: #dc3545;
}

.variant-danger .primary-value {
  color: #dc3545;
}

.variant-info {
  border-left: 4px solid #17a2b8;
}

.variant-info .icon-wrapper {
  background-color: #d1ecf1;
  color: #0c5460;
}

.variant-info .primary-value {
  color: #0c5460;
}

@media (max-width: 768px) {
  .summary-card {
    padding: 1rem;
  }

  .primary-value {
    font-size: 1.5rem;
  }

  .card-title {
    font-size: 0.875rem;
  }
}
</style>
