// API Client for NZ Budget Calculator
const API_BASE_URL = 'http://localhost:3200/api';

class BudgetAPI {
    constructor() {
        this.token = localStorage.getItem('budget_token');
    }

    // Set auth token
    setToken(token) {
        this.token = token;
        localStorage.setItem('budget_token', token);
    }

    // Clear auth token
    clearToken() {
        this.token = null;
        localStorage.removeItem('budget_token');
    }

    // Generic request handler
    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // ============================================
    // ACCOUNT MANAGEMENT
    // ============================================

    async createAccount(accountData) {
        return this.request('/accounts', {
            method: 'POST',
            body: JSON.stringify(accountData)
        });
    }

    async getAccounts() {
        return this.request('/accounts');
    }

    async getAccount(id) {
        return this.request(`/accounts/${id}`);
    }

    async updateAccount(id, updates) {
        return this.request(`/accounts/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }

    async deleteAccount(id) {
        return this.request(`/accounts/${id}`, {
            method: 'DELETE'
        });
    }

    async getAccountBalanceHistory(id, days = 30) {
        return this.request(`/accounts/${id}/balance-history?days=${days}`);
    }

    // ============================================
    // RECURRING EXPENSES
    // ============================================

    async createRecurringExpense(expenseData) {
        return this.request('/recurring-expenses', {
            method: 'POST',
            body: JSON.stringify(expenseData)
        });
    }

    async getRecurringExpenses(budgetId = null, isActive = true) {
        let url = '/recurring-expenses?';
        if (budgetId) url += `budget_id=${budgetId}&`;
        if (isActive !== null) url += `is_active=${isActive}`;
        return this.request(url);
    }

    async getUpcomingExpenses(days = 60) {
        return this.request(`/recurring-expenses/upcoming?days=${days}`);
    }

    async updateRecurringExpense(id, updates) {
        return this.request(`/recurring-expenses/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }

    async deleteRecurringExpense(id) {
        return this.request(`/recurring-expenses/${id}`, {
            method: 'DELETE'
        });
    }

    async recalculateExpenseDates() {
        return this.request('/recurring-expenses/recalculate', {
            method: 'POST'
        });
    }

    // ============================================
    // TRANSACTIONS
    // ============================================

    async createTransaction(transactionData) {
        return this.request('/transactions', {
            method: 'POST',
            body: JSON.stringify(transactionData)
        });
    }

    async getTransactions(filters = {}) {
        const params = new URLSearchParams();
        if (filters.account_id) params.append('account_id', filters.account_id);
        if (filters.transaction_type) params.append('transaction_type', filters.transaction_type);
        if (filters.start_date) params.append('start_date', filters.start_date);
        if (filters.end_date) params.append('end_date', filters.end_date);
        if (filters.limit) params.append('limit', filters.limit);

        return this.request(`/transactions?${params.toString()}`);
    }

    async getWeeklyTransactions(date) {
        return this.request(`/transactions/weekly/${date}`);
    }

    async deleteTransaction(id) {
        return this.request(`/transactions/${id}`, {
            method: 'DELETE'
        });
    }

    // ============================================
    // TRANSFERS
    // ============================================

    async calculateTransfers(weeks = 16) {
        return this.request('/transfers/calculate', {
            method: 'POST',
            body: JSON.stringify({ weeks })
        });
    }

    async createTransferSchedule(scheduleData) {
        return this.request('/transfer-schedules', {
            method: 'POST',
            body: JSON.stringify(scheduleData)
        });
    }

    async getTransferSchedules() {
        return this.request('/transfer-schedules');
    }

    async generateTransfers(weeksAhead = 4) {
        return this.request('/transfers/generate', {
            method: 'POST',
            body: JSON.stringify({ weeks_ahead: weeksAhead })
        });
    }

    async getUpcomingTransfers(days = 30) {
        return this.request(`/transfers/upcoming?days=${days}`);
    }

    async executeTransfer(id) {
        return this.request(`/transfers/${id}/execute`, {
            method: 'POST'
        });
    }

    async updateTransfer(id, updates) {
        return this.request(`/transfers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }

    async cancelTransfer(id) {
        return this.request(`/transfers/${id}/cancel`, {
            method: 'POST'
        });
    }
}

// Create singleton instance
const budgetAPI = new BudgetAPI();

// Export for use in modules
export default budgetAPI;

// Also make available globally
window.budgetAPI = budgetAPI;
