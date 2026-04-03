import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { startAuth, createSession, getSession } from '../enablebanking.js';

const router = Router();

// Start bank authorization flow
router.post('/', async (req, res) => {
  try {
    const { aspsp_name, aspsp_country, redirect_url, institution_name, institution_logo } = req.body;
    const userId = req.userId;
    const state = uuidv4();
    const institutionId = `${aspsp_country}_${aspsp_name}`;

    // Save institution if not exists
    db.prepare(
      'INSERT OR IGNORE INTO institutions (id, name, logo, country) VALUES (?, ?, ?, ?)'
    ).run(institutionId, institution_name || aspsp_name, institution_logo || null, aspsp_country);

    const result = await startAuth({
      aspspName: aspsp_name,
      aspspCountry: aspsp_country,
      redirectUrl: redirect_url,
      state,
    });

    // Store the requisition with state as ID (we'll match on it when the callback comes)
    db.prepare(
      'INSERT INTO requisitions (id, user_id, institution_id, status, link) VALUES (?, ?, ?, ?, ?)'
    ).run(state, userId, institutionId, 'pending', result.url);

    res.json({ id: state, link: result.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Complete authorization - exchange code for session and fetch accounts
router.post('/:id/complete', async (req, res) => {
  try {
    const userId = req.userId;
    const { code } = req.body;
    const reqId = req.params.id;

    const localReq = db
      .prepare('SELECT * FROM requisitions WHERE id = ? AND user_id = ?')
      .get(reqId, userId);

    if (!localReq) return res.status(404).json({ error: 'Requisition not found' });

    // Exchange auth code for session
    const session = await createSession(code);

    // Update requisition with session_id and mark as linked
    db.prepare(
      'UPDATE requisitions SET status = ?, link = ? WHERE id = ? AND user_id = ?'
    ).run('LN', session.session_id, reqId, userId);

    // Save accounts from the session
    const accounts = session.accounts || [];
    for (const acc of accounts) {
      db.prepare(
        `INSERT OR IGNORE INTO bank_accounts (id, user_id, requisition_id, institution_id, iban, name, owner_name, currency)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        acc.uid,
        userId,
        reqId,
        localReq.institution_id,
        acc.iban || null,
        acc.account_name || acc.iban || acc.uid,
        acc.owner_name || null,
        acc.currency || null
      );
    }

    res.json({ status: 'LN', accounts, session_id: session.session_id });
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
