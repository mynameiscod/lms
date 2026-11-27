import React, { useCallback, useEffect, useState } from 'react';
import { leadPipelineApi } from '../../api';

/**
 * Edit one option list (call outcomes or follow-up reasons). Built-in options can be renamed
 * or switched off but not deleted; the stored code never changes, so history stays readable.
 */
interface Item {
  _id: string; code: string; label: string; order: number; isActive: boolean; isSystem: boolean;
  countsAsConnected?: boolean; retryHours?: number;
}

const PicklistEditor: React.FC<{ list: 'call_outcome' | 'followup_reason'; title: string; hint: string; onError: (m: string) => void }> = ({ list, title, hint, onError }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const isCalls = list === 'call_outcome';

  const load = useCallback(async () => {
    try {
      const res: any = await leadPipelineApi.getPicklist(list);
      setItems(res.data || []);
    } catch (e: any) { onError(e.message || 'Could not load the list'); }
  }, [list, onError]);
  useEffect(() => { load(); }, [load]);

  const run = async (fn: () => Promise<any>) => {
    setBusy(true);
    try { await fn(); await load(); } catch (e: any) { onError(e.message || 'Something went wrong'); } finally { setBusy(false); }
  };

  const patch = (it: Item, data: Partial<Item>) => run(() => leadPipelineApi.updatePicklistItem(it._id, data));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir; if (j < 0 || j >= items.length) return;
    const ids = items.map(x => x._id); [ids[i], ids[j]] = [ids[j], ids[i]];
    run(() => leadPipelineApi.reorderPicklist(list, ids));
  };
  const add = () => {
    const label = newLabel.trim(); if (!label) return;
    run(async () => { await leadPipelineApi.createPicklistItem(list, { label }); setNewLabel(''); });
  };

  return (
    <section className="pl-col">
      <div className="pl-col-head"><h2>{title}</h2><span className="pl-count">{items.length}</span></div>
      <p className="pl-hint">{hint}</p>
      <ul className="pl-list">
        {items.map((it, i) => (
          <li key={it._id} className={`pl-row${it.isActive ? '' : ' off'}`}>
            <div className="pl-move">
              <button aria-label="Move up" disabled={i === 0 || busy} onClick={() => move(i, -1)}>▲</button>
              <button aria-label="Move down" disabled={i === items.length - 1 || busy} onClick={() => move(i, 1)}>▼</button>
            </div>
            <div className="pl-row-main">
              <input className="form-control form-control-sm pl-inline-input" defaultValue={it.label} maxLength={80}
                onBlur={e => { const v = e.target.value.trim(); if (v && v !== it.label) patch(it, { label: v }); }} aria-label="Label" />
              <div className="pl-row-meta">
                {it.isSystem && <span className="pl-tag">Built-in</span>}
                {isCalls && (
                  <>
                    <label className="pl-mini"><input type="checkbox" checked={!!it.countsAsConnected} disabled={busy} onChange={e => patch(it, { countsAsConnected: e.target.checked })} /> Reached the person</label>
                    <label className="pl-mini">Retry after
                      <input type="number" min={0} max={720} className="form-control form-control-sm pl-num" defaultValue={it.retryHours || 0}
                        onBlur={e => { const n = Number(e.target.value); if (n !== (it.retryHours || 0)) patch(it, { retryHours: n }); }} /> h
                    </label>
                  </>
                )}
              </div>
            </div>
            <div className="pl-row-actions d-flex align-items-center gap-1">
              <label className="pl-mini"><input type="checkbox" checked={it.isActive} disabled={busy} onChange={e => patch(it, { isActive: e.target.checked })} /> On</label>
              {!it.isSystem && (
                <button className="btn btn-link btn-sm text-danger" disabled={busy}
                  onClick={() => window.confirm(`Delete "${it.label}"?`) && run(() => leadPipelineApi.deletePicklistItem(it._id))}>Delete</button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="d-flex gap-2 mt-2">
        <input className="form-control form-control-sm" placeholder={isCalls ? 'New outcome, e.g. Asked to WhatsApp' : 'New reason, e.g. Waiting for exam results'}
          value={newLabel} maxLength={80} onChange={e => setNewLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
        <button className="btn btn-outline-primary btn-sm" disabled={busy || !newLabel.trim()} onClick={add}>Add</button>
      </div>
    </section>
  );
};

export default PicklistEditor;
