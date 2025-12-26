# NZ Budget Calculator

## Project Overview
New Zealand budget calculator with Vue.js frontend and Node.js/Express backend using SQLite for storage.

## Tech Stack
- **Frontend**: Vue 3, Vite 7
- **Backend**: Node.js 18, Express 4
- **Database**: SQLite (better-sqlite3)
- **Containerization**: Docker (production)

## Port Configuration

| Service | Port | Description |
|---------|------|-------------|
| Frontend (Dev) | 8000 | Vite dev server |
| Backend API | 3200 | Express server |
| Database | N/A | SQLite (file-based) |

## Running Locally

### Development Mode
```bash
# Start backend
cd backend && npm run dev

# Start frontend (in another terminal)
cd frontend && npm run dev
```

### Production Docker
```bash
docker-compose -f docker-compose.production.yml up
```

## Environment Variables

### Backend
- `PORT`: 3200
- `NODE_ENV`: development/production
- `JWT_SECRET`: Required for authentication
- `DATA_DIR`: SQLite database directory (default: /app/data in prod)
- `FRONTEND_URL`: https://budget.hamishgilbert.com (production)

### Frontend (vite.config.js)
- Dev server port: 8000
- API proxy: /api -> http://localhost:3200

## Docker Services
- **backend**: Express on port 3200
  - Volume: budget-data for SQLite persistence
  - Memory: 512MB max, 256MB reserved

## Project Structure
```
nz-budget-calculator/
├── frontend/          # Vue 3 + Vite
├── backend/           # Express API
│   ├── Dockerfile
│   └── database.js    # SQLite setup
└── docker-compose.production.yml
```

## Database Tables
- users
- budget_data
- accounts
- recurring_expenses
- transactions
- transfer_schedules
- transfers
- automation_state
- payment_history
- expense_auto_payments

## Notes
- Uses SQLite for simplicity - no external database needed
- Frontend on port 8000 is unique across all projects
- Backend on 3200 is unique
- Production URL: https://budget.hamishgilbert.com
