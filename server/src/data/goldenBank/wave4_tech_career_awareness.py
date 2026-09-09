# -*- coding: utf-8 -*-
"""
Wave 4 — TECH_CAREER_AWARENESS, 50 Golden Bank questions, all newly authored.

THE WHOLE SKILL RESTS ON ONE DISTINCTION: a claim is what somebody says about themselves, and
evidence is what another person can check. The blueprint names it in CR_FAM02 and returns to it in
four further families — which claims a CV leaves unsupported, what a project actually
demonstrates, which of two signals establishes more, and where the gap between a requirement and
the evidence lies.

GOALS AND CONSTRAINTS ARE ALWAYS STATED IN THE STEM. Whether an opportunity fits, whether a choice
is defensible and whether a goal should be revised have no answers until somebody says what is
being aimed at and what is ruled out. Without that these would be opinion questions wearing a
multiple-choice costume, which is exactly what the blueprint forbids.
"""

Q = []


def q(qid, family, difficulty, prompt, correct, distractors, explanation,
      provenance='AUTHORED', source='', evidence=None, mode=None, hinge=None):
    assert len(distractors) == 3, qid
    it = {'id': qid, 'family': family, 'difficulty': difficulty, 'prompt': prompt,
          'correct': correct, 'distractors': list(distractors), 'explanation': explanation,
          'provenance': provenance, 'source': source}
    if evidence:
        it['evidence'] = evidence
    if mode:
        it['mode'] = mode
    if hinge:
        it['hinge'] = hinge
    Q.append(it)


# =========================================================================
# CR_FAM01_ROLE_WORK_RECOGNITION — D1 x4, D2 x1   (concrete tasks, not adjectives)
# =========================================================================
q('GB_CR_001', 'CR_FAM01_ROLE_WORK_RECOGNITION', 'D1',
  'Someone spends their day writing and reviewing the code that runs a company\'s website. Which '
  'role is that?',
  'Software developer',
  ['Data analyst', 'Project manager', 'Systems administrator'],
  'Writing and reviewing code is the developer\'s daily work. An analyst works with data, a '
  'manager coordinates the work, and an administrator keeps the systems running.')

q('GB_CR_002', 'CR_FAM01_ROLE_WORK_RECOGNITION', 'D1',
  'Someone spends their day writing queries against a database and preparing reports on what the '
  'numbers show. Which role is that?',
  'Data analyst',
  ['Software developer', 'Database administrator', 'Support engineer'],
  'Querying data and reporting on it is analysis. A database administrator keeps the database '
  'itself running, which is adjacent work with different accountability.')

q('GB_CR_003', 'CR_FAM01_ROLE_WORK_RECOGNITION', 'D1',
  'Someone spends their day investigating problems reported by customers and telling the '
  'engineering team what is reproducible. Which role is that?',
  'Support engineer',
  ['Software developer', 'Project manager', 'Data analyst'],
  'Reproducing reported problems and passing them on is support work. A developer may fix what is '
  'found, which is the next step rather than the same job.')

q('GB_CR_004', 'CR_FAM01_ROLE_WORK_RECOGNITION', 'D1',
  'Someone spends their day setting up the machines an application runs on and keeping them '
  'available. Which role is that?',
  'Systems administrator',
  ['Software developer', 'Data analyst', 'Support engineer'],
  'Preparing and maintaining the machines is administration. Writing what runs on them is a '
  'different job, though in a small team one person may do both.')

q('GB_CR_005', 'CR_FAM01_ROLE_WORK_RECOGNITION', 'D2',
  'In a very small company, one person writes the code, sets up the servers and answers customer '
  'problems. What does that show about roles?',
  'The work is the same in any company; who does it depends on how many people there are',
  ['That the roles are not really distinct',
   'That small companies do not need specialists',
   'That the person holds three jobs at once'],
  'The tasks do not merge when one person does them all, which is why a larger team can split '
  'them along the same lines. What varies is the division of labour rather than the work.')

