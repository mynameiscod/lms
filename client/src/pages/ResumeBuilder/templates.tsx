import React from 'react';
import { ResumeSections } from '../../api/resumeApi';
import type { ResumeTemplate, ResumeDesign } from '../../api/resumeApi';

// Template gallery metadata (used by the picker)
export const TEMPLATES: { id: ResumeTemplate; name: string; blurb: string; accent: string }[] = [
  { id: 'classic', name: 'Classic', blurb: 'Timeless single-column, ATS-friendly', accent: '#1e3a5f' },
  { id: 'modern', name: 'Modern', blurb: 'Coloured header with accent sections', accent: '#0ea5e9' },
  { id: 'minimal', name: 'Minimal', blurb: 'Clean, lots of whitespace', accent: '#475569' },
  { id: 'professional', name: 'Professional', blurb: 'Two-column with sidebar', accent: '#0f766e' },
  { id: 'compact', name: 'Compact', blurb: 'Dense single-column — fits more, ATS-safe', accent: '#334155' },
  { id: 'elegant', name: 'Elegant', blurb: 'Refined serif, centred headings', accent: '#7c3f2e' },
];

// Font choices offered in the Design panel
export const FONT_OPTIONS: { label: string; value: string }[] = [
  { label: 'Default (template)', value: '' },
  { label: 'Inter / Sans', value: 'Inter, "Segoe UI", Arial, sans-serif' },
  { label: 'Georgia / Serif', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Times', value: '"Times New Roman", Times, serif' },
  { label: 'Helvetica', value: '"Helvetica Neue", Arial, sans-serif' },
  { label: 'Calibri', value: 'Calibri, "Segoe UI", sans-serif' },
  { label: 'Roboto', value: 'Roboto, Arial, sans-serif' },
  { label: 'Poppins', value: 'Poppins, "Segoe UI", sans-serif' },
];

const has = (a?: any[]) => Array.isArray(a) && a.length > 0;
const contactLine = (c: ResumeSections['contact']) => [c.email, c.phone, c.location].filter(Boolean).join('  ·  ');

// Strip protocol/www/trailing-slash for a clean printed URL.
const cleanUrl = (u?: string) => (u || '').replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '');
// LinkedIn/GitHub/Portfolio row — shows the full link (student's choice) or a short label.
const linkParts = (c: ResumeSections['contact'], showUrls?: boolean) => [
  c.linkedin && (showUrls ? cleanUrl(c.linkedin) : 'LinkedIn'),
  c.github && (showUrls ? cleanUrl(c.github) : 'GitHub'),
  c.portfolio && (showUrls ? cleanUrl(c.portfolio) : 'Portfolio'),
].filter(Boolean) as string[];

type D = { fontFamily: string; scale: number; accent: string; lineHeight: number; align: 'left' | 'center'; base: number; showLinkUrls: boolean };
const DEFAULTS: Record<ResumeTemplate, Omit<D, 'showLinkUrls'>> = {
  classic:      { fontFamily: 'Georgia, "Times New Roman", serif', scale: 1, accent: '#1a1a1a', lineHeight: 1.5, align: 'center', base: 12.5 },
  modern:       { fontFamily: '"Segoe UI", Arial, sans-serif',      scale: 1, accent: '#0ea5e9', lineHeight: 1.5, align: 'left',   base: 12.5 },
  minimal:      { fontFamily: '"Helvetica Neue", Arial, sans-serif',scale: 1, accent: '#475569', lineHeight: 1.6, align: 'left',   base: 12 },
  professional: { fontFamily: '"Segoe UI", Arial, sans-serif',      scale: 1, accent: '#0f766e', lineHeight: 1.5, align: 'left',   base: 12 },
  compact:      { fontFamily: '"Helvetica Neue", Arial, sans-serif',scale: 1, accent: '#334155', lineHeight: 1.4, align: 'center', base: 11.5 },
  elegant:      { fontFamily: 'Georgia, "Times New Roman", serif',  scale: 1, accent: '#7c3f2e', lineHeight: 1.55, align: 'center', base: 12.5 },
};
const resolve = (template: ResumeTemplate, design?: ResumeDesign): D => {
  const t = DEFAULTS[template] || DEFAULTS.classic;
  return {
    fontFamily: design?.fontFamily || t.fontFamily,
    scale: design?.scale || 1,
    accent: design?.accent || t.accent,
    lineHeight: design?.lineHeight || t.lineHeight,
    align: design?.align || t.align,
    base: t.base,
    showLinkUrls: design?.showLinkUrls !== false, // default: show the real links
  };
};

