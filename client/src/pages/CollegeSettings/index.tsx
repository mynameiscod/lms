import React, { useEffect, useState } from 'react';
import { tenantApi } from '../../api';
import { useTenant } from '../../contexts/TenantContext';
import './CollegeSettingsPage.css';

/* ── types ─────────────────────────────────────────────────────────────────── */
interface BrandingForm {
  primaryColor: string;
  secondaryColor: string;
  portalTitle: string;
  welcomeMessage: string;
  faviconUrl: string;
  hideCodeBegunBranding: boolean;
}

interface CollegeInfoForm {
  universityName: string;
  collegeCode: string;
  collegeType: string;
  accreditation: string;
  establishedYear: string;
  totalStrength: string;
  city: string;
  state: string;
  pincode: string;
  placementOfficerEmail: string;
  placementOfficerPhone: string;
}

const defaultBranding: BrandingForm = {
  primaryColor: '#6650d8',
  secondaryColor: '#38bdf8',
  portalTitle: '',
  welcomeMessage: '',
  faviconUrl: '',
  hideCodeBegunBranding: false,
};

const defaultCollegeInfo: CollegeInfoForm = {
  universityName: '',
  collegeCode: '',
  collegeType: '',
  accreditation: '',
  establishedYear: '',
  totalStrength: '',
  city: '',
  state: '',
  pincode: '',
  placementOfficerEmail: '',
  placementOfficerPhone: '',
};