# =========================================================================
# CR_FAM02_ARTEFACT_PURPOSE — D1 x3, D2 x1
# =========================================================================
q('GB_CR_006', 'CR_FAM02_ARTEFACT_PURPOSE', 'D1',
  'What job does a CV do?',
  'States what someone claims to have done, so a reader can decide whether to look further',
  ['Proves what someone has done',
   'Lists every task someone has ever performed',
   'Replaces the need for an interview'],
  'A CV is a set of claims, which is why it opens a conversation rather than settling one. '
  'Anything that could be checked independently is evidence, and a CV is where it is pointed at.')

q('GB_CR_007', 'CR_FAM02_ARTEFACT_PURPOSE', 'D1',
  'What job does a portfolio of projects do?',
  'Shows work a reader can examine for themselves',
  ['Lists the technologies someone has used',
   'Proves someone worked hard',
   'Replaces a CV entirely'],
  'A portfolio is checkable in a way a claim is not, which is the whole reason for having one. A '
  'list of technologies is another claim, in a different format.')

q('GB_CR_008', 'CR_FAM02_ARTEFACT_PURPOSE', 'D1',
  'What job does a reference do?',
  'Lets somebody who worked with the candidate confirm what they did',
  ['Adds a formality to the application',
   'Proves the candidate is a good person',
   'Replaces the need for evidence of work'],
  'A reference converts a claim into something another person will stand behind. Treating it as a '
  'formality is what makes candidates choose referees who cannot say anything specific.')

q('GB_CR_009', 'CR_FAM02_ARTEFACT_PURPOSE', 'D2',
  'A candidate needs to show they can build a working application. Which artefact serves that '
  'best?',
  'A project the reader can run or read',
  ['A CV line saying they can build applications',
   'A certificate from a course about building applications',
   'A reference saying they are hard-working'],
  'Only one of these lets the reader check the claim rather than accept it. A certificate shows a '
  'course was completed, which is a different fact.')

# =========================================================================
# CR_FAM03_ROUTE_RECOGNITION — D1 x3, D2 x1
# =========================================================================
q('GB_CR_010', 'CR_FAM03_ROUTE_RECOGNITION', 'D1',
  'What does an internship expect a candidate to show?',
  'Enough foundation to learn quickly, rather than experience of the work',
  ['Several years of experience in the role',
   'Nothing at all',
   'A completed degree in the subject'],
  'An internship exists to provide the experience, so demanding it would defeat the purpose. That '
  'does not make it open to anyone regardless of preparation.')

q('GB_CR_011', 'CR_FAM03_ROUTE_RECOGNITION', 'D1',
  'What does a graduate role expect a candidate to show?',
  'Foundations and evidence of learning, with training expected on the job',
  ['Nothing, since training is provided',
   'The same experience as an established developer',
   'Only a qualification, with nothing further'],
  'Training being provided sets the level rather than removing the requirement. A qualification is '
  'part of what is looked at and rarely the whole of it.')

q('GB_CR_012', 'CR_FAM03_ROUTE_RECOGNITION', 'D1',
  'Is a qualification on its own usually enough to obtain a first role?',
  'Rarely; it is one signal among several and says little about what someone can build',
  ['Yes; a qualification is what employers ask for',
   'No; qualifications are not considered at all',
   'Yes, provided the grade is high enough'],
  'A qualification establishes that a course was completed and leaves open what the candidate can '
  'do unsupervised. It is genuinely considered, which is why the answer is "rarely enough" rather '
  'than "irrelevant".')

q('GB_CR_013', 'CR_FAM03_ROUTE_RECOGNITION', 'D2',
  'Two routes into a first role are an internship and a graduate programme. What most distinguishes '
  'what they expect?',
  'The internship expects less prior evidence and offers less certainty of a continuing role',
  ['The internship expects more experience',
   'The graduate programme expects no preparation',
   'They expect exactly the same things'],
  'The two differ in what they ask for and in what they promise, and both differences run in the '
  'same direction. Neither expects nothing.')

