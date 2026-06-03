import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const __dirname = dirname(fileURLToPath(import.meta.url));
const puzzlesPath = join(__dirname, '../../data/puzzles.json');

function assignNumbers(words) {
  // Sort by startRow then startCol — standard crossword scan order
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

async function seed() {
  const raw = JSON.parse(readFileSync(puzzlesPath, 'utf8'));

  // Clear and re-insert puzzles so IDs stay stable for the rotation
  await prisma.puzzle.deleteMany();

  for (const p of raw) {
    const words = assignNumbers(p.words);
    await prisma.puzzle.create({
      data: {
        title: p.title ?? null,
        date: p.date ?? null,
        rows: p.rows,
        cols: p.cols,
        wordsJson: JSON.stringify(words),
      },
    });

    // Populate the word bank — upsert so re-seeding is safe
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
  await prisma.$disconnect();
}

seed().catch(err => {
  console.error('[seed] Failed:', err.message);
  process.exit(1);
});
