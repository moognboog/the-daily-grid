import { useState, useEffect, useCallback, useRef } from 'react';
import { cellKey } from '../utils/format.js';
import { getProgress, saveProgress } from '../utils/storage.js';

function wordCellCoord(word, pos) {
  return word.direction === 'across'
    ? { row: word.startRow, col: word.startCol + pos }
    : { row: word.startRow + pos, col: word.startCol };
}

function wordPosOf(word, row, col) {
  return word.direction === 'across' ? col - word.startCol : row - word.startRow;
}

function findNextEmptyInWord(word, fromPos, inputs) {
  for (let pos = fromPos + 1; pos < word.answer.length; pos++) {
    const { row, col } = wordCellCoord(word, pos);
    if (!inputs[cellKey(row, col)]) return { row, col };
  }
  return null;
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
    for (let i = 0; i < word.answer.length; i++) {
      const { row: r, col: c } = wordCellCoord(word, i);
      grid[r][c].isBlack = false;
      grid[r][c].answer = word.answer[i];
      grid[r][c].wordIndices.push(wi);
      if (i === 0) grid[r][c].number = word.number;
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
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savedProgress, setSavedProgress] = useState(null);
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
        const saved = getProgress(data.date);
        if (saved) setSavedProgress(saved);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!timerStarted || isComplete) return;
    const id = setInterval(() => {
      setElapsedSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [timerStarted, isComplete]);

  useEffect(() => {
    if (!timerStarted || isComplete || !puzzle) return;
    saveProgress(puzzle.date, inputs, elapsedSeconds);
  }, [inputs]); // eslint-disable-line react-hooks/exhaustive-deps

  const moveInWord = useCallback((row, col, wordIndex, delta, words) => {
    const word = words[wordIndex];
    if (!word) return { row, col };
    const nextPos = wordPosOf(word, row, col) + delta;
    if (nextPos < 0 || nextPos >= word.answer.length) return { row, col };
    return wordCellCoord(word, nextPos);
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
        setSelectedWord(wordIndices.find(i => i !== selectedWord));
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

    if (/^[a-zA-Z]$/.test(pressedKey)) {
      const updated = { ...inputs, [cellKey(row, col)]: pressedKey.toUpperCase() };
      setInputs(updated);

      if (checkComplete(updated, grid)) {
        setIsComplete(true);
        return;
      }

      const nextEmpty = findNextEmptyInWord(word, wordPosOf(word, row, col), updated);
      if (nextEmpty) {
        setCursorCell(nextEmpty);
      } else {
        const nextIdx = (selectedWord + 1) % puzzle.words.length;
        const next = puzzle.words[nextIdx];
        setSelectedWord(nextIdx);
        setCursorCell({ row: next.startRow, col: next.startCol });
      }
    } else if (pressedKey === 'Backspace') {
      const ck = cellKey(row, col);
      if (inputs[ck]) {
        setInputs(prev => ({ ...prev, [ck]: '' }));
      } else {
        const prev = moveInWord(row, col, selectedWord, -1, puzzle.words);
        setCursorCell(prev);
        setInputs(p => ({ ...p, [cellKey(prev.row, prev.col)]: '' }));
      }
    } else if (pressedKey === 'ArrowRight' && word.direction === 'across') {
      setCursorCell(moveInWord(row, col, selectedWord, 1, puzzle.words));
    } else if (pressedKey === 'ArrowLeft' && word.direction === 'across') {
      setCursorCell(moveInWord(row, col, selectedWord, -1, puzzle.words));
    } else if (pressedKey === 'ArrowDown' && word.direction === 'down') {
      setCursorCell(moveInWord(row, col, selectedWord, 1, puzzle.words));
    } else if (pressedKey === 'ArrowUp' && word.direction === 'down') {
      setCursorCell(moveInWord(row, col, selectedWord, -1, puzzle.words));
    } else if (pressedKey === ' ') {
      setCursorCell(moveInWord(row, col, selectedWord, 1, puzzle.words));
    } else if (pressedKey === 'Tab') {
      selectWord((selectedWord + 1) % puzzle.words.length);
    }
  }, [puzzle, grid, cursorCell, inputs, selectedWord, timerStarted, isComplete, moveInWord, selectWord]);

  function startTimer() {
    setTimerStarted(true);
  }

  function restoreProgress() {
    if (!savedProgress) return;
    setInputs(savedProgress.inputs);
    setElapsedSeconds(savedProgress.elapsedSeconds);
    setTimerStarted(true);
    setSavedProgress(null);
  }

  return {
    puzzle,
    grid,
    inputs,
    selectedWord,
    cursorCell,
    timerStarted,
    isComplete,
    elapsedSeconds,
    loading,
    error,
    inputRef,
    selectCell,
    selectWord,
    handleKey,
    startTimer,
    hasSavedProgress: !!savedProgress,
    restoreProgress,
  };
}