# =========================================================================
# CR_FAM04_ROLE_SKILL_MATCH — D2, D3   (tool against skill is the confusion)
# =========================================================================
q('GB_CR_014', 'CR_FAM04_ROLE_SKILL_MATCH', 'D2',
  'Which skill does a data analyst\'s work depend on most?',
  'Reasoning about what data does and does not support',
  ['Knowing one particular spreadsheet product',
   'Communicating clearly, which every role needs',
   'Designing user interfaces'],
  'The underlying skill is judgement about evidence; the tools change and the judgement does not. '
  'Communication matters everywhere and so does not distinguish this role from any other.')

q('GB_CR_015', 'CR_FAM04_ROLE_SKILL_MATCH', 'D3',
  'A job advertisement lists a particular framework. What is the underlying skill it is standing '
  'in for?',
  'Building applications of that kind, which the framework is one way of doing',
  ['Familiarity with that framework and nothing else',
   'Willingness to learn new tools',
   'Experience of working in a team'],
  'A named tool is usually shorthand for the work it is used for, which is why someone with the '
  'skill in a different tool is often considered. Reading it as the requirement itself narrows '
  'the field to people who happen to have used one product.')

# =========================================================================
# CR_FAM05_EVIDENCE_RECOGNITION — D2, D3   (verifiability, not impressiveness)
# =========================================================================
q('GB_CR_016', 'CR_FAM05_EVIDENCE_RECOGNITION', 'D2',
  'Which of these statements about a candidate can somebody else check?',
  'A public repository containing an application they wrote',
  ['That they are passionate about technology',
   'That they worked very hard on their studies',
   'That they are a fast learner'],
  'Only one of these points at something a reader can open and examine. The others are '
  'self-assessments, which may be entirely true and cannot be confirmed by anyone else.')

q('GB_CR_017', 'CR_FAM05_EVIDENCE_RECOGNITION', 'D3',
  'A candidate lists "completed an online course in databases". Is that evidence of the skill?',
  'It is evidence the course was completed, and shows nothing that was built with it',
  ['Yes; the course covered the skill',
   'No; courses are worthless',
   'Yes, provided the course was long enough'],
  'Completion is a real and checkable fact about a course rather than about what the candidate can '
  'do. A project built afterwards is what turns it into evidence of the skill.')

# =========================================================================
# CR_FAM06_PROJECT_EVIDENCE — D2, D3, D4
# =========================================================================
q('GB_CR_018', 'CR_FAM06_PROJECT_EVIDENCE', 'D2',
  'A candidate built an application that stores records and lets a user search them. Which claimed '
  'skill does it support?',
  'Working with stored data and retrieving it',
  ['Designing large systems',
   'Managing a team',
   'Optimising performance at scale'],
  'The project demonstrates what it actually required. The other three are real skills the project '
  'gives no evidence about either way.')

q('GB_CR_019', 'CR_FAM06_PROJECT_EVIDENCE', 'D3',
  'A candidate\'s project uses a payment service through three lines of setup. Does it support a '
  'claim of experience with payment systems?',
  'Weakly; it shows the service was connected rather than that payments were reasoned about',
  ['Yes; the project handles payments',
   'No; using a service demonstrates nothing at all',
   'Yes, provided the payments worked'],
  'Using something trivially is a real but small piece of evidence, and it does not support a '
  'claim of depth. Dismissing it entirely overshoots — connecting a service is a genuine, if '
  'modest, thing to have done.')

q('GB_CR_020', 'CR_FAM06_PROJECT_EVIDENCE', 'D4',
  'A candidate presents a project as evidence of building a web application. The project was '
  'generated from a template and the candidate changed the text and colours. The project does work '
  'and is genuinely theirs to show. What does it demonstrate?',
  'That they can run and modify a generated project, not that they can build one',
  ['That they can build a web application',
   'Nothing at all',
   'That they can design interfaces'],
  'What a project demonstrates is what it required of the person presenting it, and here the '
  'structure was supplied. It is not worthless — running and modifying a project is something — '
  'and it does not support the claim being made.',
  evidence='The project was generated from a template and the candidate changed the text and '
           'colours')

