# -*- coding: utf-8 -*-
"""
Wave 8 — HTML_FORMS, 50 Golden Bank questions, all newly authored.

THE BANKED HTML SKILL HAS ONE FAMILY ON FORMS, ASKING WHICH VALUES A FORM SUBMITS. That is not
re-asked. This skill starts at the distinction that family cannot reach: a control that submits
nothing is not the same as a control that submits an empty value, and the two break different
code on the receiving side. Everything else here — labels that are merely adjacent, groups that
are not groups, hints mistaken for values, buttons that submit when nobody meant them to — turns
on the same theme, which is that a form can look finished on screen and behave differently.

EVERY DISTINCTION IN THIS SKILL IS INVISIBLE TO A SIGHTED REVIEWER LOOKING AT THE PAGE. A label
bound to its control and a label sitting beside it look identical. Radio buttons that share a name
and radio buttons that do not look identical until two are clicked. Hint text and a real starting
value look identical until the form is submitted untouched. That is what makes the skill worth
measuring and what makes every stem describe the markup rather than the appearance.

CLIENT-SIDE VALIDATION IS TREATED AS GENUINELY USEFUL AND GENUINELY NOT A GUARANTEE. A student who
concludes it is worthless and removes it has missed the point as thoroughly as one who trusts it.
Both readings appear as wrong answers in the family that measures it.

NO STEM DEPENDS ON RECALLING AN ATTRIBUTE NAME. Controls and attributes are described by what they
do, so nothing here dates and nothing rewards memorising a specification.
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
# HF_FAM01_CONTROL_PURPOSE — D1 x4, D2 x1
# =========================================================================
q('GB_HF_001', 'HF_FAM01_CONTROL_PURPOSE', 'D1',
  'A form must collect exactly one answer from a fixed list of four. Which kind of control fits?',
  'A set of options where choosing one clears the others',
  ['A set of independent tick boxes',
   'A free text field',
   'A field that accepts a number'],
  'Exactly one from a fixed set is what a mutually exclusive group expresses. Independent tick '
  'boxes would let a visitor choose all four.')

q('GB_HF_002', 'HF_FAM01_CONTROL_PURPOSE', 'D1',
  'A form must collect any number of answers from a fixed list of six, including none. Which kind '
  'of control fits?',
  'A set of independent tick boxes',
  ['A set of options where choosing one clears the others',
   'A free text field',
   'A drop-down allowing one selection'],
  'Independent boxes permit none, some or all, which is what the requirement allows. A mutually '
  'exclusive group would cap it at one.')

q('GB_HF_003', 'HF_FAM01_CONTROL_PURPOSE', 'D1',
  'A form must collect a comment of a paragraph or two. Which kind of control fits?',
  'A multi-line text field',
  ['A single-line text field',
   'A set of tick boxes',
   'A field that accepts a number'],
  'A paragraph needs room and line breaks, which a single-line field does not offer. The choice '
  'follows from the shape of the answer.')

q('GB_HF_004', 'HF_FAM01_CONTROL_PURPOSE', 'D1',
  'What decides which kind of control a form should use for a question?',
  'The shape of the answer being collected',
  ['How the control looks on the page',
   'How much space is available',
   'Which control is easiest to style'],
  'The control encodes what kind of answer is permitted. Appearance can be adjusted afterwards '
  'and cannot change how many answers are possible.')

q('GB_HF_005', 'HF_FAM01_CONTROL_PURPOSE', 'D2',
  'A designer uses independent tick boxes for a question that must have exactly one answer, '
  'planning to check afterwards that only one was ticked. What is the weakness?',
  'The form permits an invalid answer, so the check has to catch what the control should have '
  'prevented',
  ['Nothing; the check is equivalent to using the right control',
   'Tick boxes cannot be checked afterwards',
   'The form will refuse to submit'],
  'The right control makes the invalid state unreachable. Permitting it and rejecting it '
  'afterwards means a visitor can complete the form and be told they were wrong.')

# =========================================================================
# HF_FAM02_LABEL_ASSOCIATION — D1 x3, D2 x1
# =========================================================================
q('GB_HF_006', 'HF_FAM02_LABEL_ASSOCIATION', 'D1',
  'Text reading "Email address" sits immediately to the left of a text field, and nothing in the '
  'markup connects the two. Is the field labelled?',
  'No; the text is adjacent and not associated with it',
  ['Yes; the text is clearly its label',
   'Yes, because the text is close enough',
   'It depends on how far apart they are'],
  'A label is a relationship recorded in the markup rather than a position on screen. Proximity '
  'is what a sighted reader uses and is not available to anything else.')

q('GB_HF_007', 'HF_FAM02_LABEL_ASSOCIATION', 'D1',
  'What makes text a control label rather than nearby text?',
  'An association recorded between the two in the markup',
  ['Its position immediately before the control',
   'Its being written in bold',
   'Its ending in a colon'],
  'The association is the whole of it. Position, styling and punctuation are conventions that '
  'help sighted readers and record nothing.')

q('GB_HF_008', 'HF_FAM02_LABEL_ASSOCIATION', 'D1',
  'Two forms look identical on screen. In one, every label is associated with its control; in the '
  'other, none is. What differs?',
  'What anything other than a sighted reader can determine about the fields',
  ['Nothing at all', 'The visual layout', 'The speed at which the page loads'],
  'The appearance is the same and the recorded structure is not. Clicking a label to focus its '
  'field also stops working, which is the visible symptom.')

q('GB_HF_009', 'HF_FAM02_LABEL_ASSOCIATION', 'D2',
  'A developer replaces every label with placeholder text inside the field, saying the form now '
  'looks cleaner and still tells the user what to enter. What is lost?',
  'The description disappears as soon as the user types, and nothing records what the field is '
  'for',
  ['Nothing; placeholder text serves the same purpose',
   'The ability to style the text',
   'The ability to make the field required'],
  'Placeholder text vanishes exactly when the user might want to check what they were asked for. '
  'It is a hint rather than a name for the field.')

# =========================================================================
# HF_FAM03_VALUE_IDENTITY — D1 x3, D2 x1
# =========================================================================
q('GB_HF_010', 'HF_FAM03_VALUE_IDENTITY', 'D1',
  'A form is submitted. How does the receiving side tell which value came from which control?',
  'By the name given to each control',
  ['By the label text shown beside it',
   'By the order the controls appear on the page',
   'By the text the user typed'],
  'Each value travels under the control name. The label is for the person filling the form and '
  'never reaches the other end.')

q('GB_HF_011', 'HF_FAM03_VALUE_IDENTITY', 'D1',
  'A control has no name. What does it contribute when the form is submitted?',
  'Nothing at all',
  ['An empty value under a default name',
   'Its value, identified by its label',
   'Its value, identified by its position'],
  'Without a name there is nothing to send the value under, so it is omitted entirely. Nothing '
  'stands in for the missing name.')

q('GB_HF_012', 'HF_FAM03_VALUE_IDENTITY', 'D1',
  'Two controls in one form are given the same name and both hold a value. What arrives?',
  'Two values under the same name',
  ['One value, with the second discarded',
   'One value, being the two joined together',
   'Nothing, since the names clash'],
  'Nothing forbids a repeated name, and the receiving side gets both. This is what makes a group '
  'of tick boxes under one name workable.')

q('GB_HF_013', 'HF_FAM03_VALUE_IDENTITY', 'D2',
  'A developer changes a field label from "Phone" to "Contact number" and the receiving code stops '
  'finding the value. What does that indicate?',
  'The code was matching on something the change affected, which the label alone should not have '
  'been',
  ['Nothing unusual; changing a label changes the submitted name',
   'The form is now invalid',
   'The field lost its value when the label changed'],
  'A label change should be invisible to the receiving side. That it was not means the name was '
  'changed at the same time, or something is keying off the wrong thing.')

# =========================================================================
# HF_FAM04_TYPE_SELECTION — D2 x1, D3 x1
# =========================================================================
q('GB_HF_014', 'HF_FAM04_TYPE_SELECTION', 'D2',
  'A field collects a postcode that may begin with a zero. Should it be declared as a numeric '
  'field?',
  'No; a numeric field may discard a leading zero, and a postcode is not a quantity',
  ['Yes; postcodes are made of digits',
   'Yes, so that a numeric keyboard appears',
   'It makes no difference either way'],
  'Being written in digits is not being a number. Nothing arithmetic is ever done to a postcode '
  'and its leading zero is significant.')

q('GB_HF_015', 'HF_FAM04_TYPE_SELECTION', 'D3',
  'A field collects a quantity ordered, between one and ninety-nine. Which declaration fits?',
  'A numeric field with a stated minimum and maximum',
  ['A plain text field, checked afterwards',
   'A numeric field with no limits',
   'A set of ninety-nine tick boxes'],
  'The value genuinely is a quantity and the range is known, so both can be declared. Checking '
  'afterwards leaves the visitor able to enter something the form should never have accepted.')

# =========================================================================
# HF_FAM05_GROUP_BEHAVIOUR — D2 x1, D3 x1
# =========================================================================
q('GB_HF_016', 'HF_FAM05_GROUP_BEHAVIOUR', 'D2',
  'Four mutually exclusive options share one name. How many can be chosen at once?',
  'One',
  ['All four', 'Any number, including none', 'Two'],
  'Sharing a name is what makes them one group, and choosing one clears the rest. Without the '
  'shared name they would behave independently.')

q('GB_HF_017', 'HF_FAM05_GROUP_BEHAVIOUR', 'D3',
  'Four mutually exclusive options are placed together in a bordered box on the page, and each is '
  'given a different name. How many can be chosen at once?',
  'All four, since they are not one group',
  ['One, since they are visually grouped',
   'One, since they are that kind of control',
   'None, since the names conflict'],
  'Grouping is established by the shared name rather than by the border. Each option with its own '
  'name is a group of one and can be chosen independently.')

# =========================================================================
# HF_FAM06_SUBMISSION_CONTENT — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_HF_018', 'HF_FAM06_SUBMISSION_CONTENT', 'D2',
  'A tick box is left unticked when a form is submitted. What arrives for it?',
  'Nothing; the name does not appear at all',
  ['An empty value under its name',
   'The value "false" under its name',
   'The value "off" under its name'],
  'An unticked box contributes nothing, so the receiving side sees the name missing entirely. '
  'That is different from a name arriving with an empty value.')

q('GB_HF_019', 'HF_FAM06_SUBMISSION_CONTENT', 'D3',
  'A text field is left empty when a form is submitted. What arrives for it?',
  'Its name, with an empty value',
  ['Nothing; the name does not appear',
   'Its name, with the placeholder text as the value',
   'Its name, with the word empty as the value'],
  'A text field always contributes, so the name arrives carrying nothing. This is the opposite of '
  'the unticked box and the pair is what code on the receiving side has to distinguish.')

q('GB_HF_020', 'HF_FAM06_SUBMISSION_CONTENT', 'D4',
  'Receiving code reads a tick box value and treats a missing name as an error, since it expects '
  'every field to arrive. An unticked box sends no name at all, while an empty text field sends '
  'its name with nothing in it. What happens when a visitor leaves the box unticked?',
  'The code reports an error, when the visitor simply answered no',
  ['The code receives an empty value and handles it',
   'The code receives the value false and handles it',
   'The form refuses to submit'],
  'Absent and empty are two different arrivals and the code recognises only one. Treating a '
  'missing tick box as a no is what the receiving side has to do deliberately.',
  evidence='An unticked box sends no name at all, while an empty text field sends its name with '
           'nothing in it')

# =========================================================================
# HF_FAM07_BUTTON_BEHAVIOUR — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_HF_021', 'HF_FAM07_BUTTON_BEHAVIOUR', 'D2',
  'A button sits inside a form and has not been declared to do anything in particular. What does '
  'pressing it do?',
  'Submits the form',
  ['Nothing', 'Clears the form', 'Depends on the button text'],
  'Submitting is the default behaviour for a button inside a form. Anything else has to be '
  'declared.')

q('GB_HF_022', 'HF_FAM07_BUTTON_BEHAVIOUR', 'D3',
  'A developer adds a button labelled "Add another row" inside a form and attaches code to it. '
  'The button has not been declared as anything other than a plain button. What happens when it '
  'is pressed?',
  'The code runs and the form is also submitted',
  ['Only the code runs', 'Only the form is submitted',
   'Nothing, since two behaviours conflict'],
  'Attaching code does not remove the default behaviour. The page appears to reload in the middle '
  'of adding a row, which is a confusing symptom with a simple cause.')

q('GB_HF_023', 'HF_FAM07_BUTTON_BEHAVIOUR', 'D4',
  'A form has three buttons: one to submit, one to add a row and one to remove a row. All three '
  'submit the form when pressed. None of the three has been declared as anything other than a '
  'plain button inside the form. What is the fault?',
  'All three carry the default submitting behaviour, which only one of them wants',
  ['The two extra buttons are outside the form',
   'The form has too many buttons',
   'The buttons are missing their labels'],
  'The default applies to every button in the form regardless of its text. Declaring the two '
  'helpers as non-submitting is the fix.',
  evidence='None of the three has been declared as anything other than a plain button inside the '
           'form')

# =========================================================================
# HF_FAM08_CONSTRAINT_EFFECT — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_HF_024', 'HF_FAM08_CONSTRAINT_EFFECT', 'D2',
  'A numeric field declares a minimum of 1 and a maximum of 10. Which entry is refused?',
  '0',
  ['1', '10', '7'],
  'Both stated limits are included, so the value 0 is the only one of the four falling outside '
  'the permitted range. A declared minimum admits the number it names.')

q('GB_HF_025', 'HF_FAM08_CONSTRAINT_EFFECT', 'D3',
  'A field declares a maximum length of eight characters. A visitor enters nine. What happens?',
  'The ninth character is not accepted into the field',
  ['The field accepts it and the form is refused on submission',
   'The field accepts it and truncates it on submission',
   'The whole entry is cleared'],
  'A length limit of this kind stops the typing rather than rejecting afterwards. The visitor '
  'sees the field stop accepting input, which needs explaining if the limit is not obvious.')

q('GB_HF_026', 'HF_FAM08_CONSTRAINT_EFFECT', 'D4',
  'A numeric field declares a minimum of 18 and is intended to accept adults only. A visitor '
  'enters 18. The declared minimum is 18 and a declared minimum includes the value itself. Is the '
  'entry accepted?',
  'Yes; a declared minimum includes the stated value',
  ['No; the minimum sets the first refused value',
   'No; the field requires more than 18',
   'It depends on how the field is styled'],
  'Boundary values are included, which is what makes 18 acceptable here. A requirement of over 18 '
  'would need a minimum of 19.',
  evidence='The declared minimum is 18 and a declared minimum includes the value itself')

# =========================================================================
# HF_FAM09_REQUIRED_SCOPE — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_HF_027', 'HF_FAM09_REQUIRED_SCOPE', 'D2',
  'A field is marked as required. What does that stop?',
  'Submitting the form with the field left empty',
  ['Submitting the form with a nonsense value in the field',
   'Submitting the form at all',
   'Typing into the field'],
  'Required means not empty and nothing more. Whether what was typed makes sense is a separate '
  'question the mark does not address.')

q('GB_HF_028', 'HF_FAM09_REQUIRED_SCOPE', 'D3',
  'A required field is filled with a single space. Is the form accepted?',
  'Generally yes, since a space is not nothing',
  ['No, since a space counts as empty',
   'No, since required fields reject whitespace',
   'Only if the field has a minimum length'],
  'A space is a character and the field is no longer empty. Rejecting whitespace-only entries is '
  'something the receiving side has to do.')

q('GB_HF_029', 'HF_FAM09_REQUIRED_SCOPE', 'D4',
  'A required field collecting an email address is filled with the word "no". A required mark '
  'stops the field being empty and says nothing about the form of what is entered. Is the form '
  'accepted?',
  'Yes; the field is not empty, which is all the mark requires',
  ['No; the field is declared as collecting an email address',
   'No; required fields are checked for sense',
   'Only if the receiving side accepts it'],
  'The mark and any format check are separate declarations. Declaring the field as an email '
  'address is what would add a shape check on top of the emptiness check.',
  evidence='A required mark stops the field being empty and says nothing about the form of what '
           'is entered')

# =========================================================================
# HF_FAM10_HINT_VS_DEFAULT — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_HF_030', 'HF_FAM10_HINT_VS_DEFAULT', 'D2',
  'A field shows greyed text reading "e.g. 07700 900000" before anything is typed. It is a hint '
  'rather than a value. What is submitted if the field is left alone?',
  'An empty value',
  ['The hint text', 'Nothing at all', 'The word placeholder'],
  'A hint disappears on typing and is never sent. The field is empty as far as the submission is '
  'concerned.')

q('GB_HF_031', 'HF_FAM10_HINT_VS_DEFAULT', 'D3',
  'A field is pre-filled with a real starting value of "United Kingdom". What is submitted if the '
  'field is left alone?',
  '"United Kingdom", since it is a real value',
  ['An empty value', 'Nothing at all', 'The word default'],
  'A starting value is a value like any other and travels with the submission. It looks the same '
  'as a hint before anybody types.')

q('GB_HF_032', 'HF_FAM10_HINT_VS_DEFAULT', 'D4',
  'A required field shows greyed text before anything is typed, and a visitor submits the form '
  'without touching it. The greyed text is a hint rather than a value, and the field is marked '
  'required. What happens?',
  'The form is refused, since the field counts as empty despite showing text',
  ['The form is accepted, since the field shows text',
   'The form is accepted and the hint is submitted',
   'The form is accepted and an empty value is submitted'],
  'Text being visible is not the field having a value. The visitor sees a field that looks filled '
  'in being rejected as empty, which is why hints are poor substitutes for labels.',
  evidence='The greyed text is a hint rather than a value, and the field is marked required')

# =========================================================================
# HF_FAM11_MISSING_VALUE_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_HF_033', 'HF_FAM11_MISSING_VALUE_DIAGNOSIS', 'D3',
  'A field is visible, the visitor typed into it, and its name does not appear in the submission '
  'at all. Which cause fits?',
  'The control has no name',
  ['The visitor left it empty',
   'The field failed its format check',
   'The field is a tick box that was not ticked'],
  'Typing into it rules out emptiness, and an empty field would still send its name. A control '
  'with no name is the one case where the name is absent despite a value being present.')

q('GB_HF_034', 'HF_FAM11_MISSING_VALUE_DIAGNOSIS', 'D4',
  'A field appears on the page, has a name, and never arrives in the submission whatever the '
  'visitor does. The field is shown greyed out and cannot be typed into. A control that is '
  'disabled contributes nothing to a submission whatever it displays. What is the cause?',
  'It is disabled, and a disabled control submits nothing',
  ['It has no name',
   'The visitor is leaving it empty',
   'The field is outside the form'],
  'Having a name is stated, which rules that out, and the greyed appearance is the clue. A '
  'disabled control is excluded from the submission entirely, even when it displays a value.',
  evidence='A control that is disabled contributes nothing to a submission whatever it displays')

# =========================================================================
# HF_FAM12_BROKEN_GROUP_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_HF_035', 'HF_FAM12_BROKEN_GROUP_DIAGNOSIS', 'D3',
  'A set of mutually exclusive options lets a visitor select two at once. What is the likely '
  'cause?',
  'The options do not all share one name',
  ['The options are the wrong kind of control',
   'The options are laid out incorrectly',
   'The form is missing a submit button'],
  'The shared name is what makes them exclusive. Without it each behaves as its own group of one.')

q('GB_HF_036', 'HF_FAM12_BROKEN_GROUP_DIAGNOSIS', 'D4',
  'A visitor selects an option in one question and an option in an unrelated question below it '
  'clears itself. The two questions use different wording and their options were given the same '
  'name. Options sharing a name form a single group whatever question they appear under. What is '
  'the cause?',
  'The two questions share one name, so their options form a single group',
  ['The two questions are too close together on the page',
   'The second question is missing its own submit button',
   'The options are the wrong kind of control'],
  'Grouping follows the name and ignores the visual arrangement entirely. Two questions sharing a '
  'name behave as one question with more options.',
  evidence='Options sharing a name form a single group whatever question they appear under')

# =========================================================================
# HF_FAM13_VALIDATION_TRUST_REASONING — D3 x1, D4 x1, D5 x3
# =========================================================================
q('GB_HF_037', 'HF_FAM13_VALIDATION_TRUST_REASONING', 'D3',
  'A form declares a field as required and as accepting only digits. What can the receiving side '
  'assume about what arrives?',
  'Nothing; the checks help the visitor and do not constrain what is sent',
  ['That the field is present and contains only digits',
   'That the field is present, though its contents may vary',
   'That the field contains only digits, though it may be absent'],
  'The checks run in the visitor browser and a submission can be constructed without one. What '
  'arrives has to be checked again where it arrives.')

q('GB_HF_038', 'HF_FAM13_VALIDATION_TRUST_REASONING', 'D4',
  'A developer concludes that browser checks are pointless and removes them, planning to check '
  'everything on the receiving side. The checks tell a visitor about a mistake before they submit, '
  'and the receiving side can only tell them afterwards. What is lost?',
  'Immediate feedback, which is what the browser checks were actually for',
  ['Nothing; the receiving side does the same job',
   'The ability to check the data at all',
   'The ability to mark fields as required'],
  'The conclusion that they guarantee nothing is correct and the conclusion that they are '
  'pointless does not follow. They are for the person filling the form rather than for the '
  'system.',
  evidence='The checks tell a visitor about a mistake before they submit')

q('GB_HF_039', 'HF_FAM13_VALIDATION_TRUST_REASONING', 'D5',
  'A team argues that since ordinary visitors use a browser, browser checks are sufficient for a '
  'form with no security implications. A submission can be constructed without a browser by anyone '
  'who chooses to, whatever the form is for. What is the position?',
  'The receiving side will eventually see values the checks would have refused, whether sent '
  'deliberately or by a faulty client',
  ['The team is right; without security implications the checks suffice',
   'The team is right, provided the form is only linked internally',
   'The checks are worthless and should be removed'],
  'Security is not the only reason values arrive malformed: an old browser, a retried request or '
  'a script written by a colleague will all do it. What the data feeds decides how much the '
  'malformed values cost.',
  mode='EDGE',
  hinge='A submission can be constructed without a browser by anyone who chooses to')

q('GB_HF_040', 'HF_FAM13_VALIDATION_TRUST_REASONING', 'D5',
  'A form marks a field as required and the receiving code assumes it is always present, reading '
  'it directly. A required mark constrains what a browser will submit and not what arrives at the '
  'receiving side. What is the consequence?',
  'A submission without the field will make the code fail on something it never expected to be '
  'absent',
  ['Nothing; the required mark guarantees presence',
   'The submission will be rejected before reaching the code',
   'The code will receive an empty value and continue'],
  'The failure is not a rejected form but a crash in code that had no branch for absence. '
  'Checking presence at the receiving end is what turns it into a handled case.',
  mode='TRANSFER',
  hinge='A required mark constrains what a browser will submit and not what arrives at the '
        'receiving side')

q('GB_HF_041', 'HF_FAM13_VALIDATION_TRUST_REASONING', 'D5',
  'A team validates on both sides and the two disagree: the browser accepts a value the receiving '
  'side refuses. The visitor sees the form accepted and then an error. The two checks encode the '
  'same rule and were written separately, so they have drifted apart. What is the underlying '
  'problem?',
  'One rule is expressed twice, so the two can drift and the visitor experiences the gap',
  ['Validating on both sides is unnecessary duplication',
   'The browser check is too permissive and should be tightened once',
   'The receiving side should accept whatever the browser accepted'],
  'Both checks are needed and expressing the rule twice is what allows them to disagree. '
  'Generating one from the other, or deriving both from a shared definition, is the repair.',
  mode='EDGE',
  hinge='The two checks encode the same rule and were written separately')

# =========================================================================
# HF_FAM14_FORM_DESIGN_CHOICE — D4 x1, D5 x4
# =========================================================================
q('GB_HF_042', 'HF_FAM14_FORM_DESIGN_CHOICE', 'D4',
  'A question must be answered, must have exactly one answer, and the answer must come from five '
  'fixed choices. Exactly one answer is required and the five choices are fixed in advance. Which '
  'arrangement fits?',
  'A mutually exclusive group of five sharing one name, with the group marked as required',
  ['Five independent tick boxes, with a check afterwards that one was ticked',
   'A free text field marked as required',
   'A mutually exclusive group with one option pre-selected'],
  'The exclusive group makes two answers impossible and the required mark makes zero impossible. '
  'Pre-selecting an option would make it impossible to tell a deliberate answer from an untouched '
  'form.',
  evidence='Exactly one answer is required and the five choices are fixed in advance')

q('GB_HF_043', 'HF_FAM14_FORM_DESIGN_CHOICE', 'D5',
  'A form must record whether a visitor consents, and must distinguish a deliberate refusal from '
  'not having answered. A single tick box left unticked is indistinguishable from a form the '
  'visitor never reached. What arrangement fits?',
  'A mutually exclusive pair of yes and no, marked as required',
  ['A single tick box, marked as required',
   'A single tick box, left optional',
   'A single tick box, pre-ticked'],
  'One box has two states and the requirement needs three distinguished. An explicit pair with a '
  'required mark forces an answer and records which one it was.',
  mode='TRANSFER',
  hinge='A single tick box left unticked is indistinguishable from a form the visitor never '
        'reached')

q('GB_HF_044', 'HF_FAM14_FORM_DESIGN_CHOICE', 'D5',
  'A form collects a date of birth. A team proposes three separate numeric fields for day, month '
  'and year, with each field range-limited. Three separate fields permit 31 February, since each '
  'field is within its own range. What is the weakness?',
  'Impossible dates pass, since no field constrains the others',
  ['Nothing; three fields are easier to fill in',
   'Numeric fields cannot hold a year',
   'The fields will be submitted in the wrong order'],
  'Each field is individually valid and the combination is not. A date control, or a check across '
  'the three, is what closes it.',
  mode='EDGE', hinge='Three separate fields permit 31 February')

q('GB_HF_045', 'HF_FAM14_FORM_DESIGN_CHOICE', 'D5',
  'A form can present twenty questions on one page or across five pages of four. Visitors '
  'frequently abandon it partway, and the team wants to keep whatever was answered before they '
  'left. Answers are only sent when a page is submitted, and visitors abandon the form partway. '
  'Which fits?',
  'The five pages, since each submission preserves what was answered up to that point',
  ['The single page, since it is quicker to complete',
   'The single page, since fewer submissions means fewer failures',
   'Either, since the same twenty answers are collected'],
  'A single page loses everything when abandoned, because nothing was sent. The five-page form '
  'costs extra steps and keeps four answers at a time.',
  mode='TRADEOFF', hinge='Answers are only sent when a page is submitted')

q('GB_HF_046', 'HF_FAM14_FORM_DESIGN_CHOICE', 'D5',
  'A form marks nine of its ten fields as required. Analysis shows most abandonment happens at a '
  'field that is rarely needed downstream. The field is required and the data it collects is '
  'rarely used, while abandonment loses every answer on the page. What should be reconsidered?',
  'Whether that field needs to be required, since it is costing complete submissions for data '
  'that is rarely used',
  ['Nothing; required fields ensure complete data',
   'The other eight required fields, which may also be unnecessary',
   'The page layout, which must be causing the abandonment'],
  'Requiring a field trades completed forms for complete records, and here the record is rarely '
  'consulted. The other eight have not been shown to cost anything.',
  mode='TRADEOFF',
  hinge='The field is required and the data it collects is rarely used')

# =========================================================================
# HF_FAM15_FORM_TRANSFER — D4 x1, D5 x3
# =========================================================================
q('GB_HF_047', 'HF_FAM15_FORM_TRANSFER', 'D4',
  'A form-building toolkit is documented as omitting any control whose identifier is blank, and '
  'as sending a blank value for any text control the user did not fill in. A text control with an '
  'identifier is left untouched. The toolkit omits controls with a blank identifier and sends a '
  'blank value for unfilled text controls. What arrives?',
  'Its identifier, carrying a blank value',
  ['Nothing at all', 'Its identifier, carrying the hint text',
   'Its identifier, carrying the word blank'],
  'The documented behaviour settles it without any knowledge of the toolkit. Having an identifier '
  'means it is included and being unfilled means the value is blank.',
  evidence='The toolkit omits controls with a blank identifier and sends a blank value for '
           'unfilled text controls')

q('GB_HF_048', 'HF_FAM15_FORM_TRANSFER', 'D5',
  'A survey tool groups options by a question identifier and permits one answer per group. A '
  'designer copies a question to create a second and forgets to change the identifier. Options '
  'sharing a question identifier form one group permitting one answer between them. What happens?',
  'The two questions behave as one, so answering the second clears the answer to the first',
  ['The two questions behave independently',
   'The tool refuses to save the duplicated question',
   'The second question is ignored entirely'],
  'This is the shared-name fault under other names. Copying a question is exactly how the '
  'duplicate identifier gets created.',
  mode='TRANSFER',
  hinge='Options sharing a question identifier form one group permitting one answer between them')

q('GB_HF_049', 'HF_FAM15_FORM_TRANSFER', 'D5',
  'An application programming interface accepts a submission and treats an absent field as "leave '
  'unchanged" and a field present with no value as "clear this". A client always sends every '
  'field, using an empty value for anything the user did not fill in. Absent means leave alone '
  'and present-but-empty means clear, and the client always sends every field. What happens to '
  'fields the user did not fill in?',
  'They are cleared, since the client sends them present and empty',
  ['They are left unchanged, since the user did not fill them in',
   'They are rejected as invalid',
   'They are filled with a default value'],
  'The client and the interface disagree about what an empty value means, and the interface '
  'definition wins. Omitting untouched fields is what the client would have to do instead.',
  mode='EDGE',
  hinge='Absent means leave alone and present-but-empty means clear')

q('GB_HF_050', 'HF_FAM15_FORM_TRANSFER', 'D5',
  'A team must decide whether their interface should distinguish an absent field from a field '
  'present with no value. Some updates need to clear a field and others need to leave it '
  'untouched, and one representation cannot express both. What follows?',
  'The distinction has to be kept, since collapsing it makes one of the two operations '
  'unexpressible',
  ['The two should be treated identically, since both mean no value',
   'Absent should be rejected, so that every field is always sent',
   'Present-but-empty should be rejected, so that clearing is done another way'],
  'This is the unticked box and the empty text field again, at a different layer. Collapsing them '
  'is simpler right up until something needs to clear a value.',
  mode='TRADEOFF',
  hinge='Some updates need to clear a field and others need to leave it untouched')
