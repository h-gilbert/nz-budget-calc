const Database = require('better-sqlite3');
const path = require('path');

// Initialize SQLite database
// Use DATA_DIR environment variable or default to /app/data in production, current directory in development
const dataDir = process.env.DATA_DIR || (process.env.NODE_ENV === 'production' ? '/app/data' : __dirname);
const dbPath = path.join(dataDir, 'budget.db');
console.log(`Using database at: ${dbPath}`);
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
function initializeDatabase() {
    // Users table
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Budget data table
    db.exec(`
        CREATE TABLE IF NOT EXISTS budget_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            pay_amount REAL,
            pay_type TEXT,
            hours_type TEXT,
            fixed_hours REAL,
            min_hours REAL,
            max_hours REAL,
            kiwisaver BOOLEAN,
            kiwisaver_rate INTEGER,
            student_loan BOOLEAN,
            expenses TEXT,
            accounts TEXT,
            savings_target REAL,
            savings_deadline TEXT,
            invest_savings BOOLEAN,
            interest_rate REAL,
            allowance_amount REAL DEFAULT 0,
            allowance_frequency TEXT DEFAULT 'weekly',
            ietc_eligible BOOLEAN DEFAULT 0,
            budget_name TEXT DEFAULT 'My Budget',
            is_default BOOLEAN DEFAULT 0,
            model_weeks INTEGER DEFAULT 26,
            model_start_date TEXT,
            transfer_frequency TEXT DEFAULT 'weekly',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Migration: Add new columns to budget_data if they don't exist
    try {
        const tableInfo = db.prepare("PRAGMA table_info(budget_data)").all();

        if (!tableInfo.some(col => col.name === 'accounts')) {
            console.log('Adding accounts column to budget_data table...');
            db.exec(`ALTER TABLE budget_data ADD COLUMN accounts TEXT`);
            console.log('✓ accounts column added');
        }

        if (!tableInfo.some(col => col.name === 'model_weeks')) {
            console.log('Adding model_weeks column to budget_data table...');
            db.exec(`ALTER TABLE budget_data ADD COLUMN model_weeks INTEGER DEFAULT 26`);
            console.log('✓ model_weeks column added');
        }

        if (!tableInfo.some(col => col.name === 'model_start_date')) {
            console.log('Adding model_start_date column to budget_data table...');
            db.exec(`ALTER TABLE budget_data ADD COLUMN model_start_date TEXT`);
            console.log('✓ model_start_date column added');
        }

        if (!tableInfo.some(col => col.name === 'transfer_frequency')) {
            console.log('Adding transfer_frequency column to budget_data table...');
            db.exec(`ALTER TABLE budget_data ADD COLUMN transfer_frequency TEXT DEFAULT 'weekly'`);
            console.log('✓ transfer_frequency column added');
        }

        if (!tableInfo.some(col => col.name === 'expense_groups')) {
            console.log('Adding expense_groups column to budget_data table...');
            db.exec(`ALTER TABLE budget_data ADD COLUMN expense_groups TEXT`);
            console.log('✓ expense_groups column added');
        }
    } catch (error) {
        console.error('Migration error:', error);
    }

    // Accounts table
    db.exec(`
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            account_type TEXT NOT NULL DEFAULT 'checking',
            account_purpose TEXT,
            current_balance REAL DEFAULT 0,
            target_balance REAL,
            is_expense_account BOOLEAN DEFAULT 0,
            is_spending_account BOOLEAN DEFAULT 0,
            priority INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Migration: Add new account fields if they don't exist
    try {
        const accountTableInfo = db.prepare("PRAGMA table_info(accounts)").all();

        if (!accountTableInfo.some(col => col.name === 'account_purpose')) {
            console.log('Adding account_purpose column to accounts table...');
            db.exec(`ALTER TABLE accounts ADD COLUMN account_purpose TEXT`);
            console.log('✓ account_purpose column added');
        }

        if (!accountTableInfo.some(col => col.name === 'is_spending_account')) {
            console.log('Adding is_spending_account column to accounts table...');
            db.exec(`ALTER TABLE accounts ADD COLUMN is_spending_account BOOLEAN DEFAULT 0`);
            console.log('✓ is_spending_account column added');
        }

        if (!accountTableInfo.some(col => col.name === 'priority')) {
            console.log('Adding priority column to accounts table...');
            db.exec(`ALTER TABLE accounts ADD COLUMN priority INTEGER DEFAULT 1`);
            console.log('✓ priority column added');
        }

        if (!accountTableInfo.some(col => col.name === 'starting_balance')) {
            console.log('Adding starting_balance column to accounts table...');
            db.exec(`ALTER TABLE accounts ADD COLUMN starting_balance REAL`);
            console.log('✓ starting_balance column added');
        }

        if (!accountTableInfo.some(col => col.name === 'starting_balance_date')) {
            console.log('Adding starting_balance_date column to accounts table...');
            db.exec(`ALTER TABLE accounts ADD COLUMN starting_balance_date TEXT`);
            console.log('✓ starting_balance_date column added');
        }

        if (!accountTableInfo.some(col => col.name === 'parent_account_id')) {
            console.log('Adding parent_account_id column to accounts table...');
            db.exec(`ALTER TABLE accounts ADD COLUMN parent_account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE`);
            console.log('✓ parent_account_id column added');
        }

        if (!accountTableInfo.some(col => col.name === 'auto_allocate')) {
            console.log('Adding auto_allocate column to accounts table...');
            db.exec(`ALTER TABLE accounts ADD COLUMN auto_allocate BOOLEAN DEFAULT 1`);
            console.log('✓ auto_allocate column added');
        }

        if (!accountTableInfo.some(col => col.name === 'target_date')) {
            console.log('Adding target_date column to accounts table...');
            db.exec(`ALTER TABLE accounts ADD COLUMN target_date TEXT`);
            console.log('✓ target_date column added');
        }

        if (!accountTableInfo.some(col => col.name === 'goal_priority')) {
            console.log('Adding goal_priority column to accounts table...');
            db.exec(`ALTER TABLE accounts ADD COLUMN goal_priority INTEGER DEFAULT 1`);
            console.log('✓ goal_priority column added');
        }

        // Sync support columns
        if (!accountTableInfo.some(col => col.name === 'frontend_id')) {
            console.log('Adding frontend_id column to accounts table...');
            db.exec(`ALTER TABLE accounts ADD COLUMN frontend_id TEXT`);
            console.log('✓ frontend_id column added');
        }

        if (!accountTableInfo.some(col => col.name === 'budget_id')) {
            console.log('Adding budget_id column to accounts table...');
            db.exec(`ALTER TABLE accounts ADD COLUMN budget_id INTEGER REFERENCES budget_data(id) ON DELETE CASCADE`);
            console.log('✓ budget_id column added');
        }
    } catch (error) {
        console.error('Account table migration error:', error);
    }

    // Migration: Add new columns to automation_state if they don't exist
    try {
        const automationTableInfo = db.prepare("PRAGMA table_info(automation_state)").all();

        if (automationTableInfo.length > 0) {
            if (!automationTableInfo.some(col => col.name === 'auto_payment_enabled')) {
                console.log('Adding auto_payment_enabled column to automation_state table...');
                db.exec(`ALTER TABLE automation_state ADD COLUMN auto_payment_enabled BOOLEAN DEFAULT 1`);
                console.log('✓ auto_payment_enabled column added');
            }

            if (!automationTableInfo.some(col => col.name === 'last_payment_check_date')) {
                console.log('Adding last_payment_check_date column to automation_state table...');
                db.exec(`ALTER TABLE automation_state ADD COLUMN last_payment_check_date DATE`);
                console.log('✓ last_payment_check_date column added');
            }

            if (!automationTableInfo.some(col => col.name === 'scheduler_last_run')) {
                console.log('Adding scheduler_last_run column to automation_state table...');
                db.exec(`ALTER TABLE automation_state ADD COLUMN scheduler_last_run DATETIME`);
                console.log('✓ scheduler_last_run column added');
            }
        }
    } catch (error) {
        console.error('Automation state table migration error:', error);
    }

    // Recurring expenses table
    db.exec(`
        CREATE TABLE IF NOT EXISTS recurring_expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            budget_id INTEGER,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            frequency TEXT NOT NULL,
            due_day_of_week INTEGER,
            due_day_of_month INTEGER,
            due_date DATE,
            next_due_date DATE,
            account_id INTEGER,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (budget_id) REFERENCES budget_data(id) ON DELETE CASCADE,
            FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
        )
    `);

    // Migration: Add payment_mode to recurring_expenses if it doesn't exist
    try {
        const recurringExpensesInfo = db.prepare("PRAGMA table_info(recurring_expenses)").all();

        if (!recurringExpensesInfo.some(col => col.name === 'payment_mode')) {
            console.log('Adding payment_mode column to recurring_expenses table...');
            db.exec(`ALTER TABLE recurring_expenses ADD COLUMN payment_mode TEXT DEFAULT 'automatic'`);
            console.log('✓ payment_mode column added');
        }

        // Sync support column
        if (!recurringExpensesInfo.some(col => col.name === 'frontend_id')) {
            console.log('Adding frontend_id column to recurring_expenses table...');
            db.exec(`ALTER TABLE recurring_expenses ADD COLUMN frontend_id TEXT`);
            console.log('✓ frontend_id column added');
        }

        // Expense type column: 'bill' (has due dates) or 'budget' (envelope-style, no due date)
        if (!recurringExpensesInfo.some(col => col.name === 'expense_type')) {
            console.log('Adding expense_type column to recurring_expenses table...');
            db.exec(`ALTER TABLE recurring_expenses ADD COLUMN expense_type TEXT DEFAULT 'bill'`);
            console.log('✓ expense_type column added');
        }
    } catch (error) {
        console.error('Recurring expenses migration error:', error);
    }

    // Transactions table
    db.exec(`
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            account_id INTEGER,
            transaction_type TEXT NOT NULL,
            category TEXT,
            description TEXT,
            amount REAL NOT NULL,
            transaction_date DATE NOT NULL,
            is_recurring BOOLEAN DEFAULT 0,
            recurring_expense_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
            FOREIGN KEY (recurring_expense_id) REFERENCES recurring_expenses(id) ON DELETE SET NULL
        )
    `);

    // Migration: Add new columns to transactions if they don't exist
    try {
        const transactionsInfo = db.prepare("PRAGMA table_info(transactions)").all();

        if (!transactionsInfo.some(col => col.name === 'status')) {
            console.log('Adding status column to transactions table...');
            db.exec(`ALTER TABLE transactions ADD COLUMN status TEXT DEFAULT 'completed'`);
            console.log('✓ status column added');
        }

        if (!transactionsInfo.some(col => col.name === 'budget_amount')) {
            console.log('Adding budget_amount column to transactions table...');
            db.exec(`ALTER TABLE transactions ADD COLUMN budget_amount REAL`);
            console.log('✓ budget_amount column added');
        }

        if (!transactionsInfo.some(col => col.name === 'notes')) {
            console.log('Adding notes column to transactions table...');
            db.exec(`ALTER TABLE transactions ADD COLUMN notes TEXT`);
            console.log('✓ notes column added');
        }
    } catch (error) {
        console.error('Transactions table migration error:', error);
    }

    // Transfer schedules table (from_account_id is nullable - transfers may not have a source account)
    db.exec(`
        CREATE TABLE IF NOT EXISTS transfer_schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            from_account_id INTEGER,
            to_account_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            frequency TEXT NOT NULL DEFAULT 'weekly',
            day_of_week INTEGER,
            start_date DATE NOT NULL,
            standardization_date DATE,
            is_active BOOLEAN DEFAULT 1,
            is_auto_calculated BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (from_account_id) REFERENCES accounts(id) ON DELETE CASCADE,
            FOREIGN KEY (to_account_id) REFERENCES accounts(id) ON DELETE CASCADE
        )
    `);

    // Transfers table (from_account_id is nullable - transfers may not have a source account)
    db.exec(`
        CREATE TABLE IF NOT EXISTS transfers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            schedule_id INTEGER,
            from_account_id INTEGER,
            to_account_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            scheduled_date DATE NOT NULL,
            executed_date DATE,
            status TEXT DEFAULT 'scheduled',
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (schedule_id) REFERENCES transfer_schedules(id) ON DELETE SET NULL,
            FOREIGN KEY (from_account_id) REFERENCES accounts(id),
            FOREIGN KEY (to_account_id) REFERENCES accounts(id)
        )
    `);

    // Migration: Fix from_account_id constraint in transfer tables (allow NULL)
    try {
        // Check if from_account_id is NOT NULL in transfer_schedules
        const scheduleTableInfo = db.prepare("PRAGMA table_info(transfer_schedules)").all();
        const scheduleFromCol = scheduleTableInfo.find(col => col.name === 'from_account_id');

        if (scheduleFromCol && scheduleFromCol.notnull === 1) {
            // Check if table is empty before recreating
            const scheduleCount = db.prepare("SELECT COUNT(*) as count FROM transfer_schedules").get();
            if (scheduleCount.count === 0) {
                console.log('Recreating transfer_schedules table to allow NULL from_account_id...');
                db.exec(`DROP TABLE transfer_schedules`);
                db.exec(`
                    CREATE TABLE transfer_schedules (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        from_account_id INTEGER,
                        to_account_id INTEGER NOT NULL,
                        amount REAL NOT NULL,
                        frequency TEXT NOT NULL DEFAULT 'weekly',
                        day_of_week INTEGER,
                        start_date DATE NOT NULL,
                        standardization_date DATE,
                        is_active BOOLEAN DEFAULT 1,
                        is_auto_calculated BOOLEAN DEFAULT 1,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (from_account_id) REFERENCES accounts(id) ON DELETE CASCADE,
                        FOREIGN KEY (to_account_id) REFERENCES accounts(id) ON DELETE CASCADE
                    )
                `);
                console.log('✓ transfer_schedules table recreated');
            }
        }

        // Check if from_account_id is NOT NULL in transfers
        const transferTableInfo = db.prepare("PRAGMA table_info(transfers)").all();
        const transferFromCol = transferTableInfo.find(col => col.name === 'from_account_id');

        if (transferFromCol && transferFromCol.notnull === 1) {
            // Check if table is empty before recreating
            const transferCount = db.prepare("SELECT COUNT(*) as count FROM transfers").get();
            if (transferCount.count === 0) {
                console.log('Recreating transfers table to allow NULL from_account_id...');
                db.exec(`DROP TABLE transfers`);
                db.exec(`
                    CREATE TABLE transfers (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        schedule_id INTEGER,
                        from_account_id INTEGER,
                        to_account_id INTEGER NOT NULL,
                        amount REAL NOT NULL,
                        scheduled_date DATE NOT NULL,
                        executed_date DATE,
                        status TEXT DEFAULT 'scheduled',
                        notes TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (schedule_id) REFERENCES transfer_schedules(id) ON DELETE SET NULL,
                        FOREIGN KEY (from_account_id) REFERENCES accounts(id),
                        FOREIGN KEY (to_account_id) REFERENCES accounts(id)
                    )
                `);
                console.log('✓ transfers table recreated');
            }
        }
    } catch (error) {
        console.error('Transfer tables migration error:', error);
    }

    // Automation state table - tracks when automations were last processed
    db.exec(`
        CREATE TABLE IF NOT EXISTS automation_state (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            last_transfer_date DATE,
            last_expense_check_date DATE,
            auto_transfer_enabled BOOLEAN DEFAULT 1,
            auto_expense_enabled BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Payment history table - tracks all expense payments (automatic and manual)
    db.exec(`
        CREATE TABLE IF NOT EXISTS payment_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            expense_id TEXT NOT NULL,
            expense_name TEXT NOT NULL,
            amount_due REAL NOT NULL,
            amount_paid REAL NOT NULL,
            payment_date DATE NOT NULL,
            due_date DATE NOT NULL,
            payment_type TEXT NOT NULL,
            balance_before REAL,
            balance_after REAL,
            went_negative BOOLEAN DEFAULT 0,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Expense auto-payments table - tracks scheduled and executed automatic payments
    db.exec(`
        CREATE TABLE IF NOT EXISTS expense_auto_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            expense_id TEXT NOT NULL,
            budget_id INTEGER NOT NULL,
            scheduled_date DATE NOT NULL,
            executed_date DATETIME,
            status TEXT DEFAULT 'scheduled',
            amount REAL NOT NULL,
            balance_before REAL,
            balance_after REAL,
            went_negative BOOLEAN DEFAULT 0,
            error_message TEXT,
            retry_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (budget_id) REFERENCES budget_data(id) ON DELETE CASCADE
        )
    `);

    // Scheduler runs table - tracks each automatic payment scheduler execution
    db.exec(`
        CREATE TABLE IF NOT EXISTS scheduler_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_date DATE NOT NULL,
            started_at DATETIME NOT NULL,
            completed_at DATETIME,
            status TEXT DEFAULT 'running',
            is_catchup BOOLEAN DEFAULT 0,
            users_processed INTEGER DEFAULT 0,
            expenses_processed INTEGER DEFAULT 0,
            transfers_processed INTEGER DEFAULT 0,
            transfers_generated INTEGER DEFAULT 0,
            errors_count INTEGER DEFAULT 0,
            error_details TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create indexes
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
        CREATE INDEX IF NOT EXISTS idx_accounts_parent_id ON accounts(parent_account_id);
        CREATE INDEX IF NOT EXISTS idx_recurring_expenses_user_id ON recurring_expenses(user_id);
        CREATE INDEX IF NOT EXISTS idx_recurring_expenses_budget_id ON recurring_expenses(budget_id);
        CREATE INDEX IF NOT EXISTS idx_recurring_expenses_next_due ON recurring_expenses(next_due_date);
        CREATE INDEX IF NOT EXISTS idx_recurring_expenses_account_id ON recurring_expenses(account_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
        CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
        CREATE INDEX IF NOT EXISTS idx_transfers_user_id ON transfers(user_id);
        CREATE INDEX IF NOT EXISTS idx_transfers_scheduled_date ON transfers(scheduled_date);
        CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
        CREATE INDEX IF NOT EXISTS idx_automation_state_user_id ON automation_state(user_id);
        CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
        CREATE INDEX IF NOT EXISTS idx_payment_history_expense_id ON payment_history(expense_id);
        CREATE INDEX IF NOT EXISTS idx_payment_history_payment_date ON payment_history(payment_date);
        CREATE INDEX IF NOT EXISTS idx_expense_auto_payments_user_id ON expense_auto_payments(user_id);
        CREATE INDEX IF NOT EXISTS idx_expense_auto_payments_scheduled_date ON expense_auto_payments(scheduled_date);
        CREATE INDEX IF NOT EXISTS idx_expense_auto_payments_status ON expense_auto_payments(status);
        CREATE INDEX IF NOT EXISTS idx_expense_auto_payments_expense_id ON expense_auto_payments(expense_id);
        CREATE INDEX IF NOT EXISTS idx_scheduler_runs_run_date ON scheduler_runs(run_date);
        CREATE INDEX IF NOT EXISTS idx_scheduler_runs_status ON scheduler_runs(status);
    `);

    console.log('Database initialized successfully');
}

// Initialize database on module load
initializeDatabase();

module.exports = db;
