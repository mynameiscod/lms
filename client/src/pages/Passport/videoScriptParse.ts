import { VideoScriptScene } from '../../api/passportApi';

/**
 * Turn a whole pasted script into scenes, so an admin pastes once instead of filling scene by
 * scene. Understands the ways scripts are usually written:
 *
 *   Scene 1: Hook — why folders exist        (also "SCENE 2", "Shot 3 -", "Part 4.", "## Intro")
 *   On screen: presenter to camera            (also Visual / Screen / Show / B-roll / Camera)
 *   Say: Every file on your laptop…           (also Narration / VO / Voice-over / Script / Audio)
 *   Notes: slow down here                     (also Note / Director / Tip / Direction)
 *   [Terminal: ls -la]                        a whole line in brackets is what is on screen
 *
 * and a two-column table copied from Google Docs or Word (cells come as tabs) or written in
 * Markdown (| On screen | Say |): one row per scene. Text without a label is what is said.
 * With no scene markers at all, each blank-line-separated block becomes a scene.
 *
 * Lines before the first scene may set the script's details: Title, Presenter, Objective and
 * Target / Duration ("8 min").
 */

export interface ParsedScript {
  scenes: VideoScriptScene[];
  title?: string;
  presenter?: string;
  objective?: string;
  targetMinutes?: number;
}

type Field = 'heading' | 'visual' | 'narration' | 'notes';

