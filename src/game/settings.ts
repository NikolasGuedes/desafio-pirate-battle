import { DEFAULT_GAME_CONFIG, type GameConfig } from './config';

const SETTINGS_KEY = 'pirate-battle.settings.v1';

export interface GameSettings {
  readonly sessionDurationSeconds: number;
  readonly enemySpawnIntervalSeconds: number;
}

export const DEFAULT_SETTINGS: GameSettings = {
  sessionDurationSeconds: DEFAULT_GAME_CONFIG.sessionDurationSeconds,
  enemySpawnIntervalSeconds: DEFAULT_GAME_CONFIG.enemySpawnIntervalSeconds,
};

export function loadSettings(): GameSettings {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '') as Partial<GameSettings>;
    if (isValidSessionDuration(parsed.sessionDurationSeconds) && isValidSpawnInterval(parsed.enemySpawnIntervalSeconds)) {
      return { sessionDurationSeconds: parsed.sessionDurationSeconds, enemySpawnIntervalSeconds: parsed.enemySpawnIntervalSeconds };
    }
  } catch { /* Invalid or missing local data falls back to defaults. */ }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: GameSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function configFromSettings(settings: GameSettings): GameConfig {
  return { ...DEFAULT_GAME_CONFIG, ...settings };
}

export function isValidSessionDuration(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 60 && value <= 180;
}

export function isValidSpawnInterval(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 2 && value <= 15;
}
