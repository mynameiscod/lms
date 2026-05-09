import React from 'react';

interface Social {
  hashtags?: string[];
  instagramHandle?: string;
  twitterHandle?: string;
  linkedinCompanyUrl?: string;
  shareMessage?: string;
}

interface Settings {
  showScore: boolean;
  showAnswers: boolean;
  showCertificate: boolean;
  showThankYouMessage: boolean;
  thankYouMessage?: string;
  passingPercentage?: number;
  social?: Social;
}

interface Props {
  settings: Settings;
  onChange: (val: Settings) => void;
}

const ResultSettingsForm: React.FC<Props> = ({ settings, onChange }) => {
  const set = (patch: Partial<Settings>) => onChange({ ...settings, ...patch });
  const setSocial = (patch: Partial<Social>) => onChange({ ...settings, social: { ...(settings.social || {}), ...patch } });

  return (
    <div className="rsf-wrap">
      <div className="row g-4">
        {/* Result display options */}
        <div className="col-md-6">
          <div className="card p-3">
            <h6 className="mb-3">📊 What to show after quiz</h6>

            <div className="form-check form-switch mb-3">
              <input className="form-check-input" type="checkbox" id="showScore" checked={settings.showScore} onChange={e => set({ showScore: e.target.checked })} />
              <label className="form-check-label" htmlFor="showScore">
                <strong>Show Score</strong>
                <div className="text-muted small">Show marks and percentage to the student</div>
              </label>
            </div>

            <div className="form-check form-switch mb-3">
              <input className="form-check-input" type="checkbox" id="showAnswers" checked={settings.showAnswers} onChange={e => set({ showAnswers: e.target.checked })} />
              <label className="form-check-label" htmlFor="showAnswers">
                <strong>Show Correct Answers</strong>
                <div className="text-muted small">Student can review all Q&A after completion</div>
              </label>
            </div>

            <div className="form-check form-switch mb-3">
              <input className="form-check-input" type="checkbox" id="showCertificate" checked={settings.showCertificate} onChange={e => set({ showCertificate: e.target.checked })} />
              <label className="form-check-label" htmlFor="showCertificate">
                <strong>Show Certificate Download</strong>
                <div className="text-muted small">Student gets a certificate to download and share</div>
              </label>
            </div>

            {settings.showCertificate && (
              <div className="ms-4 mb-3">
                <label className="form-label">Minimum passing % for certificate</label>
                <div className="d-flex gap-2 align-items-center">
                  <input
                    type="number"
                    className="form-control"
                    style={{ width: 120 }}
                    min={0}
                    max={100}
                    value={settings.passingPercentage ?? ''}
                    placeholder="e.g. 60"
                    onChange={e => set({ passingPercentage: e.target.value ? Number(e.target.value) : undefined })}
                  />
                  <span className="text-muted">% (leave empty to give everyone a certificate)</span>
                </div>
              </div>
            )}

            <div className="form-check form-switch mb-3">
              <input className="form-check-input" type="checkbox" id="showThankYou" checked={settings.showThankYouMessage} onChange={e => set({ showThankYouMessage: e.target.checked })} />
              <label className="form-check-label" htmlFor="showThankYou">
                <strong>Show Thank You Message</strong>
                <div className="text-muted small">Display a custom message after quiz</div>
              </label>
            </div>

            {settings.showThankYouMessage && (
              <div className="ms-4">
                <label className="form-label">Message</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={settings.thankYouMessage || ''}
                  onChange={e => set({ thankYouMessage: e.target.value })}
                  placeholder="Thank you for taking the quiz! We will contact you soon."
                />
              </div>
            )}
          </div>
        </div>

        {/* Social share config */}
        <div className="col-md-6">
          <div className="card p-3">
            <h6 className="mb-3">📱 Social Share Config</h6>
            <p className="text-muted small mb-3">Configure what gets shared when students click the share button. Use <code>{'{{score}}'}</code>, <code>{'{{quizTitle}}'}</code>, <code>{'{{name}}'}</code>, <code>{'{{hashtags}}'}</code> as placeholders.</p>

            <div className="mb-3">
              <label className="form-label">Share Message Template</label>
              <textarea
                className="form-control"
                rows={3}
                value={settings.social?.shareMessage || 'I scored {{score}}% on {{quizTitle}}! 🎉 {{hashtags}}'}
                onChange={e => setSocial({ shareMessage: e.target.value })}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Hashtags (comma separated, without #)</label>
              <input
                className="form-control"
                placeholder="CodeBegun, Java, PlacementReady"
                value={(settings.social?.hashtags || []).join(', ')}
                onChange={e => setSocial({ hashtags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
              />
            </div>

            <div className="row g-2">
              <div className="col-6">
                <label className="form-label">Instagram Handle</label>
                <div className="input-group">
                  <span className="input-group-text">@</span>
                  <input className="form-control" placeholder="codebegun" value={settings.social?.instagramHandle?.replace('@', '') || ''} onChange={e => setSocial({ instagramHandle: e.target.value })} />
                </div>
              </div>
              <div className="col-6">
                <label className="form-label">Twitter/X Handle</label>
                <div className="input-group">
                  <span className="input-group-text">@</span>
                  <input className="form-control" placeholder="codebegun" value={settings.social?.twitterHandle?.replace('@', '') || ''} onChange={e => setSocial({ twitterHandle: e.target.value })} />
                </div>
              </div>
              <div className="col-12">
                <label className="form-label">LinkedIn Company Page URL</label>
                <input className="form-control" placeholder="https://linkedin.com/company/codebegun" value={settings.social?.linkedinCompanyUrl || ''} onChange={e => setSocial({ linkedinCompanyUrl: e.target.value })} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultSettingsForm;
