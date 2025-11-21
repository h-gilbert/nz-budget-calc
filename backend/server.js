const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3200;
const JWT_SECRET = process.env.JWT_SECRET || 'budget-calculator-secret-key';

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Health check endpoint (no authentication required)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        version: '1.0.1',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        message: 'GitHub Actions deployment successful! 🚀'
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
                    expenses = ?, accounts = ?, savings_target = ?, savings_deadline = ?,
                    invest_savings = ?, interest_rate = ?, budget_name = ?,
                    is_default = ?, model_weeks = ?, model_start_date = ?, transfer_frequency = ?,
                    weekly_surplus = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND user_id = ?
            `).run(
                payAmount, payType, hoursType, fixedHours, minHours, maxHours,
                allowanceAmount, allowanceFrequency, kiwisaver ? 1 : 0, kiwisaverRate,
                studentLoan ? 1 : 0, ietcEligible ? 1 : 0, JSON.stringify(expenses),
                JSON.stringify(accounts || []), savingsTarget, savingsDeadline, investSavings ? 1 : 0, interestRate, name,
                setAsDefault ? 1 : 0, modelWeeks || 26, modelStartDate || null, transferFrequency || 'weekly',
                weeklySurplus || 0,
                budgetId, userId
            );

            // If setting as default, unset other defaults
            if (setAsDefault) {
                db.prepare('UPDATE budget_data SET is_default = 0 WHERE user_id = ? AND id != ?')
                    .run(userId, budgetId);
            }

            res.json({ message: 'Budget updated successfully', budgetId });
        } else {
            // Create new budget
            const result = db.prepare(`
                INSERT INTO budget_data (
                    user_id, pay_amount, pay_type, hours_type,
                    fixed_hours, min_hours, max_hours, allowance_amount, allowance_frequency,
                    kiwisaver, kiwisaver_rate, student_loan, ietc_eligible, expenses, accounts,
                    savings_target, savings_deadline, invest_savings, interest_rate,
                    budget_name, is_default, model_weeks, model_start_date, transfer_frequency,
                    weekly_surplus
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                userId, payAmount, payType, hoursType,
                fixedHours, minHours, maxHours, allowanceAmount, allowanceFrequency,
                kiwisaver ? 1 : 0, kiwisaverRate, studentLoan ? 1 : 0, ietcEligible ? 1 : 0,
                JSON.stringify(expenses), JSON.stringify(accounts || []), savingsTarget, savingsDeadline,
                investSavings ? 1 : 0, interestRate, name, setAsDefault ? 1 : 0,
                modelWeeks || 26, modelStartDate || null, transferFrequency || 'weekly',
                weeklySurplus || 0
            );

            // If setting as default, unset other defaults
            if (setAsDefault) {
                db.prepare('UPDATE budget_data SET is_default = 0 WHERE user_id = ? AND id != ?')
                    .run(userId, result.lastInsertRowid);
            }

            res.json({
                message: 'Budget saved successfully',
                budgetId: result.lastInsertRowid
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

        // Parse expenses and accounts JSON
        const expenses = budgetData.expenses ? JSON.parse(budgetData.expenses) : [];
        const accounts = budgetData.accounts ? JSON.parse(budgetData.accounts) : [];

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
// ACCOUNT MANAGEMENT ENDPOINTS
// ============================================

// Create new account
app.post('/api/accounts', authenticateToken, (req, res) => {
    try {
        const { name, account_type, current_balance, target_balance, is_expense_account, starting_balance, starting_balance_date, parent_account_id, auto_allocate } = req.body;
        const userId = req.user.userId;

        if (!name) {
            return res.status(400).json({ error: 'Account name is required' });
        }

        // If parent_account_id is provided, validate it
        if (parent_account_id) {
            const parentAccount = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?')
                .get(parent_account_id, userId);

            if (!parentAccount) {
                return res.status(404).json({ error: 'Parent account not found' });
            }

            // Only expense accounts can have sub-accounts
            if (!parentAccount.is_expense_account) {
                return res.status(400).json({ error: 'Sub-accounts can only be created under expense accounts' });
            }

            // Sub-accounts automatically inherit expense account status
            // They cannot be expense accounts themselves at the top level
        }

        // If this is being set as expense account (and has no parent), unset any existing expense account
        if (is_expense_account && !parent_account_id) {
            db.prepare('UPDATE accounts SET is_expense_account = 0 WHERE user_id = ? AND is_expense_account = 1 AND parent_account_id IS NULL')
                .run(userId);
        }

        const result = db.prepare(`
            INSERT INTO accounts (user_id, name, account_type, current_balance, target_balance, is_expense_account, starting_balance, starting_balance_date, parent_account_id, auto_allocate)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            userId,
            name,
            account_type || 'checking',
            current_balance || 0,
            target_balance || null,
            (is_expense_account && !parent_account_id) ? 1 : 0,
            starting_balance !== undefined ? starting_balance : null,
            starting_balance_date || null,
            parent_account_id || null,
            auto_allocate !== undefined ? (auto_allocate ? 1 : 0) : 1
        );

        const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(result.lastInsertRowid);

        res.status(201).json({
            message: 'Account created successfully',
            account
        });
    } catch (error) {
        console.error('Create account error:', error);
        res.status(500).json({ error: 'Server error creating account' });
    }
});

// Get all accounts for user
app.get('/api/accounts', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;

        const accounts = db.prepare(`
            SELECT * FROM accounts
            WHERE user_id = ?
            ORDER BY is_expense_account DESC, parent_account_id NULLS FIRST, created_at ASC
        `).all(userId);

        // Build hierarchical structure
        const accountMap = new Map();
        const rootAccounts = [];

        // First pass: create map of all accounts
        accounts.forEach(account => {
            accountMap.set(account.id, { ...account, sub_accounts: [] });
        });

        // Second pass: build hierarchy
        accounts.forEach(account => {
            const accountWithSubs = accountMap.get(account.id);
            if (account.parent_account_id) {
                const parent = accountMap.get(account.parent_account_id);
                if (parent) {
                    parent.sub_accounts.push(accountWithSubs);
                }
            } else {
                rootAccounts.push(accountWithSubs);
            }
        });

        res.json({ accounts: rootAccounts });
    } catch (error) {
        console.error('Get accounts error:', error);
        res.status(500).json({ error: 'Server error fetching accounts' });
    }
});

// Get single account
app.get('/api/accounts/:id', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const accountId = req.params.id;

        const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?')
            .get(accountId, userId);

        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        // Get sub-accounts if any
        const subAccounts = db.prepare('SELECT * FROM accounts WHERE parent_account_id = ? AND user_id = ?')
            .all(accountId, userId);

        res.json({
            account: {
                ...account,
                sub_accounts: subAccounts
            }
        });
    } catch (error) {
        console.error('Get account error:', error);
        res.status(500).json({ error: 'Server error fetching account' });
    }
});

// Update account
app.put('/api/accounts/:id', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const accountId = req.params.id;
        const { name, account_type, current_balance, target_balance, is_expense_account, starting_balance, starting_balance_date, parent_account_id, auto_allocate } = req.body;

        // Verify account belongs to user
        const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?')
            .get(accountId, userId);

        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        // If parent_account_id is being changed, validate it
        if (parent_account_id !== undefined && parent_account_id !== account.parent_account_id) {
            if (parent_account_id !== null) {
                const parentAccount = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?')
                    .get(parent_account_id, userId);

                if (!parentAccount) {
                    return res.status(404).json({ error: 'Parent account not found' });
                }

                if (!parentAccount.is_expense_account) {
                    return res.status(400).json({ error: 'Sub-accounts can only be created under expense accounts' });
                }

                // Prevent circular references
                if (parent_account_id === accountId) {
                    return res.status(400).json({ error: 'Account cannot be its own parent' });
                }
            }
        }

        // If setting as expense account (and not a sub-account), unset others
        if (is_expense_account && (!parent_account_id && parent_account_id !== account.parent_account_id)) {
            db.prepare('UPDATE accounts SET is_expense_account = 0 WHERE user_id = ? AND id != ? AND is_expense_account = 1 AND parent_account_id IS NULL')
                .run(userId, accountId);
        }

        db.prepare(`
            UPDATE accounts
            SET name = COALESCE(?, name),
                account_type = COALESCE(?, account_type),
                current_balance = COALESCE(?, current_balance),
                target_balance = ?,
                is_expense_account = COALESCE(?, is_expense_account),
                starting_balance = ?,
                starting_balance_date = ?,
                parent_account_id = ?,
                auto_allocate = COALESCE(?, auto_allocate),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        `).run(
            name || null,
            account_type || null,
            current_balance !== undefined ? current_balance : null,
            target_balance !== undefined ? target_balance : account.target_balance,
            is_expense_account !== undefined ? (is_expense_account ? 1 : 0) : null,
            starting_balance !== undefined ? starting_balance : account.starting_balance,
            starting_balance_date !== undefined ? starting_balance_date : account.starting_balance_date,
            parent_account_id !== undefined ? parent_account_id : account.parent_account_id,
            auto_allocate !== undefined ? (auto_allocate ? 1 : 0) : null,
            accountId,
            userId
        );

        const updatedAccount = db.prepare('SELECT * FROM accounts WHERE id = ?').get(accountId);

        res.json({
            message: 'Account updated successfully',
            account: updatedAccount
        });
    } catch (error) {
        console.error('Update account error:', error);
        res.status(500).json({ error: 'Server error updating account' });
    }
});

// Delete account
app.delete('/api/accounts/:id', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const accountId = req.params.id;

        // Verify account belongs to user
        const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?')
            .get(accountId, userId);

        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        // Check if account has sub-accounts
        const subAccountCount = db.prepare('SELECT COUNT(*) as count FROM accounts WHERE parent_account_id = ?')
            .get(accountId).count;

        if (subAccountCount > 0) {
            return res.status(400).json({
                error: 'Cannot delete account with sub-accounts. Delete sub-accounts first.',
                details: { subAccountCount }
            });
        }

        // Check if account has active transactions or transfers
        const transactionCount = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE account_id = ?')
            .get(accountId).count;

        const transferCount = db.prepare(`
            SELECT COUNT(*) as count FROM transfers
            WHERE (from_account_id = ? OR to_account_id = ?) AND status != 'cancelled'
        `).get(accountId, accountId).count;

        if (transactionCount > 0 || transferCount > 0) {
            return res.status(400).json({
                error: 'Cannot delete account with existing transactions or transfers',
                details: { transactionCount, transferCount }
            });
        }

        db.prepare('DELETE FROM accounts WHERE id = ? AND user_id = ?').run(accountId, userId);

        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'Server error deleting account' });
    }
});

// Get account balance history (from transactions)
app.get('/api/accounts/:id/balance-history', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const accountId = req.params.id;
        const { days = 30 } = req.query;

        // Verify account belongs to user
        const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?')
            .get(accountId, userId);

        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        // Get transactions for the period
        const transactions = db.prepare(`
            SELECT
                transaction_date,
                amount,
                transaction_type,
                description
            FROM transactions
            WHERE account_id = ?
                AND transaction_date >= date('now', '-' || ? || ' days')
            ORDER BY transaction_date ASC, created_at ASC
        `).all(accountId, days);

        // Calculate running balance
        let balance = account.current_balance;
        const history = [];

        // Work backwards from current balance
        for (let i = transactions.length - 1; i >= 0; i--) {
            const tx = transactions[i];
            if (tx.transaction_type === 'income') {
                balance -= tx.amount;
            } else if (tx.transaction_type === 'expense') {
                balance += tx.amount;
            }
        }

        // Now build forward history
        for (const tx of transactions) {
            if (tx.transaction_type === 'income') {
                balance += tx.amount;
            } else if (tx.transaction_type === 'expense') {
                balance -= tx.amount;
            }
            history.push({
                date: tx.transaction_date,
                balance: balance,
                change: tx.amount,
                type: tx.transaction_type,
                description: tx.description
            });
        }

        res.json({
            account: {
                id: account.id,
                name: account.name,
                current_balance: account.current_balance
            },
            history
        });
    } catch (error) {
        console.error('Get balance history error:', error);
        res.status(500).json({ error: 'Server error fetching balance history' });
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

    return nextDue.toISOString().split('T')[0]; // Return YYYY-MM-DD format
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
            account_id
        } = req.body;
        const userId = req.user.userId;

        if (!description || !amount || !frequency) {
            return res.status(400).json({ error: 'Description, amount, and frequency are required' });
        }

        // Validate frequency-specific fields
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

        // Calculate next due date
        const next_due_date = calculateNextDueDate(frequency, due_day_of_week, due_day_of_month, due_date);

        const result = db.prepare(`
            INSERT INTO recurring_expenses (
                user_id, budget_id, description, amount, frequency,
                due_day_of_week, due_day_of_month, due_date, next_due_date, account_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            account_id || null
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
            is_active
        } = req.body;

        // Verify expense belongs to user
        const expense = db.prepare('SELECT * FROM recurring_expenses WHERE id = ? AND user_id = ?')
            .get(expenseId, userId);

        if (!expense) {
            return res.status(404).json({ error: 'Recurring expense not found' });
        }

        // Determine if we need to recalculate next due date
        const frequencyChanged = frequency && frequency !== expense.frequency;
        const dateFieldChanged =
            (due_day_of_week !== undefined && due_day_of_week !== expense.due_day_of_week) ||
            (due_day_of_month !== undefined && due_day_of_month !== expense.due_day_of_month) ||
            (due_date !== undefined && due_date !== expense.due_date);

        let next_due_date = expense.next_due_date;
        if (frequencyChanged || dateFieldChanged) {
            next_due_date = calculateNextDueDate(
                frequency || expense.frequency,
                due_day_of_week !== undefined ? due_day_of_week : expense.due_day_of_week,
                due_day_of_month !== undefined ? due_day_of_month : expense.due_day_of_month,
                due_date !== undefined ? due_date : expense.due_date
            );
        }

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

// Create transaction
app.post('/api/transactions', authenticateToken, (req, res) => {
    try {
        const {
            account_id,
            transaction_type,
            category,
            description,
            amount,
            transaction_date,
            recurring_expense_id
        } = req.body;
        const userId = req.user.userId;

        if (!transaction_type || !amount || !transaction_date) {
            return res.status(400).json({ error: 'Transaction type, amount, and date are required' });
        }

        if (!['income', 'expense', 'transfer'].includes(transaction_type)) {
            return res.status(400).json({ error: 'Invalid transaction type' });
        }

        // If account_id provided, verify it belongs to user
        if (account_id) {
            const account = db.prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?')
                .get(account_id, userId);
            if (!account) {
                return res.status(404).json({ error: 'Account not found' });
            }
        }

        const result = db.prepare(`
            INSERT INTO transactions (
                user_id, account_id, transaction_type, category, description,
                amount, transaction_date, recurring_expense_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            userId,
            account_id || null,
            transaction_type,
            category || null,
            description || null,
            amount,
            transaction_date,
            recurring_expense_id || null
        );

        // Update account balance if account_id provided
        if (account_id) {
            const change = transaction_type === 'income' ? amount : -amount;
            db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?')
                .run(change, account_id);
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

// Get all transactions for user
app.get('/api/transactions', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const { account_id, transaction_type, start_date, end_date, limit = 100 } = req.query;

        let query = 'SELECT * FROM transactions WHERE user_id = ?';
        const params = [userId];

        if (account_id) {
            query += ' AND account_id = ?';
            params.push(account_id);
        }

        if (transaction_type) {
            query += ' AND transaction_type = ?';
            params.push(transaction_type);
        }

        if (start_date) {
            query += ' AND transaction_date >= ?';
            params.push(start_date);
        }

        if (end_date) {
            query += ' AND transaction_date <= ?';
            params.push(end_date);
        }

        query += ' ORDER BY transaction_date DESC, created_at DESC LIMIT ?';
        params.push(parseInt(limit));

        const transactions = db.prepare(query).all(...params);

        res.json({ transactions, count: transactions.length });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Server error fetching transactions' });
    }
});

// Get transactions for a specific week
app.get('/api/transactions/weekly/:date', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const { date } = req.params; // YYYY-MM-DD format

        // Calculate week boundaries (Monday to Sunday)
        const targetDate = new Date(date);
        const dayOfWeek = targetDate.getDay();
        const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

        const weekStart = new Date(targetDate);
        weekStart.setDate(targetDate.getDate() + daysToMonday);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const start_date = weekStart.toISOString().split('T')[0];
        const end_date = weekEnd.toISOString().split('T')[0];

        const transactions = db.prepare(`
            SELECT t.*, a.name as account_name
            FROM transactions t
            LEFT JOIN accounts a ON t.account_id = a.id
            WHERE t.user_id = ?
                AND t.transaction_date >= ?
                AND t.transaction_date <= ?
            ORDER BY t.transaction_date ASC, t.created_at ASC
        `).all(userId, start_date, end_date);

        // Calculate totals
        let totalIncome = 0;
        let totalExpenses = 0;

        transactions.forEach(tx => {
            if (tx.transaction_type === 'income') {
                totalIncome += tx.amount;
            } else if (tx.transaction_type === 'expense') {
                totalExpenses += tx.amount;
            }
        });

        res.json({
            week: { start: start_date, end: end_date },
            transactions,
            summary: {
                totalIncome,
                totalExpenses,
                netCashFlow: totalIncome - totalExpenses
            }
        });
    } catch (error) {
        console.error('Get weekly transactions error:', error);
        res.status(500).json({ error: 'Server error fetching weekly transactions' });
    }
});

// Delete transaction
app.delete('/api/transactions/:id', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const transactionId = req.params.id;

        const transaction = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?')
            .get(transactionId, userId);

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Reverse account balance change
        if (transaction.account_id) {
            const change = transaction.transaction_type === 'income' ? -transaction.amount : transaction.amount;
            db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?')
                .run(change, transaction.account_id);
        }

        db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(transactionId, userId);

        res.json({ message: 'Transaction deleted successfully' });
    } catch (error) {
        console.error('Delete transaction error:', error);
        res.status(500).json({ error: 'Server error deleting transaction' });
    }
});

// ============================================
// TRANSFER ENDPOINTS
// ============================================

// Calculate required transfers for expense account
app.post('/api/transfers/calculate', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const { weeks = 16 } = req.body;

        // Get user's budget with expenses and accounts
        const budget = db.prepare(`
            SELECT * FROM budget_data
            WHERE user_id = ?
            ORDER BY updated_at DESC
            LIMIT 1
        `).get(userId);

        if (!budget) {
            return res.status(400).json({ error: 'No budget found. Please create a budget first.' });
        }

        // Parse accounts and find expense account
        const accounts = budget.accounts ? JSON.parse(budget.accounts) : [];
        const expenseAccount = accounts.find(acc => acc.isExpenseAccount === true || acc.isExpenseAccount === 1);

        if (!expenseAccount) {
            return res.status(404).json({ error: 'No expense account configured' });
        }

        // Parse expenses from JSON
        const expenses = budget.expenses ? JSON.parse(budget.expenses) : [];

        // Helper function to format date as YYYY-MM-DD in local time (not UTC)
        function formatDateLocal(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        // Helper function to get next Monday
        function getNextMonday() {
            const today = new Date();
            const dayOfWeek = today.getDay();
            let daysUntilNextMonday;
            if (dayOfWeek === 0) {
                // Sunday
                daysUntilNextMonday = 1;
            } else {
                // Monday through Saturday: go to next Monday
                daysUntilNextMonday = 8 - dayOfWeek;
            }
            const nextMonday = new Date(today);
            nextMonday.setDate(today.getDate() + daysUntilNextMonday);
            nextMonday.setHours(0, 0, 0, 0);
            return nextMonday;
        }

        // For expense accounts, always use next Monday (matches frontend behavior)
        // For other accounts, use stored date or current date
        const startingDate = getNextMonday();
        console.log('Backend - startingDate from getNextMonday():', formatDateLocal(startingDate), 'Day of week:', startingDate.getDay());

        // Normalize to Monday of the week (should already be Monday, but ensure it)
        const dayOfWeek = startingDate.getDay();
        let daysToMonday;
        if (dayOfWeek === 0) {
            // Sunday: go forward 1 day to Monday
            daysToMonday = 1;
        } else if (dayOfWeek === 1) {
            // Already Monday
            daysToMonday = 0;
        } else {
            // Tue-Sat: go back to Monday of this week
            daysToMonday = -(dayOfWeek - 1);
        }

        const firstMonday = new Date(startingDate);
        firstMonday.setDate(startingDate.getDate() + daysToMonday);
        firstMonday.setHours(0, 0, 0, 0);
        console.log('Backend - firstMonday after normalization:', formatDateLocal(firstMonday), 'Day of week:', firstMonday.getDay());

        // Calculate weekly projection
        const projection = [];
        let currentBalance = parseFloat(expenseAccount.balance) || 0;

        for (let week = 0; week < weeks; week++) {
            const weekStart = new Date(firstMonday);
            weekStart.setDate(firstMonday.getDate() + (week * 7));

            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);

            // Calculate expenses due this week
            let weeklyExpenses = 0;
            const expensesDue = [];

            expenses.forEach(exp => {
                const period = exp.period || 'weekly';
                const amount = parseFloat(exp.amount) || 0;
                const description = exp.description || 'Unnamed expense';
                let isDue = false;

                // Handle weekly expenses
                if (period === 'weekly') {
                    isDue = true;
                }
                // Handle fortnightly expenses
                else if (period === 'fortnightly' && week % 2 === 0) {
                    isDue = true;
                }
                // Handle monthly/annual expenses with specific dates
                else if ((period === 'monthly' || period === 'annual') && exp.date) {
                    const dueDate = new Date(exp.date);
                    // Check if due date falls within this week
                    if (dueDate >= weekStart && dueDate <= weekEnd) {
                        isDue = true;
                    }
                }

                if (isDue) {
                    weeklyExpenses += amount;
                    expensesDue.push({
                        name: description,
                        amount: amount,
                        frequency: period,
                        date: exp.date || null
                    });
                }
            });

            // Required balance is current expenses + next week's expenses (1 week ahead rule)
            const nextWeekExpenses = week < weeks - 1 ? weeklyExpenses : 0;
            const requiredBalance = weeklyExpenses + nextWeekExpenses;

            // Calculate transfer needed
            const deficit = requiredBalance - currentBalance;
            const transferAmount = Math.max(0, deficit);

            projection.push({
                week: week + 1,
                weekStart: formatDateLocal(weekStart),
                weekEnd: formatDateLocal(weekEnd),
                expenses: weeklyExpenses,
                expensesDue: expensesDue,
                requiredBalance,
                currentBalance,
                transferNeeded: transferAmount
            });

            // Update balance for next iteration
            currentBalance = currentBalance - weeklyExpenses + transferAmount;
        }

        res.json({
            expenseAccount: {
                id: expenseAccount.id,
                name: expenseAccount.name,
                currentBalance: expenseAccount.current_balance
            },
            projection,
            summary: {
                totalTransfersNeeded: projection.reduce((sum, week) => sum + week.transferNeeded, 0),
                averageWeeklyTransfer: projection.reduce((sum, week) => sum + week.transferNeeded, 0) / weeks
            }
        });
    } catch (error) {
        console.error('Calculate transfers error:', error);
        res.status(500).json({ error: 'Server error calculating transfers' });
    }
});

// Calculate required transfers with sub-account breakdown
app.post('/api/transfers/calculate-with-subaccounts', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const { weeks = 16 } = req.body;

        // Get expense account and its sub-accounts
        const expenseAccount = db.prepare(`
            SELECT * FROM accounts
            WHERE user_id = ? AND is_expense_account = 1 AND parent_account_id IS NULL
            LIMIT 1
        `).get(userId);

        if (!expenseAccount) {
            return res.status(404).json({ error: 'No expense account configured' });
        }

        // Get all sub-accounts
        const subAccounts = db.prepare(`
            SELECT * FROM accounts
            WHERE user_id = ? AND parent_account_id = ?
            ORDER BY name ASC
        `).all(userId, expenseAccount.id);

        // Get all recurring expenses
        const recurringExpenses = db.prepare(`
            SELECT * FROM recurring_expenses
            WHERE user_id = ? AND is_active = 1
            ORDER BY next_due_date ASC
        `).all(userId);

        // Helper function to format date
        function formatDateLocal(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        // Helper function to get next Monday
        function getNextMonday() {
            const today = new Date();
            const dayOfWeek = today.getDay();
            const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
            const nextMonday = new Date(today);
            nextMonday.setDate(today.getDate() + daysUntilNextMonday);
            nextMonday.setHours(0, 0, 0, 0);
            return nextMonday;
        }

        const firstMonday = getNextMonday();

        // Helper function to check if expense is due in a given week
        function isExpenseDueInWeek(expense, weekStart, weekEnd, weekNumber) {
            const { frequency, due_day_of_week, due_day_of_month, due_date, next_due_date } = expense;

            if (frequency === 'weekly') {
                return true;
            } else if (frequency === 'fortnightly') {
                return weekNumber % 2 === 0;
            } else if (frequency === 'monthly' && due_day_of_month) {
                // Check if this month's due day falls in this week
                for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
                    if (d.getDate() === due_day_of_month) {
                        return true;
                    }
                }
            } else if (frequency === 'annual' && due_date) {
                const dueDate = new Date(due_date);
                return dueDate >= weekStart && dueDate <= weekEnd;
            }
            return false;
        }

        // Calculate projection
        const projection = [];
        const subAccountBalances = {};

        // Initialize sub-account balances
        if (subAccounts.length > 0) {
            subAccounts.forEach(subAcc => {
                subAccountBalances[subAcc.id] = parseFloat(subAcc.current_balance) || 0;
            });
        } else {
            // If no sub-accounts, use parent expense account
            subAccountBalances[expenseAccount.id] = parseFloat(expenseAccount.current_balance) || 0;
        }

        for (let week = 0; week < weeks; week++) {
            const weekStart = new Date(firstMonday);
            weekStart.setDate(firstMonday.getDate() + (week * 7));

            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);

            // Calculate expenses by sub-account
            const subAccountExpenses = {};
            const unallocatedExpenses = [];

            // Initialize all sub-accounts with zero
            if (subAccounts.length > 0) {
                subAccounts.forEach(subAcc => {
                    subAccountExpenses[subAcc.id] = {
                        subAccountId: subAcc.id,
                        subAccountName: subAcc.name,
                        expenses: [],
                        total: 0,
                        currentBalance: subAccountBalances[subAcc.id],
                        requiredBalance: 0,
                        transferNeeded: 0
                    };
                });
            } else {
                subAccountExpenses[expenseAccount.id] = {
                    subAccountId: expenseAccount.id,
                    subAccountName: expenseAccount.name,
                    expenses: [],
                    total: 0,
                    currentBalance: subAccountBalances[expenseAccount.id],
                    requiredBalance: 0,
                    transferNeeded: 0
                };
            }

            // Group expenses by sub-account
            recurringExpenses.forEach(expense => {
                if (isExpenseDueInWeek(expense, weekStart, weekEnd, week)) {
                    const accountId = expense.account_id || expenseAccount.id;
                    const expenseData = {
                        name: expense.description,
                        amount: parseFloat(expense.amount),
                        frequency: expense.frequency
                    };

                    if (subAccountExpenses[accountId]) {
                        subAccountExpenses[accountId].expenses.push(expenseData);
                        subAccountExpenses[accountId].total += expenseData.amount;
                    } else {
                        unallocatedExpenses.push(expenseData);
                    }
                }
            });

            // Calculate required balance and transfers for each sub-account (1-week ahead rule)
            let totalWeeklyExpenses = 0;
            let totalTransferNeeded = 0;

            Object.keys(subAccountExpenses).forEach(subAccId => {
                const subAcc = subAccountExpenses[subAccId];
                const thisWeekExpenses = subAcc.total;
                const nextWeekExpenses = week < weeks - 1 ? thisWeekExpenses : 0; // Simplified: assume same expenses next week

                subAcc.requiredBalance = thisWeekExpenses + nextWeekExpenses;
                const deficit = subAcc.requiredBalance - subAcc.currentBalance;
                subAcc.transferNeeded = Math.max(0, deficit);

                totalWeeklyExpenses += thisWeekExpenses;
                totalTransferNeeded += subAcc.transferNeeded;

                // Update balance for next iteration
                subAccountBalances[subAccId] = subAcc.currentBalance - thisWeekExpenses + subAcc.transferNeeded;
            });

            projection.push({
                week: week + 1,
                weekStart: formatDateLocal(weekStart),
                weekEnd: formatDateLocal(weekEnd),
                totalExpenses: totalWeeklyExpenses,
                totalTransferNeeded,
                subAccounts: Object.values(subAccountExpenses),
                unallocatedExpenses
            });
        }

        // Calculate total balance (sum of all sub-accounts)
        const totalCurrentBalance = Object.values(subAccountBalances).reduce((sum, bal) => sum + bal, 0);

        res.json({
            expenseAccount: {
                id: expenseAccount.id,
                name: expenseAccount.name,
                currentBalance: totalCurrentBalance,
                hasSubAccounts: subAccounts.length > 0
            },
            subAccounts: subAccounts.map(sa => ({
                id: sa.id,
                name: sa.name,
                currentBalance: sa.current_balance,
                autoAllocate: sa.auto_allocate
            })),
            projection,
            summary: {
                totalTransfersNeeded: projection.reduce((sum, week) => sum + week.totalTransferNeeded, 0),
                averageWeeklyTransfer: projection.reduce((sum, week) => sum + week.totalTransferNeeded, 0) / weeks
            }
        });
    } catch (error) {
        console.error('Calculate transfers with subaccounts error:', error);
        res.status(500).json({ error: 'Server error calculating transfers' });
    }
});

// Get sub-account balance warnings
app.get('/api/accounts/subaccount-warnings', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;

        // Get expense account
        const expenseAccount = db.prepare(`
            SELECT * FROM accounts
            WHERE user_id = ? AND is_expense_account = 1 AND parent_account_id IS NULL
            LIMIT 1
        `).get(userId);

        if (!expenseAccount) {
            return res.json({ warnings: [] });
        }

        // Get all sub-accounts
        const subAccounts = db.prepare(`
            SELECT * FROM accounts
            WHERE user_id = ? AND parent_account_id = ?
            ORDER BY name ASC
        `).all(userId, expenseAccount.id);

        if (subAccounts.length === 0) {
            return res.json({ warnings: [] });
        }

        // Get upcoming expenses (next 7 days)
        const warnings = [];

        subAccounts.forEach(subAccount => {
            const balance = parseFloat(subAccount.current_balance) || 0;

            // Get expenses for this sub-account in the next week
            const upcomingExpenses = db.prepare(`
                SELECT SUM(amount) as total
                FROM recurring_expenses
                WHERE user_id = ?
                    AND account_id = ?
                    AND is_active = 1
                    AND next_due_date <= date('now', '+7 days')
            `).get(userId, subAccount.id);

            const upcomingTotal = parseFloat(upcomingExpenses?.total) || 0;

            // Determine severity
            let severity = null;
            let message = null;

            if (balance < 0) {
                severity = 'critical';
                message = `Negative balance: $${Math.abs(balance).toFixed(2)}`;
            } else if (upcomingTotal > balance) {
                severity = 'warning';
                message = `Insufficient funds: $${balance.toFixed(2)} available, $${upcomingTotal.toFixed(2)} needed`;
            } else if (upcomingTotal > 0 && balance < upcomingTotal * 1.2) {
                severity = 'info';
                message = `Low balance: $${balance.toFixed(2)} available, $${upcomingTotal.toFixed(2)} due soon`;
            }

            if (severity) {
                warnings.push({
                    subAccountId: subAccount.id,
                    subAccountName: subAccount.name,
                    currentBalance: balance,
                    upcomingExpenses: upcomingTotal,
                    severity,
                    message
                });
            }
        });

        res.json({ warnings });
    } catch (error) {
        console.error('Get subaccount warnings error:', error);
        res.status(500).json({ error: 'Server error fetching warnings' });
    }
});

// Create transfer schedule
app.post('/api/transfer-schedules', authenticateToken, (req, res) => {
    try {
        const {
            from_account_id,
            to_account_id,
            amount,
            frequency,
            day_of_week,
            start_date,
            standardization_date
        } = req.body;
        const userId = req.user.userId;

        if (!from_account_id || !to_account_id || !amount || !start_date) {
            return res.status(400).json({ error: 'From account, to account, amount, and start date are required' });
        }

        // Verify accounts belong to user
        const fromAccount = db.prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?')
            .get(from_account_id, userId);
        const toAccount = db.prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?')
            .get(to_account_id, userId);

        if (!fromAccount || !toAccount) {
            return res.status(404).json({ error: 'One or both accounts not found' });
        }

        const result = db.prepare(`
            INSERT INTO transfer_schedules (
                user_id, from_account_id, to_account_id, amount, frequency,
                day_of_week, start_date, standardization_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            userId,
            from_account_id,
            to_account_id,
            amount,
            frequency || 'weekly',
            day_of_week || null,
            start_date,
            standardization_date || null
        );

        const schedule = db.prepare('SELECT * FROM transfer_schedules WHERE id = ?').get(result.lastInsertRowid);

        res.status(201).json({
            message: 'Transfer schedule created successfully',
            schedule
        });
    } catch (error) {
        console.error('Create transfer schedule error:', error);
        res.status(500).json({ error: 'Server error creating transfer schedule' });
    }
});

// Get all transfer schedules
app.get('/api/transfer-schedules', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;

        const schedules = db.prepare(`
            SELECT ts.*,
                fa.name as from_account_name,
                ta.name as to_account_name
            FROM transfer_schedules ts
            JOIN accounts fa ON ts.from_account_id = fa.id
            JOIN accounts ta ON ts.to_account_id = ta.id
            WHERE ts.user_id = ? AND ts.is_active = 1
            ORDER BY ts.created_at DESC
        `).all(userId);

        res.json({ schedules });
    } catch (error) {
        console.error('Get transfer schedules error:', error);
        res.status(500).json({ error: 'Server error fetching transfer schedules' });
    }
});

// Generate scheduled transfers (create pending transfers based on schedules)
app.post('/api/transfers/generate', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const { weeks_ahead = 4 } = req.body;

        const schedules = db.prepare(`
            SELECT * FROM transfer_schedules
            WHERE user_id = ? AND is_active = 1
        `).all(userId);

        let generated = 0;
        const today = new Date();

        for (const schedule of schedules) {
            const startDate = new Date(schedule.start_date);

            for (let week = 0; week < weeks_ahead; week++) {
                const transferDate = new Date(today);
                transferDate.setDate(today.getDate() + (week * 7));

                if (transferDate < startDate) continue;

                // Check if transfer already exists for this date
                const existing = db.prepare(`
                    SELECT id FROM transfers
                    WHERE schedule_id = ?
                        AND scheduled_date = ?
                        AND status != 'cancelled'
                `).get(schedule.id, transferDate.toISOString().split('T')[0]);

                if (!existing) {
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
                        transferDate.toISOString().split('T')[0]
                    );
                    generated++;
                }
            }
        }

        res.json({
            message: 'Transfers generated successfully',
            generated,
            weeks_ahead
        });
    } catch (error) {
        console.error('Generate transfers error:', error);
        res.status(500).json({ error: 'Server error generating transfers' });
    }
});

// Get upcoming transfers
app.get('/api/transfers/upcoming', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const { days = 30 } = req.query;

        const transfers = db.prepare(`
            SELECT t.*,
                fa.name as from_account_name,
                ta.name as to_account_name
            FROM transfers t
            JOIN accounts fa ON t.from_account_id = fa.id
            JOIN accounts ta ON t.to_account_id = ta.id
            WHERE t.user_id = ?
                AND t.status = 'scheduled'
                AND t.scheduled_date <= date('now', '+' || ? || ' days')
            ORDER BY t.scheduled_date ASC
        `).all(userId, days);

        res.json({ transfers, days: parseInt(days) });
    } catch (error) {
        console.error('Get upcoming transfers error:', error);
        res.status(500).json({ error: 'Server error fetching upcoming transfers' });
    }
});

