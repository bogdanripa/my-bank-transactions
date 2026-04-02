import { Router } from 'express';
import db from '../db.js';
import {
  createRequisition,
  getRequisition,
  getAccountDetails,
  deleteRequisition,
} from '../gocardless.js';

const router = Router();

// Create a new requisition (bank connection)
router.post('/', async (req, res) => {
  try {
    const { institution_id, redirect_url } = req.body;
    const userId = req.userId;

    // Save institution if not exists
    db.prepare(
      'INSERT OR IGNORE INTO institutions (id, name, logo, country) VALUES (?, ?, ?, ?)'
    ).run(
      institution_id,
      req.body.institution_name || institution_id,
      req.body.institution_logo || null,
      req.body.institution_country || null
    );

    const result = await createRequisition(institution_id, redirect_url);

    db.prepare(
      'INSERT INTO requisitions (id, user_id, institution_id, status, link) VALUES (?, ?, ?, ?, ?)'
    ).run(result.id, userId, institution_id, result.status, result.link);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Complete requisition - fetch accounts after user has authorized
router.post('/:id/complete', async (req, res) => {
  try {
    const userId = req.userId;
    const localReq = db
      .prepare('SELECT * FROM requisitions WHERE id = ? AND user_id = ?')
      .get(req.params.id, userId);

    if (!localReq) return res.status(404).json({ error: 'Requisition not found' });

    const requisition = await getRequisition(req.params.id);

    db.prepare('UPDATE requisitions SET status = ? WHERE id = ? AND user_id = ?').run(
      requisition.status,
      req.params.id,
      userId
    );

    if (requisition.status !== 'LN') {
      return res.json({ status: requisition.status, accounts: [] });
    }

    const accounts = [];
    for (const accountId of requisition.accounts) {
      try {
        const details = await getAccountDetails(accountId);
        db.prepare(
          `INSERT OR IGNORE INTO bank_accounts (id, user_id, requisition_id, institution_id, iban, name, owner_name, currency)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          accountId,
          userId,
          req.params.id,
          requisition.institution_id,
          details.iban || null,
          details.owner_name || details.iban || accountId,
          details.owner_name || null,
          details.currency || null
        );
        accounts.push({ id: accountId, ...details });
      } catch (err) {
        console.error(`Error fetching account ${accountId}:`, err.message);
      }
    }

    res.json({ status: requisition.status, accounts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all requisitions with their accounts
router.get('/', (req, res) => {
  const requisitions = db
    .prepare(
      `SELECT r.*, i.name as institution_name, i.logo as institution_logo
       FROM requisitions r
       JOIN institutions i ON r.institution_id = i.id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`
    )
    .all(req.userId);

  for (const r of requisitions) {
    r.accounts = db
      .prepare('SELECT * FROM bank_accounts WHERE requisition_id = ? AND user_id = ?')
      .all(r.id, req.userId);
  }

  res.json(requisitions);
});

// Delete a requisition
router.delete('/:id', async (req, res) => {
  try {
    const localReq = db
      .prepare('SELECT * FROM requisitions WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.userId);

    if (!localReq) return res.status(404).json({ error: 'Not found' });

    try {
      await deleteRequisition(req.params.id);
    } catch (e) {
      // Ignore if already deleted on GoCardless side
    }
    db.prepare('DELETE FROM bank_accounts WHERE requisition_id = ? AND user_id = ?').run(
      req.params.id,
      req.userId
    );
    db.prepare('DELETE FROM requisitions WHERE id = ? AND user_id = ?').run(
      req.params.id,
      req.userId
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
