import { useState, type FormEvent } from 'react';
import { isValidSessionDuration, isValidSpawnInterval, type GameSettings } from '../game/settings';
import { soundManager } from '../audio/soundManager';
import { Button, Card, RoundButton } from './PirateUI';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VolumeControl } from './VolumeControl';

interface Props { readonly settings: GameSettings; readonly onSave: (settings: GameSettings) => void; readonly onBack: () => void; }

export function OptionsScreen({ settings, onSave, onBack }: Props) {
  const [duration, setDuration] = useState(String(settings.sessionDurationSeconds));
  const [spawn, setSpawn] = useState(String(settings.enemySpawnIntervalSeconds));
  const [soundVolume, setSoundVolume] = useState(settings.soundVolume);
  const [submitted, setSubmitted] = useState(false);
  const durationValue = Number(duration);
  const spawnValue = Number(spawn);
  const durationValid = isValidSessionDuration(durationValue);
  const spawnValid = isValidSpawnInterval(spawnValue);
  const submit = (event: FormEvent) => {
    event.preventDefault(); setSubmitted(true);
    if (durationValid && spawnValid) onSave({ sessionDurationSeconds: durationValue, enemySpawnIntervalSeconds: spawnValue, soundVolume });
  };
  return <main className="app-shell"><Card className="menu-card options-card" aria-labelledby="options-title">
    <h1 id="options-title">Options</h1>
    <form onSubmit={submit} noValidate>
      <Label htmlFor="session-duration">Game session time <span>60–180 seconds</span></Label>
      <div className="option-stepper option-duration">
      <RoundButton icon="minus" aria-label="Decrease session time" disabled={durationValue <= 60} onClick={() => setDuration(String(Math.max(60, durationValue - 10)))} />
      <div className="option-value"><Input id="session-duration" name="sessionDuration" type="number" min="60" max="180" step="1" value={duration} onChange={(event) => setDuration(event.target.value)} aria-invalid={submitted && !durationValid} aria-describedby="duration-help" /><span aria-hidden="true">s</span></div>
      <RoundButton icon="plus" aria-label="Increase session time" disabled={durationValue >= 180} onClick={() => setDuration(String(Math.min(180, durationValue + 10)))} />
      </div>
      <p id="duration-help" className={submitted && !durationValid ? 'field-error' : 'field-help'}>{submitted && !durationValid ? 'Enter a whole number from 60 to 180.' : 'The match ends when this timer reaches zero.'}</p>
      <Label htmlFor="spawn-interval">Enemy spawn time <span>2–15 seconds</span></Label>
      <div className="option-stepper option-spawn">
      <RoundButton icon="minus" aria-label="Decrease spawn time" disabled={spawnValue <= 2} onClick={() => setSpawn(String(Math.max(2, spawnValue - 1)))} />
      <div className="option-value"><Input id="spawn-interval" name="spawnInterval" type="number" min="2" max="15" step="1" value={spawn} onChange={(event) => setSpawn(event.target.value)} aria-invalid={submitted && !spawnValid} aria-describedby="spawn-help" /><span aria-hidden="true">s</span></div>
      <RoundButton icon="plus" aria-label="Increase spawn time" disabled={spawnValue >= 15} onClick={() => setSpawn(String(Math.min(15, spawnValue + 1)))} />
      </div>
      <p id="spawn-help" className={submitted && !spawnValid ? 'field-error' : 'field-help'}>{submitted && !spawnValid ? 'Enter a number from 2 to 15.' : 'Lower values make the arena more intense.'}</p>
      <VolumeControl id="sound-volume" value={soundVolume} onChange={setSoundVolume} />
      <div className="actions"><Button type="submit" size="lg" sound="uiClose">Save</Button><Button type="button" size="lg" sound="uiBack" variant="secondary" onClick={() => { soundManager.setMasterVolume(settings.soundVolume / 100); onBack(); }}>Cancel</Button></div>
    </form>
  </Card></main>;
}
