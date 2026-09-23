export interface ArenaPoint {
  readonly x: number;
  readonly y: number;
}

export interface IslandDecoration extends ArenaPoint {
  readonly tile: 65 | 66 | 67 | 70 | 71 | 72;
  readonly rotation?: number;
  readonly scale?: number;
}

export interface IslandTemplate extends ArenaPoint {
  readonly columns: number;
  readonly rows: number;
  readonly groundTiles: readonly (24 | 40)[];
  readonly decorations: readonly IslandDecoration[];
}

export interface ArenaScenario {
  readonly id: 'emerald-cay' | 'twin-reefs' | 'broken-atoll';
  readonly playerSpawn: ArenaPoint & { readonly rotation: number };
  readonly islands: readonly IslandTemplate[];
}

export const SCENARIO_TILE_PATHS = [24, 40, 65, 66, 67, 70, 71, 72].map(
  (tile) => `/assets/png/default/tiles/tile_${tile}.png`,
);

export const ARENA_SCENARIOS: readonly ArenaScenario[] = [
  {
    id: 'emerald-cay',
    playerSpawn: { x: 190, y: 360, rotation: 0 },
    islands: [
      {
        x: 500,
        y: 245,
        columns: 4,
        rows: 3,
        groundTiles: [40, 40, 24, 40],
        decorations: [
          { tile: 71, x: 24, y: 18, scale: 0.9 },
          { tile: 65, x: 178, y: 104, rotation: 0.2 },
          { tile: 72, x: 102, y: 112, scale: 0.75 },
        ],
      },
    ],
  },
  {
    id: 'twin-reefs',
    playerSpawn: { x: 165, y: 535, rotation: 0.25 },
    islands: [
      {
        x: 340,
        y: 105,
        columns: 3,
        rows: 2,
        groundTiles: [24, 40, 40],
        decorations: [
          { tile: 66, x: 20, y: 42, scale: 0.82 },
          { tile: 70, x: 118, y: 8, rotation: -0.25 },
        ],
      },
      {
        x: 770,
        y: 435,
        columns: 3,
        rows: 2,
        groundTiles: [40, 24, 40],
        decorations: [
          { tile: 71, x: 104, y: 42, scale: 0.78 },
          { tile: 67, x: 24, y: 10, rotation: -0.2 },
        ],
      },
    ],
  },
  {
    id: 'broken-atoll',
    playerSpawn: { x: 170, y: 350, rotation: 0 },
    islands: [
      {
        x: 500,
        y: 80,
        columns: 2,
        rows: 2,
        groundTiles: [40, 24],
        decorations: [{ tile: 72, x: 34, y: 34, scale: 0.85 }],
      },
      {
        x: 525,
        y: 505,
        columns: 3,
        rows: 2,
        groundTiles: [24, 40, 24],
        decorations: [
          { tile: 65, x: 112, y: 34, rotation: 0.3 },
          { tile: 70, x: 20, y: 4, scale: 0.8 },
        ],
      },
      {
        x: 880,
        y: 260,
        columns: 2,
        rows: 3,
        groundTiles: [40, 24, 40],
        decorations: [
          { tile: 71, x: 30, y: 95, scale: 0.8 },
          { tile: 67, x: 62, y: 18, rotation: 0.35 },
        ],
      },
    ],
  },
] as const;

export function pickArenaScenario(random = Math.random): ArenaScenario {
  return ARENA_SCENARIOS[Math.floor(random() * ARENA_SCENARIOS.length)] ?? ARENA_SCENARIOS[0]!;
}
