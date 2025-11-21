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
    } catch (error) {
        console.error('Account table migration error:', error);
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

    // Transfer schedules table
    db.exec(`
        CREATE TABLE IF NOT EXISTS transfer_schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            from_account_id INTEGER NOT NULL,
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

    // Transfers table
    db.exec(`
        CREATE TABLE IF NOT EXISTS transfers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            schedule_id INTEGER,
            from_account_id INTEGER NOT NULL,
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
    `);

    console.log('Database initialized successfully');
}

// Initialize database on module load
initializeDatabase();

module.exports = db;
