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

    // Handle 401 Unauthorized - clear token and dispatch logout event
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken')
      // Dispatch custom event to trigger store logout (avoids circular dependency)
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
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
  },

  async logout() {
    // Server-side logout (optional - clears any server session if implemented)
    // For JWT-based auth, the main work is done client-side
    return Promise.resolve()
  }
}

// ============================================
// USER PREFERENCES API
// ============================================

export const preferencesAPI = {
  async update(preferences) {
    return apiClient.put('/preferences', preferences)
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
  },

  async payEarly(expenseId, { amount, payment_date, notes }) {
    return apiClient.post(`/recurring-expenses/${expenseId}/pay-early`, {
      amount,
      payment_date,
      notes
    })
  }
}

// ============================================
// TRANSACTION API
// ============================================

export const transactionAPI = {
  async getAll(filters = {}) {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value)
      }
    })
    return apiClient.get(`/transactions?${params.toString()}`)
  },

  async getById(id) {
    return apiClient.get(`/transactions/${id}`)
  },

  async getWeekly(date) {
    return apiClient.get(`/transactions/weekly/${date}`)
  },

  async getUpcoming(days = 30) {
    return apiClient.get(`/transactions/upcoming?days=${days}`)
  },

  async getBudgetSummary(options = {}) {
    const params = new URLSearchParams()
    if (options.expense_id) params.append('expense_id', options.expense_id)
    if (options.from_date) params.append('from_date', options.from_date)
    if (options.to_date) params.append('to_date', options.to_date)
    if (options.weeks) params.append('weeks', options.weeks)
    return apiClient.get(`/transactions/budget-summary?${params.toString()}`)
  },

  async create(transactionData) {
    return apiClient.post('/transactions', transactionData)
  },

  async update(id, updates) {
    return apiClient.put(`/transactions/${id}`, updates)
  },

  async delete(id) {
    return apiClient.delete(`/transactions/${id}`)
  },

  async deleteAll() {
    return apiClient.delete('/transactions')
  },

  async processDue() {
    return apiClient.post('/transactions/process-due')
  }
}

// ============================================
// TRANSFER API
// ============================================

export const transferAPI = {
  async syncSchedules(recommendations) {
    return apiClient.post('/transfer-schedules/sync', { recommendations })
  },

  async getSchedules(activeOnly = true) {
    return apiClient.get(`/transfer-schedules?active_only=${activeOnly}`)
  },

  async processDue() {
    return apiClient.post('/transfers/process-due')
  }
}

export default apiClient
