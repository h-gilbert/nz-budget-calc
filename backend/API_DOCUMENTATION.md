# NZ Budget Calculator API Documentation

Base URL: `http://localhost:3200/api`

## Authentication

Most endpoints require authentication via JWT Bearer token.

Include token in header:
```
Authorization: Bearer <your-token>
```

---

## Account Management

### Create Account
**POST** `/accounts`

Creates a new account for the authenticated user.

**Request Body:**
```json
{
  "name": "Expense Account",
  "account_type": "checking",
  "current_balance": 500.00,
  "target_balance": 1000.00,
  "is_expense_account": true
}
```

**Response:** `201 Created`
```json
{
  "message": "Account created successfully",
  "account": {
    "id": 1,
    "user_id": 1,
    "name": "Expense Account",
    "account_type": "checking",
    "current_balance": 500.00,
    "target_balance": 1000.00,
    "is_expense_account": 1,
    "created_at": "2025-11-20T10:00:00.000Z",
    "updated_at": "2025-11-20T10:00:00.000Z"
  }
}
```

### Get All Accounts
**GET** `/accounts`

Returns all accounts for authenticated user.

**Response:** `200 OK`
```json
{
  "accounts": [
    {
      "id": 1,
      "name": "Expense Account",
      "current_balance": 500.00,
      "target_balance": 1000.00,
      "is_expense_account": 1
    }
  ]
}
```

### Get Single Account
**GET** `/accounts/:id`

### Update Account
**PUT** `/accounts/:id`

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Name",
  "current_balance": 600.00,
  "target_balance": 1200.00,
  "is_expense_account": true
}
```

### Delete Account
**DELETE** `/accounts/:id`

Note: Cannot delete accounts with existing transactions or transfers.

### Get Balance History
**GET** `/accounts/:id/balance-history?days=30`

Returns account balance history based on transactions.

---

## Recurring Expenses

### Create Recurring Expense
**POST** `/recurring-expenses`

**Request Body:**
```json
{
  "description": "Rent",
  "amount": 450.00,
  "frequency": "weekly",
  "due_day_of_week": 1,
  "account_id": 1
}
```

**Frequency Types:**
- `weekly` - Requires `due_day_of_week` (0=Sunday, 6=Saturday)
- `fortnightly` - Requires `due_day_of_week`
- `monthly` - Requires `due_day_of_month` (1-31)
- `annual` - Requires `due_date` (YYYY-MM-DD)

**Examples:**

Weekly expense (every Monday):
```json
{
  "description": "Groceries",
  "amount": 150.00,
  "frequency": "weekly",
  "due_day_of_week": 1
}
```

Monthly expense (5th of each month):
```json
{
  "description": "Internet",
  "amount": 89.99,
  "frequency": "monthly",
  "due_day_of_month": 5
}
```

Annual expense (specific date):
```json
{
  "description": "Car Registration",
  "amount": 350.00,
  "frequency": "annual",
  "due_date": "2025-03-15"
}
```

### Get All Recurring Expenses
**GET** `/recurring-expenses?budget_id=1&is_active=true`

### Get Upcoming Expenses
**GET** `/recurring-expenses/upcoming?days=60`

Returns expenses due within next N days.

### Update Recurring Expense
**PUT** `/recurring-expenses/:id`

### Delete Recurring Expense
**DELETE** `/recurring-expenses/:id`

### Recalculate Due Dates
**POST** `/recurring-expenses/recalculate`

Maintenance endpoint to recalculate all next_due_date values.

---

## Transactions

### Create Transaction
**POST** `/transactions`

**Request Body:**
```json
{
  "account_id": 1,
  "transaction_type": "expense",
  "category": "groceries",
  "description": "Weekly shopping",
  "amount": 150.00,
  "transaction_date": "2025-11-20"
}
```

**Transaction Types:** `income`, `expense`, `transfer`

### Get Transactions
**GET** `/transactions?account_id=1&transaction_type=expense&start_date=2025-11-01&end_date=2025-11-30&limit=100`

**Query Parameters:**
- `account_id` - Filter by account
- `transaction_type` - Filter by type
- `start_date` - YYYY-MM-DD format
- `end_date` - YYYY-MM-DD format
- `limit` - Max results (default: 100)

### Get Weekly Transactions
**GET** `/transactions/weekly/2025-11-20`

Returns all transactions for the week containing the specified date, plus summary.

**Response:**
```json
{
  "week": {
    "start": "2025-11-18",
    "end": "2025-11-24"
  },
  "transactions": [...],
  "summary": {
    "totalIncome": 1200.00,
    "totalExpenses": 450.00,
    "netCashFlow": 750.00
  }
}
```

### Delete Transaction
**DELETE** `/transactions/:id`

Reverses the account balance change.

---

## Transfers

### Calculate Required Transfers
**POST** `/transfers/calculate`

Calculates expense account requirements for next N weeks with 1-week-ahead buffer.

**Request Body:**
```json
{
  "weeks": 16
}
```

**Response:**
```json
{
  "expenseAccount": {
    "id": 1,
    "name": "Expense Account",
    "currentBalance": 500.00
  },
  "projection": [
    {
      "week": 1,
      "weekStart": "2025-11-20",
      "weekEnd": "2025-11-26",
      "expenses": 450.00,
      "requiredBalance": 900.00,
      "currentBalance": 500.00,
      "transferNeeded": 400.00
    }
  ],
  "summary": {
    "totalTransfersNeeded": 3200.00,
    "averageWeeklyTransfer": 200.00
  }
}
```

### Create Transfer Schedule
**POST** `/transfer-schedules`

Creates a recurring transfer schedule.

**Request Body:**
```json
{
  "from_account_id": 2,
  "to_account_id": 1,
  "amount": 200.00,
  "frequency": "weekly",
  "day_of_week": 5,
  "start_date": "2025-11-22",
  "standardization_date": "2026-01-01"
}
```

**Fields:**
- `standardization_date` - Optional. Date after which transfers become standardized (fixed amount vs dynamic).

### Get Transfer Schedules
**GET** `/transfer-schedules`

Returns all active transfer schedules with account names.

### Generate Scheduled Transfers
**POST** `/transfers/generate`

Auto-generates pending transfer records based on active schedules.

**Request Body:**
```json
{
  "weeks_ahead": 4
}
```

This creates transfer records for the next N weeks based on your schedules.

### Get Upcoming Transfers
**GET** `/transfers/upcoming?days=30`

Returns scheduled transfers for next N days.

**Response:**
```json
{
  "transfers": [
    {
      "id": 1,
      "from_account_name": "Savings Account",
      "to_account_name": "Expense Account",
      "amount": 200.00,
      "scheduled_date": "2025-11-22",
      "status": "scheduled"
    }
  ],
  "days": 30
}
```

### Execute Transfer
**POST** `/transfers/:id/execute`

Executes a scheduled transfer:
1. Updates both account balances
2. Marks transfer as completed
3. Creates transaction records

**Response:**
```json
{
  "message": "Transfer executed successfully",
  "transfer": {
    "id": 1,
    "status": "completed",
    "executed_date": "2025-11-20"
  }
}
```

### Update Transfer
**PUT** `/transfers/:id`

Modify a scheduled transfer (dynamic adjustment).

**Request Body:**
```json
{
  "amount": 250.00,
  "notes": "Increased for extra expenses this week"
}
```

### Cancel Transfer
**POST** `/transfers/:id/cancel`

Cancels a scheduled transfer.

---

## Typical Workflow

### 1. Initial Setup

```javascript
// 1. Create accounts
POST /api/accounts
{
  "name": "Expense Account",
  "is_expense_account": true,
  "current_balance": 0
}

