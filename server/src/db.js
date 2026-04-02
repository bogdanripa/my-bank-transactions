import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS institutions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    logo TEXT,
    country TEXT
  );

  CREATE TABLE IF NOT EXISTS requisitions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    institution_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    link TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (institution_id) REFERENCES institutions(id)
  );

  CREATE TABLE IF NOT EXISTS bank_accounts (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    requisition_id TEXT NOT NULL,
    institution_id TEXT NOT NULL,
    iban TEXT,
    name TEXT,
    owner_name TEXT,
    currency TEXT,
    last_synced_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (requisition_id) REFERENCES requisitions(id),
    FOREIGN KEY (institution_id) REFERENCES institutions(id)
  );

  CREATE TABLE IF NOT EXISTS third_parties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    display_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS third_party_aliases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    third_party_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    alias TEXT NOT NULL,
    UNIQUE(user_id, alias),
    FOREIGN KEY (third_party_id) REFERENCES third_parties(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    bank_account_id TEXT NOT NULL,
    booking_date TEXT,
    value_date TEXT,
    amount REAL NOT NULL,
    currency TEXT,
    raw_name TEXT,
    third_party_id INTEGER,
    remittance_info TEXT,
    additional_info TEXT,
    internal_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (id, user_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id),
    FOREIGN KEY (third_party_id) REFERENCES third_parties(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    UNIQUE(user_id, name),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS transaction_tags (
    transaction_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (transaction_id, user_id, tag_id),
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS third_party_tags (
    third_party_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (third_party_id, tag_id),
    FOREIGN KEY (third_party_id) REFERENCES third_parties(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_transactions_booking_date ON transactions(booking_date);
  CREATE INDEX IF NOT EXISTS idx_transactions_third_party ON transactions(third_party_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_amount ON transactions(amount);
  CREATE INDEX IF NOT EXISTS idx_transactions_bank_account ON transactions(bank_account_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
  CREATE INDEX IF NOT EXISTS idx_third_party_aliases_alias ON third_party_aliases(user_id, alias);
  CREATE INDEX IF NOT EXISTS idx_requisitions_user ON requisitions(user_id);
  CREATE INDEX IF NOT EXISTS idx_bank_accounts_user ON bank_accounts(user_id);
`);

export default db;
