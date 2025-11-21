#!/usr/bin/env node

/**
 * Sub-Accounts Migration Script
 *
 * This script helps existing users migrate to the sub-accounts feature by:
 * 1. Finding their expense account
 * 2. Creating default sub-account categories
 * 3. Optionally distributing the current balance across sub-accounts
 *
 * Usage: node migrate-subaccounts.js <user_id>
 */

const Database = require('better-sqlite3');
const path = require('path');
const readline = require('readline');

const db = new Database(path.join(__dirname, 'budget.db'));
db.pragma('foreign_keys = ON');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => rl.question(prompt, resolve));
}

// Default sub-account categories
const DEFAULT_CATEGORIES = [
  { name: 'Food & Groceries', description: 'Weekly groceries and dining' },
  { name: 'Housing', description: 'Rent/mortgage and utilities' },
  { name: 'Insurance', description: 'Health, car, home insurance' },
  { name: 'Transportation', description: 'Fuel, public transport, car expenses' },
  { name: 'Utilities', description: 'Power, water, internet, phone' },
  { name: 'Healthcare', description: 'Medical, dental, prescriptions' },
  { name: 'Personal', description: 'Clothing, entertainment, subscriptions' },
  { name: 'Debt Payments', description: 'Loans, credit cards' },
  { name: 'Savings & Other', description: 'Emergency fund contributions' }
];

async function migrateUser(userId) {
  console.log(`\n🔍 Migrating sub-accounts for user ID: ${userId}\n`);

  // Find the user
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    console.error(`❌ User with ID ${userId} not found`);
    return false;
  }

  console.log(`✅ Found user: ${user.username}`);

  // Find their expense account
  const expenseAccount = db.prepare(`
    SELECT * FROM accounts
    WHERE user_id = ? AND is_expense_account = 1 AND parent_account_id IS NULL
    LIMIT 1
  `).get(userId);

  if (!expenseAccount) {
    console.error('❌ No expense account found for this user');
    return false;
  }

  console.log(`✅ Found expense account: "${expenseAccount.name}" with balance $${expenseAccount.current_balance}`);

  // Check if sub-accounts already exist
  const existingSubAccounts = db.prepare(`
    SELECT * FROM accounts WHERE parent_account_id = ?
  `).all(expenseAccount.id);

  if (existingSubAccounts.length > 0) {
    console.log(`\n⚠️  This expense account already has ${existingSubAccounts.length} sub-account(s):`);
    existingSubAccounts.forEach(sa => {
      console.log(`   - ${sa.name}: $${sa.current_balance}`);
    });

    const proceed = await question('\nDo you want to add more sub-accounts? (y/n): ');
    if (proceed.toLowerCase() !== 'y') {
      console.log('Migration cancelled');
      return false;
    }
  }

  // Show default categories
  console.log('\n📋 Default expense categories:');
  DEFAULT_CATEGORIES.forEach((cat, idx) => {
    console.log(`   ${idx + 1}. ${cat.name} - ${cat.description}`);
  });

  const createDefaults = await question('\nCreate all default categories? (y/n): ');

  let categoriesToCreate = [];

  if (createDefaults.toLowerCase() === 'y') {
    categoriesToCreate = DEFAULT_CATEGORIES;
  } else {
    console.log('\nEnter category numbers to create (comma-separated, e.g., 1,2,5) or "custom" to add your own:');
    const selection = await question('Selection: ');

    if (selection.toLowerCase() === 'custom') {
      const customName = await question('Category name: ');
      const customDesc = await question('Description (optional): ');
      categoriesToCreate = [{ name: customName, description: customDesc }];
    } else {
      const indices = selection.split(',').map(s => parseInt(s.trim()) - 1);
      categoriesToCreate = indices
        .filter(i => i >= 0 && i < DEFAULT_CATEGORIES.length)
        .map(i => DEFAULT_CATEGORIES[i]);
    }
  }

  if (categoriesToCreate.length === 0) {
    console.log('No categories selected');
    return false;
  }

  // Ask about balance distribution
  const totalBalance = parseFloat(expenseAccount.current_balance) || 0;
  let distributeBalance = false;
  let balancePerCategory = 0;

  if (totalBalance > 0) {
    const distribute = await question(`\nDistribute current balance of $${totalBalance} evenly across categories? (y/n): `);
    distributeBalance = distribute.toLowerCase() === 'y';
    if (distributeBalance) {
      balancePerCategory = totalBalance / categoriesToCreate.length;
    }
  }

  // Create sub-accounts
  console.log('\n🔧 Creating sub-accounts...\n');

  const stmt = db.prepare(`
    INSERT INTO accounts (
      user_id, name, account_type, current_balance, parent_account_id, auto_allocate, priority
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  let created = 0;
  for (const category of categoriesToCreate) {
    try {
      const balance = distributeBalance ? balancePerCategory : 0;
      stmt.run(
        userId,
        category.name,
        'expense_category',
        balance,
        expenseAccount.id,
        1, // auto_allocate enabled
        created + 1
      );
      console.log(`✅ Created: ${category.name} ($${balance.toFixed(2)})`);
      created++;
    } catch (error) {
      console.error(`❌ Failed to create ${category.name}:`, error.message);
    }
  }

  console.log(`\n✨ Successfully created ${created} sub-account(s)!\n`);

  // Show next steps
  console.log('📝 Next Steps:');
  console.log('   1. Assign your recurring expenses to the appropriate sub-accounts');
  console.log('   2. Adjust individual sub-account balances if needed');
  console.log('   3. Check the dashboard to see your expense breakdown\n');

  return true;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('📊 NZ Budget Calculator - Sub-Accounts Migration\n');
    console.log('Usage: node migrate-subaccounts.js <user_id>\n');
    console.log('Available users:');

    const users = db.prepare('SELECT id, username, created_at FROM users').all();
    if (users.length === 0) {
      console.log('   No users found');
    } else {
      users.forEach(u => {
        const hasExpenseAccount = db.prepare(`
          SELECT COUNT(*) as count FROM accounts
          WHERE user_id = ? AND is_expense_account = 1
        `).get(u.id);

        const marker = hasExpenseAccount.count > 0 ? '✓' : '✗';
        console.log(`   ${marker} ID ${u.id}: ${u.username} (created ${u.created_at.split(' ')[0]})`);
      });
    }
    console.log('');
    rl.close();
    db.close();
    return;
  }

  const userId = parseInt(args[0]);
  if (isNaN(userId)) {
    console.error('❌ Invalid user ID');
    rl.close();
    db.close();
    return;
  }

  try {
    await migrateUser(userId);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    rl.close();
    db.close();
  }
}

main();
