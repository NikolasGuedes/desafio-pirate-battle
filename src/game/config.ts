export interface GameConfig {
  readonly sessionDurationSeconds: number;
  readonly enemySpawnIntervalSeconds: number;
  readonly arena: { readonly width: number; readonly height: number };
  readonly player: PlayerShipConfig;
  readonly chaser: ShipConfig;
  readonly shooter: ShooterShipConfig;
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

interface ShooterShipConfig extends ShipConfig {
  readonly attackRange: number;
  readonly aimSpreadRadians: number;
  readonly shotCooldownSeconds: number;
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
    movementSpeed: 120,
    rotationSpeed: 2.8,
    thrustAcceleration: 120,
    linearDrag: 1.15,
    lateralDrag: 2.4,
    angularAcceleration: 6.2,
    angularDrag: 7.5,
    damageCooldownSeconds: 4,
  },
  chaser: { health: 50, movementSpeed: 65, rotationSpeed: 1.2 },
  shooter: {
    health: 65,
    movementSpeed: 50,
    rotationSpeed: 1,
    attackRange: 360,
    aimSpreadRadians: 0.42,
    shotCooldownSeconds: 3.2,
  },
  projectile: {
    speed: 500,
    damage: 25,
    lifetimeSeconds: 1.4,
    frontCooldownSeconds: 0.45,
    broadsideCooldownSeconds: 1.2,
  },
};
