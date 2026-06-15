const PLAYER_KEY = 'cw_player';
const COMPLETED_KEY = 'cw_completed';

export function getPlayer() {
  try {
    const raw = localStorage.getItem(PLAYER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function savePlayer(data) {
  localStorage.setItem(PLAYER_KEY, JSON.stringify(data));
}

export function getCompletedDates() {
  try {
    const raw = localStorage.getItem(COMPLETED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getCompletedToday(dateStr) {
  const dates = getCompletedDates();
  return dates[dateStr] || null;
}

export function markCompleted(dateStr, timeSeconds) {
  const dates = getCompletedDates();
  if (!dates[dateStr]) {
    dates[dateStr] = { timeSeconds };
    localStorage.setItem(COMPLETED_KEY, JSON.stringify(dates));
  }
}

export function getAverageTime() {
  const dates = getCompletedDates();
  const times = Object.values(dates)
    .map(d => d.timeSeconds)
    .filter(t => typeof t === 'number' && t > 0);
  if (times.length === 0) return 0;
  return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
}

const PROGRESS_KEY = 'cw_progress';

export function getProgress(dateStr) {
  try {
    const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY));
    if (saved?.date !== dateStr) {
      localStorage.removeItem(PROGRESS_KEY);
      return null;
    }
    return saved;
  } catch { return null; }
}

export function saveProgress(dateStr, inputs, elapsedSeconds) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify({ date: dateStr, inputs, elapsedSeconds }));
}

export function clearProgress() {
  localStorage.removeItem(PROGRESS_KEY);
}

export function updateStreak(dateStr) {
  const player = getPlayer();
  if (!player) return;

  const dates = getCompletedDates();
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  const yesterday = d.toISOString().slice(0, 10);

  const newStreak = dates[yesterday] ? (player.streak || 0) + 1 : 1;
  const newBest = Math.max(player.personalBest || 0, newStreak);

  const updated = { ...player, streak: newStreak, personalBest: newBest };
  savePlayer(updated);
  return updated;
}
