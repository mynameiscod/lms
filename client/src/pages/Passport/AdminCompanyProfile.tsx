import React, { useCallback, useEffect, useState } from 'react';
import passportApi, { CompanyProfileAdmin, CompanyProfileRow } from '../../api/passportApi';

/**
 * What a company expects, in canonical skills — the configuration company readiness is
 * computed from.
 *
 * THE SKILL PICKER IS A LIST, NEVER A TEXT BOX. Every requirement must name a skill the
 * catalogue already has: a typed AMAZON_DSA would be a requirement no evidence could ever be
 * scored against, so it would read to every student as a permanent gap they cannot close.
 * The server rejects unknown keys as well — this is the half that stops an admin having to
 * find out the hard way.
 *
 * DRAFT, THEN PUBLISH. Students read the published version only. Editing weights live would
 * move every member's readiness for this company mid-sentence.
 */

const box: React.CSSProperties = { background: '#fff', border: '1px solid #eef0f7', borderRadius: 12, padding: 18, marginBottom: 16 };
const inp: React.CSSProperties = { padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' };
const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', margin: '0 0 4px' };

type Req = { skillKey: string; importance: string; targetLevel: string; weight: number };

const STATUS_TONE: Record<string, { fg: string; bg: string }> = {
  PUBLISHED: { fg: '#166534', bg: '#dcfce7' },
  DRAFT:     { fg: '#92400e', bg: '#fef3c7' },
  ARCHIVED:  { fg: '#475569', bg: '#f1f5f9' },
};

const AdminCompanyProfile: React.FC<{ slug: string }> = ({ slug }) => {
  const [d, setD] = useState<CompanyProfileAdmin | null>(null);
  const [roleKey, setRoleKey] = useState('DEFAULT');
  const [reqs, setReqs] = useState<Req[]>([]);
  const [rounds, setRounds] = useState<{ roundKey: string; skillKeys: string[] }[]>([]);
  const [notes, setNotes] = useState('');
  const [sourceRef, setSourceRef] = useState('');
  const [sourceType, setSourceType] = useState('ADMIN_RESEARCH');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    passportApi.companyProfiles(slug)
      .then(setD)
      .catch(e => setErr(e?.response?.data?.message || 'Could not load profiles'));
  }, [slug]);

  useEffect(load, [load]);

  /** Load whichever version is the working copy for this role: the draft, else the live one. */
  useEffect(() => {
    if (!d) return;
    const forRole = d.profiles.filter(p => p.roleKey === roleKey);
    const working = forRole.find(p => p.status === 'DRAFT') || forRole.find(p => p.status === 'PUBLISHED');
    setReqs((working?.skillRequirements || []) as Req[]);
    setRounds(working?.roundSkills || []);
    setNotes(working?.preparationNotes || '');
  }, [d, roleKey]);

  if (!d) return <div style={box}>Loading…</div>;

  const forRole = d.profiles.filter(p => p.roleKey === roleKey);
  const draft = forRole.find(p => p.status === 'DRAFT');
  const live = forRole.find(p => p.status === 'PUBLISHED');

  const save = async () => {
    setBusy(true); setErr(''); setMsg('');
    try {
      await passportApi.saveCompanyProfile(slug, roleKey, {
        skillRequirements: reqs,
        roundSkills: rounds.filter(r => r.skillKeys.length),
        preparationNotes: notes,
        sources: sourceRef ? [{ type: sourceType, reference: sourceRef }] : [],
      });
      setMsg('Draft saved. Students still see the published version.');
      load();
    } catch (e: any) {
      // The server names the offending key. Passing that through verbatim is far more use
      // than "invalid input".
      setErr(e?.response?.data?.message || 'Could not save the draft');
    }
    setBusy(false);
  };

  const publish = async () => {
    if (!draft) return;
    setBusy(true); setErr(''); setMsg('');
    try {
      await passportApi.publishCompanyProfile(slug, roleKey, draft.id);
      setMsg('Published. This is now what students are measured against.');
      load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not publish');
    }
    setBusy(false);
  };

  const addReq = () => setReqs(r => [...r, { skillKey: '', importance: 'IMPORTANT', targetLevel: 'WORKING', weight: 7 }]);
  const setReq = (i: number, patch: Partial<Req>) =>
    setReqs(r => r.map((x, n) => (n === i ? { ...x, ...patch } : x)));

  return (
    <div>
      <div style={box}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 240px' }}>
            <label style={lbl}>Role</label>
            <select style={{ ...inp, width: '100%' }} value={roleKey} onChange={e => setRoleKey(e.target.value)}>
              {d.roles.map(r => <option key={r.key} value={r.key}>{r.name}</option>)}
            </select>
            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
              A student whose role has no profile falls back to “All roles”.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {live && (
              <span style={{ fontSize: 11.5, fontWeight: 800, padding: '4px 9px', borderRadius: 20, ...STATUS_TONE.PUBLISHED }}>
                Live: v{live.version}
                {live.reviewDue ? ` · reviewed ${live.daysSinceReview}d ago` : ''}
              </span>
            )}
            {draft && (
              <span style={{ fontSize: 11.5, fontWeight: 800, padding: '4px 9px', borderRadius: 20, ...STATUS_TONE.DRAFT }}>
                Draft: v{draft.version}
              </span>
            )}
          </div>
        </div>
      </div>

      {msg && <div className="pm-msg ok">{msg}</div>}
      {err && <div className="pm-msg err">{err}</div>}

      <div style={box}>
        <h3 style={{ fontSize: 15, fontWeight: 900, margin: '0 0 4px' }}>Skill requirements</h3>
        <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px' }}>
          What this company expects for this role. Weight decides how much each one moves the
          readiness figure; target level is the bar a student is measured against. Only skills
          in the canonical catalogue can be used — there are no company-specific skills.
        </p>

        {reqs.map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select style={{ ...inp, flex: '2 1 220px' }} value={r.skillKey} onChange={e => setReq(i, { skillKey: e.target.value })}>
              <option value="">Choose a skill…</option>
              {d.skills.map(s => <option key={s.key} value={s.key}>{s.name}</option>)}
            </select>
            <select style={{ ...inp, flex: '1 1 130px' }} value={r.importance} onChange={e => setReq(i, { importance: e.target.value })}>
              {d.importanceOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <select style={{ ...inp, flex: '1 1 130px' }} value={r.targetLevel} onChange={e => setReq(i, { targetLevel: e.target.value })}>
              {d.targetLevelOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <input
              type="number" min={1} max={10} style={{ ...inp, width: 80 }}
              value={r.weight} onChange={e => setReq(i, { weight: Number(e.target.value) })}
            />
            <button className="pm-btn ghost" onClick={() => setReqs(x => x.filter((_, n) => n !== i))}>Remove</button>
          </div>
        ))}

        <button className="pm-btn ghost" onClick={addReq}>Add a skill</button>
      </div>

      <div style={box}>
        <h3 style={{ fontSize: 15, fontWeight: 900, margin: '0 0 4px' }}>What each round tests</h3>
        <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px' }}>
          Optional. Maps the rounds you already defined for this company onto the same canonical
          skills, so a student can see what to prepare for each stage.
        </p>
        {d.rounds.map(rd => {
          const current = rounds.find(r => r.roundKey === rd.key)?.skillKeys || [];
          return (
            <div key={rd.key} style={{ marginBottom: 10 }}>
              <label style={lbl}>{rd.label}</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {reqs.filter(r => r.skillKey).map(r => {
                  const on = current.includes(r.skillKey);
                  return (
                    <button
                      key={r.skillKey}
                      className={`pm-btn${on ? ' primary' : ' ghost'}`}
                      style={{ fontSize: 12, padding: '3px 9px' }}
                      onClick={() => setRounds(rs => {
                        const others = rs.filter(x => x.roundKey !== rd.key);
                        const next = on ? current.filter(k => k !== r.skillKey) : [...current, r.skillKey];
                        return [...others, { roundKey: rd.key, skillKeys: next }];
                      })}
                    >
                      {d.skills.find(s => s.key === r.skillKey)?.name || r.skillKey}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div style={box}>
        <h3 style={{ fontSize: 15, fontWeight: 900, margin: '0 0 4px' }}>Guidance and source</h3>
        <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 10px' }}>
          Where these expectations came from. Hiring patterns change, and a profile nobody can
          trace back to anything is one nobody can check later.
        </p>
        <textarea
          style={{ ...inp, width: '100%', minHeight: 80, marginBottom: 10 }}
          placeholder="Preparation guidance shown under the gap list"
          value={notes} onChange={e => setNotes(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select style={{ ...inp, flex: '1 1 180px' }} value={sourceType} onChange={e => setSourceType(e.target.value)}>
            <option value="OFFICIAL">Official</option>
            <option value="ADMIN_RESEARCH">Admin research</option>
            <option value="STUDENT_EXPERIENCE">Student experience</option>
            <option value="AI_ASSISTED">AI-assisted</option>
            <option value="OTHER">Other</option>
          </select>
          <input
            style={{ ...inp, flex: '3 1 300px' }}
            placeholder="Link or reference"
            value={sourceRef} onChange={e => setSourceRef(e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="pm-btn primary" disabled={busy || !reqs.length} onClick={save}>
          {busy ? 'Saving…' : 'Save draft'}
        </button>
        <button className="pm-btn" disabled={busy || !draft} onClick={publish}>
          Publish
        </button>
      </div>
      <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
        Publishing replaces the live version and retires it. Results already recorded keep
        pointing at the version they were measured against.
      </p>
    </div>
  );
};

export default AdminCompanyProfile;
