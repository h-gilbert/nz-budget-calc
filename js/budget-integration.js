// Budget Integration Module
// Connects frontend forms to backend API

import budgetAPI from './api-client.js';

// Save accounts to backend
export async function saveAccountsToBackend() {
    const accountItems = document.querySelectorAll('.account-item');
    const savedAccounts = [];

    for (const item of accountItems) {
        const name = item.querySelector('.account-name').value;
        const balance = parseFloat(item.querySelector('.account-balance').value) || 0;
        const target = parseFloat(item.querySelector('.account-target')?.value) || null;
        const isExpenseAccount = item.querySelector('.is-expense-account')?.checked || false;

        if (name) {
            try {
                const result = await budgetAPI.createAccount({
                    name,
                    current_balance: balance,
                    target_balance: target,
                    is_expense_account: isExpenseAccount,
                    account_type: 'checking'
                });

                savedAccounts.push(result.account);
            } catch (error) {
                console.error('Error saving account:', error);
            }
        }
    }

    return savedAccounts;
}

// Save recurring expenses to backend
export async function saveExpensesToBackend(budgetId = null) {
    const expenseItems = document.querySelectorAll('.expense-item');
    const savedExpenses = [];

    for (const item of expenseItems) {
        const description = item.querySelector('.expense-description').value;
        const amount = parseFloat(item.querySelector('.expense-amount').value);
        const frequency = item.querySelector('.expense-period').value;

        if (!description || !amount) continue;

        // Get date fields based on frequency
        let expenseData = {
            budget_id: budgetId,
            description,
            amount,
            frequency
        };

        if (frequency === 'weekly' || frequency === 'fortnightly') {
            const dayOfWeek = item.querySelector('.expense-day-of-week')?.value;
            if (dayOfWeek !== '' && dayOfWeek !== undefined) {
                expenseData.due_day_of_week = parseInt(dayOfWeek);
            } else {
                // Default to Monday if not specified
                expenseData.due_day_of_week = 1;
            }
        } else if (frequency === 'monthly') {
            const dayOfMonth = item.querySelector('.expense-day-of-month')?.value;
            if (dayOfMonth) {
                expenseData.due_day_of_month = parseInt(dayOfMonth);
            } else {
                // Default to 1st if not specified
                expenseData.due_day_of_month = 1;
            }
        } else if (frequency === 'annual') {
            const dueDate = item.querySelector('.expense-date')?.value;
            if (dueDate) {
                expenseData.due_date = dueDate;
            }
        }

        try {
            const result = await budgetAPI.createRecurringExpense(expenseData);
            savedExpenses.push(result.expense);
        } catch (error) {
            console.error('Error saving expense:', error);
        }
    }

    return savedExpenses;
}

// Load accounts from backend and populate form
export async function loadAccountsFromBackend() {
    try {
        const { accounts } = await budgetAPI.getAccounts();

        // Clear existing accounts
        const accountsList = document.getElementById('accounts-list');
        accountsList.innerHTML = '';

        // Repopulate with saved accounts
        accounts.forEach((account, index) => {
            // Trigger addAccount to create the UI
            if (typeof addAccount === 'function') {
                addAccount();

                // Get the last added account item
                const accountItem = accountsList.lastElementChild;
                if (accountItem) {
                    accountItem.querySelector('.account-name').value = account.name;
                    accountItem.querySelector('.account-balance').value = account.current_balance;
                    if (account.target_balance) {
                        accountItem.querySelector('.account-target').value = account.target_balance;
                    }
                    accountItem.querySelector('.is-expense-account').checked = account.is_expense_account === 1;
                }
            }
        });

        return accounts;
    } catch (error) {
        console.error('Error loading accounts:', error);
        return [];
    }
}

// Load expenses from backend and populate form
export async function loadExpensesFromBackend() {
    try {
        const { expenses } = await budgetAPI.getRecurringExpenses();

        // Clear existing expenses
        const expensesList = document.getElementById('expenses-list');
        expensesList.innerHTML = '';

        // Repopulate with saved expenses
        expenses.forEach((expense) => {
            // Trigger addExpense to create the UI
            if (typeof addExpense === 'function') {
                addExpense();

                // Get the last added expense item
                const expenseItem = expensesList.lastElementChild;
                if (expenseItem) {
                    expenseItem.querySelector('.expense-description').value = expense.description;
                    expenseItem.querySelector('.expense-amount').value = expense.amount;
                    expenseItem.querySelector('.expense-period').value = expense.frequency;

                    // Trigger the change event to show appropriate date field
                    const periodSelect = expenseItem.querySelector('.expense-period');
                    periodSelect.dispatchEvent(new Event('change'));

                    // Set date values
                    if (expense.frequency === 'weekly' || expense.frequency === 'fortnightly') {
                        const dayOfWeekSelect = expenseItem.querySelector('.expense-day-of-week');
                        if (dayOfWeekSelect && expense.due_day_of_week !== null) {
                            dayOfWeekSelect.value = expense.due_day_of_week;
                        }
                    } else if (expense.frequency === 'monthly') {
                        const dayOfMonthSelect = expenseItem.querySelector('.expense-day-of-month');
                        if (dayOfMonthSelect && expense.due_day_of_month !== null) {
                            dayOfMonthSelect.value = expense.due_day_of_month;
                        }
                    } else if (expense.frequency === 'annual') {
                        const dateInput = expenseItem.querySelector('.expense-date');
                        if (dateInput && expense.due_date) {
                            dateInput.value = expense.due_date;
                        }
                    }
                }
            }
        });

        return expenses;
    } catch (error) {
        console.error('Error loading expenses:', error);
        return [];
    }
}

