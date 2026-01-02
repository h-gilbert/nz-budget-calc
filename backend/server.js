const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cron = require('node-cron');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3200;
const JWT_SECRET = process.env.JWT_SECRET || 'budget-calculator-secret-key';

// Helper: Format date as YYYY-MM-DD in local time (not UTC)
// This avoids timezone bugs where toISOString() shifts dates
function formatDateLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Health check endpoint (no authentication required)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        message: 'NZ Budget Calculator API'
    });
});

// Auth middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// Register endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Check if user already exists
        const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existingUser) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        const result = db.prepare(
            'INSERT INTO users (username, password) VALUES (?, ?)'
        ).run(username, hashedPassword);

        // Generate token
        const token = jwt.sign(
            { userId: result.lastInsertRowid, username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: { id: result.lastInsertRowid, username }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Get user
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Generate token
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, username: user.username }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// Change password endpoint
app.post('/api/change-password', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.user;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        // Get user's current password hash
        const user = db.prepare('SELECT password FROM users WHERE id = ?').get(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const passwordMatch = await bcrypt.compare(currentPassword, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, userId);

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Server error during password change' });
    }
});

// Save budget data (create or update)
app.post('/api/budget/save', authenticateToken, (req, res) => {
    try {
        const { userId } = req.user;
        const {
            budgetId,
            budgetName,
            setAsDefault,
            payAmount,
            payType,
            hoursType,
            fixedHours,
            minHours,
            maxHours,
            allowanceAmount,
            allowanceFrequency,
            kiwisaver,
            kiwisaverRate,
            studentLoan,
            ietcEligible,
            expenses,
            expenseGroups,
            accounts,
            savingsTarget,
            savingsDeadline,
            investSavings,
            interestRate,
            modelWeeks,
            modelStartDate,
            transferFrequency,
            weeklySurplus
        } = req.body;

        const name = budgetName || 'My Budget';

        // If updating existing budget
        if (budgetId) {
            db.prepare(`
                UPDATE budget_data SET
                    pay_amount = ?, pay_type = ?, hours_type = ?,
                    fixed_hours = ?, min_hours = ?, max_hours = ?,
                    allowance_amount = ?, allowance_frequency = ?,
                    kiwisaver = ?, kiwisaver_rate = ?, student_loan = ?, ietc_eligible = ?,
                    expenses = ?, expense_groups = ?, accounts = ?, savings_target = ?, savings_deadline = ?,
                    invest_savings = ?, interest_rate = ?, budget_name = ?,
                    is_default = ?, model_weeks = ?, model_start_date = ?, transfer_frequency = ?,
                    weekly_surplus = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND user_id = ?
            `).run(
                payAmount, payType, hoursType, fixedHours, minHours, maxHours,
                allowanceAmount, allowanceFrequency, kiwisaver ? 1 : 0, kiwisaverRate,
                studentLoan ? 1 : 0, ietcEligible ? 1 : 0, JSON.stringify(expenses),
                JSON.stringify(expenseGroups || []), JSON.stringify(accounts || []), savingsTarget, savingsDeadline, investSavings ? 1 : 0, interestRate, name,
                setAsDefault ? 1 : 0, modelWeeks || 26, modelStartDate || null, transferFrequency || 'weekly',
                weeklySurplus || 0,
                budgetId, userId
            );

            // If setting as default, unset other defaults
            if (setAsDefault) {
                db.prepare('UPDATE budget_data SET is_default = 0 WHERE user_id = ? AND id != ?')
                    .run(userId, budgetId);
            }

            // Sync to normalized tables
            const accountMap = syncAccountsToTable(userId, budgetId, accounts);
            syncExpensesToTable(userId, budgetId, expenses, accountMap);

            res.json({ message: 'Budget updated successfully', budgetId });
        } else {
            // Create new budget
            const result = db.prepare(`
                INSERT INTO budget_data (
                    user_id, pay_amount, pay_type, hours_type,
                    fixed_hours, min_hours, max_hours, allowance_amount, allowance_frequency,
                    kiwisaver, kiwisaver_rate, student_loan, ietc_eligible, expenses, expense_groups, accounts,
                    savings_target, savings_deadline, invest_savings, interest_rate,
                    budget_name, is_default, model_weeks, model_start_date, transfer_frequency,
                    weekly_surplus
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                userId, payAmount, payType, hoursType,
                fixedHours, minHours, maxHours, allowanceAmount, allowanceFrequency,
                kiwisaver ? 1 : 0, kiwisaverRate, studentLoan ? 1 : 0, ietcEligible ? 1 : 0,
                JSON.stringify(expenses), JSON.stringify(expenseGroups || []), JSON.stringify(accounts || []), savingsTarget, savingsDeadline,
                investSavings ? 1 : 0, interestRate, name, setAsDefault ? 1 : 0,
                modelWeeks || 26, modelStartDate || null, transferFrequency || 'weekly',
                weeklySurplus || 0
            );

            // If setting as default, unset other defaults
            if (setAsDefault) {
                db.prepare('UPDATE budget_data SET is_default = 0 WHERE user_id = ? AND id != ?')
                    .run(userId, result.lastInsertRowid);
            }

            // Sync to normalized tables
            const newBudgetId = result.lastInsertRowid;
            const accountMap = syncAccountsToTable(userId, newBudgetId, accounts);
            syncExpensesToTable(userId, newBudgetId, expenses, accountMap);

            res.json({
                message: 'Budget saved successfully',
                budgetId: newBudgetId
            });
        }
    } catch (error) {
        console.error('Save budget error:', error);
        res.status(500).json({ error: 'Server error while saving budget data' });
    }
});

// List all budgets for user
app.get('/api/budgets', authenticateToken, (req, res) => {
    try {
        const { userId } = req.user;

        const budgets = db.prepare(`
            SELECT id, budget_name, is_default, created_at, updated_at
            FROM budget_data
            WHERE user_id = ?
            ORDER BY is_default DESC, updated_at DESC
        `).all(userId);

        res.json({ budgets });
    } catch (error) {
        console.error('List budgets error:', error);
        res.status(500).json({ error: 'Server error while listing budgets' });
    }
});

// Set budget as default
app.post('/api/budget/:id/set-default', authenticateToken, (req, res) => {
    try {
        const { userId } = req.user;
        const budgetId = parseInt(req.params.id);

        // Verify budget belongs to user
        const budget = db.prepare('SELECT id FROM budget_data WHERE id = ? AND user_id = ?')
            .get(budgetId, userId);

        if (!budget) {
            return res.status(404).json({ error: 'Budget not found' });
        }

        // Unset all defaults for this user
        db.prepare('UPDATE budget_data SET is_default = 0 WHERE user_id = ?').run(userId);

        // Set this budget as default
        db.prepare('UPDATE budget_data SET is_default = 1 WHERE id = ?').run(budgetId);

        res.json({ message: 'Budget set as default' });
    } catch (error) {
        console.error('Set default error:', error);
        res.status(500).json({ error: 'Server error while setting default budget' });
    }
});

// Delete budget
app.delete('/api/budget/:id', authenticateToken, (req, res) => {
    try {
        const { userId } = req.user;
        const budgetId = parseInt(req.params.id);

        // Verify budget belongs to user
        const budget = db.prepare('SELECT id FROM budget_data WHERE id = ? AND user_id = ?')
            .get(budgetId, userId);

        if (!budget) {
            return res.status(404).json({ error: 'Budget not found' });
        }

        db.prepare('DELETE FROM budget_data WHERE id = ?').run(budgetId);

        res.json({ message: 'Budget deleted successfully' });
    } catch (error) {
        console.error('Delete budget error:', error);
        res.status(500).json({ error: 'Server error while deleting budget' });
    }
});

// Load budget data (by ID or default/most recent)
app.get('/api/budget/load/:id?', authenticateToken, (req, res) => {
    try {
        const { userId } = req.user;
        const budgetId = req.params.id ? parseInt(req.params.id) : null;

        let budgetData;

        if (budgetId) {
            // Load specific budget
            budgetData = db.prepare(`
                SELECT * FROM budget_data WHERE id = ? AND user_id = ?
            `).get(budgetId, userId);
        } else {
            // Load default budget, or most recent if no default
            budgetData = db.prepare(`
                SELECT * FROM budget_data WHERE user_id = ?
                ORDER BY is_default DESC, updated_at DESC LIMIT 1
            `).get(userId);
        }

        if (!budgetData) {
            return res.status(404).json({ error: 'No saved budget data found' });
        }

        // Parse expenses, expense groups, and accounts JSON
        const expenses = budgetData.expenses ? JSON.parse(budgetData.expenses) : [];
        const expenseGroups = budgetData.expense_groups ? JSON.parse(budgetData.expense_groups) : [];
        const accountsFromJson = budgetData.accounts ? JSON.parse(budgetData.accounts) : [];

        // Fetch live account balances from the accounts table
        const dbAccounts = db.prepare(`
            SELECT frontend_id, current_balance FROM accounts
            WHERE user_id = ? AND budget_id = ?
        `).all(userId, budgetData.id);

        // Create a map of frontend_id -> current_balance
        const balanceMap = new Map(dbAccounts.map(a => [a.frontend_id, a.current_balance]));

        // Merge live balances into the accounts from JSON
        const accounts = accountsFromJson.map(account => {
            const liveBalance = balanceMap.get(account.id);
            return {
                ...account,
                // Use live balance from DB if available, otherwise keep JSON balance
                balance: liveBalance !== undefined ? liveBalance : (account.balance || 0)
            };
        });

        res.json({
            budgetId: budgetData.id,
            budgetName: budgetData.budget_name,
            isDefault: budgetData.is_default === 1,
            payAmount: budgetData.pay_amount,
            payType: budgetData.pay_type,
            hoursType: budgetData.hours_type,
            fixedHours: budgetData.fixed_hours,
            minHours: budgetData.min_hours,
            maxHours: budgetData.max_hours,
            allowanceAmount: budgetData.allowance_amount,
            allowanceFrequency: budgetData.allowance_frequency,
            kiwisaver: budgetData.kiwisaver === 1,
            kiwisaverRate: budgetData.kiwisaver_rate,
            studentLoan: budgetData.student_loan === 1,
            ietcEligible: budgetData.ietc_eligible === 1,
            expenses,
            expenseGroups,
            accounts,
            savingsTarget: budgetData.savings_target,
            savingsDeadline: budgetData.savings_deadline,
            investSavings: budgetData.invest_savings === 1,
            interestRate: budgetData.interest_rate,
            modelWeeks: budgetData.model_weeks || 26,
            modelStartDate: budgetData.model_start_date,
            transferFrequency: budgetData.transfer_frequency || 'weekly',
            weeklySurplus: budgetData.weekly_surplus || 0
        });
    } catch (error) {
        console.error('Load budget error:', error);
        res.status(500).json({ error: 'Server error while loading budget data' });
    }
});

// Verify token endpoint
app.get('/api/verify', authenticateToken, (req, res) => {
    try {
        const { userId } = req.user;
        const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });
    } catch (error) {
        console.error('Verify token error:', error);
        res.status(500).json({ error: 'Server error during token verification' });
    }
});

// ============================================
// RECURRING EXPENSES ENDPOINTS
// ============================================

// Helper function to calculate next due date
function calculateNextDueDate(frequency, due_day_of_week, due_day_of_month, due_date) {
    const now = new Date();
    let nextDue = new Date();

    if (frequency === 'weekly') {
        // due_day_of_week: 0 (Sunday) to 6 (Saturday)
        const currentDay = now.getDay();
        const targetDay = due_day_of_week;
        let daysUntil = targetDay - currentDay;
        if (daysUntil <= 0) daysUntil += 7; // Next week
        nextDue.setDate(now.getDate() + daysUntil);
    } else if (frequency === 'fortnightly') {
        // Similar to weekly but 14 days cycle
        const currentDay = now.getDay();
        const targetDay = due_day_of_week;
        let daysUntil = targetDay - currentDay;
        if (daysUntil <= 0) daysUntil += 14;
        nextDue.setDate(now.getDate() + daysUntil);
    } else if (frequency === 'monthly') {
        // due_day_of_month: 1-31
        nextDue.setDate(due_day_of_month);
        if (nextDue <= now) {
            // Move to next month
            nextDue.setMonth(nextDue.getMonth() + 1);
        }
        // Handle month-end edge cases (e.g., Jan 31 -> Feb 28)
        if (nextDue.getDate() !== due_day_of_month) {
            // Day doesn't exist in this month, use last day
            nextDue.setDate(0); // Last day of previous month
        }
    } else if (frequency === 'annual') {
        // due_date is specific date
        nextDue = new Date(due_date);
        if (nextDue <= now) {
            // Move to next year
            nextDue.setFullYear(nextDue.getFullYear() + 1);
        }
    }

    // Format as YYYY-MM-DD in local time (not UTC)
    const year = nextDue.getFullYear();
    const month = String(nextDue.getMonth() + 1).padStart(2, '0');
    const day = String(nextDue.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ============================================
// SYNC HELPERS - Sync JSON budget data to normalized tables
// ============================================

// Sync accounts from JSON to accounts table
function syncAccountsToTable(userId, budgetId, accountsJson) {
    if (!accountsJson || !Array.isArray(accountsJson)) return new Map();

    // Get existing accounts for this budget
    const existingAccounts = db.prepare(`
        SELECT id, frontend_id FROM accounts
        WHERE user_id = ? AND budget_id = ?
    `).all(userId, budgetId);

    const existingMap = new Map(existingAccounts.map(a => [a.frontend_id, a.id]));
    const currentFrontendIds = new Set();
    const frontendToDbIdMap = new Map();

    for (const account of accountsJson) {
        if (!account.id) continue;
        currentFrontendIds.add(account.id);

        // Determine account type (default to 'expense' for backwards compatibility)
        const accountType = account.type || 'expense';
        const isSavings = accountType === 'savings';

        if (existingMap.has(account.id)) {
            // Update existing account - DO NOT overwrite current_balance
            // Balance is managed by transactions/transfers, not budget saves
            const dbId = existingMap.get(account.id);
            db.prepare(`
                UPDATE accounts SET
                    name = ?,
                    account_type = ?,
                    target_balance = ?,
                    target_date = ?,
                    savings_interest_rate = ?,
                    savings_weekly_contribution = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(
                account.name || 'Unnamed Account',
                accountType,
                isSavings ? (account.savingsGoalTarget || null) : null,
                isSavings ? (account.savingsGoalDeadline || null) : null,
                isSavings ? (account.savingsInterestRate || null) : null,
                isSavings ? (account.savingsWeeklyContribution || null) : null,
                dbId
            );
            frontendToDbIdMap.set(account.id, dbId);
        } else {
            // Insert new account
            const result = db.prepare(`
                INSERT INTO accounts (
                    user_id, budget_id, frontend_id, name, current_balance,
                    account_type, is_expense_account,
                    target_balance, target_date, savings_interest_rate, savings_weekly_contribution
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                userId,
                budgetId,
                account.id,
                account.name || 'Unnamed Account',
                account.balance || 0,
                accountType,
                isSavings ? 0 : 1,
                isSavings ? (account.savingsGoalTarget || null) : null,
                isSavings ? (account.savingsGoalDeadline || null) : null,
                isSavings ? (account.savingsInterestRate || null) : null,
                isSavings ? (account.savingsWeeklyContribution || null) : null
            );
            frontendToDbIdMap.set(account.id, result.lastInsertRowid);
        }
    }

    // Delete accounts no longer in JSON
    for (const [frontendId, dbId] of existingMap) {
        if (!currentFrontendIds.has(frontendId)) {
            db.prepare('DELETE FROM accounts WHERE id = ?').run(dbId);
        }
    }

    return frontendToDbIdMap;
}

// Sync expenses from JSON to recurring_expenses table
function syncExpensesToTable(userId, budgetId, expensesJson, accountFrontendToDbMap) {
    if (!expensesJson || !Array.isArray(expensesJson)) return;

    // Get existing expenses for this budget
    const existingExpenses = db.prepare(`
        SELECT id, frontend_id FROM recurring_expenses
        WHERE user_id = ? AND budget_id = ?
    `).all(userId, budgetId);

    const existingMap = new Map(existingExpenses.map(e => [e.frontend_id, e.id]));
    const currentFrontendIds = new Set();

    for (const expense of expensesJson) {
        if (!expense.id) continue;
        currentFrontendIds.add(expense.id);

        // Map account frontend ID to database ID
        const dbAccountId = expense.accountId ? (accountFrontendToDbMap.get(expense.accountId) || null) : null;

        // Extract expense type: 'bill' (has due dates) or 'budget' (envelope-style, no due date)
        const expense_type = expense.expenseType || 'bill';

        // Normalize frequency (frontend uses 'annual', backend expects it for calculateNextDueDate)
        let frequency = expense.period || expense.frequency || 'weekly';
        if (frequency === 'annually') frequency = 'annual';

        // Map dueDay based on frequency
        let due_day_of_week = null;
        let due_day_of_month = null;
        let due_date = null;

        if (frequency === 'weekly' || frequency === 'fortnightly') {
            due_day_of_week = expense.dueDay;
            if (frequency === 'fortnightly' && expense.dueDate) {
                due_date = expense.dueDate;
            }
        } else if (frequency === 'monthly') {
            due_day_of_month = expense.dueDay;
        } else if (frequency === 'annual') {
            due_date = expense.dueDate;
        } else if (frequency === 'one-off') {
            due_date = expense.date || expense.dueDate;
        }

        // Calculate next due date only for bill types (budget envelopes don't have due dates)
        const next_due_date = expense_type === 'bill'
            ? calculateNextDueDate(frequency, due_day_of_week, due_day_of_month, due_date)
            : null;

        // For budget types, force payment_mode to 'manual' (user logs actual spending)
        const payment_mode = expense_type === 'budget' ? 'manual' : (expense.paymentMode || 'automatic');

        if (existingMap.has(expense.id)) {
            // Update existing expense
            db.prepare(`
                UPDATE recurring_expenses SET
                    description = ?,
                    amount = ?,
                    frequency = ?,
                    due_day_of_week = ?,
                    due_day_of_month = ?,
                    due_date = ?,
                    next_due_date = ?,
                    account_id = ?,
                    payment_mode = ?,
                    expense_type = ?,
                    is_active = 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(
                expense.description || expense.name || 'Unnamed Expense',
                expense.amount || 0,
                frequency,
                due_day_of_week,
                due_day_of_month,
                due_date,
                next_due_date,
                dbAccountId,
                payment_mode,
                expense_type,
                existingMap.get(expense.id)
            );
        } else {
            // Insert new expense
            db.prepare(`
                INSERT INTO recurring_expenses (
                    user_id, budget_id, frontend_id, description, amount, frequency,
                    due_day_of_week, due_day_of_month, due_date, next_due_date,
                    account_id, payment_mode, expense_type, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            `).run(
                userId,
                budgetId,
                expense.id,
                expense.description || expense.name || 'Unnamed Expense',
                expense.amount || 0,
                frequency,
                due_day_of_week,
                due_day_of_month,
                due_date,
                next_due_date,
                dbAccountId,
                payment_mode,
                expense_type
            );
        }
    }

    // Mark removed expenses as inactive
    for (const [frontendId, dbId] of existingMap) {
        if (!currentFrontendIds.has(frontendId)) {
            db.prepare('UPDATE recurring_expenses SET is_active = 0 WHERE id = ?').run(dbId);
        }
    }
}

// Create recurring expense
app.post('/api/recurring-expenses', authenticateToken, (req, res) => {
    try {
        const {
            budget_id,
            description,
            amount,
            frequency,
            due_day_of_week,
            due_day_of_month,
            due_date,
            account_id,
            payment_mode,
            expense_type = 'bill'
        } = req.body;
        const userId = req.user.userId;

        if (!description || !amount || !frequency) {
            return res.status(400).json({ error: 'Description, amount, and frequency are required' });
        }

        // Validate frequency-specific fields only for bill types (budget envelopes don't need due dates)
        if (expense_type === 'bill') {
            if (frequency === 'weekly' || frequency === 'fortnightly') {
                if (due_day_of_week === undefined || due_day_of_week < 0 || due_day_of_week > 6) {
                    return res.status(400).json({ error: 'Valid due_day_of_week (0-6) required for weekly/fortnightly expenses' });
                }
            } else if (frequency === 'monthly') {
                if (!due_day_of_month || due_day_of_month < 1 || due_day_of_month > 31) {
                    return res.status(400).json({ error: 'Valid due_day_of_month (1-31) required for monthly expenses' });
                }
            } else if (frequency === 'annual') {
                if (!due_date) {
                    return res.status(400).json({ error: 'due_date required for annual expenses' });
                }
            }
        }

        // Calculate next due date only for bill types
        const next_due_date = expense_type === 'bill'
            ? calculateNextDueDate(frequency, due_day_of_week, due_day_of_month, due_date)
            : null;

        // For budget types, force payment_mode to 'manual'
        const final_payment_mode = expense_type === 'budget' ? 'manual' : (payment_mode || 'automatic');

        const result = db.prepare(`
            INSERT INTO recurring_expenses (
                user_id, budget_id, description, amount, frequency,
                due_day_of_week, due_day_of_month, due_date, next_due_date, account_id, payment_mode, expense_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            userId,
            budget_id || null,
            description,
            amount,
            frequency,
            due_day_of_week || null,
            due_day_of_month || null,
            due_date || null,
            next_due_date,
            account_id || null,
            final_payment_mode,
            expense_type
        );

        const expense = db.prepare('SELECT * FROM recurring_expenses WHERE id = ?').get(result.lastInsertRowid);

        res.status(201).json({
            message: 'Recurring expense created successfully',
            expense
        });
    } catch (error) {
        console.error('Create recurring expense error:', error);
        res.status(500).json({ error: 'Server error creating recurring expense' });
    }
});

// Get all recurring expenses for user
app.get('/api/recurring-expenses', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const { budget_id, is_active } = req.query;

        let query = 'SELECT * FROM recurring_expenses WHERE user_id = ?';
        const params = [userId];

        if (budget_id) {
            query += ' AND budget_id = ?';
            params.push(budget_id);
        }

        if (is_active !== undefined) {
            query += ' AND is_active = ?';
            params.push(is_active === 'true' ? 1 : 0);
        }

        query += ' ORDER BY next_due_date ASC';

        const expenses = db.prepare(query).all(...params);

        res.json({ expenses });
    } catch (error) {
        console.error('Get recurring expenses error:', error);
        res.status(500).json({ error: 'Server error fetching recurring expenses' });
    }
});

// Get upcoming recurring expenses (next N days)
app.get('/api/recurring-expenses/upcoming', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const { days = 60 } = req.query;

        const expenses = db.prepare(`
            SELECT * FROM recurring_expenses
            WHERE user_id = ?
                AND is_active = 1
                AND next_due_date <= date('now', '+' || ? || ' days')
            ORDER BY next_due_date ASC
        `).all(userId, days);

        res.json({ expenses, days: parseInt(days) });
    } catch (error) {
        console.error('Get upcoming expenses error:', error);
        res.status(500).json({ error: 'Server error fetching upcoming expenses' });
    }
});

// Get single recurring expense
app.get('/api/recurring-expenses/:id', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const expenseId = req.params.id;

        const expense = db.prepare('SELECT * FROM recurring_expenses WHERE id = ? AND user_id = ?')
            .get(expenseId, userId);

        if (!expense) {
            return res.status(404).json({ error: 'Recurring expense not found' });
        }

        res.json({ expense });
    } catch (error) {
        console.error('Get recurring expense error:', error);
        res.status(500).json({ error: 'Server error fetching recurring expense' });
    }
});

// Update recurring expense
app.put('/api/recurring-expenses/:id', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const expenseId = req.params.id;
        const {
            description,
            amount,
            frequency,
            due_day_of_week,
            due_day_of_month,
            due_date,
            account_id,
            is_active,
            payment_mode,
            expense_type
        } = req.body;

        // Verify expense belongs to user
        const expense = db.prepare('SELECT * FROM recurring_expenses WHERE id = ? AND user_id = ?')
            .get(expenseId, userId);

        if (!expense) {
            return res.status(404).json({ error: 'Recurring expense not found' });
        }

        // Determine the effective expense type
        const effectiveExpenseType = expense_type !== undefined ? expense_type : (expense.expense_type || 'bill');

        // Determine if we need to recalculate next due date (only for bill types)
        let next_due_date = expense.next_due_date;
        if (effectiveExpenseType === 'bill') {
            const frequencyChanged = frequency && frequency !== expense.frequency;
            const dateFieldChanged =
                (due_day_of_week !== undefined && due_day_of_week !== expense.due_day_of_week) ||
                (due_day_of_month !== undefined && due_day_of_month !== expense.due_day_of_month) ||
                (due_date !== undefined && due_date !== expense.due_date);
            const typeChangedToBill = expense_type === 'bill' && expense.expense_type === 'budget';

            if (frequencyChanged || dateFieldChanged || typeChangedToBill) {
                next_due_date = calculateNextDueDate(
                    frequency || expense.frequency,
                    due_day_of_week !== undefined ? due_day_of_week : expense.due_day_of_week,
                    due_day_of_month !== undefined ? due_day_of_month : expense.due_day_of_month,
                    due_date !== undefined ? due_date : expense.due_date
                );
            }
        } else {
            // Budget types don't have due dates
            next_due_date = null;
        }

        // For budget types, force payment_mode to 'manual'
        const final_payment_mode = effectiveExpenseType === 'budget' ? 'manual' : (payment_mode || null);

        db.prepare(`
            UPDATE recurring_expenses
            SET description = COALESCE(?, description),
                amount = COALESCE(?, amount),
                frequency = COALESCE(?, frequency),
                due_day_of_week = ?,
                due_day_of_month = ?,
                due_date = ?,
                next_due_date = ?,
                account_id = ?,
                is_active = COALESCE(?, is_active),
                payment_mode = COALESCE(?, payment_mode),
                expense_type = COALESCE(?, expense_type),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        `).run(
            description || null,
            amount || null,
            frequency || null,
            due_day_of_week !== undefined ? due_day_of_week : expense.due_day_of_week,
            due_day_of_month !== undefined ? due_day_of_month : expense.due_day_of_month,
            due_date !== undefined ? due_date : expense.due_date,
            next_due_date,
            account_id !== undefined ? account_id : expense.account_id,
            is_active !== undefined ? (is_active ? 1 : 0) : null,
            final_payment_mode,
            expense_type || null,
            expenseId,
            userId
        );

        const updatedExpense = db.prepare('SELECT * FROM recurring_expenses WHERE id = ?').get(expenseId);

        res.json({
            message: 'Recurring expense updated successfully',
            expense: updatedExpense
        });
    } catch (error) {
        console.error('Update recurring expense error:', error);
        res.status(500).json({ error: 'Server error updating recurring expense' });
    }
});

// Delete recurring expense
app.delete('/api/recurring-expenses/:id', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const expenseId = req.params.id;

        // Verify expense belongs to user
        const expense = db.prepare('SELECT * FROM recurring_expenses WHERE id = ? AND user_id = ?')
            .get(expenseId, userId);

        if (!expense) {
            return res.status(404).json({ error: 'Recurring expense not found' });
        }

        db.prepare('DELETE FROM recurring_expenses WHERE id = ? AND user_id = ?').run(expenseId, userId);

        res.json({ message: 'Recurring expense deleted successfully' });
    } catch (error) {
        console.error('Delete recurring expense error:', error);
        res.status(500).json({ error: 'Server error deleting recurring expense' });
    }
});

// Recalculate next due dates for all active expenses (maintenance endpoint)
app.post('/api/recurring-expenses/recalculate', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;

        const expenses = db.prepare(`
            SELECT * FROM recurring_expenses
            WHERE user_id = ? AND is_active = 1
        `).all(userId);

        let updated = 0;
        for (const expense of expenses) {
            const next_due_date = calculateNextDueDate(
                expense.frequency,
                expense.due_day_of_week,
                expense.due_day_of_month,
                expense.due_date
            );

            if (next_due_date !== expense.next_due_date) {
                db.prepare('UPDATE recurring_expenses SET next_due_date = ? WHERE id = ?')
                    .run(next_due_date, expense.id);
                updated++;
            }
        }

        res.json({
            message: 'Next due dates recalculated',
            total: expenses.length,
            updated
        });
    } catch (error) {
        console.error('Recalculate dates error:', error);
        res.status(500).json({ error: 'Server error recalculating dates' });
    }
});

// ============================================
// TRANSACTION ENDPOINTS
// ============================================

// Get all transactions with filters
app.get('/api/transactions', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const {
            from_date,
            to_date,
            account_id,
            transaction_type,
            status,
            recurring_expense_id,
            include_transfers = 'true', // Include completed transfers by default
            limit = 100,
            offset = 0
        } = req.query;

        const shouldIncludeTransfers = include_transfers === 'true' && !recurring_expense_id;
        const isTransferFilter = transaction_type === 'transfer';

        // Build transaction query with JOINs for account name and expense type
        let transactionQuery = `
            SELECT
                t.id,
                t.user_id,
                t.account_id,
                t.transaction_type,
                t.category,
                t.description,
                t.amount,
                t.transaction_date,
                t.is_recurring,
                t.recurring_expense_id,
                t.status,
                t.budget_amount,
                t.notes,
                t.created_at,
                a.name as account_name,
                re.expense_type,
                'transaction' as source_type,
                NULL as from_account_id,
                NULL as from_account_name,
                NULL as to_account_name
            FROM transactions t
            LEFT JOIN accounts a ON t.account_id = a.id
            LEFT JOIN recurring_expenses re ON t.recurring_expense_id = re.id
            WHERE t.user_id = ?
        `;
        const transactionParams = [userId];

        if (from_date) {
            transactionQuery += ' AND t.transaction_date >= ?';
            transactionParams.push(from_date);
        }
        if (to_date) {
            transactionQuery += ' AND t.transaction_date <= ?';
            transactionParams.push(to_date);
        }
        if (account_id) {
            transactionQuery += ' AND t.account_id = ?';
            transactionParams.push(account_id);
        }
        if (transaction_type && transaction_type !== 'transfer') {
            transactionQuery += ' AND t.transaction_type = ?';
            transactionParams.push(transaction_type);
        }
        if (status) {
            transactionQuery += ' AND t.status = ?';
            transactionParams.push(status);
        }
        if (recurring_expense_id) {
            transactionQuery += ' AND t.recurring_expense_id = ?';
            transactionParams.push(recurring_expense_id);
        }

        // If filtering for transfers only, exclude transactions
        if (isTransferFilter) {
            transactionQuery += ' AND 1=0'; // Return no transactions when filtering for transfers
        }

        // Build transfers query if needed
        let transfersQuery = '';
        const transferParams = [];

        if (shouldIncludeTransfers || isTransferFilter) {
            transfersQuery = `
                SELECT
                    tr.id,
                    tr.user_id,
                    tr.to_account_id as account_id,
                    'transfer' as transaction_type,
                    'Transfer' as category,
                    CASE
                        WHEN fa.name IS NOT NULL THEN fa.name || ' → ' || ta.name
                        ELSE 'Income → ' || ta.name
                    END as description,
                    tr.amount,
                    COALESCE(tr.executed_date, tr.scheduled_date) as transaction_date,
                    0 as is_recurring,
                    NULL as recurring_expense_id,
                    tr.status,
                    NULL as budget_amount,
                    tr.notes,
                    tr.created_at,
                    ta.name as account_name,
                    NULL as expense_type,
                    'transfer' as source_type,
                    tr.from_account_id,
                    fa.name as from_account_name,
                    ta.name as to_account_name
                FROM transfers tr
                LEFT JOIN accounts fa ON tr.from_account_id = fa.id
                LEFT JOIN accounts ta ON tr.to_account_id = ta.id
                WHERE tr.user_id = ? AND tr.status = 'completed'
            `;
            transferParams.push(userId);

            if (from_date) {
                transfersQuery += ' AND COALESCE(tr.executed_date, tr.scheduled_date) >= ?';
                transferParams.push(from_date);
            }
            if (to_date) {
                transfersQuery += ' AND COALESCE(tr.executed_date, tr.scheduled_date) <= ?';
                transferParams.push(to_date);
            }
            if (account_id) {
                transfersQuery += ' AND (tr.from_account_id = ? OR tr.to_account_id = ?)';
                transferParams.push(account_id, account_id);
            }
        }

        // Combine queries with UNION if including transfers
        let combinedQuery;
        let allParams;

        if (shouldIncludeTransfers || isTransferFilter) {
            // Use UNION to combine transactions and transfers
            combinedQuery = `
                SELECT * FROM (
                    ${transactionQuery}
                    UNION ALL
                    ${transfersQuery}
                ) combined
                ORDER BY transaction_date DESC, created_at DESC
                LIMIT ? OFFSET ?
            `;
            allParams = [...transactionParams, ...transferParams, parseInt(limit), parseInt(offset)];
        } else {
            combinedQuery = transactionQuery + ' ORDER BY t.transaction_date DESC, t.created_at DESC LIMIT ? OFFSET ?';
            allParams = [...transactionParams, parseInt(limit), parseInt(offset)];
        }

        const transactions = db.prepare(combinedQuery).all(...allParams);

        // Get total count for pagination
        let countQuery;
        let countParams;

        if (shouldIncludeTransfers || isTransferFilter) {
            let transactionCountQuery = `SELECT COUNT(*) as cnt FROM transactions t WHERE t.user_id = ?`;
            const transactionCountParams = [userId];

            if (from_date) { transactionCountQuery += ' AND t.transaction_date >= ?'; transactionCountParams.push(from_date); }
            if (to_date) { transactionCountQuery += ' AND t.transaction_date <= ?'; transactionCountParams.push(to_date); }
            if (account_id) { transactionCountQuery += ' AND t.account_id = ?'; transactionCountParams.push(account_id); }
            if (transaction_type && transaction_type !== 'transfer') { transactionCountQuery += ' AND t.transaction_type = ?'; transactionCountParams.push(transaction_type); }
            if (status) { transactionCountQuery += ' AND t.status = ?'; transactionCountParams.push(status); }
            if (isTransferFilter) { transactionCountQuery += ' AND 1=0'; }

            let transferCountQuery = `SELECT COUNT(*) as cnt FROM transfers tr WHERE tr.user_id = ? AND tr.status = 'completed'`;
            const transferCountParams = [userId];

            if (from_date) { transferCountQuery += ' AND COALESCE(tr.executed_date, tr.scheduled_date) >= ?'; transferCountParams.push(from_date); }
            if (to_date) { transferCountQuery += ' AND COALESCE(tr.executed_date, tr.scheduled_date) <= ?'; transferCountParams.push(to_date); }
            if (account_id) { transferCountQuery += ' AND (tr.from_account_id = ? OR tr.to_account_id = ?)'; transferCountParams.push(account_id, account_id); }

            const transactionCount = db.prepare(transactionCountQuery).get(...transactionCountParams);
            const transferCount = db.prepare(transferCountQuery).get(...transferCountParams);

            res.json({
                transactions,
                total: transactionCount.cnt + transferCount.cnt,
                limit: parseInt(limit),
                offset: parseInt(offset)
            });
            return;
        } else {
            countQuery = 'SELECT COUNT(*) as total FROM transactions WHERE user_id = ?';
            countParams = [userId];
            if (from_date) { countQuery += ' AND transaction_date >= ?'; countParams.push(from_date); }
            if (to_date) { countQuery += ' AND transaction_date <= ?'; countParams.push(to_date); }
            if (account_id) { countQuery += ' AND account_id = ?'; countParams.push(account_id); }
            if (transaction_type) { countQuery += ' AND transaction_type = ?'; countParams.push(transaction_type); }
            if (status) { countQuery += ' AND status = ?'; countParams.push(status); }
            if (recurring_expense_id) { countQuery += ' AND recurring_expense_id = ?'; countParams.push(recurring_expense_id); }
        }

        const countResult = db.prepare(countQuery).get(...countParams);

        res.json({
            transactions,
            total: countResult.total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Server error fetching transactions' });
    }
});

// Get transactions for a specific week
app.get('/api/transactions/weekly/:date', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const { date } = req.params;

        // Calculate week start (Monday) and end (Sunday)
        const targetDate = new Date(date);
        const dayOfWeek = targetDate.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday
        const weekStart = new Date(targetDate);
        weekStart.setDate(targetDate.getDate() + diff);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const startStr = formatDateLocal(weekStart);
        const endStr = formatDateLocal(weekEnd);

        const transactions = db.prepare(`
            SELECT t.*, a.name as account_name
            FROM transactions t
            LEFT JOIN accounts a ON t.account_id = a.id
            WHERE t.user_id = ?
                AND t.transaction_date >= ?
                AND t.transaction_date <= ?
            ORDER BY t.transaction_date ASC, t.created_at ASC
        `).all(userId, startStr, endStr);

        res.json({
            transactions,
            week_start: startStr,
            week_end: endStr
        });
    } catch (error) {
        console.error('Get weekly transactions error:', error);
        res.status(500).json({ error: 'Server error fetching weekly transactions' });
    }
});

// Helper: Generate all occurrences of a recurring expense within a date range
function generateExpenseOccurrences(expense, startDate, endDate) {
    const occurrences = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Start from next_due_date or calculate first occurrence
    let currentDate = new Date(expense.next_due_date);

    // If next_due_date is before start, calculate the first occurrence on/after start
    if (currentDate < start) {
        currentDate = new Date(start);

        if (expense.frequency === 'weekly' || expense.frequency === 'fortnightly') {
            // Find the next occurrence of the target day of week
            const targetDay = expense.due_day_of_week;
            if (targetDay !== null && targetDay !== undefined) {
                const currentDay = currentDate.getDay();
                let daysToAdd = targetDay - currentDay;
                if (daysToAdd < 0) daysToAdd += 7;
                currentDate.setDate(currentDate.getDate() + daysToAdd);
            }
        } else if (expense.frequency === 'monthly') {
            // Find the next occurrence of the target day of month
            const targetDayOfMonth = expense.due_day_of_month;
            if (targetDayOfMonth) {
                currentDate.setDate(targetDayOfMonth);
                if (currentDate < start) {
                    currentDate.setMonth(currentDate.getMonth() + 1);
                    currentDate.setDate(targetDayOfMonth);
                }
            }
        } else if (expense.frequency === 'annual') {
            // Use the specific due_date
            if (expense.due_date) {
                const annualDate = new Date(expense.due_date);
                currentDate = new Date(start.getFullYear(), annualDate.getMonth(), annualDate.getDate());
                if (currentDate < start) {
                    currentDate.setFullYear(currentDate.getFullYear() + 1);
                }
            }
        }
    }

    // Generate occurrences within the range
    while (currentDate <= end) {
        if (currentDate >= start) {
            occurrences.push({
                id: expense.id,
                item_type: 'expense',
                name: expense.name,
                amount: expense.amount,
                due_date: formatDateLocal(currentDate),
                payment_mode: expense.payment_mode,
                frequency: expense.frequency,
                account_name: expense.account_name,
                account_id: expense.account_id
            });
        }

        // Move to next occurrence based on frequency
        if (expense.frequency === 'weekly') {
            currentDate.setDate(currentDate.getDate() + 7);
        } else if (expense.frequency === 'fortnightly') {
            currentDate.setDate(currentDate.getDate() + 14);
        } else if (expense.frequency === 'monthly') {
            currentDate.setMonth(currentDate.getMonth() + 1);
            // Handle month-end edge cases
            if (expense.due_day_of_month) {
                const targetDay = expense.due_day_of_month;
                const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
                currentDate.setDate(Math.min(targetDay, lastDayOfMonth));
            }
        } else if (expense.frequency === 'annual') {
            currentDate.setFullYear(currentDate.getFullYear() + 1);
        } else if (expense.frequency === 'one-off') {
            break; // Only one occurrence for one-off expenses
        } else {
            break; // Unknown frequency, stop
        }
    }

    return occurrences;
}

// Get upcoming scheduled items (transfers + automatic expenses)
app.get('/api/transactions/upcoming', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const { days = 30 } = req.query;

        const endDate = new Date();
        endDate.setDate(endDate.getDate() + parseInt(days));
        const endDateStr = formatDateLocal(endDate);
        const todayStr = formatDateLocal(new Date());
        const today = new Date();

        // Get scheduled transfers
        const transfers = db.prepare(`
            SELECT
                t.id,
                'transfer' as item_type,
                t.amount,
                t.scheduled_date as due_date,
                t.status,
                t.notes,
                fa.name as from_account_name,
                ta.name as to_account_name,
                t.from_account_id,
                t.to_account_id
            FROM transfers t
            LEFT JOIN accounts fa ON t.from_account_id = fa.id
            LEFT JOIN accounts ta ON t.to_account_id = ta.id
            WHERE t.user_id = ?
                AND t.scheduled_date >= ?
                AND t.scheduled_date <= ?
                AND t.status IN ('scheduled', 'pending')
            ORDER BY t.scheduled_date ASC
        `).all(userId, todayStr, endDateStr);

        // Get all active automatic expenses (we'll generate occurrences for them)
        const expenseRecords = db.prepare(`
            SELECT
                re.id,
                re.description as name,
                re.amount,
                re.next_due_date,
                re.payment_mode,
                re.frequency,
                re.due_day_of_week,
                re.due_day_of_month,
                re.due_date,
                a.name as account_name,
                re.account_id
            FROM recurring_expenses re
            LEFT JOIN accounts a ON re.account_id = a.id
            WHERE re.user_id = ?
                AND re.is_active = 1
                AND re.payment_mode = 'automatic'
                AND (re.expense_type IS NULL OR re.expense_type = 'bill')
            ORDER BY re.next_due_date ASC
        `).all(userId);

        // Generate all expense occurrences within the date range
        const expenses = [];
        for (const expense of expenseRecords) {
            const occurrences = generateExpenseOccurrences(expense, today, endDate);
            expenses.push(...occurrences);
        }

        // Combine and sort by date
        const upcoming = [...transfers, ...expenses].sort((a, b) =>
            new Date(a.due_date) - new Date(b.due_date)
        );

        res.json({
            upcoming,
            transfers_count: transfers.length,
            expenses_count: expenses.length,
            days: parseInt(days)
        });
    } catch (error) {
        console.error('Get upcoming items error:', error);
        res.status(500).json({ error: 'Server error fetching upcoming items' });
    }
});

// Get budget vs actual summary for manual expenses
app.get('/api/transactions/budget-summary', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const {
            expense_id,
            from_date,
            to_date,
            weeks = 4
        } = req.query;

        // Default date range: last N weeks (or all time if weeks=0)
        let startDate, endDate;
        const weeksNum = parseInt(weeks);
        const isAllTime = weeksNum === 0;

        if (from_date && to_date) {
            startDate = from_date;
            endDate = to_date;
        } else {
            endDate = formatDateLocal(new Date());
            if (isAllTime) {
                // For "all time", we'll determine start date per expense from first transaction
                startDate = null;
            } else {
                const start = new Date();
                start.setDate(start.getDate() - (weeksNum * 7));
                startDate = formatDateLocal(start);
            }
        }

        // Get only budget envelopes for budget vs actual tracking
        // Bills (even manual ones) are tracked separately as they compare against fixed amounts, not weekly budgets
        let expenseQuery = `
            SELECT id, description, amount, frequency, payment_mode, expense_type
            FROM recurring_expenses
            WHERE user_id = ? AND expense_type = 'budget' AND is_active = 1
        `;
        const expenseParams = [userId];
        if (expense_id) {
            expenseQuery += ' AND id = ?';
            expenseParams.push(expense_id);
        }
        const manualExpenses = db.prepare(expenseQuery).all(...expenseParams);

        // Calculate weekly budget for each expense
        const frequencyMultipliers = {
            'weekly': 1,
            'fortnightly': 0.5,
            'monthly': 12/52,
            'annual': 1/52
        };

        const summaries = [];

        for (const expense of manualExpenses) {
            const weeklyBudget = expense.amount * (frequencyMultipliers[expense.frequency] || 1);

            // Get actual transactions for this expense
            let transactions;
            let effectiveStartDate = startDate;

            if (isAllTime) {
                // For "all time", get all transactions and use first date as start
                transactions = db.prepare(`
                    SELECT
                        SUM(amount) as total_actual,
                        COUNT(*) as transaction_count,
                        MIN(transaction_date) as first_date,
                        MAX(transaction_date) as last_date
                    FROM transactions
                    WHERE user_id = ?
                        AND recurring_expense_id = ?
                        AND transaction_date <= ?
                `).get(userId, expense.id, endDate);

                // Use first transaction date as start, or today if no transactions
                effectiveStartDate = transactions.first_date || endDate;
            } else {
                transactions = db.prepare(`
                    SELECT
                        SUM(amount) as total_actual,
                        COUNT(*) as transaction_count,
                        MIN(transaction_date) as first_date,
                        MAX(transaction_date) as last_date
                    FROM transactions
                    WHERE user_id = ?
                        AND recurring_expense_id = ?
                        AND transaction_date >= ?
                        AND transaction_date <= ?
                `).get(userId, expense.id, startDate, endDate);
            }

            // Calculate number of weeks in range
            const daysDiff = Math.ceil((new Date(endDate) - new Date(effectiveStartDate)) / (1000 * 60 * 60 * 24));
            const weeksInRange = Math.max(1, daysDiff / 7);

            const totalBudget = weeklyBudget * weeksInRange;
            const totalActual = transactions.total_actual || 0;
            const variance = totalActual - totalBudget;
            const weeklyAverage = totalActual / weeksInRange;

            summaries.push({
                expense_id: expense.id,
                expense_name: expense.description,
                frequency: expense.frequency,
                weekly_budget: Math.round(weeklyBudget * 100) / 100,
                total_budget: Math.round(totalBudget * 100) / 100,
                total_actual: Math.round(totalActual * 100) / 100,
                variance: Math.round(variance * 100) / 100,
                variance_percent: totalBudget > 0 ? Math.round((variance / totalBudget) * 100) : 0,
                weekly_average: Math.round(weeklyAverage * 100) / 100,
                transaction_count: transactions.transaction_count || 0,
                weeks_in_range: Math.round(weeksInRange * 10) / 10,
                on_track: variance <= 0
            });
        }

        res.json({
            summaries,
            date_range: { from: startDate, to: endDate },
            total_budget: summaries.reduce((sum, s) => sum + s.total_budget, 0),
            total_actual: summaries.reduce((sum, s) => sum + s.total_actual, 0),
            total_variance: summaries.reduce((sum, s) => sum + s.variance, 0)
        });
    } catch (error) {
        console.error('Get budget summary error:', error);
        res.status(500).json({ error: 'Server error fetching budget summary' });
    }
});

// Create transaction
app.post('/api/transactions', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const {
            account_id,
            transaction_type,
            category,
            description,
            amount,
            transaction_date,
            recurring_expense_id,
            budget_amount,
            notes,
            status = 'completed'
        } = req.body;

        if (!transaction_type || !amount || !transaction_date) {
            return res.status(400).json({ error: 'transaction_type, amount, and transaction_date are required' });
        }

        // Validate transaction type
        const validTypes = ['income', 'expense', 'transfer', 'withdrawal'];
        if (!validTypes.includes(transaction_type)) {
            return res.status(400).json({ error: 'Invalid transaction_type. Must be: income, expense, transfer, or withdrawal' });
        }

        // Resolve account_id: if it's a frontend ID (string like "account-1"),
        // look up the database ID from accounts.frontend_id
        let resolvedAccountId = null;
        if (account_id) {
            if (typeof account_id === 'number' || /^\d+$/.test(account_id)) {
                // It's already a numeric database ID
                resolvedAccountId = parseInt(account_id, 10);
            } else {
                // It's a frontend ID - look up the database ID
                const account = db.prepare(
                    'SELECT id FROM accounts WHERE frontend_id = ? AND user_id = ?'
                ).get(account_id, userId);
                if (account) {
                    resolvedAccountId = account.id;
                }
            }
        }

        // Resolve recurring_expense_id: if it's a frontend ID (string like "expense-123"),
        // look up the database ID from recurring_expenses.frontend_id
        let resolvedExpenseId = null;
        if (recurring_expense_id) {
            if (typeof recurring_expense_id === 'number' || /^\d+$/.test(recurring_expense_id)) {
                // It's already a numeric database ID
                resolvedExpenseId = parseInt(recurring_expense_id, 10);
            } else {
                // It's a frontend ID - look up the database ID
                const expense = db.prepare(
                    'SELECT id FROM recurring_expenses WHERE frontend_id = ? AND user_id = ?'
                ).get(recurring_expense_id, userId);
                if (expense) {
                    resolvedExpenseId = expense.id;
                }
            }
        }

        // Create transaction
        const result = db.prepare(`
            INSERT INTO transactions (
                user_id, account_id, transaction_type, category, description,
                amount, transaction_date, is_recurring, recurring_expense_id,
                status, budget_amount, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            userId,
            resolvedAccountId,
            transaction_type,
            category || null,
            description || null,
            amount,
            transaction_date,
            resolvedExpenseId ? 1 : 0,
            resolvedExpenseId,
            status,
            budget_amount || null,
            notes || null
        );

        // Update account balance if status is completed
        if (status === 'completed' && resolvedAccountId) {
            const balanceChange = transaction_type === 'income' ? amount : -amount;
            db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?')
                .run(balanceChange, resolvedAccountId);
        }

        const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid);

        res.status(201).json({
            message: 'Transaction created successfully',
            transaction
        });
    } catch (error) {
        console.error('Create transaction error:', error);
        res.status(500).json({ error: 'Server error creating transaction' });
    }
});

// Update transaction
app.put('/api/transactions/:id', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const transactionId = req.params.id;
        const { amount, description, category, notes, status } = req.body;

        // Verify transaction belongs to user
        const transaction = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?')
            .get(transactionId, userId);

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // If amount is changing and transaction is completed, adjust account balance
        if (amount !== undefined && amount !== transaction.amount && transaction.account_id) {
            const oldBalanceChange = transaction.transaction_type === 'income' ? transaction.amount : -transaction.amount;
            const newBalanceChange = transaction.transaction_type === 'income' ? amount : -amount;
            const adjustment = newBalanceChange - oldBalanceChange;
            db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?')
                .run(adjustment, transaction.account_id);
        }

        db.prepare(`
            UPDATE transactions
            SET amount = COALESCE(?, amount),
                description = COALESCE(?, description),
                category = COALESCE(?, category),
                notes = COALESCE(?, notes),
                status = COALESCE(?, status)
            WHERE id = ? AND user_id = ?
        `).run(
            amount !== undefined ? amount : null,
            description !== undefined ? description : null,
            category !== undefined ? category : null,
            notes !== undefined ? notes : null,
            status !== undefined ? status : null,
            transactionId,
            userId
        );

        const updatedTransaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(transactionId);

        res.json({
            message: 'Transaction updated successfully',
            transaction: updatedTransaction
        });
    } catch (error) {
        console.error('Update transaction error:', error);
        res.status(500).json({ error: 'Server error updating transaction' });
    }
});

// Delete transaction
app.delete('/api/transactions/:id', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const transactionId = req.params.id;

        // Verify transaction belongs to user
        const transaction = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?')
            .get(transactionId, userId);

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Reverse the balance change if transaction was completed
        if (transaction.status === 'completed' && transaction.account_id) {
            const reversal = transaction.transaction_type === 'income' ? -transaction.amount : transaction.amount;
            db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?')
                .run(reversal, transaction.account_id);
        }

        db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(transactionId, userId);

        res.json({
            message: 'Transaction deleted successfully',
            balance_reversed: transaction.status === 'completed' && transaction.account_id ? true : false
        });
    } catch (error) {
        console.error('Delete transaction error:', error);
        res.status(500).json({ error: 'Server error deleting transaction' });
    }
});

