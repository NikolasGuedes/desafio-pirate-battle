import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, m } from 'motion/react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
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
  const [animateScreenTransition, setAnimateScreenTransition] = useState(false);
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

  const startGame = () => { setAnimateScreenTransition(true); setRecordsTab(null); setScreen('game'); };
  const goToMenu = () => { setAnimateScreenTransition(true); hidePersistedResult(); setScreen('menu'); };
  const handleResult = useCallback((gameResult: GameResult) => {
    const match: MatchRecord = { id: crypto.randomUUID(), playerId, playerName: 'You', completedAt: new Date().toISOString(), score: gameResult.score, durationSeconds: gameResult.durationSeconds, endReason: gameResult.endReason, config: gameResult.config };
    saveCompletedMatch(match);
    setAnimateScreenTransition(true);
    setResult(match);
    setScreen('result');
    registerMatch(match);
  }, [playerId, registerMatch]);

  if (screen === 'game') return <ScreenTransition screenKey="game" animated={animateScreenTransition}><GameScreen config={config} onExit={goToMenu} onResult={handleResult} /></ScreenTransition>;
  if (screen === 'options') return <ScreenTransition screenKey="options" animated={animateScreenTransition}><OptionsScreen settings={settings} onBack={() => { setAnimateScreenTransition(false); setScreen('menu'); }} onSave={(next: GameSettings) => { setAnimateScreenTransition(false); saveSettings(next); setSettings(next); setScreen('menu'); }} /></ScreenTransition>;
  if (screen === 'controls') return <ScreenTransition screenKey="controls" animated={animateScreenTransition}><ControlsScreen onBack={() => { setAnimateScreenTransition(false); setScreen('menu'); }} /></ScreenTransition>;

  if (screen === 'result' && result) {
    const pending = registrationPending || Boolean(loadPendingMatch());
    return <ScreenTransition screenKey="result" animated={animateScreenTransition}><main className="app-shell"><Card className="menu-card result-card" aria-labelledby="result-title">
      <p className="eyebrow">Match complete</p><h1 id="result-title">{result.endReason === 'time-expired' ? 'Time is up!' : 'Ship destroyed'}</h1>
      <dl className="result-stats"><div><dt>Final score</dt><dd>{result.score}</dd></div><div><dt>Time played</dt><dd>{Math.round(result.durationSeconds)}s</dd></div></dl>
      <p className={`save-status ${registrationError ? 'field-error' : ''}`} role="status">{registrationError ? 'Registration failed. Your result is safely stored.' : pending ? 'Saving match…' : 'Match registered successfully.'}</p>
      {registrationError && <Button type="button" size="lg" className="retry-button" onClick={() => registerMatch(result)}>Try Registration Again</Button>}
      <div className="actions"><Button type="button" size="lg" onClick={startGame}>Play Again</Button><Button type="button" size="lg" variant="secondary" onClick={goToMenu}>Main Menu</Button></div>
    </Card></main></ScreenTransition>;
  }

  return <ScreenTransition screenKey={recordsTab ? `records-${recordsTab}` : 'menu'} animated={animateScreenTransition}><main className="app-shell"><Card className={`menu-card ${recordsTab ? 'menu-with-records' : ''}`} aria-labelledby="game-title">
    {recordsTab ? <h1 className="log-title" id="game-title">Captain’s Log</h1> : <><img className="game-logo" src="/assets/png/retina/ui/menu/title_pirate_battle.png" alt="" /><h1 className="visually-hidden" id="game-title">Pirate Battle</h1><p className="eyebrow">Set sail. Take command.</p></>}
    {!recordsTab && <><div className="actions" aria-label="Main menu"><Button type="button" size="lg" onClick={startGame}>Play</Button><Button type="button" size="lg" variant="secondary" onClick={() => { setAnimateScreenTransition(false); setScreen('options'); }}>Options</Button><Button className="mobile-only" type="button" size="lg" variant="secondary" onClick={() => { setAnimateScreenTransition(false); setScreen('controls'); }}>Controls</Button></div><KeyboardControls /></>}
    <nav className="data-tabs" aria-label="Game records"><Button type="button" variant={recordsTab === 'ranking' ? 'default' : 'secondary'} aria-pressed={recordsTab === 'ranking'} onClick={() => { setAnimateScreenTransition(false); setRecordsTab('ranking'); }}>Ranking</Button><Button type="button" variant={recordsTab === 'history' ? 'default' : 'secondary'} aria-pressed={recordsTab === 'history'} onClick={() => { setAnimateScreenTransition(false); setRecordsTab('history'); }}>Match History</Button></nav>
    {recordsTab && <RecordsPanel key={recordsTab} tab={recordsTab} playerId={playerId} onClose={() => { setAnimateScreenTransition(false); setRecordsTab(null); }} />}
  </Card></main></ScreenTransition>;
}

function ScreenTransition({ screenKey, animated, children }: { readonly screenKey: string; readonly animated: boolean; readonly children: ReactNode }) {
  return <AnimatePresence initial={false} mode="wait" custom={animated}><m.div
    key={screenKey}
    className="screen-transition"
    data-animated={animated}
    custom={animated}
    variants={{
      initial: (enabled: boolean) => ({ opacity: enabled ? 0 : 1, scale: enabled ? 0.992 : 1 }),
      center: (enabled: boolean) => ({ opacity: 1, scale: 1, transition: { duration: enabled ? 0.22 : 0, ease: 'easeInOut' } }),
      exit: (enabled: boolean) => ({ opacity: enabled ? 0 : 1, scale: enabled ? 1.008 : 1, transition: { duration: enabled ? 0.22 : 0, ease: 'easeInOut' } }),
    }}
    initial="initial"
    animate="center"
    exit="exit"
  >{children}</m.div></AnimatePresence>;
}