// Execute transfer
app.post('/api/transfers/:id/execute', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const transferId = req.params.id;

        const transfer = db.prepare('SELECT * FROM transfers WHERE id = ? AND user_id = ?')
            .get(transferId, userId);

        if (!transfer) {
            return res.status(404).json({ error: 'Transfer not found' });
        }

        if (transfer.status !== 'scheduled') {
            return res.status(400).json({ error: 'Transfer is not in scheduled status' });
        }

        // Begin transaction
        db.exec('BEGIN TRANSACTION');

        try {
            // Update account balances
            db.prepare('UPDATE accounts SET current_balance = current_balance - ? WHERE id = ?')
                .run(transfer.amount, transfer.from_account_id);

            db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?')
                .run(transfer.amount, transfer.to_account_id);

            // Mark transfer as completed
            db.prepare(`
                UPDATE transfers
                SET status = 'completed', executed_date = date('now')
                WHERE id = ?
            `).run(transferId);

            // Create transaction records
            const today = new Date().toISOString().split('T')[0];

            db.prepare(`
                INSERT INTO transactions (
                    user_id, account_id, transaction_type, description, amount, transaction_date
                ) VALUES (?, ?, 'transfer', ?, ?, ?)
            `).run(userId, transfer.from_account_id, 'Transfer out', transfer.amount, today);

            db.prepare(`
                INSERT INTO transactions (
                    user_id, account_id, transaction_type, description, amount, transaction_date
                ) VALUES (?, ?, 'transfer', ?, ?, ?)
            `).run(userId, transfer.to_account_id, 'Transfer in', transfer.amount, today);

            db.exec('COMMIT');

            const updatedTransfer = db.prepare('SELECT * FROM transfers WHERE id = ?').get(transferId);

            res.json({
                message: 'Transfer executed successfully',
                transfer: updatedTransfer
            });
        } catch (execError) {
            db.exec('ROLLBACK');
            throw execError;
        }
    } catch (error) {
        console.error('Execute transfer error:', error);
        res.status(500).json({ error: 'Server error executing transfer' });
    }
});

