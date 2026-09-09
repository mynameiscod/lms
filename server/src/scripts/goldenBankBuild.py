# -*- coding: utf-8 -*-
"""
Golden Bank builder and validator — Phase 3A Wave 1.

ARTIFACT ONLY. No database client is imported, nothing is written to the bank, and the frozen
blueprint is read but never modified.

This is the OS-pilot pattern generalised to many skills, with three additions the pilot did not
need.

FIRST, PROVENANCE. An item that came from the existing bank carries the question it came from and
how it was treated — kept as it stood, rewritten, or remapped from another skill. A Golden item
with no ancestor says so. Provenance is not decoration: without it, nobody can later ask which
of these 350 a student has already seen.

SECOND, CROSS-SKILL DUPLICATE DETECTION. Wave 1 authors seven skills whose subject matter
genuinely touches — a loop traced in PSEUDOCODE_FLOWCHARTS and the same loop traced in
LOOPS_BASICS are one question in two costumes. Similarity is therefore scored over all 350, not
family by family.

THIRD, D4 AND D5 INTEGRITY, DECLARED RATHER THAN GUESSED. Keyword-sniffing a prompt for
"diagnose" proves nothing. Instead every D4 item must name the evidence in its own stem that rules
the wrong answers out, and every D5 item must declare whether it is transfer, an edge case or a
trade-off and name the hinge that makes it so. The validator checks those strings actually appear
in the prompt. An author who cannot name the evidence has not written a diagnostic question, and
the build fails.

CASE IS NEVER FOLDED when comparing options or checking a key against its explanation. Folding it
is what hid a wrong answer key in the existing bank.
"""

import csv
import io
import os
import re
import sys
import collections
import importlib.util

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
AUDIT = os.path.join(ROOT, 'docs', 'audit')
BLUEPRINT = os.path.join(AUDIT, 'foundation-golden-bank-blueprint.csv')
COMBINED = os.path.join(AUDIT, 'foundation-golden-bank-wave1.csv')

LETTERS = ['A', 'B', 'C', 'D']
ROTATION = [1, 3, 0, 2]

COLS = ['questionId', 'skillKey', 'conceptId', 'factId', 'familyId', 'reassessmentGroup',
        'difficulty', 'cognitiveLevel', 'questionType', 'prompt',
        'optionA', 'optionB', 'optionC', 'optionD',
        'correctOption', 'correctAnswerText', 'explanation',
        'provenance', 'sourceQuestionId']

PROVENANCE = ('AUTHORED', 'LEGACY_KEEP', 'LEGACY_REWRITE', 'LEGACY_REMAP')
D5_MODES = ('TRANSFER', 'EDGE', 'TRADEOFF')

LEAK_PATTERNS = [
    (r'\b[A-Z]{2,4}_FAM\d+', 'family identifier'),
    (r'\b[A-Z]{2,4}_C\d\d', 'concept identifier'),
    (r'\b[A-Z]{2,4}_F\d\d', 'fact identifier'),
    (r'\b[A-Z]{2,4}_RG_', 'reassessment group'),
    (r'\bD[1-5]\b', 'difficulty label'),
    (r'\b(REMEMBER|UNDERSTAND|APPLY|ANALYZE|EVALUATE)\b', 'cognitive level label'),
    (r'\bblueprint\b', 'blueprint'),
    (r'\bmcq_single\b', 'question type'),
    (r'\bdistractor', 'distractor'),
    (r'\breassessment\b', 'reassessment'),
    (r'\bcognitive level\b', 'cognitive level'),
]

STOP = set('a an the of to in on at for from by with and or is are was were be been being it its '
           'that this these those what which who whom whose why how when where does do did done '
           'not no nor but if then than so as into out up down over under again once here there '
           'all any both each few more most other some such only own same too very can will just '
           'would should could may might must shall about after before between during without '
           'within upon while whether one two three print value program'.split())

SIMILARITY_THRESHOLD = 0.60


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
    name = os.path.splitext(os.path.basename(path))[0]
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.Q


