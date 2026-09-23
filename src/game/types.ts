import type { MatchEndReason } from '../api/contracts';
import type { GameConfig } from './config';

export type Control = 'forward' | 'left' | 'right' | 'fireFront' | 'fireLeft' | 'fireRight';

export interface HudSnapshot {
  readonly health: number;
  readonly maxHealth: number;
  readonly score: number;
  readonly remainingSeconds: number;
  readonly enemyCount: number;
  readonly paused: boolean;
}

export interface GameResult {
  readonly score: number;
  readonly durationSeconds: number;
  readonly endReason: MatchEndReason;
  readonly config: GameConfig;
}
