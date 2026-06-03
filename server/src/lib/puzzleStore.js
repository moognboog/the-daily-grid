import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const puzzleCache = new Map();

export function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

export async function getPuzzle(dateStr) {
  if (puzzleCache.has(dateStr)) return puzzleCache.get(dateStr);

  const total = await prisma.puzzle.count();
  if (total === 0) {
    throw new Error('No puzzles found. Run: cd server && npm run db:seed');
  }

  // Date-pinned puzzles take priority over the rotation
  let row = await prisma.puzzle.findFirst({
    where: { date: dateStr },
    orderBy: { id: 'asc' },
  });

  // Fall back to rotating pool (excludes date-pinned entries)
  if (!row) {
    const pool = await prisma.puzzle.findMany({
      where: { date: null },
      orderBy: { id: 'asc' },
    });
    if (pool.length === 0) {
      // All puzzles are pinned — fall back to any puzzle
      const all = await prisma.puzzle.findMany({ orderBy: { id: 'asc' } });
      const epoch = Math.floor(new Date(dateStr).getTime() / 86400000);
      row = all[epoch % all.length];
    } else {
      const epoch = Math.floor(new Date(dateStr).getTime() / 86400000);
      row = pool[epoch % pool.length];
    }
  }

  const puzzle = {
    date: dateStr,
    rows: row.rows,
    cols: row.cols,
    words: JSON.parse(row.wordsJson),
  };

  puzzleCache.set(dateStr, puzzle);
  return puzzle;
}
