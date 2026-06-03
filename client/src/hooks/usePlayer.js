import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getPlayer, savePlayer } from '../utils/storage.js';

export function usePlayer() {
  const existing = getPlayer();
  const [player, setPlayer] = useState(existing);
  const [needsName, setNeedsName] = useState(!existing);

  function setName(displayName) {
    const newPlayer = {
      id: uuidv4(),
      name: displayName.trim(),
      streak: 0,
      personalBest: 0,
    };
    savePlayer(newPlayer);
    setPlayer(newPlayer);
    setNeedsName(false);
  }

  function refreshPlayer() {
    setPlayer(getPlayer());
  }

  return { player, needsName, setName, refreshPlayer };
}
