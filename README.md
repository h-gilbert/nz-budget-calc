# NZ Budget Calculator

A personal finance and budget tracking application built for New Zealand users. Features account management, recurring expense tracking, automated payment scheduling, and financial projections.

## Features

- **Account Management**: Track multiple bank accounts with sub-accounts
- **Recurring Expenses**: Set up and manage recurring bills and payments
- **Automated Payments**: Schedule automatic payments and transfers
- **Financial Projections**: View projected balances and upcoming expenses
- **Dashboard**: Overview of your financial status at a glance
- **User Authentication**: Secure login with JWT-based authentication

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vue 3, Vite 7 |
| Backend | Node.js 18, Express 4 |
| Database | SQLite (better-sqlite3) |
| Containerization | Docker |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Development Mode

```bash
# Clone the repository
git clone https://github.com/your-username/nz-budget-calculator.git
cd nz-budget-calculator

# Start backend
cd backend
npm install
npm run dev

# Start frontend (in another terminal)
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:8000` and the API at `http://localhost:3200`.

### Production (Docker)

```bash
# Create a .env file with your JWT secret
echo "JWT_SECRET=$(openssl rand -base64 32)" > .env

# Start with Docker Compose
docker-compose -f docker-compose.production.yml up -d
```

## Environment Variables

### Backend

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3200 |
| `NODE_ENV` | Environment | development |
| `JWT_SECRET` | Secret for JWT tokens | **Required** |
| `DATA_DIR` | SQLite database directory | /app/data |
| `FRONTEND_URL` | Frontend URL for CORS | - |

### Frontend

Configure in `frontend/vite.config.js`:
- Dev server port: 8000
- API proxy: `/api` -> `http://localhost:3200`

## Project Structure

```
nz-budget-calculator/
├── frontend/                 # Vue 3 + Vite frontend
│   ├── src/
│   │   ├── components/      # Vue components
│   │   ├── stores/          # Pinia stores
│   │   ├── views/           # Page views
│   │   └── services/        # API services
│   └── vite.config.js
├── backend/                  # Express API backend
│   ├── server.js            # Main server file
│   ├── database.js          # SQLite setup
│   ├── Dockerfile
│   └── routes/              # API routes
├── docker-compose.production.yml
└── deploy.sh                # Deployment script
```

## Database Schema

The application uses SQLite with the following tables:

- `users` - User accounts
- `budget_data` - Budget configurations
- `accounts` - Bank accounts
- `recurring_expenses` - Recurring bills/payments
- `transactions` - Transaction history
- `transfer_schedules` - Scheduled transfers
- `transfers` - Transfer records
- `automation_state` - Automation settings
- `payment_history` - Payment records
- `expense_auto_payments` - Auto-payment configurations

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions including:

- Docker setup
- Nginx reverse proxy configuration
- SSL/TLS setup
- GitHub Actions CI/CD

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Vue.js](https://vuejs.org/)
- Backend powered by [Express](https://expressjs.com/)
- Database using [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
