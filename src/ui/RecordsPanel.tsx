import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { MatchRecord } from '../api/contracts';
import { getMatchHistory, getRanking } from '../api/matches';

export type RecordsTab = 'ranking' | 'history';

export function RecordsPanel({ tab, playerId, onClose }: { readonly tab: RecordsTab; readonly playerId: string; readonly onClose: () => void }) {
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: tab === 'ranking' ? ['ranking', page] : ['history', playerId, page], queryFn: () => tab === 'ranking' ? getRanking(page) : getMatchHistory(playerId, page) });
  return <section className="records-panel" aria-labelledby="records-title">
    <div className="records-heading"><h2 id="records-title">{tab === 'ranking' ? 'Ranking' : 'Match History'}</h2><button type="button" className="close-button" onClick={onClose} aria-label="Close records">×</button></div>
    {query.isPending && <p role="status">Loading records…</p>}
    {query.isError && <div className="error-state"><p>Could not load records.</p><button type="button" onClick={() => void query.refetch()}>Try Again</button></div>}
    {query.data?.items.length === 0 && <p className="empty-state">No matches yet. Finish a battle to appear here.</p>}
    {query.data && query.data.items.length > 0 && <div className="records-table-wrap"><table><thead><tr><th>{tab === 'ranking' ? '#' : 'Date'}</th><th>Captain</th><th>Score</th><th>Duration</th><th>Result</th></tr></thead><tbody>{query.data.items.map((match, index) => <RecordRow key={match.id} match={match} position={(page - 1) * query.data.pageSize + index + 1} history={tab === 'history'} />)}</tbody></table></div>}
    {query.data && query.data.totalPages > 1 && <nav className="pagination" aria-label="Records pages"><button type="button" className="secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page} of {query.data.totalPages}</span><button type="button" className="secondary" disabled={page >= query.data.totalPages} onClick={() => setPage((value) => value + 1)}>Next</button></nav>}
    {query.isFetching && !query.isPending && <small role="status">Updating…</small>}
  </section>;
}

function RecordRow({ match, position, history }: { readonly match: MatchRecord; readonly position: number; readonly history: boolean }) {
  return <tr><td>{history ? new Date(match.completedAt).toLocaleDateString('en-GB') : position}</td><td>{match.playerName}</td><td>{match.score}</td><td>{Math.round(match.durationSeconds)}s</td><td>{match.endReason === 'time-expired' ? 'Time' : 'Destroyed'}</td></tr>;
}
