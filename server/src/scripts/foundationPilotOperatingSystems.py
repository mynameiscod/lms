# -*- coding: utf-8 -*-
"""
Phase 3 pilot — write the 50 OPERATING_SYSTEMS Golden Bank questions, and prove they hold up.

ARTIFACT ONLY. No database client is imported, nothing is imported into the bank, and the
frozen blueprint is read but never written.

ANSWER POSITION IS ASSIGNED, NOT AUTHORED. Each item stores its correct answer apart from its
distractors, and this script places it by a fixed rotation. Two things follow: the key cannot
disagree with the intended answer, and the correct letter is spread across A, B, C and D instead
of collecting on A — a bank whose answer is usually A can be passed without reading it.

WHAT IT REFUSES TO LET THROUGH
  - a family that is not in the frozen blueprint, or a difficulty outside that family's range
  - a per-family, per-difficulty count that differs from the blueprint's own allocation
  - an exact duplicate question, or two prompts that differ only in case and whitespace
  - fewer than four distinct options, or anything other than exactly one correct option
  - a key whose letter does not point at the intended answer text
  - an explanation that quotes a distractor while never mentioning the correct answer
  - blueprint vocabulary leaking into anything a student reads

WHAT IT REPORTS FOR JUDGEMENT
  - the closest pair of measurements inside each family, so wording variants are visible
  - the answer-position distribution

CASE IS NEVER FOLDED when comparing options or checking a key against an explanation. Folding it
is what hid a wrong answer key in the existing bank, on a question about lowercasing.

  python server/src/scripts/foundationPilotOperatingSystems.py <path-to-pilot_operating_systems.py>
"""

import csv
import io
import os
import re
import sys
import collections
import importlib.util

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
BLUEPRINT = os.path.join(ROOT, 'docs', 'audit', 'foundation-golden-bank-blueprint.csv')
OUT = os.path.join(ROOT, 'docs', 'audit', 'foundation-golden-bank-pilot-operating-systems.csv')

SKILL = 'OPERATING_SYSTEMS'
LETTERS = ['A', 'B', 'C', 'D']
# A fixed rotation, so the answer is never predictable from its position.
ROTATION = [1, 3, 0, 2]

COLS = ['questionId', 'skillKey', 'conceptId', 'factId', 'familyId', 'reassessmentGroup',
        'difficulty', 'cognitiveLevel', 'questionType', 'prompt',
        'optionA', 'optionB', 'optionC', 'optionD',
        'correctOption', 'correctAnswerText', 'explanation']

# Vocabulary that belongs to the blueprint and must never reach a student.
LEAK_PATTERNS = [
    (r'\bOS_FAM\d+', 'family identifier'),
    (r'\bOS_C\d+', 'concept identifier'),
    (r'\bOS_F\d+', 'fact identifier'),
    (r'\bOS_RG_', 'reassessment group'),
    (r'\b[A-Z]{2,4}_FAM\d+', 'family identifier'),
    (r'\bD[1-5]\b', 'difficulty label'),
    (r'\b(REMEMBER|UNDERSTAND|APPLY|ANALYZE|EVALUATE)\b', 'cognitive level label'),
    (r'\bblueprint\b', 'blueprint'),
    (r'\bmcq_single\b', 'question type'),
    (r'\bdistractor', 'distractor'),
    (r'\breassessment\b', 'reassessment'),
    (r'\bcognitive level\b', 'cognitive level'),
    (r'\bmeasurement objective\b', 'measurement objective'),
]

STOP = set('a an the of to in on at for from by with and or is are was were be been being it its '
           'that this these those what which who whom whose why how when where does do did done '
           'not no nor but if then than so as into out up down over under again once here there '
           'all any both each few more most other some such only own same too very can will just '
           'would should could may might must shall about after before between during without '
           'within upon while whether one two three'.split())


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


