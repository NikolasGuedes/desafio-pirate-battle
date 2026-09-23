import type { MatchRecord } from './contracts';

const PLAYER_KEY = 'pirate-battle.player-id.v1';
const LAST_MATCH_KEY = 'pirate-battle.last-match.v1';
const PENDING_KEY = 'pirate-battle.pending-match.v1';
const RESULT_VISIBLE_KEY = 'pirate-battle.result-visible.v1';

export function getPlayerId(): string {
  const existing = localStorage.getItem(PLAYER_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(PLAYER_KEY, id);
  return id;
}

export function loadLastMatch(): MatchRecord | null {
  try { return JSON.parse(localStorage.getItem(LAST_MATCH_KEY) ?? 'null') as MatchRecord | null; }
  catch { return null; }
}

export function saveCompletedMatch(match: MatchRecord): void {
  localStorage.setItem(LAST_MATCH_KEY, JSON.stringify(match));
  localStorage.setItem(PENDING_KEY, JSON.stringify(match));
  localStorage.setItem(RESULT_VISIBLE_KEY, 'true');
}

export function loadPendingMatch(): MatchRecord | null {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) ?? 'null') as MatchRecord | null; }
  catch { return null; }
}

export function clearPendingMatch(id: string): void {
  const pending = loadPendingMatch();
  if (pending?.id === id) localStorage.removeItem(PENDING_KEY);
}

export function shouldRestoreResult(): boolean {
  return localStorage.getItem(RESULT_VISIBLE_KEY) === 'true';
}

export function hidePersistedResult(): void {
  localStorage.setItem(RESULT_VISIBLE_KEY, 'false');
}
