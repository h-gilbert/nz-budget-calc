// NZ Budget Calculator JavaScript

// State management
let expenseCount = 0;
let accountCount = 0;
let currentUser = null;
const API_BASE = 'http://localhost:3200/api';

// Suggested account names
const SUGGESTED_ACCOUNTS = [
    'Expenses Account',
    'Spending Account',
    'Savings Account',
    'Emergency Fund',
    'Investment Account'
];

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    initializeAuthListeners();
    initializeAutoSaveListeners();
    checkAuthentication();
    updateFormVisibility();
});

// Initialize all event listeners
function initializeEventListeners() {
    // Pay amount input - auto-detect pay frequency
    document.getElementById('pay-amount').addEventListener('input', detectPayFrequency);

    // Pay type change
    document.getElementById('pay-type').addEventListener('change', updateFormVisibility);

    // Hours type change
    document.getElementById('hours-type').addEventListener('change', updateFormVisibility);

    // KiwiSaver checkbox
    document.getElementById('kiwisaver').addEventListener('change', updateFormVisibility);

    // Investment checkbox
    document.getElementById('invest-savings').addEventListener('change', updateFormVisibility);

    // Add expense button
    document.getElementById('add-expense').addEventListener('click', addExpense);

    // Add account button
    document.getElementById('add-account').addEventListener('click', addAccount);

    // Calculate button
    document.getElementById('calculate-btn').addEventListener('click', calculateBudget);

    // Reset button
    document.getElementById('reset-btn').addEventListener('click', resetForm);

    // Transfer dashboard buttons
    const setupTransfersBtn = document.getElementById('setup-transfers-btn');
    if (setupTransfersBtn) {
        setupTransfersBtn.addEventListener('click', async function() {
            if (window.setupAutomaticTransfers) {
                try {
                    await window.setupAutomaticTransfers();
                    showSuccess('Automatic transfers set up successfully!');
                } catch (error) {
                    showError('Failed to set up transfers: ' + error.message);
                }
            }
        });
    }

    const viewProjectionBtn = document.getElementById('view-projection-btn');
    if (viewProjectionBtn) {
        viewProjectionBtn.addEventListener('click', function() {
            // Scroll to account timeline chart in results
            const timeline = document.getElementById('account-timeline');
            if (timeline) {
                timeline.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }
}

// Initialize auto-save listeners
function initializeAutoSaveListeners() {
    // Text inputs - trigger on blur (when user clicks outside)
    const textInputIds = [
        'pay-amount',
        'fixed-hours',
        'min-hours',
        'max-hours',
        'allowance-amount',
        'savings-target',
        'savings-deadline',
        'interest-rate',
        'model-weeks',
        'model-start-date',
        'budget-name'
    ];

    textInputIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('blur', triggerAutoSave);
        }
    });

    // Select dropdowns and checkboxes - trigger on change
    const changeInputIds = [
        'pay-type',
        'hours-type',
        'allowance-frequency',
        'kiwisaver-rate',
        'kiwisaver',
        'student-loan',
        'ietc-eligible',
        'invest-savings',
        'transfer-frequency',
        'set-as-default'
    ];

    changeInputIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', triggerAutoSave);
        }
    });
}

// Add auto-save listeners to dynamically added expense fields
function addExpenseAutoSaveListeners(expenseElement) {
    const inputs = expenseElement.querySelectorAll('input, select');
    inputs.forEach(input => {
        if (input.type === 'text' || input.type === 'number' || input.type === 'date') {
            input.addEventListener('blur', triggerAutoSave);
        } else {
            input.addEventListener('change', triggerAutoSave);
        }
    });
}

// Add auto-save listeners to dynamically added account fields
function addAccountAutoSaveListeners(accountElement) {
    const inputs = accountElement.querySelectorAll('input, select');
    inputs.forEach(input => {
        if (input.type === 'text' || input.type === 'number') {
            input.addEventListener('blur', triggerAutoSave);
        } else {
            input.addEventListener('change', triggerAutoSave);
        }
    });
}

// Detect pay frequency based on amount entered
// Thresholds based on median NZ income patterns
function detectPayFrequency() {
    const amount = parseFloat(document.getElementById('pay-amount').value);
    const payTypeSelect = document.getElementById('pay-type');
    const suggestionElement = document.getElementById('pay-suggestion');

    if (!amount || amount <= 0) {
        suggestionElement.textContent = '';
        return;
    }

    let suggestedType = '';
    let suggestionText = '';

    // Thresholds based on NZ median income and common pay patterns
    // NZ median income is around $65,000/year (~$1,250/week, ~$30/hour)
    if (amount <= 250) {
        // Likely hourly rate (NZ minimum wage ~$23.15, typical range $20-$50/hr)
        suggestedType = 'hourly';
        suggestionText = 'This looks like an hourly rate';
    } else if (amount <= 2000) {
        // Likely weekly pay ($400-$2,000/week is common for weekly wages)
        suggestedType = 'weekly';
        suggestionText = 'This looks like weekly pay';
    } else if (amount <= 4000) {
        // Likely fortnightly ($2,000-$4,000 fortnightly is common)
        suggestedType = 'fortnightly';
        suggestionText = 'This looks like fortnightly pay';
    } else if (amount <= 12000) {
        // Likely monthly ($4,000-$12,000/month is typical salary range)
        suggestedType = 'monthly';
        suggestionText = 'This looks like monthly pay';
    } else {
        // Likely annual salary ($30,000-$200,000+ is annual salary range)
        suggestedType = 'annual';
        suggestionText = 'This looks like an annual salary';
    }

    // Only auto-select if the user hasn't manually changed the frequency
    if (payTypeSelect.value === '' || !payTypeSelect.dataset.manuallyChanged) {
        payTypeSelect.value = suggestedType;
        suggestionElement.textContent = suggestionText + '. You can change this if incorrect.';
        updateFormVisibility();
    } else {
        suggestionElement.textContent = '';
    }
}

// Track manual changes to pay type
document.addEventListener('DOMContentLoaded', function() {
    const payTypeSelect = document.getElementById('pay-type');
    payTypeSelect.addEventListener('change', function() {
        if (this.value !== '') {
            this.dataset.manuallyChanged = 'true';
        }
    });
});

// Update form visibility based on selections
function updateFormVisibility() {
    const payType = document.getElementById('pay-type').value;
    const hoursType = document.getElementById('hours-type').value;
    const kiwisaverChecked = document.getElementById('kiwisaver').checked;
    const investChecked = document.getElementById('invest-savings').checked;

    // Show/hide hours section based on pay type
    const hoursGroup = document.getElementById('hours-group');
    const fixedHoursGroup = document.getElementById('fixed-hours-group');
    const rangeHoursGroup = document.getElementById('range-hours-group');

    if (payType === 'hourly') {
        hoursGroup.classList.remove('hidden');
        if (hoursType === 'fixed') {
            fixedHoursGroup.classList.remove('hidden');
            rangeHoursGroup.classList.add('hidden');
        } else {
            fixedHoursGroup.classList.add('hidden');
            rangeHoursGroup.classList.remove('hidden');
        }
    } else {
        hoursGroup.classList.add('hidden');
        fixedHoursGroup.classList.add('hidden');
        rangeHoursGroup.classList.add('hidden');
    }

    // Show/hide KiwiSaver rate
    const kiwisaverGroup = document.getElementById('kiwisaver-group');
    if (kiwisaverChecked) {
        kiwisaverGroup.classList.remove('hidden');
    } else {
        kiwisaverGroup.classList.add('hidden');
    }

    // Show/hide interest rate
    const interestGroup = document.getElementById('interest-group');
    if (investChecked) {
        interestGroup.classList.remove('hidden');
    } else {
        interestGroup.classList.add('hidden');
    }
}