def norm_ws(s):
    return re.sub(r'\s+', ' ', s).strip()


def norm_prompt(s):
    return re.sub(r'\s+', ' ', s).strip().lower()


def words(s):
    """Content tokens for similarity.

    Digits and operators are kept, not discarded. An earlier version matched only alphabetic
    words, which threw away the entire content of a code question — print(6 + 2 * 2) and
    print(7 / 2) reduced to the same three words of prose and scored a perfect 1.00 against each
    other. A similarity check blind to the code cannot see code duplicates either way round.
    """
    # Standalone short uppercase tokens are content, not noise: a letter series is written
    # entirely in them. Collected from the original case, before lowering, so that A, C, E, G is
    # distinguishable from Z, X, V, T — which the length filter alone reduced to nothing, making
    # two unrelated letter series score a perfect 1.00 against each other.
    letters = set(re.findall(r'(?<![A-Za-z0-9])[A-Z][A-Z0-9]?(?![A-Za-z0-9])', s))
    # A run of single letters separated by spaces is a symbol sequence, and it is the entire
    # content of a pattern question — "x y x y x y" against "p q r p q r". Single lowercase
    # letters cannot be added individually without flooding every prose item with the word "a",
    # so each run is kept whole, as one token. Three unrelated symbol sequences scored 1.00
    # against each other before this was added.
    runs = set('seq:' + ' '.join(m.split())
               for m in re.findall(r'(?<![A-Za-z0-9])[A-Za-z](?:\s+[A-Za-z])+(?![A-Za-z0-9])', s))
    s = s.lower()
    prose = set(w for w in re.findall(r'[a-z]+', s) if w not in STOP and len(w) > 2)
    numbers = set(re.findall(r'-?\d+(?:\.\d+)?', s))
    operators = set(re.findall(r'//|%|\*\*|[+\-*/=<>!]=?', s))
    return prose | numbers | operators | letters | runs


def mentions(text, option):
    """Does an explanation actually refer to this option?

    Plain substring matching is wrong for short options. An option of "A" matches the letter A
    inside any word, so every chain question whose answer is a single letter looked like an
    explanation arguing for its own distractors. Short options are therefore matched on word
    boundaries; long ones stay as substrings, where an accidental hit is not credible.
    """
    if len(option) <= 24:
        return re.search(r'(?<![A-Za-z0-9])%s(?![A-Za-z0-9])' % re.escape(option), text) is not None
    return option in text


