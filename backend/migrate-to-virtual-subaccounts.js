#!/usr/bin/env node

/**
 * Migration Script: Convert to Virtual Sub-Account Model
 *
 * This script migrates from the old model (sub-accounts as separate database rows)
 * to the new virtual sub-account model (sub-accounts embedded in expenses).
 *
 * Changes:
 * 1. Consolidates all sub-account balances back to the expense account
 * 2. Deletes all sub-account rows from the accounts table
 * 3. Updates expenses to have embedded sub_account: { balance: 0 }
 * 4. Removes subAccountId and account_id references from expenses
 *
 * Run: node migrate-to-virtual-subaccounts.js
 */

const Database = require('better-sqlite3')
const path = require('path')

// Use same database path as server
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'budget.db')

console.log('='.repeat(60))
console.log('Migration: Convert to Virtual Sub-Account Model')
console.log('='.repeat(60))
console.log(`Database: ${DB_PATH}\n`)

const db = new Database(DB_PATH)

// Enable foreign keys
db.pragma('foreign_keys = OFF') // Temporarily disable for migration

function migrate() {
  const stats = {
    usersProcessed: 0,
    subAccountsConsolidated: 0,
    subAccountsDeleted: 0,
    expensesUpdated: 0,
    totalBalanceConsolidated: 0
  }

  try {
    // Start transaction
    db.exec('BEGIN TRANSACTION')

    // Get all users
    const users = db.prepare('SELECT id, username FROM users').all()
    console.log(`Found ${users.length} users to process\n`)

    for (const user of users) {
      console.log(`Processing user: ${user.username} (ID: ${user.id})`)

      // Get budget_data which contains accounts and expenses as JSON
      const budgetData = db.prepare(`
        SELECT id, expenses, accounts FROM budget_data WHERE user_id = ?
      `).get(user.id)

      if (!budgetData) {
        console.log(`  - No budget data found, skipping`)
        continue
      }

      let expenses = []
      let accounts = []

      try {
        expenses = JSON.parse(budgetData.expenses || '[]')
        accounts = JSON.parse(budgetData.accounts || '[]')
      } catch (e) {
        console.log(`  - Warning: Could not parse budget_data JSON, skipping`)
        continue
      }

      // Find expense account in the JSON accounts array
      const expenseAccount = accounts.find(a => a.isExpenseAccount === true || a.is_expense_account === true)

      if (!expenseAccount) {
        console.log(`  - No expense account found in JSON, skipping`)
        continue
      }

      console.log(`  - Expense account: ${expenseAccount.name} (ID: ${expenseAccount.id})`)
      console.log(`  - Current balance: $${expenseAccount.balance || 0}`)

      // Find sub-accounts in the JSON (nested under expense account)
      const subAccounts = expenseAccount.sub_accounts || []
      console.log(`  - Found ${subAccounts.length} sub-accounts`)

      // Calculate total sub-account balance
      let totalSubAccountBalance = 0
      for (const sub of subAccounts) {
        totalSubAccountBalance += parseFloat(sub.balance) || 0
        console.log(`    - ${sub.name}: $${sub.balance || 0}`)
      }

      console.log(`  - Total sub-account balance: $${totalSubAccountBalance}`)

      // Add sub-account balances to expense account
      if (totalSubAccountBalance > 0) {
        const currentBalance = parseFloat(expenseAccount.balance) || 0
        expenseAccount.balance = currentBalance + totalSubAccountBalance
        console.log(`  - Updated expense account balance: $${expenseAccount.balance}`)
        stats.totalBalanceConsolidated += totalSubAccountBalance
      }

      // Clear sub-accounts from expense account (they'll be virtual now)
      if (subAccounts.length > 0) {
        console.log(`  - Clearing ${subAccounts.length} sub-accounts from expense account`)
        stats.subAccountsDeleted += subAccounts.length
      }
      expenseAccount.sub_accounts = []
      stats.subAccountsConsolidated += subAccounts.length

      // Update expenses to have embedded sub_account
      let expensesModified = 0
      for (const expense of expenses) {
        // Add sub_account if not present
        if (!expense.sub_account) {
          expense.sub_account = { balance: 0 }
        }
        // Remove old linking fields
        delete expense.subAccountId
        delete expense.account_id
        expensesModified++
      }

      console.log(`  - Updated ${expensesModified} expenses with embedded sub_account`)
      stats.expensesUpdated += expensesModified

      // Save updated budget_data
      db.prepare(`
        UPDATE budget_data SET expenses = ?, accounts = ? WHERE id = ?
      `).run(JSON.stringify(expenses), JSON.stringify(accounts), budgetData.id)

      stats.usersProcessed++
      console.log('')
    }

    // Commit transaction
    db.exec('COMMIT')

    console.log('='.repeat(60))
    console.log('Migration Complete!')
    console.log('='.repeat(60))
    console.log(`Users processed: ${stats.usersProcessed}`)
    console.log(`Sub-accounts consolidated: ${stats.subAccountsConsolidated}`)
    console.log(`Sub-account rows deleted: ${stats.subAccountsDeleted}`)
    console.log(`Expenses updated: ${stats.expensesUpdated}`)
    console.log(`Total balance consolidated: $${stats.totalBalanceConsolidated.toFixed(2)}`)
    console.log('')
    console.log('The virtual sub-account model is now active.')
    console.log('Sub-accounts are now embedded within expenses.')

  } catch (error) {
    console.error('Migration failed:', error)
    db.exec('ROLLBACK')
    process.exit(1)
  } finally {
    db.pragma('foreign_keys = ON')
    db.close()
  }
}

// Run migration
migrate()
