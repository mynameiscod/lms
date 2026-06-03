import React from 'react';
import { ResumeSections } from '../../api/resumeApi';
import type { ResumeTemplate } from '../../api/resumeApi';

// Template gallery metadata (used by the picker)
export const TEMPLATES: { id: ResumeTemplate; name: string; blurb: string; accent: string }[] = [
  { id: 'classic', name: 'Classic', blurb: 'Timeless single-column, ATS-friendly', accent: '#1e3a5f' },
  { id: 'modern', name: 'Modern', blurb: 'Coloured header with accent sections', accent: '#0ea5e9' },
  { id: 'minimal', name: 'Minimal', blurb: 'Clean, lots of whitespace', accent: '#475569' },
  { id: 'professional', name: 'Professional', blurb: 'Two-column with sidebar', accent: '#0f766e' },
];

const has = (a?: any[]) => Array.isArray(a) && a.length > 0;
const contactLine = (c: ResumeSections['contact']) =>
  [c.email, c.phone, c.location].filter(Boolean).join('  ·  ');

// ── Classic ───────────────────────────────────────────────────────────────────
const Classic: React.FC<{ s: ResumeSections }> = ({ s }) => (
  <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: '#1a1a1a', fontSize: 12.5, lineHeight: 1.5, padding: '36px 40px' }}>
    <div style={{ textAlign: 'center', borderBottom: '2px solid #1a1a1a', paddingBottom: 10, marginBottom: 14 }}>
      {s.contact.name && <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 1 }}>{s.contact.name}</div>}
      <div style={{ fontSize: 11, color: '#444', marginTop: 4 }}>{contactLine(s.contact)}</div>
      <div style={{ fontSize: 11, color: '#444' }}>
        {[s.contact.linkedin && 'LinkedIn', s.contact.github && 'GitHub', s.contact.portfolio && 'Portfolio'].filter(Boolean).join('  ·  ')}
      </div>
    </div>
    {s.summary && <Section title="Summary"><p style={{ margin: 0 }}>{s.summary}</p></Section>}
    {has(s.experience) && <Section title="Experience">{s.experience.map((e, i) => (
      <div key={i} style={{ marginBottom: 9 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
          <span>{e.role}{e.company && ` — ${e.company}`}</span>
          <span style={{ fontWeight: 400, color: '#555' }}>{e.from}{e.to ? ` – ${e.current ? 'Present' : e.to}` : ''}</span>
        </div>
        {has(e.bullets) && <ul style={{ margin: '3px 0 0', paddingLeft: 18 }}>{e.bullets.filter(Boolean).map((b, j) => <li key={j}>{b}</li>)}</ul>}
      </div>
    ))}</Section>}
    {has(s.projects) && <Section title="Projects">{s.projects.map((p, i) => (
      <div key={i} style={{ marginBottom: 7 }}>
        <div style={{ fontWeight: 700 }}>{p.name}{has(p.tech) && <span style={{ fontWeight: 400, color: '#555' }}> — {p.tech.join(', ')}</span>}</div>
        {p.description && <div>{p.description}</div>}
      </div>
    ))}</Section>}
    {has(s.skills) && <Section title="Skills">{s.skills.map((g, i) => (
      <div key={i}><strong>{g.category}: </strong>{g.items.join(', ')}</div>
    ))}</Section>}
    {has(s.education) && <Section title="Education">{s.education.map((e, i) => (
      <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span><strong>{e.degree}</strong>{e.college && `, ${e.college}`}</span>
        <span style={{ color: '#555' }}>{e.year}{e.cgpa ? ` · CGPA ${e.cgpa}` : ''}</span>
      </div>
    ))}</Section>}
    {has(s.certifications) && <Section title="Certifications">{s.certifications.map((c, i) => (
      <div key={i}>{c.name} — {c.issuer}{c.year ? `, ${c.year}` : ''}</div>
    ))}</Section>}
  </div>
);
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid #999', paddingBottom: 2, marginBottom: 6 }}>{title}</div>
    {children}
  </div>
);