// ============================================
// INTERNAL PROCESSING FUNCTIONS (for scheduler and endpoints)
// ============================================

/**
 * Process automatic expenses for a user
 * @param {number} userId - The user ID
 * @param {string} targetDate - YYYY-MM-DD date to process
 * @param {boolean} exactDateOnly - If true, only process items due on exact date (for scheduler)
 * @returns {object} { processed: [], errors: [], skipped: number }
 */
function processAutomaticExpensesForUser(userId, targetDate, exactDateOnly = false) {
    const dateCondition = exactDateOnly ? '= ?' : '<= ?';

    // Get automatic expenses that are due (only bill types, not budget envelopes)
    const dueExpenses = db.prepare(`
        SELECT re.*, a.current_balance as account_balance
        FROM recurring_expenses re
        LEFT JOIN accounts a ON re.account_id = a.id
        WHERE re.user_id = ?
            AND re.is_active = 1
            AND re.payment_mode = 'automatic'
            AND (re.expense_type IS NULL OR re.expense_type = 'bill')
            AND re.next_due_date ${dateCondition}
    `).all(userId, targetDate);

    const processed = [];
    const errors = [];
    let skipped = 0;

    for (const expense of dueExpenses) {
        try {
            // Check if transaction already exists for this expense on this date
            const existing = db.prepare(`
                SELECT id FROM transactions
                WHERE user_id = ?
                    AND recurring_expense_id = ?
                    AND transaction_date = ?
            `).get(userId, expense.id, expense.next_due_date);

            if (existing) {
                // Already processed, just update next due date
                const next_due_date = calculateNextDueDate(
                    expense.frequency,
                    expense.due_day_of_week,
                    expense.due_day_of_month,
                    expense.due_date
                );
                db.prepare('UPDATE recurring_expenses SET next_due_date = ? WHERE id = ?')
                    .run(next_due_date, expense.id);
                skipped++;
                continue;
            }

            // Create transaction
            const result = db.prepare(`
                INSERT INTO transactions (
                    user_id, account_id, transaction_type, category, description,
                    amount, transaction_date, is_recurring, recurring_expense_id,
                    status, budget_amount
                ) VALUES (?, ?, 'expense', ?, ?, ?, ?, 1, ?, 'completed', ?)
            `).run(
                userId,
                expense.account_id,
                expense.description,
                expense.description,
                expense.amount,
                expense.next_due_date,
                expense.id,
                expense.amount
            );

            // Deduct from account
            if (expense.account_id) {
                db.prepare('UPDATE accounts SET current_balance = current_balance - ? WHERE id = ?')
                    .run(expense.amount, expense.account_id);
            }

            // Update next due date
            const next_due_date = calculateNextDueDate(
                expense.frequency,
                expense.due_day_of_week,
                expense.due_day_of_month,
                expense.due_date
            );
            db.prepare('UPDATE recurring_expenses SET next_due_date = ? WHERE id = ?')
                .run(next_due_date, expense.id);

            processed.push({
                expense_id: expense.id,
                description: expense.description,
                amount: expense.amount,
                transaction_id: result.lastInsertRowid,
                due_date: expense.next_due_date,
                next_due_date
            });
        } catch (expenseError) {
            errors.push({
                expense_id: expense.id,
                description: expense.description,
                error: expenseError.message
            });
        }
    }

    return { processed, errors, skipped };
}

