import { DEFAULT_GAME_CONFIG, type GameConfig } from './config';

const SETTINGS_KEY = 'pirate-battle.settings.v1';

export interface GameSettings {
  readonly sessionDurationSeconds: number;
  readonly enemySpawnIntervalSeconds: number;
  readonly soundVolume: number;
}

export const DEFAULT_SETTINGS: GameSettings = {
  sessionDurationSeconds: DEFAULT_GAME_CONFIG.sessionDurationSeconds,
  enemySpawnIntervalSeconds: DEFAULT_GAME_CONFIG.enemySpawnIntervalSeconds,
  soundVolume: 70,
};

export function loadSettings(): GameSettings {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '') as Partial<GameSettings>;
    if (isValidSessionDuration(parsed.sessionDurationSeconds) && isValidSpawnInterval(parsed.enemySpawnIntervalSeconds)) {
      return {
        sessionDurationSeconds: parsed.sessionDurationSeconds,
        enemySpawnIntervalSeconds: parsed.enemySpawnIntervalSeconds,
        soundVolume: isValidSoundVolume(parsed.soundVolume) ? parsed.soundVolume : DEFAULT_SETTINGS.soundVolume,
      };
    }
  } catch { /* Invalid or missing local data falls back to defaults. */ }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: GameSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function configFromSettings(settings: Pick<GameSettings, 'sessionDurationSeconds' | 'enemySpawnIntervalSeconds'>): GameConfig {
  return {
    ...DEFAULT_GAME_CONFIG,
    sessionDurationSeconds: settings.sessionDurationSeconds,
    enemySpawnIntervalSeconds: settings.enemySpawnIntervalSeconds,
  };
}

export function isValidSessionDuration(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 60 && value <= 180;
}

export function isValidSpawnInterval(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 2 && value <= 15;
}

export function isValidSoundVolume(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100;
}
