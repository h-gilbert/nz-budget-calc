import axios from 'axios'

// Create axios instance with base config
const apiClient = axios.create({
  baseURL: '/api', // Proxied through Vite to localhost:3200
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    const errorMessage = error.response?.data?.error || error.message || 'An error occurred'

    // Handle 401 Unauthorized - clear token and redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken')
      // Could dispatch a logout action here
    }

    return Promise.reject(new Error(errorMessage))
  }
)

// ============================================
// AUTH API
// ============================================

export const authAPI = {
  async register(username, password) {
    return apiClient.post('/register', { username, password })
  },

  async login(username, password) {
    return apiClient.post('/login', { username, password })
  },

  async getCurrentUser() {
    return apiClient.get('/verify')
  },

  async changePassword(currentPassword, newPassword) {
    return apiClient.post('/change-password', { currentPassword, newPassword })
  }
}

// ============================================
// BUDGET API
// ============================================

export const budgetAPI = {
  async save(budgetData) {
    return apiClient.post('/budget/save', budgetData)
  },

  async getAll() {
    return apiClient.get('/budgets')
  },

  async getById(id) {
    return apiClient.get(`/budget/load/${id}`)
  },

  async getDefault() {
    return apiClient.get('/budget/load')
  },

  async load(id = null) {
    const endpoint = id ? `/budget/load/${id}` : '/budget/load'
    return apiClient.get(endpoint)
  },

  async update(id, budgetData) {
    return apiClient.put(`/budget/${id}`, budgetData)
  },

  async delete(id) {
    return apiClient.delete(`/budget/${id}`)
  },

  async setDefault(id) {
    return apiClient.post(`/budget/${id}/set-default`)
  },

  async calculate(budgetData) {
    return apiClient.post('/budget/calculate', budgetData)
  }
}

// ============================================
// ACCOUNT API
// ============================================

export const accountAPI = {
  async create(accountData) {
    return apiClient.post('/accounts', accountData)
  },

  async getAll() {
    return apiClient.get('/accounts')
  },

  async getById(id) {
    return apiClient.get(`/accounts/${id}`)
  },

  async update(id, updates) {
    return apiClient.put(`/accounts/${id}`, updates)
  },

  async delete(id) {
    return apiClient.delete(`/accounts/${id}`)
  },

  async getBalanceHistory(id, days = 30) {
    return apiClient.get(`/accounts/${id}/balance-history?days=${days}`)
  }
}

// ============================================
// EXPENSE API
// ============================================

export const expenseAPI = {
  async create(expenseData) {
    return apiClient.post('/recurring-expenses', expenseData)
  },

  async getAll(budgetId = null, isActive = true) {
    const params = new URLSearchParams()
    if (budgetId) params.append('budget_id', budgetId)
    if (isActive !== null) params.append('is_active', isActive)
    return apiClient.get(`/recurring-expenses?${params.toString()}`)
  },

  async getUpcoming(days = 60) {
    return apiClient.get(`/recurring-expenses/upcoming?days=${days}`)
  },

  async update(id, updates) {
    return apiClient.put(`/recurring-expenses/${id}`, updates)
  },

  async delete(id) {
    return apiClient.delete(`/recurring-expenses/${id}`)
  },

  async recalculateDates() {
    return apiClient.post('/recurring-expenses/recalculate')
  }
}

// ============================================
// TRANSACTION API
// ============================================

export const transactionAPI = {
  async create(transactionData) {
    return apiClient.post('/transactions', transactionData)
  },

  async getAll(filters = {}) {
    const params = new URLSearchParams()
    if (filters.account_id) params.append('account_id', filters.account_id)
    if (filters.transaction_type) params.append('transaction_type', filters.transaction_type)
    if (filters.start_date) params.append('start_date', filters.start_date)
    if (filters.end_date) params.append('end_date', filters.end_date)
    if (filters.limit) params.append('limit', filters.limit)

    return apiClient.get(`/transactions?${params.toString()}`)
  },

  async getWeekly(date) {
    return apiClient.get(`/transactions/weekly/${date}`)
  },

  async delete(id) {
    return apiClient.delete(`/transactions/${id}`)
  },

  async update(id, updates) {
    return apiClient.put(`/transactions/${id}`, updates)
  }
}

// ============================================
// TRANSFER API
// ============================================

export const transferAPI = {
  async calculate(weeks = 16) {
    return apiClient.post('/transfers/calculate', { weeks })
  },

  async createSchedule(scheduleData) {
    return apiClient.post('/transfer-schedules', scheduleData)
  },

  async getSchedules() {
    return apiClient.get('/transfer-schedules')
  },

  async generate(weeksAhead = 4) {
    return apiClient.post('/transfers/generate', { weeks_ahead: weeksAhead })
  },

  async getUpcoming(days = 30) {
    return apiClient.get(`/transfers/upcoming?days=${days}`)
  },

  async execute(id) {
    return apiClient.post(`/transfers/${id}/execute`)
  },

  async update(id, updates) {
    return apiClient.put(`/transfers/${id}`, updates)
  },

  async cancel(id) {
    return apiClient.post(`/transfers/${id}/cancel`)
  }
}

// ============================================
// GOAL API
// ============================================

export const goalAPI = {
  async calculateTimeline(data) {
    return apiClient.post('/goals/calculate-timeline', data)
  },

  async createTransfers(data) {
    return apiClient.post('/goals/create-transfers', data)
  }
}

// ============================================
// AUTOMATION API
// ============================================

export const automationAPI = {
  async getState() {
    return apiClient.get('/automation/state')
  },

  async updateState(stateData) {
    return apiClient.put('/automation/state', stateData)
  },

  async getPending() {
    return apiClient.get('/automation/pending')
  }
}

// ============================================
// PAYMENT API
// ============================================

export const paymentAPI = {
  async getHistory(options = {}) {
    const params = new URLSearchParams()
    if (options.limit) params.append('limit', options.limit)
    if (options.offset) params.append('offset', options.offset)
    if (options.expenseId) params.append('expenseId', options.expenseId)
    return apiClient.get(`/payments/history?${params.toString()}`)
  },

  async recordPayment(expenseId, paymentData) {
    return apiClient.post(`/expenses/${expenseId}/pay`, paymentData)
  },

  async skipPayment(expenseId, skipData) {
    return apiClient.post(`/expenses/${expenseId}/skip`, skipData)
  }
}

export default apiClient
