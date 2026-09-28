import { IWhatsAppTemplate } from '../models/WhatsAppTemplate';

/**
 * The SHAPE of a template — how many body variables, where its dynamic url button sits,
 * what header it declares — and building a send's `components` from it. Kept apart from
 * the management service so the send path (assessmentOtpService) can use it without an
 * import cycle.
 */

export const varIndexes = (s: string) => Array.from(String(s || '').matchAll(/\{\{\s*(\d+)\s*\}\}/g)).map((m) => Number(m[1]));

export function templateShape(t: Pick<IWhatsAppTemplate, 'body' | 'header' | 'buttons' | 'category'>) {
  const idx = varIndexes(t.body);
  const bodyVarCount = idx.length ? Math.max(...idx) : 0;
  const urlButtonIndex = (t.buttons || []).findIndex((b) => b.type === 'OTP' || (b.type === 'URL' && /\{\{\s*1\s*\}\}/.test(b.url || '')));
  return {
    bodyVarCount,
    urlButtonIndex,
    headerFormat: t.header?.format || 'NONE',
    headerHasVars: /\{\{/.test(t.header?.text || ''),
  };
}

/**
 * Build the `components` of a send from a template's shape — so a caller supplying more
 * values than the template uses, or a url param the template has no slot for, still sends.
 */
export function buildSendComponents(
  t: Pick<IWhatsAppTemplate, 'body' | 'header' | 'buttons' | 'category'>,
  opts: { body: string[]; urlButtonParam?: string; headerImageUrl?: string },
): any[] {
  const s = templateShape(t);
  const clean = (v: string) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim();
  const comps: any[] = [];
  if (s.headerFormat === 'IMAGE') {
    const link = (opts.headerImageUrl && /^https:\/\//i.test(opts.headerImageUrl)) ? opts.headerImageUrl : t.header?.imageUrl;
    if (link) comps.push({ type: 'header', parameters: [{ type: 'image', image: { link } }] });
  }
  if (s.bodyVarCount > 0) {
    comps.push({ type: 'body', parameters: opts.body.slice(0, s.bodyVarCount).map((v) => ({ type: 'text', text: clean(v) || '-' })) });
  }
  if (s.urlButtonIndex >= 0 && opts.urlButtonParam) {
    comps.push({ type: 'button', sub_type: 'url', index: String(s.urlButtonIndex), parameters: [{ type: 'text', text: clean(opts.urlButtonParam) }] });
  }
  return comps;
}

