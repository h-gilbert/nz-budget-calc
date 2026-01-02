# Savings Tracker Feature Specification

## Overview

Add a savings tracker to the NZ Budget Calculator that allows users to allocate funds to savings goals, track progress over time, and see projections for when goals will be met based on current contribution rates.

---

## Core Architecture Decisions

### Goal Model: Account-Based Goals
Each savings account represents a single goal. The account IS the goal container. This maintains a simple mental model where account balance = goal progress.

### Integration Layer: Separate from Equilibrium
Savings allocation operates as a **separate layer** after equilibrium calculations. The existing expense account equilibrium/acceleration model remains unchanged. Savings contributions are calculated and displayed independently, competing for discretionary funds rather than affecting expense equilibrium math.

---

## Data Model

### Database Schema Changes

#### Modify `accounts` table
```sql
-- account_type now supports 'savings' value
-- Existing values: expense, spending (extend with 'savings')

-- New columns for savings accounts:
ALTER TABLE accounts ADD COLUMN savings_goal_target REAL;           -- Target amount to save
ALTER TABLE accounts ADD COLUMN savings_goal_deadline TEXT;         -- ISO date string
ALTER TABLE accounts ADD COLUMN savings_interest_rate REAL;         -- Annual interest rate (e.g., 0.05 for 5%)
ALTER TABLE accounts ADD COLUMN savings_weekly_contribution REAL;   -- Fixed weekly allocation
ALTER TABLE accounts ADD COLUMN savings_starting_balance REAL;      -- Imported existing funds
ALTER TABLE accounts ADD COLUMN savings_starting_balance_date TEXT; -- Date when starting balance was set
```

#### Modify `transactions` table
```sql
-- Add new transaction_type value: 'withdrawal'
-- Existing values: income, expense, transfer
-- 'withdrawal' specifically for savings account withdrawals
```

#### Use existing `transfer_schedules` table
Savings contributions use the same transfer_schedules infrastructure as expense transfers. No separate scheduling table needed.

### Frontend Account Object (budget.js store)
```javascript
// Savings account shape
{
  id: 'account-uuid',
  name: 'Emergency Fund',
  type: 'savings',                    // NEW: account type
  balance: 5000,                      // Current balance (existing)
  savingsGoalTarget: 10000,           // Target amount
  savingsGoalDeadline: '2025-06-15',  // Target date (optional)
  savingsInterestRate: 0.045,         // 4.5% annual (optional)
  savingsWeeklyContribution: 200,     // Fixed weekly allocation
  savingsStartingBalance: 5000,       // Imported funds
  savingsStartingBalanceDate: '2024-12-01'
}
```

---

## Transaction Handling

### Savings Contributions
- Transaction type: `transfer`
- Source: income/spending account (from_account_id)
- Destination: savings account (to_account_id)
- Created automatically via transfer_schedules OR manually via transaction logging
- Visual distinction in transaction list (blue color/icon)

### Savings Withdrawals
- Transaction type: `withdrawal` (NEW)
- Account: savings account (account_id)
- Amount: negative (reduces balance)
- Description: optional (same as regular expenses)
- Effect: extends projected goal completion date (recalculates projection)

### Transaction Display
- Savings transactions appear **mixed chronologically** with all other transactions
- **Visual distinction**: blue color scheme or savings icon badge
- Same transaction list component, different styling based on type

---

## Projection Engine

### Calculation Logic