// Add new expense item
function addExpense() {
    expenseCount++;
    const expensesList = document.getElementById('expenses-list');

    const expenseItem = document.createElement('div');
    expenseItem.className = 'expense-item';
    expenseItem.id = `expense-${expenseCount}`;

    expenseItem.innerHTML = `
        <div class="expense-item-header">
            <span class="expense-number">Expense #${expenseCount}</span>
            <button type="button" class="remove-expense" onclick="removeExpense(${expenseCount})">Remove</button>
        </div>
        <div class="expense-fields">
            <input type="text" placeholder="Description (e.g., Rent)" class="expense-description">
            <input type="number" step="0.01" min="0" placeholder="Amount" class="expense-amount">
            <select class="expense-period">
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
            </select>
            <select class="expense-day-of-week hidden" title="Which day of the week?">
                <option value="">Select day</option>
                <option value="0">Sunday</option>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
            </select>
            <select class="expense-day-of-month hidden" title="Which day of the month?">
                <option value="">Select day</option>
                ${Array.from({length: 31}, (_, i) => i + 1).map(day =>
                    `<option value="${day}">${day}${getDaySuffix(day)}</option>`
                ).join('')}
            </select>
            <input type="date" placeholder="Due date" class="expense-date hidden" title="When is this expense due?">
        </div>
        <small class="expense-date-help hidden">Specify when this expense is due</small>
    `;

    expensesList.appendChild(expenseItem);

    // Add event listener to show/hide appropriate date field based on period
    const periodSelect = expenseItem.querySelector('.expense-period');
    const dayOfWeekSelect = expenseItem.querySelector('.expense-day-of-week');
    const dayOfMonthSelect = expenseItem.querySelector('.expense-day-of-month');
    const dateInput = expenseItem.querySelector('.expense-date');
    const dateHelp = expenseItem.querySelector('.expense-date-help');

    periodSelect.addEventListener('change', function() {
        // Hide all date inputs first
        dayOfWeekSelect.classList.add('hidden');
        dayOfMonthSelect.classList.add('hidden');
        dateInput.classList.add('hidden');
        dateHelp.classList.add('hidden');

        // Show appropriate input based on frequency
        if (this.value === 'weekly' || this.value === 'fortnightly') {
            dayOfWeekSelect.classList.remove('hidden');
            dateHelp.classList.remove('hidden');
            dateHelp.textContent = 'Which day of the week is this expense due?';
        } else if (this.value === 'monthly') {
            dayOfMonthSelect.classList.remove('hidden');
            dateHelp.classList.remove('hidden');
            dateHelp.textContent = 'Which day of the month is this expense due?';
        } else if (this.value === 'annual') {
            dateInput.classList.remove('hidden');
            dateHelp.classList.remove('hidden');
            dateHelp.textContent = 'When is this annual expense due?';
        }
    });

    // Add auto-save listeners to this expense
    addExpenseAutoSaveListeners(expenseItem);
}

