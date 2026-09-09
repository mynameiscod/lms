# -*- coding: utf-8 -*-
"""
Phase 3A — reconcile the approved legacy pool against Wave 1's blueprint slots.

This runs BEFORE authoring and decides what still has to be written. Read-only: it reads the
frozen blueprint, the Phase 2 classification and the Phase 2.5 remap proposal, and writes one
worklist.

WHAT COUNTS AS AN APPROVED LEGACY CANDIDATE for a Wave 1 skill
  - a Phase 2 KEEP or REWRITE already filed under that skill, carrying the family it was
    classified into; or
  - a Phase 2.5 REMAP_PRIMARY whose proposed skill is that skill, carrying its proposed family.

HOW A SLOT IS FILLED. A slot is one (family, difficulty) pair, and the blueprint says how many
questions it holds. A KEEP is pinned to the difficulty Phase 2 gave it — it is approved as it
stands, so moving it would be re-judging it. A REWRITE is going to be rewritten anyway, so it may
be aimed at any difficulty its family allows that still has room; that is the whole point of
rewriting it. KEEPs are placed first so they never lose a slot to an item that could have gone
elsewhere.

EXCESS DOES NOT SUBSIDISE. A legacy item whose slot is already full is simply unused; it does not
reduce the authoring owed anywhere else, because a question that measures one thing cannot fill a
slot for a different thing.
"""

import csv
import io
import os
import sys
import collections

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
AUDIT = os.path.join(ROOT, 'docs', 'audit')
BLUEPRINT = os.path.join(AUDIT, 'foundation-golden-bank-blueprint.csv')
CLASSIFY = os.path.join(AUDIT, 'foundation-existing-question-classification.csv')
REMAP = os.path.join(AUDIT, 'foundation-question-remap-proposal.csv')
OUT = os.path.join(AUDIT, 'foundation-golden-bank-wave1-reconciliation.csv')

WAVE1 = ['PROGRAMMING_FUNDAMENTALS', 'PYTHON_BASICS', 'CONDITIONALS_BASICS', 'LOOPS_BASICS',
         'FUNCTIONS_BASICS', 'PSEUDOCODE_FLOWCHARTS', 'PROBLEM_SOLVING']


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


def build():
    _, bp = read_csv(BLUEPRINT)
    _, cls = read_csv(CLASSIFY)
    _, rem = read_csv(REMAP)

    fam = {r['familyId']: r for r in bp}
    remap = {r['questionId']: r for r in rem if r['action'] == 'REMAP_PRIMARY'}
    lvl = lambda d: int(d[1])

    # ── the approved legacy pool, per skill ─────────────────────────────────
    pool = collections.defaultdict(list)
    for r in cls:
        qid = r['questionId']
        if qid in remap:
            m = remap[qid]
            pool[m['proposedSkillKey']].append({
                'sid': qid[-6:], 'questionId': qid, 'family': m['proposedFamilyId'],
                'difficulty': r['proposedDifficulty'], 'origin': 'REMAP',
                'sourceSkill': r['skillKey'], 'decision': r['goldenDecision'],
            })
        elif r['goldenDecision'] in ('KEEP', 'REWRITE'):
            pool[r['skillKey']].append({
                'sid': qid[-6:], 'questionId': qid, 'family': r['familyId'],
                'difficulty': r['proposedDifficulty'], 'origin': r['goldenDecision'],
                'sourceSkill': r['skillKey'], 'decision': r['goldenDecision'],
            })

    rows = []
    summary = []
    for skill in WAVE1:
        fams = [b for b in bp if b['skillKey'] == skill]
        capacity = {}
        for b in fams:
            for n in range(1, 6):
                c = int(b['plannedD%d' % n] or 0)
                if c:
                    capacity[(b['familyId'], 'D%d' % n)] = c
        left = dict(capacity)
        assigned = collections.defaultdict(list)
        unused = []

        cand = pool[skill]
        # a REMAP whose Phase 2 decision was REJECT is being re-aimed, so treat it as rewritable;
        # only a straight KEEP is pinned.
        pinned = [c for c in cand if c['decision'] == 'KEEP' and c['origin'] != 'REMAP']
        movable = [c for c in cand if c not in pinned]

        for c in pinned:
            k = (c['family'], c['difficulty'])
            if left.get(k, 0) > 0:
                left[k] -= 1
                c['slot'] = c['difficulty']
                c['use'] = 'USED_AS_IS'
                assigned[k].append(c)
            else:
                c['use'] = 'NOT_USED'
                c['slot'] = ''
                unused.append(c)

        for c in movable:
            f = fam.get(c['family'])
            if f is None:
                c['use'] = 'NOT_USED'
                c['slot'] = ''
                unused.append(c)
                continue
            # prefer the difficulty it already carries, then the rest of the family's range
            order = [c['difficulty']] + ['D%d' % n for n in
                                         range(lvl(f['allowedDifficultyMin']),
                                               lvl(f['allowedDifficultyMax']) + 1)]
            placed = False
            for d in order:
                if not d:
                    continue
                k = (c['family'], d)
                if left.get(k, 0) > 0:
                    left[k] -= 1
                    c['slot'] = d
                    c['use'] = 'USED_REWRITTEN'
                    assigned[k].append(c)
                    placed = True
                    break
            if not placed:
                c['use'] = 'NOT_USED'
                c['slot'] = ''
                unused.append(c)

        for k in sorted(capacity):
            used = assigned.get(k, [])
            rows.append(collections.OrderedDict([
                ('skillKey', skill),
                ('familyId', k[0]),
                ('difficulty', k[1]),
                ('allocated', capacity[k]),
                ('legacyUsed', len(used)),
                ('legacySources', ' '.join(c['sid'] for c in used)),
                ('legacyOrigins', ' '.join(
                    ('KEEP' if c['use'] == 'USED_AS_IS' else
                     ('REMAP' if c['origin'] == 'REMAP' else 'REWRITE')) for c in used)),
                ('toAuthor', left[k]),
            ]))

        summary.append({
            'skill': skill,
            'allocated': sum(capacity.values()),
            'pool': len(cand),
            'keep': len([c for c in cand if c.get('use') == 'USED_AS_IS']),
            'rewrite': len([c for c in cand if c.get('use') == 'USED_REWRITTEN'
                            and c['origin'] != 'REMAP']),
            'remap': len([c for c in cand if c.get('use') == 'USED_REWRITTEN'
                          and c['origin'] == 'REMAP']),
            'unused': len(unused),
            'author': sum(left.values()),
            'unusedIds': [(c['sid'], c['family'], c['difficulty'], c['origin']) for c in unused],
        })

    return rows, summary


