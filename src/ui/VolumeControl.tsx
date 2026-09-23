import { Label } from '@/components/ui/label';
import { soundManager } from '@/audio/soundManager';

interface Props {
  readonly id: string;
  readonly value: number;
  readonly onChange: (value: number) => void;
}

export function VolumeControl({ id, value, onChange }: Props) {
  return <div className="volume-setting">
    <Label htmlFor={id}>Sound volume <span>{value === 0 ? 'Muted' : `${value}%`}</span></Label>
    <div className="volume-control">
      <span aria-hidden="true">🔈</span>
      <input
        className="volume-slider"
        id={id}
        type="range"
        min="0"
        max="100"
        step="5"
        value={value}
        onChange={(event) => {
          const nextValue = Number(event.target.value);
          soundManager.setMasterVolume(nextValue / 100);
          soundManager.play('uiClick', { volume: 0.58, throttleMs: 45 });
          onChange(nextValue);
        }}
      />
      <span aria-hidden="true">🔊</span>
    </div>
  </div>;
}
