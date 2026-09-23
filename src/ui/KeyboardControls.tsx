import type { CSSProperties } from 'react';
import type { Control } from '../game/types';
import { Icon } from './PirateUI';

interface Props {
  readonly playerRotation?: number;
  readonly activeControls?: readonly Control[];
  readonly inGame?: boolean;
}

export function KeyboardControls({ playerRotation = 0, activeControls = [], inGame = false }: Props) {
  const rotationStyle = { '--ship-rotation': `${playerRotation}rad` } as CSSProperties;

  return (
    <section className={`keyboard-guide desktop-only ${inGame ? 'game-keyboard-guide' : 'menu-keyboard-guide'}`} aria-labelledby={inGame ? 'game-keyboard-title' : 'menu-keyboard-title'}>
      <h2 id={inGame ? 'game-keyboard-title' : 'menu-keyboard-title'}>Keyboard controls</h2>
      <div className="keyboard-command-list">
        <Command keys={['W', '↑']} label="Forward" control="forward" active={activeControls.includes('forward')} />
        <Command keys={['A', '←']} label="Turn left" control="left" active={activeControls.includes('left')} />
        <Command keys={['D', '→']} label="Turn right" control="right" active={activeControls.includes('right')} />
        <Command keys={['Space']} label="Front cannon" control="fireFront" active={activeControls.includes('fireFront')} />
        <Command keys={['Q']} label="Port broadside" control="fireLeft" active={activeControls.includes('fireLeft')} icon={inGame ? 'fire_left' : undefined} style={rotationStyle} broadside="port" />
        <Command keys={['E']} label="Starboard broadside" control="fireRight" active={activeControls.includes('fireRight')} icon={inGame ? 'fire_right' : undefined} style={rotationStyle} broadside="starboard" />
        <Command keys={['P', 'Esc']} label="Pause" command="pause" />
      </div>
    </section>
  );
}

function Command({ keys, label, control, active = false, icon, style, broadside, command }: {
  readonly keys: readonly string[];
  readonly label: string;
  readonly control?: Control;
  readonly active?: boolean;
  readonly icon?: 'fire_left' | 'fire_right';
  readonly style?: CSSProperties;
  readonly broadside?: 'port' | 'starboard';
  readonly command?: 'pause';
}) {
  return (
    <div className="keyboard-command" data-active={active} data-broadside={broadside} data-command={command} data-control={control} style={style}>
      <span className="key-combination">{keys.map((key) => <kbd key={key}>{key}</kbd>)}</span>
      {icon && <span className="broadside-direction" aria-hidden="true"><Icon name={icon} /></span>}
      <strong>{label}</strong>
    </div>
  );
}
