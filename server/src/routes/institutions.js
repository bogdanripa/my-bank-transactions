import { Router } from 'express';
import { listAspsps } from '../enablebanking.js';

const router = Router();

// List available banks for a country
router.get('/:country', async (req, res) => {
  try {
    const aspsps = await listAspsps(req.params.country);
    // Normalize to a consistent format
    const institutions = aspsps.map((a) => ({
      id: `${a.country}_${a.name}`,
      name: a.name,
      country: a.country,
      logo: a.logo || null,
      // Keep original fields for the auth flow
      aspsp_name: a.name,
      aspsp_country: a.country,
    }));
    res.json(institutions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
