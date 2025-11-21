#!/usr/bin/env node

const Database = require('better-sqlite3');
const path = require('path');

console.log('🔧 Linking expenses to sub-accounts...\n');

// Use DATA_DIR environment variable or default to /app/data in production, current directory in development
const dataDir = process.env.DATA_DIR || (process.env.NODE_ENV === 'production' ? '/app/data' : __dirname);
const dbPath = path.join(dataDir, 'budget.db');
console.log(`Using database at: ${dbPath}\n`);
const db = new Database(dbPath);

try {
  // Get budget data for user 3 (hamish)
  const budget = db.prepare('SELECT id, expenses, accounts FROM budget_data WHERE user_id = 3').get();

  if (!budget) {
    console.log('❌ No budget found for user');
    process.exit(1);
  }

  const expenses = JSON.parse(budget.expenses || '[]');
  const accounts = JSON.parse(budget.accounts || '[]');

  console.log(`Found ${expenses.length} expenses`);
  console.log(`Found ${accounts.length} accounts\n`);

  // Find the expense account
  const expenseAccount = accounts.find(a => a.isExpenseAccount);
  if (!expenseAccount || !expenseAccount.sub_accounts) {
    console.log('❌ No expense account with sub-accounts found');
    process.exit(1);
  }

  console.log(`Expense account has ${expenseAccount.sub_accounts.length} sub-accounts\n`);

  let linked = 0;
  let notFound = 0;

  // Link each expense to its matching sub-account
  expenses.forEach(expense => {
    const matchingSubAccount = expenseAccount.sub_accounts.find(
      sub => sub.name.toLowerCase() === expense.description.toLowerCase()
    );

    if (matchingSubAccount) {
      expense.subAccountId = matchingSubAccount.id;
      console.log(`✅ Linked "${expense.description}" -> ${matchingSubAccount.id}`);
      linked++;
    } else {
      console.log(`⚠️  No matching sub-account for "${expense.description}"`);
      notFound++;
    }
  });

  // Update the database
  if (linked > 0) {
    const updatedExpenses = JSON.stringify(expenses);
    db.prepare('UPDATE budget_data SET expenses = ? WHERE id = ?').run(updatedExpenses, budget.id);
    console.log(`\n✅ Updated ${linked} expense links in database`);
  }

  if (notFound > 0) {
    console.log(`\n⚠️  ${notFound} expenses could not be linked (no matching sub-account)`);
  }

  console.log('\n✅ Fix complete!');
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
} finally {
  db.close();
}
