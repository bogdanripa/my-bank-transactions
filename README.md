# BankLens

Multi-bank transaction tracker using Enable Banking API. Connect multiple bank accounts, sync all transactions, search, tag, and manage third parties across all your banks.

## Features

- **Multi-bank support** via Enable Banking - connect banks across 29 European countries
- **On-demand sync** - pull new transactions with a button click
- **Smart third-party matching** - automatically groups transactions by beneficiary/payer
- **Manual merge** - merge duplicate third parties across different banks
- **Tagging** - tag transactions and third parties for categorization
- **Custom naming** - rename third parties to friendly names
- **Powerful search** - search by name, date range, amount, tags across all accounts
- **Top transactions** - view largest transactions to identify key entities
- **Multi-user** - JWT-based auth, each user's data is isolated

## Setup

### Prerequisites

- Node.js 18+
- Enable Banking account and application ([sign up here](https://enablebanking.com/))

### Install

```bash
npm run install:all
```

### Configure

1. Sign up at [Enable Banking](https://enablebanking.com/) and create an application
2. Download your private key (`.pem` file) and place it in the `server/` directory
3. Copy and edit the environment file:

```bash
cp server/.env.example server/.env
```

Fill in:
- `ENABLE_BANKING_APP_ID` - your application ID from Enable Banking
- `ENABLE_BANKING_KEY_PATH` - path to your private key `.pem` file
- `JWT_SECRET` - any random string for signing auth tokens

### Run

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Architecture

- **Backend**: Node.js + Express + SQLite (better-sqlite3)
- **Frontend**: React (Vite) + Tailwind CSS
- **Banking API**: Enable Banking (supports 2,500+ banks across Europe)
- **Auth**: JWT tokens, bcrypt password hashing
- **Database**: SQLite with WAL mode for performance
