import { Router } from 'express';
import db from '../db.js';
import { getAccountTransactions } from '../gocardless.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

function resolveThirdParty(rawName, userId) {
  if (!rawName) return null;

  const normalized = rawName.trim();
  if (!normalized) return null;

  // Check if this alias already exists for this user
  const existing = db
    .prepare(
      'SELECT third_party_id FROM third_party_aliases WHERE alias = ? AND user_id = ?'
    )
    .get(normalized, userId);

  if (existing) return existing.third_party_id;

  // Create a new third party with this name
  const result = db
    .prepare('INSERT INTO third_parties (user_id, display_name) VALUES (?, ?)')
    .run(userId, normalized);

  const thirdPartyId = result.lastInsertRowid;

  db.prepare(
    'INSERT INTO third_party_aliases (third_party_id, user_id, alias) VALUES (?, ?, ?)'
  ).run(thirdPartyId, userId, normalized);

  return thirdPartyId;
}

function extractName(tx) {
  return (
    tx.creditorName ||
    tx.debtorName ||
    tx.remittanceInformationUnstructured ||
    tx.remittanceInformationStructured ||
    tx.additionalInformation ||
    null
  );
}

function syncAccountTransactions(account, booked, userId) {
  let inserted = 0;
  let skipped = 0;

  const insertStmt = db.prepare(
    `INSERT OR IGNORE INTO transactions
     (id, user_id, bank_account_id, booking_date, value_date, amount, currency, raw_name, third_party_id, remittance_info, additional_info, internal_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const insertMany = db.transaction((transactions) => {
    for (const tx of transactions) {
      const txId = tx.transactionId || tx.internalTransactionId || uuidv4();
      const rawName = extractName(tx);
      const thirdPartyId = resolveThirdParty(
        tx.creditorName || tx.debtorName || null,
        userId
      );

      const remittance =
        tx.remittanceInformationUnstructured ||
        tx.remittanceInformationStructured ||
        (tx.remittanceInformationUnstructuredArray || []).join(' ') ||
        null;

      const result = insertStmt.run(
        txId,
        userId,
        account.id,
        tx.bookingDate || null,
        tx.valueDate || null,
        parseFloat(tx.transactionAmount?.amount || 0),
        tx.transactionAmount?.currency || account.currency,
        rawName,
        thirdPartyId,
        remittance,
        tx.additionalInformation || null,
        tx.internalTransactionId || null
      );

      if (result.changes > 0) inserted++;
      else skipped++;
    }
  });

  insertMany(booked);
  return { inserted, skipped };
}

// Sync transactions for a specific account
router.post('/account/:accountId', async (req, res) => {
  try {
    const userId = req.userId;
    const account = db
      .prepare('SELECT * FROM bank_accounts WHERE id = ? AND user_id = ?')
      .get(req.params.accountId, userId);

    if (!account) return res.status(404).json({ error: 'Account not found' });

    const dateFrom = account.last_synced_at
      ? account.last_synced_at.split('T')[0]
      : null;

    const data = await getAccountTransactions(account.id, dateFrom);
    const booked = data.transactions?.booked || [];
    const { inserted, skipped } = syncAccountTransactions(account, booked, userId);

    db.prepare(
      "UPDATE bank_accounts SET last_synced_at = datetime('now') WHERE id = ? AND user_id = ?"
    ).run(account.id, userId);

    res.json({ inserted, skipped, total: booked.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync all accounts
router.post('/all', async (req, res) => {
  try {
    const userId = req.userId;
    const accounts = db
      .prepare('SELECT * FROM bank_accounts WHERE user_id = ?')
      .all(userId);
    const results = [];

    for (const account of accounts) {
      try {
        const dateFrom = account.last_synced_at
          ? account.last_synced_at.split('T')[0]
          : null;

        const data = await getAccountTransactions(account.id, dateFrom);
        const booked = data.transactions?.booked || [];
        const { inserted, skipped } = syncAccountTransactions(account, booked, userId);

        db.prepare(
          "UPDATE bank_accounts SET last_synced_at = datetime('now') WHERE id = ? AND user_id = ?"
        ).run(account.id, userId);

        results.push({
          accountId: account.id,
          name: account.name,
          inserted,
          skipped,
          total: booked.length,
        });
      } catch (err) {
        results.push({
          accountId: account.id,
          name: account.name,
          error: err.message,
        });
      }
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
