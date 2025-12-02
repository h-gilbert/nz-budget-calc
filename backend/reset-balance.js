const Database = require('better-sqlite3')
const path = require('path')
const DB_PATH = path.join(__dirname, 'budget.db')
const db = new Database(DB_PATH)

const budgetData = db.prepare('SELECT id, expenses, accounts FROM budget_data WHERE user_id = 3').get()
const expenses = JSON.parse(budgetData.expenses || '[]')
const accounts = JSON.parse(budgetData.accounts || '[]')

// Reset expense account balance to $266.92
const expenseAccount = accounts.find(a => a.isExpenseAccount)
expenseAccount.balance = 266.92
console.log('Reset expense account balance to $266.92')

// Reset all sub_account balances to 0
for (const expense of expenses) {
  if (!expense.sub_account) expense.sub_account = { balance: 0 }
  expense.sub_account.balance = 0
}
console.log('Reset all sub_account balances to $0')

// Allocate $266.92 only to Expenses group (group-1764544969668-1)
const expensesGroupId = 'group-1764544969668-1'
const targetExpenses = expenses.filter(e => e.groupId === expensesGroupId)

// Calculate weekly needs
function getWeeklyAmount(expense) {
  const amount = parseFloat(expense.amount) || 0
  switch (expense.period) {
    case 'weekly': return amount
    case 'fortnightly': return amount / 2
    case 'monthly': return amount / 4.33
    case 'quarterly': return amount / 13
    case 'annual':
    case 'annually': return amount / 52
    default: return amount / 4.33
  }
}

let totalWeeklyNeed = targetExpenses.reduce((sum, e) => sum + getWeeklyAmount(e), 0)
let allocated = 0

for (let i = 0; i < targetExpenses.length; i++) {
  const expense = targetExpenses[i]
  const weeklyNeed = getWeeklyAmount(expense)
  let allocation = i === targetExpenses.length - 1 
    ? 266.92 - allocated 
    : (weeklyNeed / totalWeeklyNeed) * 266.92
  expense.sub_account.balance = parseFloat(allocation.toFixed(2))
  allocated += expense.sub_account.balance
}

// Set expense account unallocated balance to 0 (all allocated)
expenseAccount.balance = 0

console.log(`Allocated $${allocated.toFixed(2)} to Expenses group`)
console.log('Expense account unallocated balance: $0')

// Save
db.prepare('UPDATE budget_data SET expenses = ?, accounts = ? WHERE id = ?')
  .run(JSON.stringify(expenses), JSON.stringify(accounts), budgetData.id)

console.log('Done!')
db.close()
