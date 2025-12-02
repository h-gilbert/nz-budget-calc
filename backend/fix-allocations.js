#!/usr/bin/env node

const Database = require('better-sqlite3')
const path = require('path')

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'budget.db')
const db = new Database(DB_PATH)

// Calculate weekly amount for an expense
function getWeeklyAmount(expense) {
  const amount = parseFloat(expense.amount) || 0
  const period = expense.period

  switch (period) {
    case 'weekly': return amount
    case 'fortnightly': return amount / 2
    case 'monthly': return amount / 4.33
    case 'quarterly': return amount / 13
    case 'annual':
    case 'annually': return amount / 52
    default: return amount / 4.33
  }
}

function fixAllocations() {
  try {
    const budgetData = db.prepare(`
      SELECT id, expenses, accounts, expense_groups FROM budget_data WHERE user_id = 3
    `).get()

    if (!budgetData) {
      console.log('No budget data found')
      return
    }

    const expenses = JSON.parse(budgetData.expenses || '[]')
    const accounts = JSON.parse(budgetData.accounts || '[]')
    const expenseGroups = JSON.parse(budgetData.expense_groups || '[]')

    // Find the "Expenses" group (first group, or find by name)
    const expensesGroup = expenseGroups.find(g => g.name === 'Expenses') || expenseGroups[0]
    const expensesGroupId = expensesGroup?.id

    console.log(`Target group: "${expensesGroup?.name}" (${expensesGroupId})`)

    // Find expense account
    const expenseAccount = accounts.find(a => a.isExpenseAccount === true)
    const totalBalance = parseFloat(expenseAccount.balance) || 0
    console.log(`Expense Account Balance: $${totalBalance.toFixed(2)}`)

    // Reset ALL expenses to 0 first
    for (const expense of expenses) {
      if (!expense.sub_account) expense.sub_account = { balance: 0 }
      expense.sub_account.balance = 0
    }

    // Filter only expenses in the "Expenses" group
    const targetExpenses = expenses.filter(e => e.groupId === expensesGroupId)
    console.log(`Expenses in target group: ${targetExpenses.length}`)

    // Calculate weekly needs for target expenses only
    let totalWeeklyNeed = 0
    for (const expense of targetExpenses) {
      totalWeeklyNeed += getWeeklyAmount(expense)
    }
    console.log(`Total Weekly Need (Expenses group): $${totalWeeklyNeed.toFixed(2)}\n`)

    // Allocate proportionally to target expenses only
    let allocated = 0
    for (let i = 0; i < targetExpenses.length; i++) {
      const expense = targetExpenses[i]
      const weeklyNeed = getWeeklyAmount(expense)

      let allocation
      if (i === targetExpenses.length - 1) {
        allocation = totalBalance - allocated
      } else {
        allocation = (weeklyNeed / totalWeeklyNeed) * totalBalance
      }

      expense.sub_account.balance = parseFloat(allocation.toFixed(2))
      allocated += expense.sub_account.balance

      console.log(`  ${expense.description}: $${expense.sub_account.balance.toFixed(2)}`)
    }

    console.log(`\nTotal Allocated to Expenses group: $${allocated.toFixed(2)}`)
    console.log(`Food allocation: $0.00`)
    console.log(`Rent allocation: $0.00`)

    // Save
    db.prepare(`UPDATE budget_data SET expenses = ? WHERE id = ?`)
      .run(JSON.stringify(expenses), budgetData.id)

    console.log('\nDone!')

  } catch (error) {
    console.error('Error:', error)
  } finally {
    db.close()
  }
}

fixAllocations()
