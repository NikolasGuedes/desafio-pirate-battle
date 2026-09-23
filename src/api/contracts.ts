import type { GameConfig } from '../game/config';

export type MatchEndReason = 'time-expired' | 'player-destroyed';

export interface MatchRecord {
  readonly id: string;
  readonly playerId: string;
  readonly playerName: string;
  readonly completedAt: string;
  readonly score: number;
  readonly durationSeconds: number;
  readonly endReason: MatchEndReason;
  readonly config: GameConfig;
}

export interface Page<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
}
