/**
 * Auto-Save System
 * Automatically saves form data to localStorage to prevent data loss
 */

export const AutoSave = {
    key: 'nz-calculator-autosave',
    interval: null,
    lastSave: null,
    saveIntervalMs: 30000, // 30 seconds

    init: function() {
        // Start auto-save interval
        this.interval = setInterval(() => this.save(), this.saveIntervalMs);

        // Save on page unload
        window.addEventListener('beforeunload', () => this.save());

        // Check for existing save on load
        this.checkForRestore();

        // Add save indicator to DOM if it doesn't exist
        this.createSaveIndicator();
    },

    save: function() {
        try {
            const data = {
                // Income section
                payAmount: this.getFieldValue('pay-amount'),
                payType: this.getFieldValue('pay-type'),
                hoursType: this.getFieldValue('hours-type'),
                fixedHours: this.getFieldValue('fixed-hours'),
                minHours: this.getFieldValue('min-hours'),
                maxHours: this.getFieldValue('max-hours'),
                allowanceAmount: this.getFieldValue('allowance-amount'),
                allowanceFrequency: this.getFieldValue('allowance-frequency'),
                kiwisaver: this.getCheckboxValue('kiwisaver'),
                kiwisaverRate: this.getFieldValue('kiwisaver-rate'),
                studentLoan: this.getCheckboxValue('student-loan'),
                ietcEligible: this.getCheckboxValue('ietc-eligible'),

                // Expenses
                expenses: this.collectExpenses(),

                // Accounts
                accounts: this.collectAccounts(),

                // Savings
                savingsTarget: this.getFieldValue('savings-target'),
                savingsDeadline: this.getFieldValue('savings-deadline'),
                investSavings: this.getCheckboxValue('invest-savings'),
                interestRate: this.getFieldValue('interest-rate'),

                // Metadata
                timestamp: Date.now(),
                version: '1.0'
            };

            localStorage.setItem(this.key, JSON.stringify(data));
            this.lastSave = Date.now();
            this.updateSaveIndicator();

            return true;
        } catch (error) {
            console.error('Auto-save failed:', error);
            return false;
        }
    },

    restore: function(data) {
        if (!data) return;

        try {
            // Restore income fields
            this.setFieldValue('pay-amount', data.payAmount);
            this.setFieldValue('pay-type', data.payType);
            this.setFieldValue('hours-type', data.hoursType);
            this.setFieldValue('fixed-hours', data.fixedHours);
            this.setFieldValue('min-hours', data.minHours);
            this.setFieldValue('max-hours', data.maxHours);
            this.setFieldValue('allowance-amount', data.allowanceAmount);
            this.setFieldValue('allowance-frequency', data.allowanceFrequency);
            this.setCheckboxValue('kiwisaver', data.kiwisaver);
            this.setFieldValue('kiwisaver-rate', data.kiwisaverRate);
            this.setCheckboxValue('student-loan', data.studentLoan);
            this.setCheckboxValue('ietc-eligible', data.ietcEligible);

            // Restore expenses
            if (data.expenses && Array.isArray(data.expenses)) {
                console.log('Restoring', data.expenses.length, 'expenses:', data.expenses);

                // Clear existing expenses first
                const expensesList = document.getElementById('expenses-list');
                if (expensesList) {
                    expensesList.innerHTML = '';
                }

                // Add each expense
                data.expenses.forEach((expense, index) => {
                    console.log('Restoring expense', index + 1, ':', expense);
                    // Call the global addExpense function if it exists
                    if (typeof window.addExpense === 'function') {
                        window.addExpense(expense);
                        console.log('Called addExpense for expense', index + 1);
                    } else {
                        console.error('addExpense function not available');
                    }
                });

                console.log('Finished restoring expenses');
            } else {
                console.log('No expenses to restore');
            }

            // Restore accounts
            if (data.accounts && Array.isArray(data.accounts)) {
                // Clear existing accounts first
                const accountsList = document.getElementById('accounts-list');
                if (accountsList) {
                    accountsList.innerHTML = '';
                }

                // Add each account
                data.accounts.forEach(account => {
                    // Call the global addAccount function if it exists
                    if (typeof window.addAccount === 'function') {
                        window.addAccount(account);
                    }
                });
            }

            // Restore savings fields
            this.setFieldValue('savings-target', data.savingsTarget);
            this.setFieldValue('savings-deadline', data.savingsDeadline);
            this.setCheckboxValue('invest-savings', data.investSavings);
            this.setFieldValue('interest-rate', data.interestRate);

            // Trigger change events to update UI
            this.triggerFormChanges();

            return true;
        } catch (error) {
            console.error('Restore failed:', error);
            return false;
        }
    },

    checkForRestore: function() {
        const saved = localStorage.getItem(this.key);
        if (!saved) return;

        try {
            const data = JSON.parse(saved);
            const ageMinutes = Math.floor((Date.now() - data.timestamp) / 60000);

            // Auto-restore if less than 60 minutes old (no prompt)
            if (ageMinutes < 60) {
                // Delay restore to ensure calculator.js functions are loaded and wrapped
                setTimeout(() => {
                    this.restore(data);
                    console.log('Auto-restored previous session');
                }, 1000);
            } else {
                // Clear old data
                this.clear();
            }
        } catch (error) {
            console.error('Failed to check for restore:', error);
        }
    },

    showRestorePrompt: function(data, ageMinutes) {
        const layout = document.querySelector('.calculator-layout');
        if (!layout) return;

        const restorePrompt = document.createElement('div');
        restorePrompt.className = 'autosave-restore-prompt';
        restorePrompt.style.cssText = `
            background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%);
            color: white;
            padding: 1.5rem;
            border-radius: 12px;
            margin-bottom: 2rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;

        restorePrompt.innerHTML = `
            <div style="display: flex; align-items: start; gap: 1rem;">
                <div style="font-size: 2rem;">💾</div>
                <div style="flex: 1;">
                    <strong style="display: block; font-size: 1.1rem; margin-bottom: 0.5rem;">Work in Progress Found</strong>
                    <p style="margin: 0 0 1rem 0; opacity: 0.95;">
                        You have unsaved work from ${ageMinutes} minute${ageMinutes !== 1 ? 's' : ''} ago. Would you like to restore it?
                    </p>
                    <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                        <button class="btn-restore" style="
                            background: white;
                            color: #44A08D;
                            border: none;
                            padding: 0.75rem 1.5rem;
                            border-radius: 8px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: transform 0.2s ease;
                        ">✓ Restore My Work</button>
                        <button class="btn-dismiss" style="
                            background: rgba(255,255,255,0.2);
                            color: white;
                            border: 2px solid white;
                            padding: 0.75rem 1.5rem;
                            border-radius: 8px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s ease;
                        ">Start Fresh</button>
                    </div>
                </div>
            </div>
        `;

        layout.insertBefore(restorePrompt, layout.firstChild);

        // Add button hover effects
        const restoreBtn = restorePrompt.querySelector('.btn-restore');
        const dismissBtn = restorePrompt.querySelector('.btn-dismiss');

        restoreBtn.addEventListener('mouseenter', () => {
            restoreBtn.style.transform = 'translateY(-2px)';
        });
        restoreBtn.addEventListener('mouseleave', () => {
            restoreBtn.style.transform = 'translateY(0)';
        });

        dismissBtn.addEventListener('mouseenter', () => {
            dismissBtn.style.background = 'rgba(255,255,255,0.3)';
        });
        dismissBtn.addEventListener('mouseleave', () => {
            dismissBtn.style.background = 'rgba(255,255,255,0.2)';
        });

        // Restore button handler
        restoreBtn.addEventListener('click', () => {
            this.restore(data);
            restorePrompt.remove();
        });

        // Dismiss button handler
        dismissBtn.addEventListener('click', () => {
            this.clear();
            restorePrompt.remove();
        });
    },

    clear: function() {
        localStorage.removeItem(this.key);
        this.lastSave = null;
        this.updateSaveIndicator();
    },

    createSaveIndicator: function() {
        // Check if indicator already exists
        if (document.getElementById('autosave-indicator')) return;

        const indicator = document.createElement('div');
        indicator.id = 'autosave-indicator';
        indicator.className = 'autosave-indicator';
        indicator.style.display = 'none';

        // Try to insert before form actions
        const formActions = document.querySelector('.form-actions');
        if (formActions) {
            formActions.insertBefore(indicator, formActions.firstChild);
        } else {
            // Fallback: insert at bottom of calculator layout
            const layout = document.querySelector('.calculator-layout');
            if (layout) {
                layout.appendChild(indicator);
            }
        }
    },

    updateSaveIndicator: function() {
        const indicator = document.getElementById('autosave-indicator');
        if (!indicator) return;

        if (this.lastSave) {
            const ago = Math.floor((Date.now() - this.lastSave) / 60000);
            indicator.textContent = `✓ Auto-saved ${ago > 0 ? ago + ' min ago' : 'just now'}`;
            indicator.style.display = 'block';

            // Fade in animation
            indicator.style.opacity = '0';
            setTimeout(() => {
                indicator.style.transition = 'opacity 0.3s ease';
                indicator.style.opacity = '1';
            }, 10);
        } else {
            indicator.style.display = 'none';
        }
    },

    // Helper methods
    getFieldValue: function(id) {
        const field = document.getElementById(id);
        return field ? field.value : '';
    },

    getCheckboxValue: function(id) {
        const checkbox = document.getElementById(id);
        return checkbox ? checkbox.checked : false;
    },

    setFieldValue: function(id, value) {
        const field = document.getElementById(id);
        if (field && value !== undefined && value !== null) {
            field.value = value;
        }
    },

    setCheckboxValue: function(id, value) {
        const checkbox = document.getElementById(id);
        if (checkbox && value !== undefined) {
            checkbox.checked = Boolean(value);
        }
    },

    collectExpenses: function() {
        const expenses = [];
        const expenseItems = document.querySelectorAll('.expense-item');

        expenseItems.forEach(item => {
            const name = item.querySelector('.expense-name, input[placeholder*="name" i]');
            const amount = item.querySelector('.expense-amount, input[type="number"]');
            const frequency = item.querySelector('.expense-frequency, select');
            const date = item.querySelector('.expense-date, input[type="date"]');

            if (name && amount) {
                expenses.push({
                    name: name.value || '',
                    amount: amount.value || '',
                    frequency: frequency ? frequency.value : 'weekly',
                    date: date ? date.value : ''
                });
            }
        });

        return expenses;
    },

    collectAccounts: function() {
        const accounts = [];
        const accountItems = document.querySelectorAll('.account-item');

        accountItems.forEach(item => {
            const name = item.querySelector('.account-name, input[placeholder*="name" i]');
            const balance = item.querySelector('.account-balance, input[type="number"]');

            if (name && balance) {
                accounts.push({
                    name: name.value || '',
                    balance: balance.value || ''
                });
            }
        });

        return accounts;
    },

    triggerFormChanges: function() {
        // Trigger change events on key fields to update UI
        const fieldsToTrigger = [
            'pay-type',
            'hours-type',
            'kiwisaver',
            'student-loan',
            'invest-savings'
        ];

        fieldsToTrigger.forEach(id => {
            const field = document.getElementById(id);
            if (field) {
                const event = new Event('change', { bubbles: true });
                field.dispatchEvent(event);
            }
        });
    },

    camelToKebab: function(str) {
        return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    }
};
