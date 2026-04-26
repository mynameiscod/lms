import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { leadApi, leadStageApi } from '../../api';

interface KanbanLead {
  _id: string;
  name: string;
  phone: string;
  priority: 'hot' | 'warm' | 'cold';
  stageId: string;
  assignedTo?: { firstName: string; lastName: string };
  updatedAt: string;
}

interface KanbanStage {
  _id: string;
  name: string;
  color?: string;
  order: number;
}

const PRIORITY_COLORS: Record<string, string> = {
  hot: '#e53935',
  warm: '#fb8c00',
  cold: '#1565c0',
};

export default function LeadKanbanPage() {
  const navigate = useNavigate();
  const [stages, setStages] = useState<KanbanStage[]>([]);
  const [leadsByStage, setLeadsByStage] = useState<Record<string, KanbanLead[]>>({});
  const [loading, setLoading] = useState(false);
  const [moving, setMoving] = useState(false);

  // Drag state stored in ref to avoid re-renders during drag
  const dragRef = useRef<{ leadId: string; fromStageId: string } | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch stages
      const [stagesRes, leadsRes] = await Promise.all([
        leadStageApi.getStages(),
        leadApi.getLeads({ limit: 500 }),
      ]);

      const stageArr: KanbanStage[] = (stagesRes?.data || stagesRes || []).sort(
        (a: KanbanStage, b: KanbanStage) => a.order - b.order
      );
      setStages(stageArr);

      const leadsData = leadsRes?.data || leadsRes;
      const leadsArr: KanbanLead[] = Array.isArray(leadsData) ? leadsData : leadsData?.leads || [];

      const grouped: Record<string, KanbanLead[]> = {};
      stageArr.forEach(s => { grouped[s._id] = []; });
      leadsArr.forEach(l => {
        const sid = typeof l.stageId === 'object' ? (l.stageId as any)._id || l.stageId : l.stageId;
        if (grouped[sid]) grouped[sid].push(l);
      });
      setLeadsByStage(grouped);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Drag handlers ──────────────────────────────────────
  const handleDragStart = (leadId: string, fromStageId: string) => {
    dragRef.current = { leadId, fromStageId };
  };

  const handleDrop = async (toStageId: string) => {
    setDragOver(null);
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.fromStageId === toStageId) return;

    const { leadId, fromStageId } = drag;

    // Optimistic update
    setLeadsByStage(prev => {
      const fromLeads = prev[fromStageId] || [];
      const movedLead = fromLeads.find(l => l._id === leadId);
      if (!movedLead) return prev;
      return {
        ...prev,
        [fromStageId]: fromLeads.filter(l => l._id !== leadId),
        [toStageId]: [...(prev[toStageId] || []), { ...movedLead, stageId: toStageId }],
      };
    });

    setMoving(true);
    try {
      await leadApi.changeStage(leadId, toStageId);
    } catch (e) {
      console.error('Stage change failed:', e);
      // Revert
      await load();
    } finally {
      setMoving(false);
    }
  };

  return (
    <div className="container-fluid py-4 h-100">
      {/* Header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <div>
          <h4 className="mb-0 fw-bold">
            <i className="fas fa-th-large me-2 text-primary" />
            Lead Kanban Board
          </h4>
          <small className="text-muted">Drag and drop leads between stages</small>
        </div>
        <div className="ms-auto d-flex gap-2 align-items-center">
          {moving && <span className="text-muted small"><span className="spinner-border spinner-border-sm me-1" />Saving…</span>}
          <button className="btn btn-outline-secondary btn-sm" onClick={load} disabled={loading}>
            <i className="fas fa-sync-alt me-1" />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5 text-muted">
          <div className="spinner-border mb-3" />
          <div>Loading board…</div>
        </div>
      ) : (
        <div
          className="d-flex gap-3 pb-3"
          style={{ overflowX: 'auto', minHeight: 'calc(100vh - 200px)' }}
        >
          {stages.map(stage => {
            const stageLeads = leadsByStage[stage._id] || [];
            const isOver = dragOver === stage._id;
            return (
              <div
                key={stage._id}
                style={{ minWidth: 260, maxWidth: 300, flex: '0 0 260px' }}
                onDragOver={e => { e.preventDefault(); setDragOver(stage._id); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDrop(stage._id)}
              >
                {/* Stage header */}
                <div
                  className="rounded-top px-3 py-2 d-flex align-items-center"
                  style={{ background: stage.color || '#1565c0', color: '#fff' }}
                >
                  <span className="fw-semibold small text-uppercase letter-spacing-1">{stage.name}</span>
                  <span className="ms-auto badge bg-white bg-opacity-25 text-white">{stageLeads.length}</span>
                </div>

                {/* Drop zone */}
                <div
                  className="rounded-bottom p-2"
                  style={{
                    minHeight: 400,
                    background: isOver ? '#e3f2fd' : '#f8f9fa',
                    border: isOver ? '2px dashed #1565c0' : '2px dashed transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  {stageLeads.map(lead => (
                    <div
                      key={lead._id}
                      draggable
                      onDragStart={() => handleDragStart(lead._id, stage._id)}
                      className="card border-0 shadow-sm mb-2"
                      style={{ cursor: 'grab', userSelect: 'none' }}
                    >
                      <div className="card-body p-2">
                        <div className="d-flex align-items-start gap-2">
                          <span
                            className="rounded-circle flex-shrink-0"
                            style={{
                              width: 8,
                              height: 8,
                              marginTop: 6,
                              background: PRIORITY_COLORS[lead.priority] || '#6c757d',
                            }}
                          />
                          <div className="flex-grow-1 min-w-0">
                            <div
                              className="fw-semibold small text-truncate"
                              style={{ maxWidth: 200, cursor: 'pointer' }}
                              onClick={() => navigate(`/leads/${lead._id}`)}
                            >
                              {lead.name}
                            </div>
                            <div className="text-muted" style={{ fontSize: 11 }}>{lead.phone}</div>
                            {lead.assignedTo && (
                              <div className="text-muted" style={{ fontSize: 10 }}>
                                <i className="fas fa-user me-1" />
                                {lead.assignedTo.firstName} {lead.assignedTo.lastName}
                              </div>
                            )}
                          </div>
                          <span
                            className="badge"
                            style={{
                              fontSize: 9,
                              background: PRIORITY_COLORS[lead.priority] || '#6c757d',
                              color: '#fff',
                              flexShrink: 0,
                            }}
                          >
                            {lead.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {stageLeads.length === 0 && (
                    <div
                      className="text-center text-muted py-4"
                      style={{ fontSize: 12, pointerEvents: 'none' }}
                    >
                      <i className="fas fa-inbox d-block mb-1" />
                      Drop here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
