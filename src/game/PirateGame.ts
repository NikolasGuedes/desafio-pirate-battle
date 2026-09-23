import { Application, Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { GameConfig } from './config';
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
}

interface Projectile {
  readonly view: Sprite;
  readonly owner: 'player' | 'enemy';
  vx: number;
  vy: number;
  ttl: number;
  radius: number;
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
  islandTile: '/assets/png/default/tiles/tile_40.png',
  healthFrame: '/assets/png/default/ui/hud/enemy_health_frame.png',
  healthFill: '/assets/png/default/ui/hud/enemy_health_fill_green.png',
} as const;
const ISLAND = { x: 500, y: 245, width: 256, height: 192 } as const;

export class PirateGame {
  private readonly app = new Application();
  private readonly world = new Container();
  private readonly healthLayer = new Container();
  private readonly controls = new Set<Control>();
  private readonly keys = new Set<string>();
  private readonly enemies: Ship[] = [];
  private readonly projectiles: Projectile[] = [];
  private player!: Ship;
  private elapsed = 0;
  private spawnTimer = 0;
  private hudTimer = 0;
  private score = 0;
  private spawnCount = 0;
  private active = false;
  private paused = false;
  private initialized = false;
  private destroyed = false;

  constructor(
    private readonly host: HTMLElement,
    private readonly config: GameConfig,
    private readonly callbacks: Callbacks,
  ) {}

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
    this.host.appendChild(this.app.canvas);
    await Assets.load(Object.values(ASSET), this.callbacks.onLoading);
    if (this.destroyed) return;