/**
 * Process scheduled transfers for a user
 * @param {number} userId - The user ID
 * @param {string} targetDate - YYYY-MM-DD date to process
 * @param {boolean} exactDateOnly - If true, only process items due on exact date (for scheduler)
 * @returns {object} { processed: [], errors: [] }
 */
function processScheduledTransfersForUser(userId, targetDate, exactDateOnly = false) {
    const dateCondition = exactDateOnly ? '= ?' : '<= ?';

    // Get all due transfers
    const dueTransfers = db.prepare(`
        SELECT t.*, a.name as to_account_name, a.current_balance
        FROM transfers t
        LEFT JOIN accounts a ON t.to_account_id = a.id
        WHERE t.user_id = ?
            AND t.scheduled_date ${dateCondition}
            AND t.status = 'scheduled'
    `).all(userId, targetDate);

    const processed = [];
    const errors = [];

    for (const transfer of dueTransfers) {
        try {
            // Update transfer status
            db.prepare(`
                UPDATE transfers
                SET status = 'completed', executed_date = ?
                WHERE id = ?
            `).run(targetDate, transfer.id);

            // Update account balance (add to destination account)
            if (transfer.to_account_id) {
                db.prepare(`
                    UPDATE accounts
                    SET current_balance = current_balance + ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `).run(transfer.amount, transfer.to_account_id);
            }

            processed.push({
                transfer_id: transfer.id,
                to_account: transfer.to_account_name,
                amount: transfer.amount,
                scheduled_date: transfer.scheduled_date
            });
        } catch (transferError) {
            errors.push({
                transfer_id: transfer.id,
                error: transferError.message
            });
        }
    }

    return { processed, errors };
}

