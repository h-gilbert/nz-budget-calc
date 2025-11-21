import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { transferAPI } from '@/api/client'

// Helper function to format date as YYYY-MM-DD in local time (not UTC)
function formatDateLocal(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper function to get next Monday's date
function getNextMonday() {
  const today = new Date()
  const dayOfWeek = today.getDay()

  // Calculate days until next Monday
  // If today is Sunday (0), next Monday is 1 day away
  // If today is Monday (1), next Monday is 7 days away
  // If today is Tuesday (2), next Monday is 6 days away, etc.
  let daysUntilNextMonday
  if (dayOfWeek === 0) {
    // Sunday
    daysUntilNextMonday = 1
  } else {
    // Monday through Saturday: go to next Monday
    daysUntilNextMonday = 8 - dayOfWeek
  }

  const nextMonday = new Date(today)
  nextMonday.setDate(today.getDate() + daysUntilNextMonday)
  nextMonday.setHours(0, 0, 0, 0)

  return formatDateLocal(nextMonday)
}

export const useBudgetStore = defineStore('budget', () => {
  // State
  const budgetId = ref(null) // Track current budget ID for updates
  const budgetName = ref('')
  const setAsDefault = ref(false)

  // Income
  const payType = ref('weekly')
  const payAmount = ref(0)
  const hoursType = ref('fixed')
  const fixedHours = ref(40)
  const minHours = ref(0)
  const maxHours = ref(0)
  const allowanceAmount = ref(0)
  const allowanceFrequency = ref('weekly')

  // Tax & Deductions
  const kiwisaver = ref(false)
  const kiwisaverRate = ref('3')
  const studentLoan = ref(false)
  const ietcEligible = ref(false)

  // Expenses
  const expenses = ref([])
  const expenseCount = ref(0)

  // Accounts
  const accounts = ref([])
  const accountCount = ref(0)

  // Savings & Investment
  const savingsTarget = ref(0)
  const savingsDeadline = ref('')
  const investSavings = ref(false)
  const interestRate = ref(0)

  // Modeling
  const modelWeeks = ref(52)
  const modelStartDate = ref('')
  const transferFrequency = ref('weekly')
  const weeklySurplus = ref(0)

  // Results
  const results = ref(null)
  const hasCalculated = ref(false)

  // Computed
  const totalExpenses = computed(() => {
    return expenses.value.reduce((total, expense) => {
      const amount = parseFloat(expense.amount) || 0
      const frequency = expense.frequency || 'weekly'

      // Convert to weekly
      let weeklyAmount = amount
      if (frequency === 'monthly') weeklyAmount = amount / 4.33
      else if (frequency === 'fortnightly') weeklyAmount = amount / 2
      else if (frequency === 'annually') weeklyAmount = amount / 52

      return total + weeklyAmount
    }, 0)
  })

  const totalAccountAllocations = computed(() => {
    if (!results.value || !results.value.accounts) return 0
    return results.value.accounts.reduce((total, acc) => {
      return total + (parseFloat(acc.weeklyTransfer) || 0)
    }, 0)
  })

  const weeklyGrossIncome = computed(() => {
    if (!results.value) return 0
    return results.value.weeklyGrossIncome || 0
  })

  const weeklyNetIncome = computed(() => {
    if (!results.value) return 0
    return results.value.weeklyNetIncome || 0
  })

  const weeklyDiscretionary = computed(() => {
    if (!results.value) return 0
    return results.value.weeklyDiscretionary || 0
  })

  // Actions
  function addExpense() {
    expenseCount.value++
    const expenseId = `expense-${expenseCount.value}`

    // Create the expense (sub-account will be created when user adds a name)
    const newExpense = {
      id: expenseId,
      name: '',
      amount: 0,
      frequency: 'weekly',
      subAccountId: null
    }
    expenses.value.unshift(newExpense)
  }

  function removeExpense(id) {
    const expense = expenses.value.find(e => e.id === id)
    if (!expense) return

    // Remove the associated sub-account if it exists
    if (expense.subAccountId) {
      const expenseAccount = accounts.value.find(a => a.isExpenseAccount)
      if (expenseAccount && expenseAccount.sub_accounts) {
        const subIndex = expenseAccount.sub_accounts.findIndex(sa => sa.id === expense.subAccountId)
        if (subIndex > -1) {
          expenseAccount.sub_accounts.splice(subIndex, 1)
        }
      }
    }

    // Remove the expense
    const index = expenses.value.findIndex(e => e.id === id)
    if (index > -1) {
      expenses.value.splice(index, 1)
    }
  }

  function updateExpense(id, field, value) {
    const expense = expenses.value.find(e => e.id === id)
    if (expense) {
      // Handle NaN values for numeric fields
      if (field === 'amount' && (isNaN(value) || value === null || value === undefined)) {
        expense[field] = 0
      } else {
        expense[field] = value
      }

      // If updating the name field
      if (field === 'name') {
        // If expense doesn't have a sub-account yet and now has a name, create one
        if (!expense.subAccountId && value && value.trim()) {
          const expenseAccount = accounts.value.find(a => a.isExpenseAccount)
          if (expenseAccount) {
            accountCount.value++
            const subAccountId = `subaccount-${accountCount.value}`

            const subAccount = {
              id: subAccountId,
              name: value,
              balance: 0,
              target: null,
              isExpenseAccount: false,
              isSpendingAccount: false,
              isWeekAhead: false,
              priority: accountCount.value,
              purpose: '',
              startingBalanceDate: null,
              parentAccountId: expenseAccount.id,
              autoAllocate: true,
              sub_accounts: []
            }

            if (!expenseAccount.sub_accounts) {
              expenseAccount.sub_accounts = []
            }
            expenseAccount.sub_accounts.push(subAccount)

            // Link expense to its sub-account
            expense.subAccountId = subAccountId
          }
        }
        // If expense already has a sub-account, sync the name
        else if (expense.subAccountId) {
          const expenseAccount = accounts.value.find(a => a.isExpenseAccount)
          if (expenseAccount && expenseAccount.sub_accounts) {
            const subAccount = expenseAccount.sub_accounts.find(sa => sa.id === expense.subAccountId)
            if (subAccount) {
              subAccount.name = value
            }
          }
        }
      }
    }
  }

  function addAccount() {
    accountCount.value++
    // Get next Monday's date as default start date
    const nextMondayDate = getNextMonday()
    accounts.value.unshift({
      id: `account-${accountCount.value}`,
      name: '',
      balance: 0,
      target: null,
      isExpenseAccount: false,
      isSpendingAccount: false,
      isWeekAhead: false,
      priority: accountCount.value,
      purpose: '',
      startingBalanceDate: nextMondayDate,
      parentAccountId: null,
      autoAllocate: true,
      sub_accounts: []
    })
  }

  function addSubAccount(parentAccountId) {
    accountCount.value++
    const parent = findAccountById(parentAccountId)
    if (!parent) {
      console.error('Parent account not found')
      return
    }

    const subAccount = {
      id: `subaccount-${accountCount.value}`,
      name: '',
      balance: 0,
      target: null,
      isExpenseAccount: false,
      isSpendingAccount: false,
      isWeekAhead: false,
      priority: accountCount.value,
      purpose: '',
      startingBalanceDate: null,
      parentAccountId: parentAccountId,
      autoAllocate: true,
      sub_accounts: []
    }

    if (!parent.sub_accounts) {
      parent.sub_accounts = []
    }
    parent.sub_accounts.unshift(subAccount)
  }

  function removeSubAccount(parentAccountId, subAccountId) {
    const parent = findAccountById(parentAccountId)
    if (!parent || !parent.sub_accounts) return

    const index = parent.sub_accounts.findIndex(sa => sa.id === subAccountId)
    if (index > -1) {
      parent.sub_accounts.splice(index, 1)
    }
  }

  function updateSubAccount(parentAccountId, subAccountId, field, value) {
    const parent = findAccountById(parentAccountId)
    if (!parent || !parent.sub_accounts) return

    const subAccount = parent.sub_accounts.find(sa => sa.id === subAccountId)
    if (subAccount) {
      // Handle NaN values for numeric fields
      if ((field === 'balance' || field === 'target') && (isNaN(value) || value === null || value === undefined)) {
        subAccount[field] = 0
      } else {
        subAccount[field] = value
      }
    }
  }

  function findAccountById(accountId) {
    return accounts.value.find(a => a.id === accountId)
  }

  function removeAccount(id) {
    const index = accounts.value.findIndex(a => a.id === id)
    if (index > -1) {
      accounts.value.splice(index, 1)
    }
  }

  function updateAccount(id, field, value) {
    const account = accounts.value.find(a => a.id === id)
    if (account) {
      // If setting this account as expense account, unset all others
      if (field === 'isExpenseAccount' && value === true) {
        accounts.value.forEach(a => {
          if (a.id !== id) {
            a.isExpenseAccount = false
          }
        })
      }
      // Handle NaN values for numeric fields
      if ((field === 'balance' || field === 'target') && (isNaN(value) || value === null || value === undefined)) {
        account[field] = field === 'target' ? null : 0
      } else {
        account[field] = value
      }
    }
  }

  // Migration: Create sub-accounts for expenses that don't have them
  function migrateExpensesToSubAccounts() {
    const expenseAccount = accounts.value.find(a => a.isExpenseAccount)
    if (!expenseAccount) return

    if (!expenseAccount.sub_accounts) {
      expenseAccount.sub_accounts = []
    }

    let migrated = 0
    expenses.value.forEach(expense => {
      // Skip if expense already has a sub-account
      if (expense.subAccountId) return

      // Skip if expense has no name (will be created when user adds a name)
      if (!expense.name || !expense.name.trim()) return

      // Create sub-account for this expense
      accountCount.value++
      const subAccountId = `subaccount-${accountCount.value}`

      const subAccount = {
        id: subAccountId,
        name: expense.name,
        balance: 0,
        target: null,
        isExpenseAccount: false,
        isSpendingAccount: false,
        isWeekAhead: false,
        priority: accountCount.value,
        purpose: '',
        startingBalanceDate: null,
        parentAccountId: expenseAccount.id,
        autoAllocate: true,
        sub_accounts: []
      }

      expenseAccount.sub_accounts.push(subAccount)
      expense.subAccountId = subAccountId
      migrated++
    })

    if (migrated > 0) {
      console.log(`Migrated ${migrated} expenses to sub-accounts`)
    }
  }

  function setResults(calculationResults) {
    results.value = calculationResults
    hasCalculated.value = true
  }

  function clearResults() {
    results.value = null
    hasCalculated.value = false
  }

  function reset() {
    // Reset all to defaults
    budgetId.value = null
    budgetName.value = ''
    setAsDefault.value = false

    payType.value = 'weekly'
    payAmount.value = 0
    hoursType.value = 'fixed'
    fixedHours.value = 40
    minHours.value = 0
    maxHours.value = 0
    allowanceAmount.value = 0
    allowanceFrequency.value = 'weekly'

    kiwisaver.value = false
    kiwisaverRate.value = '3'
    studentLoan.value = false
    ietcEligible.value = false

    expenses.value = []
    expenseCount.value = 0

    accounts.value = []
    accountCount.value = 0

    savingsTarget.value = 0
    savingsDeadline.value = ''
    investSavings.value = false
    interestRate.value = 0

    modelWeeks.value = 52
    modelStartDate.value = ''
    transferFrequency.value = 'weekly'
    weeklySurplus.value = 0

    clearResults()
  }

  function loadBudgetData(data) {
    // Load saved budget data into store
    budgetId.value = data.budgetId || data.budget_id || data.id || null // Track the budget ID (backend returns "budgetId")
    budgetName.value = data.budgetName || data.budget_name || ''
    setAsDefault.value = data.isDefault || data.is_default || false

    payType.value = data.payType || 'weekly'
    payAmount.value = parseFloat(data.payAmount) || 0
    hoursType.value = data.hoursType || 'fixed'
    fixedHours.value = parseFloat(data.fixedHours) || 40
    minHours.value = parseFloat(data.minHours) || 0
    maxHours.value = parseFloat(data.maxHours) || 0
    allowanceAmount.value = parseFloat(data.allowanceAmount) || 0
    allowanceFrequency.value = data.allowanceFrequency || 'weekly'

    kiwisaver.value = data.kiwisaver === true || data.kiwisaver === 1
    kiwisaverRate.value = String(data.kiwisaverRate || '3')
    studentLoan.value = data.studentLoan === true || data.studentLoan === 1
    ietcEligible.value = data.ietcEligible === true || data.ietcEligible === 1

    // Transform expenses from backend format to frontend format
    const backendExpenses = data.expenses || []
    if (Array.isArray(backendExpenses)) {
      expenses.value = backendExpenses.map((expense, index) => {
        // Normalize 'annual' to 'annually' for consistency
        let frequency = expense.period || 'weekly'
        if (frequency === 'annual') frequency = 'annually'

        const transformed = {
          id: `expense-${Date.now()}-${index}`,
          name: expense.description || '',
          amount: parseFloat(expense.amount) || 0,
          frequency,
          date: expense.date || null,
          subAccountId: expense.subAccountId || expense.account_id || null
        }

        // Debug logging for annual expenses
        if (expense.period === 'annual') {
          console.log(`Transformed expense: ${expense.description}`, {
            original: expense.period,
            transformed: transformed.frequency
          })
        }

        return transformed
      })
      expenseCount.value = expenses.value.length
    }

    // Transform accounts
    const backendAccounts = data.accounts || []
    console.log('Loading accounts from backend:', backendAccounts)
    if (Array.isArray(backendAccounts)) {
      // Function to transform a single account
      const transformAccount = (account, index) => {
        const isExpenseAcc = account.isExpenseAccount === true || account.isExpenseAccount === 1
        const startingDate = isExpenseAcc ? getNextMonday() : (account.startingBalanceDate || null)

        // Transform sub-accounts recursively and deduplicate by ID
        const subAccounts = account.sub_accounts || []
        const seenIds = new Set()
        const deduplicatedSubAccounts = subAccounts.filter(subAcc => {
          if (seenIds.has(subAcc.id)) {
            console.warn(`Duplicate sub-account detected and removed: ${subAcc.id} - ${subAcc.name}`)
            return false
          }
          seenIds.add(subAcc.id)
          return true
        })
        const transformedSubAccounts = deduplicatedSubAccounts.map((subAcc, subIndex) => transformAccount(subAcc, subIndex))

        const transformed = {
          id: account.id || `account-${Date.now()}-${index}`,
          name: account.name || '',
          balance: parseFloat(account.balance) || 0,
          target: account.target ? parseFloat(account.target) : null,
          isExpenseAccount: isExpenseAcc,
          isSpendingAccount: account.isSpendingAccount === true || account.isSpendingAccount === 1,
          isWeekAhead: account.isWeekAhead === true || account.isWeekAhead === 1 || false,
          priority: account.priority || index + 1,
          purpose: account.purpose || '',
          startingBalanceDate: startingDate,
          parentAccountId: account.parent_account_id || account.parentAccountId || null,
          autoAllocate: account.auto_allocate !== undefined ? (account.auto_allocate === true || account.auto_allocate === 1) : true,
          sub_accounts: transformedSubAccounts
        }
        return transformed
      }

      accounts.value = backendAccounts.map((account, index) => transformAccount(account, index))
      accountCount.value = accounts.value.length
      console.log('Final accounts array with sub-accounts:', accounts.value)
    }

    savingsTarget.value = parseFloat(data.savingsTarget) || 0
    savingsDeadline.value = data.savingsDeadline || ''
    investSavings.value = data.investSavings === true || data.investSavings === 1
    interestRate.value = parseFloat(data.interestRate) || 0

    modelWeeks.value = parseInt(data.modelWeeks) || 52
    modelStartDate.value = data.modelStartDate || ''
    transferFrequency.value = data.transferFrequency || 'weekly'
    weeklySurplus.value = parseFloat(data.weeklySurplus) || 0
  }

  function calculate() {
    // Simple calculation - convert everything to weekly
    let weeklyGross = payAmount.value

    // Convert based on pay type
    if (payType.value === 'hourly') {
      weeklyGross = payAmount.value * (fixedHours.value || 40)
    } else if (payType.value === 'fortnightly') {
      weeklyGross = payAmount.value / 2
    } else if (payType.value === 'monthly') {
      weeklyGross = payAmount.value / 4.33
    } else if (payType.value === 'annually') {
      weeklyGross = payAmount.value / 52
    }

    // Calculate non-taxable allowance (added after tax)
    let weeklyAllowance = allowanceAmount.value
    if (allowanceFrequency.value === 'fortnightly') {
      weeklyAllowance = allowanceAmount.value / 2
    } else if (allowanceFrequency.value === 'monthly') {
      weeklyAllowance = allowanceAmount.value / 4.33
    } else if (allowanceFrequency.value === 'annual') {
      weeklyAllowance = allowanceAmount.value / 52
    }

    // Calculate annual income for tax brackets (excluding non-taxable allowance)
    const annualIncome = weeklyGross * 52

    // NZ PAYE Tax Calculation (2024-2025 progressive brackets - from 31 July 2024)
    let annualTax = 0

    if (annualIncome <= 15600) {
      annualTax = annualIncome * 0.105
    } else if (annualIncome <= 53500) {
      annualTax = (15600 * 0.105) + ((annualIncome - 15600) * 0.175)
    } else if (annualIncome <= 78100) {
      annualTax = (15600 * 0.105) + (37900 * 0.175) + ((annualIncome - 53500) * 0.30)
    } else if (annualIncome <= 180000) {
      annualTax = (15600 * 0.105) + (37900 * 0.175) + (24600 * 0.30) + ((annualIncome - 78100) * 0.33)
    } else {
      annualTax = (15600 * 0.105) + (37900 * 0.175) + (24600 * 0.30) + (101900 * 0.33) + ((annualIncome - 180000) * 0.39)
    }

    // ACC Earner's Levy (2025-2026: 1.67%)
    const annualACC = annualIncome * 0.0167

    // IETC (Independent Earner Tax Credit) - 2024 rules
    // $520/year for income between $24,000 and $66,000
    // Reduces by 13 cents per dollar between $66,001 and $70,000
    let annualIETC = 0
    if (ietcEligible.value && annualIncome >= 24000 && annualIncome <= 66000) {
      annualIETC = 520
    } else if (ietcEligible.value && annualIncome > 66000 && annualIncome <= 70000) {
      // Reduce by $0.13 for every dollar above $66,000
      const reduction = (annualIncome - 66000) * 0.13
      annualIETC = Math.max(0, 520 - reduction)
    }

    // Calculate weekly amounts
    const weeklyTax = (annualTax - annualIETC) / 52
    const weeklyACC = annualACC / 52
    const weeklyPAYE = weeklyTax + weeklyACC

    // KiwiSaver deduction
    let kiwisaverDeduction = 0
    if (kiwisaver.value) {
      const rate = parseFloat(kiwisaverRate.value) / 100
      kiwisaverDeduction = weeklyGross * rate
    }

    // Student loan repayment (12% over threshold of $22,828)
    let studentLoanDeduction = 0
    if (studentLoan.value && annualIncome > 22828) {
      studentLoanDeduction = Math.max(0, (weeklyGross - (22828 / 52)) * 0.12)
    }

    // Calculate net after all deductions
    const weeklyNetBeforeAllowance = weeklyGross - weeklyPAYE - kiwisaverDeduction - studentLoanDeduction

    // Add non-taxable allowance to get final take-home
    const weeklyNet = weeklyNetBeforeAllowance + weeklyAllowance
    const weeklyDiscretionaryIncome = weeklyNet - totalExpenses.value

    setResults({
      weeklyGrossIncome: weeklyGross,
      weeklyAllowance: weeklyAllowance,
      weeklyNetIncome: weeklyNet,
      weeklyDiscretionary: weeklyDiscretionaryIncome,
      tax: weeklyTax,
      acc: weeklyACC,
      paye: weeklyPAYE,
      ietc: annualIETC / 52,
      kiwisaverDeduction,
      studentLoanDeduction
    })
  }

  async function calculateWeeklyRequirements(projectionWeeks = 52) {
    try {
      // Call backend API to calculate weekly requirements
      const response = await transferAPI.calculate(projectionWeeks)

      if (!response || !response.projection) {
        console.error('Invalid response from backend:', response)
        return []
      }

      // Transform backend response to frontend format
      const weeks = response.projection.map((week, index) => {
        const runningBalance = week.currentBalance

        return {
          weekNumber: week.week,
          startDate: week.weekStart,
          endDate: week.weekEnd,
          expensesDue: week.expensesDue || [],
          totalExpensesDue: week.expenses,
          requiredBalance: week.requiredBalance,
          runningBalance: runningBalance,
          transferNeeded: week.transferNeeded,
          isNegative: runningBalance < 0,
          isLow: runningBalance >= 0 && runningBalance < week.requiredBalance,
          recommendedTransfer: index > 0 ? response.projection[index].requiredBalance : 0
        }
      })

      return weeks
    } catch (error) {
      console.error('Error calculating weekly requirements:', error)
      return []
    }
  }

  function calculateEquilibriumTransfer() {
    // Calculate the weekly amount needed to cover all expenses in equilibrium
    // This is simply the sum of all expenses converted to weekly amounts
    return totalExpenses.value
  }

  async function calculateCatchUpSchedule(maxWeeks = 52) {
    // Get the expense account with starting balance
    const expenseAccount = accounts.value.find(a => a.isExpenseAccount)
    if (!expenseAccount) {
      return {
        error: 'No expense account found',
        equilibriumTransfer: 0,
        schedule: []
      }
    }

    // Get starting balance - aggregate from sub-accounts if they exist
    let startingBalance = 0
    if (expenseAccount.sub_accounts && expenseAccount.sub_accounts.length > 0) {
      // Calculate total from all sub-accounts
      startingBalance = expenseAccount.sub_accounts.reduce((total, sub) => {
        return total + (parseFloat(sub.balance) || 0)
      }, 0)
    } else {
      // Fall back to parent account balance if no sub-accounts
      if (expenseAccount.balance !== null && expenseAccount.balance !== undefined) {
        startingBalance = parseFloat(expenseAccount.balance)
        if (isNaN(startingBalance)) startingBalance = 0
      }
    }

    // Parse starting date as local date to avoid timezone issues
    let startingDate
    if (expenseAccount.startingBalanceDate) {
      // Parse YYYY-MM-DD as local date (not UTC)
      const dateStr = expenseAccount.startingBalanceDate
      const [year, month, day] = dateStr.split('-').map(Number)
      startingDate = new Date(year, month - 1, day)
    } else {
      startingDate = new Date()
    }

    // Get equilibrium transfer amount (weekly expenses)
    const equilibriumTransfer = calculateEquilibriumTransfer()

    // Calculate max transfer:
    // If weekly surplus is set, use it as the max CATCH-UP EXTRA on top of equilibrium
    // Otherwise, use weekly net income as the total max
    let maxTransfer
    let maxCatchUpExtra

    if (weeklySurplus.value > 0) {
      // Weekly surplus is the max extra for catch-up, added to equilibrium
      maxCatchUpExtra = weeklySurplus.value
      maxTransfer = equilibriumTransfer + maxCatchUpExtra
    } else {
      // Fall back to weekly net income as total max
      maxTransfer = weeklyNetIncome.value || 0
      maxCatchUpExtra = Math.max(0, maxTransfer - equilibriumTransfer)
    }

    if (equilibriumTransfer > maxTransfer) {
      return {
        error: 'Equilibrium transfer exceeds your take-home pay',
        equilibriumTransfer,
        maxTransfer,
        schedule: []
      }
    }

    // Set start date to Monday of the week
    // getDay() returns 0 (Sun) to 6 (Sat), we want Monday (1)
    const dayOfWeek = startingDate.getDay()
    let daysToMonday
    if (dayOfWeek === 0) {
      // Sunday: go forward 1 day to Monday
      daysToMonday = 1
    } else if (dayOfWeek === 1) {
      // Already Monday
      daysToMonday = 0
    } else {
      // Tue-Sat: go back to Monday of this week
      daysToMonday = -(dayOfWeek - 1)
    }
    const weekStart = new Date(startingDate)
    weekStart.setDate(startingDate.getDate() + daysToMonday)
    weekStart.setHours(0, 0, 0, 0)

    // Get weekly requirements
    const weeklyRequirements = await calculateWeeklyRequirements(maxWeeks)

    // Check if user wants to maintain a week-ahead safety buffer
    const isWeekAhead = expenseAccount.isWeekAhead === true

    // Calculate the week-ahead buffer amount (next week's expenses to always keep in reserve)
    let weekAheadBuffer = 0
    if (isWeekAhead && weeklyRequirements.length >= 1) {
      // For display purposes, show Week 2's expenses as the buffer amount
      weekAheadBuffer = weeklyRequirements.length >= 2 ? weeklyRequirements[1].totalExpensesDue : 0
    }

    // Calculate the minimum buffer needed for equilibrium
    // This is the highest expense we'll face minus the average (equilibrium)
    const maxSingleWeekExpense = Math.max(...weeklyRequirements.map(w => w.totalExpensesDue))
    const minBufferNeeded = maxSingleWeekExpense - equilibriumTransfer

    // Calculate catch-up schedule
    const schedule = []
    let currentBalance = startingBalance
    let equilibriumReached = false
    let equilibriumWeek = null

    for (let weekIndex = 0; weekIndex < weeklyRequirements.length; weekIndex++) {
      const week = weeklyRequirements[weekIndex]
      const weekDate = new Date(weekStart)
      weekDate.setDate(weekStart.getDate() + (weekIndex * 7))

      // Balance BEFORE any transfer this week
      const balanceBeforeTransfer = currentBalance

      // Pay this week's expenses first
      const balanceAfterExpenses = balanceBeforeTransfer - week.totalExpensesDue

      // Calculate transfer needed
      let transferAmount = 0

      if (!equilibriumReached) {
        // Find the maximum deficit in the next 13 weeks if we just transfer equilibrium
        let maxDeficit = 0
        let testBalance = balanceAfterExpenses

        for (let i = weekIndex; i < Math.min(weekIndex + 13, weeklyRequirements.length); i++) {
          const futureWeek = weeklyRequirements[i]
          // Add equilibrium transfer at start of week
          testBalance += equilibriumTransfer
          // Subtract expenses for that week
          testBalance -= futureWeek.totalExpensesDue

          // If week-ahead buffer is enabled, check if balance falls below next week's expenses
          // Otherwise, just check if balance goes negative
          let minRequiredBalance = 0
          if (isWeekAhead && i + 1 < weeklyRequirements.length) {
            minRequiredBalance = weeklyRequirements[i + 1].totalExpensesDue
          }

          // Track the worst deficit
          if (testBalance < minRequiredBalance && Math.abs(testBalance - minRequiredBalance) > maxDeficit) {
            maxDeficit = Math.abs(testBalance - minRequiredBalance)
          }
        }

        if (maxDeficit > 0) {
          // We need to catch up - transfer equilibrium + the deficit (capped to max catch-up extra)
          const catchUpExtra = Math.min(maxDeficit, maxCatchUpExtra)
          transferAmount = equilibriumTransfer + catchUpExtra
        } else {
          // No deficit in next 13 weeks, we can just transfer equilibrium
          transferAmount = equilibriumTransfer

          // Check if we've truly reached equilibrium (check all remaining weeks)
          let isStable = true
          testBalance = balanceAfterExpenses + equilibriumTransfer

          for (let i = weekIndex + 1; i < weeklyRequirements.length; i++) {
            const futureWeek = weeklyRequirements[i]
            testBalance -= futureWeek.totalExpensesDue

            // Check minimum required balance (0 for normal, next week's expenses for week-ahead)
            let minRequiredBalance = 0
            if (isWeekAhead && i + 1 < weeklyRequirements.length) {
              minRequiredBalance = weeklyRequirements[i + 1].totalExpensesDue
            }

            if (testBalance < minRequiredBalance) {
              isStable = false
              break
            }
            testBalance += equilibriumTransfer
          }

          if (isStable) {
            equilibriumReached = true
            equilibriumWeek = weekIndex + 1
          }
        }

        // Final safety cap at max transfer
        if (transferAmount > maxTransfer) {
          transferAmount = maxTransfer
        }
      } else {
        // Equilibrium reached, just transfer equilibrium amount
        transferAmount = equilibriumTransfer
      }

      // Update balance after transfer
      currentBalance = balanceAfterExpenses + transferAmount

      schedule.push({
        weekNumber: week.weekNumber,
        weekDate: formatDateLocal(weekDate),
        expensesDue: week.totalExpensesDue,
        expenseDetails: week.expensesDue || [], // Array of detailed expenses
        balanceStart: balanceBeforeTransfer,
        transferAmount,
        balanceAfterTransfer: balanceAfterExpenses + transferAmount,
        balanceEnd: currentBalance,
        isEquilibrium: equilibriumReached,
        catchUpAmount: equilibriumReached ? 0 : Math.max(0, transferAmount - equilibriumTransfer)
      })
    }

    return {
      startingBalance,
      startingDate: formatDateLocal(weekStart),
      equilibriumTransfer,
      maxTransfer,
      equilibriumWeek,
      schedule,
      canReachEquilibrium: equilibriumWeek !== null,
      isWeekAhead,
      weekAheadBuffer
    }
  }

  function getBudgetData() {
    // Transform expenses from frontend format to backend format
    const transformedExpenses = expenses.value.map(expense => {
      // Normalize 'annually' to 'annual' for backend
      let period = expense.frequency || expense.period || 'weekly'
      if (period === 'annually') period = 'annual'

      return {
        description: expense.name || expense.description || '',
        amount: expense.amount || 0,
        period,
        date: expense.date || null,
        dayOfWeek: null,
        dayOfMonth: null
      }
    })

    // Transform accounts - deduplicate sub_accounts by ID to prevent duplicates
    const transformedAccounts = accounts.value.map(account => {
      const accountCopy = { ...account }

      // Deduplicate sub_accounts by ID
      if (accountCopy.sub_accounts && accountCopy.sub_accounts.length > 0) {
        const seenIds = new Set()
        accountCopy.sub_accounts = accountCopy.sub_accounts.filter(subAcc => {
          if (seenIds.has(subAcc.id)) {
            return false // Skip duplicate
          }
          seenIds.add(subAcc.id)
          return true
        })
      }

      return accountCopy
    })

    // Get all current budget data for saving in backend format
    return {
      budgetId: budgetId.value, // Include ID for updates (backend expects 'budgetId', not 'id')
      budgetName: budgetName.value,
      setAsDefault: setAsDefault.value,
      payType: payType.value,
      payAmount: payAmount.value,
      hoursType: hoursType.value,
      fixedHours: fixedHours.value,
      minHours: minHours.value,
      maxHours: maxHours.value,
      allowanceAmount: allowanceAmount.value,
      allowanceFrequency: allowanceFrequency.value,
      kiwisaver: kiwisaver.value,
      kiwisaverRate: kiwisaverRate.value,
      studentLoan: studentLoan.value,
      ietcEligible: ietcEligible.value,
      expenses: transformedExpenses,
      accounts: transformedAccounts,
      savingsTarget: savingsTarget.value,
      savingsDeadline: savingsDeadline.value,
      investSavings: investSavings.value,
      interestRate: interestRate.value,
      modelWeeks: modelWeeks.value,
      modelStartDate: modelStartDate.value,
      transferFrequency: transferFrequency.value,
      weeklySurplus: weeklySurplus.value
    }
  }

  // Calculate goal timeline with surplus allocation
  async function calculateGoalTimeline(weeklySurplus) {
    try {
      const { goalAPI } = await import('@/api/client')
      const response = await goalAPI.calculateTimeline({ weeklySurplus })
      return response
    } catch (error) {
      console.error('Error calculating goal timeline:', error)
      throw error
    }
  }

  // Create transfer schedules from goal timeline
  async function createGoalTransfers(timelineData, sourceAccountId) {
    try {
      const { goalAPI } = await import('@/api/client')
      const response = await goalAPI.createTransfers({ timelineData, sourceAccountId })
      return response
    } catch (error) {
      console.error('Error creating goal transfers:', error)
      throw error
    }
  }

  return {
    // State
    budgetId,
    budgetName,
    setAsDefault,
    payType,
    payAmount,
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
    expenseCount,
    accounts,
    accountCount,
    savingsTarget,
    savingsDeadline,
    investSavings,
    interestRate,
    modelWeeks,
    modelStartDate,
    transferFrequency,
    weeklySurplus,
    results,
    hasCalculated,

    // Computed
    totalExpenses,
    totalAccountAllocations,
    weeklyGrossIncome,
    weeklyNetIncome,
    weeklyDiscretionary,

    // Actions
    addExpense,
    removeExpense,
    updateExpense,
    addAccount,
    removeAccount,
    updateAccount,
    addSubAccount,
    removeSubAccount,
    updateSubAccount,
    findAccountById,
    migrateExpensesToSubAccounts,
    setResults,
    clearResults,
    reset,
    calculate,
    calculateWeeklyRequirements,
    calculateEquilibriumTransfer,
    calculateCatchUpSchedule,
    calculateGoalTimeline,
    createGoalTransfers,
    loadBudgetData,
    getBudgetData
  }
})