POST /api/accounts
{
  "name": "Income Account",
  "current_balance": 5000
}

// 2. Add recurring expenses
POST /api/recurring-expenses
{
  "description": "Rent",
  "amount": 450,
  "frequency": "weekly",
  "due_day_of_week": 1,
  "account_id": 1
}

POST /api/recurring-expenses
{
  "description": "Internet",
  "amount": 89.99,
  "frequency": "monthly",
  "due_day_of_month": 5
}
```

### 2. Calculate Transfer Requirements

```javascript
// See how much to transfer weekly
POST /api/transfers/calculate
{
  "weeks": 16
}
```

### 3. Set Up Automated Transfers

```javascript
// Create transfer schedule
POST /api/transfer-schedules
{
  "from_account_id": 2,
  "to_account_id": 1,
  "amount": 200,
  "frequency": "weekly",
  "start_date": "2025-11-22",
  "standardization_date": "2026-01-15"
}

// Generate upcoming transfers
POST /api/transfers/generate
{
  "weeks_ahead": 4
}
```

### 4. Monitor and Execute

```javascript
// View upcoming transfers
GET /api/transfers/upcoming?days=7

// Execute a transfer
POST /api/transfers/1/execute

// Or adjust amount before executing
PUT /api/transfers/1
{
  "amount": 250
}
```

### 5. Track Actuals

```javascript
// Record actual expenses
POST /api/transactions
{
  "account_id": 1,
  "transaction_type": "expense",
  "description": "Groceries",
  "amount": 120.50,
  "transaction_date": "2025-11-20"
}

// View week summary
GET /api/transactions/weekly/2025-11-20
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message here"
}
```

**Common Status Codes:**
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing or invalid token
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `500 Internal Server Error` - Server error

---

## Notes

### 1-Week-Ahead Rule

The expense account management system ensures you always have enough money to cover next week's expenses. For example:

- **This Week**: $450 in expenses
- **Next Week**: $300 in expenses
- **Required Balance Today**: $450 + $300 = $750

This way, you never run short when expenses are due.

### Standardization Date

Before the standardization date, the system operates in "aggressive mode" - using all available income to fill the expense account as quickly as possible.

After the standardization date, it switches to "maintenance mode" - using dynamic weekly calculations to maintain the 1-week buffer.

### Date Calculations

The system automatically calculates `next_due_date` for recurring expenses:
- **Weekly**: Next occurrence of specified day of week
- **Monthly**: Handles month-end edge cases (e.g., Jan 31 → Feb 28)
- **Annual**: Moves to next year if date has passed

### Account Balance Updates

Transaction and transfer operations automatically update account balances. The system ensures data integrity through:
- Transaction validation
- Balance rollback on errors
- Cascade deletion prevention