// Process due automatic expenses endpoint (uses internal function)
app.post('/api/transactions/process-due', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const todayStr = formatDateLocal(new Date());
        const { exactDateOnly = false } = req.body || {};

        const result = processAutomaticExpensesForUser(userId, todayStr, exactDateOnly);

        res.json({
            message: 'Due expenses processed',
            processed_count: result.processed.length,
            processed: result.processed,
            skipped_count: result.skipped,
            errors_count: result.errors.length,
            errors: result.errors
        });
    } catch (error) {
        console.error('Process due expenses error:', error);
        res.status(500).json({ error: 'Server error processing due expenses' });
    }
});

// ============================================
// TRANSFER SCHEDULE ENDPOINTS
// ============================================

// Helper function to generate transfer instances from schedules
function generateTransfersFromSchedules(userId, days = 30) {
    const todayStr = formatDateLocal(new Date());
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    const endDateStr = formatDateLocal(endDate);

    // Clean up future scheduled transfers before regenerating
    // This prevents duplicates when day_of_week changes
    db.prepare(`
        DELETE FROM transfers
        WHERE user_id = ? AND status = 'scheduled' AND scheduled_date > ?
    `).run(userId, todayStr);

    // Get all active schedules for user
    const schedules = db.prepare(`
        SELECT * FROM transfer_schedules
        WHERE user_id = ? AND is_active = 1
    `).all(userId);

    let created = 0;

    for (const schedule of schedules) {
        // Get day of week (0 = Sunday, 1 = Monday, etc.) - default to Monday if not set
        const targetDayOfWeek = schedule.day_of_week ?? 1;

        // Find the next occurrence of that day starting from today
        const today = new Date();
        let nextDate = new Date(today);
        const currentDayOfWeek = today.getDay();
        let daysUntilNext = targetDayOfWeek - currentDayOfWeek;
        if (daysUntilNext < 0) {
            daysUntilNext += 7;
        }
        nextDate.setDate(today.getDate() + daysUntilNext);

        // Generate transfers for each week within the range
        while (nextDate <= endDate) {
            const scheduledDateStr = formatDateLocal(nextDate);

            // Check if transfer already exists for this schedule + date
            const existing = db.prepare(`
                SELECT id FROM transfers
                WHERE user_id = ? AND schedule_id = ? AND scheduled_date = ?
            `).get(userId, schedule.id, scheduledDateStr);

            if (!existing) {
                // Create the transfer
                db.prepare(`
                    INSERT INTO transfers (
                        user_id, schedule_id, from_account_id, to_account_id,
                        amount, scheduled_date, status
                    ) VALUES (?, ?, ?, ?, ?, ?, 'scheduled')
                `).run(
                    userId,
                    schedule.id,
                    schedule.from_account_id,
                    schedule.to_account_id,
                    schedule.amount,
                    scheduledDateStr
                );
                created++;
            }

            // Move to next week
            nextDate.setDate(nextDate.getDate() + 7);
        }
    }

    return created;
}

