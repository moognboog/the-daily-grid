import { useState, useEffect, useRef } from 'react';
import { fmt } from './utils/format.js';
import { usePlayer } from './hooks/usePlayer.js';
import { usePuzzle } from './hooks/usePuzzle.js';
import { getCompletedToday, markCompleted, updateStreak, getAverageTime } from './utils/storage.js';
import NameModal from './components/NameModal.jsx';
import CrosswordGrid from './components/CrosswordGrid.jsx';
import ClueList from './components/ClueList.jsx';
import Timer from './components/Timer.jsx';
import Leaderboard from './components/Leaderboard.jsx';

function buildAnswerInputs(words) {
  const map = {};
  words.forEach(word => {
    for (let i = 0; i < word.answer.length; i++) {
      const r = word.direction === 'down' ? word.startRow + i : word.startRow;
      const c = word.direction === 'across' ? word.startCol + i : word.startCol;
      map[`${r},${c}`] = word.answer[i];
    }
  });
  return map;
}

export default function App() {
  const { player, needsName, setName, refreshPlayer } = usePlayer();
  const {
    puzzle, grid, inputs, selectedWord, cursorCell,
    timerStarted, isComplete, elapsedSeconds, loading, error,
    inputRef, selectCell, selectWord, handleKey,
  } = usePuzzle();

  const [gameStarted, setGameStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [copied, setCopied] = useState(false);
  const autoRedirected = useRef(false);

  const alreadyDone = puzzle ? getCompletedToday(puzzle.date) : null;
  const puzzleDone = alreadyDone || submitted;

  // Auto-redirect to leaderboard the first time we discover the puzzle is already done.
  // The ref ensures this only fires once so the user can navigate back freely.
  useEffect(() => {
    if (alreadyDone && !autoRedirected.current) {
      autoRedirected.current = true;
      setShowLeaderboard(true);
    }
  }, [alreadyDone]);

  async function handleShare() {
    const time = alreadyDone ? alreadyDone.timeSeconds : elapsedSeconds;
    const [y, m, d] = puzzle.date.split('-');
    const text = [
      `✏️${m}/${d}/${y}✏️`,
      `${player.name}'s Time: ${fmt(time)}`,
      `🔥${player.streak ?? 0} | Avg. Time: ${fmt(getAverageTime())}`,
      ``,
      `https://the-daily-grid.com`,
    ].join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSubmit() {
    if (!player || !puzzle || submitting) return;
    setSubmitting(true);

    markCompleted(puzzle.date, elapsedSeconds);
    updateStreak(puzzle.date);
    refreshPlayer();

    try {
      await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: player.id,
          playerName: player.name,
          timeSeconds: elapsedSeconds,
          date: puzzle.date,
        }),
      });
    } catch {
      // Non-critical — score might already exist
    }

    setSubmitted(true);
    setShowLeaderboard(true);
    setSubmitting(false);
  }

  if (needsName) return <NameModal onSubmit={setName} />;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading puzzle...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        Failed to load puzzle: {error}
      </div>
    );
  }

  // Ready screen — shown once when a fresh puzzle loads (skip if already completed)
  if (puzzle && !gameStarted && !puzzleDone) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-sm text-center">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Daily Crossword</p>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">{puzzle.date}</h1>
          <p className="text-sm text-gray-500 mb-8">
            {puzzle.words.length} words &nbsp;·&nbsp; {puzzle.rows}×{puzzle.cols} grid
          </p>
          <button
            onClick={() => setGameStarted(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors text-lg"
          >
            Start Puzzle
          </button>
        </div>
      </div>
    );
  }

  if (showLeaderboard) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-800">Daily Crossword</h1>
          {puzzleDone && (
            <p className="text-gray-500 text-sm mt-1">
              You completed today's puzzle
              {alreadyDone ? ` in ${fmt(alreadyDone.timeSeconds)}` : ` in ${fmt(elapsedSeconds)}`}!
            </p>
          )}
          {player && puzzleDone && (
            <p className="text-gray-400 text-xs mt-1">
              Streak: {player.streak ?? 0} day{player.streak !== 1 ? 's' : ''} · Best: {player.personalBest ?? 0}
            </p>
          )}
        </div>

        <Leaderboard playerId={player?.id} date={puzzle?.date} />

        <div className="mt-6 flex gap-3">
          {puzzleDone && (
            <button
              onClick={handleShare}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              {copied ? '✓ Copied!' : 'Share Result'}
            </button>
          )}
          <button
            onClick={() => setShowLeaderboard(false)}
            className="px-5 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors text-sm font-medium"
          >
            ← Back to Puzzle
          </button>
        </div>
      </div>
    );
  }

  // Puzzle view — show filled answers if already completed, otherwise live inputs
  const displayInputs = puzzleDone ? buildAnswerInputs(puzzle.words) : inputs;
  const readonly = puzzleDone;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-6 px-3">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Daily Crossword</h1>
            <p className="text-xs text-gray-400">{puzzle?.date}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowLeaderboard(true)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Leaderboard →
            </button>
            <div className="text-right">
              <Timer elapsed={elapsedSeconds} />
              {player && (
                <p className="text-xs text-gray-400">
                  {player.name} · Streak {player.streak ?? 0}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Completed banner */}
        {puzzleDone && (
          <div className="mb-4 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-center text-sm text-green-700">
            Completed in {fmt(alreadyDone ? alreadyDone.timeSeconds : elapsedSeconds)}
          </div>
        )}

        {/* Grid */}
        <div className="flex justify-center mb-5">
          <CrosswordGrid
            grid={grid}
            inputs={displayInputs}
            selectedWord={selectedWord}
            cursorCell={readonly ? null : cursorCell}
            puzzle={puzzle}
            inputRef={inputRef}
            selectCell={readonly ? () => {} : selectCell}
            handleKey={readonly ? () => {} : handleKey}
          />
        </div>

        {/* Clues */}
        <ClueList
          words={puzzle?.words}
          selectedWord={selectedWord}
          onSelectWord={readonly ? () => {} : selectWord}
        />
      </div>

      {/* Completion overlay */}
      {isComplete && !submitted && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
            <div className="text-4xl mb-3">🎉</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Puzzle Complete!</h2>
            <p className="text-gray-500 mb-2">Your time</p>
            <p className="text-4xl font-mono font-bold text-blue-600 mb-6">{fmt(elapsedSeconds)}</p>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {submitting ? 'Saving...' : 'See Leaderboard'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