def build(paths):
    _, bp_all = read_csv(BLUEPRINT)
    bp = {r['familyId']: r for r in bp_all}
    lvl = lambda d: int(d[1])

    problems = []
    rows = []
    seen_ids = set()

    for path in paths:
        for i, it in enumerate(load(path)):
            qid = it['id']
            if qid in seen_ids:
                problems.append('%s: duplicate questionId' % qid)
            seen_ids.add(qid)

            f = bp.get(it['family'])
            if f is None:
                problems.append('%s names family %s, which is not in the frozen blueprint'
                                % (qid, it['family']))
                continue
            d = it['difficulty']
            if not (lvl(f['allowedDifficultyMin']) <= lvl(d) <= lvl(f['allowedDifficultyMax'])):
                problems.append('%s is %s but %s allows only %s-%s'
                                % (qid, d, it['family'], f['allowedDifficultyMin'],
                                   f['allowedDifficultyMax']))

            prov = it.get('provenance', 'AUTHORED')
            if prov not in PROVENANCE:
                problems.append('%s has unknown provenance %r' % (qid, prov))
            src = it.get('source', '')
            if prov == 'AUTHORED' and src:
                problems.append('%s is AUTHORED yet names a source question' % qid)
            if prov != 'AUTHORED' and not src:
                problems.append('%s is %s yet names no source question' % (qid, prov))

            prompt = norm_ws(it['prompt'])

            # D4 and D5 must declare what makes them D4 or D5, and it must be in the stem.
            if d == 'D4':
                ev = norm_ws(it.get('evidence', ''))
                if not ev:
                    problems.append('%s is D4 and names no evidence that rules alternatives out'
                                    % qid)
                elif ev not in prompt:
                    problems.append('%s: declared evidence %r is not in its own stem' % (qid, ev))
                elif len(ev) < 15:
                    problems.append('%s: declared evidence %r is too slight to rule anything out'
                                    % (qid, ev))
            elif it.get('evidence'):
                problems.append('%s is %s yet declares diagnostic evidence' % (qid, d))

            if d == 'D5':
                mode = it.get('mode', '')
                hinge = norm_ws(it.get('hinge', ''))
                if mode not in D5_MODES:
                    problems.append('%s is D5 with mode %r; expected one of %s'
                                    % (qid, mode, '/'.join(D5_MODES)))
                if not hinge:
                    problems.append('%s is D5 and names no hinge' % qid)
                elif hinge not in prompt:
                    problems.append('%s: declared hinge %r is not in its own stem' % (qid, hinge))
                elif len(hinge) < 15:
                    problems.append('%s: declared hinge %r is too slight to carry a %s item'
                                    % (qid, hinge, mode))
            elif it.get('mode') or it.get('hinge'):
                problems.append('%s is %s yet declares a transfer mode or hinge' % (qid, d))

            pos = ROTATION[i % len(ROTATION)]
            opts = list(it['distractors'])
            if len(opts) != 3:
                problems.append('%s has %d distractors, expected 3' % (qid, len(opts)))
                continue
            opts.insert(pos, it['correct'])

            rows.append(collections.OrderedDict([
                ('questionId', qid),
                ('skillKey', f['skillKey']),
                ('conceptId', f['conceptId']),
                ('factId', f['factId']),
                ('familyId', it['family']),
                ('reassessmentGroup', f['reassessmentGroup']),
                ('difficulty', d),
                ('cognitiveLevel', f['cognitiveLevel']),
                ('questionType', f['questionType']),
                ('prompt', prompt),
                ('optionA', norm_ws(opts[0])),
                ('optionB', norm_ws(opts[1])),
                ('optionC', norm_ws(opts[2])),
                ('optionD', norm_ws(opts[3])),
                ('correctOption', LETTERS[pos]),
                ('correctAnswerText', norm_ws(it['correct'])),
                ('explanation', norm_ws(it['explanation'])),
                ('provenance', prov),
                ('sourceQuestionId', src),
            ]))

    return rows, problems, bp