/* ── component ─────────────────────────────────────────────────────────────── */
const CollegeSettingsPage: React.FC = () => {
  const { tenant, setTenant } = useTenant();
  const [activeTab, setActiveTab] = useState<'branding' | 'info'>('branding');
  const [branding, setBranding] = useState<BrandingForm>(defaultBranding);
  const [collegeInfo, setCollegeInfo] = useState<CollegeInfoForm>(defaultCollegeInfo);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  /* ── load ─────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const tenantId = localStorage.getItem('tenantId');
    if (!tenantId) { setLoading(false); return; }

    tenantApi.getTenant(tenantId)
      .then((res: any) => {
        const t = res.data || res;
        // Populate branding
        if (t.branding) {
          setBranding({
            primaryColor: t.branding.primaryColor || '#6650d8',
            secondaryColor: t.branding.secondaryColor || '#38bdf8',
            portalTitle: t.branding.portalTitle || '',
            welcomeMessage: t.branding.welcomeMessage || '',
            faviconUrl: t.branding.faviconUrl || '',
            hideCodeBegunBranding: !!t.branding.hideCodeBegunBranding,
          });
        }
        // Populate college info
        if (t.collegeInfo) {
          const ci = t.collegeInfo;
          setCollegeInfo({
            universityName: ci.universityName || '',
            collegeCode: ci.collegeCode || '',
            collegeType: ci.collegeType || '',
            accreditation: ci.accreditation || '',
            establishedYear: ci.establishedYear ? String(ci.establishedYear) : '',
            totalStrength: ci.totalStrength ? String(ci.totalStrength) : '',
            city: ci.address?.city || '',
            state: ci.address?.state || '',
            pincode: ci.address?.pincode || '',
            placementOfficerEmail: ci.placementOfficerEmail || '',
            placementOfficerPhone: ci.placementOfficerPhone || '',
          });
        }
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  /* ── save branding ─────────────────────────────────────────────────────────── */
  const saveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    const tenantId = localStorage.getItem('tenantId');
    if (!tenantId) return;
    try {
      setSaving(true); setError(''); setSuccess('');
      const res = await tenantApi.updateTenant(tenantId, { branding });
      const updated = res.data || res;
      // Propagate new branding to TenantContext so CSS vars update live
      if (tenant) setTenant({ ...tenant, branding: updated.branding });
      setSuccess('Branding saved. Colors applied live!');
    } catch (e: any) {
      setError(e.message || 'Failed to save branding');
    } finally {
      setSaving(false);
    }
  };

  /* ── save college info ─────────────────────────────────────────────────────── */
  const saveCollegeInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    const tenantId = localStorage.getItem('tenantId');
    if (!tenantId) return;
    try {
      setSaving(true); setError(''); setSuccess('');
      const payload = {
        collegeInfo: {
          universityName: collegeInfo.universityName,
          collegeCode: collegeInfo.collegeCode,
          collegeType: collegeInfo.collegeType || undefined,
          accreditation: collegeInfo.accreditation,
          establishedYear: collegeInfo.establishedYear ? Number(collegeInfo.establishedYear) : undefined,
          totalStrength: collegeInfo.totalStrength ? Number(collegeInfo.totalStrength) : undefined,
          address: {
            city: collegeInfo.city,
            state: collegeInfo.state,
            pincode: collegeInfo.pincode,
          },
          placementOfficerEmail: collegeInfo.placementOfficerEmail,
          placementOfficerPhone: collegeInfo.placementOfficerPhone,
        }
      };
      await tenantApi.updateTenant(tenantId, payload);
      setSuccess('College information saved.');
    } catch (e: any) {
      setError(e.message || 'Failed to save college info');
    } finally {
      setSaving(false);
    }
  };

  /* ── render ────────────────────────────────────────────────────────────────── */
  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
  }

  return (
    <div className="cs-page container-fluid py-4">
      <div className="mb-4">
        <h4 className="fw-bold mb-0">College Settings</h4>
        <p className="text-muted small mb-0">Configure branding and college information</p>
      </div>

      {error   && <div className="alert alert-danger alert-dismissible">{error}<button className="btn-close" onClick={() => setError('')} /></div>}
      {success && <div className="alert alert-success alert-dismissible">{success}<button className="btn-close" onClick={() => setSuccess('')} /></div>}

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'branding' ? 'active' : ''}`}
            onClick={() => setActiveTab('branding')}
          >
            <i className="bi bi-palette me-1" />Branding
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            <i className="bi bi-building me-1" />College Info
          </button>
        </li>
      </ul>

      {/* ── BRANDING TAB ──────────────────────────────────────────────────── */}
      {activeTab === 'branding' && (
        <div className="row g-4">
          <div className="col-lg-7">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <form onSubmit={saveBranding}>
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-medium">Primary Colour</label>
                      <div className="input-group">
                        <input
                          type="color"
                          className="form-control form-control-color"
                          value={branding.primaryColor}
                          onChange={e => setBranding({ ...branding, primaryColor: e.target.value })}
                        />
                        <input
                          type="text"
                          className="form-control font-monospace"
                          value={branding.primaryColor}
                          onChange={e => setBranding({ ...branding, primaryColor: e.target.value })}
                          maxLength={7}
                        />
                      </div>
                      <div className="form-text">Used for buttons, badges, nav accents</div>
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-medium">Secondary Colour</label>
                      <div className="input-group">
                        <input
                          type="color"
                          className="form-control form-control-color"
                          value={branding.secondaryColor}
                          onChange={e => setBranding({ ...branding, secondaryColor: e.target.value })}
                        />
                        <input
                          type="text"
                          className="form-control font-monospace"
                          value={branding.secondaryColor}
                          onChange={e => setBranding({ ...branding, secondaryColor: e.target.value })}
                          maxLength={7}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-medium">Portal Title</label>
                    <input
                      className="form-control"
                      placeholder="e.g. St. Mary's Learning Portal"
                      value={branding.portalTitle}
                      onChange={e => setBranding({ ...branding, portalTitle: e.target.value })}
                    />
                    <div className="form-text">Shown in the browser tab and navigation header</div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-medium">Welcome Message</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="Shown on the student login screen"
                      value={branding.welcomeMessage}
                      onChange={e => setBranding({ ...branding, welcomeMessage: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-medium">Favicon URL</label>
                    <input
                      className="form-control"
                      placeholder="https://..."
                      value={branding.faviconUrl}
                      onChange={e => setBranding({ ...branding, faviconUrl: e.target.value })}
                    />
                  </div>

                  <div className="mb-4">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="hideCB"
                        checked={branding.hideCodeBegunBranding}
                        onChange={e => setBranding({ ...branding, hideCodeBegunBranding: e.target.checked })}
                      />
                      <label className="form-check-label" htmlFor="hideCB">
                        Hide "Powered by CodeBegun" branding
                      </label>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><span className="spinner-border spinner-border-sm me-1" />Saving...</> : 'Save Branding'}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div className="col-lg-5">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white fw-semibold border-bottom">Live Preview</div>
              <div className="card-body">
                <div className="cs-preview-bar mb-3" style={{ background: branding.primaryColor }}>
                  <span className="cs-preview-logo">
                    {branding.portalTitle || 'College LMS'}
                  </span>
                </div>
                <button className="btn me-2 mb-2" style={{ background: branding.primaryColor, color: '#fff', border: 'none' }}>
                  Primary Button
                </button>
                <button className="btn mb-2" style={{ background: branding.secondaryColor, color: '#fff', border: 'none' }}>
                  Secondary Button
                </button>
                <div className="cs-preview-welcome mt-2 p-3 rounded" style={{ borderLeft: `4px solid ${branding.primaryColor}`, background: '#f8f9fa' }}>
                  <small className="text-muted">Welcome message:</small>
                  <p className="mb-0 small mt-1">{branding.welcomeMessage || 'Welcome to your learning portal!'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── COLLEGE INFO TAB ──────────────────────────────────────────────── */}
      {activeTab === 'info' && (
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <form onSubmit={saveCollegeInfo}>
              <div className="row g-3">
                <div className="col-md-8">
                  <label className="form-label fw-medium">University / Affiliated To</label>
                  <input className="form-control" placeholder="e.g. Anna University" value={collegeInfo.universityName} onChange={e => setCollegeInfo({ ...collegeInfo, universityName: e.target.value })} />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-medium">College Code</label>
                  <input className="form-control" placeholder="e.g. 1234" value={collegeInfo.collegeCode} onChange={e => setCollegeInfo({ ...collegeInfo, collegeCode: e.target.value })} />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-medium">College Type</label>
                  <select className="form-select" value={collegeInfo.collegeType} onChange={e => setCollegeInfo({ ...collegeInfo, collegeType: e.target.value })}>
                    <option value="">Select type</option>
                    <option value="engineering">Engineering</option>
                    <option value="arts">Arts & Science</option>
                    <option value="polytechnic">Polytechnic</option>
                    <option value="management">Management</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-medium">Accreditation</label>
                  <input className="form-control" placeholder="e.g. NAAC-A+, NBA" value={collegeInfo.accreditation} onChange={e => setCollegeInfo({ ...collegeInfo, accreditation: e.target.value })} />
                </div>
                <div className="col-md-2">
                  <label className="form-label fw-medium">Est. Year</label>
                  <input className="form-control" type="number" placeholder="e.g. 1998" min={1800} max={2030} value={collegeInfo.establishedYear} onChange={e => setCollegeInfo({ ...collegeInfo, establishedYear: e.target.value })} />
                </div>
                <div className="col-md-2">
                  <label className="form-label fw-medium">Total Strength</label>
                  <input className="form-control" type="number" placeholder="e.g. 2400" value={collegeInfo.totalStrength} onChange={e => setCollegeInfo({ ...collegeInfo, totalStrength: e.target.value })} />
                </div>

                <div className="col-12"><hr className="my-1" /><p className="fw-medium mb-0">Address</p></div>
                <div className="col-md-4">
                  <label className="form-label">City</label>
                  <input className="form-control" placeholder="Chennai" value={collegeInfo.city} onChange={e => setCollegeInfo({ ...collegeInfo, city: e.target.value })} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">State</label>
                  <input className="form-control" placeholder="Tamil Nadu" value={collegeInfo.state} onChange={e => setCollegeInfo({ ...collegeInfo, state: e.target.value })} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Pincode</label>
                  <input className="form-control" placeholder="600001" value={collegeInfo.pincode} onChange={e => setCollegeInfo({ ...collegeInfo, pincode: e.target.value })} />
                </div>

                <div className="col-12"><hr className="my-1" /><p className="fw-medium mb-0">Placement Officer</p></div>
                <div className="col-md-6">
                  <label className="form-label">Email</label>
                  <input className="form-control" type="email" placeholder="placement@college.edu" value={collegeInfo.placementOfficerEmail} onChange={e => setCollegeInfo({ ...collegeInfo, placementOfficerEmail: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Phone</label>
                  <input className="form-control" placeholder="+91 98765 43210" value={collegeInfo.placementOfficerPhone} onChange={e => setCollegeInfo({ ...collegeInfo, placementOfficerPhone: e.target.value })} />
                </div>
              </div>

              <div className="mt-4">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner-border spinner-border-sm me-1" />Saving...</> : 'Save College Info'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollegeSettingsPage;