// Sync transfer schedules from frontend recommendations
app.post('/api/transfer-schedules/sync', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const { recommendations } = req.body;

        if (!recommendations || !Array.isArray(recommendations)) {
            return res.status(400).json({ error: 'recommendations array is required' });
        }

        const todayStr = formatDateLocal(new Date());
        const dayOfWeek = 1; // Always schedule transfers for Monday

        // Get user's accounts to resolve frontend IDs to database IDs
        const userAccounts = db.prepare(`
            SELECT id, frontend_id FROM accounts WHERE user_id = ?
        `).all(userId);

        // Create a map from frontend_id to database id
        const frontendIdToDbId = {};
        for (const acc of userAccounts) {
            if (acc.frontend_id) {
                frontendIdToDbId[acc.frontend_id] = acc.id;
            }
            // Also map by database id (in case frontend sends db id directly)
            frontendIdToDbId[acc.id] = acc.id;
        }

        // Get existing active schedules
        const existingSchedules = db.prepare(`
            SELECT * FROM transfer_schedules
            WHERE user_id = ? AND is_active = 1
        `).all(userId);

        const stats = { created: 0, updated: 0, deactivated: 0, skipped: 0 };
        const processedDbAccountIds = new Set();

        // Process each recommendation
        for (const rec of recommendations) {
            if (!rec.accountId || rec.recommendedTransfer <= 0) continue;

            // Resolve frontend ID to database ID
            const dbAccountId = frontendIdToDbId[rec.accountId];
            if (!dbAccountId) {
                console.warn(`Could not resolve account ID: ${rec.accountId}`);
                stats.skipped++;
                continue;
            }

            processedDbAccountIds.add(dbAccountId);

            // Find existing schedule for this account (using database ID)
            const existing = existingSchedules.find(s => s.to_account_id === dbAccountId);

            if (existing) {
                // Update if amount changed
                if (Math.abs(existing.amount - rec.recommendedTransfer) > 0.01) {
                    db.prepare(`
                        UPDATE transfer_schedules
                        SET amount = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    `).run(rec.recommendedTransfer, existing.id);
                    stats.updated++;
                }
            } else {
                // Create new schedule with database ID
                db.prepare(`
                    INSERT INTO transfer_schedules (
                        user_id, from_account_id, to_account_id, amount,
                        frequency, day_of_week, start_date, is_active, is_auto_calculated
                    ) VALUES (?, NULL, ?, ?, 'weekly', ?, ?, 1, 1)
                `).run(userId, dbAccountId, rec.recommendedTransfer, dayOfWeek, todayStr);
                stats.created++;
            }
        }

        // Deactivate schedules for accounts no longer in recommendations
        for (const schedule of existingSchedules) {
            if (!processedDbAccountIds.has(schedule.to_account_id)) {
                db.prepare(`
                    UPDATE transfer_schedules
                    SET is_active = 0, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `).run(schedule.id);
                stats.deactivated++;
            }
        }

        // Generate transfer instances for the next 30 days
        const transfersCreated = generateTransfersFromSchedules(userId, 30);

        // Get updated schedules to return
        const updatedSchedules = db.prepare(`
            SELECT ts.*, a.name as to_account_name
            FROM transfer_schedules ts
            LEFT JOIN accounts a ON ts.to_account_id = a.id
            WHERE ts.user_id = ? AND ts.is_active = 1
        `).all(userId);

        res.json({
            message: 'Transfer schedules synced successfully',
            ...stats,
            transfers_generated: transfersCreated,
            schedules: updatedSchedules
        });
    } catch (error) {
        console.error('Sync transfer schedules error:', error);
        res.status(500).json({ error: 'Server error syncing transfer schedules' });
    }
});

