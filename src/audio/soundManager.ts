const SOUND_PATHS = {
  cannonBroadside: '/assets/sounds/cannon_broadside.wav',
  cannonFire1: '/assets/sounds/cannon_fire_1.wav',
  cannonFire2: '/assets/sounds/cannon_fire_2.wav',
  cannonFire3: '/assets/sounds/cannon_fire_3.wav',
  cannonballWaterHit1: '/assets/sounds/cannonball_water_hit_1.wav',
  cannonballWaterHit2: '/assets/sounds/cannonball_water_hit_2.wav',
  gameComplete: '/assets/sounds/game_complete.wav',
  gameOver: '/assets/sounds/game_over.wav',
  gamePause: '/assets/sounds/game_pause.wav',
  gameResume: '/assets/sounds/game_resume.wav',
  gameStart: '/assets/sounds/game_start.wav',
  healthLow: '/assets/sounds/health_low.wav',
  oceanAmbience: '/assets/sounds/ocean_ambience_loop.wav',
  scorePoint: '/assets/sounds/score_point.wav',
  shipCollision: '/assets/sounds/ship_collision.wav',
  shipExplosion1: '/assets/sounds/ship_explosion_1.wav',
  shipExplosion2: '/assets/sounds/ship_explosion_2.wav',
  shipSailing: '/assets/sounds/ship_sailing_loop.wav',
  shipSinking: '/assets/sounds/ship_sinking.wav',
  shipWoodHit1: '/assets/sounds/ship_wood_hit_1.wav',
  shipWoodHit2: '/assets/sounds/ship_wood_hit_2.wav',
  timeWarning: '/assets/sounds/time_warning.wav',
  uiBack: '/assets/sounds/ui_back.wav',
  uiClick: '/assets/sounds/ui_click.wav',
  uiClose: '/assets/sounds/ui_close.wav',
  uiHover: '/assets/sounds/ui_hover.wav',
  uiOpen: '/assets/sounds/ui_open.wav',
} as const;

export type SoundName = keyof typeof SOUND_PATHS;

interface PlayOptions {
  readonly volume?: number;
  readonly playbackRate?: number;
  readonly throttleMs?: number;
}

interface ActiveLoop {
  readonly source: AudioBufferSourceNode;
  readonly gain: GainNode;
  volume: number;
}

class SoundManager {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterVolume = 0.7;
  private readonly buffers = new Map<SoundName, AudioBuffer>();
  private readonly loading = new Map<SoundName, Promise<AudioBuffer>>();
  private readonly loops = new Map<SoundName, ActiveLoop>();
  private readonly loopRequests = new Map<SoundName, number>();
  private readonly lastPlayed = new Map<SoundName, number>();
  private loopsPaused = false;

  unlock(): void {
    const context = this.getContext();
    if (context.state === 'suspended') void context.resume().catch(() => undefined);
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = this.clamp(volume);
    if (this.masterGain && this.context) this.masterGain.gain.setTargetAtTime(this.masterVolume, this.context.currentTime, 0.03);
  }

  play(name: SoundName, options: PlayOptions = {}): void {
    const now = performance.now();
    const throttleMs = options.throttleMs ?? 30;
    if (now - (this.lastPlayed.get(name) ?? -Infinity) < throttleMs) return;
    this.lastPlayed.set(name, now);
    void this.playBuffer(name, options);
  }

  playRandom(names: readonly SoundName[], options: PlayOptions = {}): void {
    const name = names[Math.floor(Math.random() * names.length)];
    if (name) this.play(name, options);
  }

  startLoop(name: SoundName, volume: number): void {
    const request = (this.loopRequests.get(name) ?? 0) + 1;
    this.loopRequests.set(name, request);
    this.stopActiveLoop(name);
    void this.load(name).then((buffer) => {
      if (this.loopRequests.get(name) !== request) return;
      const context = this.getContext();
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      source.loop = true;
      gain.gain.value = this.loopsPaused ? 0 : this.clamp(volume);
      source.connect(gain).connect(this.getMasterGain());
      source.start();
      this.loops.set(name, { source, gain, volume: this.clamp(volume) });
    }).catch(() => undefined);
  }

  setLoopVolume(name: SoundName, volume: number): void {
    const active = this.loops.get(name);
    if (!active) return;
    const nextVolume = this.clamp(volume);
    if (Math.abs(active.volume - nextVolume) < 0.015) return;
    active.volume = nextVolume;
    active.gain.gain.setTargetAtTime(this.loopsPaused ? 0 : active.volume, this.getContext().currentTime, 0.08);
  }

  pauseLoops(): void {
    this.loopsPaused = true;
    const context = this.getContext();
    for (const loop of this.loops.values()) loop.gain.gain.setTargetAtTime(0, context.currentTime, 0.08);
  }

  resumeLoops(): void {
    this.loopsPaused = false;
    this.unlock();
    const context = this.getContext();
    for (const loop of this.loops.values()) loop.gain.gain.setTargetAtTime(loop.volume, context.currentTime, 0.12);
  }

  stopLoop(name: SoundName): void {
    this.loopRequests.set(name, (this.loopRequests.get(name) ?? 0) + 1);
    this.stopActiveLoop(name);
  }

  preload(names: readonly SoundName[]): void {
    for (const name of names) void this.load(name).catch(() => undefined);
  }

  private async playBuffer(name: SoundName, options: PlayOptions): Promise<void> {
    try {
      const context = this.getContext();
      if (context.state === 'suspended') await context.resume();
      const buffer = await this.load(name);
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      source.playbackRate.value = options.playbackRate ?? 1;
      gain.gain.value = this.clamp(options.volume ?? 0.55);
      source.connect(gain).connect(this.getMasterGain());
      source.start();
    } catch {
      // Audio is progressive enhancement; the game remains playable if a browser blocks it.
    }
  }

  private load(name: SoundName): Promise<AudioBuffer> {
    const cached = this.buffers.get(name);
    if (cached) return Promise.resolve(cached);
    const pending = this.loading.get(name);
    if (pending) return pending;
    const promise = fetch(SOUND_PATHS[name])
      .then((response) => {
        if (!response.ok) throw new Error(`Could not load sound: ${name}`);
        return response.arrayBuffer();
      })
      .then((data) => this.getContext().decodeAudioData(data))
      .then((buffer) => {
        this.buffers.set(name, buffer);
        this.loading.delete(name);
        return buffer;
      })
      .catch((error: unknown) => {
        this.loading.delete(name);
        throw error;
      });
    this.loading.set(name, promise);
    return promise;
  }

  private getContext(): AudioContext {
    this.context ??= new AudioContext();
    return this.context;
  }

  private getMasterGain(): GainNode {
    if (this.masterGain) return this.masterGain;
    const context = this.getContext();
    this.masterGain = context.createGain();
    this.masterGain.gain.value = this.masterVolume;
    this.masterGain.connect(context.destination);
    return this.masterGain;
  }

  private stopActiveLoop(name: SoundName): void {
    const active = this.loops.get(name);
    if (!active) return;
    active.source.stop();
    active.source.disconnect();
    active.gain.disconnect();
    this.loops.delete(name);
  }

  private clamp(volume: number): number {
    return Math.max(0, Math.min(1, volume));
  }
}

export const soundManager = new SoundManager();

export function installAudioUnlock(): () => void {
  const unlock = () => soundManager.unlock();
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });
  return () => {
    window.removeEventListener('pointerdown', unlock, { capture: true });
    window.removeEventListener('keydown', unlock, { capture: true });
  };
}
