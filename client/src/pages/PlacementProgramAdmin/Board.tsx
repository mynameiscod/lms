import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { placementAdminApi, placementProgramApi, BoardCard, PLACEMENT_STAGES, recLabel, istTime, errMsg } from '../../api/placementProgramApi';

/**
 * Kanban — every candidate by stage. Drag a card to another column to move them; the move is
 * recorded in their timeline like any stage change. Withdrawn candidates are left off the board.
 */
const COLUMNS = PLACEMENT_STAGES.filter(([k]) => k !== 'withdrawn');

const feeChip = (c: BoardCard) =>
  c.fee?.waived ? ['Fee waived', 'muted'] : c.fee?.status === 'paid' ? ['Paid', 'ok'] : c.fee?.status === 'refunded' ? ['Refunded', 'muted'] : c.fee?.status === 'created' ? ['Paying…', 'warn'] : null;

const PlacementBoard: React.FC<{ onOpenCandidate: (id: string) => void }> = ({ onOpenCandidate }) => {
  const [cards, setCards] = useState<BoardCard[] | null>(null);
  const [search, setSearch] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback(() => { placementAdminApi.board().then(c => { setCards(c); setErr(''); }).catch(e => setErr(errMsg(e))); }, []);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (cards || []).filter(c => !q || [c.name, c.mobile, c.college, c.targetRole].some(v => String(v || '').toLowerCase().includes(q)));
  }, [cards, search]);

  const move = async (id: string, stage: string) => {
    const card = cards?.find(c => c._id === id);
    if (!card || card.stage === stage) return;
    // Optimistic: the card moves now; if the server refuses, the board reloads to the truth.
    setCards(cs => (cs || []).map(c => c._id === id ? { ...c, stage: stage as any } : c));
    try { await placementProgramApi.setStage(id, stage, 'Moved on the board'); }
    catch (e) { setErr(errMsg(e)); load(); }
  };

  return (
    <div>
      <div className="ppa-toolbar">
        <input className="ppa-board-search" placeholder="Filter the board by name, mobile, college or role" value={search} onChange={e => setSearch(e.target.value)} />
        <p className="ppa-note">Drag a card to another column to move the candidate.</p>
      </div>
      {err && <div className="ppa-err">{err}</div>}
      {!cards ? <div className="ppa-card">Loading…</div> : (
        <div className="ppa-board">
          {COLUMNS.map(([key, label]) => {
            const col = shown.filter(c => c.stage === key);
            return (
              <section key={key} className={`ppa-col${over === key ? ' over' : ''}`}
                onDragOver={e => { if (dragId) { e.preventDefault(); setOver(key); } }}
                onDragLeave={() => setOver(o => (o === key ? null : o))}
                onDrop={e => { e.preventDefault(); if (dragId) move(dragId, key); setDragId(null); setOver(null); }}>
                <header><span>{label}</span><b>{col.length}</b></header>
                <div className="ppa-col-body">
                  {col.map(c => {
                    const chip = feeChip(c);
                    return (
                      <article key={c._id} className={`ppa-kcard${dragId === c._id ? ' dragging' : ''}`} draggable
                        onDragStart={e => { setDragId(c._id); e.dataTransfer.effectAllowed = 'move'; }}
                        onDragEnd={() => { setDragId(null); setOver(null); }}
                        onClick={() => onOpenCandidate(c._id)}>
                        <div className="n">{c.name}</div>
                        <div className="m">{[c.targetRole, c.college].filter(Boolean).join(' · ') || `+91 ${c.mobile}`}</div>
                        <div className="chips">
                          {chip && <span className={`k ${chip[1]}`}>{chip[0]}</span>}
                          {c.interview?.score !== undefined && <span className="k">{c.interview.score}/5{c.interview.recommendation ? ` · ${recLabel(c.interview.recommendation)}` : ''}</span>}
                          {c.interview?.startsAt && c.stage === 'interview_booked' && <span className="k">{istTime(c.interview.startsAt)}</span>}
                        </div>
                      </article>
                    );
                  })}
                  {!col.length && <div className="ppa-col-empty">—</div>}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PlacementBoard;
