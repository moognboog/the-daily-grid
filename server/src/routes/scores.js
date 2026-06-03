import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { getTodayString } from '../lib/puzzleStore.js';

const router = Router();
const prisma = new PrismaClient();

router.post('/', async (req, res) => {
  const { playerId, playerName, timeSeconds, date } = req.body;
  if (!playerId || !playerName || timeSeconds == null || !date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await prisma.score.upsert({
      where: { playerId_date: { playerId, date } },
      update: {},
      create: { playerId, playerName, timeSeconds, date },
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
