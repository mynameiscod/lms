import fs from 'fs';
import path from 'path';
import { getAnthropic, getOpenAI, isAnthropicEnabled } from './aiClients';
import * as settings from './settingsService';
import { IResumeSections } from '../models/Resume';

/**
 * Reading an uploaded resume into the editor's sections.
 *
 * WHAT WENT WRONG BEFORE. The AI read only the first 6,000 characters, could stop mid-JSON (2,000 tokens) and then
 * returned nothing at all, and was free to reword what it copied — so imported resumes came back with sentences the
 * member never wrote. Without an AI key, the rule-based read turned every bullet into its own job and split wrapped
 * lines into separate entries.
 *
 * NOW. A structured rule-based read is always done first; it is good on its own. When an AI model is configured it
 * structures the text too, but EVERY value it returns is checked against the resume's own text: a reworded line is
 * replaced by the line it came from, and a value that is not in the resume at all is dropped. Contact details come
 * from their shapes (email, phone, links), which the AI cannot improve on.
 */

// ── Text extraction ─────────────────────────────────────────────────────────

export async function extractTextFromFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') {
    // pdf-parse v1 exports a function directly; guard for any wrapped export
    const mod = require('pdf-parse');
    const pdfParse = typeof mod === 'function' ? mod : (mod.default || mod.pdf);
    const data = await pdfParse(fs.readFileSync(filePath), { pagerender: renderPageWithGaps });
    return cleanText(data.text || '');
  }
  if (ext === '.docx' || ext === '.doc') {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    return cleanText(result.value || '');
  }
  throw new Error('Unsupported file type. Please upload a PDF or DOCX file.');
}

/**
 * pdf-parse's default page text glues table cells together ("B.Tech (ECE)PVP Institute20257.9 CGPA").
 *
 * This follows the PDF's own reading order — which keeps a two-column resume's columns apart, where sorting by
 * position would interleave them line by line — and only changes how pieces on the SAME line are joined: a visible
 * gap becomes " | ", so table cells and side-by-side fields stay separate. A new line starts whenever the text moves
 * to a different height.
 */
function renderPageWithGaps(page: any): Promise<string> {
  return page.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false }).then((tc: any) => {
    let out = ''; let lastY: number | null = null; let end = -Infinity;
    for (const it of tc.items as any[]) {
      const s = String(it.str || '');
      if (!s.trim()) { if (it.hasEOL) { /* keep position; spacing handled below */ } continue; }
      const x = it.transform[4]; const y = it.transform[5]; const h = Math.abs(it.transform[3]) || it.height || 10;
      const w = it.width || s.length * h * 0.5;
      if (lastY === null || Math.abs(y - lastY) > Math.max(2, h * 0.35)) {
        if (out) out += '\n';
      } else {
        const gap = x - end;
        out += gap > h * 0.9 ? ' | ' : gap > h * 0.15 && !/\s$/.test(out) && !/^\s/.test(s) ? ' ' : '';
      }
      out += s; lastY = y; end = x + w;
    }
    return out;
  });
}

/** Ligatures, odd spaces and bullet glyphs PDFs produce, normalised so both readers see plain text. */
export function cleanText(t: string): string {
  return String(t || '')
    .replace(/\r/g, '')
    .replace(/ﬁ/g, 'fi').replace(/ﬂ/g, 'fl').replace(/ﬀ/g, 'ff').replace(/ﬃ/g, 'ffi').replace(/ﬄ/g, 'ffl')
    .replace(/[     ]/g, ' ')
    .replace(/[​‌‍﻿]/g, '')
    .replace(/[▪●◦‣⁃∙➢➔►▸•·]/g, '•')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n');
}

export function getEmptySections(): IResumeSections {
  return {
    contact: { name: '', title: '', email: '', phone: '', linkedin: '', github: '', portfolio: '', location: '' },
    summary: '',
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
  };
}

// ── The rule-based read ─────────────────────────────────────────────────────

type Key = 'summary' | 'skills' | 'experience' | 'projects' | 'education' | 'certifications' | 'achievements' | 'contact' | 'ignore';
const HEADINGS: Array<{ key: Key; re: RegExp }> = [
  { key: 'summary', re: /^(professional\s+|career\s+|personal\s+)?(summary|profile|objective|about(\s+me)?|career\s+objective|overview)$/i },
  { key: 'skills', re: /^((technical|key|core|professional|it)\s+)?(skills?|skill\s*set|competenc(y|ies)|technologies|tech\s+stack|tools(\s+(and|&)\s+technologies)?)$/i },
  { key: 'experience', re: /^((work|professional|industry|relevant)\s+)?(experience|internships?|employment(\s+history)?|work\s+history)$|^internships?\s+(and|&)\s+experience$/i },
  { key: 'projects', re: /^((academic|personal|key|major|technical|selected)\s+)?projects?$/i },
  { key: 'education', re: /^(education(al)?(\s+(details|qualifications?|background))?|academic(s|\s+(details|background|qualifications?))?|qualifications?)$/i },
  { key: 'certifications', re: /^(certifications?|certificates?|courses?(\s+(and|&)\s+certifications?)?|licen[cs]es?(\s+(and|&)\s+certifications?)?)$/i },
  { key: 'achievements', re: /^(achievements?|awards?(\s+(and|&)\s+achievements?)?|accomplishments?|honou?rs(\s+(and|&)\s+awards)?)$/i },
  { key: 'contact', re: /^(contact(\s+(me|info|information|details))?|personal\s+(details|information|info))$/i },
  { key: 'ignore', re: /^(languages?(\s+known)?|hobbies|interests|hobbies\s+(and|&)\s+interests|declaration|references?|strengths|extra[-\s]?curricular(\s+activities)?|co[-\s]?curricular(\s+activities)?|activities|volunteering|positions?\s+of\s+responsibility)$/i },
];

