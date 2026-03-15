import React, { useState, useEffect, useCallback } from 'react';
import { leadStageApi } from '../../api';
import './LeadStages.css';

interface Stage {
  _id: string;
  name: string;
  color: string;
  order: number;
  isDefault: boolean;
}

const LeadStages: React.FC = () => {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [formData, setFormData] = useState({ name: '', color: '#005897' });

  const loadStages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await leadStageApi.getStages();
      setStages(res.data || []);
    } catch (error: any) {
      // If no stages exist, show empty state
      setStages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStages();
  }, [loadStages]);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  };

  const handleInitializeDefaults = async () => {
    try {
      await leadStageApi.initializeDefaults();
      showAlert('success', 'Default stages created successfully');
      loadStages();
    } catch (error: any) {
      showAlert('error', error.message || 'Failed to initialize stages');
    }
  };

  const handleOpenCreate = () => {
    setEditingStage(null);
    setFormData({ name: '', color: '#005897' });
    setShowModal(true);
  };

  const handleOpenEdit = (stage: Stage) => {
    setEditingStage(stage);
    setFormData({ name: stage.name, color: stage.color });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showAlert('error', 'Stage name is required');
      return;
    }
    try {
      if (editingStage) {
        await leadStageApi.updateStage(editingStage._id, formData);
        showAlert('success', 'Stage updated');
      } else {
        await leadStageApi.createStage(formData);
        showAlert('success', 'Stage created');
      }
      setShowModal(false);
      loadStages();
    } catch (error: any) {
      showAlert('error', error.message || 'Failed to save stage');
    }
  };

  const handleDelete = async (stage: Stage) => {
    if (!window.confirm(`Delete stage "${stage.name}"? Leads in this stage must be moved first.`)) return;
    try {
      await leadStageApi.deleteStage(stage._id);
      showAlert('success', 'Stage deleted');
      loadStages();
    } catch (error: any) {
      showAlert('error', error.message || 'Failed to delete stage');
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const newStages = [...stages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newStages[index], newStages[targetIndex]] = [newStages[targetIndex], newStages[index]];
    setStages(newStages);

    try {
      await leadStageApi.reorderStages(newStages.map(s => s._id));
    } catch (error: any) {
      showAlert('error', 'Failed to reorder stages');
      loadStages();
    }
  };

  if (loading) {
    return <div className="lead-stages-page"><div className="loading-spinner">Loading stages...</div></div>;
  }

  return (
    <div className="lead-stages-page">
      <h1>Lead Lifecycle Stages</h1>
      <p className="page-desc">Customize the stages that leads move through in your pipeline. Drag to reorder.</p>

      {alert && <div className={`alert alert-${alert.type}`}>{alert.message}</div>}

      {stages.length === 0 ? (
        <div className="empty-state">
          <h3>No stages configured</h3>
          <p>Set up your lead lifecycle by creating stages or initializing with defaults.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn-primary" onClick={handleInitializeDefaults}>Initialize Default Stages</button>
            <button className="btn-secondary" onClick={handleOpenCreate}>Create Custom Stage</button>
          </div>
        </div>
      ) : (
        <>
          <div className="stages-actions">
            <button className="btn-secondary" onClick={handleOpenCreate}>+ Add Stage</button>
          </div>

          <div className="stages-list">
            {stages.map((stage, index) => (
              <div key={stage._id} className="stage-item">
                <div className="move-btns">
                  <button disabled={index === 0} onClick={() => handleMove(index, 'up')}>▲</button>
                  <button disabled={index === stages.length - 1} onClick={() => handleMove(index, 'down')}>▼</button>
                </div>
                <span className="stage-order">#{index + 1}</span>
                <span className="stage-color-dot" style={{ backgroundColor: stage.color }} />
                <span className="stage-name">{stage.name}</span>
                {stage.isDefault && <span className="stage-badge">Default</span>}
                <div className="stage-actions">
                  <button onClick={() => handleOpenEdit(stage)}>Edit</button>
                  {!stage.isDefault && (
                    <button className="delete-btn" onClick={() => handleDelete(stage)}>Delete</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{editingStage ? 'Edit Stage' : 'Create Stage'}</h2>
            <div className="form-group">
              <label>Stage Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Demo Scheduled"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Color</label>
              <input
                type="color"
                value={formData.color}
                onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>
                {editingStage ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadStages;
