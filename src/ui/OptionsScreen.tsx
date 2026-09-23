import { useState, type FormEvent } from 'react';
import { isValidSessionDuration, isValidSpawnInterval, type GameSettings } from '../game/settings';

interface Props { readonly settings: GameSettings; readonly onSave: (settings: GameSettings) => void; readonly onBack: () => void; }

export function OptionsScreen({ settings, onSave, onBack }: Props) {
  const [duration, setDuration] = useState(String(settings.sessionDurationSeconds));
  const [spawn, setSpawn] = useState(String(settings.enemySpawnIntervalSeconds));
  const [submitted, setSubmitted] = useState(false);
  const durationValue = Number(duration);
  const spawnValue = Number(spawn);
  const durationValid = isValidSessionDuration(durationValue);
  const spawnValid = isValidSpawnInterval(spawnValue);
  const submit = (event: FormEvent) => {
    event.preventDefault(); setSubmitted(true);
    if (durationValid && spawnValid) onSave({ sessionDurationSeconds: durationValue, enemySpawnIntervalSeconds: spawnValue });
  };
  return <main className="app-shell"><section className="menu-card options-card" aria-labelledby="options-title">
    <p className="eyebrow">Game setup</p><h1 id="options-title">Options</h1>
    <form onSubmit={submit} noValidate>
      <label htmlFor="session-duration">Game session time <span>60–180 seconds</span></label>
      <input id="session-duration" name="sessionDuration" type="number" min="60" max="180" step="1" value={duration} onChange={(event) => setDuration(event.target.value)} aria-invalid={submitted && !durationValid} aria-describedby="duration-help" />
      <p id="duration-help" className={submitted && !durationValid ? 'field-error' : 'field-help'}>{submitted && !durationValid ? 'Enter a whole number from 60 to 180.' : 'The match ends when this timer reaches zero.'}</p>
      <label htmlFor="spawn-interval">Enemy spawn time <span>2–15 seconds</span></label>
      <input id="spawn-interval" name="spawnInterval" type="number" min="2" max="15" step="1" value={spawn} onChange={(event) => setSpawn(event.target.value)} aria-invalid={submitted && !spawnValid} aria-describedby="spawn-help" />
      <p id="spawn-help" className={submitted && !spawnValid ? 'field-error' : 'field-help'}>{submitted && !spawnValid ? 'Enter a number from 2 to 15.' : 'Lower values make the arena more intense.'}</p>
      <div className="actions"><button type="submit">Save</button><button type="button" className="secondary" onClick={onBack}>Cancel</button></div>
    </form>
  </section></main>;
}