```javascript
function calculateSavingsProjection(account, weeksToProject = 52) {
  const {
    balance,                    // Current balance
    savingsWeeklyContribution,  // Fixed weekly rate
    savingsGoalTarget,          // Target (optional)
    savingsGoalDeadline,        // Deadline (optional)
    savingsInterestRate         // Annual rate (optional)
  } = account;

  // Monthly compounding (NZ standard)
  const monthlyRate = savingsInterestRate / 12;

  let projectedBalance = balance;
  const projectionData = [];
  let weeksToGoal = null;

  for (let week = 0; week <= weeksToProject; week++) {
    // Add weekly contribution
    projectedBalance += savingsWeeklyContribution;

    // Apply monthly interest (every ~4.33 weeks)
    if (week > 0 && week % 4 === 0) {
      projectedBalance *= (1 + monthlyRate);
    }

    projectionData.push({
      week,
      balance: projectedBalance,
      date: addWeeks(new Date(), week)
    });

    // Track when goal is reached
    if (savingsGoalTarget && !weeksToGoal && projectedBalance >= savingsGoalTarget) {
      weeksToGoal = week;
    }
  }

  return {
    projectionData,
    weeksToGoal,
    projectedFinalBalance: projectedBalance,
    currentRate: savingsWeeklyContribution,
    requiredRate: calculateRequiredRate(account) // If deadline set
  };
}

function calculateRequiredRate(account) {
  if (!account.savingsGoalTarget || !account.savingsGoalDeadline) {
    return null;
  }

  const weeksRemaining = differenceInWeeks(
    new Date(account.savingsGoalDeadline),
    new Date()
  );

  const amountNeeded = account.savingsGoalTarget - account.balance;

  // Simplified (ignoring interest for required rate calc)
  return amountNeeded / weeksRemaining;
}
```

### Projection Behavior
- **Withdrawals extend timeline**: When a withdrawal occurs, recalculate from current balance. Don't reset to original start date.
- **Goal edits**: Prompt user whether to recalculate from original start date or treat today as new baseline.
- **No goal set**: Show balance growth trajectory without target line.

---

## Transfer System Integration

### Reuse transfer_schedules Table
```sql
-- Savings transfers use same table
-- to_account_id references savings account
-- from_account_id references source (income/spending account)
-- is_auto_calculated = 1 for auto-generated savings transfers
```

### Transfer Timing
- Savings transfers occur on **same day as expense transfers** (pay day)
- Single reconciliation point per week
- Simplifies the weekly budget flow

### Underfunding Warning
When user's income cannot cover all allocations (expenses + acceleration + savings):
- **Non-blocking warning** displayed on budget save
- Suggests reducing savings rates
- User can proceed anyway (maximum freedom)

---

## User Interface

### Account Overview Card Integration

Savings accounts appear in the **same list** as expense accounts with type indicators:

```
┌─────────────────────────────────────────────────────────┐
│ Account Overview                                        │
├─────────────────────────────────────────────────────────┤
│ 🏠 Rent Account           $2,450    [expense badge]     │
│    Weekly: $450 | Buffer: 3 weeks                       │
├─────────────────────────────────────────────────────────┤
│ 🚗 Car Account            $890      [expense badge]     │
│    Weekly: $85 | Equilibrium: Week 8                    │
├─────────────────────────────────────────────────────────┤
│ 💰 Emergency Fund         $5,000    [savings badge]     │
│    ████████░░ 50% of $10,000 | 8 weeks (Feb 15)        │
│    [Expand for projection chart]                        │
├─────────────────────────────────────────────────────────┤
│ 💰 House Deposit          $12,500   [savings badge]     │
│    ██░░░░░░░░ 12.5% of $100,000 | 3.5 years (Jun 2028) │
└─────────────────────────────────────────────────────────┘
```

### Progress Display
- **Progress bar**: Quick visual of current/target ratio
- **Expandable chart**: Click to reveal full projection timeline
- **Time display**: Both relative ("8 weeks") AND absolute ("Feb 15, 2025")

### Projection Chart
When expanded, show:
- **Line 1**: Current rate trajectory (solid line)
- **Line 2**: Required rate trajectory (dashed line, if deadline set)
- **Horizontal line**: Target amount
- **Vertical line**: Goal deadline marker
- **X-axis**: Weeks
- **Y-axis**: Balance ($)

### Transfer Planning Chart
- Savings allocations appear as **blue segments** in stacked bar chart
- Visually distinct from expense transfers (other colors)
- Part of weekly allocation breakdown

### Weekly Summary
New line item:
```
Gross Income:           $2,000
Tax:                    -$400
Net Income:             $1,600
─────────────────────────────
Expense Transfers:      -$800
Acceleration:           -$150
Savings Contributions:  -$200    ← NEW
─────────────────────────────
Discretionary:          $450
```

Shows **scheduled amounts** (what should happen), not actuals.

---

## Savings Account Creation/Editing

### Progressive Disclosure Modal

**Basic fields (always visible):**
- Account name
- Account type: Savings (selected)
- Starting balance
- Weekly contribution

**Advanced fields (expandable "Show goal details"):**
- Goal target amount
- Goal deadline
- Interest rate (annual %)