// Process due transfers endpoint (uses internal function)
app.post('/api/transfers/process-due', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const todayStr = formatDateLocal(new Date());
        const { exactDateOnly = false } = req.body || {};

        const result = processScheduledTransfersForUser(userId, todayStr, exactDateOnly);

        res.json({
            message: 'Due transfers processed',
            processed_count: result.processed.length,
            processed: result.processed,
            errors_count: result.errors.length,
            errors: result.errors
        });
    } catch (error) {
        console.error('Process due transfers error:', error);
        res.status(500).json({ error: 'Server error processing due transfers' });
    }
});

// Get transfer schedules
app.get('/api/transfer-schedules', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const { active_only = 'true' } = req.query;

        let query = `
            SELECT ts.*, a.name as to_account_name
            FROM transfer_schedules ts
            LEFT JOIN accounts a ON ts.to_account_id = a.id
            WHERE ts.user_id = ?
        `;

        if (active_only === 'true') {
            query += ' AND ts.is_active = 1';
        }

        query += ' ORDER BY ts.created_at DESC';

        const schedules = db.prepare(query).all(userId);
        res.json({ schedules });
    } catch (error) {
        console.error('Get transfer schedules error:', error);
        res.status(500).json({ error: 'Server error fetching transfer schedules' });
    }
});