// ── Classic ───────────────────────────────────────────────────────────────────
const Classic: React.FC<{ s: ResumeSections; d: D }> = ({ s, d }) => {
  const f = (n: number) => +(n * d.scale).toFixed(1);
  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: f(12), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: d.accent, borderBottom: `1px solid ${d.accent}88`, paddingBottom: 2, marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  );
  return (
    <div style={{ fontFamily: d.fontFamily, color: '#1a1a1a', fontSize: f(d.base), lineHeight: d.lineHeight, padding: '36px 40px' }}>
      <div style={{ textAlign: d.align, borderBottom: `2px solid ${d.accent}`, paddingBottom: 10, marginBottom: 14 }}>
        {s.contact.name && <div style={{ fontSize: f(24), fontWeight: 700, letterSpacing: 1, color: d.accent }}>{s.contact.name}</div>}
        {s.contact.title && <div style={{ fontSize: f(12.5), color: '#555', marginTop: 2, fontStyle: 'italic' }}>{s.contact.title}</div>}
        <div style={{ fontSize: f(11), color: '#444', marginTop: 4 }}>{contactLine(s.contact)}</div>
        <div style={{ fontSize: f(11), color: '#444' }}>{linkParts(s.contact, d.showLinkUrls).join('  ·  ')}</div>
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
      {has(s.skills) && <Section title="Skills">{s.skills.map((g, i) => (<div key={i}><strong>{g.category}: </strong>{g.items.join(', ')}</div>))}</Section>}
      {has(s.education) && <Section title="Education">{s.education.map((e, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span><strong>{e.degree}</strong>{e.college && `, ${e.college}`}</span>
          <span style={{ color: '#555' }}>{e.year}{e.cgpa ? ` · CGPA ${e.cgpa}` : ''}</span>
        </div>
      ))}</Section>}
      {has(s.certifications) && <Section title="Certifications">{s.certifications.map((c, i) => (<div key={i}>{c.name} — {c.issuer}{c.year ? `, ${c.year}` : ''}</div>))}</Section>}
    </div>
  );
};

