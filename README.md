# BankLens

Multi-bank transaction tracker using GoCardless Bank Account Data API. Connect multiple bank accounts, sync all transactions, search, tag, and manage third parties across all your banks.

## Features

- **Multi-bank support** via GoCardless (formerly Nordigen) - connect banks across Europe
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
- GoCardless Bank Account Data API credentials ([get them here](https://bankaccountdata.gocardless.com/))

### Install

```bash
npm run install:all
```

### Configure

```bash
cp server/.env.example server/.env
# Edit server/.env with your GoCardless credentials and JWT secret
```

### Run

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Architecture

- **Backend**: Node.js + Express + SQLite (better-sqlite3)
- **Frontend**: React (Vite) + Tailwind CSS
- **Auth**: JWT tokens, bcrypt password hashing
- **Database**: SQLite with WAL mode for performance
