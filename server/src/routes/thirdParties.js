import { Router } from 'express';
import db from '../db.js';

const router = Router();

// List all third parties with stats
router.get('/', (req, res) => {
  const userId = req.userId;
  const { search, sort_by = 'display_name', limit = 100, offset = 0 } = req.query;

  const conditions = ['tp.user_id = ?'];
  const params = [userId];

  if (search) {
    conditions.push(
      `(tp.display_name LIKE ? OR EXISTS (
        SELECT 1 FROM third_party_aliases a WHERE a.third_party_id = tp.id AND a.alias LIKE ?
      ))`
    );
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereClause = 'WHERE ' + conditions.join(' AND ');

  const thirdParties = db
    .prepare(
      `SELECT tp.*,
              COUNT(t.id) as transaction_count,
              COALESCE(SUM(CASE WHEN t.amount < 0 THEN t.amount ELSE 0 END), 0) as total_paid,
              COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END), 0) as total_received,
              COALESCE(SUM(t.amount), 0) as net_amount
       FROM third_parties tp
       LEFT JOIN transactions t ON tp.id = t.third_party_id
       ${whereClause}
       GROUP BY tp.id
       ORDER BY ${sort_by === 'total' ? 'ABS(net_amount)' : sort_by === 'transaction_count' ? 'transaction_count' : 'tp.display_name'} DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, parseInt(limit), parseInt(offset));

  // Attach aliases and tags
  const aliasStmt = db.prepare(
    'SELECT alias FROM third_party_aliases WHERE third_party_id = ?'
  );
  const tagStmt = db.prepare(
    `SELECT tg.name FROM third_party_tags tpt
     JOIN tags tg ON tpt.tag_id = tg.id
     WHERE tpt.third_party_id = ?`
  );

  for (const tp of thirdParties) {
    tp.aliases = aliasStmt.all(tp.id).map((a) => a.alias);
    tp.tags = tagStmt.all(tp.id).map((t) => t.name);
  }

  res.json(thirdParties);
});

// Get a single third party with details
router.get('/:id', (req, res) => {
  const tp = db
    .prepare('SELECT * FROM third_parties WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!tp) return res.status(404).json({ error: 'Not found' });

  tp.aliases = db
    .prepare('SELECT alias FROM third_party_aliases WHERE third_party_id = ?')
    .all(tp.id)
    .map((a) => a.alias);

  tp.tags = db
    .prepare(
      `SELECT tg.name FROM third_party_tags tpt
       JOIN tags tg ON tpt.tag_id = tg.id
       WHERE tpt.third_party_id = ?`
    )
    .all(tp.id)
    .map((t) => t.name);

  res.json(tp);
});

// Rename a third party
router.patch('/:id', (req, res) => {
  const { display_name } = req.body;
  db.prepare('UPDATE third_parties SET display_name = ? WHERE id = ? AND user_id = ?').run(
    display_name,
    req.params.id,
    req.userId
  );
  res.json({ ok: true });
});

// Merge third parties: merge source into target
router.post('/merge', (req, res) => {
  const { target_id, source_ids } = req.body;
  const userId = req.userId;

  const target = db
    .prepare('SELECT * FROM third_parties WHERE id = ? AND user_id = ?')
    .get(target_id, userId);
  if (!target) return res.status(404).json({ error: 'Target not found' });

  const merge = db.transaction(() => {
    for (const sourceId of source_ids) {
      // Verify ownership
      const source = db
        .prepare('SELECT id FROM third_parties WHERE id = ? AND user_id = ?')
        .get(sourceId, userId);
      if (!source) continue;

      // Move all aliases to target
      db.prepare(
        'UPDATE OR IGNORE third_party_aliases SET third_party_id = ? WHERE third_party_id = ?'
      ).run(target_id, sourceId);

      // Delete duplicate aliases that couldn't be moved
      db.prepare(
        'DELETE FROM third_party_aliases WHERE third_party_id = ?'
      ).run(sourceId);

      // Move all transactions to target
      db.prepare(
        'UPDATE transactions SET third_party_id = ? WHERE third_party_id = ? AND user_id = ?'
      ).run(target_id, sourceId, userId);

      // Move tags (ignore duplicates)
      db.prepare(
        'UPDATE OR IGNORE third_party_tags SET third_party_id = ? WHERE third_party_id = ?'
      ).run(target_id, sourceId);

      db.prepare('DELETE FROM third_party_tags WHERE third_party_id = ?').run(sourceId);

      // Delete the source third party
      db.prepare('DELETE FROM third_parties WHERE id = ? AND user_id = ?').run(
        sourceId,
        userId
      );
    }
  });

  merge();
  res.json({ ok: true });
});

// Tag a third party
router.post('/:id/tags', (req, res) => {
  const { tag } = req.body;
  const userId = req.userId;

  db.prepare('INSERT OR IGNORE INTO tags (user_id, name) VALUES (?, ?)').run(userId, tag);
  const tagRow = db
    .prepare('SELECT id FROM tags WHERE name = ? AND user_id = ?')
    .get(tag, userId);

  db.prepare(
    'INSERT OR IGNORE INTO third_party_tags (third_party_id, tag_id) VALUES (?, ?)'
  ).run(req.params.id, tagRow.id);

  res.json({ ok: true });
});

// Remove tag from third party
router.delete('/:id/tags/:tagName', (req, res) => {
  const tagRow = db
    .prepare('SELECT id FROM tags WHERE name = ? AND user_id = ?')
    .get(req.params.tagName, req.userId);

  if (tagRow) {
    db.prepare(
      'DELETE FROM third_party_tags WHERE third_party_id = ? AND tag_id = ?'
    ).run(req.params.id, tagRow.id);
  }

  res.json({ ok: true });
});

export default router;
