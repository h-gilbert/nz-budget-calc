/**
 * Progress Indicator System
 * Tracks user progress through the budget calculator form
 */

export const Progress = {
    steps: ['income', 'expenses', 'accounts', 'savings', 'calculate'],
    currentStep: 0,
    stepElements: [],
    lineElements: [],
    progressBar: null,

    init: function() {
        // Get all step elements
        this.stepElements = Array.from(document.querySelectorAll('.progress-step'));
        this.lineElements = Array.from(document.querySelectorAll('.progress-line'));
        this.progressBar = document.querySelector('.progress-bar');

        if (this.stepElements.length === 0) {
            console.warn('Progress step elements not found');
            return;
        }

        // Add click listeners to steps for navigation
        this.stepElements.forEach((step, index) => {
            step.addEventListener('click', () => this.navigateToStep(index));
        });

        // Add scroll listener to update active step
        window.addEventListener('scroll', () => this.updateActiveStepOnScroll());

        // Add input listeners to track form completion
        this.addFormListeners();

        // Initial update
        this.update();
    },

    addFormListeners: function() {
        // Listen for changes in all form inputs
        const form = document.querySelector('.calculator-layout');
        if (!form) return;

        form.addEventListener('input', () => {
            // Debounce the update
            clearTimeout(this.updateTimeout);
            this.updateTimeout = setTimeout(() => this.update(), 300);
        });

        form.addEventListener('change', () => {
            this.update();
        });
    },

    update: function() {
        const completion = this.calculateCompletion();

        // Update each step's state
        this.steps.forEach((stepId, index) => {
            const isCompleted = completion[stepId];
            const stepElement = this.stepElements[index];

            if (!stepElement) return;

            if (isCompleted) {
                stepElement.classList.add('completed');
            } else {
                stepElement.classList.remove('completed');
            }
        });

        // Update progress lines
        this.lineElements.forEach((line, index) => {
            const stepCompleted = completion[this.steps[index]];
            if (stepCompleted) {
                line.classList.add('completed');
            } else {
                line.classList.remove('completed');
            }
        });

        // Update progress bar width
        const totalSteps = this.steps.length;
        const completedSteps = Object.values(completion).filter(Boolean).length;
        const percentage = (completedSteps / totalSteps) * 100;

        if (this.progressBar) {
            this.progressBar.style.width = `${percentage}%`;
        }
    },

    calculateCompletion: function() {
        return {
            income: this.isIncomeComplete(),
            expenses: this.isExpensesComplete(),
            accounts: this.isAccountsComplete(),
            savings: this.isSavingsComplete(),
            calculate: this.isCalculateComplete()
        };
    },

    isIncomeComplete: function() {
        const payAmount = document.getElementById('pay-amount');
        const payType = document.getElementById('pay-type');
        const hoursType = document.getElementById('hours-type');

        if (!payAmount || !payType || !hoursType) return false;

        // Check basic fields
        if (!payAmount.value || !payType.value) return false;

        // Check hours based on type
        if (hoursType.value === 'fixed') {
            const fixedHours = document.getElementById('fixed-hours');
            return fixedHours && fixedHours.value !== '';
        } else if (hoursType.value === 'range') {
            const minHours = document.getElementById('min-hours');
            const maxHours = document.getElementById('max-hours');
            return minHours && maxHours && minHours.value !== '' && maxHours.value !== '';
        }

        return true;
    },

    isExpensesComplete: function() {
        const expensesList = document.getElementById('expenses-list');
        if (!expensesList) return false;

        const expenseItems = expensesList.querySelectorAll('.expense-item');

        // At least one expense should be added
        if (expenseItems.length === 0) return false;

        // Check if all expenses have name and amount
        for (const item of expenseItems) {
            const name = item.querySelector('.expense-name');
            const amount = item.querySelector('.expense-amount');

            if (!name || !amount || !name.value || !amount.value) {
                return false;
            }
        }

        return true;
    },

    isAccountsComplete: function() {
        // Accounts section is optional, so we'll mark it complete if:
        // 1. At least one account exists with name and balance, OR
        // 2. No accounts (user chose not to use this feature)

        const accountsList = document.getElementById('accounts-list');
        if (!accountsList) return true; // If section doesn't exist, consider it optional

        const accountItems = accountsList.querySelectorAll('.account-item');

        // If no accounts, it's still "complete" (optional feature)
        if (accountItems.length === 0) return true;

        // If accounts exist, they must be properly filled
        for (const item of accountItems) {
            const name = item.querySelector('.account-name');
            const balance = item.querySelector('.account-balance');

            if (!name || !balance || !name.value || !balance.value) {
                return false;
            }
        }

        return true;
    },

    isSavingsComplete: function() {
        // Savings section is optional
        const savingsTarget = document.getElementById('savings-target');
        const savingsDeadline = document.getElementById('savings-deadline');

        // If fields exist but are empty, it's still "complete" (optional)
        // If they have values, both must be filled
        if (savingsTarget && savingsTarget.value) {
            return savingsDeadline && savingsDeadline.value !== '';
        }

        return true; // Optional section
    },

    isCalculateComplete: function() {
        // This step is "complete" only after calculation is performed
        const resultsSection = document.getElementById('results-section');
        if (!resultsSection) return false;

        // Check if results are displayed (not empty)
        return resultsSection.style.display !== 'none' &&
               resultsSection.innerHTML.trim() !== '';
    },

    navigateToStep: function(stepIndex) {
        if (stepIndex < 0 || stepIndex >= this.steps.length) return;

        const stepId = this.steps[stepIndex];
        let targetSection = null;

        // Map step IDs to section IDs in the HTML
        const sectionMap = {
            'income': 'income-section',
            'expenses': 'expenses-section',
            'accounts': 'accounts-section',
            'savings': 'savings-section',
            'calculate': 'calculate-section'
        };

        const sectionId = sectionMap[stepId];
        targetSection = document.getElementById(sectionId);

        // Fallback: try to find by card with h3 containing step name
        if (!targetSection) {
            const cards = document.querySelectorAll('.card');
            for (const card of cards) {
                const heading = card.querySelector('h3');
                if (heading && heading.textContent.toLowerCase().includes(stepId)) {
                    targetSection = card;
                    break;
                }
            }
        }

        if (targetSection) {
            // Smooth scroll to section
            targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // Update active step
            this.setActiveStep(stepIndex);
        }
    },

    setActiveStep: function(stepIndex) {
        this.currentStep = stepIndex;

        // Update active class on steps
        this.stepElements.forEach((step, index) => {
            if (index === stepIndex) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
    },

    updateActiveStepOnScroll: function() {
        // Determine which section is currently in view
        const sectionIds = [
            'income-section',
            'expenses-section',
            'accounts-section',
            'savings-section',
            'calculate-section'
        ];

        let activeIndex = 0;
        const scrollPosition = window.scrollY + 200; // Offset for header

        sectionIds.forEach((sectionId, index) => {
            const section = document.getElementById(sectionId);
            if (!section) {
                // Try finding by card heading
                const cards = document.querySelectorAll('.card');
                for (const card of cards) {
                    const heading = card.querySelector('h3');
                    if (heading && heading.textContent.toLowerCase().includes(this.steps[index])) {
                        if (card.offsetTop <= scrollPosition) {
                            activeIndex = index;
                        }
                        break;
                    }
                }
            } else if (section.offsetTop <= scrollPosition) {
                activeIndex = index;
            }
        });

        this.setActiveStep(activeIndex);
    }
};