// Helper function to get ordinal suffix for day numbers
function getDaySuffix(day) {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

// Remove expense item
function removeExpense(id) {
    const expenseItem = document.getElementById(`expense-${id}`);
    if (expenseItem) {
        expenseItem.remove();
        triggerAutoSave();
    }
}

// Add new account
function addAccount() {
    accountCount++;
    const accountsList = document.getElementById('accounts-list');

    const accountItem = document.createElement('div');
    accountItem.className = 'account-item';
    accountItem.id = `account-${accountCount}`;

    // Create datalist for suggestions
    let suggestionsDatalist = '';
    if (accountCount === 1) {
        suggestionsDatalist = `<datalist id="account-suggestions">
            ${SUGGESTED_ACCOUNTS.map(name => `<option value="${name}">`).join('')}
        </datalist>`;
    }

    // First account is expense account by default
    const isExpenseAccount = accountCount === 1;

    accountItem.innerHTML = `
        <div class="account-item-header">
            <span class="account-number">Account #${accountCount}</span>
            <button type="button" class="remove-account" onclick="removeAccount(${accountCount})">Remove</button>
        </div>
        <div class="account-fields">
            <div class="form-group">
                <label>Account Name</label>
                <input type="text" placeholder="Account Name" class="account-name" list="account-suggestions" value="${accountCount === 1 ? 'Spending Account' : ''}">
            </div>
            <div class="form-group">
                <label>Account Purpose/Type</label>
                <input type="text" placeholder="e.g., Emergency fund, Vacation savings, Investment" class="account-purpose">
                <small>What is this account for?</small>
            </div>
            <div class="form-group">
                <label>Current Balance</label>
                <div class="input-wrapper">
                    <span class="input-prefix">$</span>
                    <input type="number" step="0.01" min="0" placeholder="0.00" class="account-balance" value="0">
                </div>
            </div>
            <div class="form-group">
                <label>Target Balance (Optional)</label>
                <div class="input-wrapper">
                    <span class="input-prefix">$</span>
                    <input type="number" step="0.01" min="0" placeholder="0.00" class="account-target">
                </div>
                <small>Goal balance for this account</small>
            </div>
            <div class="form-group">
                <label>Priority</label>
                <input type="number" min="1" max="10" placeholder="1" class="account-priority" value="1">
                <small>Lower number = higher priority for transfers</small>
            </div>
            <div class="form-group">
                <label class="checkbox-label">
                    <input type="radio" name="spending-account" class="is-spending-account" ${accountCount === 1 ? 'checked' : ''} value="${accountCount}">
                    <span class="checkbox-custom"></span>
                    <span>Spending Account (where pay is deposited)</span>
                </label>
            </div>
            <div class="form-group">
                <label class="checkbox-label">
                    <input type="checkbox" class="is-expense-account" ${isExpenseAccount ? 'checked' : ''} onchange="handleExpenseAccountChange(${accountCount})">
                    <span class="checkbox-custom"></span>
                    <span>Expense Account (stays 1 week ahead)</span>
                </label>
            </div>
        </div>
        ${suggestionsDatalist}
    `;

    accountsList.appendChild(accountItem);

    // Add auto-save listeners to this account
    addAccountAutoSaveListeners(accountItem);
}

// Handle expense account checkbox change - only one can be selected
function handleExpenseAccountChange(changedAccountId) {
    const allCheckboxes = document.querySelectorAll('.is-expense-account');
    allCheckboxes.forEach((checkbox, index) => {
        if (index + 1 !== changedAccountId) {
            checkbox.checked = false;
        }
    });
}

// Remove account
function removeAccount(id) {
    const accountItem = document.getElementById(`account-${id}`);
    if (accountItem) {
        accountItem.remove();
        triggerAutoSave();
    }
}

// Calculate multi-account requirements over time
function calculateAccountRequirements(accounts, allExpenses, weeklyNetIncome) {
    const today = new Date();
    const weeksToProject = 16;

    // Find expenses account (default first account if not named)
    const expensesAccount = accounts.find(a => a.name.toLowerCase().includes('expense')) || accounts[0];
    if (!expensesAccount) {
        return null;
    }

    const accountTimelines = {};

    // Initialize timelines for each account
    accounts.forEach(account => {
        accountTimelines[account.name] = {
            timeline: [],
            startingBalance: account.balance,
            weeklyTransfer: 0,
            maxRequired: 0
        };
    });

    // Calculate expense account requirements
    const expenseAccountName = expensesAccount.name;
    let currentBalance = expensesAccount.balance;
    let totalWeeklyExpenses = 0;

    // Calculate total weekly expense amount
    allExpenses.forEach(expense => {
        const { amount, period } = expense;
        let weeklyAmount = 0;
        if (period === 'weekly') weeklyAmount = amount;
        else if (period === 'fortnightly') weeklyAmount = amount / 2;
        else if (period === 'monthly') weeklyAmount = (amount * 12) / 52;
        else if (period === 'annual') weeklyAmount = amount / 52;
        totalWeeklyExpenses += weeklyAmount;
    });

    // Project forward 16 weeks
    for (let week = 0; week < weeksToProject; week++) {
        const weekDate = new Date(today.getTime() + (week * 7 * 24 * 60 * 60 * 1000));
        const nextWeekDate = new Date(today.getTime() + ((week + 1) * 7 * 24 * 60 * 60 * 1000));

        let weekExpenses = 0;
        const expensesDue = [];

        // Calculate expenses due in the NEXT week (we need money 1 week early)
        allExpenses.forEach(expense => {
            const { description, amount, period, date } = expense;

            if (period === 'weekly') {
                weekExpenses += amount;
                expensesDue.push({ description, amount });
            } else if (period === 'fortnightly') {
                if (week % 2 === 1) {
                    weekExpenses += amount;
                    expensesDue.push({ description, amount });
                }
            } else if ((period === 'monthly' || period === 'annual') && date) {
                const dueDate = new Date(date);

                // Check if expense falls in the next week
                let checkDate = new Date(dueDate);
                while (checkDate < nextWeekDate.getTime() + (7 * 24 * 60 * 60 * 1000)) {
                    const weekEnd = new Date(nextWeekDate.getTime() + (7 * 24 * 60 * 60 * 1000));

                    if (checkDate >= nextWeekDate && checkDate < weekEnd) {
                        weekExpenses += amount;
                        expensesDue.push({ description, amount, date: checkDate.toISOString().split('T')[0] });
                    }

                    if (period === 'monthly') {
                        checkDate = new Date(checkDate.setMonth(checkDate.getMonth() + 1));
                    } else {
                        checkDate = new Date(checkDate.setFullYear(checkDate.getFullYear() + 1));
                    }

                    if (checkDate > nextWeekDate.getTime() + (weeksToProject * 7 * 24 * 60 * 60 * 1000)) break;
                }
            }
        });

        // Required balance = enough to cover next week's expenses
        const requiredBalance = currentBalance + weekExpenses;

        accountTimelines[expenseAccountName].timeline.push({
            week,
            date: weekDate.toISOString().split('T')[0],
            displayDate: weekDate.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' }),
            requiredBalance,
            currentBalance,
            expensesDue,
            weekExpenses
        });

        accountTimelines[expenseAccountName].maxRequired = Math.max(
            accountTimelines[expenseAccountName].maxRequired,
            requiredBalance
        );

        // Simulate balance changes (add weekly transfer, subtract expenses)
        currentBalance += totalWeeklyExpenses - weekExpenses;
    }

    // Calculate weekly transfer needed
    accountTimelines[expenseAccountName].weeklyTransfer = totalWeeklyExpenses;

    // Calculate other account transfers (remaining income after expenses)
    const remainingIncome = weeklyNetIncome - totalWeeklyExpenses;
    const otherAccounts = accounts.filter(a => a.name !== expenseAccountName);

    if (otherAccounts.length > 0 && remainingIncome > 0) {
        const perAccount = remainingIncome / otherAccounts.length;
        otherAccounts.forEach(account => {
            accountTimelines[account.name].weeklyTransfer = perAccount;
        });
    }

    return {
        accountTimelines,
        totalWeeklyExpenses,
        remainingIncome
    };
}

// Calculate comprehensive week-by-week cash flow model
function calculateCashFlowModel(netIncome, payFrequency, expenses, accounts, preferences) {
    const { modelWeeks, modelStartDate, transferFrequency } = preferences;

    // Determine start date
    let startDate = modelStartDate ? new Date(modelStartDate) : new Date();

    // Find spending account (where pay is deposited)
    const spendingAccount = accounts.find(a => a.isSpendingAccount);
    if (!spendingAccount) {
        console.error('No spending account found');
        return null;
    }

    // Initialize account balances
    const accountBalances = {};
    accounts.forEach(account => {
        accountBalances[account.name] = account.balance || 0;
    });

    // Sort other accounts by priority for transfers
    const otherAccounts = accounts
        .filter(a => !a.isSpendingAccount)
        .sort((a, b) => (a.priority || 1) - (b.priority || 1));

    // Determine pay frequency in weeks
    let payEveryNWeeks = 1;
    if (payFrequency === 'fortnightly') payEveryNWeeks = 2;
    else if (payFrequency === 'monthly') payEveryNWeeks = 4;
    else if (payFrequency === 'annual') payEveryNWeeks = 52;

    const weeklyModel = [];
    const MINIMUM_BUFFER = 100; // Keep at least $100 in spending account

    for (let week = 0; week < modelWeeks; week++) {
        const weekDate = new Date(startDate.getTime() + (week * 7 * 24 * 60 * 60 * 1000));
        const weekEnd = new Date(weekDate.getTime() + (7 * 24 * 60 * 60 * 1000));

        // Check if pay is received this week
        const isPayWeek = (week % payEveryNWeeks) === 0;
        const payReceived = isPayWeek ? netIncome : 0;

        // Calculate expenses due this week
        let weekExpenses = 0;
        const expensesDue = [];

        expenses.forEach(expense => {
            const { description, amount, period, date, dayOfWeek, dayOfMonth } = expense;
            let isDue = false;

            if (period === 'weekly') {
                isDue = true;
            } else if (period === 'fortnightly') {
                isDue = (week % 2) === 0;
            } else if (period === 'monthly') {
                // Check if the day of month falls within this week
                if (dayOfMonth) {
                    const monthStart = new Date(weekDate.getFullYear(), weekDate.getMonth(), 1);
                    const dueDate = new Date(weekDate.getFullYear(), weekDate.getMonth(), dayOfMonth);
                    isDue = dueDate >= weekDate && dueDate < weekEnd;
                }
            } else if (period === 'annual' && date) {
                const expenseDate = new Date(date);
                const thisYearDate = new Date(weekDate.getFullYear(), expenseDate.getMonth(), expenseDate.getDate());
                isDue = thisYearDate >= weekDate && thisYearDate < weekEnd;
            }

            if (isDue) {
                weekExpenses += amount;
                expensesDue.push({ description, amount });
            }
        });

        // Update spending account balance
        accountBalances[spendingAccount.name] += payReceived;
        accountBalances[spendingAccount.name] -= weekExpenses;

        // Calculate available surplus for transfers
        const surplus = accountBalances[spendingAccount.name] - MINIMUM_BUFFER;
        const transfers = {};

        // Allocate transfers to other accounts based on priority
        let remainingSurplus = surplus > 0 ? surplus : 0;

        otherAccounts.forEach(account => {
            if (remainingSurplus <= 0) {
                transfers[account.name] = 0;
                return;
            }

            const currentBalance = accountBalances[account.name];
            const targetBalance = account.target || currentBalance;
            const gap = targetBalance - currentBalance;

            if (gap > 0) {
                // Transfer what we can, up to the gap
                const transferAmount = Math.min(remainingSurplus, gap);
                transfers[account.name] = transferAmount;
                accountBalances[account.name] += transferAmount;
                accountBalances[spendingAccount.name] -= transferAmount;
                remainingSurplus -= transferAmount;
            } else {
                transfers[account.name] = 0;
            }
        });

        // Determine status
        let status = 'surplus';
        if (accountBalances[spendingAccount.name] < MINIMUM_BUFFER) {
            status = 'deficit';
        } else if (accountBalances[spendingAccount.name] < MINIMUM_BUFFER + 200) {
            status = 'tight';
        }

        // Store week data
        weeklyModel.push({
            weekNumber: week + 1,
            date: weekDate.toISOString().split('T')[0],
            displayDate: weekDate.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }),
            payReceived,
            expensesPaid: weekExpenses,
            expensesDue,
            balances: { ...accountBalances },
            transfers,
            status
        });
    }

    return {
        weeklyModel,
        accounts: accounts.map(a => ({
            name: a.name,
            startBalance: a.balance || 0,
            endBalance: accountBalances[a.name],
            targetBalance: a.target,
            isSpendingAccount: a.isSpendingAccount
        }))
    };
}

