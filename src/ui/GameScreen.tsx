import { useEffect, useRef, useState } from 'react';
import { PirateGame } from '../game/PirateGame';
import type { GameConfig } from '../game/config';
import type { Control, GameResult, HudSnapshot } from '../game/types';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Pause } from 'lucide-react';

interface Props {
  readonly config: GameConfig;
  readonly onExit: () => void;
  readonly onResult: (result: GameResult) => void;
}

export function GameScreen({ config, onExit, onResult }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<PirateGame | null>(null);
  const [hud, setHud] = useState<HudSnapshot>({ health: 100, maxHealth: 100, score: 0, remainingSeconds: config.sessionDurationSeconds, enemyCount: 0, paused: false });
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
    void game.start().catch((cause: unknown) => {
      if (!disposed) setError(cause instanceof Error ? cause.message : 'Could not load the game.');
    });
    return () => {
      disposed = true;
      game.destroy();
      gameRef.current = null;
    };
  }, [config, onResult]);

  const hold = (control: Control, pressed: boolean) => gameRef.current?.setControl(control, pressed);

  return (
    <main className="game-screen">
      <header className="game-hud" aria-label="Match status">
        <Button className="hud-button" size="icon-lg" type="button" onClick={() => gameRef.current?.togglePause()} aria-label="Pause game"><Pause /></Button>
        <div className="health-stat"><span>Hull</span><Progress className="hull-progress" value={(hud.health / hud.maxHealth) * 100} aria-label={`${hud.health} hull points`} /><strong>{hud.health}</strong></div>
        <div><span>Score</span><strong>{hud.score}</strong></div>
        <div><span>Time</span><strong>{formatTime(hud.remainingSeconds)}</strong></div>
        <div className="enemy-stat"><span>Enemies</span><strong>{hud.enemyCount}</strong></div>
      </header>

      <div className="arena-frame">
        <div ref={hostRef} className="canvas-host" />
        {loading < 1 && !error && <div className="game-overlay"><p>Loading fleet… {Math.round(loading * 100)}%</p></div>}
        {error && <div className="game-overlay"><h2>Loading failed</h2><p>{error}</p><Button size="lg" type="button" onClick={onExit}>Main Menu</Button></div>}
        {hud.paused && !error && (
          <div className="game-overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title">
            <h2 id="pause-title">Game paused</h2>
            <p>Inputs were cleared. Resume when ready.</p>
            <Button size="lg" type="button" onClick={() => gameRef.current?.resume()} autoFocus>Resume</Button>
            <Button size="lg" type="button" variant="secondary" onClick={onExit}>Main Menu</Button>
          </div>
        )}
      </div>

      <div className="touch-controls" aria-label="Touch game controls">
        <div className="touch-group">
          <HoldButton label="Turn left" icon="↶" onHold={(pressed) => hold('left', pressed)} />
          <HoldButton label="Forward" icon="↑" onHold={(pressed) => hold('forward', pressed)} />
          <HoldButton label="Turn right" icon="↷" onHold={(pressed) => hold('right', pressed)} />
        </div>
        <div className="touch-group">
          <HoldButton label="Fire left broadside" icon="≪" onHold={(pressed) => hold('fireLeft', pressed)} />
          <HoldButton label="Fire front cannon" icon="●" onHold={(pressed) => hold('fireFront', pressed)} />
          <HoldButton label="Fire right broadside" icon="≫" onHold={(pressed) => hold('fireRight', pressed)} />
        </div>
      </div>
      <p className="controls-help">W/↑ move · A/D or ←/→ turn · Space front cannon · Q/E broadsides · P/Esc pause</p>
    </main>
  );
}

function HoldButton({ label, icon, onHold }: { readonly label: string; readonly icon: string; readonly onHold: (pressed: boolean) => void }) {
  return (
    <Button
      className="touch-button"
      variant="secondary"
      size="icon-lg"
      type="button"
      aria-label={label}
      onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); onHold(true); }}
      onPointerUp={() => onHold(false)}
      onPointerCancel={() => onHold(false)}
      onLostPointerCapture={() => onHold(false)}
    >{icon}</Button>
  );
}

function formatTime(total: number): string {
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, '0')}`;
}
