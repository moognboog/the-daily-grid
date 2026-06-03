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
  // Discord IDs are numeric Snowflakes; old UUID sessions have dashes — reject them
  if (stored?.id && /^\d+$/.test(stored.id)) return stored;
  return null;
}

export function usePlayer() {
  const [player, setPlayer] = useState(initPlayer);

  const needsLogin = !player;

  const refreshPlayer = useCallback(() => {
    setPlayer(getPlayer());
  }, []);

  return { player, needsLogin, refreshPlayer };
}
