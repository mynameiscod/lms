import React, { useState, useEffect } from 'react';
import {
  getStageAnalytics,
  getBottleneckAnalysis,
  getStageVelocity,
  StageAnalyticsData,
  BottleneckData
} from '../../api/campaignAPI';
import './Marketing.css';

interface VelocityData {
  period: string;
  stages: Array<{
    stageId: string;
    stageName: string;
    transitions: number;
    avgDurationHours: number;
    medianDurationHours: number;
    transitionsPerDay: number;
  }>;
  summary: {
    totalTransitions: number;
    avgTransitionsPerDay: number;
  };
}

const StageAnalytics: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<StageAnalyticsData | null>(null);
  const [bottleneckData, setBottleneckData] = useState<BottleneckData | null>(null);
  const [velocityData, setVelocityData] = useState<VelocityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'funnel' | 'bottlenecks' | 'velocity'>('funnel');
  const [velocityDays, setVelocityDays] = useState(30);

  useEffect(() => {
    fetchData();
  }, [velocityDays]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [analytics, bottlenecks, velocity] = await Promise.all([
        getStageAnalytics(),
        getBottleneckAnalysis(),
        getStageVelocity(velocityDays)
      ]);
      setAnalyticsData(analytics.data);
      setBottleneckData(bottlenecks.data);
      setVelocityData(velocity.data);
    } catch (error) {
      console.error('Error fetching stage analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    if (minutes < 60 * 24) return `${Math.round(minutes / 60 * 10) / 10} hrs`;
    return `${Math.round(minutes / (60 * 24) * 10) / 10} days`;
  };

  const getConversionColor = (rate: number) => {
    if (rate >= 80) return '#10b981';
    if (rate >= 60) return '#3b82f6';
    if (rate >= 40) return '#f59e0b';
    return '#ef4444';
  };

  if (loading) {
    return <div className="marketing-loading">Loading stage analytics...</div>;
  }

  return (
    <div className="marketing-container">
      <div className="marketing-header">
        <h1>Lead Stage Analytics</h1>
        <p className="subtitle">Track lead progression and identify bottlenecks</p>
      </div>

      {/* Tabs */}
      <div className="analytics-tabs">
        <button 
          className={`tab-btn ${activeTab === 'funnel' ? 'active' : ''}`}
          onClick={() => setActiveTab('funnel')}
        >
          📊 Stage Funnel
        </button>
        <button 
          className={`tab-btn ${activeTab === 'bottlenecks' ? 'active' : ''}`}
          onClick={() => setActiveTab('bottlenecks')}
        >
          ⚠️ Bottlenecks
        </button>
        <button 
          className={`tab-btn ${activeTab === 'velocity' ? 'active' : ''}`}
          onClick={() => setActiveTab('velocity')}
        >
          🚀 Velocity
        </button>
      </div>

      {/* Funnel View */}
      {activeTab === 'funnel' && analyticsData && (
        <div className="funnel-container">
          {/* Summary Cards */}
          <div className="funnel-summary">
            <div className="summary-card">
              <span className="summary-label">Total Stages</span>
              <span className="summary-value">{analyticsData.summary.totalStages}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Total Transitions</span>
              <span className="summary-value">{analyticsData.summary.totalTransitions}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Avg Lifecycle</span>
              <span className="summary-value">{formatDuration(analyticsData.summary.averageLifecycleMinutes)}</span>
            </div>
          </div>

          {/* Funnel Chart */}
          <div className="funnel-chart">
            {analyticsData.stages.map((stage, index) => {
              const maxLeads = Math.max(...analyticsData!.stages.map(s => s.stats.totalLeads));
              const width = maxLeads > 0 ? (stage.stats.totalLeads / maxLeads) * 100 : 0;
              
              return (
                <div key={stage.stageId} className="funnel-stage">
                  <div className="stage-info">
                    <div 
                      className="stage-color-dot" 
                      style={{ backgroundColor: stage.color }}
                    />
                    <span className="stage-name">{stage.stageName}</span>
                    <span className="stage-leads">{stage.stats.totalLeads} leads</span>
                  </div>
                  <div className="stage-bar-container">
                    <div 
                      className="stage-bar"
                      style={{ 
                        width: `${Math.max(width, 5)}%`,
                        backgroundColor: stage.color
                      }}
                    >
                      <span className="stage-active">{stage.stats.activeLeads} active</span>
                    </div>
                  </div>
                  <div className="stage-metrics">
                    <span className="metric">
                      Avg Time: <strong>{formatDuration(stage.stats.avgDurationMinutes)}</strong>
                    </span>
                    {index > 0 && (
                      <span 
                        className="metric conversion-rate"
                        style={{ color: getConversionColor(stage.conversionRate) }}
                      >
                        Conversion: <strong>{stage.conversionRate}%</strong>
                      </span>
                    )}
                  </div>
                  {index < analyticsData!.stages.length - 1 && (
                    <div className="funnel-arrow">↓</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottlenecks View */}
      {activeTab === 'bottlenecks' && bottleneckData && (
        <div className="bottlenecks-container">
          <div className="bottleneck-summary">
            <div className="summary-card warning">
              <span className="summary-label">Total Stuck Leads</span>
              <span className="summary-value">{bottleneckData.summary.totalStuckLeads}</span>
            </div>
            {bottleneckData.summary.worstBottleneck && (
              <div className="summary-card danger">
                <span className="summary-label">Worst Bottleneck</span>
                <span className="summary-value">{bottleneckData.summary.worstBottleneck.stageName}</span>
                <span className="summary-sub">{bottleneckData.summary.worstBottleneck.stuckLeads} leads stuck</span>
              </div>
            )}
          </div>

          {bottleneckData.bottlenecks.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">✅</span>
              <p>No bottlenecks detected! All leads are progressing smoothly.</p>
            </div>
          ) : (
            <div className="bottleneck-list">
              {bottleneckData.bottlenecks.map((bottleneck) => (
                <div key={bottleneck.stageId} className="bottleneck-card">
                  <div className="bottleneck-header">
                    <h3>{bottleneck.stageName}</h3>
                    <span className="stuck-badge">{bottleneck.stuckLeads} stuck</span>
                  </div>
                  <div className="bottleneck-stats">
                    <span>Avg Stuck: <strong>{bottleneck.avgStuckHours} hrs</strong> ({bottleneck.avgStuckDays} days)</span>
                    <span>Max Stuck: <strong>{bottleneck.maxStuckHours} hrs</strong></span>
                  </div>
                  {bottleneck.topStuckLeads.length > 0 && (
                    <div className="stuck-leads-list">
                      <h4>Most Stuck Leads:</h4>
                      <table className="stuck-leads-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Stuck For</th>
                            <th>Assigned To</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bottleneck.topStuckLeads.map((lead) => (
                            <tr key={lead._id}>
                              <td>{lead.name}</td>
                              <td>{lead.phone}</td>
                              <td className="stuck-duration">
                                {lead.stuckDays > 1 ? `${lead.stuckDays} days` : `${lead.stuckHours} hrs`}
                              </td>
                              <td>
                                {lead.assignedTo 
                                  ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`
                                  : 'Unassigned'
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Velocity View */}
      {activeTab === 'velocity' && velocityData && (
        <div className="velocity-container">
          <div className="velocity-header">
            <div className="velocity-period">
              <label>Period:</label>
              <select value={velocityDays} onChange={(e) => setVelocityDays(Number(e.target.value))}>
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
                <option value={60}>Last 60 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </div>
          </div>

          <div className="velocity-summary">
            <div className="summary-card">
              <span className="summary-label">Total Transitions</span>
              <span className="summary-value">{velocityData.summary.totalTransitions}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Avg Transitions/Day</span>
              <span className="summary-value">{velocityData.summary.avgTransitionsPerDay}</span>
            </div>
          </div>

          <div className="velocity-table-container">
            <table className="velocity-table">
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>Transitions</th>
                  <th>Avg Duration</th>
                  <th>Median Duration</th>
                  <th>Transitions/Day</th>
                </tr>
              </thead>
              <tbody>
                {velocityData.stages.map((stage) => (
                  <tr key={stage.stageId}>
                    <td>{stage.stageName}</td>
                    <td>{stage.transitions}</td>
                    <td>{stage.avgDurationHours} hrs</td>
                    <td>{stage.medianDurationHours} hrs</td>
                    <td>{stage.transitionsPerDay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {velocityData.stages.length > 0 && (
            <div className="velocity-chart">
              <h4>Transitions by Stage</h4>
              <div className="bar-chart">
                {velocityData.stages.map((stage) => {
                  const maxTransitions = Math.max(...velocityData!.stages.map(s => s.transitions));
                  const width = maxTransitions > 0 ? (stage.transitions / maxTransitions) * 100 : 0;
                  
                  return (
                    <div key={stage.stageId} className="bar-row">
                      <span className="bar-label">{stage.stageName}</span>
                      <div className="bar-track">
                        <div 
                          className="bar-fill"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <span className="bar-value">{stage.transitions}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StageAnalytics;