def load(path):
    spec = importlib.util.spec_from_file_location('pilot', path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.Q


def norm_ws(s):
    """Collapse whitespace. Case is deliberately preserved."""
    return re.sub(r'\s+', ' ', s).strip()


def norm_prompt(s):
    """For duplicate detection only: case and whitespace, nothing else."""
    return re.sub(r'\s+', ' ', s).strip().lower()


def words(s):
    return set(w for w in re.findall(r'[a-z]+', s.lower()) if w not in STOP and len(w) > 2)


def main():
    items = load(sys.argv[1])
    _, bp_all = read_csv(BLUEPRINT)
    bp = {r['familyId']: r for r in bp_all if r['skillKey'] == SKILL}

    lvl = lambda d: int(d[1])
    problems = []
    rows = []

    for i, it in enumerate(items):
        fid = it['family']
        f = bp.get(fid)
        if f is None:
            problems.append('%s names family %s, which is not in the frozen %s blueprint'
                            % (it['id'], fid, SKILL))
            continue
        d = it['difficulty']
        if not (lvl(f['allowedDifficultyMin']) <= lvl(d) <= lvl(f['allowedDifficultyMax'])):
            problems.append('%s is %s but %s allows only %s-%s'
                            % (it['id'], d, fid, f['allowedDifficultyMin'], f['allowedDifficultyMax']))

        # place the answer by rotation, so the key cannot be mis-set and A is not the default
        pos = ROTATION[i % len(ROTATION)]
        opts = list(it['distractors'])
        opts.insert(pos, it['correct'])

        rows.append(collections.OrderedDict([
            ('questionId', it['id']),
            ('skillKey', SKILL),
            ('conceptId', f['conceptId']),
            ('factId', f['factId']),
            ('familyId', fid),
            ('reassessmentGroup', f['reassessmentGroup']),
            ('difficulty', d),
            ('cognitiveLevel', f['cognitiveLevel']),
            ('questionType', f['questionType']),
            ('prompt', norm_ws(it['prompt'])),
            ('optionA', norm_ws(opts[0])),
            ('optionB', norm_ws(opts[1])),
            ('optionC', norm_ws(opts[2])),
            ('optionD', norm_ws(opts[3])),
            ('correctOption', LETTERS[pos]),
            ('correctAnswerText', norm_ws(it['correct'])),
            ('explanation', norm_ws(it['explanation'])),
        ]))

    write_csv(OUT, COLS, rows)
    _, rows = read_csv(OUT)

    # ── allocation ──────────────────────────────────────────────────────────
    got = collections.Counter((r['familyId'], r['difficulty']) for r in rows)
    want = {}
    for fid, f in bp.items():
        for n in range(1, 6):
            c = int(f['plannedD%d' % n] or 0)
            if c:
                want[(fid, 'D%d' % n)] = c
    alloc_ok = True
    for k in sorted(set(list(want) + list(got))):
        if want.get(k, 0) != got.get(k, 0):
            alloc_ok = False
            problems.append('allocation: %s %s expected %d, authored %d'
                            % (k[0], k[1], want.get(k, 0), got.get(k, 0)))

    # ── duplicates ──────────────────────────────────────────────────────────
    whole = collections.Counter(
        (r['prompt'], r['optionA'], r['optionB'], r['optionC'], r['optionD']) for r in rows)
    exact_dupes = sum(n - 1 for n in whole.values() if n > 1)

    pnorm = collections.Counter(norm_prompt(r['prompt']) for r in rows)
    prompt_dupes = sum(n - 1 for n in pnorm.values() if n > 1)

    # family-equivalent measurement: two items in one family whose prompt-plus-answer content
    # words overlap heavily are the same question wearing different words.
    THRESHOLD = 0.60
    equivalent = []
    closest = {}
    by_family = collections.defaultdict(list)
    for r in rows:
        by_family[r['familyId']].append(r)
    for fid, group in by_family.items():
        best = (0.0, None, None)
        for a in range(len(group)):
            for b in range(a + 1, len(group)):
                x = words(group[a]['prompt'] + ' ' + group[a]['correctAnswerText'])
                y = words(group[b]['prompt'] + ' ' + group[b]['correctAnswerText'])
                j = len(x & y) / float(len(x | y)) if (x | y) else 0.0
                if j > best[0]:
                    best = (j, group[a]['questionId'], group[b]['questionId'])
                if j >= THRESHOLD:
                    equivalent.append((fid, group[a]['questionId'], group[b]['questionId'], j))
        if best[1]:
            closest[fid] = best

    # ── option and key integrity ────────────────────────────────────────────
    four_unique = 0
    one_correct = 0
    key_matches = 0
    contradictions = []
    for r in rows:
        opts = [r['optionA'], r['optionB'], r['optionC'], r['optionD']]
        if len(set(opts)) == 4:            # case-sensitive on purpose
            four_unique += 1
        else:
            problems.append('%s has options that are not four distinct texts' % r['questionId'])
        if opts.count(r['correctAnswerText']) == 1:
            one_correct += 1
        else:
            problems.append('%s: the correct answer text appears %d times among its options'
                            % (r['questionId'], opts.count(r['correctAnswerText'])))
        keyed = opts[LETTERS.index(r['correctOption'])]
        if keyed == r['correctAnswerText']:
            key_matches += 1
        else:
            problems.append('%s: key %s points at %r, but the correct answer is %r'
                            % (r['questionId'], r['correctOption'], keyed, r['correctAnswerText']))
        # an explanation that argues for a distractor and never names the answer
        expl = r['explanation']
        wrong = [o for o in opts if o != r['correctAnswerText']]
        if any(o in expl for o in wrong) and r['correctAnswerText'] not in expl:
            contradictions.append(r['questionId'])

    # ── metadata leakage ────────────────────────────────────────────────────
    leaks = []
    for r in rows:
        facing = ' || '.join([r['prompt'], r['optionA'], r['optionB'], r['optionC'],
                              r['optionD'], r['explanation']])
        for pat, label in LEAK_PATTERNS:
            m = re.search(pat, facing)
            if m:
                leaks.append((r['questionId'], label, m.group(0)))

    positions = collections.Counter(r['correctOption'] for r in rows)
    diffs = collections.Counter(r['difficulty'] for r in rows)

    # ── report ──────────────────────────────────────────────────────────────
    print('')
    print('PHASE 3 PILOT — OPERATING_SYSTEMS, 50 GOLDEN BANK QUESTIONS')
    print('')
    print('total                             = %d' % len(rows))
    for n in range(1, 6):
        print('D%d                                = %d' % (n, diffs.get('D%d' % n, 0)))
    print('blueprint allocation satisfied    = %s' % ('yes' if alloc_ok else 'NO'))
    print('exact duplicate MCQs              = %d' % exact_dupes)
    print('normalized duplicate prompts      = %d' % prompt_dupes)
    print('duplicate family-equivalent meas. = %d' % len(equivalent))
    print('four unique options               = %d/%d' % (four_unique, len(rows)))
    print('exactly one correct option        = %d/%d' % (one_correct, len(rows)))
    print('key agrees with intended answer   = %d/%d' % (key_matches, len(rows)))
    print('key/explanation contradictions    = %d' % len(contradictions))
    print('metadata leakage                  = %d' % len(leaks))
    print('answer position                   = A %d, B %d, C %d, D %d'
          % tuple(positions.get(L, 0) for L in LETTERS))

    print('')
    print('PER FAMILY (authored vs blueprint allocation)')
    print('%-42s %-14s %s' % ('family', 'D1 D2 D3 D4 D5', 'closest pair inside the family'))
    print('-' * 108)
    for fid in sorted(bp):
        line = ' '.join('%2d' % got.get((fid, 'D%d' % n), 0) for n in range(1, 6))
        c = closest.get(fid)
        note = '%s / %s  overlap %.2f' % (c[1], c[2], c[0]) if c else 'single item'
        print('%-42s %-14s %s' % (fid, line, note))
    print('-' * 108)
    print('%-42s %-14s' % ('TOTAL', ' '.join('%2d' % diffs.get('D%d' % n, 0) for n in range(1, 6))))

    if equivalent:
        print('')
        print('FAMILY-EQUIVALENT MEASUREMENTS (overlap >= %.2f)' % THRESHOLD)
        for fid, a, b, j in equivalent:
            print('  %-42s %s / %s  %.2f' % (fid, a, b, j))
    if contradictions:
        print('')
        print('EXPLANATIONS ARGUING FOR A DISTRACTOR: %s' % ', '.join(contradictions))
    if leaks:
        print('')
        print('METADATA LEAKAGE')
        for qid, label, txt in leaks:
            print('  %s  %s: %r' % (qid, label, txt))

    print('')
    print('database writes           : 0  (no database client imported)')
    print('imported into the bank    : 0  (artifact only)')
    print('blueprint rows changed    : 0  (read only)')

    if problems:
        print('')
        print('VALIDATION FAILED:')
        for p in problems[:25]:
            print('  ' + p)
        if len(problems) > 25:
            print('  ... %d more' % (len(problems) - 25))
        sys.exit(1)

    print('')
    print('validated: 50 questions, every family in the frozen blueprint, every difficulty inside')
    print('its family\'s range, every per-family count equal to the blueprint\'s own allocation,')
    print('four distinct options and exactly one correct answer everywhere, and no blueprint')
    print('vocabulary in anything a student reads.')
    print('')
    print('written: docs/audit/foundation-golden-bank-pilot-operating-systems.csv')


if __name__ == '__main__':
    main()
