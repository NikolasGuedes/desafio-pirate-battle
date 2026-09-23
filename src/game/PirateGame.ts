import { Application, Assets, BlurFilter, Container, Graphics, Sprite, Texture, TilingSprite } from 'pixi.js';
import type { GameConfig } from './config';
import { pickArenaScenario, SCENARIO_TILE_PATHS } from './scenarios';
import type { ArenaScenario, IslandTemplate } from './scenarios';
import type { Control, GameResult, HudSnapshot } from './types';

interface Ship {
  readonly kind: 'player' | 'chaser' | 'shooter';
  readonly view: Sprite;
  readonly healthBar: Container;
  readonly healthFill: Sprite;
  readonly healthMask: Graphics;
  readonly maxHealth: number;
  health: number;
  radius: number;
  cooldown: number;
  wakeTimer: number;
}

interface Projectile {
  readonly view: Sprite;
  readonly trail: Graphics;
  readonly trailPoints: Array<{ x: number; y: number }>;
  readonly owner: 'player' | 'enemy';
  vx: number;
  vy: number;
  ttl: number;
  radius: number;
}

interface WakeRipple {
  readonly view: Graphics;
  readonly duration: number;
  age: number;
}

interface ExplosionEffect {
  readonly view: Sprite;
  readonly duration: number;
  readonly scale: number;
  age: number;
}

interface Callbacks {
  readonly onHud: (snapshot: HudSnapshot) => void;
  readonly onResult: (result: GameResult) => void;
  readonly onLoading: (progress: number) => void;
}

const ASSET = {
  player: '/assets/png/default/ships/ship_1.png',
  chaser: '/assets/png/default/ships/ship_9.png',
  shooter: '/assets/png/default/ships/ship_17.png',
  cannonBall: '/assets/png/default/ship_parts/cannon_ball.png',
  water: '/assets/png/default/tiles/tile_73.png',
  explosion1: '/assets/png/default/effects/explosion_1.png',
  explosion2: '/assets/png/default/effects/explosion_2.png',
  explosion3: '/assets/png/default/effects/explosion_3.png',
  healthFrame: '/assets/png/default/ui/hud/enemy_health_frame.png',
  healthFill: '/assets/png/default/ui/hud/enemy_health_fill_green.png',
} as const;

export class PirateGame {
  private readonly app = new Application();
  private readonly world = new Container();
  private readonly wakeLayer = new Container();
  private readonly projectileTrailLayer = new Container();
  private readonly combatEffectsLayer = new Container();
  private readonly aimLayer = new Container();
  private readonly aimIndicator = new Graphics();
  private readonly healthLayer = new Container();
  private readonly controls = new Set<Control>();
  private readonly keys = new Set<string>();
  private readonly enemies: Ship[] = [];
  private readonly projectiles: Projectile[] = [];
  private readonly wakeRipples: WakeRipple[] = [];
  private readonly explosions: ExplosionEffect[] = [];
  private readonly scenario: ArenaScenario = pickArenaScenario();
  private analogControl: { throttle: number; steering: number } | null = null;
  private ocean!: TilingSprite;
  private player!: Ship;
  private playerVelocity = { x: 0, y: 0 };
  private playerAngularVelocity = 0;
  private playerDamageCooldown = 0;
  private playerShotsFired = 0;
  private elapsed = 0;
  private spawnTimer = 0;
  private hudTimer = 0;
  private score = 0;
  private spawnCount = 0;
  private active = false;
  private paused = false;
  private initialized = false;
  private destroyed = false;
  private visibleBounds = { left: 0, top: 0, right: 0, bottom: 0 };

  constructor(
    private readonly host: HTMLElement,
    private readonly config: GameConfig,
    private readonly callbacks: Callbacks,
  ) {
    this.visibleBounds = { left: 0, top: 0, right: config.arena.width, bottom: config.arena.height };
  }

