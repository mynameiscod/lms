/**
 * Load the shipped question books (books/*.ts, listed in allBooks.ts) as CodeBegun books for every
 * institute.
 *
 * DRY RUN BY DEFAULT.
 *
 *   npx ts-node src/seeds/questionBooks/seedQuestionBooks.ts
 *   npx ts-node src/seeds/questionBooks/seedQuestionBooks.ts --apply
 *   npx ts-node src/seeds/questionBooks/seedQuestionBooks.ts --apply --overwrite
 *   npx ts-node src/seeds/questionBooks/seedQuestionBooks.ts --apply --only=hr-interview,sql-interview
 *   production: node dist/seeds/questionBooks/seedQuestionBooks.js --apply
 *
 * A book that does not exist is created, published. One that exists keeps an admin's edits: only new
 * chapters and new questions are added. --overwrite also rewrites its details and the text of its
 * shipped questions — IN PLACE, matched by chapter and position, so students' marks, favourites and
 * notes (which point at question ids) survive. Nothing is ever deleted.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { QuestionBook, BookQuestion } from '../../models/QuestionBook';
import { ALL_BOOKS } from './allBooks';
import { SeedBook } from './types';
dotenv.config();

const VALID_STAGES = new Set(['foundation', 'build', 'specialize', 'placement']);

/** Problems that would make a book look broken on the page. Checked before anything is written. */
export function lintBook(b: SeedBook, trackKeys?: Set<string>): string[] {
  const out: string[] = [];
  if (!/^[a-z0-9-]{3,60}$/.test(b.slug)) out.push(`slug "${b.slug}" must be lowercase letters, digits and dashes`);
  if (!b.title.trim()) out.push('no title');
  if (!b.chapters.length) out.push('no chapters');
  for (const s of b.stages) if (!VALID_STAGES.has(s)) out.push(`unknown stage "${s}"`);
  if (trackKeys) for (const t of b.tracks) if (!trackKeys.has(t)) out.push(`unknown track "${t}"`);
  const seen = new Set<string>();
  b.chapters.forEach((c, ci) => {
    if (!c.title.trim()) out.push(`chapter ${ci + 1} has no title`);
    if (!c.questions.length) out.push(`chapter "${c.title}" has no questions`);
    c.questions.forEach((q, qi) => {
      const where = `"${c.title}" Q${qi + 1}`;
      if (!q.q.trim() || !q.a.trim()) out.push(`${where}: empty question or answer`);
      if (q.q.length > 4000 || q.a.length > 12000) out.push(`${where}: too long`);
      const key = q.q.trim().toLowerCase();
      if (seen.has(key)) out.push(`${where}: duplicate question`);
      seen.add(key);
      if ((q.a.match(/```/g) || []).length % 2) out.push(`${where}: unclosed code block`);
    });
  });
  return out;
}

const bookDetails = (b: SeedBook) => ({
  title: b.title, kind: b.kind, subject: b.subject, description: b.description, color: b.color, emblem: b.emblem,
  audience: b.audience, stages: b.stages, tracks: b.tracks, order: b.order,
});

if (require.main === module) {
  (async () => {
    const apply = process.argv.includes('--apply');
    const overwrite = process.argv.includes('--overwrite');
    const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
    const books = only.length ? ALL_BOOKS.filter((b) => only.includes(b.slug)) : ALL_BOOKS;

    const { TRACKS } = await import('../careerPilot/careerTrackDefinitions');
    const trackKeys = new Set(TRACKS.map((t) => t.key));
    let bad = 0;
    for (const b of books) {
      const issues = lintBook(b, trackKeys);
      if (issues.length) { bad++; console.error(`✗ ${b.slug}:\n   ${issues.join('\n   ')}`); }
    }
    if (bad) { console.error(`\n${bad} book(s) have problems. Nothing was written.`); process.exit(1); }

    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
    console.log(`\nQUESTION BOOKS — ${books.length} book(s) — ${apply ? (overwrite ? 'APPLY, OVERWRITE' : 'APPLY') : 'DRY RUN'}\n`);

    let created = 0; let added = 0; let rewritten = 0;
    for (const b of books) {
      const total = b.chapters.reduce((n, c) => n + c.questions.length, 0);
      let book: any = await QuestionBook.findOne({ scope: 'global', tenantId: null, slug: b.slug });
      if (!book) {
        console.log(`+ ${b.slug}: new book, ${b.chapters.length} chapters, ${total} questions`);
        created++;
        if (!apply) continue;
        book = await QuestionBook.create({
          ...bookDetails(b), scope: 'global', tenantId: null, slug: b.slug, status: 'draft', createdBy: 'seed',
          chapters: b.chapters.map((c, i) => ({ title: c.title, order: i })),
        });
      } else if (overwrite && apply) {
        Object.assign(book, bookDetails(b));
      }

      // Chapters by title: existing ones keep their id (questions point at it); missing ones are added.
      const chapterId = new Map<string, string>();
      for (const c of book.chapters || []) chapterId.set(String(c.title).trim().toLowerCase(), String(c._id));
      const newChapters = b.chapters.filter((c) => !chapterId.has(c.title.trim().toLowerCase()));
      if (newChapters.length) {
        console.log(`  ${b.slug}: ${newChapters.length} new chapter(s)`);
        if (apply) {
          const base = (book.chapters || []).length;
          newChapters.forEach((c, i) => book.chapters.push({ title: c.title, order: base + i }));
          await book.save();
          for (const c of book.chapters) chapterId.set(String(c.title).trim().toLowerCase(), String(c._id));
        }
      }
      if (!apply) {
        const existing = await BookQuestion.countDocuments({ bookId: book._id });
        if (existing < total) console.log(`~ ${b.slug}: ${total - existing} question(s) to add${overwrite ? ', shipped text to rewrite' : ''}`);
        continue;
      }

      for (const c of b.chapters) {
        const cid = chapterId.get(c.title.trim().toLowerCase())!;
        const have: any[] = await BookQuestion.find({ bookId: book._id, chapterId: cid }).sort({ order: 1, createdAt: 1 }).lean();
        for (let i = 0; i < c.questions.length; i++) {
          const q = c.questions[i];
          const doc = { question: q.q.trim(), answer: q.a.trim(), difficulty: q.d || 'medium', askedAt: q.at || '', tip: q.tip || '' };
          const at = have[i];
          if (!at) { await BookQuestion.create({ bookId: book._id, chapterId: cid, order: i, ...doc }); added++; }
          else if (overwrite) { await BookQuestion.updateOne({ _id: at._id }, { $set: doc }); rewritten++; }
        }
      }
      book.questionCount = await BookQuestion.countDocuments({ bookId: book._id });
      book.status = 'published';
      await book.save();
      console.log(`✓ ${b.slug}: ${book.questionCount} questions, published`);
    }
    console.log(`\n${apply ? 'Done' : 'Would do'}: ${created} new book(s)${apply ? `, ${added} question(s) added, ${rewritten} rewritten` : ''}.${apply ? '' : ' Run with --apply to write.'}`);
    await mongoose.disconnect();
  })().catch(async (e) => {
    console.error(e);
    await mongoose.disconnect().catch(() => undefined);
    process.exit(1);
  });
}
