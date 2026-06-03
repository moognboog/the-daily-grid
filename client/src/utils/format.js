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

/**
 * Produce a stable string key for a grid cell.
 * @param {number} r - row index
 * @param {number} c - column index
 * @returns {string}
 */
export function cellKey(r, c) {
  return `${r},${c}`;
}