  async start(): Promise<void> {
    await this.app.init({
      width: this.config.arena.width,
      height: this.config.arena.height,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(devicePixelRatio, 2),
      background: '#1596b4',
    });
    this.initialized = true;
    if (this.destroyed) {
      this.destroyApplication();
      return;
    }
    this.app.canvas.className = 'game-canvas';
    this.app.canvas.setAttribute('aria-label', 'Pirate Battle game arena');
    this.app.canvas.dataset.scenario = this.scenario.id;
    this.app.canvas.dataset.aiming = '';
    this.app.canvas.dataset.playerShots = '0';
    this.host.appendChild(this.app.canvas);
    await Assets.load([...Object.values(ASSET), ...SCENARIO_TILE_PATHS], this.callbacks.onLoading);
    if (this.destroyed) return;

    this.createArena();
    const spawn = this.scenario.playerSpawn;
    this.player = this.makeShip('player', ASSET.player, spawn.x, spawn.y, this.config.player.health, 25);
    this.player.view.rotation = spawn.rotation;
    this.world.addChild(this.player.view);
    this.healthLayer.addChild(this.player.healthBar);
    this.spawnEnemy('chaser');
    this.spawnEnemy('shooter');
    this.aimLayer.addChild(this.aimIndicator);
    this.app.stage.addChild(this.world, this.combatEffectsLayer, this.aimLayer, this.healthLayer);

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onAutomaticPause);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.app.ticker.add(this.update);
    this.active = true;
    this.publishHud();
  }

  setControl(control: Control, pressed: boolean): void {
    const wasPressed = this.controls.has(control);
    if (pressed) this.controls.add(control);
    else {
      this.controls.delete(control);
      if (wasPressed && this.isFireControl(control)) this.releaseFire(control);
    }
    this.drawAimIndicator();
    this.publishHud();
  }

  setAnalogControl(throttle: number, steering: number): void {
    this.analogControl = {
      throttle: Math.max(0, Math.min(1, throttle)),
      steering: Math.max(-1, Math.min(1, steering)),
    };
  }

  clearAnalogControl(): void {
    this.analogControl = null;
  }

  setViewportAspect(aspectRatio: number, cover: boolean): void {
    const arena = this.config.arena;
    if (!cover || !Number.isFinite(aspectRatio) || aspectRatio <= 0) {
      this.visibleBounds = { left: 0, top: 0, right: arena.width, bottom: arena.height };
      return;
    }
    const arenaAspect = arena.width / arena.height;
    if (aspectRatio > arenaAspect) {
      const visibleHeight = arena.width / aspectRatio;
      const inset = (arena.height - visibleHeight) / 2;
      this.visibleBounds = { left: 0, top: inset, right: arena.width, bottom: arena.height - inset };
    } else {
      const visibleWidth = arena.height * aspectRatio;
      const inset = (arena.width - visibleWidth) / 2;
      this.visibleBounds = { left: inset, top: 0, right: arena.width - inset, bottom: arena.height };
    }
  }

  togglePause(): void {
    if (!this.active) return;
    this.paused = !this.paused;
    this.clearInput();
    this.publishHud();
  }

  pause(): void {
    if (!this.active || this.paused) return;
    this.paused = true;
    this.clearInput();
    this.publishHud();
  }

  resume(): void {
    if (!this.active) return;
    this.paused = false;
    this.clearInput();
    this.publishHud();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.active = false;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onAutomaticPause);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    if (this.initialized) {
      this.app.ticker.remove(this.update);
      this.destroyApplication();
    }
  }

  private destroyApplication(): void {
    if (!this.initialized) return;
    this.initialized = false;
    this.app.destroy(true, { children: true, texture: false, textureSource: false });
  }

  private createArena(): void {
    this.world.addChild(new Graphics().rect(0, 0, this.config.arena.width, this.config.arena.height).fill(0x117f9f));
    this.ocean = new TilingSprite({
      texture: Texture.from(ASSET.water),
      width: this.config.arena.width,
      height: this.config.arena.height,
    });
    this.ocean.alpha = 0.78;
    this.ocean.tint = 0x76d6e5;
    this.world.addChild(this.ocean);

    const shallowWater = new Container();
    const shallowShapes = new Graphics();
    for (const island of this.scenario.islands) {
      const width = island.columns * 64;
      const height = island.rows * 64;
      shallowShapes
        .roundRect(island.x - 66, island.y - 66, width + 132, height + 132, 54)
        .fill({ color: 0xa4f2ef, alpha: 0.13 })
        .roundRect(island.x - 38, island.y - 38, width + 76, height + 76, 38)
        .fill({ color: 0xc6fbef, alpha: 0.2 });
    }
    shallowShapes.filters = [new BlurFilter({ strength: 22, quality: 2, kernelSize: 7 })];
    shallowWater.addChild(shallowShapes);
    shallowWater.cacheAsTexture({ resolution: 1, antialias: true });
    this.world.addChild(shallowWater);

    const waves = new Graphics();
    for (let y = 32; y < this.config.arena.height; y += 48) {
      for (let x = (y / 48) % 2 ? 10 : 45; x < this.config.arena.width; x += 110) {
        waves.moveTo(x, y).quadraticCurveTo(x + 18, y - 8, x + 38, y).stroke({ color: 0xd0f8f5, alpha: 0.13, width: 2 });
      }
    }
    this.world.addChild(waves);
    this.world.addChild(this.wakeLayer);
    for (const island of this.scenario.islands) this.createIsland(island);
    this.world.addChild(this.projectileTrailLayer);
  }

  private createIsland(template: IslandTemplate): void {
    const width = template.columns * 64;
    const height = template.rows * 64;
    const island = new Container({ x: template.x, y: template.y });
    const shore = new Graphics().roundRect(-7, -7, width + 14, height + 14, 22).fill(0xe8c681);
    const terrain = new Container();
    const terrainMask = new Graphics().roundRect(0, 0, width, height, 16).fill(0xffffff);
    for (let row = 0; row < template.rows; row += 1) {
      for (let column = 0; column < template.columns; column += 1) {
        const index = row * template.columns + column;
        const tileId = template.groundTiles[index % template.groundTiles.length] ?? 40;
        terrain.addChild(new Sprite({ texture: Texture.from(`/assets/png/default/tiles/tile_${tileId}.png`), x: column * 64, y: row * 64 }));
      }
    }
    terrain.mask = terrainMask;
    island.addChild(shore, terrain, terrainMask);
    for (const decoration of template.decorations) {
      const sprite = Sprite.from(`/assets/png/default/tiles/tile_${decoration.tile}.png`);
      sprite.anchor.set(0.5);
      sprite.position.set(decoration.x + 32, decoration.y + 32);
      sprite.rotation = decoration.rotation ?? 0;
      sprite.scale.set(decoration.scale ?? 1);
      island.addChild(sprite);
    }
    this.world.addChild(island);
  }

  private makeShip(kind: Ship['kind'], texture: string, x: number, y: number, health: number, radius: number): Ship {
    const view = Sprite.from(texture);
    view.anchor.set(0.5);
    view.scale.set(0.62);
    view.position.set(x, y);
    const healthBar = new Container();
    const frame = Sprite.from(ASSET.healthFrame);
    const healthFill = Sprite.from(ASSET.healthFill);
    const healthMask = new Graphics();
    healthBar.addChild(frame, healthFill, healthMask);
    healthFill.mask = healthMask;
    healthBar.scale.set(kind === 'player' ? 0.48 : 0.4);
    return { kind, view, healthBar, healthFill, healthMask, maxHealth: health, health, radius, cooldown: 0, wakeTimer: 0 };
  }

  private spawnEnemy(kind?: 'chaser' | 'shooter'): void {
    const type = kind ?? (++this.spawnCount % 2 ? 'chaser' : 'shooter');
    const points = [{ x: 1080, y: 100 }, { x: 1110, y: 620 }, { x: 870, y: 610 }, { x: 850, y: 105 }, { x: 120, y: 90 }, { x: 120, y: 630 }];
    const valid = points.filter((point) => {
      const farFromPlayer = !this.player || this.distance(point.x, point.y, this.player.view.x, this.player.view.y) > 420;
      const farFromEnemies = this.enemies.every((enemy) => this.distance(point.x, point.y, enemy.view.x, enemy.view.y) > 120);
      return farFromPlayer && farFromEnemies && !this.insideIsland(point.x, point.y, 30);
    });
    const point = valid[Math.floor(Math.random() * valid.length)] ?? points[0]!;
    const settings = type === 'chaser' ? this.config.chaser : this.config.shooter;
    const enemy = this.makeShip(type, type === 'chaser' ? ASSET.chaser : ASSET.shooter, point.x, point.y, settings.health, 23);
    this.enemies.push(enemy);
    this.world.addChild(enemy.view);
    this.healthLayer.addChild(enemy.healthBar);
  }

  private readonly update = (): void => {
    if (!this.active || this.paused) return;
    const dt = Math.min(this.app.ticker.deltaMS / 1000, 0.05);
    this.elapsed += dt;
    this.spawnTimer += dt;
    this.hudTimer += dt;
    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateWakeRipples(dt);
    this.updateExplosions(dt);
    this.updateWater(dt);
    this.updatePlayerDamageCooldown(dt);
    this.player.cooldown = Math.max(0, this.player.cooldown - dt);
    for (const enemy of this.enemies) enemy.cooldown = Math.max(0, enemy.cooldown - dt);
    if (this.spawnTimer >= this.config.enemySpawnIntervalSeconds) {
      this.spawnTimer = 0;
      this.spawnEnemy();
    }
    if (this.hudTimer >= 0.15) {
      this.hudTimer = 0;
      this.publishHud();
    }
    if (this.elapsed >= this.config.sessionDurationSeconds) this.finish('time-expired');
  };

  private updatePlayer(dt: number): void {
    const left = this.pressed('left', ['KeyA', 'ArrowLeft']);
    const right = this.pressed('right', ['KeyD', 'ArrowRight']);
    const forward = this.pressed('forward', ['KeyW', 'ArrowUp']);
    const speed = Math.hypot(this.playerVelocity.x, this.playerVelocity.y);
    const keyboardSteering = left === right ? 0 : right ? 1 : -1;
    const steering = this.analogControl?.steering ?? keyboardSteering;
    const throttle = this.analogControl?.throttle ?? (forward ? 1 : 0);
    const steeringAuthority = 0.32 + 0.68 * Math.min(1, speed / this.config.player.movementSpeed);
    const targetAngularVelocity = steering * this.config.player.rotationSpeed * steeringAuthority;
    const angularStep = (Math.abs(steering) < 0.01 ? this.config.player.angularDrag : this.config.player.angularAcceleration) * dt;
    this.playerAngularVelocity = this.moveTowards(this.playerAngularVelocity, targetAngularVelocity, angularStep);
    this.player.view.rotation += this.playerAngularVelocity * dt;

    const direction = this.direction(this.player.view.rotation);
    if (throttle > 0) {
      this.playerVelocity.x += direction.x * this.config.player.thrustAcceleration * throttle * dt;
      this.playerVelocity.y += direction.y * this.config.player.thrustAcceleration * throttle * dt;
    }
    const drag = Math.exp(-this.config.player.linearDrag * (throttle > 0 ? 0.38 : 1) * dt);
    this.playerVelocity.x *= drag;
    this.playerVelocity.y *= drag;
    const rightVector = { x: -direction.y, y: direction.x };
    const lateralSpeed = this.playerVelocity.x * rightVector.x + this.playerVelocity.y * rightVector.y;
    const lateralCorrection = lateralSpeed * (1 - Math.exp(-this.config.player.lateralDrag * dt));
    this.playerVelocity.x -= rightVector.x * lateralCorrection;
    this.playerVelocity.y -= rightVector.y * lateralCorrection;
    const currentSpeed = Math.hypot(this.playerVelocity.x, this.playerVelocity.y);
    if (currentSpeed > this.config.player.movementSpeed) {
      const ratio = this.config.player.movementSpeed / currentSpeed;
      this.playerVelocity.x *= ratio;
      this.playerVelocity.y *= ratio;
    }
    const previous = { x: this.player.view.x, y: this.player.view.y };
    this.player.view.x += this.playerVelocity.x * dt;
    this.player.view.y += this.playerVelocity.y * dt;
    if (this.constrain(this.player, previous)) {
      this.playerVelocity.x *= -0.18;
      this.playerVelocity.y *= -0.18;
    }
    this.updateShipWake(this.player, currentSpeed, dt);
    this.drawAimIndicator();
    this.drawHealth(this.player);
  }

  private updateEnemies(dt: number): void {
    for (const enemy of [...this.enemies]) {
      const dx = this.player.view.x - enemy.view.x;
      const dy = this.player.view.y - enemy.view.y;
      const distance = Math.hypot(dx, dy);
      const target = Math.atan2(dx, -dy);
      const settings = enemy.kind === 'chaser' ? this.config.chaser : this.config.shooter;
      let movementSpeed = 0;
      enemy.view.rotation = this.rotateTowards(enemy.view.rotation, target, settings.rotationSpeed * dt);
      if (enemy.kind === 'chaser' || distance > this.config.shooter.attackRange * 0.72) {
        const previous = { x: enemy.view.x, y: enemy.view.y };
        const direction = this.direction(enemy.view.rotation);
        enemy.view.x += direction.x * settings.movementSpeed * dt;
        enemy.view.y += direction.y * settings.movementSpeed * dt;
        this.constrain(enemy, previous);
        movementSpeed = settings.movementSpeed;
      }
      if (enemy.kind === 'shooter' && distance <= this.config.shooter.attackRange && enemy.cooldown <= 0) {
        const spread = (Math.random() * 2 - 1) * this.config.shooter.aimSpreadRadians;
        this.fire(enemy, target + spread, 'enemy');
        enemy.cooldown = this.config.shooter.shotCooldownSeconds;
      }
      if (enemy.kind === 'chaser' && distance < enemy.radius + this.player.radius) {
        this.spawnExplosion((enemy.view.x + this.player.view.x) / 2, (enemy.view.y + this.player.view.y) / 2, 1.05);
        this.damagePlayer(30);
        this.removeEnemy(enemy, false);
        continue;
      }
      this.updateShipWake(enemy, movementSpeed, dt);
      this.drawHealth(enemy);
    }
  }

  private updateProjectiles(dt: number): void {
    for (const projectile of [...this.projectiles]) {
      projectile.ttl -= dt;
      projectile.view.x += projectile.vx * dt;
      projectile.view.y += projectile.vy * dt;
      projectile.trailPoints.push({ x: projectile.view.x, y: projectile.view.y });
      if (projectile.trailPoints.length > 9) projectile.trailPoints.shift();
      this.drawProjectileTrail(projectile);
      const outside = projectile.view.x < 0 || projectile.view.y < 0 || projectile.view.x > this.config.arena.width || projectile.view.y > this.config.arena.height;
      if (projectile.ttl <= 0 || outside || this.insideIsland(projectile.view.x, projectile.view.y, projectile.radius)) {
        this.removeProjectile(projectile);
        continue;
      }
      if (projectile.owner === 'player') {
        const target = this.enemies.find((enemy) => this.distance(projectile.view.x, projectile.view.y, enemy.view.x, enemy.view.y) < projectile.radius + enemy.radius);
        if (target) {
          target.health -= this.config.projectile.damage;
          this.spawnExplosion(target.view.x, target.view.y, target.health <= 0 ? 1.3 : 0.88);
          this.removeProjectile(projectile);
          if (target.health <= 0) this.removeEnemy(target, true);
        }
      } else if (this.distance(projectile.view.x, projectile.view.y, this.player.view.x, this.player.view.y) < projectile.radius + this.player.radius) {
        this.spawnExplosion(this.player.view.x, this.player.view.y, 0.95);
        this.removeProjectile(projectile);
        this.damagePlayer(this.config.projectile.damage);
      }
    }
  }

  private broadside(side: -1 | 1): void {
    const angle = this.player.view.rotation + side * Math.PI / 2;
    const forward = this.direction(this.player.view.rotation);
    for (const offset of [-22, 0, 22]) this.fire(this.player, angle, 'player', forward.x * offset, forward.y * offset);
    this.player.cooldown = this.config.projectile.broadsideCooldownSeconds;
  }

  private fire(ship: Ship, angle: number, owner: Projectile['owner'], offsetX = 0, offsetY = 0): void {
    const direction = this.direction(angle);
    const view = Sprite.from(ASSET.cannonBall);
    view.anchor.set(0.5);
    view.scale.set(1.25);
    view.position.set(ship.view.x + direction.x * (ship.radius + 10) + offsetX, ship.view.y + direction.y * (ship.radius + 10) + offsetY);
    const trail = new Graphics();
    this.projectileTrailLayer.addChild(trail);
    this.projectiles.push({
      view,
      trail,
      trailPoints: [{ x: view.x, y: view.y }],
      owner,
      vx: direction.x * this.config.projectile.speed,
      vy: direction.y * this.config.projectile.speed,
      ttl: this.config.projectile.lifetimeSeconds,
      radius: 6,
    });
    if (owner === 'player') {
      this.playerShotsFired += 1;
      this.app.canvas.dataset.playerShots = String(this.playerShotsFired);
    }
    this.world.addChild(view);
  }

  private releaseFire(control: Control): void {
    if (!this.active || this.paused || this.player.cooldown > 0) return;
    if (control === 'fireFront') {
      this.fire(this.player, this.player.view.rotation, 'player');
      this.player.cooldown = this.config.projectile.frontCooldownSeconds;
    } else if (control === 'fireLeft') this.broadside(-1);
    else if (control === 'fireRight') this.broadside(1);
  }

  private drawAimIndicator(): void {
    if (!this.player || !this.active || this.paused) {
      this.clearAimIndicator();
      return;
    }
    const control = this.getHeldFireControl();
    if (!control) {
      this.clearAimIndicator();
      return;
    }
    const angle = this.player.view.rotation + (control === 'fireLeft' ? -Math.PI / 2 : control === 'fireRight' ? Math.PI / 2 : 0);
    const direction = this.direction(angle);
    const side = { x: -direction.y, y: direction.x };
    const start = { x: this.player.view.x + direction.x * 38, y: this.player.view.y + direction.y * 38 };
    const end = { x: this.player.view.x + direction.x * 112, y: this.player.view.y + direction.y * 112 };
    const color = this.player.cooldown <= 0 ? 0xffd166 : 0x8da7ad;
    this.aimIndicator.clear();
    for (let distance = 0; distance < 56; distance += 18) {
      this.aimIndicator
        .moveTo(start.x + direction.x * distance, start.y + direction.y * distance)
        .lineTo(start.x + direction.x * (distance + 10), start.y + direction.y * (distance + 10))
        .stroke({ color, alpha: 0.85, width: 4 });
    }
    this.aimIndicator
      .moveTo(end.x, end.y)
      .lineTo(end.x - direction.x * 18 + side.x * 13, end.y - direction.y * 18 + side.y * 13)
      .lineTo(end.x - direction.x * 18 - side.x * 13, end.y - direction.y * 18 - side.y * 13)
      .closePath()
      .fill({ color, alpha: 0.92 });
    this.app.canvas.dataset.aiming = control;
  }

  private clearAimIndicator(): void {
    this.aimIndicator.clear();
    if (this.initialized) this.app.canvas.dataset.aiming = '';
  }

  private getHeldFireControl(): Control | undefined {
    if (this.pressed('fireFront', ['Space'])) return 'fireFront';
    if (this.pressed('fireLeft', ['KeyQ'])) return 'fireLeft';
    if (this.pressed('fireRight', ['KeyE'])) return 'fireRight';
    return undefined;
  }

  private drawProjectileTrail(projectile: Projectile): void {
    projectile.trail.clear();
    const color = projectile.owner === 'player' ? 0xffe8a8 : 0xff8a68;
    for (let index = 1; index < projectile.trailPoints.length; index += 1) {
      const from = projectile.trailPoints[index - 1]!;
      const to = projectile.trailPoints[index]!;
      const progress = index / projectile.trailPoints.length;
      projectile.trail.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke({
        color,
        alpha: 0.08 + progress * 0.72,
        width: 1 + progress * 3,
      });
    }
  }

  private updateShipWake(ship: Ship, speed: number, dt: number): void {
    ship.wakeTimer -= dt;
    if (speed < 24 || ship.wakeTimer > 0) return;
    const direction = this.direction(ship.view.rotation);
    const ripple = new Graphics();
    ripple.position.set(ship.view.x - direction.x * ship.radius * 0.8, ship.view.y - direction.y * ship.radius * 0.8);
    ripple.rotation = ship.view.rotation;
    this.wakeLayer.addChild(ripple);
    this.wakeRipples.push({ view: ripple, age: 0, duration: 0.85 });
    const speedRatio = Math.min(1, speed / this.config.player.movementSpeed);
    ship.wakeTimer = 0.3 - speedRatio * 0.12;
  }

  private updateWakeRipples(dt: number): void {
    for (const ripple of [...this.wakeRipples]) {
      ripple.age += dt;
      const progress = ripple.age / ripple.duration;
      if (progress >= 1) {
        this.wakeRipples.splice(this.wakeRipples.indexOf(ripple), 1);
        ripple.view.destroy();
        continue;
      }
      ripple.view
        .clear()
        .ellipse(0, 0, 9 + progress * 18, 3 + progress * 7)
        .stroke({ color: 0xc9f7f2, alpha: (1 - progress) * 0.58, width: 2 });
    }
  }

  private spawnExplosion(x: number, y: number, scale: number): void {
    const view = Sprite.from(ASSET.explosion3);
    view.anchor.set(0.5);
    view.position.set(x, y);
    view.rotation = Math.random() * Math.PI * 2;
    view.scale.set(scale * 0.72);
    this.combatEffectsLayer.addChild(view);
    this.explosions.push({ view, duration: 0.56, scale, age: 0 });
  }

  private updateExplosions(dt: number): void {
    const frames = [ASSET.explosion3, ASSET.explosion2, ASSET.explosion1, ASSET.explosion1, ASSET.explosion2] as const;
    for (const explosion of [...this.explosions]) {
      explosion.age += dt;
      const progress = explosion.age / explosion.duration;
      if (progress >= 1) {
        this.explosions.splice(this.explosions.indexOf(explosion), 1);
        explosion.view.destroy();
        continue;
      }
      const frame = frames[Math.min(frames.length - 1, Math.floor(progress * frames.length))]!;
      explosion.view.texture = Texture.from(frame);
      const pulse = 0.86 + Math.sin(progress * Math.PI) * 0.36;
      explosion.view.scale.set(explosion.scale * pulse);
      explosion.view.alpha = progress < 0.68 ? 1 : 1 - (progress - 0.68) / 0.32;
    }
  }

  private updateWater(dt: number): void {
    this.ocean.tilePosition.x += dt * 2.4;
    this.ocean.tilePosition.y += dt * 1.15;
  }

  private damagePlayer(amount: number): void {
    if (!this.active || this.playerDamageCooldown > 0) return;
    this.player.health = Math.max(0, this.player.health - amount);
    this.playerDamageCooldown = this.config.player.damageCooldownSeconds;
    this.drawHealth(this.player);
    this.publishHud();
    if (this.player.health <= 0) this.finish('player-destroyed');
  }

  private updatePlayerDamageCooldown(dt: number): void {
    this.playerDamageCooldown = Math.max(0, this.playerDamageCooldown - dt);
    if (this.playerDamageCooldown <= 0) {
      this.player.view.alpha = 1;
      this.player.view.tint = 0xffffff;
      return;
    }
    const pulse = (Math.sin(this.playerDamageCooldown * Math.PI * 7) + 1) / 2;
    this.player.view.alpha = 0.55 + pulse * 0.45;
    this.player.view.tint = 0xffd27a;
  }

  private removeEnemy(enemy: Ship, score: boolean): void {
    const index = this.enemies.indexOf(enemy);
    if (index < 0) return;
    this.enemies.splice(index, 1);
    enemy.view.destroy();
    enemy.healthBar.destroy({ children: true });
    if (score) this.score += 1;
  }

  private removeProjectile(projectile: Projectile): void {
    const index = this.projectiles.indexOf(projectile);
    if (index < 0) return;
    this.projectiles.splice(index, 1);
    projectile.trail.destroy();
    projectile.view.destroy();
  }

  private constrain(ship: Ship, previous: { x: number; y: number }): boolean {
    const bounds = this.visibleBounds;
    const constrainedX = Math.max(bounds.left + ship.radius, Math.min(bounds.right - ship.radius, ship.view.x));
    const constrainedY = Math.max(bounds.top + ship.radius, Math.min(bounds.bottom - ship.radius, ship.view.y));
    let collided = constrainedX !== ship.view.x || constrainedY !== ship.view.y;
    ship.view.x = constrainedX;
    ship.view.y = constrainedY;
    if (this.insideIsland(ship.view.x, ship.view.y, ship.radius)) {
      ship.view.position.set(previous.x, previous.y);
      collided = true;
      if (ship.kind !== 'player') ship.view.rotation += Math.PI * 0.45;
    }
    return collided;
  }

  private drawHealth(ship: Ship): void {
    const ratio = Math.max(0, ship.health / ship.maxHealth);
    ship.healthMask.clear().rect(0, 0, ratio === 0 ? 0 : 24 + 112 * ratio, 40).fill(0xffffff);
    ship.healthFill.tint = ratio > 0.55 ? 0xffffff : ratio > 0.25 ? 0xffcc66 : 0xff5555;
    ship.healthBar.position.set(ship.view.x - 80 * ship.healthBar.scale.x, Math.max(0, ship.view.y - 48));
  }

  private finish(endReason: GameResult['endReason']): void {
    if (!this.active) return;
    this.active = false;
    this.clearInput();
    this.callbacks.onResult({ score: this.score, durationSeconds: Math.min(this.elapsed, this.config.sessionDurationSeconds), endReason, config: this.config });
  }

  private publishHud(): void {
    this.callbacks.onHud({
      health: this.player?.health ?? this.config.player.health,
      maxHealth: this.config.player.health,
      score: this.score,
      remainingSeconds: Math.max(0, Math.ceil(this.config.sessionDurationSeconds - this.elapsed)),
      enemyCount: this.enemies.length,
      paused: this.paused,
      playerRotation: this.player?.view.rotation ?? 0,
      activeControls: this.getActiveControls(),
    });
  }

  private getActiveControls(): Control[] {
    const bindings: ReadonlyArray<readonly [Control, readonly string[]]> = [
      ['forward', ['KeyW', 'ArrowUp']],
      ['left', ['KeyA', 'ArrowLeft']],
      ['right', ['KeyD', 'ArrowRight']],
      ['fireFront', ['Space']],
      ['fireLeft', ['KeyQ']],
      ['fireRight', ['KeyE']],
    ];
    return bindings.filter(([control, codes]) => this.pressed(control, codes)).map(([control]) => control);
  }

  private pressed(control: Control, codes: readonly string[]): boolean {
    return this.controls.has(control) || codes.some((code) => this.keys.has(code));
  }
  private clearInput(): void {
    this.keys.clear();
    this.controls.clear();
    this.analogControl = null;
    this.clearAimIndicator();
  }
  private isFireControl(control: Control): boolean {
    return control === 'fireFront' || control === 'fireLeft' || control === 'fireRight';
  }
  private fireControlForCode(code: string): Control | undefined {
    if (code === 'Space') return 'fireFront';
    if (code === 'KeyQ') return 'fireLeft';
    if (code === 'KeyE') return 'fireRight';
    return undefined;
  }
  private insideIsland(x: number, y: number, padding = 0): boolean {
    return this.scenario.islands.some((island) => {
      const width = island.columns * 64;
      const height = island.rows * 64;
      return x + padding > island.x && x - padding < island.x + width && y + padding > island.y && y - padding < island.y + height;
    });
  }
  private distance(ax: number, ay: number, bx: number, by: number): number { return Math.hypot(ax - bx, ay - by); }
  private direction(rotation: number): { x: number; y: number } { return { x: Math.sin(rotation), y: -Math.cos(rotation) }; }
  private rotateTowards(current: number, target: number, step: number): number {
    const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current));
    return current + Math.max(-step, Math.min(step, difference));
  }
  private moveTowards(current: number, target: number, step: number): number {
    if (Math.abs(target - current) <= step) return target;
    return current + Math.sign(target - current) * step;
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const gameCodes = ['KeyW', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyQ', 'KeyE', 'KeyP', 'Escape'];
    if (!gameCodes.includes(event.code)) return;
    event.preventDefault();
    if ((event.code === 'KeyP' || event.code === 'Escape') && !event.repeat) this.togglePause();
    else if (!this.paused) {
      this.keys.add(event.code);
      this.drawAimIndicator();
      this.publishHud();
    }
  };
  private readonly onKeyUp = (event: KeyboardEvent): void => {
    const wasPressed = this.keys.delete(event.code);
    if (!wasPressed) return;
    const fireControl = this.fireControlForCode(event.code);
    if (fireControl) this.releaseFire(fireControl);
    this.drawAimIndicator();
    this.publishHud();
  };
  private readonly onAutomaticPause = (): void => {
    this.pause();
  };
  private readonly onVisibilityChange = (): void => { if (document.hidden) this.onAutomaticPause(); };
}