# =========================================================================
# CR_FAM07_CLAIM_SUPPORT — D2, D3, D4
# =========================================================================
q('GB_CR_021', 'CR_FAM07_CLAIM_SUPPORT', 'D2',
  'A CV says: "Built a booking application (link). Comfortable with databases (link to the same '
  'project, which stores bookings). Experienced in team leadership." Which claim is unsupported?',
  'Experienced in team leadership',
  ['Built a booking application',
   'Comfortable with databases',
   'None; all three are supported'],
  'The first two point at a project the reader can open, and the third points at nothing in the '
  'document. Being unsupported does not make it untrue, only unverifiable from what is here.')

q('GB_CR_022', 'CR_FAM07_CLAIM_SUPPORT', 'D3',
  'A CV says: "Reduced page load time from 4 seconds to 1 second on the college portal. Familiar '
  'with performance tuning. Passionate about clean code." Which claim is unsupported?',
  'Passionate about clean code',
  ['Reduced page load time from 4 seconds to 1 second',
   'Familiar with performance tuning',
   'None; all three are supported'],
  'The stated outcome supports the first and, by implication, the second. The third is a statement '
  'about the candidate\'s feelings and nothing in the document bears on it.')

q('GB_CR_023', 'CR_FAM07_CLAIM_SUPPORT', 'D4',
  'A CV says: "Led a team of four on a final-year project. Delivered it two weeks early. Expert in '
  'distributed systems." The first two claims support each other and the project is described in '
  'detail. Which claim is unsupported, and what would support it?',
  'Expert in distributed systems; something built or operated at that scale would support it',
  ['Led a team of four; a reference would support it',
   'Delivered two weeks early; a schedule would support it',
   'None; a detailed project description supports all three'],
  'The first two are corroborated by the project described, and the third names a capability the '
  'project does not touch. Detail elsewhere in a document does not transfer to a claim it says '
  'nothing about.',
  evidence='The first two claims support each other and the project is described in detail')

# =========================================================================
# CR_FAM08_ROLE_DIFFERENTIATION — D2, D3, D4   (accountability, not title)
# =========================================================================
q('GB_CR_024', 'CR_FAM08_ROLE_DIFFERENTIATION', 'D2',
  'What most separates a support engineer from a software developer?',
  'What each is accountable for: reproducing and resolving reported problems against building and '
  'changing the product',
  ['The support engineer is more junior',
   'The developer uses more tools',
   'The support engineer works fixed hours'],
  'Roles are separated by accountability rather than by seniority, tooling or hours. Any of those '
  'may differ at one employer and none of them defines the role.')

q('GB_CR_025', 'CR_FAM08_ROLE_DIFFERENTIATION', 'D3',
  'What most separates a data analyst from a data engineer?',
  'The analyst is accountable for what the data means; the engineer for the pipelines that '
  'deliver it',
  ['The engineer is more senior',
   'The analyst uses spreadsheets and the engineer uses code',
   'They are the same role with different titles'],
  'Each owns a different question, which is why both exist on the same team. Tools overlap '
  'heavily and vary by employer, so they cannot be the discriminator.')

q('GB_CR_026', 'CR_FAM08_ROLE_DIFFERENTIATION', 'D4',
  'Two companies advertise a "software engineer" and the described work differs substantially. '
  'Both descriptions are accurate for their own company. What follows?',
  'A title is not a reliable guide to the work; the description is what has to be read',
  ['One of the two companies is using the title wrongly',
   'The two roles are actually the same and described differently',
   'Titles are meaningless and should be ignored entirely'],
  'Titles are not standardised across employers, so the same one covers a range of work. That does '
  'not make them meaningless — they narrow the field, and the description settles it.',
  evidence='Both descriptions are accurate for their own company')

