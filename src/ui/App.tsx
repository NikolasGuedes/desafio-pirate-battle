import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MatchRecord } from '../api/contracts';
import { clearPendingMatch, getPlayerId, hidePersistedResult, loadLastMatch, loadPendingMatch, saveCompletedMatch, shouldRestoreResult } from '../api/localRecords';
import { createMatch } from '../api/matches';
import { configFromSettings, loadSettings, saveSettings, type GameSettings } from '../game/settings';
import type { GameResult } from '../game/types';
import { ControlsScreen } from './ControlsScreen';
import { GameScreen } from './GameScreen';
import { KeyboardControls } from './KeyboardControls';
import { OptionsScreen } from './OptionsScreen';
import { RecordsPanel, type RecordsTab } from './RecordsPanel';
import { Button, Card } from './PirateUI';

type Screen = 'menu' | 'options' | 'controls' | 'game' | 'result';

export function App() {
  const queryClient = useQueryClient();
  const [playerId] = useState(getPlayerId);
  const [settings, setSettings] = useState(loadSettings);
  const [screen, setScreen] = useState<Screen>(() => shouldRestoreResult() && loadLastMatch() ? 'result' : 'menu');
  const [result, setResult] = useState<MatchRecord | null>(loadLastMatch);
  const [recordsTab, setRecordsTab] = useState<RecordsTab | null>(null);
  const config = useMemo(() => {
    const current = configFromSettings(settings);
    const automatedDuration = navigator.webdriver ? Number(new URLSearchParams(location.search).get('testDuration')) : 0;
    return automatedDuration > 0 ? { ...current, sessionDurationSeconds: automatedDuration } : current;
  }, [settings]);
  const { mutate: registerMatch, isPending: registrationPending, isError: registrationError } = useMutation({
    mutationFn: createMatch,
    onSuccess: async (saved) => {
      clearPendingMatch(saved.id);
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['ranking'] }), queryClient.invalidateQueries({ queryKey: ['history', playerId] })]);
    },
  });

  useEffect(() => {
    const pending = loadPendingMatch();
    if (pending) registerMatch(pending);
  }, [registerMatch]);

  const startGame = () => { setRecordsTab(null); setScreen('game'); };
  const goToMenu = () => { hidePersistedResult(); setScreen('menu'); };
  const handleResult = useCallback((gameResult: GameResult) => {
    const match: MatchRecord = { id: crypto.randomUUID(), playerId, playerName: 'You', completedAt: new Date().toISOString(), score: gameResult.score, durationSeconds: gameResult.durationSeconds, endReason: gameResult.endReason, config: gameResult.config };
    saveCompletedMatch(match);
    setResult(match);
    setScreen('result');
    registerMatch(match);
  }, [playerId, registerMatch]);

  if (screen === 'game') return <GameScreen config={config} onExit={goToMenu} onResult={handleResult} />;
  if (screen === 'options') return <OptionsScreen settings={settings} onBack={() => setScreen('menu')} onSave={(next: GameSettings) => { saveSettings(next); setSettings(next); setScreen('menu'); }} />;
  if (screen === 'controls') return <ControlsScreen onBack={() => setScreen('menu')} />;

  if (screen === 'result' && result) {
    const pending = registrationPending || Boolean(loadPendingMatch());
    return <main className="app-shell"><Card className="menu-card result-card" aria-labelledby="result-title">
      <p className="eyebrow">Match complete</p><h1 id="result-title">{result.endReason === 'time-expired' ? 'Time is up!' : 'Ship destroyed'}</h1>
      <dl className="result-stats"><div><dt>Final score</dt><dd>{result.score}</dd></div><div><dt>Time played</dt><dd>{Math.round(result.durationSeconds)}s</dd></div></dl>
      <p className={`save-status ${registrationError ? 'field-error' : ''}`} role="status">{registrationError ? 'Registration failed. Your result is safely stored.' : pending ? 'Saving match…' : 'Match registered successfully.'}</p>
      {registrationError && <Button type="button" size="lg" className="retry-button" onClick={() => registerMatch(result)}>Try Registration Again</Button>}
      <div className="actions"><Button type="button" size="lg" onClick={startGame}>Play Again</Button><Button type="button" size="lg" variant="secondary" onClick={goToMenu}>Main Menu</Button></div>
    </Card></main>;
  }

  return <main className="app-shell"><Card className={`menu-card ${recordsTab ? 'menu-with-records' : ''}`} aria-labelledby="game-title">
    {recordsTab ? <h1 className="log-title" id="game-title">Captain’s Log</h1> : <><img className="game-logo" src="/assets/png/retina/ui/menu/title_pirate_battle.png" alt="" /><h1 className="visually-hidden" id="game-title">Pirate Battle</h1><p className="eyebrow">Set sail. Take command.</p></>}
    {!recordsTab && <><div className="actions" aria-label="Main menu"><Button type="button" size="lg" onClick={startGame}>Play</Button><Button type="button" size="lg" variant="secondary" onClick={() => setScreen('options')}>Options</Button><Button className="mobile-only" type="button" size="lg" variant="secondary" onClick={() => setScreen('controls')}>Controls</Button></div><KeyboardControls /></>}
    <nav className="data-tabs" aria-label="Game records"><Button type="button" variant={recordsTab === 'ranking' ? 'default' : 'secondary'} aria-pressed={recordsTab === 'ranking'} onClick={() => setRecordsTab('ranking')}>Ranking</Button><Button type="button" variant={recordsTab === 'history' ? 'default' : 'secondary'} aria-pressed={recordsTab === 'history'} onClick={() => setRecordsTab('history')}>Match History</Button></nav>
    {recordsTab && <RecordsPanel key={recordsTab} tab={recordsTab} playerId={playerId} onClose={() => setRecordsTab(null)} />}
  </Card></main>;
}
