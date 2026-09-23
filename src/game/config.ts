export interface GameConfig {
  readonly sessionDurationSeconds: number;
  readonly enemySpawnIntervalSeconds: number;
  readonly arena: { readonly width: number; readonly height: number };
  readonly player: PlayerShipConfig;
  readonly chaser: ShipConfig;
  readonly shooter: ShipConfig & { readonly attackRange: number };
  readonly projectile: ProjectileConfig;
}

interface ShipConfig {
  readonly health: number;
  readonly movementSpeed: number;
  readonly rotationSpeed: number;
}

interface PlayerShipConfig extends ShipConfig {
  readonly thrustAcceleration: number;
  readonly linearDrag: number;
  readonly lateralDrag: number;
  readonly angularAcceleration: number;
  readonly angularDrag: number;
  readonly damageCooldownSeconds: number;
}

interface ProjectileConfig {
  readonly speed: number;
  readonly damage: number;
  readonly lifetimeSeconds: number;
  readonly frontCooldownSeconds: number;
  readonly broadsideCooldownSeconds: number;
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  sessionDurationSeconds: 90,
  enemySpawnIntervalSeconds: 5,
  arena: { width: 1280, height: 720 },
  player: {
    health: 100,
    movementSpeed: 180,
    rotationSpeed: 2.8,
    thrustAcceleration: 245,
    linearDrag: 1.15,
    lateralDrag: 2.4,
    angularAcceleration: 6.2,
    angularDrag: 7.5,
    damageCooldownSeconds: 2,
  },
  chaser: { health: 50, movementSpeed: 105, rotationSpeed: 2.1 },
  shooter: { health: 65, movementSpeed: 80, rotationSpeed: 1.7, attackRange: 380 },
  projectile: {
    speed: 500,
    damage: 25,
    lifetimeSeconds: 1.4,
    frontCooldownSeconds: 0.45,
    broadsideCooldownSeconds: 1.2,
  },
};
