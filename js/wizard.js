/**
 * Wizard Mode Navigation
 * Implements step-by-step navigation through the form
 */

export const Wizard = {
    currentStep: 1,
    totalSteps: 5,
    steps: ['income', 'expenses', 'accounts', 'savings', 'calculate'],

    init: function() {
        // Enable wizard mode by adding class to body
        document.body.classList.add('wizard-mode');

        // Show only the first step initially
        this.showStep(1);

        // Add navigation buttons to each card
        this.addNavigationButtons();

        // Update progress indicator clicks to navigate in wizard mode
        this.setupProgressNavigation();

        console.log('✓ Wizard mode initialized');
    },

    addNavigationButtons: function() {
        const cards = document.querySelectorAll('.form-card');

        cards.forEach((card, index) => {
            const stepNumber = index + 1;
            const cardType = card.getAttribute('data-card');

            // Create navigation container
            const navContainer = document.createElement('div');
            navContainer.className = 'wizard-navigation';

            // Add Previous button (except for first step)
            if (stepNumber > 1) {
                const prevBtn = document.createElement('button');
                prevBtn.type = 'button';
                prevBtn.className = 'btn-secondary wizard-prev';
                prevBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                    Previous
                `;
                prevBtn.addEventListener('click', () => this.previousStep());
                navContainer.appendChild(prevBtn);
            }

            // Add Next button (except for last step)
            if (stepNumber < this.totalSteps) {
                const nextBtn = document.createElement('button');
                nextBtn.type = 'button';
                nextBtn.className = 'btn-primary wizard-next';
                nextBtn.innerHTML = `
                    Next
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                `;
                nextBtn.addEventListener('click', () => this.nextStep());
                navContainer.appendChild(nextBtn);
            }

            // Add Calculate button for last step
            if (stepNumber === this.totalSteps) {
                // Add Previous button
                const prevBtn = document.createElement('button');
                prevBtn.type = 'button';
                prevBtn.className = 'btn-secondary wizard-prev';
                prevBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                    Previous
                `;
                prevBtn.addEventListener('click', () => this.previousStep());
                navContainer.appendChild(prevBtn);

                // Create Calculate button directly
                const calcBtn = document.createElement('button');
                calcBtn.type = 'button';
                calcBtn.id = 'wizard-calculate-btn';
                calcBtn.className = 'btn-primary btn-large';
                calcBtn.innerHTML = `
                    <span>Calculate Budget</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                `;
                calcBtn.addEventListener('click', () => {
                    // Trigger the calculation
                    const originalBtn = document.getElementById('calculate-btn');
                    if (originalBtn) {
                        originalBtn.click();
                    }
                    // Show results after calculation
                    setTimeout(() => {
                        this.showResultsSection();
                    }, 100);
                });
                navContainer.appendChild(calcBtn);
                console.log('✓ Calculate button created and added to wizard');
            }

            // Append navigation to card
            card.appendChild(navContainer);
        });

        // Hide the original form actions in wizard mode
        const formActions = document.querySelector('.form-actions');
        if (formActions) {
            formActions.style.display = 'none';
        }
    },

    setupProgressNavigation: function() {
        const progressSteps = document.querySelectorAll('.progress-step');

        progressSteps.forEach((step, index) => {
            const stepNumber = index + 1;
            step.addEventListener('click', () => {
                this.goToStep(stepNumber);
            });
        });
    },

    showStep: function(stepNumber) {
        if (stepNumber < 1 || stepNumber > this.totalSteps) return;

        this.currentStep = stepNumber;

        // Hide all cards
        const cards = document.querySelectorAll('.form-card');
        cards.forEach(card => {
            card.classList.remove('wizard-active');
        });

        // Show current card
        const currentCard = document.querySelector(`.form-card[data-card="${this.steps[stepNumber - 1]}"]`);
        if (currentCard) {
            currentCard.classList.add('wizard-active');

            // Scroll to top of calculator
            const calculator = document.querySelector('.calculator-container');
            if (calculator) {
                calculator.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }

        // Show/hide results based on step
        const resultsSection = document.querySelector('.results-section');
        if (resultsSection) {
            if (stepNumber === this.totalSteps && resultsSection.classList.contains('show-results')) {
                // On calculate step and results exist - show them
                resultsSection.style.display = 'block';
            } else {
                // Not on calculate step - hide results
                resultsSection.style.display = 'none';
            }
        }

        // Update progress indicator
        this.updateProgressIndicator();

        // Update progress tracking if available
        if (window.UXModules && window.UXModules.Progress) {
            window.UXModules.Progress.setActiveStep(stepNumber - 1);
        }
    },

    updateProgressIndicator: function() {
        const progressSteps = document.querySelectorAll('.progress-step');

        progressSteps.forEach((step, index) => {
            const stepNumber = index + 1;

            if (stepNumber < this.currentStep) {
                // Completed steps
                step.classList.add('completed');
                step.classList.remove('active');
            } else if (stepNumber === this.currentStep) {
                // Current step
                step.classList.add('active');
                step.classList.remove('completed');
            } else {
                // Future steps
                step.classList.remove('active', 'completed');
            }
        });

        // Update progress lines
        const progressLines = document.querySelectorAll('.progress-line');
        progressLines.forEach((line, index) => {
            if (index < this.currentStep - 1) {
                line.classList.add('completed');
            } else {
                line.classList.remove('completed');
            }
        });

        // Update progress bar
        const progressBar = document.querySelector('.progress-bar');
        if (progressBar) {
            const percentage = ((this.currentStep - 1) / (this.totalSteps - 1)) * 100;
            progressBar.style.width = `${percentage}%`;
        }
    },

    nextStep: function() {
        // Validate current step before proceeding
        if (!this.validateCurrentStep()) {
            return;
        }

        if (this.currentStep < this.totalSteps) {
            this.showStep(this.currentStep + 1);
        }
    },

    previousStep: function() {
        if (this.currentStep > 1) {
            this.showStep(this.currentStep - 1);
        }
    },

    goToStep: function(stepNumber) {
        // Validate steps between current and target
        if (stepNumber > this.currentStep) {
            // Going forward - validate current step
            if (!this.validateCurrentStep()) {
                return;
            }
        }

        this.showStep(stepNumber);
    },

    validateCurrentStep: function() {
        const currentStepName = this.steps[this.currentStep - 1];

        // Use validator if available
        if (window.UXModules && window.UXModules.Validator) {
            const validator = window.UXModules.Validator;

            switch (currentStepName) {
                case 'income':
                    // Validate income fields
                    const payAmount = validator.validate('pay-amount');
                    const payType = validator.validate('pay-type');
                    const hoursValid = this.validateHours(validator);

                    if (!payAmount || !payType || !hoursValid) {
                        if (window.Toast) {
                            window.Toast.error('Incomplete Information', 'Please fill in all required income fields before continuing.');
                        }
                        return false;
                    }
                    break;

                case 'expenses':
                    // Check if at least one expense exists
                    const expensesList = document.getElementById('expenses-list');
                    const expenses = expensesList ? expensesList.querySelectorAll('.expense-item') : [];

                    if (expenses.length === 0) {
                        if (window.Toast) {
                            window.Toast.error('No Expenses', 'Please add at least one expense before continuing.');
                        }
                        return false;
                    }

                    // Validate each expense
                    let allExpensesValid = true;
                    expenses.forEach(expense => {
                        if (!validator.validateExpenseItem(expense)) {
                            allExpensesValid = false;
                        }
                    });

                    if (!allExpensesValid) {
                        if (window.Toast) {
                            window.Toast.error('Invalid Expenses', 'Please fix the errors in your expenses before continuing.');
                        }
                        return false;
                    }
                    break;

                case 'accounts':
                    // Accounts are optional, just validate if they exist
                    const accountsList = document.getElementById('accounts-list');
                    const accounts = accountsList ? accountsList.querySelectorAll('.account-item') : [];

                    let allAccountsValid = true;
                    accounts.forEach(account => {
                        if (!validator.validateAccountItem(account)) {
                            allAccountsValid = false;
                        }
                    });

                    if (!allAccountsValid) {
                        if (window.Toast) {
                            window.Toast.error('Invalid Accounts', 'Please fix the errors in your accounts before continuing.');
                        }
                        return false;
                    }
                    break;

                case 'savings':
                    // Savings are optional, just validate if filled
                    const savingsTarget = document.getElementById('savings-target');
                    if (savingsTarget && savingsTarget.value) {
                        if (!validator.validate('savings-target') || !validator.validate('savings-deadline')) {
                            if (window.Toast) {
                                window.Toast.error('Invalid Savings', 'Please fix the errors in your savings goals before continuing.');
                            }
                            return false;
                        }
                    }
                    break;
            }
        }

        return true;
    },

    validateHours: function(validator) {
        const hoursType = document.getElementById('hours-type');
        if (!hoursType) return true;

        if (hoursType.value === 'fixed') {
            return validator.validate('fixed-hours');
        } else if (hoursType.value === 'range') {
            return validator.validate('min-hours') && validator.validate('max-hours');
        }

        return true;
    },

    showResultsSection: function() {
        const resultsSection = document.querySelector('.results-section');
        if (resultsSection) {
            resultsSection.classList.add('show-results');

            // Scroll to results
            setTimeout(() => {
                resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 200);
        }
    }
};
