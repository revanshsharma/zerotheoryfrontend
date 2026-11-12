import { createContext, useContext, useSyncExternalStore } from 'react';
import type { GameSession, Snapshot } from './session';

export const SessionContext = createContext<GameSession | null>(null);

export function useGame(): GameSession {
  const s = useContext(SessionContext);
  if (!s) throw new Error('No game session');
  return s;
}

export function useSnap(): Snapshot {
  const s = useGame();
  return useSyncExternalStore(s.subscribe, s.getSnapshot, s.getSnapshot);
}
