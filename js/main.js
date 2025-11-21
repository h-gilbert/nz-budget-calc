/**
 * Main Initialization Module
 * Coordinates all UX enhancement modules
 */

import { Toast } from './toast.js';
import { Progress } from './progress.js';
import { AutoSave } from './autosave.js';
import { Validator } from './validator.js';
import { Examples } from './examples.js';
import { Wizard } from './wizard.js';

// Make Toast available globally for use in calculator.js and HTML onclick handlers
window.Toast = Toast;

// Make modules available globally if needed
window.UXModules = {
    Toast,
    Progress,
    AutoSave,
    Validator,
    Examples,
    Wizard
};

// Initialize all modules when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing UX enhancement modules...');

    try {
        // Initialize Toast notification system
        Toast.init();
        console.log('✓ Toast notifications initialized');

        // Initialize Wizard mode FIRST (before Progress)
        Wizard.init();
        console.log('✓ Wizard mode initialized');

        // Initialize Progress indicator
        Progress.init();
        console.log('✓ Progress indicator initialized');

        // NOTE: Auto-save disabled because database backend handles saving
        // Clear any old localStorage autosave data
        localStorage.removeItem('nz-calculator-autosave');
        localStorage.removeItem('hasVisitedBefore');
        // AutoSave.init();
        // console.log('✓ Auto-save system initialized');

        // Initialize Validator
        Validator.init();
        console.log('✓ Inline validation initialized');

        // NOTE: Example expenses disabled because database has real data
        // Examples.init();
        // console.log('✓ Example expenses initialized');

        console.log('All UX modules loaded successfully!');
    } catch (error) {
        console.error('Error initializing UX modules:', error);
    }
});

// Expose utility functions globally for backwards compatibility
window.showToast = function(type, title, message, duration) {
    return Toast.show(type, title, message, duration);
};

window.validateForm = function() {
    return Validator.validateAll();
};

window.saveProgress = function() {
    return AutoSave.save();
};

window.clearAutoSave = function() {
    AutoSave.clear();
};

// Override existing calculator.js functions to integrate with new modules
// This will be called after the original DOMContentLoaded event

// Wait for original calculator.js to load and be ready
setTimeout(() => {
    enhanceCalculatorFunctions();
}, 200);

