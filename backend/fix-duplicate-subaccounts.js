#!/usr/bin/env node

const Database = require('better-sqlite3');
const path = require('path');

console.log('🔧 Starting duplicate sub-account cleanup...\n');

// Open database
// Use DATA_DIR environment variable or default to /app/data in production, current directory in development
const dataDir = process.env.DATA_DIR || (process.env.NODE_ENV === 'production' ? '/app/data' : __dirname);
const dbPath = path.join(dataDir, 'budget.db');
console.log(`Using database at: ${dbPath}\n`);
const db = new Database(dbPath);

try {
  // Get all budget records
  const budgets = db.prepare('SELECT id, user_id, budget_name, accounts FROM budget_data').all();

  console.log(`Found ${budgets.length} budget(s) to process\n`);

  let totalFixed = 0;
  let totalDuplicatesRemoved = 0;

  budgets.forEach(budget => {
    console.log(`Processing: "${budget.budget_name}" (ID: ${budget.id})`);

    if (!budget.accounts) {
      console.log('  ⏭️  No accounts data, skipping\n');
      return;
    }

    try {
      const accounts = JSON.parse(budget.accounts);

      if (!Array.isArray(accounts)) {
        console.log('  ⏭️  Invalid accounts format, skipping\n');
        return;
      }

      let budgetModified = false;
      let budgetDuplicatesRemoved = 0;

      // Process each account
      accounts.forEach(account => {
        if (account.sub_accounts && Array.isArray(account.sub_accounts)) {
          const originalCount = account.sub_accounts.length;
          console.log(`  📁 Account: "${account.name}" has ${originalCount} sub-account(s)`);

          // Deduplicate by ID
          const seenIds = new Set();
          const deduplicatedSubAccounts = [];

          account.sub_accounts.forEach(subAcc => {
            if (!seenIds.has(subAcc.id)) {
              seenIds.add(subAcc.id);
              deduplicatedSubAccounts.push(subAcc);
            }
          });

          const newCount = deduplicatedSubAccounts.length;
          const duplicatesRemoved = originalCount - newCount;

          if (duplicatesRemoved > 0) {
            console.log(`  ✅ Removed ${duplicatesRemoved} duplicate(s), keeping ${newCount} unique sub-account(s)`);
            account.sub_accounts = deduplicatedSubAccounts;
            budgetModified = true;
            budgetDuplicatesRemoved += duplicatesRemoved;
          } else {
            console.log(`  ✓ No duplicates found`);
          }
        }
      });

      // Update database if modifications were made
      if (budgetModified) {
        const updatedAccountsJson = JSON.stringify(accounts);
        db.prepare('UPDATE budget_data SET accounts = ? WHERE id = ?').run(updatedAccountsJson, budget.id);
        console.log(`  💾 Updated database: removed ${budgetDuplicatesRemoved} duplicate(s)\n`);
        totalFixed++;
        totalDuplicatesRemoved += budgetDuplicatesRemoved;
      } else {
        console.log('  ✓ No changes needed\n');
      }
    } catch (error) {
      console.error(`  ❌ Error processing budget ${budget.id}:`, error.message);
      console.log('');
    }
  });

  // Summary
  console.log('═══════════════════════════════════════════');
  console.log('📊 CLEANUP SUMMARY');
  console.log('═══════════════════════════════════════════');
  console.log(`Budgets processed: ${budgets.length}`);
  console.log(`Budgets fixed: ${totalFixed}`);
  console.log(`Total duplicates removed: ${totalDuplicatesRemoved}`);
  console.log('═══════════════════════════════════════════\n');

  if (totalFixed > 0) {
    console.log('✅ Cleanup complete! Your sub-accounts should no longer show duplicates.');
    console.log('💡 Reload your budget in the app to see the changes.\n');
  } else {
    console.log('✅ No duplicates found. Your data is clean!\n');
  }
} catch (error) {
  console.error('❌ Fatal error:', error);
  process.exit(1);
} finally {
  db.close();
}
