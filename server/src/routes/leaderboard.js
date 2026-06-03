import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { getTodayString } from '../lib/puzzleStore.js';

const router = Router();

router.get('/today', async (_req, res) => {
  try {
    const today = getTodayString();
    const scores = await prisma.score.findMany({
      where: { date: today },
      orderBy: { timeSeconds: 'asc' },
    });
    res.json(scores.map((s, i) => ({
      rank: i + 1,
      playerId: s.playerId,
      playerName: s.playerName,
      avatarUrl: s.avatarUrl ?? null,
      timeSeconds: s.timeSeconds,
      date: today,
    })));
  } catch (err) {
    console.error('[leaderboard] today error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

router.get('/averages', async (_req, res) => {
  try {
    const scores = await prisma.score.findMany({ orderBy: { createdAt: 'asc' } });

    const playerMap = new Map();
    for (const s of scores) {
      if (!playerMap.has(s.playerId)) {
        playerMap.set(s.playerId, { playerId: s.playerId, playerName: s.playerName, avatarUrl: s.avatarUrl ?? null, times: [] });
      }
      const p = playerMap.get(s.playerId);
      p.times.push(s.timeSeconds);
      p.playerName = s.playerName;
      if (s.avatarUrl) p.avatarUrl = s.avatarUrl;
    }

    const result = [...playerMap.values()]
      .map(p => ({
        playerId: p.playerId,
        playerName: p.playerName,
        avatarUrl: p.avatarUrl,
        averageTime: Math.round(p.times.reduce((a, b) => a + b, 0) / p.times.length),
        completions: p.times.length,
      }))
      .sort((a, b) => a.averageTime - b.averageTime)
      .map((p, i) => ({ rank: i + 1, ...p }));

    res.json(result);
  } catch (err) {
    console.error('[leaderboard] averages error:', err);
    res.status(500).json({ error: 'Failed to fetch averages' });
  }
});

function calcStreak(dates) {
  const sorted = [...new Set(dates)].sort().reverse();
  if (!sorted.length) return 0;
  const today = getTodayString();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i - 1]) - new Date(sorted[i])) / 86400000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

router.get('/streaks', async (_req, res) => {
  try {
    const scores = await prisma.score.findMany({ orderBy: { date: 'asc' } });

    const playerMap = new Map();
    for (const s of scores) {
      if (!playerMap.has(s.playerId)) {
        playerMap.set(s.playerId, { playerId: s.playerId, playerName: s.playerName, avatarUrl: s.avatarUrl ?? null, dates: [] });
      }
      const p = playerMap.get(s.playerId);
      p.dates.push(s.date);
      p.playerName = s.playerName;
      if (s.avatarUrl) p.avatarUrl = s.avatarUrl;
    }

    const result = [...playerMap.values()]
      .map(p => ({ playerId: p.playerId, playerName: p.playerName, avatarUrl: p.avatarUrl, streak: calcStreak(p.dates), completions: p.dates.length }))
      .filter(p => p.streak > 0)
      .sort((a, b) => b.streak - a.streak)
      .map((p, i) => ({ rank: i + 1, ...p }));

    res.json(result);
  } catch (err) {
    console.error('[leaderboard] streaks error:', err);
    res.status(500).json({ error: 'Failed to fetch streaks' });
  }
});

export default router;
