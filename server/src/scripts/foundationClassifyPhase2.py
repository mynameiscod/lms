# -*- coding: utf-8 -*-
"""
Phase 2 — write the classification of the 366 existing questions, and prove it is sound.

READ-ONLY WITH RESPECT TO THE DATABASE. No database client is imported. Two CSVs are written;
the 366 source records are re-emitted with their 27 columns byte-for-byte and only the seven
classification columns filled.

WHAT IT REFUSES TO LET THROUGH
  - a classification naming a conceptId, factId or familyId that is not in the frozen blueprint
  - a familyId whose skill differs from the question's skill
  - a proposedDifficulty outside the family's own allowedDifficultyMin..Max range
  - a KEEP or REWRITE with no family, or a REJECT that is not explained
  - any question left unclassified, or classified twice
  - any change to a source column, compared field by field against the input

Every one of those is a way for a classification to look complete and be wrong, which is why
they are checked rather than trusted.

  python server/src/scripts/foundationClassifyPhase2.py <path-to-classify_table.py>
"""

import csv
import io
import os
import sys
import collections
import importlib.util

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
BLUEPRINT = os.path.join(ROOT, 'docs', 'audit', 'foundation-golden-bank-blueprint.csv')
CLASSIFY = os.path.join(ROOT, 'docs', 'audit', 'foundation-existing-question-classification.csv')
SUMMARY = os.path.join(ROOT, 'docs', 'audit', 'foundation-existing-question-classification-summary.csv')

NEW_COLS = ['conceptId', 'factId', 'familyId', 'proposedDifficulty',
            'proposedCognitiveLevel', 'goldenDecision', 'reviewNotes']


def read_csv(path):
    with io.open(path, encoding='utf-8', newline='') as f:
        r = csv.DictReader(f)
        return r.fieldnames, list(r)


