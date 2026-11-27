import React, { useEffect, useState } from 'react';

/**
 * Content Builder → "Add assignment": pick the kind, give it a title, and the assignment editor opens
 * to write the task, the tests or the rubric. The assignment is bound to the day, so it shows on the
 * member's day after the lessons, like a checkpoint.
 */
const KINDS: { key: string; label: string; icon: string; blurb: string }[] = [
  { key: 'coding', label: 'Coding', icon: 'bi-code-slash', blurb: 'They write a program; it is run against your test cases and auto-graded.' },
  { key: 'project', label: 'Project', icon: 'bi-kanban', blurb: 'A larger build, submitted as a link or files and graded with a rubric.' },
  { key: 'theory', label: 'Written', icon: 'bi-pencil-square', blurb: 'Answers in their own words, reviewed by a mentor.' },
  { key: 'file_upload', label: 'File upload', icon: 'bi-cloud-arrow-up', blurb: 'They hand in documents, images, a zip or source files.' },
  { key: 'sql', label: 'SQL', icon: 'bi-database', blurb: 'They write queries against a sample database.' },
  { key: 'web', label: 'Web', icon: 'bi-window', blurb: 'An HTML, CSS and JavaScript page they build in the browser.' },
];

const AssignmentDrawer: React.FC<{
  unitTitle: string; saving: boolean; onClose: () => void; onCreate: (type: string, title: string) => void;
}> = ({ unitTitle, saving, onClose, onCreate }) => {
  const [type, setType] = useState('coding');
  const [title, setTitle] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  return <div className="acb-drawer-back" onMouseDown={e => { if (e.target === e.currentTarget && !saving) onClose(); }}>
    <form className="acb-drawer" onSubmit={e => { e.preventDefault(); onCreate(type, title.trim()); }}>
      <header>
        <span className="acb-drawer-ic"><i className="bi bi-clipboard-check" /></span>
        <div><b>Add an assignment</b><small>{unitTitle}</small></div>
        <button type="button" className="acb-drawer-x" onClick={onClose} aria-label="Close" disabled={saving}><i className="bi bi-x-lg" /></button>
      </header>
      <div className="acb-drawer-body">
        <div className="acb-field"><span>What kind of assignment?</span>
          <div className="acb-kinds" role="radiogroup" aria-label="Assignment kind">
            {KINDS.map(k => (
              <button key={k.key} type="button" role="radio" aria-checked={type === k.key}
                className={`acb-kind${type === k.key ? ' on' : ''}`} onClick={() => setType(k.key)}>
                <i className={`bi ${k.icon}`} />
                <b>{k.label}</b>
                <small>{k.blurb}</small>
              </button>
            ))}
          </div>
        </div>
        <label className="acb-field"><span>Title (optional)</span>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder={`${KINDS.find(k => k.key === type)?.label} Assignment — ${unitTitle}`} />
        </label>
        <p className="acb-drawer-to"><i className="bi bi-info-circle" /> It is created as a draft and the assignment editor opens next, to write the task{type === 'coding' ? ', starter code and test cases' : ' and the rubric'}.</p>
      </div>
      <footer>
        <button type="button" className="acb-btn" onClick={onClose} disabled={saving}>Cancel</button>
        <button type="submit" className="acb-btn primary" disabled={saving}>{saving ? 'Creating…' : 'Create and open the editor'}</button>
      </footer>
    </form>
  </div>;
};

export default AssignmentDrawer;