// ============================================
// SAVINGS PROJECTION ENDPOINT
// ============================================

// Helper function for savings projection calculation
function calculateSavingsProjection(account, weeksToProject = 52) {
    const balance = parseFloat(account.current_balance) || 0;
    const weeklyContribution = parseFloat(account.savings_weekly_contribution) || 0;
    const goalTarget = parseFloat(account.target_balance) || null;
    const interestRate = parseFloat(account.savings_interest_rate) || 0;
    const goalDeadline = account.target_date;

    const monthlyRate = interestRate / 12;
    let projectedBalance = balance;
    const projectionData = [];
    let weeksToGoal = null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let week = 0; week <= weeksToProject; week++) {
        projectedBalance += weeklyContribution;

        // Apply monthly interest (every ~4 weeks)
        if (week > 0 && week % 4 === 0 && monthlyRate > 0) {
            projectedBalance *= (1 + monthlyRate);
        }

        const weekDate = new Date(today);
        weekDate.setDate(today.getDate() + (week * 7));

        projectionData.push({
            week,
            balance: Math.round(projectedBalance * 100) / 100,
            date: formatDateLocal(weekDate)
        });

        if (goalTarget && !weeksToGoal && projectedBalance >= goalTarget) {
            weeksToGoal = week;
        }
    }

    // Calculate required weekly rate to meet deadline
    let requiredRate = null;
    let projectedGoalDate = null;

    if (goalTarget && goalDeadline) {
        const deadline = new Date(goalDeadline);
        deadline.setHours(0, 0, 0, 0);
        const weeksRemaining = Math.max(1, Math.ceil((deadline - today) / (7 * 24 * 60 * 60 * 1000)));
        const amountNeeded = goalTarget - balance;
        if (amountNeeded > 0) {
            requiredRate = Math.round((amountNeeded / weeksRemaining) * 100) / 100;
        }
    }

    if (weeksToGoal !== null) {
        const goalDate = new Date(today);
        goalDate.setDate(today.getDate() + (weeksToGoal * 7));
        projectedGoalDate = formatDateLocal(goalDate);
    }

    const progressPercent = goalTarget ? Math.round((balance / goalTarget) * 10000) / 100 : null;

    return {
        projection: projectionData,
        weeksToGoal,
        projectedGoalDate,
        projectedFinalBalance: Math.round(projectedBalance * 100) / 100,
        requiredRate,
        currentRate: weeklyContribution,
        progressPercent,
        isOnTrack: requiredRate === null || weeklyContribution >= requiredRate
    };
}

// Get savings projection for an account
app.get('/api/accounts/:id/projection', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const accountId = parseInt(req.params.id);
        const { weeks = 52 } = req.query;

        // Get account with savings fields
        const account = db.prepare(`
            SELECT * FROM accounts
            WHERE id = ? AND user_id = ? AND account_type = 'savings'
        `).get(accountId, userId);

        if (!account) {
            return res.status(404).json({ error: 'Savings account not found' });
        }

        // Calculate projection
        const projection = calculateSavingsProjection(account, parseInt(weeks));

        res.json({
            accountId: account.id,
            accountName: account.name,
            currentBalance: account.current_balance,
            goalTarget: account.target_balance,
            goalDeadline: account.target_date,
            interestRate: account.savings_interest_rate,
            weeklyContribution: account.savings_weekly_contribution,
            ...projection
        });
    } catch (error) {
        console.error('Get savings projection error:', error);
        res.status(500).json({ error: 'Server error calculating projection' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'NZ Budget Calculator API is running' });
});

// ============================================
// AUTOMATIC PAYMENT SCHEDULER
// ============================================

// Scheduler configuration
const SCHEDULER_ENABLED = process.env.AUTO_SCHEDULER_ENABLED !== 'false'; // Enabled by default
const SCHEDULER_CRON = process.env.AUTO_SCHEDULER_CRON || '0 5 * * *'; // 5:00 AM daily

/**
 * Structured logger for scheduler operations
 */
function schedulerLog(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        component: 'SCHEDULER',
        level,
        timestamp,
        message,
        ...context
    };

    if (level === 'ERROR') {
        console.error(JSON.stringify(logEntry));
    } else {
        console.log(JSON.stringify(logEntry));
    }
}

/**
 * Main scheduler job - processes all automatic payments for all users
 * @param {boolean} exactDateOnly - If true, only process items due on exact date (normal run)
 *                                  If false, process all past-due items (catch-up mode)
 */
