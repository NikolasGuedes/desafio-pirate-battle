import { Button, Card, Icon, type SpriteIcon } from './PirateUI';
import { KeyboardControls } from './KeyboardControls';

interface Props {
  readonly onBack: () => void;
}

const controls: ReadonlyArray<{ icon: SpriteIcon; label: string; description: string }> = [
  { icon: 'forward', label: 'Movement joystick', description: 'Drag up to sail and diagonally to steer while moving.' },
  { icon: 'fire_front', label: 'Front cannon', description: 'Fire straight ahead.' },
  { icon: 'fire_left', label: 'Port broadside', description: 'Fire from the ship’s left side.' },
  { icon: 'fire_right', label: 'Starboard broadside', description: 'Fire from the ship’s right side.' },
  { icon: 'pause', label: 'Pause', description: 'Pause the current battle.' },
];

export function ControlsScreen({ onBack }: Props) {
  return (
    <main className="app-shell">
      <Card className="menu-card controls-card" aria-labelledby="controls-title">
        <h1 id="controls-title">Controls</h1>
        <p className="controls-note mobile-control-only">Broadside arrows rotate with your ship and point toward the shot.</p>
        <div className="control-list mobile-control-only">
          {controls.map((control) => (
            <article className="control-guide" key={control.icon}>
              <span className="control-demo" aria-hidden="true"><Icon name={control.icon} /></span>
              <span><strong>{control.label}</strong><small>{control.description}</small></span>
            </article>
          ))}
        </div>
        <KeyboardControls />
        <div className="actions"><Button type="button" size="lg" sound="uiBack" onClick={onBack}>Main Menu</Button></div>
      </Card>
    </main>
  );
}