// Update transfer amount (dynamic adjustment)
app.put('/api/transfers/:id', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const transferId = req.params.id;
        const { amount, notes } = req.body;

        const transfer = db.prepare('SELECT * FROM transfers WHERE id = ? AND user_id = ?')
            .get(transferId, userId);

        if (!transfer) {
            return res.status(404).json({ error: 'Transfer not found' });
        }

        if (transfer.status !== 'scheduled') {
            return res.status(400).json({ error: 'Can only modify scheduled transfers' });
        }

        db.prepare(`
            UPDATE transfers
            SET amount = COALESCE(?, amount),
                notes = COALESCE(?, notes)
            WHERE id = ? AND user_id = ?
        `).run(amount || null, notes || null, transferId, userId);

        const updatedTransfer = db.prepare('SELECT * FROM transfers WHERE id = ?').get(transferId);

        res.json({
            message: 'Transfer updated successfully',
            transfer: updatedTransfer
        });
    } catch (error) {
        console.error('Update transfer error:', error);
        res.status(500).json({ error: 'Server error updating transfer' });
    }
});

// Cancel transfer
app.post('/api/transfers/:id/cancel', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const transferId = req.params.id;

        const transfer = db.prepare('SELECT * FROM transfers WHERE id = ? AND user_id = ?')
            .get(transferId, userId);

        if (!transfer) {
            return res.status(404).json({ error: 'Transfer not found' });
        }

        if (transfer.status !== 'scheduled') {
            return res.status(400).json({ error: 'Can only cancel scheduled transfers' });
        }

        db.prepare('UPDATE transfers SET status = "cancelled" WHERE id = ?').run(transferId);

        res.json({ message: 'Transfer cancelled successfully' });
    } catch (error) {
        console.error('Cancel transfer error:', error);
        res.status(500).json({ error: 'Server error cancelling transfer' });
    }
});

