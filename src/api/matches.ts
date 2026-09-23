import type { MatchRecord, Page } from './contracts';
import { apiClient } from './client';

export async function getRanking(page: number): Promise<Page<MatchRecord>> {
  const response = await apiClient.get<Page<MatchRecord>>('/ranking', { params: { page } });
  return response.data;
}

export async function getMatchHistory(playerId: string, page: number): Promise<Page<MatchRecord>> {
  const response = await apiClient.get<Page<MatchRecord>>('/matches', { params: { playerId, page } });
  return response.data;
}

export async function createMatch(match: MatchRecord): Promise<MatchRecord> {
  const response = await apiClient.post<MatchRecord>('/matches', match, { headers: { 'Idempotency-Key': match.id } });
  return response.data;
}
