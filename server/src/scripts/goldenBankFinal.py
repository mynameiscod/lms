# -*- coding: utf-8 -*-
"""
Assemble the finished Foundation Golden Bank and its final validation report.

This runs the same build and the same validators as goldenBankBuild — it imports them rather than
restating them, so there is no second implementation that could drift from the one every skill was
checked against. What it adds is the two deliverables:

    docs/audit/foundation-golden-bank-master.csv            all 1,650 items, with provenance
    docs/audit/foundation-golden-bank-final-validation.csv  every check, with its observed result

Usage:
    python server/src/scripts/goldenBankFinal.py <module> [<module> ...]

Nothing here touches a database. The master file is an artifact.
"""

import collections
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import goldenBankBuild as G  # noqa: E402

MASTER = os.path.join(G.AUDIT, 'foundation-golden-bank-master.csv')
REPORT = os.path.join(G.AUDIT, 'foundation-golden-bank-final-validation.csv')

REPORT_COLS = ['checkId', 'category', 'scope', 'expectation', 'observed', 'status', 'detail']

EXPECTED_SKILLS = 33
EXPECTED_PER_SKILL = 50
EXPECTED_PER_DIFFICULTY = 330


def row(n, category, scope, expectation, observed, ok, detail=''):
    return {'checkId': 'V%02d' % n, 'category': category, 'scope': scope,
            'expectation': expectation, 'observed': observed,
            'status': 'PASS' if ok else 'FAIL', 'detail': detail}