// ============================================
// GOAL TIMELINE ENDPOINTS
// ============================================

// Calculate goal timeline with surplus allocation
app.post('/api/goals/calculate-timeline', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const { weeklySurplus } = req.body;

        if (!weeklySurplus || weeklySurplus <= 0) {
            return res.status(400).json({ error: 'Weekly surplus must be a positive number' });
        }

        // Get user's budget
        const budget = db.prepare(`
            SELECT * FROM budget_data
            WHERE user_id = ?
            ORDER BY updated_at DESC
            LIMIT 1
        `).get(userId);

        if (!budget) {
            return res.status(400).json({ error: 'No budget found' });
        }

        // Parse accounts
        const accounts = budget.accounts ? JSON.parse(budget.accounts) : [];
        const expenseAccount = accounts.find(acc => acc.isExpenseAccount);

        if (!expenseAccount) {
            return res.status(404).json({ error: 'No expense account found' });
        }

        // Parse expenses
        const expenses = budget.expenses ? JSON.parse(budget.expenses) : [];

        // Helper function to format date
        function formatDateLocal(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        // Get next Monday
        function getNextMonday() {
            const today = new Date();
            const dayOfWeek = today.getDay();
            const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
            const nextMonday = new Date(today);
            nextMonday.setDate(today.getDate() + daysUntilNextMonday);
            nextMonday.setHours(0, 0, 0, 0);
            return nextMonday;
        }

        const startDate = getNextMonday();

        // Calculate total weekly expenses
        let weeklyExpenses = 0;
        expenses.forEach(exp => {
            const amount = parseFloat(exp.amount) || 0;
            const period = exp.period || 'weekly';

            if (period === 'weekly') weeklyExpenses += amount;
            else if (period === 'fortnightly') weeklyExpenses += amount / 2;
            else if (period === 'monthly') weeklyExpenses += amount / 4.33;
            else if (period === 'annual') weeklyExpenses += amount / 52;
        });

        // PHASE 1: Expense Account Catch-Up
        const expenseBalance = parseFloat(expenseAccount.balance) || 0;
        const equilibriumTransfer = weeklyExpenses; // This always comes from income, NOT surplus
        const weekAheadBuffer = weeklyExpenses; // 1 week ahead
        const targetBalance = equilibriumTransfer + weekAheadBuffer;

        let catchUpPhase = [];
        let currentExpenseBalance = expenseBalance;
        let equilibriumReached = false;
        let equilibriumWeek = 0;

        for (let week = 1; week <= 104; week++) {
            const weekDate = new Date(startDate);
            weekDate.setDate(startDate.getDate() + ((week - 1) * 7));

            // Calculate shortfall (how much buffer we're missing)
            const shortfall = targetBalance - currentExpenseBalance;

            // Base transfer from income (always happens)
            let transferAmount = equilibriumTransfer;
            let surplusUsed = 0;

            if (shortfall > 0 && !equilibriumReached) {
                // Use surplus to catch up the buffer
                surplusUsed = Math.min(shortfall, weeklySurplus);
                transferAmount = equilibriumTransfer + surplusUsed;
            } else {
                equilibriumReached = true;
                if (equilibriumWeek === 0) equilibriumWeek = week;
            }

            // Update balance: subtract expenses, add transfer
            currentExpenseBalance = currentExpenseBalance - weeklyExpenses + transferAmount;

            catchUpPhase.push({
                week,
                weekDate: formatDateLocal(weekDate),
                expenses: weeklyExpenses,
                transferAmount,
                surplusUsed,
                balanceAfter: currentExpenseBalance,
                isEquilibrium: equilibriumReached
            });

            if (equilibriumReached) break;
        }

        // PHASE 2: Goal Account Allocations
        const goalAccounts = accounts.filter(acc =>
            !acc.isExpenseAccount &&
            acc.target &&
            parseFloat(acc.target) > 0 &&
            parseFloat(acc.balance || 0) < parseFloat(acc.target)
        ).sort((a, b) => (a.priority || 1) - (b.priority || 1));

        let goalTimeline = [];
        let weekNum = equilibriumWeek || 1;
        const goalProgress = {};

        // Initialize goal progress tracking
        goalAccounts.forEach(acc => {
            goalProgress[acc.id] = {
                name: acc.name,
                currentBalance: parseFloat(acc.balance) || 0,
                targetBalance: parseFloat(acc.target),
                weeklyAllocation: 0,
                weeksToComplete: 0,
                completionWeek: null,
                completionDate: null,
                completed: false
            };
        });

        // After equilibrium, ENTIRE surplus is available for goals
        let remainingSurplus = weeklySurplus;

        // Check if user has enough surplus to reach goals
        const canAffordGoals = remainingSurplus > 0;

        for (let week = weekNum; week <= weekNum + 208; week++) { // Max 4 years
            const weekDate = new Date(startDate);
            weekDate.setDate(startDate.getDate() + ((week - 1) * 7));

            let weekAllocations = [];
            let weekSurplus = remainingSurplus;
            let allGoalsComplete = true;

            // Skip goal allocation if no surplus available
            if (!canAffordGoals) {
                allGoalsComplete = true;
                break;
            }

            for (const account of goalAccounts) {
                const progress = goalProgress[account.id];

                if (!progress.completed) {
                    allGoalsComplete = false;
                    const remaining = progress.targetBalance - progress.currentBalance;
                    const allocation = Math.min(remaining, Math.max(0, weekSurplus));

                    if (allocation > 0) {
                        progress.currentBalance += allocation;
                        weekSurplus -= allocation;
                    }

                    weekAllocations.push({
                        accountId: account.id,
                        accountName: account.name,
                        allocation,
                        balanceAfter: progress.currentBalance,
                        target: progress.targetBalance,
                        progressPercent: Math.round((progress.currentBalance / progress.targetBalance) * 100)
                    });

                    if (progress.currentBalance >= progress.targetBalance && !progress.completed) {
                        progress.completed = true;
                        progress.completionWeek = week;
                        progress.completionDate = formatDateLocal(weekDate);
                    }
                }
            }

            if (weekAllocations.length > 0) {
                goalTimeline.push({
                    week,
                    weekDate: formatDateLocal(weekDate),
                    allocations: weekAllocations
                });
            }

            if (allGoalsComplete) break;
        }

        // Calculate summary
        const allGoalsComplete = Object.values(goalProgress).every(p => p.completed);
        const lastCompletionWeek = Math.max(...Object.values(goalProgress)
            .filter(p => p.completionWeek)
            .map(p => p.completionWeek), 0);

        res.json({
            weeklySurplus,
            expenseAccount: {
                currentBalance: expenseBalance,
                weeklyExpenses,
                equilibriumTransfer,
                targetBalance,
                equilibriumWeek,
                equilibriumDate: equilibriumWeek ? catchUpPhase[catchUpPhase.length - 1].weekDate : null
            },
            catchUpSchedule: catchUpPhase,
            goalAccounts: Object.entries(goalProgress).map(([id, progress]) => ({
                accountId: id,
                ...progress
            })),
            goalTimeline,
            summary: {
                allGoalsComplete,
                totalWeeks: lastCompletionWeek,
                completionDate: lastCompletionWeek ? goalTimeline[goalTimeline.length - 1]?.weekDate : null,
                totalSurplusNeeded: (lastCompletionWeek - equilibriumWeek) * remainingSurplus,
                canAffordGoals,
                remainingSurplus
            }
        });
    } catch (error) {
        console.error('Calculate goal timeline error:', error);
        res.status(500).json({ error: 'Server error calculating goal timeline' });
    }
});

