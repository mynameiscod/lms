import { aiComplete } from './aiGateway';
import * as settings from './settingsService';
import { IPlacementPartner } from '../models/PlacementPartner';
import { coldEmail, followupEmail, outreachSignature, outreachSigner, Draft } from './outreachTemplates';

/**
 * outreachAIService — LLM-personalised placement outreach copy.
 *
 * The AI writes only the MESSAGE (greeting → pitch → ask); we append the fixed
 * CodeBegun signature (`outreachSignature`) so branding/contact stay controlled.
 * Everything degrades gracefully: if AI is disabled, unconfigured, slow, or
 * returns junk, we fall back to the hand-written static template — so a send
 * never fails because of AI.
 *
 * Toggle per-tenant via setting PLACEMENT_AI_COPY ('false' to force templates).
 */

const CODEBEGUN_CONTEXT =
  `CodeBegun is a Java Full Stack training & placement institute in Hyderabad. We train and internally screen freshers until they are job-ready: Java, Spring Boot, Microservices, REST APIs, React.js, JavaScript, SQL, Data Structures, plus real project work, communication and mock interviews. Every candidate clears our internal screening (technical assessment, live coding, project + communication checks). There is NO recruitment or evaluation fee for reviewing or interviewing our candidates.`;

const aiEnabled = (tenantId: string) => settings.getStr('PLACEMENT_AI_COPY', 'true', tenantId) !== 'false';
const first = (name?: string) => (name || '').trim().split(/\s+/)[0] || 'there';

/** Pull {subject, message} out of a model response (tolerates code fences / prose). */
function parse(text: string): { subject?: string; message?: string } | null {
  try {
    const m = text.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  } catch {
    return null;
  }
}

const RULES =
  `Return ONLY strict JSON: {"subject": string, "message": string}. Plain text only — NO markdown (no **bold**, no ##). The message must start with "Hi {firstName}," use blank lines between short paragraphs, and MUST NOT include any signature or sign-off (added separately). Warm, specific, human — never spammy or a mass blast. Ground it ONLY in the facts given; do not invent anything about the company.`;

export async function generateColdEmail(partner: IPlacementPartner, senderName: string): Promise<Draft> {
  const tenantId = partner.tenantId.toString();
  if (!aiEnabled(tenantId)) return coldEmail(partner, senderName);

  const fn = first(partner.contactName);
  const { short } = outreachSigner(senderName);
  const angle = partner.outreachAngle?.trim();
  const system =
    `You write warm, concise B2B placement-outreach intro emails to a company's HR / hiring manager, as ${short}, Founder of CodeBegun. Keep it ~120-160 words. Include a short "• " bullet list of the most relevant skills. End with a clear, low-friction ask for their fresher hiring requirements or the right HR/Talent Acquisition contact, and note there is no evaluation fee. ${CODEBEGUN_CONTEXT} ${RULES.replace('{firstName}', fn)}`;
  const user =
    `Company: ${partner.companyName}\nContact: ${partner.contactName || '(unknown)'}${partner.contactTitle ? ` — ${partner.contactTitle}` : ''}\nWhy we're reaching out / signal: ${angle || 'They likely hire Java / Java Full Stack developers.'}\n\nWrite the intro email.`;

  try {
    const raw = await aiComplete({ tenantId, module: 'placement_outreach', system, user, maxTokens: 550, prefer: 'anthropic' });
    const p = parse(raw);
    if (!p?.message || !/\S/.test(p.message)) throw new Error('empty message');
    const subject = (p.subject || 'Pre-screened Java Full Stack freshers ready for interview | CodeBegun').trim();
    return { subject, body: `${p.message.trim()}${outreachSignature(senderName)}` };
  } catch (e: any) {
    console.warn('[outreachAI] cold generation failed — using template:', e?.message);
    return coldEmail(partner, senderName);
  }
}

export async function generateFollowup(partner: IPlacementPartner, step: number, senderName: string): Promise<Draft> {
  const tenantId = partner.tenantId.toString();
  if (!aiEnabled(tenantId)) return followupEmail(partner, step, senderName);

  const fn = first(partner.contactName);
  const guide = step <= 1
    ? 'First gentle follow-up (no reply yet): float the offer back to the top of their inbox. Very short (60-90 words), friendly.'
    : step === 2
      ? 'Second, near-final nudge: short; offer a quick "not now" as an easy out.'
      : 'Final message: a graceful close — say you will stop emailing and they can reply anytime.';
  const system =
    `You write brief, warm B2B follow-up emails for CodeBegun placements to a company's HR/hiring manager. ${guide} ${CODEBEGUN_CONTEXT} ${RULES.replace('{firstName}', fn)}`;
  const user = `Company: ${partner.companyName}\nContact: ${partner.contactName || '(unknown)'}\n\nWrite follow-up #${step}.`;

  try {
    const raw = await aiComplete({ tenantId, module: 'placement_outreach', system, user, maxTokens: 350, prefer: 'anthropic' });
    const p = parse(raw);
    if (!p?.message || !/\S/.test(p.message)) throw new Error('empty message');
    const subject = (p.subject || `Re: Java Full Stack freshers for ${partner.companyName} | CodeBegun`).trim();
    return { subject, body: `${p.message.trim()}${outreachSignature(senderName)}` };
  } catch (e: any) {
    console.warn('[outreachAI] follow-up generation failed — using template:', e?.message);
    return followupEmail(partner, step, senderName);
  }
}
