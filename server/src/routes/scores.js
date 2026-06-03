import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { getTodayString } from '../lib/puzzleStore.js';

const router = Router();

router.post('/', async (req, res) => {
  const { playerId, playerName, avatarUrl, timeSeconds, date } = req.body;
  if (!playerId || !playerName || timeSeconds == null || !date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!Number.isInteger(timeSeconds) || timeSeconds <= 0 || timeSeconds > 3600) {
    return res.status(400).json({ error: 'timeSeconds must be a positive integer no greater than 3600' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date must be in YYYY-MM-DD format' });
  }

  try {
    await prisma.score.upsert({
      where: { playerId_date: { playerId, date } },
      update: { playerName, avatarUrl: avatarUrl ?? null },
      create: { playerId, playerName, avatarUrl: avatarUrl ?? null, timeSeconds, date },
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[scores] Error saving score:', err);
    res.status(500).json({ error: 'Failed to save score' });
  }
});

router.get('/today', async (req, res) => {
  try {
    const scores = await prisma.score.findMany({
      where: { date: getTodayString() },
      orderBy: { timeSeconds: 'asc' },
      select: { playerName: true, playerId: true, timeSeconds: true },
    });

    const ranked = scores.map((s, i) => ({ rank: i + 1, playerName: s.playerName, playerId: s.playerId, timeSeconds: s.timeSeconds }));
    res.json(ranked);
  } catch (err) {
    console.error('[scores] Error fetching scores:', err);
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

export default router;