async function calculateBudget() {
    try {
        // Get form values
        const payType = document.getElementById('pay-type').value;
        const payAmount = parseFloat(document.getElementById('pay-amount').value);

        // Validate pay amount
        if (!payAmount || payAmount <= 0) {
            showError('Please enter a valid pay amount');
            return;
        }

        // Validate pay type is selected
        if (!payType || payType === '') {
            showError('Please select a pay frequency');
            return;
        }

        // Calculate weekly gross income
        let weeklyGrossIncome = 0;
        let weeklyGrossIncomeMin = 0;
        let weeklyGrossIncomeMax = 0;
        let isVariableHours = false;

        if (payType === 'hourly') {
            const hoursType = document.getElementById('hours-type').value;
            let hours = 0;

            if (hoursType === 'fixed') {
                hours = parseFloat(document.getElementById('fixed-hours').value);
                if (!hours || hours <= 0) {
                    showError('Please enter valid working hours');
                    return;
                }
                weeklyGrossIncome = payAmount * hours;
            } else {
                const minHours = parseFloat(document.getElementById('min-hours').value);
                const maxHours = parseFloat(document.getElementById('max-hours').value);

                if (!minHours || !maxHours || minHours <= 0 || maxHours <= 0) {
                    showError('Please enter valid working hours');
                    return;
                }

                if (minHours > maxHours) {
                    showError('Minimum hours cannot be greater than maximum hours');
                    return;
                }

                isVariableHours = true;
                hours = (minHours + maxHours) / 2; // Use average for main calculation
                weeklyGrossIncome = payAmount * hours;
                weeklyGrossIncomeMin = payAmount * minHours;
                weeklyGrossIncomeMax = payAmount * maxHours;
            }
        } else if (payType === 'weekly') {
            weeklyGrossIncome = payAmount;
        } else if (payType === 'fortnightly') {
            weeklyGrossIncome = payAmount / 2;
        } else if (payType === 'monthly') {
            weeklyGrossIncome = (payAmount * 12) / 52;
        } else if (payType === 'annual') {
            weeklyGrossIncome = payAmount / 52;
        }

        // Get KiwiSaver, student loan, and IETC settings
        const hasKiwisaver = document.getElementById('kiwisaver').checked;
        const kiwisaverRate = hasKiwisaver ? parseFloat(document.getElementById('kiwisaver-rate').value) / 100 : 0;
        const hasStudentLoan = document.getElementById('student-loan').checked;
        const eligibleForIETC = document.getElementById('ietc-eligible').checked;

        // Calculate deductions for average income
        const deductions = calculateDeductions(weeklyGrossIncome, hasKiwisaver, kiwisaverRate, hasStudentLoan, eligibleForIETC);

        // For variable hours, also calculate min and max scenarios
        let deductionsMin = null;
        let deductionsMax = null;
        if (isVariableHours) {
            deductionsMin = calculateDeductions(weeklyGrossIncomeMin, hasKiwisaver, kiwisaverRate, hasStudentLoan, eligibleForIETC);
            deductionsMax = calculateDeductions(weeklyGrossIncomeMax, hasKiwisaver, kiwisaverRate, hasStudentLoan, eligibleForIETC);
        }

        // Extract values for compatibility
        const weeklyTax = deductions.weeklyTax;
        const weeklyACC = deductions.weeklyACC;
        const weeklyKiwisaver = deductions.weeklyKiwisaver;
        const weeklyEmployerKiwisaver = deductions.weeklyEmployerKiwisaver;
        const weeklyStudentLoan = deductions.weeklyStudentLoan;
        const weeklyIETC = deductions.weeklyIETC;
        let weeklyNetIncome = deductions.weeklyNet;

        // Add non-taxable allowance to net income
        const allowanceAmount = parseFloat(document.getElementById('allowance-amount').value) || 0;
        const allowanceFrequency = document.getElementById('allowance-frequency').value;
        let weeklyAllowance = 0;

        if (allowanceAmount > 0) {
            if (allowanceFrequency === 'weekly') {
                weeklyAllowance = allowanceAmount;
            } else if (allowanceFrequency === 'fortnightly') {
                weeklyAllowance = allowanceAmount / 2;
            } else if (allowanceFrequency === 'monthly') {
                weeklyAllowance = (allowanceAmount * 12) / 52;
            } else if (allowanceFrequency === 'annual') {
                weeklyAllowance = allowanceAmount / 52;
            }

            // Add non-taxable allowance to net income
            weeklyNetIncome += weeklyAllowance;

            // Also add to variable hours scenarios if applicable
            if (isVariableHours && deductionsMin && deductionsMax) {
                deductionsMin.weeklyNet += weeklyAllowance;
                deductionsMax.weeklyNet += weeklyAllowance;
            }
        }

        // Calculate total expenses
        let weeklyExpenses = 0;
        const expenseItems = document.querySelectorAll('.expense-item');
        const expenseBreakdown = [];

        const upcomingExpenses = [];
        const today = new Date();
        const sixtyDaysFromNow = new Date(today.getTime() + (60 * 24 * 60 * 60 * 1000));

        const allExpenses = []; // Track all expenses for expense account planning

        expenseItems.forEach(item => {
            const description = item.querySelector('.expense-description').value;
            const amount = parseFloat(item.querySelector('.expense-amount').value);
            const period = item.querySelector('.expense-period').value;
            const dateValue = item.querySelector('.expense-date').value;

            if (description && amount && amount > 0) {
                let weeklyAmount = 0;

                if (period === 'weekly') {
                    weeklyAmount = amount;
                } else if (period === 'fortnightly') {
                    weeklyAmount = amount / 2;
                } else if (period === 'monthly') {
                    weeklyAmount = (amount * 12) / 52;
                } else if (period === 'annual') {
                    weeklyAmount = amount / 52;
                }

                weeklyExpenses += weeklyAmount;
                expenseBreakdown.push({
                    description,
                    amount: weeklyAmount
                });

                // Store all expense details for account planning
                allExpenses.push({
                    description,
                    amount,
                    period,
                    date: dateValue,
                    weeklyAmount
                });

                // Track upcoming monthly/annual expenses
                if ((period === 'monthly' || period === 'annual') && dateValue) {
                    const dueDate = new Date(dateValue);
                    if (dueDate >= today && dueDate <= sixtyDaysFromNow) {
                        const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                        upcomingExpenses.push({
                            description,
                            amount,
                            dueDate: dateValue,
                            daysUntil,
                            period
                        });
                    }
                }
            }
        });

        // Calculate disposable income
        const weeklyDisposable = weeklyNetIncome - weeklyExpenses;

        // Collect accounts
        const accountItems = document.querySelectorAll('.account-item');
        const accounts = [];
        accountItems.forEach(item => {
            const name = item.querySelector('.account-name').value;
            const purpose = item.querySelector('.account-purpose').value;
            const balance = parseFloat(item.querySelector('.account-balance').value) || 0;
            const target = parseFloat(item.querySelector('.account-target').value) || null;
            const priority = parseInt(item.querySelector('.account-priority').value) || 1;
            const isSpendingAccount = item.querySelector('.is-spending-account').checked;
            const isExpenseAccount = item.querySelector('.is-expense-account').checked;
            if (name) {
                accounts.push({ name, purpose, balance, target, priority, isSpendingAccount, isExpenseAccount });
            }
        });

        // Validate that at least one spending account is selected
        if (accounts.length > 0 && !accounts.some(a => a.isSpendingAccount)) {
            showError('Please select at least one spending account (where your pay is deposited)');
            return;
        }

        // Calculate account requirements
        let accountsPlan = null;
        if (accounts.length > 0) {
            accountsPlan = calculateAccountRequirements(accounts, allExpenses, weeklyNetIncome);
        }

        // Calculate savings goal
        const savingsTarget = parseFloat(document.getElementById('savings-target').value) || 0;
        const savingsDeadline = document.getElementById('savings-deadline').value;

        let savingsAnalysis = null;
        if (savingsTarget > 0 && savingsDeadline) {
            const today = new Date();
            const deadline = new Date(savingsDeadline);
            const weeksUntilDeadline = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24 * 7));

            if (weeksUntilDeadline > 0) {
                const investSavings = document.getElementById('invest-savings').checked;

                if (investSavings) {
                    const interestRate = parseFloat(document.getElementById('interest-rate').value) || 0;
                    savingsAnalysis = calculateInvestmentGoal(weeklyDisposable, savingsTarget, weeksUntilDeadline, interestRate);
                } else {
                    savingsAnalysis = calculateSimpleGoal(weeklyDisposable, savingsTarget, weeksUntilDeadline);
                }
            }
        }

        // Calculate cash flow model
        let cashFlowModel = null;
        if (accounts.length > 0 && accounts.some(a => a.isSpendingAccount)) {
            const modelWeeks = parseInt(document.getElementById('model-weeks').value) || 26;

            // Validate model weeks
            if (modelWeeks < 1 || modelWeeks > 104) {
                showError('Projection weeks must be between 1 and 104');
                return;
            }

            const preferences = {
                modelWeeks,
                modelStartDate: document.getElementById('model-start-date').value,
                transferFrequency: document.getElementById('transfer-frequency').value
            };

            cashFlowModel = calculateCashFlowModel(
                weeklyNetIncome,
                payType,
                allExpenses,
                accounts,
                preferences
            );
        }

        // Display results
        displayResults({
            weeklyGrossIncome,
            weeklyTax,
            weeklyACC,
            weeklyKiwisaver,
            weeklyEmployerKiwisaver,
            weeklyStudentLoan,
            weeklyIETC,
            weeklyNetIncome,
            weeklyExpenses,
            expenseBreakdown,
            upcomingExpenses,
            weeklyDisposable,
            accountsPlan,
            savingsTarget,
            savingsAnalysis,
            cashFlowModel,
            // Variable hours data
            isVariableHours,
            weeklyGrossIncomeMin,
            weeklyGrossIncomeMax,
            deductionsMin,
            deductionsMax
        });

        // Calculate and display transfer requirements if user is logged in
        if (window.budgetAPI && window.budgetAPI.token && window.calculateTransferRequirements) {
            try {
                await window.calculateTransferRequirements();
            } catch (transferError) {
                console.log('Transfer calculation skipped (user may not be logged in or no expense account configured)');
            }
        }

    } catch (error) {
        showError('An error occurred while calculating. Please check your inputs.');
        console.error(error);
    }
}

