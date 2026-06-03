import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import puzzleRouter from './routes/puzzle.js';
import scoresRouter from './routes/scores.js';
import { getTodayString } from './lib/puzzleStore.js';
import { postLeaderboard } from './lib/discord.js';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/puzzle', puzzleRouter);
app.use('/api/scores', scoresRouter);

// Serve the built React frontend in production
const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDist = join(__dirname, '../../../client/dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(join(clientDist, 'index.html')));
}

cron.schedule('59 23 * * *', async () => {
  console.log('[cron] Posting nightly leaderboard to Discord');
  const dateStr = getTodayString();
  const scores = await prisma.score.findMany({
    where: { date: dateStr },
    orderBy: { timeSeconds: 'asc' },
    select: { playerName: true, timeSeconds: true },
  });
  await postLeaderboard(scores, dateStr);
});

async function start() {
  await prisma.$connect();
  console.log('[db] Connected to SQLite database');
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[server] Running on http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});
