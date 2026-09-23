import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { MatchRecord } from '../api/contracts';
import { getMatchHistory, getRanking } from '../api/matches';
import { Button, RoundButton } from './PirateUI';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export type RecordsTab = 'ranking' | 'history';

export function RecordsPanel({ tab, playerId, onClose }: { readonly tab: RecordsTab; readonly playerId: string; readonly onClose: () => void }) {
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: tab === 'ranking' ? ['ranking', page] : ['history', playerId, page], queryFn: () => tab === 'ranking' ? getRanking(page) : getMatchHistory(playerId, page) });
  return <section className="records-panel" aria-labelledby="records-title">
    <div className="records-heading"><h2 id="records-title">{tab === 'ranking' ? 'Ranking' : 'Match History'}</h2><RoundButton icon="close" onClick={onClose} aria-label="Close records" /></div>
    {query.isPending && <p role="status">Loading records…</p>}
    {query.isError && <div className="error-state"><p>Could not load records.</p><Button type="button" onClick={() => void query.refetch()}>Try Again</Button></div>}
    {query.data?.items.length === 0 && <p className="empty-state">No matches yet. Finish a battle to appear here.</p>}
    {query.data && query.data.items.length > 0 && <div className="records-table-wrap"><Table><TableHeader><TableRow><TableHead>{tab === 'ranking' ? '#' : 'Date'}</TableHead><TableHead>Captain</TableHead><TableHead>Score</TableHead><TableHead>Duration</TableHead><TableHead>Result</TableHead></TableRow></TableHeader><TableBody>{query.data.items.map((match, index) => <RecordRow key={match.id} match={match} position={(page - 1) * query.data.pageSize + index + 1} history={tab === 'history'} />)}</TableBody></Table></div>}
    {query.data && query.data.totalPages > 1 && <nav className="pagination" aria-label="Records pages"><RoundButton icon="turn_left" aria-label="Previous" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} /><span>Page {page} of {query.data.totalPages}</span><RoundButton icon="turn_right" aria-label="Next" disabled={page >= query.data.totalPages} onClick={() => setPage((value) => value + 1)} /></nav>}
    {query.isFetching && !query.isPending && <small role="status">Updating…</small>}
    <div className="actions"><Button onClick={onClose}>Main Menu</Button></div>
  </section>;
}

function RecordRow({ match, position, history }: { readonly match: MatchRecord; readonly position: number; readonly history: boolean }) {
  return <TableRow><TableCell>{history ? new Date(match.completedAt).toLocaleDateString('en-GB') : position}</TableCell><TableCell>{match.playerName}</TableCell><TableCell>{match.score}</TableCell><TableCell>{Math.round(match.durationSeconds)}s</TableCell><TableCell>{match.endReason === 'time-expired' ? 'Time' : 'Destroyed'}</TableCell></TableRow>;
}
