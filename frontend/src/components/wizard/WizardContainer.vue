<template>
  <div class="wizard-container">
    <ProgressIndicator />

    <div class="wizard-content card">
      <slot :step="currentStep"></slot>
    </div>

    <div class="wizard-actions flex justify-between mt-xl">
      <Button
        v-if="!isFirstStep"
        variant="secondary"
        @click="previousStep"
      >
        Previous
      </Button>
      <div v-else></div>

      <Button
        v-if="!isLastStep"
        variant="primary"
        @click="nextStep"
      >
        Next
      </Button>
      <Button
        v-else
        variant="success"
        @click="handleFinish"
      >
        Calculate Budget
      </Button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useWizardStore } from '@stores/wizard'
import ProgressIndicator from './ProgressIndicator.vue'
import Button from '@components/ui/Button.vue'

const wizardStore = useWizardStore()

const currentStep = computed(() => wizardStore.currentStep)
const isFirstStep = computed(() => wizardStore.isFirstStep)
const isLastStep = computed(() => wizardStore.isLastStep)

const emit = defineEmits(['finish'])

function previousStep() {
  wizardStore.previousStep()
}

function nextStep() {
  wizardStore.nextStep()
}

function handleFinish() {
  emit('finish')
}
</script>

<style scoped>
.wizard-container {
  max-width: 900px;
  margin: 0 auto;
}

.wizard-content {
  min-height: 400px;
  margin-bottom: var(--spacing-xl);
}
</style>