// ── Modern ────────────────────────────────────────────────────────────────────
const Modern: React.FC<{ s: ResumeSections; accent: string }> = ({ s, accent }) => {
  const Title: React.FC<{ t: string }> = ({ t }) => (
    <div style={{ fontSize: 13, fontWeight: 800, color: accent, textTransform: 'uppercase', letterSpacing: 0.6, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 16, height: 3, background: accent, borderRadius: 2 }} />{t}
    </div>
  );
  return (
    <div style={{ fontFamily: '"Segoe UI", Arial, sans-serif', color: '#1f2937', fontSize: 12.5, lineHeight: 1.5 }}>
      <div style={{ background: accent, color: '#fff', padding: '26px 36px' }}>
        <div style={{ fontSize: 26, fontWeight: 800 }}>{s.contact.name || 'Your Name'}</div>
        <div style={{ fontSize: 11.5, opacity: 0.92, marginTop: 4 }}>
          {[contactLine(s.contact), s.contact.linkedin && 'LinkedIn', s.contact.github && 'GitHub'].filter(Boolean).join('   ·   ')}
        </div>
      </div>
      <div style={{ padding: '20px 36px' }}>
        {s.summary && <div style={{ marginBottom: 14 }}><Title t="Summary" /><p style={{ margin: 0 }}>{s.summary}</p></div>}
        {has(s.experience) && <div style={{ marginBottom: 14 }}><Title t="Experience" />{s.experience.map((e, i) => (
          <div key={i} style={{ marginBottom: 9, borderLeft: `2px solid ${accent}33`, paddingLeft: 12 }}>
            <div style={{ fontWeight: 700 }}>{e.role}{e.company && ` · ${e.company}`}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{e.from}{e.to ? ` – ${e.current ? 'Present' : e.to}` : ''}</div>
            {has(e.bullets) && <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>{e.bullets.filter(Boolean).map((b, j) => <li key={j}>{b}</li>)}</ul>}
          </div>
        ))}</div>}
        {has(s.projects) && <div style={{ marginBottom: 14 }}><Title t="Projects" />{s.projects.map((p, i) => (
          <div key={i} style={{ marginBottom: 7 }}>
            <div style={{ fontWeight: 700 }}>{p.name}</div>
            {has(p.tech) && <div style={{ fontSize: 11, color: accent }}>{p.tech.join(' · ')}</div>}
            {p.description && <div>{p.description}</div>}
          </div>
        ))}</div>}
        {has(s.skills) && <div style={{ marginBottom: 14 }}><Title t="Skills" />{s.skills.map((g, i) => (
          <div key={i} style={{ marginBottom: 5 }}>
            <strong>{g.category}: </strong>
            {g.items.map(it => <span key={it} style={{ display: 'inline-block', background: `${accent}15`, color: accent, borderRadius: 12, padding: '1px 9px', fontSize: 10.5, margin: '0 4px 4px 0' }}>{it}</span>)}
          </div>
        ))}</div>}
        {has(s.education) && <div style={{ marginBottom: 14 }}><Title t="Education" />{s.education.map((e, i) => (
          <div key={i}><strong>{e.degree}</strong>{e.college && `, ${e.college}`} {e.year && <span style={{ color: '#6b7280' }}>· {e.year}</span>}{e.cgpa ? ` · CGPA ${e.cgpa}` : ''}</div>
        ))}</div>}
        {has(s.certifications) && <div><Title t="Certifications" />{s.certifications.map((c, i) => (
          <div key={i}>{c.name} — {c.issuer}{c.year ? `, ${c.year}` : ''}</div>
        ))}</div>}
      </div>
    </div>
  );
};