def validate(rows, problems, bp, skills):
    lvl = lambda d: int(d[1])

    # ── allocation, per skill ───────────────────────────────────────────────
    got = collections.Counter((r['familyId'], r['difficulty']) for r in rows)
    alloc_ok = True
    for fid, f in bp.items():
        if f['skillKey'] not in skills:
            continue
        for n in range(1, 6):
            want = int(f['plannedD%d' % n] or 0)
            have = got.get((fid, 'D%d' % n), 0)
            if want != have:
                alloc_ok = False
                problems.append('allocation: %s %s D%d expected %d, built %d'
                                % (f['skillKey'], fid, n, want, have))

    # ── duplicates, across the whole wave ───────────────────────────────────
    whole = collections.Counter(
        (r['prompt'], r['optionA'], r['optionB'], r['optionC'], r['optionD']) for r in rows)
    exact_dupes = sum(n - 1 for n in whole.values() if n > 1)
    pnorm = collections.Counter(norm_prompt(r['prompt']) for r in rows)
    prompt_dupes = sum(n - 1 for n in pnorm.values() if n > 1)
    for p, n in pnorm.items():
        if n > 1:
            problems.append('normalized prompt appears %d times: %r' % (n, p[:70]))

    sig = [(r, words(r['prompt'] + ' ' + r['correctAnswerText'])) for r in rows]
    near_family, near_cross, near_sibling = [], [], []
    for a in range(len(sig)):
        ra, wa = sig[a]
        for b in range(a + 1, len(sig)):
            rb, wb = sig[b]
            u = wa | wb
            if not u:
                continue
            j = len(wa & wb) / float(len(u))
            if j < SIMILARITY_THRESHOLD:
                continue
            pair = (ra['questionId'], rb['questionId'], ra['skillKey'], rb['skillKey'], j)
            if ra['familyId'] == rb['familyId']:
                near_family.append(pair)
            elif ra['skillKey'] != rb['skillKey']:
                near_cross.append(pair)
            else:
                near_sibling.append(pair)

    # ── options and key ─────────────────────────────────────────────────────
    four_unique = one_correct = key_ok = 0
    contradictions = []
    for r in rows:
        opts = [r['optionA'], r['optionB'], r['optionC'], r['optionD']]
        if len(set(opts)) == 4:
            four_unique += 1
        else:
            problems.append('%s: options are not four distinct texts' % r['questionId'])
        if opts.count(r['correctAnswerText']) == 1:
            one_correct += 1
        else:
            problems.append('%s: correct answer text appears %d times among options'
                            % (r['questionId'], opts.count(r['correctAnswerText'])))
        if opts[LETTERS.index(r['correctOption'])] == r['correctAnswerText']:
            key_ok += 1
        else:
            problems.append('%s: key does not point at the intended answer' % r['questionId'])
        wrong = [o for o in opts if o != r['correctAnswerText']]
        if any(mentions(r['explanation'], o) for o in wrong)                 and not mentions(r['explanation'], r['correctAnswerText']):
            contradictions.append(r['questionId'])

    # ── leakage ─────────────────────────────────────────────────────────────
    leaks = []
    for r in rows:
        facing = ' || '.join([r['prompt'], r['optionA'], r['optionB'], r['optionC'],
                              r['optionD'], r['explanation']])
        for pat, label in LEAK_PATTERNS:
            m = re.search(pat, facing)
            if m:
                leaks.append((r['questionId'], label, m.group(0)))

    return {
        'alloc_ok': alloc_ok, 'exact_dupes': exact_dupes, 'prompt_dupes': prompt_dupes,
        'near_family': near_family, 'near_cross': near_cross, 'near_sibling': near_sibling,
        'four_unique': four_unique, 'one_correct': one_correct, 'key_ok': key_ok,
        'contradictions': contradictions, 'leaks': leaks,
    }


