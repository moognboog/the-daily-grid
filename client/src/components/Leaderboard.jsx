import { useState, useEffect } from 'react';
import { fmt, fmtDate } from '../utils/format.js';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ playerId, date }) {
  const [scores, setScores] = useState(null);

  useEffect(() => {
    fetch('/api/scores/today')
      .then(r => r.json())
      .then(setScores)
      .catch(() => setScores([]));
  }, [date]);

  return (
    <div className="w-full max-w-md mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-1">Today's Leaderboard</h2>
      <p className="text-sm text-gray-500 mb-4 font-mermaid">{date ? fmtDate(date) : ''}</p>

      {scores === null ? (
        <p className="text-gray-400">Loading...</p>
      ) : scores.length === 0 ? (
        <p className="text-gray-500 italic">No completions yet today.</p>
      ) : (
        <ul className="space-y-1">
          {scores.map((s, i) => (
            <li
              key={i}
              className={`flex items-center justify-between px-4 py-2 rounded-lg text-sm ${
                s.playerId === playerId ? 'bg-blue-50 border border-blue-200 font-semibold' : 'bg-gray-50'
              }`}
            >
              <span>
                <span className="mr-2">{i < 3 ? MEDALS[i] : `${i + 1}.`}</span>
                {s.playerName}
              </span>
              <span className="font-mono">{fmt(s.timeSeconds)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