// ── Minimal ───────────────────────────────────────────────────────────────────
const Minimal: React.FC<{ s: ResumeSections }> = ({ s }) => {
  const Title: React.FC<{ t: string }> = ({ t }) => (
    <div style={{ fontSize: 10.5, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 2.5, margin: '0 0 8px' }}>{t}</div>
  );
  return (
    <div style={{ fontFamily: '"Helvetica Neue", Arial, sans-serif', color: '#374151', fontSize: 12, lineHeight: 1.6, padding: '44px 48px', fontWeight: 300 }}>
      <div style={{ fontSize: 30, fontWeight: 300, letterSpacing: 1, color: '#111827' }}>{s.contact.name || 'Your Name'}</div>
      <div style={{ fontSize: 11, color: '#6b7280', margin: '6px 0 26px' }}>
        {[contactLine(s.contact), s.contact.linkedin && 'LinkedIn', s.contact.github && 'GitHub', s.contact.portfolio && 'Portfolio'].filter(Boolean).join('   /   ')}
      </div>
      {s.summary && <Block><Title t="Profile" /><p style={{ margin: 0 }}>{s.summary}</p></Block>}
      {has(s.experience) && <Block><Title t="Experience" />{s.experience.map((e, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 500, color: '#111827' }}>{e.role}</div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>{e.company}{(e.from || e.to) && `  ·  ${e.from}${e.to ? ` – ${e.current ? 'Present' : e.to}` : ''}`}</div>
          {has(e.bullets) && <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>{e.bullets.filter(Boolean).map((b, j) => <li key={j}>{b}</li>)}</ul>}
        </div>
      ))}</Block>}
      {has(s.projects) && <Block><Title t="Projects" />{s.projects.map((p, i) => (
        <div key={i} style={{ marginBottom: 9 }}>
          <span style={{ fontWeight: 500, color: '#111827' }}>{p.name}</span>{has(p.tech) && <span style={{ color: '#9ca3af' }}>  ·  {p.tech.join(', ')}</span>}
          {p.description && <div>{p.description}</div>}
        </div>
      ))}</Block>}
      {has(s.skills) && <Block><Title t="Skills" />{s.skills.map((g, i) => (
        <div key={i} style={{ marginBottom: 3 }}><span style={{ color: '#9ca3af' }}>{g.category}</span>  —  {g.items.join(', ')}</div>
      ))}</Block>}
      {has(s.education) && <Block><Title t="Education" />{s.education.map((e, i) => (
        <div key={i}><span style={{ fontWeight: 500, color: '#111827' }}>{e.degree}</span>{e.college && `, ${e.college}`}{e.year && <span style={{ color: '#9ca3af' }}>  ·  {e.year}</span>}{e.cgpa ? `  ·  CGPA ${e.cgpa}` : ''}</div>
      ))}</Block>}
      {has(s.certifications) && <Block><Title t="Certifications" />{s.certifications.map((c, i) => (
        <div key={i}>{c.name} — {c.issuer}{c.year ? `, ${c.year}` : ''}</div>
      ))}</Block>}
    </div>
  );
};
const Block: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14, marginTop: 14 }}>{children}</div>
);