const MONTH = '(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|june?|july?|aug(ust)?|sep(t(ember)?)?|oct(ober)?|nov(ember)?|dec(ember)?)';
const DATE = `(${MONTH}\\.?\\s*'?\\d{2,4}|\\d{1,2}\\/\\d{2,4}|(19|20)\\d{2})`;
const DATE_RANGE = new RegExp(`(${DATE})\\s*(–|—|-|to|till|until)\\s*(${DATE}|present|current|now|ongoing|till\\s+date)`, 'i');
const SINGLE_DATE = new RegExp(DATE, 'i');
const URL_RE = /(https?:\/\/[^\s,|)]+)|(\bwww\.[a-z0-9-]+\.[a-z.]{2,}[^\s,|)]*)|(\b(github\.com|gitlab\.com|bitbucket\.org|behance\.net|kaggle\.com|[a-z0-9-]+\.(vercel\.app|netlify\.app|github\.io|herokuapp\.com|onrender\.com|web\.app|firebaseapp\.com|streamlit\.app))(\/[^\s,|)]*)?)/i;
const ROLE_WORDS = /\b(intern(ship)?|engineer|developer|analyst|trainee|associate|manager|consultant|designer|lead|architect|specialist|scientist|administrator|executive|tester|programmer|assistant|coordinator|freelancer?|volunteer|apprentice|officer|technician|sde)\b/i;
const ORG_WORDS = /\b(pvt|private|ltd|limited|llp|inc|corp(oration)?|technologies|technology|solutions|systems|labs?|software|services|consult(ing|ancy)|infotech|tech|group|company|startup|foundation|university|institute)\b/i;
const DEGREE_WORDS = /\b(b\.?\s?tech|b\.?\s?e\b|b\.?\s?sc|bsc|b\.?\s?com|bca|b\.?\s?a\b|bba|m\.?\s?tech|m\.?\s?e\b|m\.?\s?sc|msc|mca|mba|m\.?\s?com|ph\.?d|diploma|bachelor|master|intermediate|higher\s+secondary|senior\s+secondary|secondary|ssc|hsc|cbse|icse|state\s+board|10th|12th|class\s+(x|xii|10|12)|puc|pre[-\s]?university)\b/i;
const INSTITUTION_WORDS = /\b(college|university|institute|school|academy|iit|nit|iiit|vidyalaya|polytechnic|campus)\b/i;
const VERBS = /^(achieved|analy[sz]ed|architected|automated|built|collaborated|conducted|configured|contributed|created|debugged|decreased|delivered|deployed|designed|developed|documented|drove|enabled|engineered|enhanced|established|executed|evaluated|handled|identified|implemented|improved|increased|integrated|launched|led|maintained|managed|mentored|migrated|modeled|monitored|optimi[sz]ed|organi[sz]ed|participated|performed|planned|prepared|presented|produced|programmed|reduced|refactored|researched|resolved|reviewed|scaled|secured|set\s+up|simplified|streamlined|supported|tested|trained|transformed|upgraded|used|utili[sz]ed|wrote|worked|cleaned|merged|visuali[sz]ed|analysed|explored|predicted|scraped|added|cut|raised|won|ranked|secured|completed)\b/i;

const isBulletMarker = (l: string) => /^[•\-–—*▪◦●○■□➤►✓✔]\s*/.test(l);
const stripMarker = (l: string) => l.replace(/^[•\-–—*▪◦●○■□➤►✓✔]\s*/, '').trim();
const headingOf = (l: string): Key | null => {
  const s = l.replace(/[:\s]+$/, '').trim();
  if (s.length > 45) return null;
  const h = HEADINGS.find(x => x.re.test(s));
  return h ? h.key : null;
};