# =========================================================================
# CR_FAM09_OPPORTUNITY_FIT — D2, D3, D4   (the goal is stated)
# =========================================================================
q('GB_CR_027', 'CR_FAM09_OPPORTUNITY_FIT', 'D2',
  'A student\'s stated goal is to become a data analyst. They are offered an unpaid internship '
  'writing reports from a company\'s sales data. Does it advance the goal?',
  'Yes; it is the work the goal names, and it produces evidence of doing it',
  ['No; it is unpaid',
   'No; internships do not count as experience',
   'Yes; any experience advances any goal'],
  'Fit is judged against the stated goal, and this is that work. Being unpaid is a real cost and a '
  'separate question from whether it advances the goal.')

q('GB_CR_028', 'CR_FAM09_OPPORTUNITY_FIT', 'D3',
  'A student\'s stated goal is to become a mobile developer. They are offered a well-paid role '
  'testing desktop software. Does it advance the goal?',
  'Not directly; it builds general experience and not the evidence the goal calls for',
  ['Yes; it is a role in technology',
   'Yes; the pay makes it worthwhile',
   'No; it would set the goal back'],
  'The opportunity is attractive on other grounds, which is exactly what makes it worth judging '
  'against the goal. Not advancing a goal is different from damaging it.')

q('GB_CR_029', 'CR_FAM09_OPPORTUNITY_FIT', 'D4',
  'A student\'s stated goal is to work on backend systems, and they have stated they cannot '
  'relocate. An excellent backend role is offered in another city with no remote option. Does it '
  'fit?',
  'It advances the goal and fails a stated constraint, so it is not available on the terms given',
  ['Yes; it is exactly the work the goal names',
   'No; it does not advance the goal',
   'Yes; constraints should give way to a good opportunity'],
  'Two things are being asked at once and they come apart here: the fit is perfect and the '
  'constraint rules it out. Treating the constraint as negotiable answers a question the student '
  'did not ask.',
  evidence='they have stated they cannot relocate')

# =========================================================================
# CR_FAM10_SEQUENCE_REASONING — D2, D3, D4   (real dependencies only)
# =========================================================================
q('GB_CR_030', 'CR_FAM10_SEQUENCE_REASONING', 'D2',
  'A student intends to (a) build a project, (b) put it in a public repository, (c) link it from '
  'their CV. Which depends on another being done first?',
  'c depends on b, which depends on a',
  ['a depends on c', 'b depends on c', 'None of them depends on another'],
  'There is nothing to publish until something is built and nothing to link until it is published. '
  'The chain runs one way only.')

q('GB_CR_031', 'CR_FAM10_SEQUENCE_REASONING', 'D3',
  'A student intends to (a) learn a database, (b) learn a testing tool, (c) apply for a role '
  'requiring both. Which dependency is real?',
  'c depends on both a and b; a and b do not depend on each other',
  ['b depends on a', 'a depends on b', 'All three are independent'],
  'Applying for something that asks for both requires both, and neither is a prerequisite for the '
  'other. Inventing an order between independent steps delays one of them for no reason.')

q('GB_CR_032', 'CR_FAM10_SEQUENCE_REASONING', 'D4',
  'A student says they must finish their degree before starting any project, because employers '
  'want graduates. Employers do prefer graduates for the roles they are aiming at. Is that a real '
  'dependency?',
  'No; the preference is real and nothing about building a project requires the degree to be '
  'finished first',
  ['Yes; employers require the degree',
   'Yes; projects only count after graduation',
   'No; employers do not prefer graduates'],
  'The premise is true and the dependency drawn from it is not: a project can be built at any '
  'time, and having one at graduation is better than starting then. A preference has been turned '
  'into a prerequisite.',
  evidence='Employers do prefer graduates for the roles they are aiming at')

# =========================================================================
# CR_FAM11_GAP_IDENTIFICATION — D3, D4   (requirement and evidence both stated)
# =========================================================================
q('GB_CR_033', 'CR_FAM11_GAP_IDENTIFICATION', 'D3',
  'A role requires building web applications, working with databases and using version control. A '
  'candidate has a published web application using a database, and no version control history. '
  'What is the gap?',
  'Version control, which the role requires and nothing in the evidence shows',
  ['Web applications, which need more depth',
   'Databases, which need a larger example',
   'There is no gap'],
  'Two requirements are met by the published project and one is untouched by it. The gap is '
  'derived by comparing what is required with what is shown rather than judged impressionistically.')