// Calculate NZ tax (2025/26 tax rates - from 1 April 2025)
function calculateNZTax(annualIncome) {
    let tax = 0;

    // Tax brackets from 1 April 2025
    // $0 - $15,600: 10.5%
    // $15,601 - $53,500: 17.5%
    // $53,501 - $78,100: 30%
    // $78,101 - $180,000: 33%
    // $180,001+: 39%

    if (annualIncome <= 15600) {
        tax = annualIncome * 0.105;
    } else if (annualIncome <= 53500) {
        tax = 15600 * 0.105 + (annualIncome - 15600) * 0.175;
    } else if (annualIncome <= 78100) {
        tax = 15600 * 0.105 + 37900 * 0.175 + (annualIncome - 53500) * 0.30;
    } else if (annualIncome <= 180000) {
        tax = 15600 * 0.105 + 37900 * 0.175 + 24600 * 0.30 + (annualIncome - 78100) * 0.33;
    } else {
        tax = 15600 * 0.105 + 37900 * 0.175 + 24600 * 0.30 + 101900 * 0.33 + (annualIncome - 180000) * 0.39;
    }

    return tax;
}

// Calculate ACC earner levy (2025/26 tax year)
function calculateACCLevy(annualIncome) {
    // ACC earner levy rate for 2025/26: 1.67% (GST inclusive)
    const accRate = 0.0167;
    // Maximum earnings threshold for 2025/26: $152,790
    const maxEarnings = 152790;

    const levyableIncome = Math.min(annualIncome, maxEarnings);
    const accLevy = levyableIncome * accRate;

    return accLevy;
}

// Calculate Independent Earner Tax Credit (IETC)
function calculateIETC(annualIncome) {
    // IETC eligibility: $24,000 - $70,000 annual income
    // Credit: $10/week ($520/year) for income $24,000 - $66,000
    // Abates at 13 cents per dollar between $66,001 - $70,000

    if (annualIncome < 24000 || annualIncome > 70000) {
        return 0;
    }

    const maxAnnualCredit = 520; // $10 per week × 52 weeks
    const abatementThreshold = 66000;
    const abatementRate = 0.13;

    if (annualIncome <= abatementThreshold) {
        return maxAnnualCredit;
    } else {
        // Income between $66,001 and $70,000 - apply abatement
        const excessIncome = annualIncome - abatementThreshold;
        const reduction = excessIncome * abatementRate;
        const credit = Math.max(0, maxAnnualCredit - reduction);
        return credit;
    }
}

// Calculate all deductions for a given weekly gross income
function calculateDeductions(weeklyGross, hasKiwisaver, kiwisaverRate, hasStudentLoan, eligibleForIETC) {
    const annualGross = weeklyGross * 52;

    // Calculate tax (PAYE)
    const annualTax = calculateNZTax(annualGross);
    let weeklyTax = annualTax / 52;

    // Calculate ACC earner levy
    const annualACC = calculateACCLevy(annualGross);
    const weeklyACC = annualACC / 52;

    // Calculate IETC (reduces tax)
    let weeklyIETC = 0;
    if (eligibleForIETC) {
        const annualIETC = calculateIETC(annualGross);
        weeklyIETC = annualIETC / 52;
        // IETC reduces the tax owed
        weeklyTax = Math.max(0, weeklyTax - weeklyIETC);
    }

    // Calculate KiwiSaver (employee contribution)
    let weeklyKiwisaver = 0;
    let weeklyEmployerKiwisaver = 0;
    if (hasKiwisaver) {
        weeklyKiwisaver = weeklyGross * kiwisaverRate;
        weeklyEmployerKiwisaver = weeklyGross * 0.03; // 3% employer contribution
    }

    // Calculate student loan
    let weeklyStudentLoan = 0;
    if (hasStudentLoan) {
        const studentLoanThreshold = 24128;
        if (annualGross > studentLoanThreshold) {
            const repayableIncome = annualGross - studentLoanThreshold;
            const annualRepayment = repayableIncome * 0.12;
            weeklyStudentLoan = annualRepayment / 52;
        }
    }

    // Calculate net income (take-home pay)
    const weeklyNet = weeklyGross - weeklyTax - weeklyACC - weeklyKiwisaver - weeklyStudentLoan;

    return {
        weeklyTax,
        weeklyACC,
        weeklyKiwisaver,
        weeklyEmployerKiwisaver,
        weeklyStudentLoan,
        weeklyIETC,
        weeklyNet
    };
}

