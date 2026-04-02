import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Search / list transactions with filters
router.get('/', (req, res) => {
  const userId = req.userId;
  const {
    search,
    third_party_id,
    tag,
    bank_account_id,
    date_from,
    date_to,
    min_amount,
    max_amount,
    sort_by = 'booking_date',
    sort_dir = 'DESC',
    limit = 100,
    offset = 0,
  } = req.query;

  const conditions = ['t.user_id = ?'];
  const params = [userId];

  if (search) {
    conditions.push(
      `(t.raw_name LIKE ? OR t.remittance_info LIKE ? OR t.additional_info LIKE ? OR tp.display_name LIKE ?)`
    );
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  if (third_party_id) {
    conditions.push('t.third_party_id = ?');
    params.push(third_party_id);
  }

  if (tag) {
    conditions.push(
      `(t.id IN (SELECT transaction_id FROM transaction_tags tt JOIN tags tg ON tt.tag_id = tg.id WHERE tg.name = ? AND tt.user_id = ?)
        OR t.third_party_id IN (SELECT third_party_id FROM third_party_tags tpt JOIN tags tg2 ON tpt.tag_id = tg2.id WHERE tg2.name = ?))`
    );
    params.push(tag, userId, tag);
  }

  if (bank_account_id) {
    conditions.push('t.bank_account_id = ?');
    params.push(bank_account_id);
  }

  if (date_from) {
    conditions.push('t.booking_date >= ?');
    params.push(date_from);
  }

  if (date_to) {
    conditions.push('t.booking_date <= ?');
    params.push(date_to);
  }

  if (min_amount) {
    conditions.push('t.amount >= ?');
    params.push(parseFloat(min_amount));
  }

  if (max_amount) {
    conditions.push('t.amount <= ?');
    params.push(parseFloat(max_amount));
  }

  const allowedSorts = ['booking_date', 'amount', 'raw_name'];
  const sortCol = allowedSorts.includes(sort_by) ? sort_by : 'booking_date';
  const sortDirection = sort_dir === 'ASC' ? 'ASC' : 'DESC';

  const whereClause = 'WHERE ' + conditions.join(' AND ');

  const countSql = `
    SELECT COUNT(*) as total
    FROM transactions t
    LEFT JOIN third_parties tp ON t.third_party_id = tp.id
    ${whereClause}
  `;

  const dataSql = `
    SELECT t.*,
           tp.display_name as third_party_name,
           ba.name as account_name,
           ba.iban as account_iban,
           i.name as institution_name
    FROM transactions t
    LEFT JOIN third_parties tp ON t.third_party_id = tp.id
    LEFT JOIN bank_accounts ba ON t.bank_account_id = ba.id
    LEFT JOIN institutions i ON ba.institution_id = i.id
    ${whereClause}
    ORDER BY ${sortCol} ${sortDirection}
    LIMIT ? OFFSET ?
  `;

  const total = db.prepare(countSql).get(...params).total;
  const transactions = db
    .prepare(dataSql)
    .all(...params, parseInt(limit), parseInt(offset));

  // Attach tags to each transaction
  const tagStmt = db.prepare(
    `SELECT tg.name FROM transaction_tags tt
     JOIN tags tg ON tt.tag_id = tg.id
     WHERE tt.transaction_id = ? AND tt.user_id = ?`
  );

  for (const tx of transactions) {
    tx.tags = tagStmt.all(tx.id, userId).map((t) => t.name);
  }

  res.json({ transactions, total });
});

// Get summary for a third party (total paid/received)
router.get('/summary/third-party/:id', (req, res) => {
  const stats = db
    .prepare(
      `SELECT
         COUNT(*) as count,
         SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END) as total_paid,
         SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_received,
         MIN(booking_date) as first_transaction,
         MAX(booking_date) as last_transaction
       FROM transactions
       WHERE third_party_id = ? AND user_id = ?`
    )
    .get(req.params.id, req.userId);

  res.json(stats);
});

// Tag a transaction
router.post('/:id/tags', (req, res) => {
  const { tag } = req.body;
  const userId = req.userId;

  db.prepare('INSERT OR IGNORE INTO tags (user_id, name) VALUES (?, ?)').run(userId, tag);
  const tagRow = db
    .prepare('SELECT id FROM tags WHERE name = ? AND user_id = ?')
    .get(tag, userId);

  db.prepare(
    'INSERT OR IGNORE INTO transaction_tags (transaction_id, user_id, tag_id) VALUES (?, ?, ?)'
  ).run(req.params.id, userId, tagRow.id);

  res.json({ ok: true });
});

// Remove tag from transaction
router.delete('/:id/tags/:tagName', (req, res) => {
  const tagRow = db
    .prepare('SELECT id FROM tags WHERE name = ? AND user_id = ?')
    .get(req.params.tagName, req.userId);

  if (tagRow) {
    db.prepare(
      'DELETE FROM transaction_tags WHERE transaction_id = ? AND user_id = ? AND tag_id = ?'
    ).run(req.params.id, req.userId, tagRow.id);
  }

  res.json({ ok: true });
});

// Top transactions by absolute value
router.get('/top', (req, res) => {
  const { limit = 50, direction } = req.query;

  let extraCondition = '';
  if (direction === 'out') extraCondition = 'AND t.amount < 0';
  else if (direction === 'in') extraCondition = 'AND t.amount > 0';

  const transactions = db
    .prepare(
      `SELECT t.*,
              tp.display_name as third_party_name,
              ba.name as account_name,
              i.name as institution_name
       FROM transactions t
       LEFT JOIN third_parties tp ON t.third_party_id = tp.id
       LEFT JOIN bank_accounts ba ON t.bank_account_id = ba.id
       LEFT JOIN institutions i ON ba.institution_id = i.id
       WHERE t.user_id = ? ${extraCondition}
       ORDER BY ABS(t.amount) DESC
       LIMIT ?`
    )
    .all(req.userId, parseInt(limit));

  res.json(transactions);
});

export default router;