q('GB_CR_034', 'CR_FAM11_GAP_IDENTIFICATION', 'D4',
  'A role requires database work, testing and public speaking. A candidate has a database project '
  'with tests, and no evidence of speaking. Public speaking is listed as desirable rather than '
  'required. What is the largest gap against the requirements?',
  'There is none against the requirements; the only gap is in something the role lists as '
  'desirable',
  ['Public speaking, which is the missing item',
   'Testing, which needs a larger example',
   'Database work, which needs to be at a professional scale'],
  'The comparison has to be against what is required, and both requirements are evidenced. '
  'Reporting the desirable item as the largest gap treats every line of an advertisement as '
  'equally binding.',
  evidence='Public speaking is listed as desirable rather than required')

# =========================================================================
# CR_FAM12_SIGNAL_STRENGTH — D3, D4   (both are genuine evidence)
# =========================================================================
q('GB_CR_035', 'CR_FAM12_SIGNAL_STRENGTH', 'D3',
  'Two pieces of evidence for database skill: a certificate from a database course, and a working '
  'application whose data model the candidate designed. Which establishes more?',
  'The application, because a reader can examine what was actually designed',
  ['The certificate, because it is formally awarded',
   'They establish the same amount',
   'The certificate, because it covers more topics'],
  'Both are genuine evidence and they show different things: one that a course was passed, the '
  'other what the candidate can produce unsupervised. Formality is not the same as informativeness.')

q('GB_CR_036', 'CR_FAM12_SIGNAL_STRENGTH', 'D4',
  'Two pieces of evidence for teamwork: a reference from a manager describing a specific conflict '
  'the candidate resolved, and a certificate from a large, well-known teamwork course. The course '
  'is more prestigious than the manager\'s company. Which establishes more?',
  'The reference, because it describes something specific that somebody will stand behind',
  ['The certificate, because the course is better known',
   'They establish the same amount',
   'The certificate, because a reference may be biased'],
  'Prestige attaches to the course and says nothing about this candidate, while the reference is '
  'about them specifically and is checkable. Bias in a reference is a real concern and does not '
  'make a generic certificate more informative.',
  evidence='The course is more prestigious than the manager\'s company')

# =========================================================================
# CR_FAM13_ADVICE_DIAGNOSIS — D3, D4, D5 x3
# =========================================================================
q('GB_CR_037', 'CR_FAM13_ADVICE_DIAGNOSIS', 'D3',
  'Common advice says "build a portfolio of many small projects". A student has one large, '
  'genuinely complex application they built over a year. Why might the advice not apply?',
  'They already have what a portfolio is for — examinable evidence — and depth may serve better '
  'than quantity',
  ['Because portfolios are not useful',
   'Because large projects are always better',
   'Because the advice is only for beginners'],
  'The advice exists to produce examinable evidence, and this student has it. Its purpose being '
  'already met is why it does not apply here, rather than the advice being wrong in general.')

q('GB_CR_038', 'CR_FAM13_ADVICE_DIAGNOSIS', 'D4',
  'Common advice says "tailor your CV to each application". A student is applying to forty roles '
  'with a deadline in three days. The advice is sound and widely followed. Why does it not apply '
  'unchanged here?',
  'The time available makes it impossible for all forty; it applies to the applications they most '
  'want',
  ['Because tailoring a CV does not help',
   'Because forty applications is too many to make',
   'Because the advice applies only to senior roles'],
  'The advice is good and its cost is what conflicts with the situation, so the answer is to apply '
  'it selectively rather than to reject it. Declaring the advice wrong, or the plan wrong, both '
  'overshoot.',
  evidence='The advice is sound and widely followed')

