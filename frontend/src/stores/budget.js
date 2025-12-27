import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { budgetAPI, transactionAPI, transferAPI } from '@/api/client'

// localStorage key for persisting budget data before login
const LOCAL_STORAGE_KEY = 'nz-budget-calculator-data'

// Helper function to format date as YYYY-MM-DD in local time (not UTC)
function formatDateLocal(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper function to parse YYYY-MM-DD string to local midnight (not UTC)
// new Date('2025-01-15') creates UTC midnight which shifts the date in NZ timezone
// This function creates local midnight instead
function parseDateLocal(dateStr) {
  if (!dateStr) return null
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  d.setHours(0, 0, 0, 0)
  return d
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
  const incomeMode = ref('gross') // 'gross' or 'net' - whether user is entering pre-tax or post-tax amount
  const payType = ref('annually') // Period: weekly, fortnightly, monthly, annually
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

  const recentPayments = ref([])

  // Transaction state
  const transactions = ref([])
  const transactionsTotal = ref(0)
  const upcomingItems = ref([])
  const budgetSummary = ref({ summaries: [], total_budget: 0, total_actual: 0, total_variance: 0 })
  const transactionsLoading = ref(false)

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

  // Actions
  function addExpense() {
    expenseCount.value++
    const expenseId = `expense-${expenseCount.value}`

    // Create the expense with accountId link
    const newExpense = {
      id: expenseId,
      name: '',
      amount: 0,
      frequency: 'weekly',
      dueDay: 1, // Monday for weekly, 1st for monthly
      dueDate: null, // For annual/one-off/fortnightly reference
      accountId: null, // Link to account that pays this expense
      paymentMode: 'automatic', // 'automatic' or 'manual'
      expenseType: 'bill' // 'bill' (has due dates) or 'budget' (envelope-style, no due date)
    }
    expenses.value.unshift(newExpense)
  }

  // Helper to check if expense is budget envelope type
  function isBudgetEnvelope(expense) {
    return expense.expenseType === 'budget'
  }

  function removeExpense(id) {
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
    }
  }

  // Get weekly load for a specific account (sum of linked expenses)
  function getAccountWeeklyLoad(accountId) {
    return expenses.value
      .filter(e => e.accountId === accountId)
      .reduce((sum, e) => sum + getWeeklyAmount(e), 0)
  }

  // Get expenses linked to a specific account
  function getExpensesForAccount(accountId) {
    return expenses.value.filter(e => e.accountId === accountId)
  }

  function addAccount() {
    accountCount.value++
    accounts.value.unshift({
      id: `account-${accountCount.value}`,
      name: '',
      balance: 0,
      accelerationAmount: 0,
      accelerationBufferWeeks: 0 // Extra weeks to continue accelerating after equilibrium
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
      // Handle NaN values for numeric fields
      if ((field === 'balance' || field === 'accelerationAmount' || field === 'accelerationBufferWeeks') && (isNaN(value) || value === null || value === undefined)) {
        account[field] = 0
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

    incomeMode.value = 'gross'
    payType.value = 'annually'
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

  // ============================================
  // PURE TAX CALCULATION FUNCTIONS
  // ============================================

  // Convert amount to weekly based on period
  function normalizeToWeekly(amount, period) {
    const value = parseFloat(amount) || 0
    switch (period) {
      case 'weekly': return value
      case 'fortnightly': return value / 2
      case 'monthly': return value / 4.33
      case 'annually': return value / 52
      case 'hourly': return value * (fixedHours.value || 40)
      default: return value
    }
  }

  // Convert weekly amount back to specified period
  function normalizeFromWeekly(weeklyAmount, period) {
    const value = parseFloat(weeklyAmount) || 0
    switch (period) {
      case 'weekly': return value
      case 'fortnightly': return value * 2
      case 'monthly': return value * 4.33
      case 'annually': return value * 52
      default: return value
    }
  }

  // Calculate NZ PAYE tax for a given annual income (2024-2025 brackets)
  function calculatePAYE(annualIncome) {
    if (annualIncome <= 0) return 0

    if (annualIncome <= 15600) {
      return annualIncome * 0.105
    } else if (annualIncome <= 53500) {
      return (15600 * 0.105) + ((annualIncome - 15600) * 0.175)
    } else if (annualIncome <= 78100) {
      return (15600 * 0.105) + (37900 * 0.175) + ((annualIncome - 53500) * 0.30)
    } else if (annualIncome <= 180000) {
      return (15600 * 0.105) + (37900 * 0.175) + (24600 * 0.30) + ((annualIncome - 78100) * 0.33)
    } else {
      return (15600 * 0.105) + (37900 * 0.175) + (24600 * 0.30) + (101900 * 0.33) + ((annualIncome - 180000) * 0.39)
    }
  }

  // Calculate IETC credit for a given annual income
  function calculateIETC(annualIncome, isEligible) {
    if (!isEligible) return 0
    if (annualIncome >= 24000 && annualIncome <= 66000) {
      return 520
    } else if (annualIncome > 66000 && annualIncome <= 70000) {
      const reduction = (annualIncome - 66000) * 0.13
      return Math.max(0, 520 - reduction)
    }
    return 0
  }

  // Calculate net income from gross (forward calculation)
  function calculateNetFromGross(weeklyGross, options = {}) {
    const {
      hasKiwisaver = kiwisaver.value,
      ksRate = kiwisaverRate.value,
      hasStudentLoan = studentLoan.value,
      hasIetc = ietcEligible.value,
      weeklyAllowanceAmount = 0
    } = options

    if (weeklyGross <= 0) {
      return { weeklyNet: weeklyAllowanceAmount, weeklyGross: 0, deductions: {} }
    }

    const annualIncome = weeklyGross * 52

    // PAYE Tax
    const annualTax = calculatePAYE(annualIncome)

    // ACC Levy (1.67%)
    const annualACC = annualIncome * 0.0167

    // IETC Credit
    const annualIETC = calculateIETC(annualIncome, hasIetc)

    // Weekly amounts
    const weeklyTax = (annualTax - annualIETC) / 52
    const weeklyACC = annualACC / 52
    const weeklyPAYE = weeklyTax + weeklyACC

    // KiwiSaver deduction
    const kiwisaverDeduction = hasKiwisaver ? weeklyGross * (parseFloat(ksRate) / 100) : 0

    // Student loan repayment (12% over $22,828 threshold)
    const studentLoanDeduction = hasStudentLoan && annualIncome > 22828
      ? Math.max(0, (weeklyGross - (22828 / 52)) * 0.12)
      : 0

    // Net before allowance
    const weeklyNetBeforeAllowance = weeklyGross - weeklyPAYE - kiwisaverDeduction - studentLoanDeduction

    // Final net with allowance
    const weeklyNet = weeklyNetBeforeAllowance + weeklyAllowanceAmount

    return {
      weeklyNet,
      weeklyGross,
      annualGross: annualIncome,
      annualNet: weeklyNet * 52,
      deductions: {
        tax: weeklyTax,
        acc: weeklyACC,
        paye: weeklyPAYE,
        ietc: annualIETC / 52,
        kiwisaver: kiwisaverDeduction,
        studentLoan: studentLoanDeduction,
        total: weeklyPAYE + kiwisaverDeduction + studentLoanDeduction
      }
    }
  }

  // Calculate gross income from net (reverse calculation using binary search)
  function calculateGrossFromNet(targetWeeklyNet, options = {}) {
    const {
      hasKiwisaver = kiwisaver.value,
      ksRate = kiwisaverRate.value,
      hasStudentLoan = studentLoan.value,
      hasIetc = ietcEligible.value,
      weeklyAllowanceAmount = 0
    } = options

    // Adjust target net for non-taxable allowance
    const targetNetBeforeAllowance = targetWeeklyNet - weeklyAllowanceAmount

    if (targetNetBeforeAllowance <= 0) {
      return { weeklyGross: 0, weeklyNet: weeklyAllowanceAmount, deductions: {} }
    }

    // Binary search to find gross that produces target net
    let low = targetNetBeforeAllowance  // Net is always <= gross
    let high = targetNetBeforeAllowance * 2.5  // Max ~60% deduction rate
    const tolerance = 0.01  // $0.01 accuracy
    const maxIterations = 50

    for (let i = 0; i < maxIterations; i++) {
      const mid = (low + high) / 2
      const result = calculateNetFromGross(mid, { ...options, weeklyAllowanceAmount: 0 })
      const calculatedNetBeforeAllowance = result.weeklyNet

      if (Math.abs(calculatedNetBeforeAllowance - targetNetBeforeAllowance) < tolerance) {
        // Found acceptable gross - return full calculation with allowance
        return calculateNetFromGross(mid, options)
      }

      if (calculatedNetBeforeAllowance < targetNetBeforeAllowance) {
        low = mid  // Need higher gross
      } else {
        high = mid  // Need lower gross
      }
    }

    // Return best approximation
    const finalGross = (low + high) / 2
    return calculateNetFromGross(finalGross, options)
  }

  // ============================================
  // LIVE CALCULATION COMPUTED PROPERTIES
  // ============================================

  // Get current deduction options from store state
  const currentDeductionOptions = computed(() => ({
    hasKiwisaver: kiwisaver.value,
    ksRate: kiwisaverRate.value,
    hasStudentLoan: studentLoan.value,
    hasIetc: ietcEligible.value,
    weeklyAllowanceAmount: normalizeToWeekly(allowanceAmount.value, allowanceFrequency.value)
  }))

  // Live calculation results - updates automatically as user types
  const liveCalculation = computed(() => {
    const inputAmount = parseFloat(payAmount.value) || 0
    if (inputAmount <= 0) {
      return {
        weeklyGross: 0,
        weeklyNet: 0,
        annualGross: 0,
        annualNet: 0,
        deductions: { tax: 0, acc: 0, paye: 0, ietc: 0, kiwisaver: 0, studentLoan: 0, total: 0 }
      }
    }

    const options = currentDeductionOptions.value

    if (incomeMode.value === 'gross') {
      // User entered gross - calculate net
      const weeklyGross = normalizeToWeekly(inputAmount, payType.value)
      return calculateNetFromGross(weeklyGross, options)
    } else {
      // User entered net - reverse calculate gross
      const weeklyNet = normalizeToWeekly(inputAmount, payType.value)
      return calculateGrossFromNet(weeklyNet, options)
    }
  })

  // Convenience computed properties for easy access
  const liveWeeklyGross = computed(() => liveCalculation.value.weeklyGross)
  const liveWeeklyNet = computed(() => liveCalculation.value.weeklyNet)
  const liveAnnualGross = computed(() => liveCalculation.value.annualGross)
  const liveAnnualNet = computed(() => liveCalculation.value.annualNet)
  const liveDeductions = computed(() => liveCalculation.value.deductions)

  function loadBudgetData(data) {
    // Load saved budget data into store
    budgetId.value = data.budgetId || data.budget_id || data.id || null // Track the budget ID (backend returns "budgetId")
    budgetName.value = data.budgetName || data.budget_name || ''
    setAsDefault.value = data.isDefault || data.is_default || false

    incomeMode.value = data.incomeMode || 'gross'
    payType.value = data.payType || 'annually'
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
        let frequency = expense.period || expense.frequency || 'weekly'
        if (frequency === 'annual') frequency = 'annually'

        return {
          id: expense.id || `expense-${Date.now()}-${index}`,
          name: expense.description || expense.name || '',
          amount: parseFloat(expense.amount) || 0,
          frequency,
          date: expense.date || null,
          dueDay: expense.dueDay ?? expense.due_day_of_week ?? expense.due_day_of_month ?? 1,
          dueDate: expense.dueDate || expense.due_date || null,
          accountId: expense.accountId || null,
          paymentMode: expense.paymentMode || expense.payment_mode || 'automatic',
          expenseType: expense.expenseType || expense.expense_type || 'bill'
        }
      })
      expenseCount.value = expenses.value.length
    }

    // Transform accounts (id, name, balance, accelerationAmount, accelerationBufferWeeks)
    const backendAccounts = data.accounts || []
    if (Array.isArray(backendAccounts)) {
      accounts.value = backendAccounts.map((account, index) => ({
        id: account.id || `account-${Date.now()}-${index}`,
        name: account.name || '',
        balance: parseFloat(account.balance) || 0,
        accelerationAmount: parseFloat(account.accelerationAmount) || 0,
        accelerationBufferWeeks: parseInt(account.accelerationBufferWeeks) || 0
      }))
      accountCount.value = accounts.value.length
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
    // Client-side calculation of weekly requirements
    // Returns empty array - feature removed
    return []
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
        dueDay: expense.dueDay ?? null,
        dueDate: expense.dueDate || null,
        accountId: expense.accountId || null,
        paymentMode: expense.paymentMode || 'automatic',
        expenseType: expense.expenseType || 'bill'
      }
    })

    // Transform accounts (id, name, balance, accelerationAmount, accelerationBufferWeeks)
    const transformedAccounts = accounts.value.map(account => ({
      id: account.id,
      name: account.name || '',
      balance: account.balance || 0,
      accelerationAmount: account.accelerationAmount || 0,
      accelerationBufferWeeks: account.accelerationBufferWeeks || 0
    }))

    // Get all current budget data for saving in backend format
    return {
      budgetId: budgetId.value, // Include ID for updates (backend expects 'budgetId', not 'id')
      budgetName: budgetName.value,
      setAsDefault: setAsDefault.value,
      incomeMode: incomeMode.value,
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

  // ============================================
  // LOCALSTORAGE PERSISTENCE (for unauthenticated users)
  // ============================================

  // Save current budget data to localStorage
  function saveToLocalStorage() {
    try {
      const data = getBudgetData()
      // Don't save budgetId as it's only for authenticated users
      delete data.budgetId
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.warn('Failed to save budget data to localStorage:', error)
    }
  }

  // Load budget data from localStorage
  function loadFromLocalStorage() {
    try {
      const savedData = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (savedData) {
        const data = JSON.parse(savedData)
        loadBudgetData(data)
        return true
      }
      return false
    } catch (error) {
      console.warn('Failed to load budget data from localStorage:', error)
      return false
    }
  }

  // Clear budget data from localStorage
  function clearLocalStorage() {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY)
    } catch (error) {
      console.warn('Failed to clear budget data from localStorage:', error)
    }
  }

  // Watch for changes and auto-save to localStorage (debounced)
  let saveTimeout = null
  let backendSaveTimeout = null
  function debouncedSave() {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      // Only save if there's actual data to save
      if (payAmount.value > 0 || expenses.value.length > 0 || accounts.value.length > 0) {
        saveToLocalStorage()
      }
    }, 500) // Debounce by 500ms

    // Also sync to backend if we have a budget ID (authenticated user with saved budget)
    if (budgetId.value) {
      if (backendSaveTimeout) clearTimeout(backendSaveTimeout)
      backendSaveTimeout = setTimeout(async () => {
        try {
          const data = getBudgetData()
          await budgetAPI.save(data)  // save() handles both create and update via budgetId in body
          // After saving budget, sync transfer schedules
          await syncTransferSchedules()
        } catch (error) {
          console.warn('Auto-save to backend failed:', error)
        }
      }, 1000) // Longer debounce for backend to reduce API calls
    }
  }

  // Watch key data for changes and auto-save
  watch([
    incomeMode, payType, payAmount, fixedHours,
    allowanceAmount, allowanceFrequency,
    kiwisaver, kiwisaverRate, studentLoan, ietcEligible,
    expenses, accounts
  ], debouncedSave, { deep: true })

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
      const d = parseDateLocal(expense.date)
      return d ? d.getDate() : 1
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
          const targetDate = parseDateLocal(expense.date)
          if (targetDate && targetDate > from) return targetDate
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
        const targetDate = parseDateLocal(expense.date)
        if (targetDate && targetDate > start && targetDate <= end) {
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

    // Payment recorded locally only (backend feature removed)
    return { success: true, balanceBefore, balanceAfter: expense.sub_account.balance }
  }

  // Skip a scheduled expense payment (local only)
  async function skipExpensePayment(expenseId, reason = '') {
    const expense = expenses.value.find(e => e.id === expenseId)
    if (!expense) throw new Error('Expense not found')
    return { success: true }
  }

  // Load payment history (feature removed)
  async function loadPaymentHistory(options = {}) {
    recentPayments.value = []
    return { payments: [] }
  }

  // Migrate expenses to ensure they all have sub_account objects
  function migrateExpensesToSubAccounts() {
    for (const expense of expenses.value) {
      if (!expense.sub_account) {
        expense.sub_account = { balance: 0 }
      }
    }
  }

  // ============================================
  // DASHBOARD & SMART EXPENSE PLANNING METHODS
  // ============================================

  // Get lump-sum expenses (annually, one-off) that need targeted savings
  function getLumpSumExpenses() {
    return expenses.value.filter(expense => {
      const freq = expense.frequency || 'weekly'
      return freq === 'annually' || freq === 'one-off'
    })
  }

  // Get regular recurring expenses (weekly, fortnightly, monthly)
  function getRegularExpenses() {
    return expenses.value.filter(expense => {
      const freq = expense.frequency || 'weekly'
      return freq === 'weekly' || freq === 'fortnightly' || freq === 'monthly'
    })
  }

  // Calculate required weekly contribution for each lump-sum expense
  // Uses the unified expense projection to check if each lump-sum is covered
  function calculateLumpSumContributions() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // First, gather all lump-sum expenses with their due dates and amounts
    const lumpSumExpenses = getLumpSumExpenses().map(expense => {
      const amount = parseFloat(expense.amount) || 0
      if (amount <= 0) return null

      // Calculate due date
      let dueDate = null
      if (expense.frequency === 'one-off' && expense.date) {
        dueDate = parseDateLocal(expense.date)
      } else if (expense.frequency === 'annually' && expense.dueDate) {
        dueDate = parseDateLocal(expense.dueDate)
        // If date has passed this year, roll to next year
        if (dueDate && dueDate <= today) {
          dueDate.setFullYear(dueDate.getFullYear() + 1)
        }
      } else if (expense.frequency === 'annually') {
        // If no specific dueDate, assume 1 year from now
        dueDate = new Date(today)
        dueDate.setFullYear(dueDate.getFullYear() + 1)
      }

      if (!dueDate) return null

      // Calculate weeks until due
      const diffTime = dueDate - today
      const weeksUntilDue = Math.max(1, Math.ceil(diffTime / (7 * 24 * 60 * 60 * 1000)))

      return {
        expense,
        expenseId: expense.id,
        expenseName: expense.name || expense.description || 'Unnamed',
        accountId: expense.accountId,
        dueDate,
        weeksUntilDue,
        totalAmount: amount,
        isPriority: weeksUntilDue <= 12  // Flag if due within 3 months
      }
    }).filter(Boolean).sort((a, b) => a.dueDate - b.dueDate)

    // Group expenses by account
    const accountGroups = {}
    for (const expense of lumpSumExpenses) {
      const accountId = expense.accountId || 'unallocated'
      if (!accountGroups[accountId]) {
        accountGroups[accountId] = []
      }
      accountGroups[accountId].push(expense)
    }

    // Get unified projections for all accounts (this simulates week-by-week with all expenses)
    const unifiedProjections = calculateUnifiedExpenseProjection(130)
    const projectionsByAccount = {}
    for (const proj of unifiedProjections) {
      projectionsByAccount[proj.accountId] = proj
    }

    // Calculate status for each lump-sum expense using the unified projection
    const results = []

    for (const [accountId, expensesInAccount] of Object.entries(accountGroups)) {
      const account = accountId !== 'unallocated' ? findAccountById(accountId) : null
      const accountBalance = account ? (parseFloat(account.balance) || 0) : 0
      const acceleration = account ? (parseFloat(account.accelerationAmount) || 0) : 0

      // Get the unified projection for this account
      const projection = projectionsByAccount[accountId]

      // Calculate lump-sum equilibrium (just for display purposes)
      const totalAnnualAmount = expensesInAccount.reduce((sum, exp) => sum + exp.totalAmount, 0)
      const lumpSumEquilibrium = totalAnnualAmount / 52

      for (const expense of expensesInAccount) {
        // Find the week when this expense is due
        const expenseWeek = expense.weeksUntilDue - 1 // 0-indexed

        // Get the projected balance BEFORE this expense hits
        // The expense hits during the week, so we check the week's data
        let projectedBalanceAtDue = accountBalance
        let isOnTrack = true
        let shortfall = 0
        let balanceAfterPayment = 0

        if (projection && projection.projection && projection.projection.length > expenseWeek) {
          // Find the week where this expense hits
          // Look for the week that contains this expense in its breakdown
          let foundWeek = null
          for (let i = 0; i < projection.projection.length; i++) {
            const week = projection.projection[i]
            // Check if this expense hits in this week
            const hasThisExpense = week.breakdown && week.breakdown.some(b =>
              b.type === 'annual' && b.details && b.details.some(d =>
                d.name === expense.expenseName || d.name === expense.expense?.name
              )
            )
            if (hasThisExpense) {
              foundWeek = week
              break
            }
          }

          if (foundWeek) {
            // Balance before this week = previous week's ending balance
            const weekIndex = projection.projection.indexOf(foundWeek)
            const balanceBefore = weekIndex > 0
              ? projection.projection[weekIndex - 1].balanceAfter
              : accountBalance

            // Available when expense hits = balance before + this week's transfer
            projectedBalanceAtDue = balanceBefore + foundWeek.transfer

            // Check if we can cover just this expense from what's available
            // But we need to account for other expenses in the same week too
            balanceAfterPayment = foundWeek.balanceAfter

            // Is there ever a negative balance at or after this expense?
            // Check if minBalance from this point forward stays positive
            let minFromHere = Infinity
            for (let i = weekIndex; i < projection.projection.length; i++) {
              if (projection.projection[i].balanceAfter < minFromHere) {
                minFromHere = projection.projection[i].balanceAfter
              }
            }

            isOnTrack = minFromHere >= 0
            shortfall = isOnTrack ? 0 : Math.abs(minFromHere)
          } else {
            // Expense not found in projection (maybe beyond 130 weeks)
            // Fall back to simple calculation
            const weeklyEquilibrium = projection ? projection.weeklyEquilibrium : lumpSumEquilibrium
            const actualWeeklyContribution = weeklyEquilibrium + acceleration
            projectedBalanceAtDue = accountBalance + (expense.weeksUntilDue * lumpSumEquilibrium)
            shortfall = Math.max(0, expense.totalAmount - projectedBalanceAtDue)
            isOnTrack = shortfall === 0
            balanceAfterPayment = projectedBalanceAtDue - expense.totalAmount
          }
        } else {
          // No projection available, use simple calculation
          projectedBalanceAtDue = accountBalance + (expense.weeksUntilDue * lumpSumEquilibrium)
          shortfall = Math.max(0, expense.totalAmount - projectedBalanceAtDue)
          isOnTrack = shortfall === 0
          balanceAfterPayment = projectedBalanceAtDue - expense.totalAmount
        }

        // Calculate what EXTRA weekly contribution is needed to close the gap
        const weeksFromNow = expense.weeksUntilDue
        const extraWeeklyNeeded = shortfall > 0 ? shortfall / weeksFromNow : 0

        // Use the unified projection's on-track status if available
        if (projection) {
          isOnTrack = projection.isOnTrack
          shortfall = isOnTrack ? 0 : projection.shortfall
        }

        results.push({
          ...expense,
          currentBalance: accountBalance,
          projectedBalanceAtDue: Math.max(0, projectedBalanceAtDue),
          shortfall,
          isOnTrack,
          balanceAfterPayment,
          amountNeeded: shortfall,
          weeklyContribution: extraWeeklyNeeded,
          actualWeeklyContribution: (projection?.actualWeeklyTransfer || lumpSumEquilibrium + acceleration),
          lumpSumEquilibrium,
          acceleration,
          sequentialPosition: expensesInAccount.indexOf(expense) + 1,
          totalInSequence: expensesInAccount.length
        })
      }
    }

    // Sort final results by due date
    return results.sort((a, b) => a.dueDate - b.dueDate)
  }

  // Calculate when equilibrium will be reached (how many weeks until acceleration can stop)
  function calculateEquilibriumDate() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const lumpSumExpenses = getLumpSumExpenses().map(expense => {
      const amount = parseFloat(expense.amount) || 0
      if (amount <= 0) return null

      let dueDate = null
      if (expense.frequency === 'one-off' && expense.date) {
        dueDate = parseDateLocal(expense.date)
      } else if (expense.frequency === 'annually' && expense.dueDate) {
        dueDate = parseDateLocal(expense.dueDate)
        if (dueDate && dueDate <= today) {
          dueDate.setFullYear(dueDate.getFullYear() + 1)
        }
      } else if (expense.frequency === 'annually') {
        dueDate = new Date(today)
        dueDate.setFullYear(dueDate.getFullYear() + 1)
      }
      if (!dueDate) return null

      return { ...expense, amount, dueDate }
    }).filter(Boolean).sort((a, b) => a.dueDate - b.dueDate)

    // Group by account
    const accountGroups = {}
    for (const expense of lumpSumExpenses) {
      const accountId = expense.accountId || 'unallocated'
      if (!accountGroups[accountId]) accountGroups[accountId] = []
      accountGroups[accountId].push(expense)
    }

    const results = []

    for (const [accountId, expensesInAccount] of Object.entries(accountGroups)) {
      const account = accountId !== 'unallocated' ? findAccountById(accountId) : null
      if (!account) continue

      const accountBalance = parseFloat(account.balance) || 0
      const acceleration = parseFloat(account.accelerationAmount) || 0

      if (acceleration <= 0) {
        // No acceleration configured, already at "equilibrium" (or behind)
        results.push({
          accountId,
          accountName: account.name,
          weeksUntilEquilibrium: 0,
          equilibriumDate: today,
          isAlreadyAtEquilibrium: true,
          acceleration: 0
        })
        continue
      }

      const totalAnnualAmount = expensesInAccount.reduce((sum, exp) => sum + exp.amount, 0)
      const lumpSumEquilibrium = totalAnnualAmount / 52
      const actualWeeklyContribution = lumpSumEquilibrium + acceleration

      // Simulate forward to find when we can switch to equilibrium-only
      // Test each week: "If I stop accelerating here, will I still be on track?"
      let equilibriumWeek = null
      const maxWeeks = 104 // Check up to 2 years

      for (let testWeek = 1; testWeek <= maxWeeks; testWeek++) {
        // Simulate balance WITH acceleration up to testWeek
        let balanceAtTestWeek = accountBalance
        let lastDate = today

        for (const expense of expensesInAccount) {
          const weeksToExpense = Math.max(0, (expense.dueDate - today) / (7 * 24 * 60 * 60 * 1000))

          if (weeksToExpense <= testWeek) {
            // This expense is paid before our test point
            const weeksBetween = (expense.dueDate - lastDate) / (7 * 24 * 60 * 60 * 1000)
            balanceAtTestWeek += weeksBetween * actualWeeklyContribution
            balanceAtTestWeek -= expense.amount
            lastDate = expense.dueDate
          } else {
            // Add contributions up to testWeek
            const weeksFromLast = (testWeek * 7 * 24 * 60 * 60 * 1000 + today.getTime() - lastDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
            balanceAtTestWeek += Math.max(0, weeksFromLast) * actualWeeklyContribution
            break
          }
        }

        // Now test: from testWeek onwards, with equilibrium-only, do we stay solvent?
        let testBalance = balanceAtTestWeek
        let testDate = new Date(today.getTime() + testWeek * 7 * 24 * 60 * 60 * 1000)
        let canSurvive = true

        for (const expense of expensesInAccount) {
          if (expense.dueDate <= testDate) continue // Already paid

          const weeksUntil = (expense.dueDate - testDate) / (7 * 24 * 60 * 60 * 1000)
          testBalance += weeksUntil * lumpSumEquilibrium // Equilibrium only!
          testBalance -= expense.amount
          testDate = expense.dueDate

          if (testBalance < 0) {
            canSurvive = false
            break
          }
        }

        if (canSurvive) {
          equilibriumWeek = testWeek
          break
        }
      }

      const equilibriumDate = equilibriumWeek
        ? new Date(today.getTime() + equilibriumWeek * 7 * 24 * 60 * 60 * 1000)
        : null

      results.push({
        accountId,
        accountName: account.name,
        weeksUntilEquilibrium: equilibriumWeek,
        equilibriumDate,
        isAlreadyAtEquilibrium: equilibriumWeek === 0,
        acceleration
      })
    }

    return results
  }

  // Calculate weekly equilibrium for regular expenses linked to an account
  function getAccountRegularEquilibrium(accountId) {
    return getRegularExpenses()
      .filter(e => e.accountId === accountId)
      .reduce((sum, e) => sum + getWeeklyAmount(e), 0)
  }

  // Calculate unified expense projection - combines ALL expense types (weekly, monthly, annual)
  // to show week-by-week when expenses spike above equilibrium
  // Now includes equilibrium calculation and acceleration cutoff
  function calculateUnifiedExpenseProjection(weeksToProject = 52) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get all expenses grouped by account
    const allExpenses = expenses.value
    const accountGroups = {}

    for (const expense of allExpenses) {
      const accountId = expense.accountId || 'unallocated'
      if (!accountGroups[accountId]) accountGroups[accountId] = []
      accountGroups[accountId].push(expense)
    }

    const results = []

    for (const [accountId, expensesInAccount] of Object.entries(accountGroups)) {
      const account = accountId !== 'unallocated' ? findAccountById(accountId) : null
      if (!account) continue

      const accountBalance = parseFloat(account.balance) || 0
      const acceleration = parseFloat(account.accelerationAmount) || 0
      const accelerationBufferWeeks = parseInt(account.accelerationBufferWeeks) || 0

      // Calculate total weekly equilibrium for this account (all expense types)
      const weeklyEquilibrium = expensesInAccount.reduce((sum, e) => sum + getWeeklyAmount(e), 0)
      const acceleratedWeeklyTransfer = weeklyEquilibrium + acceleration

      // Separate expenses by type
      const weeklyExpenses = expensesInAccount.filter(e => e.frequency === 'weekly')
      const fortnightlyExpenses = expensesInAccount.filter(e => e.frequency === 'fortnightly')
      const monthlyExpenses = expensesInAccount.filter(e => e.frequency === 'monthly')
      const annualExpenses = expensesInAccount.filter(e => e.frequency === 'annually' || e.frequency === 'one-off')

      // Calculate weekly totals
      const weeklyTotal = weeklyExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
      const fortnightlyTotal = fortnightlyExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)

      // Helper function to calculate expenses for a given week
      function calculateWeekExpenses(week, weekStart, weekEnd) {
        let weekExpenses = weeklyTotal
        const expenseBreakdown = []

        if (weeklyTotal > 0) {
          expenseBreakdown.push({ type: 'weekly', label: 'Weekly expenses', amount: weeklyTotal })
        }

        // Add fortnightly expenses (every 2 weeks)
        if (fortnightlyExpenses.length > 0 && week % 2 === 0) {
          weekExpenses += fortnightlyTotal
          expenseBreakdown.push({ type: 'fortnightly', label: 'Fortnightly expenses', amount: fortnightlyTotal })
        }

        // Add monthly expenses that fall in this week
        let monthlyThisWeek = 0
        const monthlyDetails = []
        for (const expense of monthlyExpenses) {
          const dueDay = expense.dueDay || 1
          for (let d = 0; d < 7; d++) {
            const checkDate = new Date(weekStart)
            checkDate.setDate(weekStart.getDate() + d)
            if (checkDate.getDate() === dueDay) {
              const amount = parseFloat(expense.amount) || 0
              monthlyThisWeek += amount
              monthlyDetails.push({ name: expense.name || expense.description, amount, day: dueDay })
              break
            }
          }
        }
        if (monthlyThisWeek > 0) {
          weekExpenses += monthlyThisWeek
          expenseBreakdown.push({
            type: 'monthly',
            label: `Monthly (${monthlyDetails.map(m => m.name).join(', ')})`,
            amount: monthlyThisWeek,
            details: monthlyDetails
          })
        }

        // Add annual/one-off expenses that fall in this week
        // For annual expenses, check multiple years to handle long projections
        let annualThisWeek = 0
        const annualDetails = []
        for (const expense of annualExpenses) {
          if (expense.frequency === 'one-off' && expense.date) {
            // One-off: only check the specific date
            const dueDate = parseDateLocal(expense.date)
            if (dueDate && dueDate >= weekStart && dueDate <= weekEnd) {
              const amount = parseFloat(expense.amount) || 0
              annualThisWeek += amount
              annualDetails.push({ name: expense.name || expense.description, amount, date: dueDate })
            }
          } else if (expense.dueDate) {
            // Annual: check this year and next few years for long projections
            const baseDueDate = parseDateLocal(expense.dueDate)
            if (!baseDueDate) continue
            // Check up to 3 years to cover long projections
            for (let yearOffset = 0; yearOffset <= 3; yearOffset++) {
              const dueDate = new Date(baseDueDate)
              dueDate.setFullYear(baseDueDate.getFullYear() + yearOffset)
              // Skip if this date is in the past
              if (dueDate <= today) continue

              // Check if this occurrence falls in the current week
              if (dueDate >= weekStart && dueDate <= weekEnd) {
                const amount = parseFloat(expense.amount) || 0
                annualThisWeek += amount
                annualDetails.push({ name: expense.name || expense.description, amount, date: dueDate })
              }
            }
          }
        }
        if (annualThisWeek > 0) {
          weekExpenses += annualThisWeek
          expenseBreakdown.push({
            type: 'annual',
            label: `Annual (${annualDetails.map(a => a.name).join(', ')})`,
            amount: annualThisWeek,
            details: annualDetails
          })
        }

        return { weekExpenses, expenseBreakdown }
      }

      // First pass: Calculate week expenses for all weeks (needed for equilibrium calculation)
      const weekExpensesData = []
      for (let week = 0; week < weeksToProject; week++) {
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() + (week * 7))
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        const { weekExpenses, expenseBreakdown } = calculateWeekExpenses(week, weekStart, weekEnd)
        weekExpensesData.push({ week, weekStart, weekEnd, weekExpenses, expenseBreakdown })
      }

      // Calculate when equilibrium is reached
      // Equilibrium = the first week where, if we switch to equilibrium-only transfers,
      // the balance never goes negative for the rest of the projection
      let equilibriumWeek = null
      let equilibriumDate = null

      if (acceleration > 0) {
        // Simulate with acceleration to find equilibrium point
        for (let testWeek = 0; testWeek < weeksToProject; testWeek++) {
          // Calculate balance at end of testWeek with acceleration up to this point
          let balanceAtTestWeek = accountBalance
          for (let w = 0; w <= testWeek; w++) {
            balanceAtTestWeek += acceleratedWeeklyTransfer
            balanceAtTestWeek -= weekExpensesData[w].weekExpenses
          }

          // Now simulate remaining weeks with equilibrium-only transfers
          let canSurvive = true
          let testBalance = balanceAtTestWeek
          for (let w = testWeek + 1; w < weeksToProject; w++) {
            testBalance += weeklyEquilibrium
            testBalance -= weekExpensesData[w].weekExpenses
            if (testBalance < 0) {
              canSurvive = false
              break
            }
          }

          if (canSurvive) {
            equilibriumWeek = testWeek + 1 // 1-indexed
            equilibriumDate = formatDateLocal(weekExpensesData[testWeek].weekEnd)
            break
          }
        }
      } else {
        // No acceleration - check if already at equilibrium (week 0)
        let testBalance = accountBalance
        let canSurvive = true
        for (let w = 0; w < weeksToProject; w++) {
          testBalance += weeklyEquilibrium
          testBalance -= weekExpensesData[w].weekExpenses
          if (testBalance < 0) {
            canSurvive = false
            break
          }
        }
        if (canSurvive) {
          equilibriumWeek = 0
          equilibriumDate = formatDateLocal(today)
        }
      }

      // Calculate the week when acceleration stops (equilibrium + buffer weeks)
      const accelerationStopWeek = equilibriumWeek !== null
        ? equilibriumWeek + accelerationBufferWeeks
        : null

      // Build week-by-week projection with dynamic transfer amounts
      const weeklyProjection = []
      let runningBalance = accountBalance
      let minBalance = accountBalance
      let minBalanceWeek = 0

      for (let week = 0; week < weeksToProject; week++) {
        const { weekStart, weekEnd, weekExpenses, expenseBreakdown } = weekExpensesData[week]

        // Determine transfer amount for this week
        // If we haven't reached acceleration stop point, use accelerated transfer
        // Otherwise, use equilibrium only
        const isAccelerating = accelerationStopWeek === null || (week + 1) <= accelerationStopWeek
        const transferAmount = isAccelerating ? acceleratedWeeklyTransfer : weeklyEquilibrium

        // Calculate balance
        const balanceBeforeTransfer = runningBalance
        const balanceAfterTransfer = runningBalance + transferAmount
        const balanceAfterExpenses = balanceAfterTransfer - weekExpenses

        // Is this a "spike" week? (expenses exceed transfer)
        const isSpike = weekExpenses > transferAmount
        const spikeAmount = Math.max(0, weekExpenses - transferAmount)

        // Track minimum balance
        if (balanceAfterExpenses < minBalance) {
          minBalance = balanceAfterExpenses
          minBalanceWeek = week + 1
        }

        weeklyProjection.push({
          week: week + 1,
          weekStart: formatDateLocal(weekStart),
          weekEnd: formatDateLocal(weekEnd),
          expenses: Math.round(weekExpenses * 100) / 100,
          transfer: Math.round(transferAmount * 100) / 100,
          balanceBefore: Math.round(balanceBeforeTransfer * 100) / 100,
          balanceAfter: Math.round(balanceAfterExpenses * 100) / 100,
          isSpike,
          spikeAmount: Math.round(spikeAmount * 100) / 100,
          breakdown: expenseBreakdown,
          isAccelerating,
          isEquilibriumWeek: equilibriumWeek !== null && (week + 1) === equilibriumWeek,
          isAccelerationStopWeek: accelerationStopWeek !== null && (week + 1) === accelerationStopWeek
        })

        runningBalance = balanceAfterExpenses
      }

      // Calculate buffer needed (if minimum balance goes negative)
      // Note: minBalance already includes the starting accountBalance in its calculation
      // So if minBalance < 0, that's how much MORE you need on top of what you already have
      const bufferNeeded = minBalance < 0 ? Math.abs(minBalance) : 0

      // isOnTrack = you never go negative during the projection
      const isOnTrack = minBalance >= 0

      // Find all spike weeks for summary
      const spikeWeeks = weeklyProjection.filter(w => w.isSpike)

      results.push({
        accountId,
        accountName: account.name,
        currentBalance: accountBalance,
        weeklyEquilibrium: Math.round(weeklyEquilibrium * 100) / 100,
        actualWeeklyTransfer: Math.round(acceleratedWeeklyTransfer * 100) / 100,
        acceleration,
        accelerationBufferWeeks,
        equilibriumWeek,
        equilibriumDate,
        accelerationStopWeek,
        bufferNeeded: Math.ceil(bufferNeeded),
        shortfall: Math.ceil(bufferNeeded), // shortfall = bufferNeeded since balance is already factored in
        isOnTrack,
        minBalance: Math.round(minBalance * 100) / 100,
        minBalanceWeek,
        spikeWeeks: spikeWeeks.slice(0, 12), // First 12 spike weeks for display
        totalSpikeWeeks: spikeWeeks.length,
        projection: weeklyProjection
      })
    }

    return results
  }

  // Calculate buffer needed for monthly/fortnightly expenses
  // These expenses are "lumpy" within a month - we need enough buffer to handle
  // weeks where multiple expenses cluster together
  function calculateRegularExpenseBuffer() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get regular expenses (weekly, fortnightly, monthly)
    const regularExpenses = getRegularExpenses()

    // Group by account
    const accountGroups = {}
    for (const expense of regularExpenses) {
      const accountId = expense.accountId || 'unallocated'
      if (!accountGroups[accountId]) accountGroups[accountId] = []
      accountGroups[accountId].push(expense)
    }

    const results = []

    for (const [accountId, expensesInAccount] of Object.entries(accountGroups)) {
      const account = accountId !== 'unallocated' ? findAccountById(accountId) : null
      if (!account) continue

      const accountBalance = parseFloat(account.balance) || 0

      // Separate by frequency
      const weeklyExpenses = expensesInAccount.filter(e => e.frequency === 'weekly')
      const fortnightlyExpenses = expensesInAccount.filter(e => e.frequency === 'fortnightly')
      const monthlyExpenses = expensesInAccount.filter(e => e.frequency === 'monthly')

      // Calculate weekly equilibrium for this account's regular expenses
      const weeklyEquilibrium = expensesInAccount.reduce((sum, e) => sum + getWeeklyAmount(e), 0)

      // Weekly expenses are perfectly balanced - no buffer needed for them
      const weeklyTotal = weeklyExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)

      // For monthly expenses, simulate 5 weeks (covers a full month cycle)
      // to find the minimum buffer needed
      if (monthlyExpenses.length === 0 && fortnightlyExpenses.length === 0) {
        // Only weekly expenses - no buffer needed beyond the week's equilibrium
        results.push({
          accountId,
          accountName: account.name,
          bufferNeeded: 0,
          currentBalance: accountBalance,
          shortfall: 0,
          isOnTrack: true,
          weeklyEquilibrium,
          monthlyExpenses: [],
          worstWeekTotal: weeklyTotal,
          weeklyExpenseTotal: weeklyTotal
        })
        continue
      }

      // Build a day-by-day expense map for a month (days 1-31)
      const dailyExpenses = {}
      for (let day = 1; day <= 31; day++) {
        dailyExpenses[day] = 0
      }

      // Add monthly expenses to their due days
      for (const expense of monthlyExpenses) {
        const dueDay = expense.dueDay || expense.dueDate || 1
        const amount = parseFloat(expense.amount) || 0
        dailyExpenses[dueDay] = (dailyExpenses[dueDay] || 0) + amount
      }

      // Simulate 5 weeks starting from day 1 of a hypothetical month
      // Assume transfers happen at the start of each week (every 7 days)
      const weeksToSimulate = 5
      let minBalance = Infinity
      let runningBalance = 0 // Start with 0 to find minimum buffer needed

      // Also track fortnightly expenses (we'll add them every 2 weeks)
      const fortnightlyTotal = fortnightlyExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)

      // Track worst week for display
      let worstWeekTotal = 0
      let worstWeekNumber = 0

      for (let week = 0; week < weeksToSimulate; week++) {
        // Transfer at start of week
        runningBalance += weeklyEquilibrium

        // Calculate which days fall in this week
        const weekStartDay = (week * 7) % 31 + 1
        let weekExpenses = weeklyTotal // Weekly expenses always hit

        // Add monthly expenses for days in this week
        for (let d = 0; d < 7; d++) {
          const day = ((weekStartDay - 1 + d) % 31) + 1
          weekExpenses += dailyExpenses[day] || 0
        }

        // Add fortnightly expenses every 2 weeks
        if (week % 2 === 0) {
          weekExpenses += fortnightlyTotal
        }

        // Track worst week
        if (weekExpenses > worstWeekTotal) {
          worstWeekTotal = weekExpenses
          worstWeekNumber = week + 1
        }

        // Deduct expenses
        runningBalance -= weekExpenses

        // Track minimum balance
        if (runningBalance < minBalance) {
          minBalance = runningBalance
        }
      }

      // The buffer needed is how much we went below zero (if any)
      // Add a small safety margin
      const bufferNeeded = minBalance < 0 ? Math.abs(minBalance) + 10 : 0
      const shortfall = Math.max(0, bufferNeeded - accountBalance)
      const isOnTrack = shortfall === 0

      results.push({
        accountId,
        accountName: account.name,
        bufferNeeded: Math.ceil(bufferNeeded),
        currentBalance: accountBalance,
        shortfall: Math.ceil(shortfall),
        isOnTrack,
        weeklyEquilibrium,
        monthlyExpenses: monthlyExpenses.map(e => ({
          name: e.name || e.description,
          amount: parseFloat(e.amount) || 0,
          dueDay: e.dueDay || e.dueDate || 1
        })),
        fortnightlyExpenses: fortnightlyExpenses.map(e => ({
          name: e.name || e.description,
          amount: parseFloat(e.amount) || 0
        })),
        worstWeekTotal: Math.ceil(worstWeekTotal),
        worstWeekNumber,
        weeklyExpenseTotal: weeklyTotal,
        minSimulatedBalance: Math.ceil(minBalance)
      })
    }

    return results
  }

  // Calculate lump-sum catch-up contribution for an account
  function getAccountLumpSumContribution(accountId) {
    const lumpSums = calculateLumpSumContributions()
    return lumpSums
      .filter(ls => ls.accountId === accountId)
      .reduce((sum, ls) => sum + ls.weeklyContribution, 0)
  }

  // Main transfer recommendation engine
  function calculateTransferRecommendations() {
    const weeklyNet = liveWeeklyNet.value || 0

    // Calculate total weekly expenses (ALL expenses converted to weekly)
    const totalWeeklyExpenses = expenses.value
      .reduce((sum, e) => sum + getWeeklyAmount(e), 0)

    // Available for acceleration = take-home - all expenses
    const availableForAcceleration = Math.max(0, weeklyNet - totalWeeklyExpenses)

    // Total user-set acceleration across all accounts
    const totalAcceleration = accounts.value
      .reduce((sum, acc) => sum + (parseFloat(acc.accelerationAmount) || 0), 0)

    // Validate: acceleration cannot exceed available
    const isAccelerationValid = totalAcceleration <= availableForAcceleration

    // Build per-account recommendations
    const recommendations = accounts.value.map(account => {
      // Weekly equilibrium = ALL expenses for this account (weekly-ised)
      const weeklyEquilibrium = getAccountWeeklyLoad(account.id)
      const acceleration = parseFloat(account.accelerationAmount) || 0

      // Total recommended weekly transfer
      const recommendedTransfer = weeklyEquilibrium + acceleration

      // Get all linked expenses for this account
      const linkedExpenses = getExpensesForAccount(account.id)

      return {
        account,
        accountId: account.id,
        accountName: account.name,
        currentBalance: parseFloat(account.balance) || 0,
        weeklyEquilibrium,
        // Keep regularEquilibrium as alias for backward compatibility
        regularEquilibrium: weeklyEquilibrium,
        acceleration,
        recommendedTransfer,
        linkedExpenses
      }
    })

    // Total recommended across all accounts
    const totalRecommended = recommendations
      .reduce((sum, r) => sum + r.recommendedTransfer, 0)

    return {
      weeklyNet,
      totalWeeklyExpenses,
      // Keep old names as aliases for backward compatibility
      totalRegularEquilibrium: totalWeeklyExpenses,
      totalLumpSumContributions: 0,
      totalAcceleration,
      availableForAcceleration,
      isAccelerationValid,
      totalRecommended,
      isWithinBudget: totalRecommended <= weeklyNet,
      remainingAfterTransfers: weeklyNet - totalRecommended,
      recommendations
    }
  }

  // ============================================
  // TRANSACTION ACTIONS
  // ============================================

  // Load transactions with optional filters
  async function loadTransactions(filters = {}) {
    transactionsLoading.value = true
    try {
      const response = await transactionAPI.getAll(filters)
      transactions.value = response.transactions
      transactionsTotal.value = response.total
      return response
    } catch (error) {
      console.error('Failed to load transactions:', error)
      throw error
    } finally {
      transactionsLoading.value = false
    }
  }

  // Load upcoming scheduled items (transfers + automatic expenses)
  async function loadUpcoming(days = 30) {
    try {
      const response = await transactionAPI.getUpcoming(days)
      upcomingItems.value = response.upcoming
      return response
    } catch (error) {
      console.error('Failed to load upcoming items:', error)
      throw error
    }
  }

  // Load budget vs actual summary for manual expenses
  async function loadBudgetSummary(options = {}) {
    try {
      const response = await transactionAPI.getBudgetSummary(options)
      budgetSummary.value = response
      return response
    } catch (error) {
      console.error('Failed to load budget summary:', error)
      throw error
    }
  }

  // Create a new transaction
  async function createTransaction(transactionData) {
    try {
      const response = await transactionAPI.create(transactionData)
      // Reload transactions to get updated list
      await loadTransactions()
      // Refresh account balances if transaction affects an account
      if (transactionData.account_id) {
        await refreshAccountBalances()
      }
      return response
    } catch (error) {
      console.error('Failed to create transaction:', error)
      throw error
    }
  }

  // Update an existing transaction
  async function updateTransaction(id, updates) {
    try {
      const response = await transactionAPI.update(id, updates)
      // Update local state
      const index = transactions.value.findIndex(t => t.id === id)
      if (index !== -1) {
        transactions.value[index] = response.transaction
      }
      return response
    } catch (error) {
      console.error('Failed to update transaction:', error)
      throw error
    }
  }

  // Delete a transaction
  async function deleteTransaction(id) {
    try {
      const response = await transactionAPI.delete(id)
      // Remove from local state
      transactions.value = transactions.value.filter(t => t.id !== id)
      transactionsTotal.value = Math.max(0, transactionsTotal.value - 1)
      return response
    } catch (error) {
      console.error('Failed to delete transaction:', error)
      throw error
    }
  }

  // Quick helper to log a manual expense
  async function logManualExpense(expenseId, amount, date = null, notes = '') {
    const expense = expenses.value.find(e => e.id === expenseId)
    if (!expense) {
      throw new Error('Expense not found')
    }

    const transactionDate = date || formatDateLocal(new Date())

    // Only set budget_amount for budget envelopes (for variance tracking)
    // Bills compare against fixed amounts, not weekly budgets, so don't set budget_amount
    const isBudgetEnvelope = expense.expenseType === 'budget'
    const weeklyBudget = isBudgetEnvelope ? getWeeklyAmount(expense) : null

    return createTransaction({
      account_id: expense.accountId || null,
      transaction_type: 'expense',
      category: expense.name || expense.description,
      description: expense.name || expense.description,
      amount: amount,
      transaction_date: transactionDate,
      recurring_expense_id: expense.id,
      budget_amount: weeklyBudget,
      notes: notes
    })
  }

  // Refresh account balances from the backend (called after transactions/transfers update balances)
  async function refreshAccountBalances() {
    try {
      // Reload the budget to get fresh account balances from the database
      const currentBudgetId = budgetId.value
      if (currentBudgetId) {
        const budget = await budgetAPI.load(currentBudgetId)
        if (budget && budget.accounts) {
          // Update only the account balances, preserving other account properties
          for (const freshAccount of budget.accounts) {
            const existingAccount = accounts.value.find(a => a.id === freshAccount.id)
            if (existingAccount) {
              existingAccount.balance = freshAccount.balance
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to refresh account balances:', error)
      // Don't throw - this is a non-critical operation
    }
  }

  // Process all due automatic expenses
  async function processDueExpenses() {
    try {
      const response = await transactionAPI.processDue()
      // Reload transactions and upcoming to reflect changes
      await loadTransactions()
      await loadUpcoming()
      // Refresh account balances to show updated totals
      await refreshAccountBalances()
      return response
    } catch (error) {
      console.error('Failed to process due expenses:', error)
      throw error
    }
  }

  // Sync transfer schedules from calculated recommendations
  async function syncTransferSchedules() {
    try {
      const recommendations = calculateTransferRecommendations()
      // Only sync if there are recommendations with amounts > 0
      const validRecs = recommendations.recommendations.filter(r => r.recommendedTransfer > 0)
      if (validRecs.length === 0) {
        console.log('No transfer recommendations to sync')
        return { created: 0, updated: 0, deactivated: 0 }
      }
      const response = await transferAPI.syncSchedules(validRecs)
      return response
    } catch (error) {
      console.error('Failed to sync transfer schedules:', error)
      throw error
    }
  }

  // Process all due transfers (complete them and update balances)
  async function processDueTransfers() {
    try {
      const response = await transferAPI.processDue()
      // Reload upcoming to reflect changes
      await loadUpcoming()
      // Refresh account balances to show updated totals
      await refreshAccountBalances()
      return response
    } catch (error) {
      console.error('Failed to process due transfers:', error)
      throw error
    }
  }

  return {
    // State
    budgetId,
    budgetName,
    setAsDefault,
    incomeMode,
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
    recentPayments,

    // Computed
    totalExpenses,
    totalAccountAllocations,
    weeklyGrossIncome,
    weeklyNetIncome,
    weeklyDiscretionary,
    estimatedAnnualIncome,
    isIetcIncomeEligible,

    // Live calculation (updates as user types)
    liveCalculation,
    liveWeeklyGross,
    liveWeeklyNet,
    liveAnnualGross,
    liveAnnualNet,
    liveDeductions,

    // Helper functions (exposed for use in components)
    getWeeklyAmount,
    weeksUntilDate,
    getAccountWeeklyLoad,
    getExpensesForAccount,
    normalizeToWeekly,
    normalizeFromWeekly,
    calculateNetFromGross,
    calculateGrossFromNet,
    isBudgetEnvelope,

    // Actions
    addExpense,
    removeExpense,
    updateExpense,
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

    // Dashboard & Smart Expense Planning
    getLumpSumExpenses,
    getRegularExpenses,
    calculateLumpSumContributions,
    calculateEquilibriumDate,
    calculateRegularExpenseBuffer,
    calculateUnifiedExpenseProjection,
    getAccountRegularEquilibrium,
    getAccountLumpSumContribution,
    calculateTransferRecommendations,

    // Payment actions
    processExpensePayment,
    skipExpensePayment,
    loadPaymentHistory,
    calculateNextDueDate,
    calculateDueDatesBetween,

    // localStorage persistence (for unauthenticated users)
    saveToLocalStorage,
    loadFromLocalStorage,
    clearLocalStorage,

    // Transaction state
    transactions,
    transactionsTotal,
    upcomingItems,
    budgetSummary,
    transactionsLoading,

    // Transaction actions
    loadTransactions,
    loadUpcoming,
    loadBudgetSummary,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    logManualExpense,
    processDueExpenses,
    refreshAccountBalances,

    // Transfer actions
    syncTransferSchedules,
    processDueTransfers
  }
})
