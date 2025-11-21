<template>
  <div class="progress-container">
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
    </div>

    <div class="progress-steps">
      <div
        v-for="step in steps"
        :key="step.id"
        :class="[
          'progress-step',
          {
            'active': step.id === currentStep,
            'completed': isStepCompleted(step.id)
          }
        ]"
        @click="goToStep(step.id)"
      >
        <div class="step-number">
          <span v-if="isStepCompleted(step.id)" class="checkmark">✓</span>
          <span v-else>{{ step.id }}</span>
        </div>
        <div class="step-info">
          <div class="step-title">{{ step.title }}</div>
          <div class="step-description">{{ step.description }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useWizardStore } from '@stores/wizard'

const wizardStore = useWizardStore()

const currentStep = computed(() => wizardStore.currentStep)
const steps = computed(() => wizardStore.steps)
const progress = computed(() => wizardStore.progress)

function isStepCompleted(stepNumber) {
  return wizardStore.isStepCompleted(stepNumber)
}

function goToStep(stepNumber) {
  wizardStore.goToStep(stepNumber)
}
</script>

<style scoped>
.progress-container {
  margin-bottom: var(--spacing-xl);
}

.progress-bar {
  height: 4px;
  background: var(--border-light);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-bottom: var(--spacing-lg);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-teal), var(--primary-blue));
  transition: width var(--transition-slow);
}

.progress-steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--spacing-md);
}

.progress-step {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
}

.progress-step:hover {
  background: var(--bg-hover);
}

.progress-step.active {
  background: var(--bg-hover);
  border: 1px solid var(--primary-teal);
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: var(--bg-input);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
  flex-shrink: 0;
  transition: all var(--transition-base);
}

.progress-step.active .step-number {
  background: linear-gradient(135deg, var(--primary-teal), var(--primary-blue));
  color: white;
}

.progress-step.completed .step-number {
  background: var(--success);
  color: white;
}

.checkmark {
  font-size: 1.125rem;
}

.step-info {
  flex: 1;
  min-width: 0;
}

.step-title {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.step-description {
  font-size: 0.75rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 768px) {
  .progress-steps {
    grid-template-columns: repeat(2, 1fr);
  }

  .step-description {
    display: none;
  }
}
</style>