q('GB_CR_039', 'CR_FAM13_ADVICE_DIAGNOSIS', 'D5',
  'Common advice says "apply only to roles you are fully qualified for". Why does that fail for a '
  'first role?',
  'Advertisements routinely list more than a first-role candidate could have, so full qualification '
  'would rule out nearly everything',
  ['Because qualifications do not matter',
   'Because employers do not read applications',
   'Because the advice is only for experienced candidates'],
  'The advice assumes the listed requirements describe a minimum, and for entry-level roles they '
  'usually describe an ideal. Following it literally leaves a candidate applying for almost '
  'nothing.',
  mode='TRANSFER', hinge='apply only to roles you are fully qualified for')

q('GB_CR_040', 'CR_FAM13_ADVICE_DIAGNOSIS', 'D5',
  'Common advice says "learn the technology that is most in demand". What is the risk in following '
  'it without qualification?',
  'Demand shifts, and the underlying skills that transfer are what remain valuable',
  ['There is no risk; demand is what matters',
   'Popular technologies are always harder to learn',
   'The advice is wrong; demand should be ignored'],
  'Demand is a real signal and a moving one, and what survives a shift is the understanding beneath '
  'a particular tool. Ignoring demand entirely is the opposite error and no better.',
  mode='TRADEOFF', hinge='learn the technology that is most in demand')

q('GB_CR_041', 'CR_FAM13_ADVICE_DIAGNOSIS', 'D5',
  'A piece of career advice worked well for the person giving it. What does that establish?',
  'That it worked in their circumstances; whether it transfers depends on how similar yours are',
  ['That it will work for anyone',
   'That it will not work for anyone else',
   'Nothing at all; personal experience is worthless'],
  'A single success is genuine evidence about one case and says nothing on its own about a '
  'different one. Dismissing it entirely discards information that is often the most specific '
  'available.',
  mode='TRANSFER', hinge='worked well for the person giving it')

# =========================================================================
# CR_FAM14_CONSTRAINED_CHOICE — D4, D5 x4   (constraints explicit and deciding)
# =========================================================================
q('GB_CR_042', 'CR_FAM14_CONSTRAINED_CHOICE', 'D4',
  'A student must earn an income from next month and wants to work in software. They are offered a '
  'paid support role starting immediately and an unpaid development internship starting in three '
  'months. The income constraint is absolute. Which fits, and what does it cost?',
  'The support role; it costs the more direct route into development, which can be pursued from '
  'inside it',
  ['The internship, since it is closer to the goal',
   'Neither, since neither is ideal',
   'The support role, at no cost at all'],
  'A stated absolute constraint decides between the two, and the answer has to name what is given '
  'up rather than pretend the choice is free. The internship is better on the goal and unavailable '
  'on the terms given.',
  evidence='The income constraint is absolute')

q('GB_CR_043', 'CR_FAM14_CONSTRAINED_CHOICE', 'D5',
  'A student can accept one of two offers: one matches their goal and requires relocating, which '
  'they have said is impossible; the other is remote and unrelated to their goal. What is the '
  'honest answer?',
  'Neither satisfies both; the choice is which to give up, and that decision belongs to the student',
  ['The matching role, since goals matter most',
   'The remote role, since constraints matter most',
   'Both are acceptable, so either will do'],
  'When no option satisfies every constraint, the useful contribution is naming the trade rather '
  'than picking a side. Presenting either as simply correct hides the decision being made.',
  mode='TRADEOFF', hinge='one matches their goal and requires relocating, which they have said is '
                         'impossible')

q('GB_CR_044', 'CR_FAM14_CONSTRAINED_CHOICE', 'D5',
  'A student states that salary is their only constraint and then rejects the highest-paid offer. '
  'What does that suggest?',
  'The stated constraint was not the only one; something unstated is also deciding',
  ['They made a mistake',
   'The offer must have been withdrawn',
   'Salary constraints are never real'],
  'A decision inconsistent with the stated constraints is evidence that the constraints were '
  'incompletely stated. Treating it as an error assumes the statement was complete, which the '
  'behaviour contradicts.',
  mode='TRANSFER', hinge='states that salary is their only constraint and then rejects the '
                         'highest-paid offer')

