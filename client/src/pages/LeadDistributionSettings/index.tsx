import React, { useState, useEffect } from 'react';
import { leadDistributionApi, userApi } from '../../api';
import './LeadDistributionSettings.css';

type Mode = 'round_robin' | 'weighted' | 'manual';

interface AgentWeight {
  userId: string;
  weight: number;
  maxLeadsPerDay: number;
}

interface Config {
  mode: Mode;
  enabled: boolean;
  eligibleRoles: string[];
  maxLeadsPerDayDefault: number;
  weights: AgentWeight[];
}

interface TeamUser {
  _id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role?: string;
}

const defaultConfig: Config = {
  mode: 'manual',
  enabled: false,
  eligibleRoles: [],
  maxLeadsPerDayDefault: 20,
  weights: [],
};

const LeadDistributionSettings: React.FC = () => {
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [cfgRes, usrRes] = await Promise.all([
          leadDistributionApi.get() as Promise<any>,
          userApi.getUsers() as Promise<any>,
        ]);
        if (cfgRes?.data) {
          setConfig({ ...defaultConfig, ...cfgRes.data });
        }
        const userList = Array.isArray(usrRes) ? usrRes : usrRes?.users ?? [];
        setUsers(userList);
      } catch {
        // use defaults
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const userName = (u: TeamUser) =>
    [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;

  const getAgentWeight = (userId: string): AgentWeight =>
    config.weights.find(w => w.userId === userId) || { userId, weight: 1, maxLeadsPerDay: config.maxLeadsPerDayDefault };

  const updateAgentWeight = (userId: string, field: keyof AgentWeight, value: number) => {
    setConfig(prev => {
      const existing = prev.weights.find(w => w.userId === userId);
      if (existing) {
        return { ...prev, weights: prev.weights.map(w => w.userId === userId ? { ...w, [field]: value } : w) };
      }
      return { ...prev, weights: [...prev.weights, { userId, weight: 1, maxLeadsPerDay: prev.maxLeadsPerDayDefault, [field]: value }] };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await leadDistributionApi.update(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="dist-settings"><div className="dist-loading">Loading…</div></div>;

  return (
    <div className="dist-settings">
      <div className="dist-header">
        <h1>Lead Auto-Distribution</h1>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={e => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
          />
          <span className="toggle-slider" />
          <span className="toggle-label">{config.enabled ? 'Enabled' : 'Disabled'}</span>
        </label>
      </div>

      {!config.enabled && (
        <div className="dist-disabled-notice">
          Auto-distribution is <strong>off</strong>. Enable it above to automatically assign incoming leads to team members.
        </div>
      )}

      {/* Mode selector */}
      <div className="dist-section">
        <h2>Distribution Mode</h2>
        <div className="mode-cards">
          {([
            { value: 'manual', label: 'Manual', desc: 'Leads are assigned manually by managers.' },
            { value: 'round_robin', label: 'Round Robin', desc: 'Leads are assigned evenly in a cycle.' },
            { value: 'weighted', label: 'Weighted', desc: 'Agents with higher weights get more leads.' },
          ] as { value: Mode; label: string; desc: string }[]).map(m => (
            <div
              key={m.value}
              className={`mode-card${config.mode === m.value ? ' active' : ''}`}
              onClick={() => setConfig(prev => ({ ...prev, mode: m.value }))}
            >
              <div className="mode-card-title">{m.label}</div>
              <div className="mode-card-desc">{m.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Default daily cap */}
      <div className="dist-section">
        <h2>Default Max Leads / Day</h2>
        <input
          type="number"
          min={1}
          value={config.maxLeadsPerDayDefault}
          onChange={e => setConfig(prev => ({ ...prev, maxLeadsPerDayDefault: +e.target.value }))}
          style={{ width: 100, padding: '6px 10px', border: '1px solid #e0e0e0', borderRadius: 6 }}
        />
        <p className="dist-hint">Maximum leads any agent can receive per day unless overridden below.</p>
      </div>

      {/* Per-agent config (visible when not manual) */}
      {config.mode !== 'manual' && users.length > 0 && (
        <div className="dist-section">
          <h2>Agent Configuration</h2>
          <table className="agent-table">
            <thead>
              <tr>
                <th>Agent</th>
                {config.mode === 'weighted' && <th>Weight</th>}
                <th>Daily Cap</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                const w = getAgentWeight(user._id);
                return (
                  <tr key={user._id}>
                    <td>{userName(user)}</td>
                    {config.mode === 'weighted' && (
                      <td>
                        <input
                          type="number"
                          min={0}
                          value={w.weight}
                          onChange={e => updateAgentWeight(user._id, 'weight', +e.target.value)}
                          style={{ width: 70 }}
                        />
                      </td>
                    )}
                    <td>
                      <input
                        type="number"
                        min={0}
                        value={w.maxLeadsPerDay}
                        onChange={e => updateAgentWeight(user._id, 'maxLeadsPerDay', +e.target.value)}
                        style={{ width: 70 }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {error && <div className="dist-error">{error}</div>}

      <div className="dist-footer">
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default LeadDistributionSettings;
