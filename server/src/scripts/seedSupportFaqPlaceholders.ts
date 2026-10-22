/**
 * Help Center — PLACEHOLDER STRUCTURE ONLY.
 *
 *   npx ts-node src/scripts/seedSupportFaqPlaceholders.ts [--tenant <tenantId>] [--apply]
 *   node dist/scripts/seedSupportFaqPlaceholders.js [--tenant <tenantId>] [--apply]
 *
 * Writes one DRAFT article per category, every one marked "needs owner review", with a
 * question that names a topic and an answer that is an instruction to the editor — never a
 * claim about features, fees, policies or response times. Drafts are invisible to members and
 * to the assistant, and cannot be published until someone clears the review box.
 *
 * Without --tenant the articles are platform-wide (written by the support HQ for everyone).
 * Without --apply it only prints what it would do. Safe to re-run: an existing placeholder
 * (same question, same scope) is left alone.
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import SupportFaq from '../models/SupportFaq';
import { SupportModule } from '../data/supportPolicy';

dotenv.config();

export const PLACEHOLDER_MARK = '[DRAFT — needs owner review]';

export const PLACEHOLDERS: { category: string; module: SupportModule; question: string; keywords: string[] }[] = [
  { category: 'Account & login', module: 'account', question: 'How do I sign in or reset my password?', keywords: ['login', 'password', 'otp', 'sign in'] },
  { category: 'Membership & payment', module: 'payment', question: 'What happens after I pay for a membership?', keywords: ['payment', 'membership', 'receipt'] },
  { category: 'Assessment & results', module: 'assessment', question: 'How is my assessment result worked out?', keywords: ['assessment', 'score', 'result'] },
  { category: 'Learning plan & roadmap', module: 'plan', question: 'Why can I open only one day at a time?', keywords: ['day', 'plan', 'roadmap', 'locked'] },
  { category: 'Practice & coding', module: 'coding', question: 'My code runs on my computer but fails here. What should I check?', keywords: ['code', 'run', 'tests', 'compile'] },
  { category: 'Interviews & communication', module: 'interview', question: 'How do mock interviews work?', keywords: ['interview', 'mock', 'microphone'] },
  { category: 'Career tracks', module: 'career_tracks', question: 'How do I choose or change my career track?', keywords: ['track', 'career', 'change'] },
  { category: 'Technical problems', module: 'other', question: 'A page does not load or keeps spinning. What can I try?', keywords: ['loading', 'blank', 'error', 'browser'] },
];

export const placeholderAnswer = (category: string) =>
  `${PLACEHOLDER_MARK}\n\nWrite the answer for "${category}" here, using only what is true for this platform today. ` +
  'Do not state fees, refund rules, response times or features unless they are confirmed. ' +
  'When the answer is ready, clear "needs owner review" and publish.';

export async function seedPlaceholders(tenantId: string | null, apply: boolean) {
  const made: string[] = []; const kept: string[] = [];
  for (const p of PLACEHOLDERS) {
    const exists = await SupportFaq.exists({ tenantId, question: p.question });
    if (exists) { kept.push(p.question); continue; }
    if (apply) {
      await SupportFaq.create({
        tenantId, question: p.question, answer: placeholderAnswer(p.category), category: p.category, module: p.module,
        keywords: p.keywords, status: 'draft', needsOwnerReview: true,
      });
    }
    made.push(p.question);
  }
  return { made, kept };
}

async function main() {
  const at = process.argv.indexOf('--tenant');
  const tenantId = at > -1 ? process.argv[at + 1] : null;
  if (tenantId && !mongoose.isValidObjectId(tenantId)) { console.error('Usage: seedSupportFaqPlaceholders [--tenant <tenantId>] [--apply]'); process.exit(1); }
  const apply = process.argv.includes('--apply');
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
  const r = await seedPlaceholders(tenantId, apply);
  console.log(`${apply ? 'APPLIED' : 'DRY RUN'} — ${tenantId ? `tenant ${tenantId}` : 'platform-wide'}`);
  r.made.forEach(q => console.log(`  ${apply ? 'created' : 'would create'} draft: ${q}`));
  r.kept.forEach(q => console.log(`  already there:  ${q}`));
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch(async (e) => { console.error('FAILED', e?.message || e); await mongoose.disconnect(); process.exit(1); });
}