def write_csv(path, header, rows):
    with io.open(path, 'w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=header, lineterminator='\n')
        w.writeheader()
        for row in rows:
            w.writerow({h: row.get(h, '') for h in header})


def load_table(path):
    spec = importlib.util.spec_from_file_location('classify_table', path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.T, mod.NOTES


def main():
    table_path = sys.argv[1]
    T, NOTES = load_table(table_path)

    bp_header, bp = read_csv(BLUEPRINT)
    src_header, src = read_csv(CLASSIFY)

    fam = {r['familyId']: r for r in bp}
    concepts = set(r['conceptId'] for r in bp)
    facts = set(r['factId'] for r in bp)
    lvl = lambda d: int(d[1])

    problems = []
    out = []

    seen = set()
    for r in src:
        sid = r['questionId'][-6:]
        if sid not in T:
            problems.append('%s (%s) has no classification' % (sid, r['skillKey']))
            out.append(dict(r))
            continue
        if sid in seen:
            problems.append('%s classified twice' % sid)
        seen.add(sid)

        concept, fact, family, diff, cog, dec, note, arg = T[sid]

        # note expansion — a decision with no stated reason is not a decision
        tmpl = NOTES.get(note)
        if tmpl is None:
            problems.append('%s uses unknown note code %s' % (sid, note))
            text = note
        elif '%s' in tmpl:
            want = tmpl.count('%s')
            if len(arg) != want:
                problems.append('%s: note %s wants %d argument(s), got %d'
                                % (sid, note, want, len(arg)))
                text = tmpl.replace('%s', '?')
            else:
                text = tmpl % arg
        else:
            text = tmpl

        if family:
            if family not in fam:
                problems.append('%s names family %s which is not in the blueprint' % (sid, family))
            else:
                f = fam[family]
                if f['skillKey'] != r['skillKey']:
                    problems.append('%s: family %s belongs to %s, question is %s'
                                    % (sid, family, f['skillKey'], r['skillKey']))
                if not (lvl(f['allowedDifficultyMin']) <= lvl(diff) <= lvl(f['allowedDifficultyMax'])):
                    problems.append('%s: %s outside %s range %s-%s'
                                    % (sid, diff, family, f['allowedDifficultyMin'], f['allowedDifficultyMax']))
                if concept != f['conceptId']:
                    problems.append('%s: conceptId %s does not match family %s (%s)'
                                    % (sid, concept, family, f['conceptId']))
                if fact != f['factId']:
                    problems.append('%s: factId %s does not match family %s (%s)'
                                    % (sid, fact, family, f['factId']))
            if concept and concept not in concepts:
                problems.append('%s: unknown conceptId %s' % (sid, concept))
            if fact and fact not in facts:
                problems.append('%s: unknown factId %s' % (sid, fact))
        else:
            if dec != 'REJECT':
                problems.append('%s is %s with no family' % (sid, dec))

        if dec not in ('KEEP', 'REWRITE', 'REJECT'):
            problems.append('%s has invalid decision %s' % (sid, dec))
        if not text.strip():
            problems.append('%s has an empty reviewNote' % sid)

        row = dict(r)
        row['conceptId'] = concept
        row['factId'] = fact
        row['familyId'] = family
        row['proposedDifficulty'] = diff
        row['proposedCognitiveLevel'] = cog
        row['goldenDecision'] = dec
        row['reviewNotes'] = text
        out.append(row)

    extra = set(T) - seen
    for e in sorted(extra):
        problems.append('table classifies %s which is not in the source' % e)

    write_csv(CLASSIFY, src_header, out)

    # ── source integrity: every carried column, field by field ──────────────
    _, reread = read_csv(CLASSIFY)
    src_cols = [c for c in src_header if c not in NEW_COLS]
    drift = 0
    for a, b in zip(src, reread):
        for c in src_cols:
            if (a.get(c) or '') != (b.get(c) or ''):
                drift += 1
                if drift <= 5:
                    problems.append('source column "%s" changed on %s' % (c, a['questionId'][-6:]))

    # ── summary ─────────────────────────────────────────────────────────────
    by_skill = collections.OrderedDict()
    for r in reread:
        by_skill.setdefault(r['skillKey'], []).append(r)

    summary = []
    for skill, rows in sorted(by_skill.items()):
        keeps = [x for x in rows if x['goldenDecision'] == 'KEEP']
        row = collections.OrderedDict()
        row['skillKey'] = skill
        row['existingCount'] = len(rows)
        row['keepCount'] = len(keeps)
        row['rewriteCount'] = len([x for x in rows if x['goldenDecision'] == 'REWRITE'])
        row['rejectCount'] = len([x for x in rows if x['goldenDecision'] == 'REJECT'])
        for d in range(1, 6):
            row['D%dKeep' % d] = len([x for x in keeps if x['proposedDifficulty'] == 'D%d' % d])
        row['distinctKeepFacts'] = len(set(x['factId'] for x in keeps if x['factId']))
        row['distinctKeepFamilies'] = len(set(x['familyId'] for x in keeps if x['familyId']))
        summary.append(row)

    write_csv(SUMMARY, list(summary[0].keys()), summary)

    # ── report ──────────────────────────────────────────────────────────────
    print('')
    print('PHASE 2 — CLASSIFICATION OF THE EXISTING 366')
    print('')
    hdr = ('%-30s %5s %5s %5s %5s   %3s %3s %3s %3s %3s   %5s %5s'
           % ('skill', 'exist', 'keep', 'rewr', 'rej', 'D1', 'D2', 'D3', 'D4', 'D5', 'facts', 'fams'))
    print(hdr)
    print('-' * len(hdr))
    for s in summary:
        print('%-30s %5d %5d %5d %5d   %3d %3d %3d %3d %3d   %5d %5d'
              % (s['skillKey'], s['existingCount'], s['keepCount'], s['rewriteCount'], s['rejectCount'],
                 s['D1Keep'], s['D2Keep'], s['D3Keep'], s['D4Keep'], s['D5Keep'],
                 s['distinctKeepFacts'], s['distinctKeepFamilies']))
    print('-' * len(hdr))
    tot = lambda k: sum(s[k] for s in summary)
    print('%-30s %5d %5d %5d %5d   %3d %3d %3d %3d %3d'
          % ('TOTAL', tot('existingCount'), tot('keepCount'), tot('rewriteCount'), tot('rejectCount'),
             tot('D1Keep'), tot('D2Keep'), tot('D3Keep'), tot('D4Keep'), tot('D5Keep')))

    dec = collections.Counter(r['goldenDecision'] for r in reread)
    usable = dec['KEEP'] + dec['REWRITE']
    print('')
    print('classified            : %d of 366' % len(reread))
    print('KEEP                  : %d  (%.0f%%)' % (dec['KEEP'], 100.0 * dec['KEEP'] / len(reread)))
    print('REWRITE               : %d  (%.0f%%)' % (dec['REWRITE'], 100.0 * dec['REWRITE'] / len(reread)))
    print('REJECT                : %d  (%.0f%%)' % (dec['REJECT'], 100.0 * dec['REJECT'] / len(reread)))
    print('usable after rewriting: %d of 1,650 Golden target (%.0f%%)' % (usable, 100.0 * usable / 1650))

    # why the rejects were rejected — the actionable half of the report
    reasons = collections.Counter()
    for r in reread:
        if r['goldenDecision'] != 'REJECT':
            continue
        n = r['reviewNotes']
        if n.startswith('REDUNDANT'):
            reasons['redundant with another question'] += 1
        elif n.startswith('No ') and 'BLUEPRINT GAP' in n:
            reasons['no family — likely blueprint gap'] += 1
        elif n.startswith('No '):
            reasons['no family — belongs to another skill'] += 1
        elif n.startswith('Trivia'):
            reasons['trivia'] += 1
        elif n.startswith('Bare computation'):
            reasons['bare computation, no data'] += 1
        elif n.startswith('Measures agreement'):
            reasons['advice, not capability'] += 1
        elif n.startswith('Outside'):
            reasons['outside skill and blueprint'] += 1
        elif n.startswith('Ambiguous'):
            reasons['ambiguous'] += 1
        elif n.startswith('Tautological'):
            reasons['tautological'] += 1
        else:
            reasons['other'] += 1
    print('')
    print('WHY THE REJECTS WERE REJECTED')
    for k, v in reasons.most_common():
        print('  %-42s %3d' % (k, v))

    print('')
    print('source records            : %d' % len(reread))
    print('source columns preserved  : %d of %d' % (len(src_cols), len(src_header)))
    print('source column changes     : %d' % drift)
    print('database writes           : 0  (no database client imported)')
    print('questions generated       : 0')

    if problems:
        print('')
        print('VALIDATION FAILED:')
        for p in problems[:25]:
            print('  ' + p)
        if len(problems) > 25:
            print('  ... %d more' % (len(problems) - 25))
        sys.exit(1)

    print('')
    print('validated: all 366 classified exactly once, every family/concept/fact exists in the')
    print('frozen blueprint and belongs to the question\'s own skill, every proposed difficulty')
    print('sits inside its family\'s range, every decision is explained, and no source column changed.')
    print('')
    print('written: docs/audit/foundation-existing-question-classification.csv')
    print('written: docs/audit/foundation-existing-question-classification-summary.csv')


if __name__ == '__main__':
    main()
