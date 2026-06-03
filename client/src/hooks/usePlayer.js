import { useState, useCallback } from 'react';
import { getPlayer, savePlayer } from '../utils/storage.js';

function initPlayer() {
  const params = new URLSearchParams(window.location.search);
  const discordAuth = params.get('discord_auth');

  if (discordAuth) {
    try {
      const data = JSON.parse(atob(discordAuth));
      const existing = getPlayer();
      const playerData = {
        id: data.id,
        name: data.name,
        avatarUrl: data.avatarUrl,
        streak: existing?.id === data.id ? (existing.streak ?? 0) : 0,
        personalBest: existing?.id === data.id ? (existing.personalBest ?? 0) : 0,
      };
      savePlayer(playerData);
      const url = new URL(window.location.href);
      url.searchParams.delete('discord_auth');
      window.history.replaceState({}, '', url.toString());
      return playerData;
    } catch {
      // fall through to localStorage check
    }
  }

  const stored = getPlayer();
  return stored?.id ? stored : null;
}

export function usePlayer() {
  const [player, setPlayer] = useState(initPlayer);

  const needsLogin = !player;

  const refreshPlayer = useCallback(() => {
    setPlayer(getPlayer());
  }, []);

  return { player, needsLogin, refreshPlayer };
}
