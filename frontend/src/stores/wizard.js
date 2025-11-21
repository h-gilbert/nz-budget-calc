import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useWizardStore = defineStore('wizard', () => {
  // State
  const currentStep = ref(1)
  const totalSteps = ref(6)
  const completedSteps = ref(new Set())
  const wizardMode = ref(true)

  // Step definitions
  const steps = ref([
    { id: 1, title: 'Income', description: 'Enter your income details', section: 'income' },
    { id: 2, title: 'Deductions', description: 'Tax and KiwiSaver', section: 'deductions' },
    { id: 3, title: 'Expenses', description: 'Add your regular expenses', section: 'expenses' },
    { id: 4, title: 'Accounts', description: 'Set up savings accounts', section: 'accounts' },
    { id: 5, title: 'Goals', description: 'Savings goals and investments', section: 'goals' },
    { id: 6, title: 'Review', description: 'Review and calculate', section: 'review' }
  ])

  // Computed
  const progress = computed(() => {
    return (currentStep.value / totalSteps.value) * 100
  })

  const currentStepData = computed(() => {
    return steps.value.find(s => s.id === currentStep.value) || steps.value[0]
  })

  const isFirstStep = computed(() => currentStep.value === 1)
  const isLastStep = computed(() => currentStep.value === totalSteps.value)

  const canGoNext = computed(() => {
    return currentStep.value < totalSteps.value
  })

  const canGoPrevious = computed(() => {
    return currentStep.value > 1
  })

  const completedStepsCount = computed(() => {
    return completedSteps.value.size
  })

  // Actions
  function nextStep() {
    if (canGoNext.value) {
      markStepComplete(currentStep.value)
      currentStep.value++
    }
  }

  function previousStep() {
    if (canGoPrevious.value) {
      currentStep.value--
    }
  }

  function goToStep(stepNumber) {
    if (stepNumber >= 1 && stepNumber <= totalSteps.value) {
      currentStep.value = stepNumber
    }
  }

  function markStepComplete(stepNumber) {
    completedSteps.value.add(stepNumber)
  }

  function isStepCompleted(stepNumber) {
    return completedSteps.value.has(stepNumber)
  }

  function reset() {
    currentStep.value = 1
    completedSteps.value.clear()
  }

  function toggleWizardMode() {
    wizardMode.value = !wizardMode.value
  }

  function enableWizardMode() {
    wizardMode.value = true
  }

  function disableWizardMode() {
    wizardMode.value = false
  }

  return {
    // State
    currentStep,
    totalSteps,
    completedSteps,
    wizardMode,
    steps,

    // Computed
    progress,
    currentStepData,
    isFirstStep,
    isLastStep,
    canGoNext,
    canGoPrevious,
    completedStepsCount,

    // Actions
    nextStep,
    previousStep,
    goToStep,
    markStepComplete,
    isStepCompleted,
    reset,
    toggleWizardMode,
    enableWizardMode,
    disableWizardMode
  }
})
