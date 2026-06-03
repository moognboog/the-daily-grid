import { Router } from 'express';
import { getPuzzle, getTodayString } from '../lib/puzzleStore.js';

const router = Router();

router.get('/today', async (req, res) => {
  try {
    const puzzle = await getPuzzle(getTodayString());
    res.json(puzzle);
  } catch (err) {
    console.error('[puzzle] Error fetching puzzle:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
