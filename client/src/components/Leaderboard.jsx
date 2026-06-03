import { useState, useEffect } from 'react';
import { fmt, fmtDate } from '../utils/format.js';

const MEDALS = ['🥇', '🥈', '🥉'];
const TABS = [
  { key: 'today', label: 'Today' },
  { key: 'averages', label: 'Avg. Time' },
  { key: 'streaks', label: 'Streaks' },
];

function Avatar({ url, name }) {
  if (url) {
    return <img src={url} alt={name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />;
  }
  return (
    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

export default function Leaderboard({ playerId, date }) {
  const [activeTab, setActiveTab] = useState('today');
  const [data, setData] = useState({ today: null, averages: null, streaks: null });

  useEffect(() => {
    if (data[activeTab] !== null) return;
    const controller = new AbortController();
    fetch(`/api/leaderboard/${activeTab}`, { signal: controller.signal })
      .then(r => r.json())
      .then(rows => setData(prev => ({ ...prev, [activeTab]: rows })))
      .catch(err => {
        if (err.name !== 'AbortError') setData(prev => ({ ...prev, [activeTab]: [] }));
      });
    return () => controller.abort();
  }, [activeTab]);

  const rows = data[activeTab];

  return (
    <div className="w-full max-w-md mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-1 text-center">Leaderboard</h2>
      <p className="text-sm text-gray-500 mb-4 text-center">{date ? fmtDate(date) : ''}</p>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {rows === null ? (
        <p className="text-gray-400 text-center py-4">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="text-gray-500 italic text-center py-4">
          {activeTab === 'today' ? 'No completions yet today.' : 'No data yet.'}
        </p>
      ) : (
        <ul className="space-y-1">
          {rows.map((s, i) => (
            <li
              key={s.playerId ?? i}
              className={`flex items-center justify-between px-4 py-2 rounded-lg text-sm ${
                s.playerId === playerId ? 'bg-blue-50 border border-blue-200 font-semibold' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-6 text-center flex-shrink-0">{i < 3 ? MEDALS[i] : `${i + 1}.`}</span>
                <Avatar url={s.avatarUrl} name={s.playerName} />
                <span className="truncate">{s.playerName}</span>
              </div>
              <div className="font-mono text-gray-600 text-right flex-shrink-0 ml-2">
                {activeTab === 'today' && <span>{fmt(s.timeSeconds)}</span>}
                {activeTab === 'averages' && (
                  <span className="flex flex-col items-end">
                    <span>{fmt(s.averageTime)}</span>
                    <span className="text-xs text-gray-400 font-sans">{s.completions} puzzles</span>
                  </span>
                )}
                {activeTab === 'streaks' && (
                  <span className="flex flex-col items-end">
                    <span>🔥 {s.streak}</span>
                    <span className="text-xs text-gray-400 font-sans">{s.completions} total</span>
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
