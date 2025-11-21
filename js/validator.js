/**
 * Inline Validation System
 * Provides real-time form validation with visual feedback
 */

export const Validator = {
    rules: {
        'pay-amount': {
            required: true,
            min: 0.01,
            message: 'Please enter a valid pay amount greater than $0'
        },
        'pay-type': {
            required: true,
            message: 'Please select a pay frequency'
        },
        'fixed-hours': {
            required: true,
            min: 0.5,
            max: 168,
            message: 'Please enter valid hours (0.5 - 168 per week)',
            condition: () => {
                const hoursType = document.getElementById('hours-type');
                return hoursType && hoursType.value === 'fixed';
            }
        },
        'min-hours': {
            required: true,
            min: 0.5,
            max: 168,
            message: 'Please enter valid minimum hours (0.5 - 168)',
            condition: () => {
                const hoursType = document.getElementById('hours-type');
                return hoursType && hoursType.value === 'range';
            }
        },
        'max-hours': {
            required: true,
            min: function() {
                const minHours = document.getElementById('min-hours');
                return minHours ? parseFloat(minHours.value) || 0.5 : 0.5;
            },
            max: 168,
            message: 'Maximum hours must be greater than minimum hours and less than 168',
            condition: () => {
                const hoursType = document.getElementById('hours-type');
                return hoursType && hoursType.value === 'range';
            }
        },
        'savings-target': {
            required: false,
            min: 0.01,
            message: 'Savings target must be greater than $0',
            condition: () => {
                const savingsTarget = document.getElementById('savings-target');
                return savingsTarget && savingsTarget.value !== '';
            }
        },
        'savings-deadline': {
            required: false,
            message: 'Please select a valid future date',
            condition: () => {
                const savingsTarget = document.getElementById('savings-target');
                return savingsTarget && savingsTarget.value !== '';
            },
            customValidation: (value) => {
                if (!value) return true; // Optional if no savings target
                const deadline = new Date(value);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return deadline >= today;
            }
        },
        'interest-rate': {
            required: false,
            min: 0,
            max: 100,
            message: 'Interest rate must be between 0 and 100',
            condition: () => {
                const investSavings = document.getElementById('invest-savings');
                return investSavings && investSavings.checked;
            }
        },
        'kiwisaver-rate': {
            required: true,
            message: 'Please select a KiwiSaver contribution rate',
            condition: () => {
                const kiwisaver = document.getElementById('kiwisaver');
                return kiwisaver && kiwisaver.checked;
            }
        }
    },

    updateTimeout: null,

    init: function() {
        // Add validation to all fields with rules
        Object.keys(this.rules).forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                // Validate on blur
                field.addEventListener('blur', () => this.validate(fieldId));

                // Validate on input (debounced)
                field.addEventListener('input', () => {
                    clearTimeout(this.updateTimeout);
                    this.updateTimeout = setTimeout(() => this.validate(fieldId), 500);
                });
            }
        });

        // Add validation for conditional fields when conditions change
        this.setupConditionalValidation();
    },

    setupConditionalValidation: function() {
        // Hours type change
        const hoursType = document.getElementById('hours-type');
        if (hoursType) {
            hoursType.addEventListener('change', () => {
                this.validate('fixed-hours');
                this.validate('min-hours');
                this.validate('max-hours');
            });
        }

        // KiwiSaver checkbox
        const kiwisaver = document.getElementById('kiwisaver');
        if (kiwisaver) {
            kiwisaver.addEventListener('change', () => {
                this.validate('kiwisaver-rate');
            });
        }

        // Invest savings checkbox
        const investSavings = document.getElementById('invest-savings');
        if (investSavings) {
            investSavings.addEventListener('change', () => {
                this.validate('interest-rate');
            });
        }

        // Savings target (triggers deadline validation)
        const savingsTarget = document.getElementById('savings-target');
        if (savingsTarget) {
            savingsTarget.addEventListener('input', () => {
                clearTimeout(this.updateTimeout);
                this.updateTimeout = setTimeout(() => {
                    this.validate('savings-target');
                    this.validate('savings-deadline');
                }, 500);
            });
        }
    },

    validate: function(fieldId) {
        const field = document.getElementById(fieldId);
        const rule = this.rules[fieldId];

        if (!rule || !field) return true;

        // Check if field should be validated (condition)
        if (rule.condition && !rule.condition()) {
            this.clearValidation(fieldId);
            return true;
        }

        const value = field.value.trim();
        const numValue = parseFloat(value);

        // Required check
        if (rule.required && !value) {
            this.showError(fieldId, rule.message);
            return false;
        }

        // Skip further validation if empty and not required
        if (!value && !rule.required) {
            this.clearValidation(fieldId);
            return true;
        }

        // Custom validation function
        if (rule.customValidation) {
            if (!rule.customValidation(value)) {
                this.showError(fieldId, rule.message);
                return false;
            }
        }

        // Min value check (for numbers)
        if (rule.min !== undefined && field.type === 'number') {
            const minValue = typeof rule.min === 'function' ? rule.min() : rule.min;
            if (isNaN(numValue) || numValue < minValue) {
                this.showError(fieldId, rule.message);
                return false;
            }
        }

        // Max value check (for numbers)
        if (rule.max !== undefined && field.type === 'number') {
            const maxValue = typeof rule.max === 'function' ? rule.max() : rule.max;
            if (isNaN(numValue) || numValue > maxValue) {
                this.showError(fieldId, rule.message);
                return false;
            }
        }

        // If all checks pass
        this.showSuccess(fieldId);
        return true;
    },

    validateExpenseItem: function(expenseItem) {
        if (!expenseItem) return false;

        const name = expenseItem.querySelector('.expense-name, input[placeholder*="name" i]');
        const amount = expenseItem.querySelector('.expense-amount, input[type="number"]');

        let isValid = true;

        // Validate name
        if (name && !name.value.trim()) {
            this.showErrorOnElement(name, 'Expense name is required');
            isValid = false;
        } else if (name) {
            this.showSuccessOnElement(name);
        }

        // Validate amount
        if (amount && (!amount.value || parseFloat(amount.value) <= 0)) {
            this.showErrorOnElement(amount, 'Amount must be greater than 0');
            isValid = false;
        } else if (amount) {
            this.showSuccessOnElement(amount);
        }

        return isValid;
    },

    validateAccountItem: function(accountItem) {
        if (!accountItem) return false;

        const name = accountItem.querySelector('.account-name, input[placeholder*="name" i]');
        const balance = accountItem.querySelector('.account-balance, input[type="number"]');

        let isValid = true;

        // Validate name
        if (name && !name.value.trim()) {
            this.showErrorOnElement(name, 'Account name is required');
            isValid = false;
        } else if (name) {
            this.showSuccessOnElement(name);
        }

        // Validate balance (can be 0 or negative)
        if (balance && balance.value === '') {
            this.showErrorOnElement(balance, 'Balance is required');
            isValid = false;
        } else if (balance) {
            this.showSuccessOnElement(balance);
        }

        return isValid;
    },

    validateAll: function() {
        let isValid = true;

        // Validate all fields with rules
        Object.keys(this.rules).forEach(fieldId => {
            if (!this.validate(fieldId)) {
                isValid = false;
            }
        });

        // Validate all expense items
        const expenseItems = document.querySelectorAll('.expense-item');
        if (expenseItems.length === 0) {
            isValid = false;
            if (window.Toast) {
                window.Toast.error('Missing Expenses', 'Please add at least one expense to calculate your budget.');
            }
        } else {
            expenseItems.forEach(item => {
                if (!this.validateExpenseItem(item)) {
                    isValid = false;
                }
            });
        }

        // Validate all account items (if any exist)
        const accountItems = document.querySelectorAll('.account-item');
        accountItems.forEach(item => {
            if (!this.validateAccountItem(item)) {
                isValid = false;
            }
        });

        return isValid;
    },

    showError: function(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        const formGroup = field.closest('.form-group') || field.parentElement;

        // Remove existing validation
        this.clearValidation(fieldId);

        // Add error class
        formGroup.classList.remove('success');
        formGroup.classList.add('error');
        field.setAttribute('aria-invalid', 'true');

        // Add error message
        const errorMsg = document.createElement('span');
        errorMsg.className = 'field-error';
        errorMsg.textContent = message;
        errorMsg.id = `${fieldId}-error`;
        field.setAttribute('aria-describedby', errorMsg.id);

        // Insert after field
        if (field.nextSibling) {
            formGroup.insertBefore(errorMsg, field.nextSibling);
        } else {
            formGroup.appendChild(errorMsg);
        }
    },

    showSuccess: function(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        const formGroup = field.closest('.form-group') || field.parentElement;

        // Remove errors
        this.clearValidation(fieldId);

        // Add success class
        formGroup.classList.remove('error');
        formGroup.classList.add('success');
        field.setAttribute('aria-invalid', 'false');
    },

    clearValidation: function(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        const formGroup = field.closest('.form-group') || field.parentElement;

        formGroup.classList.remove('error', 'success');
        field.removeAttribute('aria-invalid');
        field.removeAttribute('aria-describedby');

        const errorMsg = formGroup.querySelector('.field-error');
        if (errorMsg) errorMsg.remove();
    },

    showErrorOnElement: function(element, message) {
        if (!element) return;

        const parent = element.parentElement;

        // Remove existing errors
        const existingError = parent.querySelector('.field-error');
        if (existingError) existingError.remove();

        parent.classList.remove('success');
        parent.classList.add('error');
        element.setAttribute('aria-invalid', 'true');

        const errorMsg = document.createElement('span');
        errorMsg.className = 'field-error';
        errorMsg.textContent = message;

        if (element.nextSibling) {
            parent.insertBefore(errorMsg, element.nextSibling);
        } else {
            parent.appendChild(errorMsg);
        }
    },

    showSuccessOnElement: function(element) {
        if (!element) return;

        const parent = element.parentElement;

        // Remove errors
        const existingError = parent.querySelector('.field-error');
        if (existingError) existingError.remove();

        parent.classList.remove('error');
        parent.classList.add('success');
        element.setAttribute('aria-invalid', 'false');
    }
};