// ── Modern ────────────────────────────────────────────────────────────────────
const Modern: React.FC<{ s: ResumeSections; d: D }> = ({ s, d }) => {
  const f = (n: number) => +(n * d.scale).toFixed(1);
  const accent = d.accent;
  const Title: React.FC<{ t: string }> = ({ t }) => (
    <div style={{ fontSize: f(13), fontWeight: 800, color: accent, textTransform: 'uppercase', letterSpacing: 0.6, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 16, height: 3, background: accent, borderRadius: 2 }} />{t}
    </div>
  );
  return (
    <div style={{ fontFamily: d.fontFamily, color: '#1f2937', fontSize: f(d.base), lineHeight: d.lineHeight }}>
      <div style={{ background: accent, color: '#fff', padding: '26px 36px', textAlign: d.align }}>
        <div style={{ fontSize: f(26), fontWeight: 800 }}>{s.contact.name || 'Your Name'}</div>
        {s.contact.title && <div style={{ fontSize: f(12.5), opacity: 0.95, marginTop: 2 }}>{s.contact.title}</div>}
        <div style={{ fontSize: f(11.5), opacity: 0.92, marginTop: 4 }}>{[contactLine(s.contact), ...linkParts(s.contact, d.showLinkUrls)].filter(Boolean).join('   ·   ')}</div>
      </div>
      <div style={{ padding: '20px 36px' }}>
        {s.summary && <div style={{ marginBottom: 14 }}><Title t="Summary" /><p style={{ margin: 0 }}>{s.summary}</p></div>}
        {has(s.experience) && <div style={{ marginBottom: 14 }}><Title t="Experience" />{s.experience.map((e, i) => (
          <div key={i} style={{ marginBottom: 9, borderLeft: `2px solid ${accent}33`, paddingLeft: 12 }}>
            <div style={{ fontWeight: 700 }}>{e.role}{e.company && ` · ${e.company}`}</div>
            <div style={{ fontSize: f(11), color: '#6b7280' }}>{e.from}{e.to ? ` – ${e.current ? 'Present' : e.to}` : ''}</div>
            {has(e.bullets) && <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>{e.bullets.filter(Boolean).map((b, j) => <li key={j}>{b}</li>)}</ul>}
          </div>
        ))}</div>}
        {has(s.projects) && <div style={{ marginBottom: 14 }}><Title t="Projects" />{s.projects.map((p, i) => (
          <div key={i} style={{ marginBottom: 7 }}>
            <div style={{ fontWeight: 700 }}>{p.name}</div>
            {has(p.tech) && <div style={{ fontSize: f(11), color: accent }}>{p.tech.join(' · ')}</div>}
            {p.description && <div>{p.description}</div>}
          </div>
        ))}</div>}
        {has(s.skills) && <div style={{ marginBottom: 14 }}><Title t="Skills" />{s.skills.map((g, i) => (
          <div key={i} style={{ marginBottom: 5 }}><strong>{g.category}: </strong>
            {g.items.map(it => <span key={it} style={{ display: 'inline-block', background: `${accent}15`, color: accent, borderRadius: 12, padding: '1px 9px', fontSize: f(10.5), margin: '0 4px 4px 0' }}>{it}</span>)}
          </div>
        ))}</div>}
        {has(s.education) && <div style={{ marginBottom: 14 }}><Title t="Education" />{s.education.map((e, i) => (
          <div key={i}><strong>{e.degree}</strong>{e.college && `, ${e.college}`} {e.year && <span style={{ color: '#6b7280' }}>· {e.year}</span>}{e.cgpa ? ` · CGPA ${e.cgpa}` : ''}</div>
        ))}</div>}
        {has(s.certifications) && <div><Title t="Certifications" />{s.certifications.map((c, i) => (<div key={i}>{c.name} — {c.issuer}{c.year ? `, ${c.year}` : ''}</div>))}</div>}
      </div>
    </div>
  );
};

// ── Minimal ───────────────────────────────────────────────────────────────────
const Minimal: React.FC<{ s: ResumeSections; d: D }> = ({ s, d }) => {
  const f = (n: number) => +(n * d.scale).toFixed(1);
  const Title: React.FC<{ t: string }> = ({ t }) => (
    <div style={{ fontSize: f(10.5), fontWeight: 600, color: d.accent, textTransform: 'uppercase', letterSpacing: 2.5, margin: '0 0 8px' }}>{t}</div>
  );
  const Block: React.FC<{ children: React.ReactNode }> = ({ children }) => (<div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14, marginTop: 14 }}>{children}</div>);
  return (
    <div style={{ fontFamily: d.fontFamily, color: '#374151', fontSize: f(d.base), lineHeight: d.lineHeight, padding: '44px 48px', fontWeight: 300 }}>
      <div style={{ textAlign: d.align }}>
        <div style={{ fontSize: f(30), fontWeight: 300, letterSpacing: 1, color: d.accent }}>{s.contact.name || 'Your Name'}</div>
        <div style={{ fontSize: f(11), color: '#6b7280', margin: '6px 0 26px' }}>{[contactLine(s.contact), ...linkParts(s.contact, d.showLinkUrls)].filter(Boolean).join('   /   ')}</div>
      </div>
      {s.summary && <Block><Title t="Profile" /><p style={{ margin: 0 }}>{s.summary}</p></Block>}
      {has(s.experience) && <Block><Title t="Experience" />{s.experience.map((e, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 500, color: '#111827' }}>{e.role}</div>
          <div style={{ fontSize: f(11), color: '#9ca3af' }}>{e.company}{(e.from || e.to) && `  ·  ${e.from}${e.to ? ` – ${e.current ? 'Present' : e.to}` : ''}`}</div>
          {has(e.bullets) && <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>{e.bullets.filter(Boolean).map((b, j) => <li key={j}>{b}</li>)}</ul>}
        </div>
      ))}</Block>}
      {has(s.projects) && <Block><Title t="Projects" />{s.projects.map((p, i) => (
        <div key={i} style={{ marginBottom: 9 }}>
          <span style={{ fontWeight: 500, color: '#111827' }}>{p.name}</span>{has(p.tech) && <span style={{ color: '#9ca3af' }}>  ·  {p.tech.join(', ')}</span>}
          {p.description && <div>{p.description}</div>}
        </div>
      ))}</Block>}
      {has(s.skills) && <Block><Title t="Skills" />{s.skills.map((g, i) => (<div key={i} style={{ marginBottom: 3 }}><span style={{ color: '#9ca3af' }}>{g.category}</span>  —  {g.items.join(', ')}</div>))}</Block>}
      {has(s.education) && <Block><Title t="Education" />{s.education.map((e, i) => (
        <div key={i}><span style={{ fontWeight: 500, color: '#111827' }}>{e.degree}</span>{e.college && `, ${e.college}`}{e.year && <span style={{ color: '#9ca3af' }}>  ·  {e.year}</span>}{e.cgpa ? `  ·  CGPA ${e.cgpa}` : ''}</div>
      ))}</Block>}
      {has(s.certifications) && <Block><Title t="Certifications" />{s.certifications.map((c, i) => (<div key={i}>{c.name} — {c.issuer}{c.year ? `, ${c.year}` : ''}</div>))}</Block>}
    </div>
  );
};