    this.createArena();
    this.player = this.makeShip('player', ASSET.player, 190, 360, this.config.player.health, 25);
    this.world.addChild(this.player.view);
    this.healthLayer.addChild(this.player.healthBar);
    this.spawnEnemy('chaser');
    this.spawnEnemy('shooter');
    this.app.stage.addChild(this.world, this.healthLayer);

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onAutomaticPause);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.app.ticker.add(this.update);
    this.active = true;
    this.publishHud();
  }

  setControl(control: Control, pressed: boolean): void {
    if (pressed) this.controls.add(control);
    else this.controls.delete(control);
    this.publishHud();
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
    this.world.addChild(new Graphics().rect(0, 0, this.config.arena.width, this.config.arena.height).fill(0x1596b4));
    const waves = new Graphics();
    for (let y = 32; y < this.config.arena.height; y += 48) {
      for (let x = (y / 48) % 2 ? 10 : 45; x < this.config.arena.width; x += 110) {
        waves.moveTo(x, y).quadraticCurveTo(x + 18, y - 8, x + 38, y).stroke({ color: 0x8ce2ea, alpha: 0.22, width: 3 });
      }
    }
    this.world.addChild(waves);
    const island = new Container({ x: ISLAND.x, y: ISLAND.y });
    const shore = new Graphics().roundRect(-6, -6, 268, 204, 24).fill(0xe8c681);
    island.addChild(shore);
    const texture = Texture.from(ASSET.islandTile);
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 4; column += 1) {
        const tile = new Sprite({ texture, x: column * 64, y: row * 64 });
        island.addChild(tile);
      }
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
    return { kind, view, healthBar, healthFill, healthMask, maxHealth: health, health, radius, cooldown: 0 };
  }

  private spawnEnemy(kind?: 'chaser' | 'shooter'): void {
    const type = kind ?? (++this.spawnCount % 2 ? 'chaser' : 'shooter');
    const points = [{ x: 1080, y: 100 }, { x: 1110, y: 620 }, { x: 870, y: 610 }, { x: 850, y: 105 }, { x: 120, y: 90 }, { x: 120, y: 630 }];
    const valid = points.filter((point) => !this.player || this.distance(point.x, point.y, this.player.view.x, this.player.view.y) > 420);
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
    if (left !== right) this.player.view.rotation += (right ? 1 : -1) * this.config.player.rotationSpeed * dt;
    if (this.pressed('forward', ['KeyW', 'ArrowUp'])) {
      const previous = { x: this.player.view.x, y: this.player.view.y };
      const direction = this.direction(this.player.view.rotation);
      this.player.view.x += direction.x * this.config.player.movementSpeed * dt;
      this.player.view.y += direction.y * this.config.player.movementSpeed * dt;
      this.constrain(this.player, previous);
    }
    if (this.player.cooldown <= 0 && this.pressed('fireFront', ['Space'])) {
      this.fire(this.player, this.player.view.rotation, 'player');
      this.player.cooldown = this.config.projectile.frontCooldownSeconds;
    } else if (this.player.cooldown <= 0 && this.pressed('fireLeft', ['KeyQ'])) this.broadside(-1);
    else if (this.player.cooldown <= 0 && this.pressed('fireRight', ['KeyE'])) this.broadside(1);
    this.drawHealth(this.player);
  }

  private updateEnemies(dt: number): void {
    for (const enemy of [...this.enemies]) {
      const dx = this.player.view.x - enemy.view.x;
      const dy = this.player.view.y - enemy.view.y;
      const distance = Math.hypot(dx, dy);
      const target = Math.atan2(dx, -dy);
      const settings = enemy.kind === 'chaser' ? this.config.chaser : this.config.shooter;
      enemy.view.rotation = this.rotateTowards(enemy.view.rotation, target, settings.rotationSpeed * dt);
      if (enemy.kind === 'chaser' || distance > this.config.shooter.attackRange * 0.72) {
        const previous = { x: enemy.view.x, y: enemy.view.y };
        const direction = this.direction(enemy.view.rotation);
        enemy.view.x += direction.x * settings.movementSpeed * dt;
        enemy.view.y += direction.y * settings.movementSpeed * dt;
        this.constrain(enemy, previous);
      }
      if (enemy.kind === 'shooter' && distance <= this.config.shooter.attackRange && enemy.cooldown <= 0) {
        this.fire(enemy, target, 'enemy');
        enemy.cooldown = 1.7;
      }
      if (enemy.kind === 'chaser' && distance < enemy.radius + this.player.radius) {
        this.damagePlayer(30);
        this.removeEnemy(enemy, false);
        continue;
      }
      this.drawHealth(enemy);
    }
  }

  private updateProjectiles(dt: number): void {
    for (const projectile of [...this.projectiles]) {
      projectile.ttl -= dt;
      projectile.view.x += projectile.vx * dt;
      projectile.view.y += projectile.vy * dt;
      const outside = projectile.view.x < 0 || projectile.view.y < 0 || projectile.view.x > this.config.arena.width || projectile.view.y > this.config.arena.height;
      if (projectile.ttl <= 0 || outside || this.insideIsland(projectile.view.x, projectile.view.y, projectile.radius)) {
        this.removeProjectile(projectile);
        continue;
      }
      if (projectile.owner === 'player') {
        const target = this.enemies.find((enemy) => this.distance(projectile.view.x, projectile.view.y, enemy.view.x, enemy.view.y) < projectile.radius + enemy.radius);
        if (target) {
          target.health -= this.config.projectile.damage;
          this.removeProjectile(projectile);
          if (target.health <= 0) this.removeEnemy(target, true);
        }
      } else if (this.distance(projectile.view.x, projectile.view.y, this.player.view.x, this.player.view.y) < projectile.radius + this.player.radius) {
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
    this.projectiles.push({ view, owner, vx: direction.x * this.config.projectile.speed, vy: direction.y * this.config.projectile.speed, ttl: this.config.projectile.lifetimeSeconds, radius: 6 });
    this.world.addChild(view);
  }

  private damagePlayer(amount: number): void {
    if (!this.active) return;
    this.player.health = Math.max(0, this.player.health - amount);
    this.drawHealth(this.player);
    this.publishHud();
    if (this.player.health <= 0) this.finish('player-destroyed');
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
    projectile.view.destroy();
  }

  private constrain(ship: Ship, previous: { x: number; y: number }): void {
    ship.view.x = Math.max(ship.radius, Math.min(this.config.arena.width - ship.radius, ship.view.x));
    ship.view.y = Math.max(ship.radius, Math.min(this.config.arena.height - ship.radius, ship.view.y));
    if (this.insideIsland(ship.view.x, ship.view.y, ship.radius)) {
      ship.view.position.set(previous.x, previous.y);
      if (ship.kind !== 'player') ship.view.rotation += Math.PI * 0.45;
    }
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
  private clearInput(): void { this.keys.clear(); this.controls.clear(); }
  private insideIsland(x: number, y: number, padding = 0): boolean {
    return x + padding > ISLAND.x && x - padding < ISLAND.x + ISLAND.width && y + padding > ISLAND.y && y - padding < ISLAND.y + ISLAND.height;
  }
  private distance(ax: number, ay: number, bx: number, by: number): number { return Math.hypot(ax - bx, ay - by); }
  private direction(rotation: number): { x: number; y: number } { return { x: Math.sin(rotation), y: -Math.cos(rotation) }; }
  private rotateTowards(current: number, target: number, step: number): number {
    const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current));
    return current + Math.max(-step, Math.min(step, difference));
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const gameCodes = ['KeyW', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyQ', 'KeyE', 'KeyP', 'Escape'];
    if (!gameCodes.includes(event.code)) return;
    event.preventDefault();
    if ((event.code === 'KeyP' || event.code === 'Escape') && !event.repeat) this.togglePause();
    else if (!this.paused) {
      this.keys.add(event.code);
      this.publishHud();
    }
  };
  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (this.keys.delete(event.code)) this.publishHud();
  };
  private readonly onAutomaticPause = (): void => {
    this.pause();
  };
  private readonly onVisibilityChange = (): void => { if (document.hidden) this.onAutomaticPause(); };
}
