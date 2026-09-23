import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { PirateGame } from '../game/PirateGame';
import type { GameConfig } from '../game/config';
import type { Control, GameResult, HudSnapshot } from '../game/types';
import { KeyboardControls } from './KeyboardControls';
import { Button, Card, RoundButton, HullBar, Icon, type SpriteIcon } from './PirateUI';

interface Props {
  readonly config: GameConfig;
  readonly onExit: () => void;
  readonly onResult: (result: GameResult) => void;
}

export function GameScreen({ config, onExit, onResult }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<PirateGame | null>(null);
  const [hud, setHud] = useState<HudSnapshot>({ health: 100, maxHealth: 100, score: 0, remainingSeconds: config.sessionDurationSeconds, enemyCount: 0, paused: false, playerRotation: 0, activeControls: [] });
  const [loading, setLoading] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    const game = new PirateGame(host, config, {
      onHud: (snapshot) => { if (!disposed) setHud(snapshot); },
      onResult: (result) => { if (!disposed) onResult(result); },
      onLoading: (progress) => { if (!disposed) setLoading(progress); },
    });
    gameRef.current = game;
    const portraitQuery = window.matchMedia('(orientation: portrait) and (max-width: 900px) and (hover: none) and (pointer: coarse)');
    const coverQuery = window.matchMedia('(max-height: 500px) and (orientation: landscape) and (hover: none) and (pointer: coarse)');
    const syncViewport = () => {
      const { width, height } = host.getBoundingClientRect();
      game.setViewportAspect(width / height, coverQuery.matches);
    };
    const viewportObserver = new ResizeObserver(syncViewport);
    viewportObserver.observe(host);
    coverQuery.addEventListener('change', syncViewport);
    syncViewport();
    const pauseForPortrait = (event: MediaQueryListEvent) => {
      if (event.matches) game.pause();
    };
    portraitQuery.addEventListener('change', pauseForPortrait);
    void game.start().catch((cause: unknown) => {
      if (!disposed) setError(cause instanceof Error ? cause.message : 'Could not load the game.');
    });
    return () => {
      disposed = true;
      portraitQuery.removeEventListener('change', pauseForPortrait);
      coverQuery.removeEventListener('change', syncViewport);
      viewportObserver.disconnect();
      game.destroy();
      gameRef.current = null;
    };
  }, [config, onResult]);

  const hold = (control: Control, pressed: boolean) => gameRef.current?.setControl(control, pressed);

  return (
    <main className="game-screen">
      <header className="game-hud" aria-label="Match status">
        <div className="health-stat"><Icon name="heart" /><HullBar health={hud.health} maxHealth={hud.maxHealth} /></div>
        <div className="hud-counter" aria-label={`Score: ${hud.score}`}><Icon name="score" /><strong>{hud.score}</strong></div>
        <div className="hud-counter" aria-label={`Time remaining: ${formatTime(hud.remainingSeconds)}`}><Icon name="time" /><strong>{formatTime(hud.remainingSeconds)}</strong></div>
        <RoundButton className="hud-button" icon="pause" onClick={() => gameRef.current?.togglePause()} aria-label="Pause game" />
      </header>

      <div className="arena-frame">
        <div ref={hostRef} className="canvas-host" />
        {loading < 1 && !error && <div className="game-overlay"><p>Loading fleet… {Math.round(loading * 100)}%</p></div>}
        {error && <div className="game-overlay"><h2>Loading failed</h2><p>{error}</p><Button size="lg" type="button" onClick={onExit}>Main Menu</Button></div>}
        {hud.paused && !error && (
          <div className="game-overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title">
            <Card className="pause-panel">
            <h2 id="pause-title" aria-label="Game paused">Paused</h2>
            <p>Ready when you are.</p>
            <div className="actions">
            <Button size="lg" type="button" onClick={() => gameRef.current?.resume()} autoFocus>Resume</Button>
            <Button size="lg" type="button" variant="secondary" onClick={onExit}>Main Menu</Button>
            </div>
            </Card>
          </div>
        )}
      </div>

      <div className="touch-controls" aria-label="Touch game controls">
        <SteeringJoystick
          key={hud.paused ? 'paused' : 'active'}
          disabled={hud.paused}
          onChange={(throttle, steering) => gameRef.current?.setAnalogControl(throttle, steering)}
          onRelease={() => gameRef.current?.clearAnalogControl()}
        />
        <div className="touch-group touch-action-group">
          <HoldButton label="Fire port broadside" icon="fire_left" iconRotation={hud.playerRotation} broadside="port" onHold={(pressed) => hold('fireLeft', pressed)} />
          <HoldButton label="Fire front cannon" icon="fire_front" onHold={(pressed) => hold('fireFront', pressed)} />
          <HoldButton label="Fire starboard broadside" icon="fire_right" iconRotation={hud.playerRotation} broadside="starboard" onHold={(pressed) => hold('fireRight', pressed)} />
        </div>
      </div>
      <KeyboardControls playerRotation={hud.playerRotation} activeControls={hud.activeControls} inGame />
    </main>
  );
}