function runScheduledPaymentProcessing(exactDateOnly = true) {
    const todayStr = formatDateLocal(new Date());
    const startedAt = new Date().toISOString();
    const isCatchup = !exactDateOnly;

    schedulerLog('INFO', `Starting scheduled payment processing${isCatchup ? ' (CATCH-UP MODE)' : ''}`, { date: todayStr });

    // Create scheduler run record
    const runRecord = db.prepare(`
        INSERT INTO scheduler_runs (run_date, started_at, status, is_catchup)
        VALUES (?, ?, 'running', ?)
    `).run(todayStr, startedAt, isCatchup ? 1 : 0);
    const runId = runRecord.lastInsertRowid;

    let totalUsersProcessed = 0;
    let totalExpensesProcessed = 0;
    let totalTransfersProcessed = 0;
    let totalTransfersGenerated = 0;
    let totalErrors = 0;
    const allErrors = [];

    try {
        // Get all users
        const users = db.prepare('SELECT id, username FROM users').all();

        schedulerLog('INFO', `Processing ${users.length} users`);

        for (const user of users) {
            try {
                // Check if user has automation enabled (create if doesn't exist)
                let automationState = db.prepare(
                    'SELECT * FROM automation_state WHERE user_id = ?'
                ).get(user.id);

                if (!automationState) {
                    db.prepare(`
                        INSERT INTO automation_state (user_id, auto_transfer_enabled, auto_expense_enabled)
                        VALUES (?, 1, 1)
                    `).run(user.id);
                    automationState = { auto_expense_enabled: 1, auto_transfer_enabled: 1 };
                }

                let userExpensesProcessed = 0;
                let userTransfersProcessed = 0;
                let userTransfersGenerated = 0;

                // Generate future transfers for this user (30 days ahead)
                if (automationState.auto_transfer_enabled) {
                    const generated = generateTransfersFromSchedules(user.id, 30);
                    userTransfersGenerated = generated;
                    totalTransfersGenerated += generated;
                }

                // Process automatic expenses if enabled
                if (automationState.auto_expense_enabled) {
                    const expenseResult = processAutomaticExpensesForUser(user.id, todayStr, exactDateOnly);
                    userExpensesProcessed = expenseResult.processed.length;
                    totalExpensesProcessed += userExpensesProcessed;

                    if (expenseResult.errors.length > 0) {
                        totalErrors += expenseResult.errors.length;
                        allErrors.push(...expenseResult.errors.map(e => ({
                            ...e,
                            userId: user.id,
                            type: 'expense'
                        })));
                    }
                }

                // Process scheduled transfers if enabled
                if (automationState.auto_transfer_enabled) {
                    const transferResult = processScheduledTransfersForUser(user.id, todayStr, exactDateOnly);
                    userTransfersProcessed = transferResult.processed.length;
                    totalTransfersProcessed += userTransfersProcessed;

                    if (transferResult.errors.length > 0) {
                        totalErrors += transferResult.errors.length;
                        allErrors.push(...transferResult.errors.map(e => ({
                            ...e,
                            userId: user.id,
                            type: 'transfer'
                        })));
                    }
                }

                // Update user's automation state
                db.prepare(`
                    UPDATE automation_state
                    SET scheduler_last_run = datetime('now'), updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ?
                `).run(user.id);

                if (userExpensesProcessed > 0 || userTransfersProcessed > 0 || userTransfersGenerated > 0) {
                    schedulerLog('INFO', `Processed user`, {
                        userId: user.id,
                        username: user.username,
                        expenses: userExpensesProcessed,
                        transfers: userTransfersProcessed,
                        transfersGenerated: userTransfersGenerated
                    });
                }

                totalUsersProcessed++;

            } catch (userError) {
                schedulerLog('ERROR', 'Failed to process user', {
                    userId: user.id,
                    username: user.username,
                    error: userError.message
                });
                totalErrors++;
                allErrors.push({
                    userId: user.id,
                    type: 'user_processing',
                    error: userError.message
                });
            }
        }

        // Update scheduler run record - success
        db.prepare(`
            UPDATE scheduler_runs
            SET completed_at = datetime('now'),
                status = 'completed',
                users_processed = ?,
                expenses_processed = ?,
                transfers_processed = ?,
                transfers_generated = ?,
                errors_count = ?,
                error_details = ?
            WHERE id = ?
        `).run(
            totalUsersProcessed,
            totalExpensesProcessed,
            totalTransfersProcessed,
            totalTransfersGenerated,
            totalErrors,
            allErrors.length > 0 ? JSON.stringify(allErrors) : null,
            runId
        );

        schedulerLog('INFO', 'Scheduled payment processing completed', {
            runId,
            isCatchup,
            usersProcessed: totalUsersProcessed,
            expensesProcessed: totalExpensesProcessed,
            transfersProcessed: totalTransfersProcessed,
            transfersGenerated: totalTransfersGenerated,
            errors: totalErrors
        });

    } catch (error) {
        // Update scheduler run record - failed
        db.prepare(`
            UPDATE scheduler_runs
            SET completed_at = datetime('now'),
                status = 'failed',
                users_processed = ?,
                expenses_processed = ?,
                transfers_processed = ?,
                transfers_generated = ?,
                errors_count = ?,
                error_details = ?
            WHERE id = ?
        `).run(
            totalUsersProcessed,
            totalExpensesProcessed,
            totalTransfersProcessed,
            totalTransfersGenerated,
            totalErrors + 1,
            JSON.stringify([...allErrors, { type: 'fatal', error: error.message }]),
            runId
        );

        schedulerLog('ERROR', 'Scheduled payment processing failed', {
            runId,
            error: error.message
        });
    }

    return {
        runId,
        usersProcessed: totalUsersProcessed,
        expensesProcessed: totalExpensesProcessed,
        transfersProcessed: totalTransfersProcessed,
        transfersGenerated: totalTransfersGenerated,
        errors: totalErrors
    };
}

/**
 * Check for missed scheduler runs and process past-due items
 */
function checkForMissedRuns() {
    try {
        const todayStr = formatDateLocal(new Date());

        // Get the most recent successful scheduler run
        const lastRun = db.prepare(`
            SELECT run_date FROM scheduler_runs
            WHERE status = 'completed'
            ORDER BY run_date DESC
            LIMIT 1
        `).get();

        if (lastRun && lastRun.run_date < todayStr) {
            schedulerLog('INFO', 'Detected missed scheduler runs, initiating catch-up', {
                lastRunDate: lastRun.run_date,
                today: todayStr
            });

            // Run in catch-up mode (process all past-due items)
            runScheduledPaymentProcessing(false);
        } else if (!lastRun) {
            // No previous runs - check if there are any past-due items (only bill types)
            const hasPastDue = db.prepare(`
                SELECT 1 FROM recurring_expenses
                WHERE is_active = 1 AND payment_mode = 'automatic'
                    AND (expense_type IS NULL OR expense_type = 'bill')
                    AND next_due_date < ?
                LIMIT 1
            `).get(todayStr);

            if (hasPastDue) {
                schedulerLog('INFO', 'No previous scheduler runs found, processing past-due items');
                runScheduledPaymentProcessing(false);
            }
        }
    } catch (error) {
        schedulerLog('ERROR', 'Error checking for missed runs', { error: error.message });
    }
}

// ============================================
// SCHEDULER ADMIN ENDPOINTS
// ============================================

// Get scheduler status and recent runs
app.get('/api/admin/scheduler/status', authenticateToken, (req, res) => {
    try {
        const recentRuns = db.prepare(`
            SELECT * FROM scheduler_runs
            ORDER BY started_at DESC
            LIMIT 10
        `).all();

        res.json({
            enabled: SCHEDULER_ENABLED,
            schedule: SCHEDULER_CRON,
            timezone: 'Pacific/Auckland',
            recentRuns: recentRuns.map(run => ({
                ...run,
                error_details: run.error_details ? JSON.parse(run.error_details) : null
            }))
        });
    } catch (error) {
        console.error('Get scheduler status error:', error);
        res.status(500).json({ error: 'Server error fetching scheduler status' });
    }
});

// Manually trigger scheduler (for testing/recovery)
app.post('/api/admin/scheduler/run', authenticateToken, (req, res) => {
    try {
        const { catchup = false } = req.body || {};

        schedulerLog('INFO', 'Manual scheduler run triggered', {
            triggeredBy: req.user.userId,
            catchupMode: catchup
        });

        // Run asynchronously so we can return immediately
        setImmediate(() => {
            runScheduledPaymentProcessing(!catchup);
        });

        res.json({
            message: 'Scheduler run triggered',
            catchupMode: catchup,
            note: 'Check /api/admin/scheduler/status for results'
        });
    } catch (error) {
        console.error('Trigger scheduler error:', error);
        res.status(500).json({ error: 'Server error triggering scheduler' });
    }
});

// Get user automation settings
app.get('/api/automation/settings', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;

        let settings = db.prepare(
            'SELECT * FROM automation_state WHERE user_id = ?'
        ).get(userId);

        if (!settings) {
            // Create default settings
            db.prepare(`
                INSERT INTO automation_state (user_id, auto_transfer_enabled, auto_expense_enabled)
                VALUES (?, 1, 1)
            `).run(userId);
            settings = {
                auto_transfer_enabled: 1,
                auto_expense_enabled: 1,
                scheduler_last_run: null
            };
        }

        res.json({
            autoExpenseEnabled: settings.auto_expense_enabled === 1,
            autoTransferEnabled: settings.auto_transfer_enabled === 1,
            lastSchedulerRun: settings.scheduler_last_run
        });
    } catch (error) {
        console.error('Get automation settings error:', error);
        res.status(500).json({ error: 'Server error fetching automation settings' });
    }
});

// Update user automation settings
app.put('/api/automation/settings', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const { autoExpenseEnabled, autoTransferEnabled } = req.body;

        // Ensure automation_state exists
        db.prepare(`
            INSERT OR IGNORE INTO automation_state (user_id) VALUES (?)
        `).run(userId);

        // Update settings
        if (autoExpenseEnabled !== undefined) {
            db.prepare(
                'UPDATE automation_state SET auto_expense_enabled = ? WHERE user_id = ?'
            ).run(autoExpenseEnabled ? 1 : 0, userId);
        }

        if (autoTransferEnabled !== undefined) {
            db.prepare(
                'UPDATE automation_state SET auto_transfer_enabled = ? WHERE user_id = ?'
            ).run(autoTransferEnabled ? 1 : 0, userId);
        }

        res.json({ message: 'Automation settings updated' });
    } catch (error) {
        console.error('Update automation settings error:', error);
        res.status(500).json({ error: 'Server error updating automation settings' });
    }
});

// ============================================
// SCHEDULER INITIALIZATION
// ============================================

// Initialize the scheduler
if (SCHEDULER_ENABLED) {
    // Validate cron expression
    if (cron.validate(SCHEDULER_CRON)) {
        cron.schedule(SCHEDULER_CRON, () => {
            runScheduledPaymentProcessing(true); // exactDateOnly = true for normal runs
        }, {
            timezone: 'Pacific/Auckland'
        });

        console.log(`[SCHEDULER] Automatic payment scheduler initialized`);
        console.log(`[SCHEDULER] Schedule: ${SCHEDULER_CRON} (Pacific/Auckland timezone)`);
        console.log(`[SCHEDULER] Next run will process payments due on that exact date only`);
    } else {
        console.error(`[SCHEDULER] Invalid cron expression: ${SCHEDULER_CRON}`);
    }
} else {
    console.log('[SCHEDULER] Automatic payment scheduler is DISABLED');
}

// Check for missed runs on startup (after a short delay to let the server fully initialize)
setTimeout(() => {
    checkForMissedRuns();
}, 5000);

// Start server
const server = app.listen(PORT, () => {
    console.log(`Budget Calculator API running on port ${PORT}`);
});

// Graceful shutdown handling
function gracefulShutdown(signal) {
    console.log(`\n[SHUTDOWN] ${signal} received, shutting down gracefully...`);

    // Stop accepting new connections
    server.close(() => {
        console.log('[SHUTDOWN] HTTP server closed');

        // Close database connection
        try {
            db.close();
            console.log('[SHUTDOWN] Database connection closed');
        } catch (err) {
            console.error('[SHUTDOWN] Error closing database:', err);
        }

        console.log('[SHUTDOWN] Graceful shutdown complete');
        process.exit(0);
    });

    // Force exit after 10 seconds if graceful shutdown fails
    setTimeout(() => {
        console.error('[SHUTDOWN] Forcing exit after timeout');
        process.exit(1);
    }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