// Calculate and display transfer requirements
export async function calculateTransferRequirements() {
    try {
        const result = await budgetAPI.calculateTransfers(16);

        // Update transfer dashboard
        document.getElementById('weekly-transfer-amount').textContent =
            '$' + result.summary.averageWeeklyTransfer.toFixed(2);
        document.getElementById('total-transfers-needed').textContent =
            '$' + result.summary.totalTransfersNeeded.toFixed(2);

        // Display next 4 weeks
        const transfersList = document.getElementById('upcoming-transfers-list');
        transfersList.innerHTML = '';

        result.projection.slice(0, 4).forEach(week => {
            const transferItem = document.createElement('div');
            transferItem.className = 'transfer-item';
            transferItem.innerHTML = `
                <div class="transfer-week">
                    <strong>Week ${week.week}</strong>
                    <span class="text-muted">${week.weekStart} to ${week.weekEnd}</span>
                </div>
                <div class="transfer-details">
                    <div class="transfer-amount ${week.transferNeeded > 0 ? 'needed' : 'good'}">
                        ${week.transferNeeded > 0 ? `Transfer: $${week.transferNeeded.toFixed(2)}` : 'No transfer needed'}
                    </div>
                    <div class="transfer-info">
                        <small>Expenses: $${week.expenses.toFixed(2)}</small>
                        <small>Required Balance: $${week.requiredBalance.toFixed(2)}</small>
                    </div>
                </div>
            `;
            transfersList.appendChild(transferItem);
        });

        // Show the transfer dashboard
        document.getElementById('transfer-dashboard').classList.remove('hidden');

        return result;
    } catch (error) {
        console.error('Error calculating transfers:', error);
        throw error;
    }
}

// Set up automatic transfers
export async function setupAutomaticTransfers() {
    try {
        // Get accounts
        const { accounts } = await budgetAPI.getAccounts();

        const expenseAccount = accounts.find(a => a.is_expense_account === 1);
        if (!expenseAccount) {
            throw new Error('No expense account found');
        }

        // Find source account (first non-expense account or use the same if only one)
        const sourceAccount = accounts.find(a => a.is_expense_account !== 1) || expenseAccount;

        // Calculate transfer requirements
        const transferCalc = await budgetAPI.calculateTransfers(16);
        const averageAmount = transferCalc.summary.averageWeeklyTransfer;

        // Create transfer schedule
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        // Set standardization date to 8 weeks from now
        const standardizationDate = new Date(today);
        standardizationDate.setDate(today.getDate() + (8 * 7));

        const scheduleData = {
            from_account_id: sourceAccount.id,
            to_account_id: expenseAccount.id,
            amount: Math.round(averageAmount * 100) / 100, // Round to 2 decimals
            frequency: 'weekly',
            day_of_week: 1, // Monday
            start_date: nextWeek.toISOString().split('T')[0],
            standardization_date: standardizationDate.toISOString().split('T')[0]
        };

        const schedule = await budgetAPI.createTransferSchedule(scheduleData);

        // Generate upcoming transfers
        await budgetAPI.generateTransfers(4);

        return schedule;
    } catch (error) {
        console.error('Error setting up transfers:', error);
        throw error;
    }
}

// Make functions available globally
window.saveAccountsToBackend = saveAccountsToBackend;
window.saveExpensesToBackend = saveExpensesToBackend;
window.loadAccountsFromBackend = loadAccountsFromBackend;
window.loadExpensesFromBackend = loadExpensesFromBackend;
window.calculateTransferRequirements = calculateTransferRequirements;
window.setupAutomaticTransfers = setupAutomaticTransfers;

export default {
    saveAccountsToBackend,
    saveExpensesToBackend,
    loadAccountsFromBackend,
    loadExpensesFromBackend,
    calculateTransferRequirements,
    setupAutomaticTransfers
};