// ── Professional (two-column) ───────────────────────────────────────────────────
const Professional: React.FC<{ s: ResumeSections; d: D }> = ({ s, d }) => {
  const f = (n: number) => +(n * d.scale).toFixed(1);
  const accent = d.accent;
  const SideTitle: React.FC<{ t: string }> = ({ t }) => (<div style={{ fontSize: f(11), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.3)', paddingBottom: 3, margin: '0 0 8px' }}>{t}</div>);
  const MainTitle: React.FC<{ t: string }> = ({ t }) => (<div style={{ fontSize: f(13), fontWeight: 800, color: accent, textTransform: 'uppercase', letterSpacing: 0.6, margin: '0 0 7px' }}>{t}</div>);
  return (
    <div style={{ display: 'flex', fontFamily: d.fontFamily, color: '#1f2937', fontSize: f(d.base), lineHeight: d.lineHeight, minHeight: 600 }}>
      <div style={{ width: '34%', background: accent, color: '#fff', padding: '30px 20px' }}>
        <div style={{ fontSize: f(20), fontWeight: 800, lineHeight: 1.2 }}>{s.contact.name || 'Your Name'}</div>
        <div style={{ marginTop: 18 }}>
          <SideTitle t="Contact" />
          {[s.contact.email, s.contact.phone, s.contact.location, ...linkParts(s.contact, d.showLinkUrls)].filter(Boolean).map((v, i) => (<div key={i} style={{ fontSize: f(10.5), marginBottom: 4, wordBreak: 'break-word', opacity: 0.95 }}>{v}</div>))}
        </div>
        {has(s.skills) && <div style={{ marginTop: 18 }}><SideTitle t="Skills" />{s.skills.map((g, i) => (
          <div key={i} style={{ marginBottom: 7 }}><div style={{ fontWeight: 700, fontSize: f(10.5) }}>{g.category}</div><div style={{ fontSize: f(10.5), opacity: 0.95 }}>{g.items.join(', ')}</div></div>
        ))}</div>}
        {has(s.education) && <div style={{ marginTop: 18 }}><SideTitle t="Education" />{s.education.map((e, i) => (
          <div key={i} style={{ marginBottom: 7, fontSize: f(10.5) }}><div style={{ fontWeight: 700 }}>{e.degree}</div><div style={{ opacity: 0.95 }}>{e.college}{e.year ? `, ${e.year}` : ''}{e.cgpa ? ` · CGPA ${e.cgpa}` : ''}</div></div>
        ))}</div>}
        {has(s.certifications) && <div style={{ marginTop: 18 }}><SideTitle t="Certifications" />{s.certifications.map((c, i) => (<div key={i} style={{ marginBottom: 5, fontSize: f(10.5), opacity: 0.95 }}>{c.name} — {c.issuer}{c.year ? `, ${c.year}` : ''}</div>))}</div>}
      </div>
      <div style={{ width: '66%', padding: '30px 26px' }}>
        {s.summary && <div style={{ marginBottom: 16 }}><MainTitle t="Profile" /><p style={{ margin: 0 }}>{s.summary}</p></div>}
        {has(s.experience) && <div style={{ marginBottom: 16 }}><MainTitle t="Experience" />{s.experience.map((e, i) => (
          <div key={i} style={{ marginBottom: 11 }}>
            <div style={{ fontWeight: 700 }}>{e.role}{e.company && ` · ${e.company}`}</div>
            <div style={{ fontSize: f(10.5), color: '#6b7280' }}>{e.from}{e.to ? ` – ${e.current ? 'Present' : e.to}` : ''}</div>
            {has(e.bullets) && <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>{e.bullets.filter(Boolean).map((b, j) => <li key={j}>{b}</li>)}</ul>}
          </div>
        ))}</div>}
        {has(s.projects) && <div><MainTitle t="Projects" />{s.projects.map((p, i) => (
          <div key={i} style={{ marginBottom: 9 }}><div style={{ fontWeight: 700 }}>{p.name}</div>{has(p.tech) && <div style={{ fontSize: f(10.5), color: accent }}>{p.tech.join(' · ')}</div>}{p.description && <div>{p.description}</div>}</div>
        ))}</div>}
      </div>
    </div>
  );
};

// ── Compact (dense single-column) ───────────────────────────────────────────────
const Compact: React.FC<{ s: ResumeSections; d: D }> = ({ s, d }) => {
  const f = (n: number) => +(n * d.scale).toFixed(1);
  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: f(10.5), fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: d.accent, borderBottom: `1.5px solid ${d.accent}`, paddingBottom: 1, marginBottom: 4 }}>{title}</div>
      {children}
    </div>
  );
  return (
    <div style={{ fontFamily: d.fontFamily, color: '#1f2937', fontSize: f(d.base), lineHeight: d.lineHeight, padding: '26px 34px' }}>
      <div style={{ textAlign: d.align, marginBottom: 10 }}>
        <div style={{ fontSize: f(20), fontWeight: 800, color: d.accent }}>{s.contact.name || 'Your Name'}</div>
        {s.contact.title && <div style={{ fontSize: f(11), color: '#555' }}>{s.contact.title}</div>}
        <div style={{ fontSize: f(10), color: '#444', marginTop: 3 }}>{[contactLine(s.contact), ...linkParts(s.contact, d.showLinkUrls)].filter(Boolean).join('  ·  ')}</div>
      </div>
      {s.summary && <Section title="Summary"><p style={{ margin: 0 }}>{s.summary}</p></Section>}
      {has(s.experience) && <Section title="Experience">{s.experience.map((e, i) => (
        <div key={i} style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
            <span>{e.role}{e.company && ` — ${e.company}`}</span>
            <span style={{ fontWeight: 400, color: '#666', fontSize: f(10) }}>{e.from}{e.to ? ` – ${e.current ? 'Present' : e.to}` : ''}</span>
          </div>
          {has(e.bullets) && <ul style={{ margin: '2px 0 0', paddingLeft: 16 }}>{e.bullets.filter(Boolean).map((b, j) => <li key={j}>{b}</li>)}</ul>}
        </div>
      ))}</Section>}
      {has(s.skills) && <Section title="Skills">{s.skills.map((g, i) => (<div key={i}><strong>{g.category}: </strong>{g.items.join(', ')}</div>))}</Section>}
      {has(s.projects) && <Section title="Projects">{s.projects.map((p, i) => (
        <div key={i} style={{ marginBottom: 4 }}>
          <div style={{ fontWeight: 700 }}>{p.name}{has(p.tech) && <span style={{ fontWeight: 400, color: '#666' }}> — {p.tech.join(', ')}</span>}</div>
          {p.description && <div>{p.description}</div>}
        </div>
      ))}</Section>}
      {has(s.education) && <Section title="Education">{s.education.map((e, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span><strong>{e.degree}</strong>{e.college && `, ${e.college}`}</span>
          <span style={{ color: '#666' }}>{e.year}{e.cgpa ? ` · ${e.cgpa}` : ''}</span>
        </div>
      ))}</Section>}
      {has(s.certifications) && <Section title="Certifications">{s.certifications.map((c, i) => (<div key={i}>{c.name} — {c.issuer}{c.year ? `, ${c.year}` : ''}</div>))}</Section>}
    </div>
  );
};

