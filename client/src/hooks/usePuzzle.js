import { useState, useEffect, useCallback, useRef } from 'react';

function cellKey(r, c) {
  return `${r},${c}`;
}

function buildGrid(rows, cols, words) {
  const grid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      isBlack: true,
      number: null,
      answer: '',
      wordIndices: [],
    }))
  );

  words.forEach((word, wi) => {
    const { startRow, startCol, direction, answer, number } = word;
    for (let i = 0; i < answer.length; i++) {
      const r = direction === 'across' ? startRow : startRow + i;
      const c = direction === 'across' ? startCol + i : startCol;
      grid[r][c].isBlack = false;
      grid[r][c].answer = answer[i];
      grid[r][c].wordIndices.push(wi);
      if (i === 0) grid[r][c].number = number;
    }
  });

  return grid;
}

function checkComplete(inputs, grid) {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const cell = grid[r][c];
      if (!cell.isBlack && (inputs[cellKey(r, c)] || '').toUpperCase() !== cell.answer) {
        return false;
      }
    }
  }
  return true;
}

export function usePuzzle() {
  const [puzzle, setPuzzle] = useState(null);
  const [grid, setGrid] = useState(null);
  const [inputs, setInputs] = useState({});
  const [selectedWord, setSelectedWord] = useState(0);
  const [cursorCell, setCursorCell] = useState(null);
  const [timerStarted, setTimerStarted] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetch('/api/puzzle/today')
      .then(r => r.json())
      .then(data => {
        setPuzzle(data);
        const g = buildGrid(data.rows, data.cols, data.words);
        setGrid(g);
        const first = data.words[0];
        setCursorCell({ row: first.startRow, col: first.startCol });
        setSelectedWord(0);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const moveInWord = useCallback((row, col, wordIndex, delta, words) => {
    const word = words[wordIndex];
    if (!word) return { row, col };
    const pos = word.direction === 'across' ? col - word.startCol : row - word.startRow;
    const nextPos = pos + delta;
    if (nextPos < 0 || nextPos >= word.answer.length) return { row, col };
    return word.direction === 'across'
      ? { row, col: word.startCol + nextPos }
      : { row: word.startRow + nextPos, col };
  }, []);

  const selectCell = useCallback((row, col) => {
    if (!grid || !puzzle) return;
    const cell = grid[row][col];
    if (cell.isBlack) return;
    setCursorCell({ row, col });

    const { wordIndices } = cell;
    if (wordIndices.length === 0) return;

    if (wordIndices.includes(selectedWord)) {
      if (wordIndices.length > 1) {
        const other = wordIndices.find(i => i !== selectedWord);
        setSelectedWord(other);
      }
    } else {
      setSelectedWord(wordIndices[0]);
    }

    inputRef.current?.focus();
  }, [grid, puzzle, selectedWord]);

  const selectWord = useCallback((wordIndex) => {
    if (!puzzle) return;
    const word = puzzle.words[wordIndex];
    setSelectedWord(wordIndex);
    setCursorCell({ row: word.startRow, col: word.startCol });
    inputRef.current?.focus();
  }, [puzzle]);

  const handleKey = useCallback((pressedKey) => {
    if (!puzzle || !grid || !cursorCell || isComplete) return;

    if (!timerStarted) setTimerStarted(true);

    const { row, col } = cursorCell;
    const word = puzzle.words[selectedWord];
    if (!word) return;
    const { direction } = word;

    if (/^[a-zA-Z]$/.test(pressedKey)) {
      const ck = cellKey(row, col);
      const updated = { ...inputs, [ck]: pressedKey.toUpperCase() };
      setInputs(updated);

      if (checkComplete(updated, grid)) {
        setIsComplete(true);
        return;
      }

      setCursorCell(moveInWord(row, col, selectedWord, 1, puzzle.words));
    } else if (pressedKey === 'Backspace') {
      const ck = cellKey(row, col);
      if (inputs[ck]) {
        setInputs(prev => ({ ...prev, [ck]: '' }));
      } else {
        const prev = moveInWord(row, col, selectedWord, -1, puzzle.words);
        setCursorCell(prev);
        setInputs(p => ({ ...p, [cellKey(prev.row, prev.col)]: '' }));
      }
    } else if (pressedKey === 'ArrowRight' && direction === 'across') {
      setCursorCell(moveInWord(row, col, selectedWord, 1, puzzle.words));
    } else if (pressedKey === 'ArrowLeft' && direction === 'across') {
      setCursorCell(moveInWord(row, col, selectedWord, -1, puzzle.words));
    } else if (pressedKey === 'ArrowDown' && direction === 'down') {
      setCursorCell(moveInWord(row, col, selectedWord, 1, puzzle.words));
    } else if (pressedKey === 'ArrowUp' && direction === 'down') {
      setCursorCell(moveInWord(row, col, selectedWord, -1, puzzle.words));
    } else if (pressedKey === ' ') {
      setCursorCell(moveInWord(row, col, selectedWord, 1, puzzle.words));
    } else if (pressedKey === 'Tab') {
      const next = (selectedWord + 1) % puzzle.words.length;
      selectWord(next);
    }
  }, [puzzle, grid, cursorCell, inputs, selectedWord, timerStarted, isComplete, moveInWord, selectWord]);

  return {
    puzzle,
    grid,
    inputs,
    selectedWord,
    cursorCell,
    timerStarted,
    isComplete,
    loading,
    error,
    inputRef,
    selectCell,
    selectWord,
    handleKey,
  };
}