q('GB_CR_045', 'CR_FAM14_CONSTRAINED_CHOICE', 'D5',
  'Two roles are offered: one pays more now, the other offers work closer to a stated long-term '
  'goal. No constraint rules either out. How should the choice be made?',
  'By deciding how much the sooner income is worth against the goal, which is a judgement the '
  'student has to make explicitly',
  ['Always the higher-paying role',
   'Always the role closer to the goal',
   'By whichever offer arrived first'],
  'With no constraint deciding it, the choice is a genuine trade between two things the student '
  'values. A general rule in either direction substitutes somebody else\'s weighting for theirs.',
  mode='TRADEOFF', hinge='No constraint rules either out')

q('GB_CR_046', 'CR_FAM14_CONSTRAINED_CHOICE', 'D5',
  'A student lists five constraints and no available role satisfies all of them. What is the next '
  'step?',
  'Establish which constraints are absolute and which are preferences, since only that changes '
  'what is available',
  ['Abandon the search',
   'Apply anyway and hope one relaxes',
   'Remove the constraint that is hardest to satisfy'],
  'Constraints that cannot all be met have to be ranked before anything else can happen, and only '
  'the student can rank them. Dropping the hardest one is a decision made by difficulty rather '
  'than by importance.',
  mode='TRANSFER', hinge='no available role satisfies all of them')

# =========================================================================
# CR_FAM15_GOAL_REVISION — D4, D5 x3   (include cases where persisting is right)
# =========================================================================
q('GB_CR_047', 'CR_FAM15_GOAL_REVISION', 'D4',
  'A student aiming to be a front-end developer has spent six months on it and finds the work '
  'consistently uninteresting, while enjoying the data work in the same projects. The dislike is '
  'consistent across several different projects. Does the evidence support revising the goal?',
  'Yes; a consistent preference across several projects is evidence about the work rather than '
  'about one project',
  ['No; six months is too short to judge',
   'No; changing goals shows a lack of commitment',
   'Yes; any dislike justifies changing direction'],
  'What makes this evidence rather than a mood is that it held across several different projects '
  'and pointed consistently elsewhere. A single bad experience would not carry the same weight.',
  evidence='The dislike is consistent across several different projects')

q('GB_CR_048', 'CR_FAM15_GOAL_REVISION', 'D5',
  'A student aiming to be a developer had one difficult project with an unhelpful team and now '
  'wants to abandon the goal. Does the evidence support revising it?',
  'Not on its own; the difficulty was about that team rather than about the work',
  ['Yes; a bad experience is evidence',
   'Yes; enjoyment is what matters most',
   'No; goals should never be revised'],
  'The evidence is about the circumstances rather than the work, so it does not speak to the goal. '
  'That is different from saying a goal should never change.',
  mode='TRANSFER', hinge='had one difficult project with an unhelpful team')

q('GB_CR_049', 'CR_FAM15_GOAL_REVISION', 'D5',
  'A student discovers that the role they were aiming for involves far less of the work they '
  'enjoy than they had assumed. What does that support?',
  'Revising the goal, since it was formed on a picture of the work that turns out to be wrong',
  ['Persisting, since the goal was chosen deliberately',
   'Persisting, since assumptions can be adjusted later',
   'Nothing; assumptions about roles are always wrong'],
  'A goal chosen on a mistaken picture rests on something the evidence has now removed. Revising '
  'it is what the new information supports, rather than a failure of resolve.',
  mode='TRANSFER', hinge='involves far less of the work they enjoy than they had assumed')

q('GB_CR_050', 'CR_FAM15_GOAL_REVISION', 'D5',
  'Revising a goal costs the progress already made towards it; persisting costs time if the goal '
  'is wrong. How should the two be weighed?',
  'By what the evidence says about the goal, since progress already made is spent either way',
  ['By the progress already made, which should not be wasted',
   'By whichever costs less time overall',
   'They cannot be weighed; the choice is arbitrary'],
  'Effort already spent cannot be recovered by continuing, so it is not a reason to continue. What '
  'remains is what the evidence now says about whether the goal is the right one.',
  mode='TRADEOFF', hinge='Revising a goal costs the progress already made towards it')
