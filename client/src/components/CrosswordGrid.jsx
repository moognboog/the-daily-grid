import { useState, useEffect } from 'react';
import { cellKey } from '../utils/format.js';

export default function CrosswordGrid({ grid, inputs, selectedWord, cursorCell, puzzle, inputRef, selectCell, handleKey }) {
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleResize() {
      setWindowWidth(window.innerWidth);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!grid || !puzzle) return null;

  const { rows, cols, words } = puzzle;
  const activeWord = words[selectedWord];

  function isInSelectedWord(r, c) {
    if (!activeWord) return false;
    const { startRow, startCol, direction, answer } = activeWord;
    if (direction === 'across') {
      return r === startRow && c >= startCol && c < startCol + answer.length;
    }
    return c === startCol && r >= startRow && r < startRow + answer.length;
  }

  function isCursor(r, c) {
    return cursorCell && cursorCell.row === r && cursorCell.col === c;
  }

  const cellSize = Math.min(Math.floor((Math.min(windowWidth, 560) - 16) / cols), 42);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        className="absolute opacity-0 w-0 h-0"
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="characters"
        onKeyDown={e => {
          // Android virtual keyboard sends 'Unidentified' for letter keys — let onInput handle those
          if (e.key === 'Unidentified') return;
          e.preventDefault();
          handleKey(e.key);
        }}
        onInput={e => {
          // Catches letter input from mobile virtual keyboards (Android in particular)
          const val = e.target.value;
          if (val) {
            handleKey(val.slice(-1));
            e.target.value = '';
          }
        }}
      />
      <div
        className="inline-grid border border-gray-800"
        style={{ gridTemplateColumns: `repeat(${cols}, ${cellSize}px)` }}
      >
        {grid.map((rowArr, r) =>
          rowArr.map((cell, c) => {
            if (cell.isBlack) {
              return (
                <div
                  key={cellKey(r, c)}
                  className="bg-black border border-gray-800"
                  style={{ width: cellSize, height: cellSize }}
                />
              );
            }

            const cursor = isCursor(r, c);
            const inWord = isInSelectedWord(r, c);
            let bg = 'bg-white';
            if (cursor) bg = 'bg-blue-400';
            else if (inWord) bg = 'bg-blue-100';

            const val = inputs[cellKey(r, c)] || '';

            return (
              <div
                key={cellKey(r, c)}
                onClick={() => selectCell(r, c)}
                className={`relative border border-gray-400 cursor-pointer select-none flex items-center justify-center ${bg}`}
                style={{ width: cellSize, height: cellSize }}
              >
                {cell.number && (
                  <span
                    className="absolute top-0 left-0 text-gray-700 leading-none"
                    style={{ fontSize: Math.max(8, cellSize * 0.28), padding: 1 }}
                  >
                    {cell.number}
                  </span>
                )}
                <span
                  className="font-bold text-gray-900"
                  style={{ fontSize: Math.max(12, cellSize * 0.55) }}
                >
                  {val}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
