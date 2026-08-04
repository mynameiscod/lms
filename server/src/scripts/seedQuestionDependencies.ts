/**
 * Conditional assessment questions.
 *
 * Stage tagging decides WHO is asked something. It cannot decide whether two questions
 * make sense next to each other, and that is a different kind of wrong: a final-year who
 * answers "resume: not written" and is then asked "how many companies have you applied to
 * in the last month?" is looking at a form that is not listening. They stop trusting the
 * score before they reach it.
 *
 * A child question declares `dependsOn: { questionId, minChosen }` and is only asked when
 * the parent was answered at that option index or above. Options are ordered low → high
 * throughout the bank, so "at least index 1" means "anything other than the worst case".
 *
 * Two rules learned writing these:
 *
 *   - Parent and child must share a stage band. If the parent is not on the paper the
 *     child is dropped, so a parent tagged `placement` and a child tagged
 *     `placement + job_seeker` silently loses the child for every job seeker. Where that
 *     happened, the PARENT is widened rather than the child narrowed — see RETAG below.
 *   - Only link things that are genuinely impossible, not merely unusual. "How many mock
 *     interviews have you sat?" looks like it should depend on having applied somewhere,
 *     but mock interviews need no application at all, so linking them would hide a fair
 *     question from exactly the people who most need it asked.
 *
 * Run: npx ts-node src/scripts/seedQuestionDependencies.ts <tenantId>
 * Idempotent. Matched on exact question text; reports anything it could not find.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PassportAssessment from '../models/PassportAssessment';

dotenv.config();

/** Parent must cover at least every stage the child does, or the child gets dropped. */
const RETAG: { text: string; stages: string[] }[] = [
  {
    // Was 'placement' only, while its child also serves job seekers. A graduate looking
    // for work needs a ready resume just as much as a final-year does.
    text: 'Is your resume ready to send to a recruiter today?',
    stages: ['placement', 'job_seeker'],
  },
];

const LINKS: { child: string; parent: string; minChosen: number; why: string }[] = [
  {
    child:  'How many companies have you applied to in the last month?',
    parent: 'Is your resume ready to send to a recruiter today?',
    minChosen: 1,   // options: Not written | Rough draft | Written, not reviewed | Reviewed and ready
    why: 'You cannot have applied anywhere without a resume of some kind.',
  },
  {
    child:  'Can you explain your best project clearly in about three minutes?',
    parent: 'How many projects can you show (GitHub/demo)?',
    minChosen: 1,   // options: 0 | 1 | 2 | 3+
    why: 'Asking someone to pitch a project they have just said they do not have.',
  },
];

async function run() {
  const tenantId = process.argv[2];
  if (!tenantId) { console.error('Usage: seedQuestionDependencies.ts <tenantId>'); process.exit(1); }

  await mongoose.connect(process.env.MONGODB_URI as string);
  const a: any = await PassportAssessment.findOne({ tenantId });
  if (!a) { console.error('No assessment for that tenant.'); process.exit(1); }

  const byText = (t: string) => a.questions.find((q: any) => q.text === t);

  let retagged = 0;
  for (const r of RETAG) {
    const q = byText(r.text);
    if (!q) { console.log(`  ! retag target not found: ${r.text}`); continue; }
    if (JSON.stringify(q.stages || []) !== JSON.stringify(r.stages)) { q.stages = r.stages; retagged++; }
  }

  let linked = 0, missing = 0;
  for (const l of LINKS) {
    const child = byText(l.child), parent = byText(l.parent);
    if (!child || !parent) {
      console.log(`  ! missing ${!parent ? 'PARENT' : 'CHILD'}: ${!parent ? l.parent : l.child}`);
      missing++;
      continue;
    }
    // Guard the rule that bit me: a parent that does not cover the child's stages will
    // cause the child to vanish for the stages it does not cover.
    const cs: string[] = child.stages || [], ps: string[] = parent.stages || [];
    const uncovered = ps.length ? cs.filter(s => !ps.includes(s)) : [];
    if (uncovered.length) {
      console.log(`  ! ${l.child}\n      child covers ${uncovered.join(', ')} but parent does not — child would be dropped there.`);
      missing++;
      continue;
    }
    child.dependsOn = { questionId: String(parent._id), minChosen: l.minChosen };
    linked++;
  }

  a.markModified('questions');
  await a.save();

  console.log(`\nDependencies — linked ${linked}, retagged ${retagged}, skipped ${missing}`);
  for (const l of LINKS) {
    const child = byText(l.child);
    if (child?.dependsOn?.questionId) {
      console.log(`  "${l.child}"\n     asked only if "${l.parent}" >= option ${l.minChosen}`);
    }
  }

  await mongoose.disconnect();
}

if (require.main === module) run().catch(e => { console.error(e); process.exit(1); });