// ── Elegant (serif, centred headings) ───────────────────────────────────────────
const Elegant: React.FC<{ s: ResumeSections; d: D }> = ({ s, d }) => {
  const f = (n: number) => +(n * d.scale).toFixed(1);
  const links = linkParts(s.contact, d.showLinkUrls);
  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: f(12), fontWeight: 700, color: d.accent, letterSpacing: 3, textTransform: 'uppercase', textAlign: 'center', marginBottom: 8, position: 'relative' }}>
        <span style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: `${d.accent}44` }} />
        <span style={{ position: 'relative', background: '#fff', padding: '0 12px' }}>{title}</span>
      </div>
      {children}
    </div>
  );
  return (
    <div style={{ fontFamily: d.fontFamily, color: '#2d2d2d', fontSize: f(d.base), lineHeight: d.lineHeight, padding: '40px 46px' }}>
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <div style={{ fontSize: f(30), fontWeight: 700, letterSpacing: 2, color: d.accent }}>{s.contact.name || 'Your Name'}</div>
        {s.contact.title && <div style={{ fontSize: f(13), color: '#6b5e4f', marginTop: 3, letterSpacing: 1, fontStyle: 'italic' }}>{s.contact.title}</div>}
        <div style={{ fontSize: f(10.5), color: '#555', marginTop: 8 }}>{contactLine(s.contact)}</div>
        {!!links.length && <div style={{ fontSize: f(10.5), color: '#555', marginTop: 2 }}>{links.join('   ·   ')}</div>}
      </div>
      {s.summary && <Section title="Profile"><p style={{ margin: 0, textAlign: 'center', fontStyle: 'italic', color: '#4b4b4b' }}>{s.summary}</p></Section>}
      {has(s.experience) && <Section title="Experience">{s.experience.map((e, i) => (
        <div key={i} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
            <span>{e.role}{e.company && ` — ${e.company}`}</span>
            <span style={{ fontWeight: 400, color: '#8a7a68', fontStyle: 'italic' }}>{e.from}{e.to ? ` – ${e.current ? 'Present' : e.to}` : ''}</span>
          </div>
          {has(e.bullets) && <ul style={{ margin: '3px 0 0', paddingLeft: 18 }}>{e.bullets.filter(Boolean).map((b, j) => <li key={j}>{b}</li>)}</ul>}
        </div>
      ))}</Section>}
      {has(s.projects) && <Section title="Projects">{s.projects.map((p, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 700 }}>{p.name}{has(p.tech) && <span style={{ fontWeight: 400, color: '#8a7a68', fontStyle: 'italic' }}> — {p.tech.join(', ')}</span>}</div>
          {p.description && <div>{p.description}</div>}
        </div>
      ))}</Section>}
      {has(s.skills) && <Section title="Skills">{s.skills.map((g, i) => (<div key={i} style={{ textAlign: 'center' }}><strong>{g.category}:</strong> {g.items.join('  ·  ')}</div>))}</Section>}
      {has(s.education) && <Section title="Education">{s.education.map((e, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span><strong>{e.degree}</strong>{e.college && `, ${e.college}`}</span>
          <span style={{ color: '#8a7a68' }}>{e.year}{e.cgpa ? ` · CGPA ${e.cgpa}` : ''}</span>
        </div>
      ))}</Section>}
      {has(s.certifications) && <Section title="Certifications">{s.certifications.map((c, i) => (<div key={i} style={{ textAlign: 'center' }}>{c.name} — {c.issuer}{c.year ? `, ${c.year}` : ''}</div>))}</Section>}
    </div>
  );
};

// ── Switcher ────────────────────────────────────────────────────────────────────
export const ResumeDocument: React.FC<{ sections: ResumeSections; template?: ResumeTemplate; design?: ResumeDesign }> = ({ sections, template, design }) => {
  const tpl = template || 'classic';
  const d = resolve(tpl, design);
  switch (tpl) {
    case 'modern': return <Modern s={sections} d={d} />;
    case 'minimal': return <Minimal s={sections} d={d} />;
    case 'professional': return <Professional s={sections} d={d} />;
    case 'compact': return <Compact s={sections} d={d} />;
    case 'elegant': return <Elegant s={sections} d={d} />;
    case 'classic':
    default: return <Classic s={sections} d={d} />;
  }
};