// Calculate simple savings goal (no investment)
function calculateSimpleGoal(weeklyDisposable, target, weeks) {
    const totalAvailable = weeklyDisposable * weeks;
    const achievable = totalAvailable >= target;
    const requiredWeekly = target / weeks;
    const surplus = totalAvailable - target;

    return {
        achievable,
        requiredWeekly,
        totalAvailable,
        surplus,
        weeks
    };
}

// Calculate investment goal (with compound interest)
function calculateInvestmentGoal(weeklyDisposable, target, weeks, annualRate) {
    const weeklyRate = annualRate / 100 / 52;

    // Future value of annuity formula
    let futureValue = 0;
    if (weeklyRate > 0) {
        futureValue = weeklyDisposable * (Math.pow(1 + weeklyRate, weeks) - 1) / weeklyRate;
    } else {
        futureValue = weeklyDisposable * weeks;
    }

    const achievable = futureValue >= target;

    // Calculate required weekly amount if not achievable
    let requiredWeekly = weeklyDisposable;
    if (!achievable && weeklyRate > 0) {
        requiredWeekly = target * weeklyRate / (Math.pow(1 + weeklyRate, weeks) - 1);
    } else if (!achievable) {
        requiredWeekly = target / weeks;
    }

    return {
        achievable,
        requiredWeekly,
        futureValue,
        interestEarned: futureValue - (weeklyDisposable * weeks),
        weeks,
        annualRate
    };
}


// Display results function is now loaded from js/results-display.js


// Show error message
function showError(message) {
    const resultsContent = document.getElementById('results-content');
    resultsContent.innerHTML = `
        <div class="alert alert-warning">
            <strong>Error:</strong> ${message}
        </div>
    `;
}

function showSuccess(message) {
    // Use toast notification if available
    if (window.toast) {
        window.toast(message, 'success');
    } else {
        alert(message);
    }
}

// Reset form
function resetForm() {
    if (confirm('Are you sure you want to reset all fields?')) {
        document.querySelector('form') ? document.querySelector('form').reset() : location.reload();
        document.getElementById('expenses-list').innerHTML = '';
        expenseCount = 0;

        // Clear manual change flag and suggestion
        const payTypeSelect = document.getElementById('pay-type');
        delete payTypeSelect.dataset.manuallyChanged;
        document.getElementById('pay-suggestion').textContent = '';
        document.getElementById('pay-amount').value = '';

        updateFormVisibility();
        document.getElementById('results-content').innerHTML = `
            <div class="results-placeholder">
                <p>Enter your details and click "Calculate Budget" to see your results</p>
            </div>
        `;
    }
}

// ===== AUTHENTICATION FUNCTIONS =====

function initializeAuthListeners() {
    // Auth button
    document.getElementById('auth-btn').addEventListener('click', function() {
        if (currentUser) {
            logout();
        } else {
            openAuthModal();
        }
    });

    // Modal close
    document.querySelector('.modal-close').addEventListener('click', closeAuthModal);
    document.getElementById('auth-modal').addEventListener('click', function(e) {
        if (e.target === this) closeAuthModal();
    });

    // Form toggle
    document.getElementById('show-register').addEventListener('click', function(e) {
        e.preventDefault();
        showRegisterForm();
    });
    document.getElementById('show-login').addEventListener('click', function(e) {
        e.preventDefault();
        showLoginForm();
    });

    // Form submissions
    document.getElementById('login-submit').addEventListener('click', handleLogin);
    document.getElementById('register-submit').addEventListener('click', handleRegister);

    // Enter key submission
    document.getElementById('login-password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('register-password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleRegister();
    });

    // Save/Load buttons
    document.getElementById('save-btn').addEventListener('click', saveBudget);
    document.getElementById('refresh-budgets-btn').addEventListener('click', refreshBudgetsList);
}