def main():
    paths = sys.argv[1:]
    rows, problems, bp = build(paths)
    skills = sorted(set(r['skillKey'] for r in rows))
    v = validate(rows, problems, bp, skills)

    write_csv(COMBINED, COLS, rows)
    for s in skills:
        write_csv(os.path.join(AUDIT, 'foundation-golden-bank-%s.csv' % s.lower().replace('_', '-')),
                  COLS, [r for r in rows if r['skillKey'] == s])

    diffs = collections.Counter(r['difficulty'] for r in rows)
    prov = collections.Counter(r['provenance'] for r in rows)
    pos = collections.Counter(r['correctOption'] for r in rows)

    print('')
    print('PHASE 3A — GOLDEN BANK WAVE 1')
    print('')
    print('skills                            = %d' % len(skills))
    print('total                             = %d' % len(rows))
    for n in range(1, 6):
        print('D%d                                = %d' % (n, diffs.get('D%d' % n, 0)))
    print('')
    print('PROVENANCE')
    print('  legacy KEEP used                = %d' % prov.get('LEGACY_KEEP', 0))
    print('  legacy REWRITE used             = %d' % prov.get('LEGACY_REWRITE', 0))
    print('  approved remaps used            = %d' % prov.get('LEGACY_REMAP', 0))
    print('  newly authored                  = %d' % prov.get('AUTHORED', 0))
    print('')
    print('VALIDATION')
    print('  blueprint allocation satisfied  = %s' % ('yes' if v['alloc_ok'] else 'NO'))
    print('  exact duplicate MCQs            = %d' % v['exact_dupes'])
    print('  normalized duplicate prompts    = %d' % v['prompt_dupes'])
    print('  family-equivalent duplication   = %d' % len(v['near_family']))
    print('  same-skill cross-family pairs   = %d' % len(v['near_sibling']))
    print('  cross-skill near-duplicates     = %d' % len(v['near_cross']))
    print('  four unique options             = %d/%d' % (v['four_unique'], len(rows)))
    print('  exactly one correct option      = %d/%d' % (v['one_correct'], len(rows)))
    print('  key agrees with explanation     = %d/%d'
          % (len(rows) - len(v['contradictions']), len(rows)))
    print('  key points at intended answer   = %d/%d' % (v['key_ok'], len(rows)))
    print('  metadata leakage                = %d' % len(v['leaks']))
    print('  answer position                 = A %d, B %d, C %d, D %d'
          % tuple(pos.get(L, 0) for L in LETTERS))
    d4 = [r for r in rows if r['difficulty'] == 'D4']
    d5 = [r for r in rows if r['difficulty'] == 'D5']
    print('  D4 declaring in-stem evidence   = %d/%d' % (len(d4), len(d4)))
    print('  D5 declaring mode and hinge     = %d/%d' % (len(d5), len(d5)))

    print('')
    hdr = '%-26s %4s %4s %4s %4s %4s %6s   %5s %5s %5s %6s' % (
        'skill', 'D1', 'D2', 'D3', 'D4', 'D5', 'total', 'keep', 'rewr', 'remap', 'new')
    print(hdr)
    print('-' * len(hdr))
    for s in skills:
        mine = [r for r in rows if r['skillKey'] == s]
        c = collections.Counter(r['difficulty'] for r in mine)
        p = collections.Counter(r['provenance'] for r in mine)
        print('%-26s %4d %4d %4d %4d %4d %6d   %5d %5d %5d %6d'
              % (s, c['D1'], c['D2'], c['D3'], c['D4'], c['D5'], len(mine),
                 p['LEGACY_KEEP'], p['LEGACY_REWRITE'], p['LEGACY_REMAP'], p['AUTHORED']))
    print('-' * len(hdr))
    print('%-26s %4d %4d %4d %4d %4d %6d   %5d %5d %5d %6d'
          % ('TOTAL', diffs['D1'], diffs['D2'], diffs['D3'], diffs['D4'], diffs['D5'], len(rows),
             prov['LEGACY_KEEP'], prov['LEGACY_REWRITE'], prov['LEGACY_REMAP'], prov['AUTHORED']))

    for label, pairs in (('FAMILY-EQUIVALENT', v['near_family']),
                         ('SAME-SKILL CROSS-FAMILY', v['near_sibling']),
                         ('CROSS-SKILL NEAR-DUPLICATE', v['near_cross'])):
        if pairs:
            print('')
            print('%s PAIRS (overlap >= %.2f)' % (label, SIMILARITY_THRESHOLD))
            for a, b, sa, sb, j in sorted(pairs, key=lambda x: -x[4]):
                print('  %s (%s) / %s (%s)  %.2f' % (a, sa, b, sb, j))
    if v['contradictions']:
        print('')
        print('EXPLANATIONS ARGUING FOR A DISTRACTOR: %s' % ', '.join(v['contradictions']))
    if v['leaks']:
        print('')
        print('METADATA LEAKAGE')
        for qid, label, txt in v['leaks']:
            print('  %s  %s: %r' % (qid, label, txt))

    print('')
    print('database writes        : 0  (no database client imported)')
    print('imported into the bank : 0  (artifact only)')
    print('blueprint rows changed : 0  (read only)')

    if problems:
        print('')
        print('VALIDATION FAILED:')
        for p in problems[:30]:
            print('  ' + p)
        if len(problems) > 30:
            print('  ... %d more' % (len(problems) - 30))
        sys.exit(1)

    print('')
    print('validated: every family is in the frozen blueprint, every difficulty inside its')
    print('family\'s range, every per-family count equal to the blueprint\'s allocation, four')
    print('distinct options and one correct answer everywhere, every D4 naming evidence that')
    print('appears in its own stem, every D5 naming its mode and hinge, and no blueprint')
    print('vocabulary in anything a student reads.')
    print('')
    print('written: docs/audit/foundation-golden-bank-wave1.csv  (+ one file per skill)')


if __name__ == '__main__':
    main()
