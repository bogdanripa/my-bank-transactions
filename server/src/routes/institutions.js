import { Router } from 'express';
import db from '../db.js';
import { listInstitutions } from '../gocardless.js';

const router = Router();

// List institutions for a country
router.get('/:country', async (req, res) => {
  try {
    const institutions = await listInstitutions(req.params.country);
    res.json(institutions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
