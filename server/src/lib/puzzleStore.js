import prisma from './prisma.js';

const puzzleCache = new Map();

function mtDateString(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver' }).format(date);
}

export function getTodayString() {
  return mtDateString(new Date());
}

export function getYesterdayString() {
  return mtDateString(new Date(Date.now() - 86400000));
}

// ── Cycle helpers ─────────────────────────────────────────────────────────────
// The cycle system freezes the pool size at the start of each cycle so adding
// new puzzles mid-cycle never changes what date maps to what puzzle. New puzzles
// queue up and join automatically when the next cycle begins.

async function getCycleConfig() {
  const rows = await prisma.config.findMany({
    where: { key: { in: ['cycleStartEpoch', 'cycleSize'] } },
  });
  const m = Object.fromEntries(rows.map(r => [r.key, parseInt(r.value)]));
  return {
    cycleStartEpoch: isNaN(m.cycleStartEpoch) ? null : m.cycleStartEpoch,
    cycleSize: isNaN(m.cycleSize) ? null : m.cycleSize,
  };
}

async function saveCycleConfig(cycleStartEpoch, cycleSize) {
  for (const [key, value] of [['cycleStartEpoch', cycleStartEpoch], ['cycleSize', cycleSize]]) {
    await prisma.config.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });
  }
}

async function getPoolPuzzle(pool, epoch) {
  let { cycleStartEpoch, cycleSize } = await getCycleConfig();
  const daysSince = cycleStartEpoch != null ? epoch - cycleStartEpoch : -1;

  if (cycleStartEpoch == null || daysSince < 0 || daysSince >= cycleSize) {
    // First run: align to old epoch % pool.length formula so nothing changes on deploy.
    // Cycle end: start a fresh cycle from today with the full current pool.
    const newStart = cycleStartEpoch == null
      ? epoch - (epoch % pool.length)
      : epoch;
    await saveCycleConfig(newStart, pool.length);
    cycleStartEpoch = newStart;
    cycleSize = pool.length;
    console.log(`[puzzle] New cycle: start=${newStart}, size=${pool.length}`);
  }

  const targetPosition = epoch - cycleStartEpoch; // 0..cycleSize-1
  return (
    pool.find(p => p.position === targetPosition) ??
    pool[targetPosition % pool.length]            // fallback if position gaps exist
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export async function getPuzzle(dateStr) {
  if (puzzleCache.has(dateStr)) return puzzleCache.get(dateStr);

  const total = await prisma.puzzle.count();
  if (total === 0) {
    throw new Error('No puzzles found. Run: cd server && npm run db:seed');
  }

  // Date-pinned puzzles take priority over the rotation
  let row = await prisma.puzzle.findFirst({
    where: { date: dateStr },
    orderBy: { position: 'asc' },
  });

  // Fall back to rotating pool (date-pinned puzzles join after their date passes)
  if (!row) {
    const pool = await prisma.puzzle.findMany({
      where: { OR: [{ date: null }, { date: { lt: dateStr } }] },
      orderBy: { position: 'asc' },
    });
    if (pool.length === 0) {
      // All puzzles are pinned to future dates — nothing to serve yet
      throw new Error('No puzzles available for ' + dateStr);
    }
    const epoch = Math.floor(new Date(dateStr).getTime() / 86400000);
    row = await getPoolPuzzle(pool, epoch);
  }

  const puzzle = {
    date: dateStr,
    rows: row.rows,
    cols: row.cols,
    words: JSON.parse(row.wordsJson),
  };

  puzzleCache.set(dateStr, puzzle);
  if (puzzleCache.size > 3) {
    puzzleCache.delete(puzzleCache.keys().next().value);
  }
  return puzzle;
}