// Create transfer schedules from goal timeline
app.post('/api/goals/create-transfers', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const { timelineData, sourceAccountId } = req.body;

        if (!timelineData || !sourceAccountId) {
            return res.status(400).json({ error: 'Timeline data and source account required' });
        }

        const createdSchedules = [];

        // Create expense account catch-up schedule
        if (timelineData.catchUpSchedule && timelineData.catchUpSchedule.length > 0) {
            const schedule = timelineData.catchUpSchedule[0];
            const expenseAccountId = timelineData.expenseAccount.accountId;

            const result = db.prepare(`
                INSERT INTO transfer_schedules (
                    user_id, from_account_id, to_account_id, amount, frequency,
                    start_date, standardization_date, is_active, is_auto_calculated
                ) VALUES (?, ?, ?, ?, 'weekly', ?, ?, 1, 1)
            `).run(
                userId,
                sourceAccountId,
                expenseAccountId,
                timelineData.expenseAccount.equilibriumTransfer,
                schedule.weekDate,
                timelineData.expenseAccount.equilibriumDate
            );

            createdSchedules.push({
                id: result.lastInsertRowid,
                type: 'expense_catchup',
                account: 'Expense Account',
                amount: timelineData.expenseAccount.equilibriumTransfer
            });
        }

        // Create goal account schedules
        if (timelineData.goalAccounts) {
            for (const goal of timelineData.goalAccounts) {
                if (goal.weeklyAllocation > 0 && !goal.completed) {
                    const startWeek = timelineData.equilibriumWeek || 1;
                    const startDate = new Date(timelineData.catchUpSchedule[startWeek - 1]?.weekDate || new Date());

                    const result = db.prepare(`
                        INSERT INTO transfer_schedules (
                            user_id, from_account_id, to_account_id, amount, frequency,
                            start_date, is_active, is_auto_calculated
                        ) VALUES (?, ?, ?, ?, 'weekly', ?, 1, 1)
                    `).run(
                        userId,
                        sourceAccountId,
                        goal.accountId,
                        goal.weeklyAllocation,
                        startDate.toISOString().split('T')[0]
                    );

                    createdSchedules.push({
                        id: result.lastInsertRowid,
                        type: 'goal',
                        account: goal.name,
                        amount: goal.weeklyAllocation
                    });
                }
            }
        }

        res.json({
            message: 'Transfer schedules created successfully',
            schedules: createdSchedules,
            count: createdSchedules.length
        });
    } catch (error) {
        console.error('Create goal transfers error:', error);
        res.status(500).json({ error: 'Server error creating transfer schedules' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'NZ Budget Calculator API is running' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Budget Calculator API running on port ${PORT}`);
});
