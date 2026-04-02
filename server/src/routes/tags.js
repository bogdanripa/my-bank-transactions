import { Router } from 'express';
import db from '../db.js';

const router = Router();

// List all tags
router.get('/', (req, res) => {
  const tags = db
    .prepare(
      `SELECT tg.*,
              (SELECT COUNT(*) FROM transaction_tags tt WHERE tt.tag_id = tg.id) as transaction_count,
              (SELECT COUNT(*) FROM third_party_tags tpt WHERE tpt.tag_id = tg.id) as third_party_count
       FROM tags tg
       WHERE tg.user_id = ?
       ORDER BY tg.name`
    )
    .all(req.userId);

  res.json(tags);
});

// Delete a tag
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM tags WHERE id = ? AND user_id = ?').run(
    req.params.id,
    req.userId
  );
  res.json({ ok: true });
});

export default router;