/** Lines, with the line-wraps a PDF introduces joined back into one line. */
function logicalLines(text: string): string[] {
  const raw = cleanText(text).split('\n').map(l => l.trim());
  const out: string[] = [];
  for (const line of raw) {
    if (!line) { out.push(''); continue; }
    const prev = out.length ? out[out.length - 1] : '';
    // A contact detail on its own line (email, link, phone) never continues the line above.
    const contactLine = (x: string) => /@|linkedin\.|github\.|https?:|www\.|^\+?\d[\d\s-]{8,}$/i.test(x);
    const isContinuation = !!prev
      && !headingOf(prev) && !headingOf(line) && !isBulletMarker(line) && !contactLine(line) && !contactLine(prev)
      && (
        /^[a-z(]/.test(line)                                   // continues a sentence
        || /^\d[\d,.]*\s*(ms|s|sec|%|x|k|users?|rows?|students?|mb|gb)?\.?$/i.test(line) // "120 ms."
        || /[,–—\-|&]$/.test(prev)                              // previous line ends mid-thought
        || /^(\d{4}\b|present\b|current\b)/i.test(line) && /(–|—|-|to)\s*$/.test(prev)
        || (/^\|/.test(line))
      );
    if (isContinuation) out[out.length - 1] = `${prev} ${line}`.replace(/\s+/g, ' ');
    else out.push(line);
  }
  return out.filter(Boolean);
}

/** Split on the separators resumes use between fields, keeping parentheses together. */
function splitFields(l: string): string[] {
  const parts: string[] = []; let depth = 0; let cur = '';
  const s = l.replace(/\s+[|•·]\s+/g, ' \u0001 ').replace(/\s+[–—]\s+/g, ' \u0001 ').replace(/\s+-\s+/g, ' \u0001 ');
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === '\u0001' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += ch;
  }
  parts.push(cur);
  return parts.map(p => p.trim()).filter(Boolean);
}
function splitCommas(l: string): string[] {
  const parts: string[] = []; let depth = 0; let cur = '';
  for (const ch of l) {
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if ((ch === ',' || ch === ';' || ch === '|' || ch === '•' || ch === '·') && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += ch;
  }
  parts.push(cur);
  return parts.map(p => p.trim().replace(/\.$/, '')).filter(Boolean);
}

function dateRangeOf(l: string): { from: string; to: string; current: boolean; text: string } | null {
  const m = l.match(DATE_RANGE);
  if (!m) return null;
  const parts = m[0].split(/\s*(?:–|—|-|\bto\b|\btill\b|\buntil\b)\s*/i).filter(Boolean);
  const from = (parts[0] || '').trim();
  const toRaw = (parts[parts.length - 1] || '').trim();
  const current = /present|current|now|ongoing|date/i.test(toRaw);
  return { from, to: current ? 'Present' : toRaw, current, text: m[0] };
}
const removeText = (l: string, t: string) => l.replace(t, ' ').replace(/\(\s*\)/g, '').replace(/\s*[|,–—-]\s*$/, '').replace(/^\s*[|,–—-]\s*/, '').replace(/\s{2,}/g, ' ').trim();

/** Is this line a bullet (an achievement) rather than the header of a new job / project? */
function looksLikeBullet(l: string): boolean {
  if (isBulletMarker(l)) return true;
  const s = l.trim();
  if (DATE_RANGE.test(s) && s.length < 120) return false;
  if (VERBS.test(s)) return true;
  if (/[.!]$/.test(s) && s.split(/\s+/).length >= 8) return true;
  return false;
}

/** A second header line that belongs to the entry above: dates, a place, a link, a tech list, or the company/role half. */
function continuesHeader(head: string, l: string): boolean {
  if (DATE_RANGE.test(l) && l.replace(DATE_RANGE, '').replace(/[|,()\s–—-]/g, '').length < 40) return true;
  if (isLocation(l) || URL_RE.test(l) && l.split(/\s+/).length <= 3) return true;
  if (/^(tech(nologies)?(\s+used)?|stack|tools|environment)\s*:/i.test(l)) return true;
  if (ROLE_WORDS.test(head) !== ROLE_WORDS.test(l) && (ORG_WORDS.test(l) || ORG_WORDS.test(head))) return true;
  return false;
}

/** Labelled lines ("Project Title: …", "Company: …", "Description: …") that some resume formats use. */
const LABEL_NEW = /^(project\s+(title|name)|title|name\s+of\s+the\s+project|company(\s+name)?|organi[sz]ation|employer)\s*[:\-–]\s*/i;
const LABEL_HEAD = /^(role|designation|position|duration|period|location|technologies(\s+used)?|tech(nology)?\s+stack|tools(\s+used)?|environment|platform|link|github|url)\s*[:\-–]\s*/i;
const LABEL_TEXT = /^(description|details|summary|responsibilities|role\s+and\s+responsibilities|key\s+responsibilities|outcome|achievement|abstract)\s*[:\-–]\s*/i;

/** Group a section's lines into entries: a header line (plus up to two continuation lines), then its bullets. */
function entries(lines: string[]): { head: string; more: string[]; bullets: string[]; prose?: boolean }[] {
  const out: { head: string; more: string[]; bullets: string[]; prose?: boolean }[] = [];
  for (const raw of lines) {
    const l = raw.trim();
    if (!l) continue;
    const last = out[out.length - 1];
    if (LABEL_NEW.test(l)) { out.push({ head: l.replace(LABEL_NEW, '').trim(), more: [], bullets: [] }); continue; }
    if (last && LABEL_HEAD.test(l)) { last.more.push(l); continue; }
    if (last && LABEL_TEXT.test(l)) { const t = l.replace(LABEL_TEXT, '').trim(); if (t) { last.bullets.push(t); last.prose = true; } continue; }
    if (last && looksLikeBullet(l)) { last.bullets.push(stripMarker(l)); continue; }
    if (last && !last.bullets.length && last.more.length < 2 && continuesHeader(last.head, l)) { last.more.push(l); continue; }
    out.push({ head: stripMarker(l), more: [], bullets: [] });
  }
  return out;
}

const labelled = (more: string[], re: RegExp) => { const m = more.find(x => re.test(x)); return m ? m.replace(/^[^:\-–]+[:\-–]\s*/, '').trim() : ''; };
const unlabel = (x: string) => x.replace(LABEL_HEAD, '').trim();

function parseExperience(lines: string[]) {
  return entries(lines).map(e => {
    const labelledRole = labelled(e.more, /^(role|designation|position)\s*[:\-–]/i);
    let all = [e.head, ...e.more.filter(x => !/^(role|designation|position|location)\s*[:\-–]/i.test(x)).map(unlabel)].join(' | ');
    const dr = dateRangeOf(all) || (() => { const m = all.match(SINGLE_DATE); return m ? { from: m[0], to: '', current: false, text: m[0] } : null; })();
    if (dr) all = removeText(all, dr.text);
    const fields = splitFields(all.replace(/\s*\|\s*/g, ' | ')).flatMap(f => f.split(/\s+\bat\b\s+/i)).map(f => f.replace(/^[,(]+|[,)]+$/g, '').trim()).filter(Boolean);
    // "Role, Company" written with a comma
    const flat = fields.length === 1 && fields[0].includes(',') ? fields[0].split(/\s*,\s*/) : fields;
    let role = flat.find(f => ROLE_WORDS.test(f)) || '';
    let company = flat.find(f => f !== role && (ORG_WORDS.test(f) || /^[A-Z]/.test(f)) && !isLocation(f)) || '';
    if (!role && flat.length) role = flat[0] === company ? (flat[1] || '') : flat[0];
    if (!company) company = flat.find(f => f !== role && !isLocation(f)) || '';
    // "Company: Technical Hub, Surampalem / Role: Python Developer Intern": the labelled header line is the company, whole.
    if (labelledRole) { role = labelledRole; company = dr ? removeText(e.head, dr.text) : e.head; }
    return { company, role, from: dr?.from || '', to: dr?.to || '', current: !!dr?.current, bullets: e.bullets };
  }).filter(x => x.company || x.role || x.bullets.length);
}

const CITY_HINT = /\b(hyderabad|bengaluru|bangalore|chennai|pune|mumbai|delhi|new delhi|noida|gurgaon|gurugram|kolkata|ahmedabad|kochi|coimbatore|vizag|visakhapatnam|vijayawada|warangal|guntur|tirupati|mysuru|mysore|jaipur|indore|bhopal|lucknow|nagpur|chandigarh|remote|india|telangana|andhra pradesh|karnataka|tamil nadu|maharashtra|kerala|gujarat|west bengal|uttar pradesh|rajasthan)\b/i;
const isLocation = (s: string) => CITY_HINT.test(s) && s.split(/\s+/).length <= 5 && !ORG_WORDS.test(s);

function toHtmlList(bullets: string[], extra = ''): string {
  const b = bullets.map(x => x.trim()).filter(Boolean);
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  if (!b.length) return extra ? esc(extra) : '';
  // One long prose description stays a paragraph; one achievement line is still a bullet, like the others.
  if (b.length === 1 && !extra && b[0].split(/\s+/).length > 28) return esc(b[0]);
  return `${extra ? `<p>${esc(extra)}</p>` : ''}<ul>${b.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
}

function parseProjects(lines: string[]) {
  return entries(lines).map(e => {
    let all = [e.head, ...e.more.filter(m => !/^(tech(nologies|nology)?(\s+used)?|tech(nology)?\s+stack|stack|tools(\s+used)?|environment|platform|duration|period|role)\s*[:\-–]/i.test(m))].map(unlabel).join(' | ');
    const link = (all.match(URL_RE) || [''])[0];
    if (link) all = removeText(all, link);
    const dr = dateRangeOf(all); if (dr) all = removeText(all, dr.text);
    const fields = splitFields(all);
    let name = fields[0] || '';
    let tech: string[] = [];
    // "Name (React, Node)" or "Name | React, Node" or "Name – Subtitle | Tech"
    const paren = name.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    if (paren && paren[2].includes(',') || (paren && fields.length === 1)) { name = paren![1].trim(); tech = splitCommas(paren![2]); }
    // A comma list is a tech stack only when every item is short and none reads like prose ("MySQL CRUD app" does).
    const looksLikeTech = (f: string) => /^(tech(nologies)?|stack|tools)\s*:/i.test(f)
      || (f.includes(',') && splitCommas(f).every(x => x.split(/\s+/).length <= 3 && !/\b(app|application|for|with|using|the|an?|to|of|that|which|system|platform|website|portal|books?|users?)\b/i.test(x)));
    const techField = fields.slice(1).find(looksLikeTech);
    if (!tech.length && techField) tech = splitCommas(techField.replace(/^(tech(nologies)?(\s+used)?|stack|tools)\s*:\s*/i, ''));
    const rest = fields.slice(1).filter(f => f !== techField);
    // A long or comma-separated remainder is a description; a short one ("E-commerce Web App") belongs to the name.
    const descText = rest.filter(f => f.includes(',') || f.split(/\s+/).length > 6).join(' – ');
    const subtitle = rest.filter(f => !(f.includes(',') || f.split(/\s+/).length > 6)).join(' – ');
    if (subtitle) name = `${name} – ${subtitle}`;
    const extraLine = e.more.find(m => /^(tech(nologies|nology)?(\s+used)?|tech(nology)?\s+stack|stack|tools(\s+used)?|environment|platform)\s*[:\-–]/i.test(m));
    if (extraLine && !tech.length) tech = splitCommas(extraLine.replace(/^[^:]+:\s*/, ''));
    const bulletLink = e.bullets.map(b => (b.match(URL_RE) || [''])[0]).find(Boolean) || '';
    const bullets = e.bullets.filter(b => !/^(tech(nologies)?(\s+used)?|stack|tools)\s*:/i.test(b) || (tech.push(...splitCommas(b.replace(/^[^:]+:\s*/, ''))), false));
    return { name: name.trim(), tech: Array.from(new Set(tech)).slice(0, 15), description: e.prose && bullets.length === 1 ? toHtmlList([], bullets[0]) : (descText && !bullets.length ? toHtmlList([], descText) : toHtmlList(bullets, descText)), link: link || bulletLink };
  }).filter(p => p.name);
}

function parseEducation(lines: string[]) {
  // A new entry starts at a line that names a degree; other lines belong to the entry above.
  const groups: string[][] = [];
  const HEADER_ROW = /^(\s*[|]?\s*(qualification|degree|course|examination|class|institution|institute|college|school|university|board|year(\s+of\s+passing)?|passing\s+year|percentage|cgpa|gpa|marks|score|aggregate|grade|%)\s*(\/\s*\w+)?\s*[|]?)+$/i;
  for (const l of lines.filter(x => !HEADER_ROW.test(x.replace(/[|]/g, ' | ')))) {
    if (!groups.length || (DEGREE_WORDS.test(l) && groups[groups.length - 1].some(x => DEGREE_WORDS.test(x)))) groups.push([l]);
    else groups[groups.length - 1].push(l);
  }
  return groups.map(g => {
    let all = g.map(stripMarker).join(' | ');
    const score = (all.match(/(?:cgpa|gpa|cpi|sgpa|percentage|aggregate|marks|score)\s*[:\-]?\s*([\d.]+\s*(?:\/\s*10|%)?)/i)
      || all.match(/\b(\d{1,2}(?:\.\d{1,2})?)\s*(?:cgpa|gpa|cpi|sgpa)\b/i) || all.match(/\b(\d{2}(?:\.\d{1,2})?\s*%)/) || all.match(/\b(\d(?:\.\d{1,2})?\s*\/\s*10)\b/) || [])[1] || '';
    const dr = dateRangeOf(all);
    const yr = dr ? (dr.to && /\d/.test(dr.to) ? (dr.to.match(/(19|20)\d{2}/) || [''])[0] : dr.to) : ((all.match(/\b(19|20)\d{2}\b/g) || []).pop() || '');
    if (dr) all = removeText(all, dr.text);
    all = all.replace(/(?:cgpa|gpa|cpi|sgpa|percentage|aggregate|marks|score)\s*[:\-]?\s*[\d.]+\s*(?:\/\s*10|%)?/ig, ' ').replace(/\b\d{1,2}(?:\.\d{1,2})?\s*(?:cgpa|gpa|cpi|sgpa)\b/ig, ' ').replace(/\b\d{2}(?:\.\d{1,2})?\s*%/g, ' ').replace(/\(\s*\)/g, ' ');
    // Strip a bracket only when it is unbalanced: "Intermediate (MPC)" keeps both.
    const unwrap = (f: string) => { let x = f.replace(/^[\s,]+|[\s,]+$/g, ''); if (x.startsWith('(') && !x.includes(')')) x = x.slice(1); if (x.endsWith(')') && !x.includes('(')) x = x.slice(0, -1); return x.trim(); };
    const fields = splitFields(all.replace(/\s*\|\s*/g, ' | ')).flatMap(f => f.split(/\s*,\s*(?=[A-Z])/)).map(f => unwrap(f.replace(/\b(19|20)\d{2}\b/g, ''))).filter(f => f && !/^[|,\s()]+$/.test(f));
    const degreeIdx = fields.findIndex(f => DEGREE_WORDS.test(f));
    let degree = degreeIdx >= 0 ? fields[degreeIdx] : (fields[0] || '');
    // "B.Tech, Computer Science and Engineering" → keep the branch with the degree
    const next = degreeIdx >= 0 ? fields[degreeIdx + 1] : undefined;
    if (next && !INSTITUTION_WORDS.test(next) && !isLocation(next) && /\b(science|engineering|commerce|arts|technology|statistics|mathematics|physics|chemistry|electronics|mechanical|civil|electrical|information|computer|data|mpc|bipc|mec|cec)\b/i.test(next)) degree = `${degree}, ${next}`;
    let college = fields.find(f => INSTITUTION_WORDS.test(f) && f !== degree) || fields.find(f => f !== degree && !degree.includes(f) && !isLocation(f)) || '';
    // "Intermediate Narayana Junior College" in one cell: the institution starts at the first capitalised word after the degree.
    if (!college && INSTITUTION_WORDS.test(degree)) {
      const words = degree.split(/\s+/);
      const at = words.findIndex((w, i) => i > 0 && /^[A-Z]/.test(w) && !DEGREE_WORDS.test(words.slice(0, i + 1).join(' ').replace(words.slice(0, i).join(' '), '')) && !/^\(/.test(w) && !/^(of|in|and|&)$/i.test(w));
      if (at > 0) { college = words.slice(at).join(' '); degree = words.slice(0, at).join(' '); }
    }
    const location = fields.find(f => isLocation(f) && f !== college) || '';
    return { degree, college: college && location && !college.includes(location) ? `${college}, ${location}` : college, university: '', year: yr, cgpa: score.replace(/\s+/g, '') };
  }).filter(e => e.degree || e.college);
}

function parseSkills(lines: string[]) {
  const groups: { category: string; items: string[] }[] = [];
  const loose: string[] = [];
  for (const raw of lines) {
    const l = stripMarker(raw);
    const m = l.match(/^([A-Za-z][A-Za-z &/+().-]{1,40}?)\s*[:\-–]\s+(.+)$/);
    if (m && m[2].length > 1) groups.push({ category: m[1].trim(), items: splitCommas(m[2]) });
    else loose.push(...splitCommas(l));
  }
  const clean = (xs: string[]) => Array.from(new Set(xs.map(x => x.trim()).filter(x => x && x.length <= 50)));
  const out = groups.map(g => ({ category: g.category, items: clean(g.items) })).filter(g => g.items.length);
  if (loose.length) out.push({ category: out.length ? 'Other' : 'Skills', items: clean(loose) });
  return out;
}

function parseCertifications(lines: string[]) {
  return lines.map(stripMarker).filter(Boolean).map(l => {
    const year = (l.match(/\b(19|20)\d{2}\b/) || [''])[0];
    let rest = year ? removeText(l.replace(/\(\s*(19|20)\d{2}\s*\)/, ''), year) : l;
    const parts = splitFields(rest);
    if (parts.length >= 2) return { name: parts[0], issuer: parts.slice(1).join(', ').replace(/^by\s+/i, ''), year };
    const by = rest.match(/^(.*?)\s*(?:,|\bby\b|\bfrom\b)\s*([^,]+)$/i);
    if (by && by[2].split(/\s+/).length <= 5) return { name: by[1].trim(), issuer: by[2].trim(), year };
    return { name: rest.trim(), issuer: '', year };
  }).filter(c => c.name);
}

export function parseResumeTextByRules(rawText: string): IResumeSections {
  const out = getEmptySections();
  const text = cleanText(rawText);
  const lines = logicalLines(text);

  out.contact.email = (text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [''])[0];
  const phone = (text.match(/(\+?\d{1,3}[\s-]?)?(\(?\d{3,5}\)?[\s-]?)?\d{3,5}[\s-]?\d{3,5}/g) || [] as string[]).find((p: string) => p.replace(/\D/g, '').length >= 10 && p.replace(/\D/g, '').length <= 13 && !/^(19|20)\d{2}/.test(p.trim()));
  out.contact.phone = (phone || '').trim();
  out.contact.linkedin = (text.match(/(https?:\/\/)?(www\.)?linkedin\.com\/(in|pub)\/[^\s,|)]+/i) || [''])[0];
  out.contact.github = (text.match(/(https?:\/\/)?(www\.)?github\.com\/[A-Za-z0-9_-]+(?![\w/-])/i) || text.match(/(https?:\/\/)?(www\.)?github\.com\/[A-Za-z0-9_-]+/i) || [''])[0];
  const portfolio = (text.match(/(https?:\/\/[^\s,|)]+)|(\bwww\.[a-z0-9-]+\.[a-z.]{2,}[^\s,|)]*)|(\b[a-z0-9-]+\.(vercel\.app|netlify\.app|github\.io|herokuapp\.com|onrender\.com|web\.app)(\/[^\s,|)]*)?)/g) || []).find(u => !/github\.com\/[^/\s]+\/|linkedin\.com|github\.com\/?$/i.test(u) && !/github\.com\/[A-Za-z0-9_-]+$/i.test(u)) || '';
  out.contact.portfolio = portfolio && !/github\.com|linkedin\.com/i.test(portfolio) ? portfolio : '';

  // Header block: everything before the first heading.
  const firstHead = lines.findIndex(l => headingOf(l));
  const header = (firstHead === -1 ? lines.slice(0, 6) : lines.slice(0, firstHead)).slice(0, 8);
  const contactish = (l: string) => /@|\d{5}|linkedin|github|http|www\./i.test(l);
  const nameLine = header.find(l => !contactish(l) && l.length <= 40 && /^[A-Za-z][A-Za-z .'-]+$/.test(l) && l.split(/\s+/).length <= 5);
  out.contact.name = nameLine ? titleCaseName(nameLine) : '';
  const afterName = nameLine ? header.slice(header.indexOf(nameLine) + 1) : header;
  const titleLine = afterName.find(l => !contactish(l) && l.length <= 60 && !isLocation(l) && !/[|,]/.test(l) && /[A-Za-z]/.test(l));
  out.contact.title = titleLine || '';
  for (const l of header) {
    for (const piece of l.split(/\s*[|•·]\s*/)) if (!out.contact.location && isLocation(piece) && !/@/.test(piece)) out.contact.location = piece.trim();
  }

  const buckets: Partial<Record<Key, string[]>> = {};
  let current: Key | '' = '';
  for (const line of lines.slice(firstHead === -1 ? lines.length : firstHead)) {
    let head = headingOf(line);
    if (!head && line.includes(':')) {
      // "Skills: Java, SQL" opens a section; "Languages: Java, Python" inside Skills is a skill group, not the spoken-languages section.
      const before = line.split(':')[0];
      const after = line.split(':').slice(1).join(':').trim();
      const cand = headingOf(before);
      if (cand && (!after || !(current === 'skills' && (cand === 'ignore' || cand === 'skills' || cand === 'contact')))) head = cand;
    }
    if (head) {
      current = head;
      buckets[current] = buckets[current] || [];
      const after = line.includes(':') ? line.split(':').slice(1).join(':').trim() : '';
      if (after) buckets[current]!.push(after);
      continue;
    }
    if (current) buckets[current]!.push(line);
  }

  out.summary = (buckets.summary || []).map(stripMarker).join(' ').replace(/\s+/g, ' ').trim();
  out.skills = parseSkills(buckets.skills || []) as any;
  out.experience = parseExperience(buckets.experience || []) as any;
  out.projects = parseProjects(buckets.projects || []) as any;
  out.education = parseEducation(buckets.education || []) as any;
  out.certifications = [
    ...parseCertifications(buckets.certifications || []),
    // Achievements are kept whole ("Finalist, Smart India Hackathon 2024"); there is no issuer to split off.
    ...(buckets.achievements || []).map(stripMarker).filter(Boolean).map(l => ({ name: l.replace(/\s*\(?(19|20)\d{2}\)?\s*$/, '').trim(), issuer: '', year: (l.match(/(19|20)\d{2}/) || [''])[0] })),
  ] as any;
  if (!out.contact.location) {
    const pool = [...(buckets.contact || []), ...lines.slice(0, 25)];
    for (const l of pool) for (const piece of l.split(/\s*[|•·]\s*/)) if (!out.contact.location && isLocation(piece) && !/@|\d{4}/.test(piece)) out.contact.location = piece.trim();
  }
  return out;
}

const titleCaseName = (s: string) => (s === s.toUpperCase() ? s.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase()) : s).trim();

// ── The AI read, checked against the source ────────────────────────────────

const norm = (s: string) => String(s || '').toLowerCase().replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/[^a-z0-9%+#.]+/g, ' ').replace(/\s+/g, ' ').trim();
const tokens = (s: string) => norm(s).split(' ').filter(t => t.length > 1);

/** The source's lines, normalised, to look reworded values up in. */
class Source {
  readonly flat: string;
  readonly lines: string[];
  readonly tokenSet: Set<string>;
  constructor(text: string) {
    this.flat = norm(text);
    this.lines = logicalLines(text).map(stripMarker);
    this.tokenSet = new Set(tokens(text));
  }
  /** Share of the value's words that appear in the resume. */
  coverage(v: string): number { const t = tokens(v); return t.length ? t.filter(x => this.tokenSet.has(x)).length / t.length : 1; }
  contains(v: string): boolean { const n = norm(v); return !n || this.flat.includes(n); }
  /** The resume line closest to a (possibly reworded) value, if it is close enough to be the same line. */
  closestLine(v: string): string | null {
    const want = new Set(tokens(v)); if (!want.size) return null;
    let best: string | null = null; let bestScore = 0;
    for (const l of this.lines) {
      const lt = tokens(l); if (!lt.length) continue;
      const inter = lt.filter(x => want.has(x)).length;
      const score = (2 * inter) / (lt.length + want.size);
      if (score > bestScore) { bestScore = score; best = l; }
    }
    return bestScore >= 0.6 ? best : null;
  }
}

/** A short field (name, company, degree): kept only if its words are in the resume. */
const keepShort = (src: Source, v: any, min = 0.8): string => { const s = String(v ?? '').trim(); return s && src.coverage(s) >= min ? s : ''; };
/** A sentence (bullet, summary): kept verbatim if it is in the resume, replaced by the line it came from if reworded, dropped if invented. */
const keepSentence = (src: Source, v: any): string => {
  const s = String(v ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  if (src.contains(s)) return s;
  return src.closestLine(s) || '';
};

function verifyAgainstSource(ai: any, rules: IResumeSections, text: string): IResumeSections {
  const src = new Source(text);
  const out = getEmptySections();
  const c = ai?.contact || {};
  // Shapes beat the model for these; the model may fill what the rules missed if it is really in the text.
  out.contact = {
    name: keepShort(src, c.name, 1) || rules.contact.name,
    title: keepShort(src, c.title) || rules.contact.title || '',
    email: rules.contact.email || (src.contains(c.email) ? String(c.email || '') : ''),
    phone: rules.contact.phone || (String(c.phone || '').replace(/\D/g, '').length >= 10 && src.flat.replace(/\D/g, '').includes(String(c.phone).replace(/\D/g, '')) ? String(c.phone) : ''),
    linkedin: rules.contact.linkedin || (src.contains(c.linkedin) ? String(c.linkedin || '') : ''),
    github: rules.contact.github || (src.contains(c.github) ? String(c.github || '') : ''),
    portfolio: rules.contact.portfolio || (src.contains(c.portfolio) ? String(c.portfolio || '') : ''),
    location: keepShort(src, c.location) || rules.contact.location || '',
  };
  // The summary is copied whole; a paraphrase is replaced by the rules' read of the same section.
  const sum = String(ai?.summary || '').trim();
  out.summary = sum && src.contains(sum) ? sum : (rules.summary || (sum && src.coverage(sum) >= 0.9 ? sum : ''));

  const arr = (x: any) => (Array.isArray(x) ? x : []);
  out.experience = arr(ai?.experience).map((e: any) => ({
    company: keepShort(src, e.company), role: keepShort(src, e.role),
    from: keepShort(src, e.from, 0.5), to: /present|current/i.test(String(e.to)) ? 'Present' : keepShort(src, e.to, 0.5),
    current: !!e.current || /present|current/i.test(String(e.to)),
    bullets: Array.from(new Set(arr(e.bullets).map((b: any) => keepSentence(src, b)).filter(Boolean))),
  })).filter((e: any) => e.company || e.role) as any;
  out.education = arr(ai?.education).map((e: any) => ({
    degree: keepShort(src, e.degree), college: keepShort(src, e.college), university: keepShort(src, e.university),
    year: keepShort(src, e.year, 1), cgpa: src.flat.includes(norm(String(e.cgpa || '')).replace(/\s/g, '')) || src.contains(e.cgpa) ? String(e.cgpa || '') : '',
  })).filter((e: any) => e.degree || e.college) as any;
  out.skills = arr(ai?.skills).map((g: any) => ({
    category: String(g?.category || 'Skills').trim().slice(0, 40) || 'Skills',
    items: Array.from(new Set(arr(g?.items).map((s: any) => keepShort(src, s, 1)).filter(Boolean))),
  })).filter((g: any) => g.items.length) as any;
  out.projects = arr(ai?.projects).map((p: any) => {
    const bullets = Array.from(new Set((Array.isArray(p.bullets) ? p.bullets : String(p.description || '').split(/\n|(?<=\.)\s+(?=[A-Z])/)).map((b: any) => keepSentence(src, b)).filter(Boolean))) as string[];
    return {
      name: keepShort(src, p.name), tech: Array.from(new Set(arr(p.tech).map((t: any) => keepShort(src, t, 1)).filter(Boolean))),
      description: toHtmlList(bullets), link: src.contains(p.link) ? String(p.link || '') : '',
    };
  }).filter((p: any) => p.name) as any;
  out.certifications = arr(ai?.certifications).map((x: any) => ({
    name: keepShort(src, x.name), issuer: keepShort(src, x.issuer), year: keepShort(src, x.year, 1),
  })).filter((x: any) => x.name) as any;

  // Where the model returned nothing usable for a section, the rules' read stands.
  for (const k of ['experience', 'education', 'skills', 'projects', 'certifications'] as const) {
    if (!(out as any)[k].length && (rules as any)[k].length) (out as any)[k] = (rules as any)[k];
  }
  // Project links and tech the model missed but the rules found.
  out.projects = out.projects.map((p: any) => {
    const r = (rules.projects as any[]).find(x => norm(x.name).split(' ')[0] === norm(p.name).split(' ')[0]);
    return r ? { ...p, link: p.link || r.link, tech: p.tech.length ? p.tech : r.tech } : p;
  }) as any;
  return out;
}

async function aiJson(prompt: string, maxTokens: number): Promise<string | null> {
  try {
    if (isAnthropicEnabled()) {
      const anth = getAnthropic();
      if (anth) {
        const model = settings.getStr('INTERVIEW_AI_MODEL', 'claude-sonnet-4-6');
        const r: any = await anth.messages.create({ model, max_tokens: maxTokens, temperature: 0, messages: [{ role: 'user', content: prompt }] });
        const block = (r.content || []).find((b: any) => b.type === 'text');
        if (block?.text) return block.text;
      }
    }
  } catch (e: any) { console.error('[resume-parse] Anthropic failed, trying OpenAI:', String(e?.message || e).slice(0, 160)); }
  try {
    const openai = getOpenAI();
    if (!openai) return null;
    const model = settings.getStr('OPENAI_MODEL', 'gpt-4o-mini');
    const r = await openai.chat.completions.create({ model, temperature: 0, max_tokens: maxTokens, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: prompt }] });
    return r.choices[0]?.message?.content || null;
  } catch (e: any) { console.error('[resume-parse] OpenAI failed:', String(e?.message || e).slice(0, 160)); return null; }
}

/** Structure raw resume text into sections. Always returns something usable; never invents text. */
export async function parseResumeText(rawText: string): Promise<IResumeSections> {
  const text = cleanText(rawText);
  const rules = parseResumeTextByRules(text);
  const prompt = `You are a resume parser. Convert the resume text below into JSON.

RULES — follow exactly:
- COPY TEXT VERBATIM. Every string must be copied character-for-character from the resume. Do NOT rephrase, summarise, correct, shorten, expand or translate anything.
- Do NOT invent or infer anything that is not written in the resume. If a field is not present, use "" or [].
- Each bullet / achievement line is its own array item, copied exactly.
- Put each job or internship in "experience", each project in "projects". Do not merge entries.
- "title" is the headline under the name (e.g. "Java Full Stack Developer"), only if written.
- Skills: keep the resume's own grouping and category names when it has them; otherwise one group named "Skills".
- Achievements and awards go in "certifications" with an empty issuer if none is written.

Return ONLY this JSON object:
{"contact":{"name":"","title":"","email":"","phone":"","linkedin":"","github":"","portfolio":"","location":""},
 "summary":"",
 "experience":[{"company":"","role":"","from":"","to":"","current":false,"bullets":[""]}],
 "education":[{"degree":"","college":"","university":"","year":"","cgpa":""}],
 "skills":[{"category":"","items":[""]}],
 "projects":[{"name":"","tech":[""],"bullets":[""],"link":""}],
 "certifications":[{"name":"","issuer":"","year":""}]}

Resume text:
"""
${text.slice(0, 14000)}
"""`;
  const raw = await aiJson(prompt, 6000);
  if (!raw) return rules;
  try {
    const parsed = JSON.parse(raw.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim());
    return verifyAgainstSource(parsed, rules, text);
  } catch {
    console.error('[resume-parse] unreadable AI JSON; using the rule-based read');
    return rules;
  }
}

/** Exposed for tests. */
export const __test = { logicalLines, verifyAgainstSource, Source };