function checkAuthentication() {
    const token = localStorage.getItem('budget_token');
    if (token) {
        // Verify token
        fetch(`${API_BASE}/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Token invalid');
        })
        .then(data => {
            currentUser = data.user;
            updateAuthUI();
        })
        .catch(() => {
            localStorage.removeItem('budget_token');
            updateAuthUI();
        });
    } else {
        updateAuthUI();
    }
}

function updateAuthUI() {
    const authBtn = document.getElementById('auth-btn');
    const userInfo = document.getElementById('user-info');
    const saveLoadSection = document.getElementById('save-load-section');

    if (currentUser) {
        authBtn.textContent = 'Logout';
        userInfo.textContent = `Hello, ${currentUser.username}`;
        userInfo.classList.remove('hidden');
        saveLoadSection.classList.remove('hidden');
        // Load budgets list when user logs in
        refreshBudgetsList();
        // Automatically load default budget
        autoLoadDefaultBudget();
    } else {
        authBtn.textContent = 'Login';
        userInfo.textContent = '';
        userInfo.classList.add('hidden');
        saveLoadSection.classList.add('hidden');
        currentBudgetId = null;
    }
}

function openAuthModal() {
    document.getElementById('auth-modal').classList.remove('hidden');
    document.getElementById('login-username').focus();
}

function closeAuthModal() {
    document.getElementById('auth-modal').classList.add('hidden');
    clearAuthForms();
}

function showLoginForm() {
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
    clearAuthForms();
}

function showRegisterForm() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
    clearAuthForms();
}

function clearAuthForms() {
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('register-username').value = '';
    document.getElementById('register-password').value = '';
    document.getElementById('login-error').classList.add('hidden');
    document.getElementById('register-error').classList.add('hidden');
}

async function handleLogin() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');

    if (!username || !password) {
        errorDiv.textContent = 'Please enter both username and password';
        errorDiv.classList.remove('hidden');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('budget_token', data.token);
            currentUser = data.user;
            updateAuthUI();
            closeAuthModal();
        } else {
            errorDiv.textContent = data.error || 'Login failed';
            errorDiv.classList.remove('hidden');
        }
    } catch (error) {
        errorDiv.textContent = 'Connection error. Please try again.';
        errorDiv.classList.remove('hidden');
    }
}

async function handleRegister() {
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;
    const errorDiv = document.getElementById('register-error');

    if (!username || !password) {
        errorDiv.textContent = 'Please enter username and password';
        errorDiv.classList.remove('hidden');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('budget_token', data.token);
            currentUser = data.user;
            updateAuthUI();
            closeAuthModal();
        } else {
            errorDiv.textContent = data.error || 'Registration failed';
            errorDiv.classList.remove('hidden');
        }
    } catch (error) {
        errorDiv.textContent = 'Connection error. Please try again.';
        errorDiv.classList.remove('hidden');
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('budget_token');
        currentUser = null;
        updateAuthUI();
    }
}

// ===== SAVE/LOAD FUNCTIONS =====

function collectFormData() {
    const expenses = [];
    document.querySelectorAll('.expense-item').forEach(item => {
        const description = item.querySelector('.expense-description').value;
        const amount = parseFloat(item.querySelector('.expense-amount').value);
        const period = item.querySelector('.expense-period').value;
        const date = item.querySelector('.expense-date').value;
        const dayOfWeek = item.querySelector('.expense-day-of-week').value;
        const dayOfMonth = item.querySelector('.expense-day-of-month').value;
        if (description && amount) {
            expenses.push({
                description,
                amount,
                period,
                date: date || null,
                dayOfWeek: dayOfWeek || null,
                dayOfMonth: dayOfMonth || null
            });
        }
    });

    const accounts = [];
    document.querySelectorAll('.account-item').forEach(item => {
        const name = item.querySelector('.account-name').value;
        const purpose = item.querySelector('.account-purpose').value;
        const balance = parseFloat(item.querySelector('.account-balance').value) || 0;
        const target = parseFloat(item.querySelector('.account-target').value) || null;
        const priority = parseInt(item.querySelector('.account-priority').value) || 1;
        const isSpendingAccount = item.querySelector('.is-spending-account').checked;
        const isExpenseAccount = item.querySelector('.is-expense-account').checked;
        if (name) {
            accounts.push({ name, purpose, balance, target, priority, isSpendingAccount, isExpenseAccount });
        }
    });

    return {
        payAmount: parseFloat(document.getElementById('pay-amount').value) || null,
        payType: document.getElementById('pay-type').value,
        hoursType: document.getElementById('hours-type').value,
        fixedHours: parseFloat(document.getElementById('fixed-hours').value) || null,
        minHours: parseFloat(document.getElementById('min-hours').value) || null,
        maxHours: parseFloat(document.getElementById('max-hours').value) || null,
        allowanceAmount: parseFloat(document.getElementById('allowance-amount').value) || null,
        allowanceFrequency: document.getElementById('allowance-frequency').value,
        kiwisaver: document.getElementById('kiwisaver').checked,
        kiwisaverRate: parseInt(document.getElementById('kiwisaver-rate').value) || null,
        studentLoan: document.getElementById('student-loan').checked,
        ietcEligible: document.getElementById('ietc-eligible').checked,
        expenses,
        accounts,
        savingsTarget: parseFloat(document.getElementById('savings-target').value) || null,
        savingsDeadline: document.getElementById('savings-deadline').value,
        investSavings: document.getElementById('invest-savings').checked,
        interestRate: parseFloat(document.getElementById('interest-rate').value) || null,
        modelWeeks: parseInt(document.getElementById('model-weeks').value) || 26,
        modelStartDate: document.getElementById('model-start-date').value,
        transferFrequency: document.getElementById('transfer-frequency').value
    };
}

function loadFormData(data) {
    document.getElementById('pay-amount').value = data.payAmount || '';
    document.getElementById('pay-type').value = data.payType || '';
    document.getElementById('hours-type').value = data.hoursType || 'fixed';
    document.getElementById('fixed-hours').value = data.fixedHours || '';
    document.getElementById('min-hours').value = data.minHours || '';
    document.getElementById('max-hours').value = data.maxHours || '';
    document.getElementById('allowance-amount').value = data.allowanceAmount || '';
    document.getElementById('allowance-frequency').value = data.allowanceFrequency || 'weekly';
    document.getElementById('kiwisaver').checked = data.kiwisaver || false;
    document.getElementById('kiwisaver-rate').value = data.kiwisaverRate || 3;
    document.getElementById('student-loan').checked = data.studentLoan || false;
    document.getElementById('ietc-eligible').checked = data.ietcEligible || false;
    document.getElementById('savings-target').value = data.savingsTarget || '';
    document.getElementById('savings-deadline').value = data.savingsDeadline || '';
    document.getElementById('invest-savings').checked = data.investSavings || false;
    document.getElementById('interest-rate').value = data.interestRate || '';
    document.getElementById('model-weeks').value = data.modelWeeks || 26;
    document.getElementById('model-start-date').value = data.modelStartDate || '';
    document.getElementById('transfer-frequency').value = data.transferFrequency || 'weekly';

    // Load expenses
    document.getElementById('expenses-list').innerHTML = '';
    expenseCount = 0;
    if (data.expenses && data.expenses.length > 0) {
        data.expenses.forEach(expense => {
            addExpense();
            const lastExpense = document.querySelector(`#expense-${expenseCount}`);
            lastExpense.querySelector('.expense-description').value = expense.description;
            lastExpense.querySelector('.expense-amount').value = expense.amount;
            lastExpense.querySelector('.expense-period').value = expense.period;
            if (expense.date) {
                lastExpense.querySelector('.expense-date').value = expense.date;
            }
            if (expense.dayOfWeek) {
                lastExpense.querySelector('.expense-day-of-week').value = expense.dayOfWeek;
            }
            if (expense.dayOfMonth) {
                lastExpense.querySelector('.expense-day-of-month').value = expense.dayOfMonth;
            }
            // Trigger change event to show/hide date field
            lastExpense.querySelector('.expense-period').dispatchEvent(new Event('change'));
        });
    }

    // Load accounts
    document.getElementById('accounts-list').innerHTML = '';
    accountCount = 0;
    if (data.accounts && data.accounts.length > 0) {
        data.accounts.forEach(account => {
            addAccount();
            const lastAccount = document.querySelector(`#account-${accountCount}`);
            lastAccount.querySelector('.account-name').value = account.name;
            if (account.purpose) {
                lastAccount.querySelector('.account-purpose').value = account.purpose;
            }
            lastAccount.querySelector('.account-balance').value = account.balance || 0;
            if (account.target) {
                lastAccount.querySelector('.account-target').value = account.target;
            }
            lastAccount.querySelector('.account-priority').value = account.priority || 1;
            lastAccount.querySelector('.is-spending-account').checked = account.isSpendingAccount || false;
            lastAccount.querySelector('.is-expense-account').checked = account.isExpenseAccount || false;
        });
    }

    updateFormVisibility();
}

// Global variable to track current loaded budget
let currentBudgetId = null;
let autoSaveTimeout = null;
let isAutoSaving = false;

