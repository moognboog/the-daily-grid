function fmtTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// Short date for embed headers: YYYY-MM-DD → M/D/YYYY
function fmtShortDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${m}/${d}/${y}`;
}

const MEDALS = ['🥇', '🥈', '🥉'];

async function postLeaderboard(scores, dateStr) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) {
    console.warn('[discord] DISCORD_WEBHOOK_URL not set, skipping webhook');
    return;
  }

  const lines = scores.map((s, i) => {
    const prefix = i < 3 ? MEDALS[i] : `${i + 1}.`;
    return `${prefix} **${s.playerName}** — ${fmtTime(s.timeSeconds)}`;
  });

  const description = lines.length ? lines.join('\n') : '_No completions today_';

  const body = {
    embeds: [
      {
        title: `Daily Grid Leaderboard`,
        description: `📅 ${fmtShortDate(dateStr)}\n\n${description}`,
        color: 0x5865f2,
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) console.error('[discord] Webhook failed:', res.status);
    else console.log('[discord] Leaderboard posted for', dateStr);
  } catch (err) {
    console.error('[discord] Error posting webhook:', err.message);
  }
}

export { postLeaderboard };