**Behavior:**
- Prompt for goal during creation ("Want to set a savings goal?")
- Skippable - can create goalless savings account
- Goal can be added later via edit

### Context-Aware Fields
When editing:
- Expense accounts: Show linked expenses, acceleration settings
- Savings accounts: Show goal settings, interest rate, contribution
- Hide irrelevant fields based on account type

---

## API Endpoints

### New/Modified Endpoints

```
GET    /api/accounts                    -- Include savings accounts (type=savings)
POST   /api/accounts                    -- Create savings account with type='savings'
PUT    /api/accounts/:id                -- Update savings fields
GET    /api/accounts/:id/projection     -- Get savings projection data
POST   /api/transactions                -- Support type='withdrawal'
GET    /api/savings/summary             -- Aggregate savings stats
```

### Projection Endpoint Response
```json
{
  "accountId": 123,
  "currentBalance": 5000,
  "goalTarget": 10000,
  "goalDeadline": "2025-06-15",
  "currentRate": 200,
  "requiredRate": 312.50,
  "weeksToGoal": 25,
  "projectedGoalDate": "2025-06-22",
  "projection": [
    { "week": 0, "balance": 5000, "date": "2024-12-30" },
    { "week": 1, "balance": 5200, "date": "2025-01-06" },
    // ... up to 52 weeks
  ]
}
```

---

## Edge Cases & Behaviors

### No Goal Set
- Progress bar hidden
- Chart shows balance growth trajectory (no target line)
- No deadline marker
- Time-to-goal not displayed

### Goal Reached (Overfunding)
- Allow continued contributions
- Progress bar shows >100%
- No automatic behavior change
- User manually decides what to do

### Withdrawal Impact
- Recalculate projection from current (post-withdrawal) balance
- Extend estimated completion date
- Don't reset contribution tracking
- Transaction appears in timeline with visual distinction

### Goal Edit Mid-Progress
Prompt user: "Do you want to..."
- Recalculate from today (current balance as new starting point)
- Keep original timeline context (preserve start date)

### Starting Balance
- Represents pre-existing savings imported into the system
- Counted toward goal progress immediately
- No retroactive transaction categorization needed
- Date recorded for reference

---

## What This Feature Does NOT Include

1. **No bank sync** - Planning/tracking only, manual balance adjustments
2. **No automatic goal prioritization** - User manually controls each contribution
3. **No auto-reallocation** - When goal reached, contributions continue as-is
4. **No gamification** - No streaks, badges, or achievements
5. **No lifetime stats** - Current state only, no historical aggregates
6. **No sinking fund distinction** - All savings treated identically

---

## Implementation Phases

### Phase 1: Data Model & Backend
1. Extend accounts table schema
2. Add 'withdrawal' transaction type
3. Create savings projection calculation logic
4. Update account CRUD endpoints
5. Add savings to transfer schedule sync

### Phase 2: Account Creation & Editing
1. Modify account creation modal for progressive disclosure
2. Add context-aware field rendering
3. Implement savings-specific validation
4. Wire up to backend APIs

### Phase 3: Dashboard Integration
1. Update AccountOverviewCard to display savings accounts
2. Add progress bars with expand/collapse
3. Implement projection chart component
4. Add savings segments to TransferPlanningCard
5. Add Savings Contributions line to WeeklySummary

### Phase 4: Transactions Integration
1. Add withdrawal transaction type support
2. Visual distinction styling for savings transactions
3. Transaction filtering/display updates
4. Withdrawal creation flow

### Phase 5: Projections & Polish
1. Implement full projection chart with dual trajectories
2. Add deadline vertical marker
3. Implement underfunding warning
4. Goal edit baseline prompt
5. Testing and refinement

---

## Technical Notes

### Compound Interest Calculation
- Monthly compounding (NZ standard)
- Annual rate stored, converted to monthly for calculations
- Applied every ~4.33 weeks in projection loop

### Color Scheme
- Savings: Blue (`#3B82F6` or similar)
- Expense accounts: Existing color palette
- Visual consistency with banking conventions

### Performance
- Projection calculated client-side (52 weeks is fast)
- Cache projection results if account unchanged
- Lazy-load chart component

---

*Document created: December 30, 2024*
*Based on detailed requirements interview*
