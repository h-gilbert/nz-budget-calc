import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { transferAPI, automationAPI, paymentAPI } from '@/api/client'

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

  // Expense Groups (for visual organization)
  const expenseGroups = ref([])
  const expenseGroupCount = ref(0)

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

  // Automation state
  const automationState = ref({
    lastTransferDate: null,
    lastExpenseCheckDate: null,
    autoTransferEnabled: true,
    autoExpenseEnabled: true
  })

  const pendingActions = ref({
    transfer: null,
    expenses: [],
    hasActions: false
  })

  const recentPayments = ref([])

  // Helper function to calculate weeks until a date
  function weeksUntilDate(dateStr) {
    if (!dateStr) return 1 // Default to 1 week if no date
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const targetDate = new Date(dateStr)
    targetDate.setHours(0, 0, 0, 0)
    const diffTime = targetDate - today
    const diffWeeks = Math.ceil(diffTime / (7 * 24 * 60 * 60 * 1000))
    return Math.max(1, diffWeeks) // At least 1 week
  }

  // Helper function to convert expense amount to weekly equivalent
  function getWeeklyAmount(expense) {
    const amount = parseFloat(expense.amount) || 0
    const frequency = expense.frequency || 'weekly'

    if (frequency === 'one-off') {
      // Spread one-off expense across weeks until due date
      const weeks = weeksUntilDate(expense.date)
      return amount / weeks
    } else if (frequency === 'monthly') {
      return amount / 4.33
    } else if (frequency === 'fortnightly') {
      return amount / 2
    } else if (frequency === 'annually') {
      return amount / 52
    }
    return amount // weekly
  }

  // Computed
  const totalExpenses = computed(() => {
    return expenses.value.reduce((total, expense) => {
      return total + getWeeklyAmount(expense)
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

  // Estimated annual income (for IETC eligibility check)
  const estimatedAnnualIncome = computed(() => {
    let weeklyGross = payAmount.value || 0

    if (payType.value === 'hourly') {
      weeklyGross = payAmount.value * (fixedHours.value || 40)
    } else if (payType.value === 'fortnightly') {
      weeklyGross = payAmount.value / 2
    } else if (payType.value === 'monthly') {
      weeklyGross = payAmount.value / 4.33
    } else if (payType.value === 'annually') {
      weeklyGross = payAmount.value / 52
    }

    return weeklyGross * 52
  })

  // Check if income is within IETC eligible range ($24,000 - $70,000)
  const isIetcIncomeEligible = computed(() => {
    const income = estimatedAnnualIncome.value
    return income >= 24000 && income <= 70000
  })

  // Group expenses by groupId for display
  const groupedExpenses = computed(() => {
    const grouped = {}

    // Initialize groups from expenseGroups
    for (const group of expenseGroups.value) {
      grouped[group.id] = {
        ...group,
        expenses: [],
        totalBalance: 0,
        totalWeekly: 0
      }
    }

    // Add ungrouped category
    grouped['ungrouped'] = {
      id: 'ungrouped',
      name: 'Other / Ungrouped',
      color: '#9E9E9E',
      order: 999,
      expenses: [],
      totalBalance: 0,
      totalWeekly: 0
    }

    // Sort expenses into groups
    for (const expense of expenses.value) {
      const groupId = expense.groupId || 'ungrouped'
      if (grouped[groupId]) {
        grouped[groupId].expenses.push(expense)
        grouped[groupId].totalBalance += expense.sub_account?.balance || 0
        grouped[groupId].totalWeekly += getWeeklyAmount(expense)
      } else {
        // Group was deleted, put in ungrouped
        grouped['ungrouped'].expenses.push(expense)
        grouped['ungrouped'].totalBalance += expense.sub_account?.balance || 0
        grouped['ungrouped'].totalWeekly += getWeeklyAmount(expense)
      }
    }

    // Convert to sorted array, only include groups with expenses or defined groups
    return Object.values(grouped)
      .filter(g => g.expenses.length > 0 || g.id !== 'ungrouped')
      .sort((a, b) => a.order - b.order)
  })

  // Get a flat list of group options for dropdown
  const groupOptions = computed(() => {
    return [
      { id: null, name: '(No Group)' },
      ...expenseGroups.value.map(g => ({ id: g.id, name: g.name }))
    ]
  })

  // Actions
  function addExpense() {
    expenseCount.value++
    const expenseId = `expense-${expenseCount.value}`

    // Create the expense with embedded virtual sub_account
    const newExpense = {
      id: expenseId,
      name: '',
      amount: 0,
      frequency: 'weekly',
      sub_account: {
        balance: 0
      }
    }
    expenses.value.unshift(newExpense)
  }

  function removeExpense(id) {
    const expense = expenses.value.find(e => e.id === id)
    if (!expense) return

    // Return any allocated balance back to the expense account
    if (expense.sub_account && expense.sub_account.balance > 0) {
      const expenseAccount = accounts.value.find(a => a.isExpenseAccount)
      if (expenseAccount) {
        expenseAccount.balance = (expenseAccount.balance || 0) + expense.sub_account.balance
      }
    }

    // Remove the expense (virtual sub_account is automatically removed with it)
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
      // Virtual sub_account is embedded - name updates automatically with expense.name
    }
  }

  // Update sub_account balance for a specific expense
  function updateExpenseSubAccountBalance(expenseId, balance) {
    const expense = expenses.value.find(e => e.id === expenseId)
    if (expense && expense.sub_account) {
      expense.sub_account.balance = parseFloat(balance) || 0
    }
  }

  // ============================================
  // EXPENSE GROUP ACTIONS
  // ============================================

  // Add a new expense group
  function addExpenseGroup(name = '', color = '#4CAF50') {
    expenseGroupCount.value++
    const newGroup = {
      id: `group-${Date.now()}-${expenseGroupCount.value}`,
      name,
      color,
      order: expenseGroups.value.length + 1
    }
    expenseGroups.value.push(newGroup)
    return newGroup
  }

  // Update an expense group
  function updateExpenseGroup(groupId, updates) {
    const group = expenseGroups.value.find(g => g.id === groupId)
    if (group) {
      Object.assign(group, updates)
    }
  }

  // Remove an expense group (moves expenses to ungrouped)
  function removeExpenseGroup(groupId) {
    // Unassign all expenses from this group
    expenses.value.forEach(expense => {
      if (expense.groupId === groupId) {
        expense.groupId = null
      }
    })

    // Remove the group
    const index = expenseGroups.value.findIndex(g => g.id === groupId)
    if (index > -1) {
      expenseGroups.value.splice(index, 1)
    }
  }

  // Assign expense to group
  function assignExpenseToGroup(expenseId, groupId) {
    const expense = expenses.value.find(e => e.id === expenseId)
    if (expense) {
      expense.groupId = groupId || null // null for ungrouped
    }
  }

  // Reorder expense groups
  function reorderExpenseGroups(newOrder) {
    expenseGroups.value = newOrder.map((id, index) => {
      const group = expenseGroups.value.find(g => g.id === id)
      return { ...group, order: index + 1 }
    })
  }

  // Allocate money from expense account to an expense's sub_account
  function allocateToExpense(expenseId, amount) {
    const expense = expenses.value.find(e => e.id === expenseId)
    const expenseAccount = accounts.value.find(a => a.isExpenseAccount)

    if (!expense || !expenseAccount || !expense.sub_account) return false

    const allocateAmount = parseFloat(amount) || 0
    if (allocateAmount <= 0) return false
    if (expenseAccount.balance < allocateAmount) return false

    expenseAccount.balance -= allocateAmount
    expense.sub_account.balance += allocateAmount
    return true
  }

  // Deallocate money from expense's sub_account back to expense account
  function deallocateFromExpense(expenseId, amount) {
    const expense = expenses.value.find(e => e.id === expenseId)
    const expenseAccount = accounts.value.find(a => a.isExpenseAccount)

    if (!expense || !expenseAccount || !expense.sub_account) return false

    const deallocateAmount = parseFloat(amount) || 0
    if (deallocateAmount <= 0) return false
    if (expense.sub_account.balance < deallocateAmount) return false

    expense.sub_account.balance -= deallocateAmount
    expenseAccount.balance += deallocateAmount
    return true
  }

  // Calculate target balance for an expense's sub-account
  // This is how much should ideally be in the sub-account to cover the next occurrence
  function calculateTargetBalance(expense) {
    const amount = parseFloat(expense.amount) || 0
    const frequency = expense.frequency || 'weekly'

    if (frequency === 'weekly') {
      // Weekly expenses: need 1 week's worth
      return amount
    } else if (frequency === 'fortnightly') {
      // Fortnightly: need 2 weeks' worth
      return amount
    } else if (frequency === 'monthly') {
      // Monthly: need full monthly amount
      return amount
    } else if (frequency === 'annually') {
      // Annual: need full annual amount
      return amount
    } else if (frequency === 'one-off') {
      // One-off: need full amount
      return amount
    }
    return amount
  }

  // Calculate how much to allocate to an expense this week
  // Returns 0 if overfunded, otherwise returns the weekly portion needed
  function calculateWeeklyAllocation(expense) {
    const currentBalance = parseFloat(expense.sub_account?.balance) || 0
    const targetBalance = calculateTargetBalance(expense)
    const weeklyNeed = getWeeklyAmount(expense)

    // If already at or above target, skip allocation (overfunded)
    if (currentBalance >= targetBalance) {
      return 0
    }

    // Calculate deficit
    const deficit = targetBalance - currentBalance

    // Only allocate up to the deficit or the weekly need, whichever is smaller
    return Math.min(weeklyNeed, deficit)
  }

  // Calculate the weekly allocation needed to reach target 1 week BEFORE due date
  // This ensures funds are ready ahead of time for scheduled expenses
  // Returns at minimum the equilibrium amount, but MORE if behind schedule on a dated expense
  function calculateTargetDateAwareWeeklyNeed(expense) {
    const currentBalance = parseFloat(expense.sub_account?.balance) || 0
    const targetBalance = calculateTargetBalance(expense)
    const frequency = expense.frequency || 'weekly'
    const equilibriumAmount = getWeeklyAmount(expense)

    // For weekly expenses, always return equilibrium - they're always "due"
    if (frequency === 'weekly') {
      return equilibriumAmount
    }

    // For fortnightly, always return equilibrium
    if (frequency === 'fortnightly') {
      return equilibriumAmount
    }

    // For expenses with specific due dates (monthly, annually, one-off)
    if (expense.date && (frequency === 'annually' || frequency === 'monthly' || frequency === 'one-off')) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Parse the due date
      let dueDate = new Date(expense.date)
      dueDate.setHours(0, 0, 0, 0)

      // For monthly recurring expenses, find the NEXT occurrence
      if (frequency === 'monthly') {
        // If the due date has passed this month, move to next month
        if (dueDate <= today) {
          dueDate = new Date(today.getFullYear(), today.getMonth() + 1, dueDate.getDate())
        }
        // If still in the past (e.g., day already passed this month), go to next month
        if (dueDate <= today) {
          dueDate.setMonth(dueDate.getMonth() + 1)
        }
      }

      // For annual expenses, if the date has passed this year, it's next year
      if (frequency === 'annually' && dueDate <= today) {
        dueDate.setFullYear(dueDate.getFullYear() + 1)
      }

      // Target: 1 week (7 days) before due date
      const targetDate = new Date(dueDate)
      targetDate.setDate(targetDate.getDate() - 7)

      // Calculate weeks until target date
      const diffTime = targetDate - today
      const diffWeeks = Math.ceil(diffTime / (7 * 24 * 60 * 60 * 1000))
      const weeksRemaining = Math.max(1, diffWeeks) // At least 1 week

      // Calculate deficit (can be negative if overfunded)
      const deficit = targetBalance - currentBalance

      // If underfunded, calculate catch-up amount needed
      if (deficit > 0) {
        const requiredWeeklyAllocation = deficit / weeksRemaining
        // Return the HIGHER of catch-up or equilibrium (urgency boost)
        return Math.max(requiredWeeklyAllocation, equilibriumAmount)
      }

      // If at or above target, still return equilibrium to maintain buffer
      return equilibriumAmount
    }

    // Default: fall back to equilibrium-based allocation
    return equilibriumAmount
  }

  // Auto-allocate a transfer amount across all expense sub-accounts
  // Uses TARGET-DATE-AWARE allocation to ensure expenses are funded 1 week before due
  // Distributes proportionally based on deadline-adjusted weekly needs
  function autoAllocateTransfer(transferAmount) {
    const expenseAccount = accounts.value.find(a => a.isExpenseAccount)
    if (!expenseAccount) {
      return { success: false, error: 'No expense account found', allocations: [] }
    }

    const amount = parseFloat(transferAmount) || 0
    if (amount <= 0) {
      return { success: false, error: 'Invalid transfer amount', allocations: [] }
    }

    // Calculate total weekly need using TARGET-DATE-AWARE allocation
    // This ensures expenses approaching their due date get priority funding
    let totalWeeklyNeed = 0
    const expenseData = []

    for (const expense of expenses.value) {
      // Use target-date-aware calculation instead of simple equilibrium
      const targetDateAwareNeed = calculateTargetDateAwareWeeklyNeed(expense)
      const equilibriumNeed = getWeeklyAmount(expense)

      // Use the higher of target-date-aware or equilibrium (ensures we never under-allocate)
      const weeklyNeed = Math.max(targetDateAwareNeed, equilibriumNeed)

      if (weeklyNeed > 0) {
        expenseData.push({
          expense,
          expenseId: expense.id,
          expenseName: expense.description || expense.name,
          groupId: expense.groupId || 'ungrouped',
          weeklyNeed,
          targetDateAwareNeed,
          equilibriumNeed,
          currentBalance: expense.sub_account?.balance || 0,
          targetBalance: calculateTargetBalance(expense),
          allocated: 0
        })
        totalWeeklyNeed += weeklyNeed
      }
    }

    // If no expenses with needs, all goes to unallocated
    if (totalWeeklyNeed === 0) {
      expenseAccount.balance += amount
      return {
        success: true,
        allocations: [],
        unallocated: amount,
        message: 'No expenses to allocate to'
      }
    }

    // Distribute transfer proportionally based on target-date-aware weekly needs
    // This gives higher priority to expenses approaching their due dates
    const allocations = []
    let totalAllocated = 0

    for (let i = 0; i < expenseData.length; i++) {
      const data = expenseData[i]

      // Calculate proportional share (last expense gets remainder to avoid rounding issues)
      let allocation
      if (i === expenseData.length - 1) {
        allocation = amount - totalAllocated
      } else {
        allocation = Math.floor((data.weeklyNeed / totalWeeklyNeed) * amount * 100) / 100
      }

      // No cap - allow allocations beyond target to build "week ahead" buffer
      // Previously capped at deficit, but users need up to 2x target for week-ahead funding
      data.allocated = allocation

      // Apply allocation to expense sub-account
      if (data.expense && data.expense.sub_account) {
        data.expense.sub_account.balance += allocation
        totalAllocated += allocation
      }

      // Add to allocations array for return value
      allocations.push({
        expenseId: data.expenseId,
        expenseName: data.expenseName,
        groupId: data.groupId,
        needed: data.weeklyNeed,
        targetDateAwareNeed: data.targetDateAwareNeed,
        equilibriumNeed: data.equilibriumNeed,
        currentBalance: data.currentBalance,
        targetBalance: data.targetBalance,
        allocated: data.allocated
      })
    }

    // Any remaining unallocated funds go to the expense account buffer
    const unallocated = amount - totalAllocated
    if (unallocated > 0) {
      expenseAccount.balance += unallocated
    }

    return {
      success: true,
      allocations,
      totalAllocated,
      unallocated,
      totalNeeded: totalWeeklyNeed,
      message: 'Funds distributed using target-date-aware allocation (1 week early)'
    }
  }

  // Calculate effective equilibrium using target-date-aware allocation
  // This accounts for both overfunded accounts AND upcoming deadlines
  function calculateEffectiveEquilibrium() {
    let effectiveTotal = 0
    for (const expense of expenses.value) {
      const targetDateAwareNeed = calculateTargetDateAwareWeeklyNeed(expense)
      const equilibriumNeed = getWeeklyAmount(expense)
      // Use the higher of target-date-aware or equilibrium
      effectiveTotal += Math.max(targetDateAwareNeed, equilibriumNeed)
    }
    return effectiveTotal
  }

  // Calculate the target-date-aware equilibrium (sum of all deadline-adjusted needs)
  // This is the minimum transfer needed to ensure all expenses are funded 1 week early
  function calculateTargetDateAwareEquilibrium() {
    let total = 0
    for (const expense of expenses.value) {
      const targetDateAwareNeed = calculateTargetDateAwareWeeklyNeed(expense)
      const equilibriumNeed = getWeeklyAmount(expense)
      total += Math.max(targetDateAwareNeed, equilibriumNeed)
    }
    return total
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

    expenseGroups.value = []
    expenseGroupCount.value = 0

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

        // Handle virtual sub_account (new format has embedded sub_account)
        const subAccount = expense.sub_account || { balance: 0 }

        const transformed = {
          id: expense.id || `expense-${Date.now()}-${index}`,
          name: expense.description || '',
          amount: parseFloat(expense.amount) || 0,
          frequency,
          date: expense.date || null,
          groupId: expense.groupId || null,
          sub_account: {
            balance: parseFloat(subAccount.balance) || 0
          }
        }

        return transformed
      })
      expenseCount.value = expenses.value.length
    }

    // Load expense groups
    const backendExpenseGroups = data.expenseGroups || []
    if (Array.isArray(backendExpenseGroups)) {
      expenseGroups.value = backendExpenseGroups.map((group, index) => ({
        id: group.id || `group-${Date.now()}-${index}`,
        name: group.name || '',
        color: group.color || '#4CAF50',
        order: group.order || index + 1
      }))
      expenseGroupCount.value = expenseGroups.value.length
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

    // Get starting balance from expense account plus all virtual sub-account balances
    let startingBalance = parseFloat(expenseAccount.balance) || 0

    // Add all virtual sub-account balances (embedded in expenses)
    const totalSubAccountBalance = expenses.value.reduce((total, expense) => {
      return total + (parseFloat(expense.sub_account?.balance) || 0)
    }, 0)
    startingBalance += totalSubAccountBalance

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

    // Calculate week-ahead deficit for each expense
    // For weekly expenses: need 2x weekly amount (this week + next week ready)
    // For dated expenses: need full target amount by 1 week before due date
    let totalWeekAheadDeficit = 0
    for (const expense of expenses.value) {
      const currentBalance = parseFloat(expense.sub_account?.balance) || 0
      const weeklyAmount = getWeeklyAmount(expense)
      const frequency = expense.frequency || 'weekly'

      let targetForWeekAhead
      if (frequency === 'weekly' || frequency === 'fortnightly') {
        // Weekly/fortnightly: need 2x the weekly amount
        targetForWeekAhead = weeklyAmount * 2
      } else {
        // Dated expenses: use existing target (already accounts for due date)
        targetForWeekAhead = calculateTargetBalance(expense)
      }

      const deficit = Math.max(0, targetForWeekAhead - currentBalance)
      totalWeekAheadDeficit += deficit
    }

    // Calculate catch-up schedule
    const schedule = []
    let currentBalance = startingBalance
    let equilibriumReached = false
    let equilibriumWeek = null
    let cumulativeCatchUpPaid = 0

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
        // Simulate all remaining weeks with equilibrium-only transfers
        // to find the maximum deficit we'd face
        let maxDeficit = 0
        let testBalance = balanceAfterExpenses + equilibriumTransfer

        for (let i = weekIndex + 1; i < weeklyRequirements.length; i++) {
          const futureWeek = weeklyRequirements[i]
          testBalance -= futureWeek.totalExpensesDue

          // Check minimum required balance (0 for normal, next week's expenses for week-ahead)
          let minRequiredBalance = 0
          if (isWeekAhead && i + 1 < weeklyRequirements.length) {
            minRequiredBalance = weeklyRequirements[i + 1].totalExpensesDue
          }

          // Track the worst deficit across all remaining weeks
          if (testBalance < minRequiredBalance) {
            const deficit = minRequiredBalance - testBalance
            if (deficit > maxDeficit) {
              maxDeficit = deficit
            }
          }
          testBalance += equilibriumTransfer
        }

        // Calculate remaining week-ahead deficit (accounts still need to reach 2x)
        const remainingWeekAheadDeficit = Math.max(0, totalWeekAheadDeficit - cumulativeCatchUpPaid)

        // Need catch-up if EITHER:
        // 1. We'd face a balance deficit in future weeks, OR
        // 2. We haven't paid enough catch-up for all accounts to reach their week-ahead targets
        const totalDeficit = Math.max(maxDeficit, remainingWeekAheadDeficit)

        if (totalDeficit > 0) {
          // Need to catch up - transfer equilibrium + deficit (capped to max catch-up extra)
          const catchUpExtra = Math.min(totalDeficit, maxCatchUpExtra)
          transferAmount = equilibriumTransfer + catchUpExtra
          cumulativeCatchUpPaid += catchUpExtra
        } else {
          // No deficit AND all accounts at week-ahead target - true equilibrium reached
          equilibriumReached = true
          equilibriumWeek = weekIndex + 1
          transferAmount = equilibriumTransfer
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
    // Now includes embedded sub_account (virtual sub-account model)
    const transformedExpenses = expenses.value.map(expense => {
      // Normalize 'annually' to 'annual' for backend
      let period = expense.frequency || expense.period || 'weekly'
      if (period === 'annually') period = 'annual'

      return {
        id: expense.id,
        description: expense.name || expense.description || '',
        amount: expense.amount || 0,
        period,
        date: expense.date || null,
        dayOfWeek: null,
        dayOfMonth: null,
        groupId: expense.groupId || null,
        sub_account: {
          balance: expense.sub_account?.balance || 0
        }
      }
    })

    // Transform accounts - expense account no longer has sub_accounts (they're embedded in expenses)
    const transformedAccounts = accounts.value.map(account => {
      const accountCopy = { ...account }
      // Clear sub_accounts from expense account (virtual sub-accounts are now in expenses)
      if (accountCopy.isExpenseAccount) {
        accountCopy.sub_accounts = []
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
      expenseGroups: expenseGroups.value,
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

  // ============================================
  // AUTOMATION FUNCTIONS
  // ============================================

  // Load automation state from backend
  async function loadAutomationState() {
    try {
      const state = await automationAPI.getState()
      automationState.value = {
        lastTransferDate: state.lastTransferDate,
        lastExpenseCheckDate: state.lastExpenseCheckDate,
        autoTransferEnabled: state.autoTransferEnabled,
        autoExpenseEnabled: state.autoExpenseEnabled
      }
      return automationState.value
    } catch (error) {
      console.error('Error loading automation state:', error)
      throw error
    }
  }

  // Update automation state on backend
  async function updateAutomationState(updates) {
    try {
      await automationAPI.updateState(updates)
      // Update local state
      Object.assign(automationState.value, updates)
    } catch (error) {
      console.error('Error updating automation state:', error)
      throw error
    }
  }

  // Check for pending automation actions
  async function checkPendingActions() {
    try {
      const pending = await automationAPI.getPending()
      pendingActions.value = {
        transfer: pending.pendingTransfer,
        expenses: pending.pendingExpenses || [],
        hasActions: pending.hasActions
      }
      return pendingActions.value
    } catch (error) {
      console.error('Error checking pending actions:', error)
      throw error
    }
  }

  // Get Monday of a given week
  function getMonday(date) {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d
  }

  // Helper to get day of month from expense (uses dueDate if set, otherwise extracts from date field)
  function getDueDayOfMonth(expense) {
    if (expense.dueDate !== undefined) return expense.dueDate
    if (expense.date) {
      const d = new Date(expense.date)
      return d.getDate()
    }
    return 1 // Default to 1st of month
  }

  // Calculate next due date for an expense
  function calculateNextDueDate(expense, fromDate = new Date()) {
    const from = new Date(fromDate)
    const frequency = expense.frequency || 'weekly'
    const dueDay = expense.dueDay !== undefined ? expense.dueDay : 1 // Default Monday
    const dueDateOfMonth = getDueDayOfMonth(expense)

    switch (frequency) {
      case 'weekly': {
        const result = new Date(from)
        const currentDay = result.getDay()
        let daysUntil = dueDay - currentDay
        if (daysUntil <= 0) daysUntil += 7
        result.setDate(result.getDate() + daysUntil)
        return result
      }
      case 'fortnightly': {
        const result = new Date(from)
        const currentDay = result.getDay()
        let daysUntil = dueDay - currentDay
        if (daysUntil <= 0) daysUntil += 7
        result.setDate(result.getDate() + daysUntil)
        return result
      }
      case 'monthly': {
        const result = new Date(from)
        result.setDate(dueDateOfMonth)
        if (result <= from) {
          result.setMonth(result.getMonth() + 1)
        }
        return result
      }
      case 'annually':
      case 'one-off':
        if (expense.date) {
          const targetDate = new Date(expense.date)
          if (targetDate > from) return targetDate
        }
        return null
      default:
        return null
    }
  }

  // Calculate due dates between two dates for an expense
  function calculateDueDatesBetween(expense, startDate, endDate) {
    const dueDates = []
    const start = new Date(startDate)
    const end = new Date(endDate)
    const frequency = expense.frequency || 'weekly'
    const dueDay = expense.dueDay !== undefined ? expense.dueDay : 1
    const dueDateOfMonth = getDueDayOfMonth(expense)

    if (frequency === 'weekly') {
      let current = calculateNextDueDate(expense, start)
      while (current && current <= end) {
        dueDates.push(new Date(current))
        current.setDate(current.getDate() + 7)
      }
    } else if (frequency === 'fortnightly') {
      let current = calculateNextDueDate(expense, start)
      while (current && current <= end) {
        dueDates.push(new Date(current))
        current.setDate(current.getDate() + 14)
      }
    } else if (frequency === 'monthly') {
      let current = new Date(start)
      current.setDate(dueDateOfMonth)
      if (current <= start) {
        current.setMonth(current.getMonth() + 1)
      }
      while (current <= end) {
        dueDates.push(new Date(current))
        current.setMonth(current.getMonth() + 1)
      }
    } else if (frequency === 'annually' || frequency === 'one-off') {
      if (expense.date) {
        const targetDate = new Date(expense.date)
        if (targetDate > start && targetDate <= end) {
          dueDates.push(targetDate)
        }
      }
    }

    return dueDates
  }

  // Process a single expense payment
  async function processExpensePayment(expenseId, options = {}) {
    const expense = expenses.value.find(e => e.id === expenseId)
    if (!expense) throw new Error('Expense not found')

    const amount = options.amount !== undefined ? options.amount : expense.amount
    const balanceBefore = expense.sub_account?.balance || 0

    // Deduct from sub-account (allow negative)
    if (!expense.sub_account) {
      expense.sub_account = { balance: 0 }
    }
    expense.sub_account.balance -= amount
    const balanceAfter = expense.sub_account.balance

    // If sub-account went negative and there's unallocated funds, use them
    if (balanceAfter < 0) {
      const expenseAccount = accounts.value.find(a => a.isExpenseAccount)
      if (expenseAccount && expenseAccount.balance > 0) {
        const borrowAmount = Math.min(Math.abs(balanceAfter), expenseAccount.balance)
        expenseAccount.balance -= borrowAmount
        expense.sub_account.balance += borrowAmount
      }
    }

    // Record payment in backend
    try {
      const response = await paymentAPI.recordPayment(expenseId, {
        amount,
        dueDate: options.dueDate || formatDateLocal(new Date()),
        paymentType: options.paymentType || 'automatic',
        notes: options.notes || '',
        balanceBefore,
        balanceAfter: expense.sub_account.balance
      })
      return response
    } catch (error) {
      console.error('Error recording payment:', error)
      throw error
    }
  }

  // Skip a scheduled expense payment
  async function skipExpensePayment(expenseId, reason = '') {
    const expense = expenses.value.find(e => e.id === expenseId)
    if (!expense) throw new Error('Expense not found')

    try {
      const response = await paymentAPI.skipPayment(expenseId, {
        dueDate: formatDateLocal(new Date()),
        reason
      })
      return response
    } catch (error) {
      console.error('Error skipping payment:', error)
      throw error
    }
  }

  // Process all pending automation actions
  async function processAutomation() {
    const today = new Date()
    const todayStr = formatDateLocal(today)
    const results = {
      transfersProcessed: [],
      expensesProcessed: [],
      errors: []
    }

    // Load current state if not loaded
    if (!automationState.value.lastTransferDate && !automationState.value.lastExpenseCheckDate) {
      await loadAutomationState()
    }

    // 1. Process weekly transfer if it's a new week and auto-transfer is enabled
    if (automationState.value.autoTransferEnabled) {
      const lastTransfer = automationState.value.lastTransferDate
      const lastMonday = lastTransfer ? getMonday(new Date(lastTransfer)) : new Date(0)
      const thisMonday = getMonday(today)

      if (thisMonday > lastMonday) {
        try {
          // Calculate transfer amount using equilibrium
          const equilibrium = totalExpenses.value

          // Execute auto-allocation
          const allocationResult = autoAllocateTransfer(equilibrium)

          results.transfersProcessed.push({
            weekDate: formatDateLocal(thisMonday),
            amount: equilibrium,
            allocations: allocationResult.allocations,
            unallocated: allocationResult.unallocated
          })

          // Update last transfer date
          await updateAutomationState({
            lastTransferDate: formatDateLocal(thisMonday)
          })
        } catch (error) {
          results.errors.push({ type: 'transfer', error: error.message })
        }
      }
    }

    // 2. Process due expenses if auto-expense is enabled
    if (automationState.value.autoExpenseEnabled) {
      const lastCheckDate = automationState.value.lastExpenseCheckDate
        ? new Date(automationState.value.lastExpenseCheckDate)
        : new Date(0)

      for (const expense of expenses.value) {
        if (expense.autoPayEnabled === false) continue

        const dueDates = calculateDueDatesBetween(expense, lastCheckDate, today)

        for (const dueDate of dueDates) {
          try {
            const paymentResult = await processExpensePayment(expense.id, {
              dueDate: formatDateLocal(dueDate),
              paymentType: 'automatic'
            })
            results.expensesProcessed.push({
              expenseId: expense.id,
              expenseName: expense.name,
              amount: expense.amount,
              dueDate: formatDateLocal(dueDate),
              payment: paymentResult
            })
          } catch (error) {
            results.errors.push({
              type: 'expense',
              expenseId: expense.id,
              expenseName: expense.name,
              error: error.message
            })
          }
        }
      }

      // Update last expense check date
      await updateAutomationState({
        lastExpenseCheckDate: todayStr
      })
    }

    // Refresh pending actions
    await checkPendingActions()

    return results
  }

  // Load payment history
  async function loadPaymentHistory(options = {}) {
    try {
      const response = await paymentAPI.getHistory(options)
      recentPayments.value = response.payments
      return response
    } catch (error) {
      console.error('Error loading payment history:', error)
      throw error
    }
  }

  // Toggle auto-transfer setting
  async function toggleAutoTransfer(enabled) {
    await updateAutomationState({ autoTransferEnabled: enabled })
  }

  // Toggle auto-expense payment setting
  async function toggleAutoExpense(enabled) {
    await updateAutomationState({ autoExpenseEnabled: enabled })
  }

  // Migrate expenses to ensure they all have sub_account objects
  function migrateExpensesToSubAccounts() {
    for (const expense of expenses.value) {
      if (!expense.sub_account) {
        expense.sub_account = { balance: 0 }
      }
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
    expenseGroups,
    expenseGroupCount,
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

    // Automation state
    automationState,
    pendingActions,
    recentPayments,

    // Computed
    totalExpenses,
    totalAccountAllocations,
    weeklyGrossIncome,
    weeklyNetIncome,
    weeklyDiscretionary,
    estimatedAnnualIncome,
    isIetcIncomeEligible,
    groupedExpenses,
    groupOptions,

    // Helper functions (exposed for use in components)
    getWeeklyAmount,
    weeksUntilDate,
    calculateTargetBalance,
    calculateWeeklyAllocation,
    calculateEffectiveEquilibrium,
    calculateTargetDateAwareWeeklyNeed,
    calculateTargetDateAwareEquilibrium,

    // Actions
    addExpense,
    removeExpense,
    updateExpense,
    updateExpenseSubAccountBalance,
    addExpenseGroup,
    updateExpenseGroup,
    removeExpenseGroup,
    assignExpenseToGroup,
    reorderExpenseGroups,
    allocateToExpense,
    deallocateFromExpense,
    autoAllocateTransfer,
    addAccount,
    removeAccount,
    updateAccount,
    findAccountById,
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
    getBudgetData,

    // Automation actions
    loadAutomationState,
    updateAutomationState,
    checkPendingActions,
    processAutomation,
    processExpensePayment,
    skipExpensePayment,
    loadPaymentHistory,
    toggleAutoTransfer,
    toggleAutoExpense,
    migrateExpensesToSubAccounts,
    calculateNextDueDate,
    calculateDueDatesBetween
  }
})
