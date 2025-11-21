const Database = require('better-sqlite3');
const path = require('path');

// Initialize SQLite database
const db = new Database(path.join(__dirname, 'budget.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('Starting database migration...');

try {
    // Begin transaction
    db.exec('BEGIN TRANSACTION');

    // Step 1: Add missing columns to budget_data table
    console.log('Step 1: Updating budget_data table...');

    // Check if columns exist before adding them
    const columns = db.prepare("PRAGMA table_info(budget_data)").all();
    const columnNames = columns.map(col => col.name);

    if (!columnNames.includes('allowance_amount')) {
        db.exec('ALTER TABLE budget_data ADD COLUMN allowance_amount REAL DEFAULT 0');
        console.log('  - Added allowance_amount column');
    }

    if (!columnNames.includes('allowance_frequency')) {
        db.exec('ALTER TABLE budget_data ADD COLUMN allowance_frequency TEXT DEFAULT "weekly"');
        console.log('  - Added allowance_frequency column');
    }

    if (!columnNames.includes('ietc_eligible')) {
        db.exec('ALTER TABLE budget_data ADD COLUMN ietc_eligible BOOLEAN DEFAULT 0');
        console.log('  - Added ietc_eligible column');
    }

    if (!columnNames.includes('budget_name')) {
        db.exec('ALTER TABLE budget_data ADD COLUMN budget_name TEXT DEFAULT "My Budget"');
        console.log('  - Added budget_name column');
    }

    if (!columnNames.includes('is_default')) {
        db.exec('ALTER TABLE budget_data ADD COLUMN is_default BOOLEAN DEFAULT 0');
        console.log('  - Added is_default column');
    }

    // Step 2: Create accounts table
    console.log('Step 2: Creating accounts table...');
    db.exec(`
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            account_type TEXT NOT NULL DEFAULT 'checking',
            current_balance REAL DEFAULT 0,
            target_balance REAL,
            is_expense_account BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);
    console.log('  - Created accounts table');

    // Step 3: Create recurring_expenses table
    console.log('Step 3: Creating recurring_expenses table...');
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
    console.log('  - Created recurring_expenses table');

    // Step 4: Create transactions table
    console.log('Step 4: Creating transactions table...');
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
    console.log('  - Created transactions table');

    // Step 5: Create transfer_schedules table
    console.log('Step 5: Creating transfer_schedules table...');
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
    console.log('  - Created transfer_schedules table');

    // Step 6: Create transfers table
    console.log('Step 6: Creating transfers table...');
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
    console.log('  - Created transfers table');

    // Step 7: Create indexes for better performance
    console.log('Step 7: Creating indexes...');
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
        CREATE INDEX IF NOT EXISTS idx_recurring_expenses_user_id ON recurring_expenses(user_id);
        CREATE INDEX IF NOT EXISTS idx_recurring_expenses_budget_id ON recurring_expenses(budget_id);
        CREATE INDEX IF NOT EXISTS idx_recurring_expenses_next_due ON recurring_expenses(next_due_date);
        CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
        CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
        CREATE INDEX IF NOT EXISTS idx_transfers_user_id ON transfers(user_id);
        CREATE INDEX IF NOT EXISTS idx_transfers_scheduled_date ON transfers(scheduled_date);
        CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
    `);
    console.log('  - Created performance indexes');

    // Commit transaction
    db.exec('COMMIT');

    console.log('\n✅ Database migration completed successfully!');
    console.log('\nNew tables created:');
    console.log('  - accounts');
    console.log('  - recurring_expenses');
    console.log('  - transactions');
    console.log('  - transfer_schedules');
    console.log('  - transfers');
    console.log('\nColumns added to budget_data:');
    console.log('  - allowance_amount');
    console.log('  - allowance_frequency');
    console.log('  - ietc_eligible');
    console.log('  - budget_name');
    console.log('  - is_default');

} catch (error) {
    // Rollback on error
    db.exec('ROLLBACK');
    console.error('\n❌ Migration failed:', error.message);
    console.error('Database rolled back to previous state.');
    process.exit(1);
} finally {
    db.close();
}