// ── Professional (two-column) ───────────────────────────────────────────────────
const Professional: React.FC<{ s: ResumeSections; accent: string }> = ({ s, accent }) => {
  const SideTitle: React.FC<{ t: string }> = ({ t }) => (
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.3)', paddingBottom: 3, margin: '0 0 8px' }}>{t}</div>
  );
  const MainTitle: React.FC<{ t: string }> = ({ t }) => (
    <div style={{ fontSize: 13, fontWeight: 800, color: accent, textTransform: 'uppercase', letterSpacing: 0.6, margin: '0 0 7px' }}>{t}</div>
  );
  return (
    <div style={{ display: 'flex', fontFamily: '"Segoe UI", Arial, sans-serif', color: '#1f2937', fontSize: 12, lineHeight: 1.5, minHeight: 600 }}>
      {/* Sidebar */}
      <div style={{ width: '34%', background: accent, color: '#fff', padding: '30px 20px' }}>
        <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>{s.contact.name || 'Your Name'}</div>
        <div style={{ marginTop: 18 }}>
          <SideTitle t="Contact" />
          {[s.contact.email, s.contact.phone, s.contact.location, s.contact.linkedin, s.contact.github, s.contact.portfolio].filter(Boolean).map((v, i) => (
            <div key={i} style={{ fontSize: 10.5, marginBottom: 4, wordBreak: 'break-word', opacity: 0.95 }}>{v}</div>
          ))}
        </div>
        {has(s.skills) && <div style={{ marginTop: 18 }}><SideTitle t="Skills" />{s.skills.map((g, i) => (
          <div key={i} style={{ marginBottom: 7 }}>
            <div style={{ fontWeight: 700, fontSize: 10.5 }}>{g.category}</div>
            <div style={{ fontSize: 10.5, opacity: 0.95 }}>{g.items.join(', ')}</div>
          </div>
        ))}</div>}
        {has(s.education) && <div style={{ marginTop: 18 }}><SideTitle t="Education" />{s.education.map((e, i) => (
          <div key={i} style={{ marginBottom: 7, fontSize: 10.5 }}>
            <div style={{ fontWeight: 700 }}>{e.degree}</div>
            <div style={{ opacity: 0.95 }}>{e.college}{e.year ? `, ${e.year}` : ''}{e.cgpa ? ` · CGPA ${e.cgpa}` : ''}</div>
          </div>
        ))}</div>}
        {has(s.certifications) && <div style={{ marginTop: 18 }}><SideTitle t="Certifications" />{s.certifications.map((c, i) => (
          <div key={i} style={{ marginBottom: 5, fontSize: 10.5, opacity: 0.95 }}>{c.name} — {c.issuer}{c.year ? `, ${c.year}` : ''}</div>
        ))}</div>}
      </div>
      {/* Main */}
      <div style={{ width: '66%', padding: '30px 26px' }}>
        {s.summary && <div style={{ marginBottom: 16 }}><MainTitle t="Profile" /><p style={{ margin: 0 }}>{s.summary}</p></div>}
        {has(s.experience) && <div style={{ marginBottom: 16 }}><MainTitle t="Experience" />{s.experience.map((e, i) => (
          <div key={i} style={{ marginBottom: 11 }}>
            <div style={{ fontWeight: 700 }}>{e.role}{e.company && ` · ${e.company}`}</div>
            <div style={{ fontSize: 10.5, color: '#6b7280' }}>{e.from}{e.to ? ` – ${e.current ? 'Present' : e.to}` : ''}</div>
            {has(e.bullets) && <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>{e.bullets.filter(Boolean).map((b, j) => <li key={j}>{b}</li>)}</ul>}
          </div>
        ))}</div>}
        {has(s.projects) && <div><MainTitle t="Projects" />{s.projects.map((p, i) => (
          <div key={i} style={{ marginBottom: 9 }}>
            <div style={{ fontWeight: 700 }}>{p.name}</div>
            {has(p.tech) && <div style={{ fontSize: 10.5, color: accent }}>{p.tech.join(' · ')}</div>}
            {p.description && <div>{p.description}</div>}
          </div>
        ))}</div>}
      </div>
    </div>
  );
};

// ── Switcher ────────────────────────────────────────────────────────────────────
export const ResumeDocument: React.FC<{ sections: ResumeSections; template?: ResumeTemplate }> = ({ sections, template }) => {
  const accent = TEMPLATES.find(t => t.id === template)?.accent || '#1e3a5f';
  switch (template) {
    case 'modern': return <Modern s={sections} accent={accent} />;
    case 'minimal': return <Minimal s={sections} />;
    case 'professional': return <Professional s={sections} accent={accent} />;
    case 'classic':
    default: return <Classic s={sections} />;
  }
};
