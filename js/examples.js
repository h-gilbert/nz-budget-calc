/**
 * Example Expenses System
 * Pre-populates common expenses for new users
 */

export const Examples = {
    hasLoadedKey: 'nz-calculator-has-loaded-examples',
    removeButtonId: 'remove-examples-btn',

    exampleExpenses: [
        { name: 'Rent/Mortgage', amount: '', frequency: 'weekly', date: '' },
        { name: 'Groceries', amount: '', frequency: 'weekly', date: '' },
        { name: 'Transport/Petrol', amount: '', frequency: 'weekly', date: '' },
        { name: 'Utilities (Power, Water, Internet)', amount: '', frequency: 'monthly', date: '' }
    ],

    init: function() {
        // Only load examples on first visit
        if (!localStorage.getItem(this.hasLoadedKey)) {
            this.loadExamples();
            localStorage.setItem(this.hasLoadedKey, 'true');
        }
    },

    loadExamples: function() {
        const expensesList = document.getElementById('expenses-list');
        if (!expensesList) {
            console.warn('Expenses list not found');
            return;
        }

        // Add each example expense
        this.exampleExpenses.forEach(expense => {
            // Check if global addExpense function exists
            if (typeof window.addExpense === 'function') {
                window.addExpense(expense);
            } else {
                console.warn('addExpense function not found');
            }
        });

        // Add "Remove All Examples" button
        this.addRemoveButton();

        // Show helpful toast
        if (window.Toast) {
            window.Toast.info(
                'Example Expenses Added',
                'We\'ve added some common expenses to get you started. You can edit or remove them.',
                7000
            );
        }
    },

    addRemoveButton: function() {
        // Check if button already exists
        if (document.getElementById(this.removeButtonId)) return;

        const expensesList = document.getElementById('expenses-list');
        if (!expensesList) return;

        const removeAllBtn = document.createElement('button');
        removeAllBtn.type = 'button';
        removeAllBtn.id = this.removeButtonId;
        removeAllBtn.className = 'btn-secondary btn-small';
        removeAllBtn.textContent = '✕ Remove All Example Expenses';
        removeAllBtn.style.marginTop = '0.5rem';
        removeAllBtn.style.width = '100%';

        removeAllBtn.addEventListener('click', () => this.confirmRemoveAll());

        // Insert after expenses list
        if (expensesList.parentNode) {
            expensesList.parentNode.insertBefore(removeAllBtn, expensesList.nextSibling);
        }
    },

    confirmRemoveAll: function() {
        if (window.Toast && window.Toast.confirm) {
            window.Toast.confirm(
                'Remove All Examples?',
                'This will clear all example expenses. Your custom expenses will remain.',
                () => this.removeAllExamples(),
                null
            );
        } else {
            // Fallback to native confirm
            if (confirm('Remove all example expenses?')) {
                this.removeAllExamples();
            }
        }
    },

    removeAllExamples: function() {
        const expensesList = document.getElementById('expenses-list');
        if (!expensesList) return;

        const expenseItems = Array.from(expensesList.querySelectorAll('.expense-item'));

        // Remove items that match example expense names (and are empty)
        const exampleNames = this.exampleExpenses.map(e => e.name.toLowerCase());

        expenseItems.forEach(item => {
            const nameInput = item.querySelector('.expense-name, input[placeholder*="name" i]');
            const amountInput = item.querySelector('.expense-amount, input[type="number"]');

            if (nameInput && amountInput) {
                const name = nameInput.value.toLowerCase().trim();
                const amount = amountInput.value.trim();

                // Remove if it matches an example name AND amount is empty
                if (exampleNames.includes(name) && !amount) {
                    item.remove();
                }
            }
        });

        // Remove the button itself
        const removeBtn = document.getElementById(this.removeButtonId);
        if (removeBtn) removeBtn.remove();

        // Show feedback
        if (window.Toast) {
            window.Toast.info('Examples Removed', 'You can now add your own expenses.');
        }
    },

    reset: function() {
        localStorage.removeItem(this.hasLoadedKey);
    }
};