function enhanceCalculatorFunctions() {
    console.log('Enhancing calculator functions...');

    // Check if addExpense exists
    if (typeof window.addExpense !== 'function') {
        console.warn('addExpense function not found, retrying...');
        setTimeout(() => enhanceCalculatorFunctions(), 100);
        return;
    }

    // Enhance the calculate button to use validation
    const calculateBtn = document.getElementById('calculate-btn');
    if (calculateBtn) {
        // Store original onclick handler
        const originalOnClick = calculateBtn.onclick;

        // Replace with enhanced version
        calculateBtn.onclick = function(event) {
            // Validate form first
            if (!Validator.validateAll()) {
                Toast.error('Validation Error', 'Please fix the errors before calculating.');
                return false;
            }

            // Call original function if it exists
            if (originalOnClick) {
                const result = originalOnClick.call(this, event);

                // Update progress after calculation
                setTimeout(() => {
                    Progress.update();
                }, 500);

                return result;
            }
        };
    }

    // Enhance addExpense function to work with examples and validation
    if (typeof window.addExpense === 'function') {
        const originalAddExpense = window.addExpense;

        window.addExpense = function(expenseData) {
            // Call original function
            const result = originalAddExpense.call(this, expenseData);

            // If expenseData was provided (from restore/examples), populate the fields
            if (expenseData && typeof expenseData === 'object') {
                const expensesList = document.getElementById('expenses-list');
                if (expensesList) {
                    const latestExpense = expensesList.lastElementChild;
                    if (latestExpense) {
                        const nameInput = latestExpense.querySelector('.expense-description');
                        const amountInput = latestExpense.querySelector('.expense-amount');
                        const frequencySelect = latestExpense.querySelector('.expense-period');
                        const dateInput = latestExpense.querySelector('.expense-date');

                        if (nameInput && expenseData.name !== undefined) {
                            nameInput.value = expenseData.name;
                        }
                        if (amountInput && expenseData.amount !== undefined) {
                            amountInput.value = expenseData.amount;
                        }
                        if (frequencySelect && expenseData.frequency !== undefined) {
                            frequencySelect.value = expenseData.frequency;
                            // Trigger change event to show/hide date field
                            frequencySelect.dispatchEvent(new Event('change'));
                        }
                        if (dateInput && expenseData.date !== undefined) {
                            dateInput.value = expenseData.date;
                        }
                    }
                }
            }

            // Update progress
            setTimeout(() => Progress.update(), 100);

            return result;
        };
    }

    // Enhance addAccount function
    if (typeof window.addAccount === 'function') {
        const originalAddAccount = window.addAccount;

        window.addAccount = function(accountData) {
            // Call original function
            const result = originalAddAccount.call(this, accountData);

            // If accountData was provided (from restore), populate the fields
            if (accountData && typeof accountData === 'object') {
                const accountsList = document.getElementById('accounts-list');
                if (accountsList) {
                    const latestAccount = accountsList.lastElementChild;
                    if (latestAccount) {
                        const nameInput = latestAccount.querySelector('.account-name');
                        const balanceInput = latestAccount.querySelector('.account-balance');

                        if (nameInput && accountData.name !== undefined) {
                            nameInput.value = accountData.name;
                        }
                        if (balanceInput && accountData.balance !== undefined) {
                            balanceInput.value = accountData.balance;
                        }
                    }
                }
            }

            // Update progress
            setTimeout(() => Progress.update(), 100);

            return result;
        };
    }

    // Replace alert() calls with Toast notifications
    // Override window.alert (use sparingly, mainly for legacy support)
    const originalAlert = window.alert;
    window.alert = function(message) {
        if (typeof message === 'string') {
            Toast.info('Notice', message);
        } else {
            originalAlert.call(window, message);
        }
    };

    // Add enhanced form input listeners for progress tracking
    const form = document.querySelector('.calculator-layout');
    if (form) {
        form.addEventListener('input', () => {
            // Debounce progress update
            clearTimeout(window.progressUpdateTimeout);
            window.progressUpdateTimeout = setTimeout(() => {
                Progress.update();
            }, 300);
        });
    }

    console.log('Calculator functions enhanced with UX modules');
}

// Add CSS for new features dynamically
function addDynamicStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Auto-save indicator */
        .autosave-indicator {
            font-size: 0.85rem;
            color: var(--success, #7AC29A);
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 1rem;
            animation: fadeIn 0.3s ease;
        }

        /* Small button variant */
        .btn-small {
            padding: 0.5rem 1rem;
            font-size: 0.85rem;
        }

        /* Toast confirm actions */
        .toast-confirm .toast-actions {
            display: flex;
            gap: 0.5rem;
            margin-top: 0.75rem;
        }

        .toast-confirm .toast-actions button {
            flex: 1;
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        /* Validation states */
        .form-group.error input,
        .form-group.error select,
        .error input,
        .error select {
            border-color: var(--error, #E88C8C);
            background: rgba(232, 140, 140, 0.05);
        }

        .form-group.error input:focus,
        .form-group.error select:focus,
        .error input:focus,
        .error select:focus {
            box-shadow: 0 0 0 3px rgba(232, 140, 140, 0.15);
        }

        .form-group.success input,
        .form-group.success select,
        .success input,
        .success select {
            border-color: var(--success, #7AC29A);
        }

        .field-error {
            display: block;
            color: var(--error, #E88C8C);
            font-size: 0.8rem;
            margin-top: 0.25rem;
            font-weight: 500;
            animation: slideDown 0.2s ease;
        }

        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-5px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        /* Auto-save restore prompt (additional mobile styles) */
        @media (max-width: 768px) {
            .autosave-restore-prompt {
                padding: 1rem !important;
            }

            .autosave-restore-prompt button {
                width: 100%;
            }
        }
    `;
    document.head.appendChild(style);
}

// Add styles when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addDynamicStyles);
} else {
    addDynamicStyles();
}

export { Toast, Progress, AutoSave, Validator, Examples, Wizard };
