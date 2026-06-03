import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { getTodayString, getYesterdayString } from '../lib/puzzleStore.js';

const router = Router();

function groupByPlayer(scores) {
  const map = new Map();
  for (const s of scores) {
    if (!map.has(s.playerId)) {
      map.set(s.playerId, { playerId: s.playerId, playerName: s.playerName, avatarUrl: s.avatarUrl ?? null, scores: [] });
    }
    const p = map.get(s.playerId);
    p.playerName = s.playerName;
    if (s.avatarUrl) p.avatarUrl = s.avatarUrl;
    p.scores.push(s);
  }
  return [...map.values()];
}

function calcStreak(dates) {
  const sorted = [...new Set(dates)].sort().reverse();
  if (!sorted.length) return 0;
  if (sorted[0] !== getTodayString() && sorted[0] !== getYesterdayString()) return 0;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i - 1]) - new Date(sorted[i])) / 86400000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

router.get('/today', async (_req, res) => {
  try {
    const today = getTodayString();
    const scores = await prisma.score.findMany({
      where: { date: today },
      orderBy: { timeSeconds: 'asc' },
      take: 100,
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
    const result = groupByPlayer(scores)
      .map(p => ({
        playerId: p.playerId,
        playerName: p.playerName,
        avatarUrl: p.avatarUrl,
        averageTime: Math.round(p.scores.reduce((sum, s) => sum + s.timeSeconds, 0) / p.scores.length),
        completions: p.scores.length,
      }))
      .sort((a, b) => a.averageTime - b.averageTime)
      .slice(0, 100)
      .map((p, i) => ({ rank: i + 1, ...p }));
    res.json(result);
  } catch (err) {
    console.error('[leaderboard] averages error:', err);
    res.status(500).json({ error: 'Failed to fetch averages' });
  }
});

router.get('/streaks', async (_req, res) => {
  try {
    const scores = await prisma.score.findMany({ orderBy: { date: 'asc' } });
    const result = groupByPlayer(scores)
      .map(p => ({
        playerId: p.playerId,
        playerName: p.playerName,
        avatarUrl: p.avatarUrl,
        streak: calcStreak(p.scores.map(s => s.date)),
        completions: p.scores.length,
      }))
      .filter(p => p.streak > 0)
      .sort((a, b) => b.streak - a.streak)
      .slice(0, 100)
      .map((p, i) => ({ rank: i + 1, ...p }));
    res.json(result);
  } catch (err) {
    console.error('[leaderboard] streaks error:', err);
    res.status(500).json({ error: 'Failed to fetch streaks' });
  }
});

export default router;