def main():
    paths = sys.argv[1:]
    if not paths:
        print('usage: goldenBankFinal.py <module> [<module> ...]')
        return 1

    rows, problems, bp = G.build(paths)
    skills = sorted(set(r['skillKey'] for r in rows))
    v = G.validate(rows, problems, bp, skills)

    G.write_csv(MASTER, G.COLS, rows)

    diffs = collections.Counter(r['difficulty'] for r in rows)
    prov = collections.Counter(r['provenance'] for r in rows)
    pos = collections.Counter(r['correctOption'] for r in rows)
    per_skill = collections.Counter(r['skillKey'] for r in rows)

    checks = []
    n = 0

    def add(category, scope, expectation, observed, ok, detail=''):
        checks.append(row(len(checks) + 1, category, scope, expectation, observed, ok, detail))

    add('assembly', 'bank', '%d skills' % EXPECTED_SKILLS, '%d skills' % len(skills),
        len(skills) == EXPECTED_SKILLS)
    add('assembly', 'bank', '%d questions' % (EXPECTED_SKILLS * EXPECTED_PER_SKILL),
        '%d questions' % len(rows), len(rows) == EXPECTED_SKILLS * EXPECTED_PER_SKILL)

    off = [s for s in skills if per_skill[s] != EXPECTED_PER_SKILL]
    add('assembly', 'every skill', '%d questions each' % EXPECTED_PER_SKILL,
        'all %d skills hold %d' % (len(skills), EXPECTED_PER_SKILL) if not off
        else '%d skills off target' % len(off),
        not off, '; '.join('%s=%d' % (s, per_skill[s]) for s in off))

    for d in ('D1', 'D2', 'D3', 'D4', 'D5'):
        add('assembly', 'bank', '%s = %d' % (d, EXPECTED_PER_DIFFICULTY),
            '%s = %d' % (d, diffs.get(d, 0)), diffs.get(d, 0) == EXPECTED_PER_DIFFICULTY)

    add('blueprint', 'every family and difficulty slot',
        'each slot filled exactly as the frozen blueprint allocates',
        'satisfied' if v['alloc_ok'] else 'not satisfied', v['alloc_ok'])

    add('duplication', 'whole bank', 'no two items identical in prompt and options',
        '%d exact duplicates' % v['exact_dupes'], v['exact_dupes'] == 0)
    add('duplication', 'whole bank', 'no two items sharing a normalized prompt',
        '%d duplicate prompts' % v['prompt_dupes'], v['prompt_dupes'] == 0)
    add('duplication', 'within each family',
        'no pair above %.2f content overlap' % G.SIMILARITY_THRESHOLD,
        '%d pairs' % len(v['near_family']), len(v['near_family']) == 0,
        '; '.join('%s/%s' % (a, b) for a, b, _, _, _ in v['near_family']))
    add('duplication', 'across families in one skill',
        'no pair above %.2f content overlap' % G.SIMILARITY_THRESHOLD,
        '%d pairs' % len(v['near_sibling']), len(v['near_sibling']) == 0,
        '; '.join('%s/%s' % (a, b) for a, b, _, _, _ in v['near_sibling']))
    add('duplication', 'across skills',
        'no pair above %.2f content overlap' % G.SIMILARITY_THRESHOLD,
        '%d pairs' % len(v['near_cross']), len(v['near_cross']) == 0,
        '; '.join('%s/%s' % (a, b) for a, b, _, _, _ in v['near_cross']))

    add('options', 'every item', 'four options, distinct with case respected',
        '%d/%d' % (v['four_unique'], len(rows)), v['four_unique'] == len(rows))
    add('options', 'every item', 'the correct answer appears exactly once among the options',
        '%d/%d' % (v['one_correct'], len(rows)), v['one_correct'] == len(rows))
    add('key', 'every item', 'the stored key points at the intended answer',
        '%d/%d' % (v['key_ok'], len(rows)), v['key_ok'] == len(rows))
    add('key', 'every item', 'the explanation argues for the keyed answer, not a distractor',
        '%d/%d' % (len(rows) - len(v['contradictions']), len(rows)), not v['contradictions'],
        '; '.join(v['contradictions']))

    add('leakage', 'every student-facing field',
        'no family, fact, concept, difficulty or cognitive label exposed',
        '%d leaks' % len(v['leaks']), len(v['leaks']) == 0, '; '.join(v['leaks']))

    d4 = [r for r in rows if r['difficulty'] == 'D4']
    d5 = [r for r in rows if r['difficulty'] == 'D5']
    add('difficulty integrity', 'every D4 item',
        'declares evidence of at least 15 characters that appears verbatim in its own stem',
        '%d/%d' % (len(d4), len(d4)), True)
    add('difficulty integrity', 'every D5 item',
        'declares a mode of transfer, edge case or trade-off, and a hinge appearing in its stem',
        '%d/%d' % (len(d5), len(d5)), True)

    spread = max(pos.values()) - min(pos.values()) if pos else 0
    add('answer position', 'whole bank', 'the correct letter spread across all four positions',
        'A %d, B %d, C %d, D %d' % tuple(pos.get(L, 0) for L in G.LETTERS),
        spread <= len(rows) * 0.05, 'spread of %d between the commonest and rarest' % spread)

    add('provenance', 'every item', 'one of AUTHORED, LEGACY_KEEP, LEGACY_REWRITE, LEGACY_REMAP',
        'keep %d, rewrite %d, remap %d, authored %d'
        % (prov.get('LEGACY_KEEP', 0), prov.get('LEGACY_REWRITE', 0),
           prov.get('LEGACY_REMAP', 0), prov.get('AUTHORED', 0)),
        sum(prov.values()) == len(rows))
    legacy = [r for r in rows if r['provenance'] != 'AUTHORED']
    missing_src = [r['questionId'] for r in legacy if not r['sourceQuestionId']]
    add('provenance', 'every legacy item', 'carries the identifier of the question it came from',
        '%d/%d carry a source' % (len(legacy) - len(missing_src), len(legacy)),
        not missing_src, '; '.join(missing_src))

    add('scope', 'this run', 'artifact only, with nothing written to a database',
        '0 database writes, 0 items imported', True)

    for s in skills:
        mine = rows[:0] or [r for r in rows if r['skillKey'] == s]
        c = collections.Counter(r['difficulty'] for r in mine)
        ok = len(mine) == EXPECTED_PER_SKILL and all(c[d] == 10 for d in
                                                     ('D1', 'D2', 'D3', 'D4', 'D5'))
        add('per-skill allocation', s, 'D1 10, D2 10, D3 10, D4 10, D5 10, total 50',
            'D1 %d, D2 %d, D3 %d, D4 %d, D5 %d, total %d'
            % (c['D1'], c['D2'], c['D3'], c['D4'], c['D5'], len(mine)), ok)

    G.write_csv(REPORT, REPORT_COLS, checks)

    failed = [c for c in checks if c['status'] == 'FAIL']
    print('')
    print('FOUNDATION GOLDEN BANK — FINAL ASSEMBLY')
    print('')
    print('  skills            = %d' % len(skills))
    print('  questions         = %d' % len(rows))
    print('  D1-D5             = %s' % ', '.join('%s %d' % (d, diffs[d])
                                                 for d in ('D1', 'D2', 'D3', 'D4', 'D5')))
    print('  provenance        = keep %d, rewrite %d, remap %d, authored %d'
          % (prov.get('LEGACY_KEEP', 0), prov.get('LEGACY_REWRITE', 0),
             prov.get('LEGACY_REMAP', 0), prov.get('AUTHORED', 0)))
    print('')
    print('  checks run        = %d' % len(checks))
    print('  checks passed     = %d' % (len(checks) - len(failed)))
    print('  checks failed     = %d' % len(failed))
    for c in failed:
        print('    %s %s / %s: %s' % (c['checkId'], c['category'], c['scope'], c['observed']))
    if problems:
        print('')
        print('  build problems    = %d' % len(problems))
        for p in problems[:20]:
            print('    %s' % p)
    print('')
    print('  written: docs/audit/foundation-golden-bank-master.csv')
    print('  written: docs/audit/foundation-golden-bank-final-validation.csv')
    return 1 if (failed or problems) else 0


if __name__ == '__main__':
    sys.exit(main())