const SEP = String.raw`\s*(?:[:\-–—=|)]|\.(?!\d))\s*`;
// "Scene" may stand alone; Shot / Part / Segment / Section only with a number ("Shot: wide" is a
// screen direction, not a new scene).
const SCENE_RE = new RegExp(String.raw`^\s*(?:#{1,4}\s*)?(?:\*\*)?(?:scene(?:\s*(?:no\.?\s*)?\d+[a-z]?)?|(?:shot|segment|part|section)\s*(?:no\.?\s*)?\d+[a-z]?)(?:\*\*)?(?:${SEP}(.*))?$`, 'i');
const MD_HEAD_RE = /^\s*#{1,4}\s+(.+)$/;
const LABELS: [Field, RegExp][] = [
  ['visual', /^(?:on[\s-]?screen|visuals?|screen|show(?:s)?|b[\s-]?roll|camera|shot|graphics?|display)$/i],
  ['narration', /^(?:say|says|narration|narrator|vo|v\.o\.?|voice[\s-]?over|script|audio|dialogue|presenter says|speak|spoken)$/i],
  ['notes', /^(?:notes?|director'?s? notes?|director|tips?|direction|remarks?)$/i],
  ['heading', /^(?:heading|scene title|title)$/i],
];
const META: [keyof Omit<ParsedScript, 'scenes'>, RegExp][] = [
  ['title', /^(?:video title|title)$/i],
  ['presenter', /^(?:presenter|host|on camera|speaker)$/i],
  ['objective', /^(?:objective|goal|learning objective|after watching.*)$/i],
  ['targetMinutes', /^(?:target(?: minutes| length| duration)?|duration|length|runtime)$/i],
];

const clean = (s: string) => s.replace(/\*\*|__/g, '').trim();
/** "Say: hello" → ['Say', 'hello'] when the part before the colon is a short label. */
const splitLabel = (line: string): [string, string] | null => {
  const m = line.match(/^\s*[-*•]?\s*(?:\*\*)?([A-Za-z][A-Za-z .'’/-]{0,28}?)(?:\*\*)?\s*[:\-–—]\s*(?:\*\*)?\s*(.*)$/);
  return m ? [m[1].trim(), m[2]] : null;
};
const fieldOf = (label: string): Field | null => {
  for (const [f, re] of LABELS) if (re.test(label)) return f;
  return null;
};
const blank = (): VideoScriptScene => ({ heading: '', visual: '', narration: '', notes: '' });
const hasText = (s: VideoScriptScene) => !!(s.heading.trim() || s.visual.trim() || s.narration.trim() || s.notes.trim());
const tidy = (s: VideoScriptScene): VideoScriptScene => ({
  heading: s.heading.trim().slice(0, 200),
  visual: s.visual.replace(/\n{3,}/g, '\n\n').trim(),
  narration: s.narration.replace(/\n{3,}/g, '\n\n').trim(),
  notes: s.notes.replace(/\n{3,}/g, '\n\n').trim(),
});

/** A pasted table: every non-empty line has a tab, or is a Markdown table row. */
function parseTable(lines: string[]): VideoScriptScene[] | null {
  const rows = lines.filter(l => l.trim());
  if (rows.length < 2) return null;
  const md = rows.every(l => /^\s*\|.*\|\s*$/.test(l));
  const tabbed = rows.filter(l => l.includes('\t')).length >= rows.length * 0.8;
  if (!md && !tabbed) return null;
  const cells = rows
    .filter(l => !(md && /^\s*\|[\s:|-]+\|\s*$/.test(l)))          // the |---|---| line
    .map(l => (md ? l.trim().replace(/^\||\|$/g, '').split('|') : l.split('\t')).map(c => c.trim()));
  // Which column is which: read the header row if it names them, else guess by count.
  let cols: (Field | null)[] = [];
  const head = cells[0].map(c => fieldOf(clean(c).replace(/[^A-Za-z .'-]/g, '').trim()) || (/^(?:scene|#|no\.?|s\.?\s*no\.?)$/i.test(clean(c)) ? 'heading' : null));
  const headed = head.filter(Boolean).length >= 2;
  if (headed) { cols = head; cells.shift(); }
  else {
    const n = Math.max(...cells.map(r => r.length));
    cols = n >= 4 ? ['heading', 'visual', 'narration', 'notes'] : n === 3 ? ['heading', 'visual', 'narration'] : ['visual', 'narration'];
  }
  const scenes = cells.map(r => {
    const s = blank();
    r.forEach((c, i) => { const f = cols[i]; if (f) s[f] = (s[f] ? `${s[f]}\n` : '') + clean(c).replace(/<br\s*\/?>/gi, '\n'); });
    if (/^\d+$/.test(s.heading)) s.heading = '';
    return tidy(s);
  }).filter(hasText);
  return scenes.length ? scenes : null;
}

export function parseVideoScript(text: string): ParsedScript {
  const out: ParsedScript = { scenes: [] };
  const lines = text.replace(/\r\n?/g, '\n').split('\n');

  const table = parseTable(lines);
  if (table) { out.scenes = table; return out; }

  const hasMarkers = lines.some(l => SCENE_RE.test(l) || MD_HEAD_RE.test(l));
  const hasLabels = lines.some(l => { const lab = splitLabel(l); return !!lab && !!fieldOf(lab[0]); });
  let cur: VideoScriptScene | null = null;
  let field: Field = 'narration';
  const push = () => { if (cur && hasText(cur)) out.scenes.push(tidy(cur)); };
  const add = (f: Field, t: string) => {
    if (!cur) cur = blank();
    if (f === 'heading') { cur.heading = clean(t); return; }
    cur[f] = cur[f] ? `${cur[f]}\n${t}` : t;
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    const sc = line.match(SCENE_RE);
    const md = !sc && line.match(MD_HEAD_RE);
    if (sc || md) {
      push();
      cur = blank(); field = 'narration';
      const rest = clean(sc ? sc[1] || '' : (md as RegExpMatchArray)[1]);
      // "Scene 2 — On screen: the terminal" puts a label straight after the marker.
      const lab = rest && splitLabel(rest);
      const f = lab && fieldOf(lab[0]);
      if (f && f !== 'heading') { field = f; if (lab![1].trim()) add(f, lab![1]); }
      else cur.heading = rest;
      continue;
    }
    if (!line.trim()) {
      // Plain paragraphs (no scene markers, no labels): each one is a scene. Otherwise a blank
      // line is a paragraph break inside the field being written.
      if (!hasMarkers && !hasLabels && cur && hasText(cur)) { push(); cur = null; field = 'narration'; }
      else if (cur && cur[field]) cur[field] += '\n';
      continue;
    }
    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { push(); cur = null; field = 'narration'; continue; }

    // A whole line in brackets is a direction for the screen.
    const br = line.match(/^\s*[[(](.+)[\])]\s*$/);
    if (br) { add('visual', br[1].trim()); continue; }

    const lab = splitLabel(line);
    if (lab) {
      // Details of the whole script, written before the first scene.
      if (!cur && !out.scenes.length) {
        const meta = META.find(([, re]) => re.test(lab[0]));
        if (meta) {
          const v = clean(lab[1]);
          if (meta[0] === 'targetMinutes') { const n = parseFloat(v); if (n > 0) out.targetMinutes = Math.min(180, Math.round(n)); }
          else (out as any)[meta[0]] = v;
          continue;
        }
      }
      const f = fieldOf(lab[0]);
      if (f) {
        // Without scene markers, a label that comes round again starts the next scene.
        if (!hasMarkers && cur && (cur as VideoScriptScene)[f] && (f === 'visual' || f === 'heading')) { push(); cur = null; }
        field = f; if (lab[1].trim()) add(f, lab[1]); continue;
      }
    }
    add(field, line.trim());
  }
  push();
  // A lone heading at the top ("# How Files Are Organised") is the video's title, not a scene.
  const first = out.scenes[0];
  if (first && out.scenes.length > 1 && first.heading && !first.visual && !first.narration && !first.notes) {
    if (!out.title) out.title = first.heading;
    out.scenes.shift();
  }
  return out;
}
