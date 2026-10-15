import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { tenantApi } from '../../api';
import {
  FEATURE_META, FEATURE_MODULE_MAP, GROUP_ORDER, STUDENT_FEATURE_KEYS, StudentFeatureKey,
  CAREERPILOT_FEATURE_META, CAREERPILOT_GROUP_ORDER, CAREERPILOT_FEATURE_KEYS, CareerPilotFeatureKey,
} from '../../config/studentFeatureCatalog';
import './StudentFeaturesPage.css';

/**
 * Student Feature Control. One page decides what each kind of student sees in their menu:
 *   LMS students        the students of your batches (the LMS menu)
 *   CareerPilot students the members of the CareerPilot product (their own menu)
 * Everything comes from the shared catalogue (config/studentFeatureCatalog), the same list the
 * per-batch screen uses, so a new menu item appears here and there together.
 */

type Audience = 'lms' | 'careerpilot';
type LmsState = Record<StudentFeatureKey, boolean>;
type CpState = Record<CareerPilotFeatureKey, boolean>;

const allOn = <K extends string>(keys: K[]) => Object.fromEntries(keys.map(k => [k, true])) as Record<K, boolean>;

const StudentFeaturesPage: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Audience>('lms');
  const [lms, setLms] = useState<LmsState>(allOn(STUDENT_FEATURE_KEYS));
  const [cp, setCp] = useState<CpState>(allOn(CAREERPILOT_FEATURE_KEYS));
  const [savedLms, setSavedLms] = useState<LmsState>(allOn(STUDENT_FEATURE_KEYS));
  const [savedCp, setSavedCp] = useState<CpState>(allOn(CAREERPILOT_FEATURE_KEYS));
  const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>({});
  const [modulesLoaded, setModulesLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    const load = async () => {
      if (!user?.tenantId) return;
      const [featRes, cpRes, tenantRes] = await Promise.allSettled([
        tenantApi.getStudentFeatures(user.tenantId),
        tenantApi.getCareerPilotFeatures(user.tenantId),
        tenantApi.getTenant(user.tenantId),
      ]);
      if (featRes.status === 'fulfilled' && featRes.value.success && featRes.value.data) {
        const v = { ...allOn(STUDENT_FEATURE_KEYS), ...featRes.value.data };
        setLms(v); setSavedLms(v);
      }
      if (cpRes.status === 'fulfilled' && cpRes.value.success && cpRes.value.data) {
        const v = { ...allOn(CAREERPILOT_FEATURE_KEYS), ...cpRes.value.data };
        setCp(v); setSavedCp(v);
      }
      if (tenantRes.status === 'fulfilled' && tenantRes.value.data) setEnabledModules(tenantRes.value.data.modules || {});
      setModulesLoaded(true);
      setLoading(false);
    };
    load();
  }, [user?.tenantId]);

  const isModuleLocked = (key: StudentFeatureKey): boolean => {
    if (isSuperAdmin) return false;
    const moduleKey = FEATURE_MODULE_MAP[key];
    return !!moduleKey && modulesLoaded && enabledModules[moduleKey] === false;
  };
  // CareerPilot as a whole can be switched off by the platform owner.
  const careerPilotOff = !isSuperAdmin && modulesLoaded && enabledModules.careerPilot === false;

  const lmsDirty = useMemo(() => STUDENT_FEATURE_KEYS.some(k => lms[k] !== savedLms[k]), [lms, savedLms]);
  const cpDirty = useMemo(() => CAREERPILOT_FEATURE_KEYS.some(k => cp[k] !== savedCp[k]), [cp, savedCp]);
  const dirty = tab === 'lms' ? lmsDirty : cpDirty;

  const toggleLms = (key: StudentFeatureKey) => { if (!isModuleLocked(key)) { setLms(p => ({ ...p, [key]: !p[key] })); setMessage(null); } };
  const toggleCp = (key: CareerPilotFeatureKey) => { setCp(p => ({ ...p, [key]: !p[key] })); setMessage(null); };

  const setAll = (on: boolean) => {
    setMessage(null);
    if (tab === 'lms') setLms(p => Object.fromEntries(STUDENT_FEATURE_KEYS.map(k => [k, isModuleLocked(k) ? p[k] : k === 'dashboard' ? true : on])) as LmsState);
    else setCp(Object.fromEntries(CAREERPILOT_FEATURE_KEYS.map(k => [k, on])) as CpState);
  };

  const save = async () => {
    if (!user?.tenantId) return;
    setSaving(true);
    try {
      if (tab === 'lms') { await tenantApi.updateStudentFeatures(user.tenantId, { ...lms }); setSavedLms(lms); }
      else { await tenantApi.updateCareerPilotFeatures(user.tenantId, { ...cp }); setSavedCp(cp); }
      setMessage({ kind: 'ok', text: tab === 'lms' ? 'LMS student menu saved. Students see it the next time their page loads.' : 'CareerPilot student menu saved. Members see it the next time their page loads.' });
    } catch {
      setMessage({ kind: 'err', text: 'Could not save. Check your connection and try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="sf-page"><div className="sf-loading">Loading feature settings...</div></div>;

  const lmsOn = STUDENT_FEATURE_KEYS.filter(k => lms[k]).length;
  const cpOn = CAREERPILOT_FEATURE_KEYS.filter(k => cp[k]).length;
  const lockedCount = FEATURE_META.filter(f => isModuleLocked(f.key)).length;

  return (
    <div className="sf-page">
      <div className="sf-header">
        <div className="sf-header-text">
          <h1>Student Feature Control</h1>
          <p>Choose which menu items each kind of student can see. Anything you switch off disappears from their menu and cannot be opened by typing its address.</p>
        </div>
        <div className="sf-header-badge">
          {tab === 'lms' ? `${lmsOn} of ${STUDENT_FEATURE_KEYS.length} visible` : `${cpOn} of ${CAREERPILOT_FEATURE_KEYS.length} visible`}
        </div>
      </div>

      <div className="sf-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'lms'} className={`sf-tab${tab === 'lms' ? ' on' : ''}`} onClick={() => { setTab('lms'); setMessage(null); }}>
          LMS students{lmsDirty && <span className="sf-dot" title="Unsaved changes" />}
        </button>
        <button role="tab" aria-selected={tab === 'careerpilot'} className={`sf-tab${tab === 'careerpilot' ? ' on' : ''}`} onClick={() => { setTab('careerpilot'); setMessage(null); }}>
          CareerPilot students{cpDirty && <span className="sf-dot" title="Unsaved changes" />}
        </button>
      </div>

      <p className="sf-audience">
        {tab === 'lms'
          ? 'The students of your batches. Per-batch switches (Batches → Modules) can hide more for one batch, never show more than this.'
          : 'Members of CareerPilot, the career product with its own menu. Home, My profile, My result and Share my card are always shown. Items still under membership show a padlock until the student pays; items you hide here are removed for everyone.'}
      </p>

      {tab === 'lms' && lockedCount > 0 && (
        <div className="sf-module-notice">
          <i className="fa-solid fa-lock me-2" />
          <strong>{lockedCount} feature{lockedCount > 1 ? 's are' : ' is'} locked</strong> because the platform module{lockedCount > 1 ? 's are' : ' is'} disabled by your Super Admin. Contact them to enable.
        </div>
      )}
      {tab === 'careerpilot' && careerPilotOff && (
        <div className="sf-module-notice">
          <i className="fa-solid fa-lock me-2" />
          <strong>CareerPilot is disabled for your institute</strong> by your Super Admin, so these switches have no effect until it is enabled.
        </div>
      )}

      <div className="sf-bulk">
        <button type="button" className="sf-link" onClick={() => setAll(true)}>Show all</button>
        <span>·</span>
        <button type="button" className="sf-link" onClick={() => setAll(false)}>Hide all</button>
        {tab === 'lms' && <span className="sf-hint">The Dashboard always stays on.</span>}
      </div>

      {tab === 'lms' && GROUP_ORDER.map((group) => {
        const items = FEATURE_META.filter((f) => f.group === group);
        if (items.length === 0) return null;
        return (
          <div key={group} className="sf-group">
            <h2 className="sf-group-title">{group === 'Daily Practice' ? '🔥 ' : ''}{group}</h2>
            <div className="sf-features-grid">
              {items.map(({ key, label, description, icon }) => {
                const locked = isModuleLocked(key);
                const on = lms[key] && !locked;
                return (
                  <div key={key} className={`sf-feature-card ${on ? 'enabled' : 'disabled'}${locked ? ' sf-locked' : ''}`}>
                    <div className="sf-feature-info">
                      <span className="sf-feature-icon">{icon}</span>
                      <div className="sf-feature-text">
                        <h3>{label} {locked && <span className="sf-lock-badge"><i className="fa-solid fa-lock" /> Module disabled</span>}</h3>
                        <p>{description}</p>
                      </div>
                    </div>
                    <label className={`sf-toggle${locked ? ' sf-toggle-disabled' : ''}`}>
                      <input type="checkbox" checked={on} onChange={() => toggleLms(key)} disabled={locked || key === 'dashboard'} aria-label={label} />
                      <span className="sf-toggle-slider"></span>
                      <span className="sf-toggle-label">{locked ? 'Locked' : on ? 'Visible' : 'Hidden'}</span>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {tab === 'careerpilot' && CAREERPILOT_GROUP_ORDER.map((group) => {
        const items = CAREERPILOT_FEATURE_META.filter((f) => f.group === group);
        return (
          <div key={group} className="sf-group">
            <h2 className="sf-group-title">{group}</h2>
            <div className="sf-features-grid">
              {items.map(({ key, label, description, icon }) => (
                <div key={key} className={`sf-feature-card ${cp[key] ? 'enabled' : 'disabled'}`}>
                  <div className="sf-feature-info">
                    <span className="sf-feature-icon">{icon}</span>
                    <div className="sf-feature-text"><h3>{label}</h3><p>{description}</p></div>
                  </div>
                  <label className="sf-toggle">
                    <input type="checkbox" checked={cp[key]} onChange={() => toggleCp(key)} aria-label={label} />
                    <span className="sf-toggle-slider"></span>
                    <span className="sf-toggle-label">{cp[key] ? 'Visible' : 'Hidden'}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="sf-actions">
        <button className="sf-save-btn" onClick={save} disabled={saving || !dirty}>
          {saving ? 'Saving...' : 'Save changes'}
        </button>
        {dirty && !saving && <span className="sf-hint">You have unsaved changes.</span>}
        {message && <span className={`sf-saved-msg${message.kind === 'err' ? ' sf-err' : ''}`}>{message.text}</span>}
      </div>
    </div>
  );
};

export default StudentFeaturesPage;