async function saveBudget(isAutoSave = false) {
    if (!currentUser) {
        if (!isAutoSave) {
            alert('Please login to save your budget');
        }
        return;
    }

    // For manual saves, require a budget name
    let budgetName = document.getElementById('budget-name').value.trim();
    if (!isAutoSave && !budgetName) {
        alert('Please enter a budget name');
        return;
    }

    // For auto-saves, use existing name or default
    if (isAutoSave) {
        if (!budgetName && !currentBudgetId) {
            budgetName = 'My Budget';
        } else if (!budgetName && currentBudgetId) {
            // Keep the existing budget name by not changing it
            budgetName = document.getElementById('budget-name').value.trim() || 'My Budget';
        }
    }

    const setAsDefault = document.getElementById('set-as-default').checked;
    const token = localStorage.getItem('budget_token');
    const budgetData = collectFormData();

    // Add budget metadata
    budgetData.budgetId = currentBudgetId;
    budgetData.budgetName = budgetName;
    budgetData.setAsDefault = setAsDefault;

    try {
        if (isAutoSave) {
            updateAutoSaveIndicator('saving');
        }

        const response = await fetch(`${API_BASE}/budget/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(budgetData)
        });

        const data = await response.json();

        if (response.ok) {
            currentBudgetId = data.budgetId;

            // Set the budget name in the input if it was auto-generated
            if (isAutoSave && !document.getElementById('budget-name').value.trim()) {
                document.getElementById('budget-name').value = budgetName;
            }

            if (isAutoSave) {
                updateAutoSaveIndicator('saved');
            } else {
                alert('Budget saved successfully!');
                refreshBudgetsList();
            }
        } else {
            if (isAutoSave) {
                updateAutoSaveIndicator('error');
            } else {
                alert(data.error || 'Failed to save budget');
            }
        }
    } catch (error) {
        if (isAutoSave) {
            updateAutoSaveIndicator('error');
        } else {
            alert('Connection error. Please try again.');
        }
    }
}

// Debounced auto-save function
function triggerAutoSave() {
    if (!currentUser) return;

    // Clear existing timeout
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
    }

    // Set new timeout for 2 seconds after last change
    autoSaveTimeout = setTimeout(() => {
        saveBudget(true);
    }, 2000);

    // Show "saving soon" indicator
    updateAutoSaveIndicator('pending');
}

// Update auto-save indicator
function updateAutoSaveIndicator(status) {
    let indicator = document.getElementById('auto-save-indicator');

    if (!indicator) {
        // Create indicator if it doesn't exist
        indicator = document.createElement('div');
        indicator.id = 'auto-save-indicator';
        indicator.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transition: all 0.3s ease;
            z-index: 1000;
        `;
        document.body.appendChild(indicator);
    }

    switch(status) {
        case 'pending':
            indicator.style.background = '#f0f0f0';
            indicator.style.color = '#666';
            indicator.textContent = '● Unsaved changes';
            indicator.style.opacity = '1';
            break;
        case 'saving':
            indicator.style.background = '#4ECDC4';
            indicator.style.color = 'white';
            indicator.textContent = '⟳ Saving...';
            indicator.style.opacity = '1';
            break;
        case 'saved':
            indicator.style.background = '#44A08D';
            indicator.style.color = 'white';
            indicator.textContent = '✓ Saved';
            indicator.style.opacity = '1';
            // Fade out after 3 seconds
            setTimeout(() => {
                indicator.style.opacity = '0';
            }, 3000);
            break;
        case 'error':
            indicator.style.background = '#e74c3c';
            indicator.style.color = 'white';
            indicator.textContent = '✗ Save failed';
            indicator.style.opacity = '1';
            setTimeout(() => {
                indicator.style.opacity = '0';
            }, 5000);
            break;
    }
}

async function refreshBudgetsList() {
    if (!currentUser) return;

    const token = localStorage.getItem('budget_token');
    const budgetsList = document.getElementById('budgets-list');

    try {
        const response = await fetch(`${API_BASE}/budgets`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok && data.budgets) {
            if (data.budgets.length === 0) {
                budgetsList.innerHTML = '<p class="text-muted">No saved budgets yet. Save your first budget above!</p>';
            } else {
                budgetsList.innerHTML = data.budgets.map(budget => `
                    <div class="budget-item" data-budget-id="${budget.id}">
                        <div class="budget-info">
                            <strong>${budget.budget_name}</strong>
                            ${budget.is_default ? '<span class="badge-default">Default</span>' : ''}
                            <small>Last updated: ${new Date(budget.updated_at).toLocaleDateString()}</small>
                        </div>
                        <div class="budget-actions">
                            <button class="btn-small btn-primary" onclick="loadBudgetById(${budget.id})">Load</button>
                            ${!budget.is_default ? `<button class="btn-small btn-secondary" onclick="setDefaultBudget(${budget.id})">Set Default</button>` : ''}
                            <button class="btn-small btn-danger" onclick="deleteBudget(${budget.id})">Delete</button>
                        </div>
                    </div>
                `).join('');
            }
        } else {
            budgetsList.innerHTML = '<p class="text-muted">Failed to load budgets</p>';
        }
    } catch (error) {
        budgetsList.innerHTML = '<p class="text-muted">Connection error. Please try again.</p>';
    }
}

async function loadBudgetById(budgetId) {
    if (!currentUser) return;

    const token = localStorage.getItem('budget_token');

    try {
        const response = await fetch(`${API_BASE}/budget/load/${budgetId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            currentBudgetId = data.budgetId;
            document.getElementById('budget-name').value = data.budgetName || '';
            document.getElementById('set-as-default').checked = data.isDefault || false;
            loadFormData(data);
            alert('Budget loaded successfully!');
        } else {
            alert(data.error || 'Failed to load budget');
        }
    } catch (error) {
        alert('Connection error. Please try again.');
    }
}

async function autoLoadDefaultBudget() {
    if (!currentUser) return;

    const token = localStorage.getItem('budget_token');

    try {
        const response = await fetch(`${API_BASE}/budget/load/`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            currentBudgetId = data.budgetId;
            document.getElementById('budget-name').value = data.budgetName || '';
            document.getElementById('set-as-default').checked = data.isDefault || false;
            loadFormData(data);
        }
        // Silently fail if no budget exists (don't show alert)
    } catch (error) {
        // Silently fail on error (user hasn't created any budgets yet)
    }
}

async function setDefaultBudget(budgetId) {
    if (!currentUser) return;

    const token = localStorage.getItem('budget_token');

    try {
        const response = await fetch(`${API_BASE}/budget/${budgetId}/set-default`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            alert('Budget set as default!');
            refreshBudgetsList();
        } else {
            alert(data.error || 'Failed to set default budget');
        }
    } catch (error) {
        alert('Connection error. Please try again.');
    }
}

async function deleteBudget(budgetId) {
    if (!currentUser) return;

    if (!confirm('Are you sure you want to delete this budget?')) {
        return;
    }

    const token = localStorage.getItem('budget_token');

    try {
        const response = await fetch(`${API_BASE}/budget/${budgetId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            if (currentBudgetId === budgetId) {
                currentBudgetId = null;
                document.getElementById('budget-name').value = '';
            }
            alert('Budget deleted successfully!');
            refreshBudgetsList();
        } else {
            alert(data.error || 'Failed to delete budget');
        }
    } catch (error) {
        alert('Connection error. Please try again.');
    }
}

// Tooltip functions for account chart
function showAccountTooltip(element, text, required, current, expenseCount) {
    const tooltip = document.getElementById('account-tooltip');
    if (!tooltip) return;

    // Parse the text and create formatted HTML
    const lines = text.split('\\n');
    let html = '<div style="font-size: 0.9em;">';

    lines.forEach(line => {
        if (line.includes('Week')) {
            html += `<div style="font-weight: bold; margin-bottom: 0.5rem; font-size: 1.1em;">${line}</div>`;
        } else if (line.includes('Required:')) {
            html += `<div style="margin: 0.25rem 0;"><strong>Required:</strong> $${required}</div>`;
        } else if (line.includes('Current:')) {
            html += `<div style="margin: 0.25rem 0;"><strong>Current Balance:</strong> $${current}</div>`;
        } else if (line.includes('Expenses next week:')) {
            html += `<div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.3);"><strong>Expenses Next Week:</strong></div>`;
        } else if (line.trim().startsWith('-')) {
            html += `<div style="margin: 0.25rem 0; padding-left: 0.5rem;">${line}</div>`;
        }
    });

    html += '</div>';
    tooltip.innerHTML = html;

    // Position tooltip
    const rect = element.getBoundingClientRect();
    const chartRect = element.closest('#account-chart').getBoundingClientRect();

    tooltip.style.display = 'block';
    tooltip.style.left = (rect.left - chartRect.left + rect.width / 2 - 100) + 'px';
    tooltip.style.top = (rect.top - chartRect.top - 10) + 'px';
    tooltip.style.transform = 'translate(0, -100%)';
}

function hideAccountTooltip() {
    const tooltip = document.getElementById('account-tooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
    }
}
