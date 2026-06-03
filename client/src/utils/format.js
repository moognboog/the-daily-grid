/**
 * Format a duration in seconds as MM:SS.
 * @param {number} s - elapsed seconds
 * @returns {string}
 */
export function fmt(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

export function cellKey(r, c) {
  return `${r},${c}`;
}

export function fmtDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
