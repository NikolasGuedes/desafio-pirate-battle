import { http, HttpResponse } from 'msw';
import type { MatchRecord, Page } from '../api/contracts';
import { DEFAULT_GAME_CONFIG } from '../game/config';

const STORAGE_KEY = 'pirate-battle.mock-matches.v1';

const fixtures: MatchRecord[] = Array.from({ length: 14 }, (_, index) => ({
  id: `fixture-${index + 1}`,
  playerId: `rival-${index + 1}`,
  playerName: ['Anne Bonny', 'Blackbeard', 'Calico Jack', 'Mary Read', 'Bartholomew'][index % 5]!,
  completedAt: new Date(Date.UTC(2026, 8, 20, 18, index)).toISOString(),
  score: 18 - index,
  durationSeconds: 90,
  endReason: 'time-expired',
  config: DEFAULT_GAME_CONFIG,
}));

function readMatches(): MatchRecord[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as MatchRecord[]; }
  catch { return []; }
}

function writeMatches(matches: readonly MatchRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
}

function pageOf(items: readonly MatchRecord[], page = 1, pageSize = 10): Page<MatchRecord> {
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    totalItems: items.length,
    totalPages: Math.ceil(items.length / pageSize),
  };
}

export const handlers = [
  http.get('/api/ranking', ({ request }) => {
    const page = Number(new URL(request.url).searchParams.get('page') ?? 1);
    const ranked = [...fixtures, ...readMatches()].sort((a, b) => b.score - a.score || a.durationSeconds - b.durationSeconds || a.completedAt.localeCompare(b.completedAt));
    return HttpResponse.json(pageOf(ranked, page));
  }),
  http.get('/api/matches', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 1);
    const playerId = url.searchParams.get('playerId');
    const history = readMatches().filter((match) => !playerId || match.playerId === playerId).sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    return HttpResponse.json(pageOf(history, page));
  }),
  http.post('/api/matches', async ({ request }) => {
    const incoming = await request.json() as MatchRecord;
    const matches = readMatches();
    const existing = matches.find((match) => match.id === incoming.id);
    if (existing) return HttpResponse.json(existing);
    matches.push(incoming);
    writeMatches(matches);
    return HttpResponse.json(incoming, { status: 201 });
  }),
];
