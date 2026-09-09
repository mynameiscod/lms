# -*- coding: utf-8 -*-
"""
Phase 2.5 — write the skill-boundary reconciliation proposal, and prove it is sound.

READ-ONLY WITH RESPECT TO THE DATABASE. No database client is imported. Two CSVs are written.
No question text is read for output, no question is generated, nothing is remapped in the
database — this proposes, it does not apply.

WHAT IT REFUSES TO LET THROUGH
  - a candidate with no entry, or an entry for a question that is not a candidate
  - an action outside the four the brief allows
  - a REMAP_PRIMARY whose family is not in the blueprint, belongs to a different skill than the
    one proposed, or whose conceptId/factId do not match that family's own
  - a REMAP_PRIMARY that proposes the skill the question is already filed under
  - a non-remap action that nevertheless carries a family
  - an empty reason, or a reason template given the wrong number of arguments

WHAT IT REPORTS RATHER THAN REFUSES — these are judgements for the reviewer, not errors:
  - a remap landing below its new family's difficulty range
  - a family receiving more items than its blueprint allocation allows
  - a family that already holds a Phase-2 KEEP or REWRITE

  python server/src/scripts/foundationRemapPhase25.py <path-to-remap_table.py>
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
PROPOSAL = os.path.join(ROOT, 'docs', 'audit', 'foundation-question-remap-proposal.csv')
SUMMARY = os.path.join(ROOT, 'docs', 'audit', 'foundation-question-remap-summary.csv')

PROPOSAL_COLS = ['questionId', 'currentSkillKey', 'proposedSkillKey', 'proposedConceptId',
                 'proposedFactId', 'proposedFamilyId', 'reason', 'confidence', 'action']
ACTIONS = ('REMAP_PRIMARY', 'KEEP_CURRENT', 'OUT_OF_SCOPE', 'BLUEPRINT_REVIEW')
GOLDEN_PER_SKILL = 50
ASSESSABLE_SKILLS = 33


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
    spec = importlib.util.spec_from_file_location('remap_table', path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.T, mod.R


def is_candidate(r):
    """A Phase-2 REJECT or REWRITE whose note said the measurement belongs elsewhere."""
    if r['goldenDecision'] == 'KEEP':
        return False
    n = r['reviewNotes']
    return (n.startswith('No ') or n.startswith('Outside')
            or (n.startswith('REDUNDANT') and 'neither fits' in n))


def main():
    T, R = load_table(sys.argv[1])

    _, bp = read_csv(BLUEPRINT)
    _, cls = read_csv(CLASSIFY)

    fam = {r['familyId']: r for r in bp}
    lvl = lambda d: int(d[1])
    alloc = {}
    for r in bp:
        alloc[r['familyId']] = int(r['plannedTotal'] or 0)

    # families that already hold a Phase-2 KEEP or REWRITE
    already = collections.Counter(r['familyId'] for r in cls
                                 if r['goldenDecision'] in ('KEEP', 'REWRITE') and r['familyId'])

    problems = []
    notes = []
    rows = []
    post = {}          # questionId[-6:] -> (finalSkill, finalDecision, difficulty)
    seen = set()

    by_id = {r['questionId'][-6:]: r for r in cls}

    for r in cls:
        sid = r['questionId'][-6:]
        if not is_candidate(r):
            continue
        if sid not in T:
            problems.append('%s (%s) is a candidate with no entry' % (sid, r['skillKey']))
            continue
        seen.add(sid)
        skill, concept, fact, family, action, conf, pdec, code, arg = T[sid]

        tmpl = R.get(code)
        if tmpl is None:
            problems.append('%s uses unknown reason code %s' % (sid, code))
            reason = code
        else:
            want = tmpl.count('%s')
            if len(arg) != want:
                problems.append('%s: reason %s wants %d argument(s), got %d'
                                % (sid, code, want, len(arg)))
                reason = tmpl.replace('%s', '?')
            else:
                reason = tmpl % arg

        if action not in ACTIONS:
            problems.append('%s has invalid action %s' % (sid, action))
        if not reason.strip():
            problems.append('%s has an empty reason' % sid)
        if conf not in ('HIGH', 'MEDIUM', 'LOW'):
            problems.append('%s has invalid confidence %s' % (sid, conf))

        if action == 'REMAP_PRIMARY':
            if not family:
                problems.append('%s is REMAP_PRIMARY with no family' % sid)
            elif family not in fam:
                problems.append('%s names family %s which is not in the blueprint' % (sid, family))
            else:
                f = fam[family]
                if f['skillKey'] != skill:
                    problems.append('%s: family %s belongs to %s, proposed skill is %s'
                                    % (sid, family, f['skillKey'], skill))
                if concept != f['conceptId']:
                    problems.append('%s: conceptId %s does not match family %s (%s)'
                                    % (sid, concept, family, f['conceptId']))
                if fact != f['factId']:
                    problems.append('%s: factId %s does not match family %s (%s)'
                                    % (sid, fact, family, f['factId']))
                d = r['proposedDifficulty']
                if d and not (lvl(f['allowedDifficultyMin']) <= lvl(d) <= lvl(f['allowedDifficultyMax'])):
                    notes.append('%s carries %s into %s, whose range is %s-%s'
                                 % (sid, d, family, f['allowedDifficultyMin'], f['allowedDifficultyMax']))
            if skill == r['skillKey']:
                problems.append('%s proposes the skill it is already filed under' % sid)
            if pdec not in ('KEEP', 'REWRITE'):
                problems.append('%s is REMAP_PRIMARY with postDecision %r' % (sid, pdec))
            post[sid] = (skill, pdec, r['proposedDifficulty'])
        else:
            if family and action != 'KEEP_CURRENT':
                problems.append('%s is %s yet names family %s' % (sid, action, family))
            if pdec:
                problems.append('%s is %s yet carries postDecision %s' % (sid, action, pdec))

        rows.append(collections.OrderedDict([
            ('questionId', r['questionId']),
            ('currentSkillKey', r['skillKey']),
            ('proposedSkillKey', skill),
            ('proposedConceptId', concept),
            ('proposedFactId', fact),
            ('proposedFamilyId', family),
            ('reason', reason),
            ('confidence', conf),
            ('action', action),
        ]))

    for extra in sorted(set(T) - seen):
        problems.append('table has an entry for %s, which is not a candidate' % extra)

    write_csv(PROPOSAL, PROPOSAL_COLS, rows)

    # ── oversubscription and collision, reported not refused ────────────────
    landing = collections.Counter(x['proposedFamilyId'] for x in rows
                                 if x['action'] == 'REMAP_PRIMARY')
    over = []
    for f, n in sorted(landing.items()):
        cap = alloc.get(f)
        held = already.get(f, 0)
        if cap is not None and n + held > cap:
            over.append((f, n, held, cap))

    # ── recalculated position, assuming every REMAP_PRIMARY is approved ──────
    final = {}
    for r in cls:
        sid = r['questionId'][-6:]
        if sid in post:
            skill, dec, diff = post[sid]
        else:
            skill, dec, diff = r['skillKey'], r['goldenDecision'], r['proposedDifficulty']
        final[sid] = (skill, dec, diff)

    skills = sorted(set(x[0] for x in final.values()))
    out = []
    for s in skills:
        mine = [v for v in final.values() if v[0] == s]
        keeps = [v for v in mine if v[1] == 'KEEP']
        rewr = [v for v in mine if v[1] == 'REWRITE']
        usable = keeps + rewr
        row = collections.OrderedDict()
        row['skillKey'] = s
        row['inboundRemaps'] = len([sid for sid, v in post.items() if v[0] == s])
        row['outboundRemaps'] = len([sid for sid in post
                                     if by_id[sid]['skillKey'] == s])
        row['keep'] = len(keeps)
        row['rewrite'] = len(rewr)
        row['reject'] = len([v for v in mine if v[1] == 'REJECT'])
        row['usable'] = len(usable)
        for d in range(1, 6):
            row['D%dUsable' % d] = len([v for v in usable if v[2] == 'D%d' % d])
        row['missingTo50'] = GOLDEN_PER_SKILL - len(usable)
        out.append(row)
    write_csv(SUMMARY, list(out[0].keys()), out)

    # ── report ──────────────────────────────────────────────────────────────
    before = collections.Counter(r['goldenDecision'] for r in cls)
    after = collections.Counter(v[1] for v in final.values())
    usable_before = before['KEEP'] + before['REWRITE']
    usable_after = after['KEEP'] + after['REWRITE']
    acts = collections.Counter(x['action'] for x in rows)

    print('')
    print('PHASE 2.5 — FOUNDATION SKILL-BOUNDARY RECONCILIATION')
    print('')
    print('candidates examined   : %d' % len(rows))
    for a in ACTIONS:
        print('  %-18s: %3d' % (a, acts.get(a, 0)))
    conf = collections.Counter(x['confidence'] for x in rows if x['action'] == 'REMAP_PRIMARY')
    print('  remap confidence  : HIGH %d, MEDIUM %d, LOW %d'
          % (conf.get('HIGH', 0), conf.get('MEDIUM', 0), conf.get('LOW', 0)))

    print('')
    print('WHERE THE REMAPS GO')
    flow = collections.Counter((x['currentSkillKey'], x['proposedSkillKey'])
                               for x in rows if x['action'] == 'REMAP_PRIMARY')
    for (a, b), n in sorted(flow.items(), key=lambda x: (-x[1], x[0])):
        print('  %-30s -> %-28s %2d' % (a, b, n))

    print('')
    print('COUNTS, ASSUMING EVERY REMAP_PRIMARY IS APPROVED')
    print('  %-22s %8s %8s' % ('', 'phase 2', 'phase 2.5'))
    for k in ('KEEP', 'REWRITE', 'REJECT'):
        print('  %-22s %8d %8d' % (k, before[k], after[k]))
    print('  %-22s %8d %8d' % ('usableAfterRewrite', usable_before, usable_before))
    print('  %-22s %8s %8d' % ('usableAfterRemap', '-', usable_after))
    print('  %-22s %8d %8d' % ('missingTo1650',
                               ASSESSABLE_SKILLS * GOLDEN_PER_SKILL - usable_before,
                               ASSESSABLE_SKILLS * GOLDEN_PER_SKILL - usable_after))

    print('')
    hdr = ('%-30s %4s %4s %5s %5s %5s %6s   %3s %3s %3s %3s %3s %6s'
           % ('skill', 'in', 'out', 'keep', 'rewr', 'rej', 'usable',
              'D1', 'D2', 'D3', 'D4', 'D5', 'need'))
    print(hdr)
    print('-' * len(hdr))
    for s in out:
        print('%-30s %4d %4d %5d %5d %5d %6d   %3d %3d %3d %3d %3d %6d'
              % (s['skillKey'], s['inboundRemaps'], s['outboundRemaps'], s['keep'], s['rewrite'],
                 s['reject'], s['usable'], s['D1Usable'], s['D2Usable'], s['D3Usable'],
                 s['D4Usable'], s['D5Usable'], s['missingTo50']))
    print('-' * len(hdr))
    tot = lambda k: sum(s[k] for s in out)
    print('%-30s %4d %4d %5d %5d %5d %6d   %3d %3d %3d %3d %3d'
          % ('TOTAL (%d skills touched)' % len(out), tot('inboundRemaps'), tot('outboundRemaps'),
             tot('keep'), tot('rewrite'), tot('reject'), tot('usable'),
             tot('D1Usable'), tot('D2Usable'), tot('D3Usable'), tot('D4Usable'), tot('D5Usable')))

    if notes:
        print('')
        print('REMAPS LANDING BELOW THEIR NEW FAMILY\'S RANGE (%d) — each is a REWRITE, not a KEEP'
              % len(notes))
        for n in notes:
            print('  ' + n)

    if over:
        excess = sum(n + held - cap for _, n, held, cap in over)
        print('')
        print('FAMILIES RECEIVING MORE THAN THEIR BLUEPRINT ALLOCATION (%d)' % len(over))
        for f, n, held, cap in over:
            print('  %-38s %d inbound + %d already kept > %d allocated  (excess %d)'
                  % (f, n, held, cap, n + held - cap))
        print('')
        print('  Total excess: %d. The blueprint caps how many questions a family may hold, so'
              % excess)
        print('  usableAfterRemap of %d becomes %d once each family is trimmed to its allocation.'
              % (usable_after, usable_after - excess))
        print('  That %d is the honest ceiling; %d assumes every remap survives review.'
              % (usable_after - excess, usable_after))

    print('')
    print('database writes           : 0  (no database client imported)')
    print('questions generated       : 0')
    print('questions remapped in situ: 0  (this proposes; applying is a separate decision)')

    if problems:
        print('')
        print('VALIDATION FAILED:')
        for p in problems[:25]:
            print('  ' + p)
        if len(problems) > 25:
            print('  ... %d more' % (len(problems) - 25))
        sys.exit(1)

    print('')
    print('validated: every candidate has exactly one entry, every REMAP_PRIMARY names a family that')
    print('exists, belongs to the proposed skill, matches its concept and fact, and differs from the')
    print('skill the question is filed under; every decision carries a reason.')
    print('')
    print('written: docs/audit/foundation-question-remap-proposal.csv')
    print('written: docs/audit/foundation-question-remap-summary.csv')


if __name__ == '__main__':
    main()