def main():
    rows, summary = build()
    write_csv(OUT, list(rows[0].keys()), rows)

    print('')
    print('PHASE 3A WAVE 1 — RECONCILIATION BEFORE AUTHORING')
    print('')
    hdr = '%-26s %9s %5s %5s %5s %6s %7s %7s' % (
        'skill', 'allocated', 'pool', 'KEEP', 'rewr', 'remap', 'unused', 'author')
    print(hdr)
    print('-' * len(hdr))
    for s in summary:
        print('%-26s %9d %5d %5d %5d %6d %7d %7d'
              % (s['skill'], s['allocated'], s['pool'], s['keep'], s['rewrite'], s['remap'],
                 s['unused'], s['author']))
    print('-' * len(hdr))
    t = lambda k: sum(s[k] for s in summary)
    print('%-26s %9d %5d %5d %5d %6d %7d %7d'
          % ('TOTAL', t('allocated'), t('pool'), t('keep'), t('rewrite'), t('remap'),
             t('unused'), t('author')))
    print('')
    print('legacy consuming a Golden slot: %d  (KEEP %d + rewritten %d + remapped %d)'
          % (t('keep') + t('rewrite') + t('remap'), t('keep'), t('rewrite'), t('remap')))
    print('still to author               : %d' % t('author'))
    assert t('keep') + t('rewrite') + t('remap') + t('author') == 350

    print('')
    print('LEGACY NOT USED — the slot its measurement belongs to was already full')
    for s in summary:
        if not s['unusedIds']:
            continue
        print('  %s' % s['skill'])
        for sid, f, d, o in s['unusedIds']:
            print('    %s  %-38s %s  %s' % (sid, f, d, o))

    print('')
    print('OPEN SLOTS TO AUTHOR, BY SKILL AND DIFFICULTY')
    per = collections.defaultdict(collections.Counter)
    for r in rows:
        per[r['skillKey']][r['difficulty']] += int(r['toAuthor'])
    hdr2 = '%-26s %4s %4s %4s %4s %4s %6s' % ('skill', 'D1', 'D2', 'D3', 'D4', 'D5', 'total')
    print(hdr2)
    print('-' * len(hdr2))
    for skill in WAVE1:
        c = per[skill]
        print('%-26s %4d %4d %4d %4d %4d %6d'
              % (skill, c['D1'], c['D2'], c['D3'], c['D4'], c['D5'], sum(c.values())))
    print('-' * len(hdr2))
    allc = collections.Counter()
    for c in per.values():
        allc.update(c)
    print('%-26s %4d %4d %4d %4d %4d %6d'
          % ('TOTAL', allc['D1'], allc['D2'], allc['D3'], allc['D4'], allc['D5'],
             sum(allc.values())))
    print('')
    print('written: docs/audit/foundation-golden-bank-wave1-reconciliation.csv')


if __name__ == '__main__':
    main()
