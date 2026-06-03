import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const __dirname = dirname(fileURLToPath(import.meta.url));
const puzzlesPath = join(__dirname, '../../data/puzzles.json');

function assignNumbers(words) {
  const sorted = [...words].sort((a, b) =>
    a.startRow !== b.startRow ? a.startRow - b.startRow : a.startCol - b.startCol
  );

  const posToNum = new Map();
  let next = 1;
  for (const w of sorted) {
    const key = `${w.startRow},${w.startCol}`;
    if (!posToNum.has(key)) posToNum.set(key, next++);
  }

  return words.map(w => ({
    answer: w.answer.toUpperCase(),
    clue: w.clue,
    direction: w.direction,
    startRow: w.startRow,
    startCol: w.startCol,
    length: w.answer.length,
    number: posToNum.get(`${w.startRow},${w.startCol}`),
  }));
}

// Fisher-Yates shuffle (in-place)
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function seed() {
  const raw = JSON.parse(readFileSync(puzzlesPath, 'utf8'));

  // Give untitled puzzles a generated title so position tracking works
  raw.forEach((p, i) => { if (!p.title) p.title = `Puzzle ${i + 1}`; });

  // Save existing title → position before clearing
  const existing = await prisma.puzzle.findMany();
  const positionByTitle = new Map(
    existing
      .filter(p => p.title && p.position != null)
      .map(p => [p.title, p.position])
  );

  // Find puzzles that are new (no existing position) and assign them positions
  const newPuzzles = raw.filter(p => !positionByTitle.has(p.title));
  const maxPos = positionByTitle.size > 0
    ? Math.max(...positionByTitle.values())
    : -1;

  // Shuffle new puzzles so they land in random order at the end of the cycle
  shuffle(newPuzzles);
  newPuzzles.forEach((p, i) => positionByTitle.set(p.title, maxPos + 1 + i));

  // Clear and re-insert with stable positions
  await prisma.puzzle.deleteMany();

  for (const p of raw) {
    const words = assignNumbers(p.words);
    await prisma.puzzle.create({
      data: {
        title: p.title,
        date: p.date ?? null,
        rows: p.rows,
        cols: p.cols,
        wordsJson: JSON.stringify(words),
        position: positionByTitle.get(p.title) ?? 0,
      },
    });

    for (const w of words) {
      await prisma.wordClue.upsert({
        where: { word_clue: { word: w.answer, clue: w.clue } },
        update: {},
        create: { word: w.answer, clue: w.clue },
      });
    }
  }

  const puzzleCount = await prisma.puzzle.count();
  const wordCount = await prisma.wordClue.count();
  console.log(`[seed] ${puzzleCount} puzzle(s) loaded, ${wordCount} word/clue pair(s) in bank`);
  console.log(`[seed] Rotation order:`);
  const ordered = await prisma.puzzle.findMany({ where: { date: null }, orderBy: { position: 'asc' } });
  ordered.forEach(p => console.log(`  [${p.position}] ${p.title}`));

  await prisma.$disconnect();
}

seed().catch(err => {
  console.error('[seed] Failed:', err.message);
  process.exit(1);
});