function SteeringJoystick({ disabled, onChange, onRelease }: {
  readonly disabled: boolean;
  readonly onChange: (throttle: number, steering: number) => void;
  readonly onRelease: () => void;
}) {
  const padRef = useRef<HTMLDivElement>(null);
  const activePointer = useRef<number | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const reset = () => {
    activePointer.current = null;
    setPosition({ x: 0, y: 0 });
    onRelease();
  };
  const visiblePosition = disabled ? { x: 0, y: 0 } : position;

  const update = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pad = padRef.current;
    if (!pad || activePointer.current !== event.pointerId) return;
    const bounds = pad.getBoundingClientRect();
    const radius = bounds.width * 0.34;
    let x = event.clientX - (bounds.left + bounds.width / 2);
    let y = event.clientY - (bounds.top + bounds.height / 2);
    const distance = Math.hypot(x, y);
    if (distance > radius) {
      x *= radius / distance;
      y *= radius / distance;
    }
    const normalizedX = x / radius;
    const normalizedY = y / radius;
    const deadZone = 0.12;
    const steering = Math.abs(normalizedX) < deadZone ? 0 : normalizedX;
    const throttle = -normalizedY < deadZone ? 0 : Math.min(1, -normalizedY);
    setPosition({ x, y });
    onChange(throttle, steering);
  };

  return (
    <div
      ref={padRef}
      className="steering-joystick"
      role="button"
      tabIndex={0}
      aria-label="Movement joystick"
      aria-disabled={disabled}
      data-steering={Math.abs(visiblePosition.x) > 1 ? (visiblePosition.x < 0 ? 'left' : 'right') : 'center'}
      onPointerDown={(event) => {
        if (disabled || activePointer.current !== null) return;
        activePointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        update(event);
      }}
      onPointerMove={update}
      onPointerUp={reset}
      onPointerCancel={reset}
      onLostPointerCapture={() => { if (activePointer.current !== null) reset(); }}
    >
      <span className="joystick-direction joystick-direction-up">▲</span>
      <span className="joystick-direction joystick-direction-left">‹</span>
      <span className="joystick-direction joystick-direction-right">›</span>
      <span className="joystick-knob" style={{ transform: `translate(${visiblePosition.x}px, ${visiblePosition.y}px)` }}><Icon name="forward" /></span>
    </div>
  );
}

function HoldButton({ label, icon, iconRotation, broadside, onHold }: {
  readonly label: string;
  readonly icon: SpriteIcon;
  readonly iconRotation?: number;
  readonly broadside?: 'port' | 'starboard';
  readonly onHold: (pressed: boolean) => void;
}) {
  return (
    <RoundButton
      className={`touch-button ${iconRotation === undefined ? '' : 'direction-aware'}`}
      icon={icon}
      type="button"
      aria-label={label}
      data-broadside={broadside}
      style={iconRotation === undefined ? undefined : { '--ship-rotation': `${iconRotation}rad` } as CSSProperties}
      onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); onHold(true); }}
      onPointerUp={() => onHold(false)}
      onPointerCancel={() => onHold(false)}
      onLostPointerCapture={() => onHold(false)}
      onKeyDown={(event) => { if (event.key === 'Enter') onHold(true); }}
      onKeyUp={() => onHold(false)}
      onBlur={() => onHold(false)}
    />
  );
}

function formatTime(total: number): string {
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, '0')}`;
}
