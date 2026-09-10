# -*- coding: utf-8 -*-
"""
Wave 8 — WEB_ACCESSIBILITY, 50 Golden Bank questions, all newly authored.

THE BANKED HTML SKILL HAS TWO FAMILIES NEAR THIS GROUND: one choosing alternative text for an
image, and one asking what a screen reader user could not do. Neither is re-asked. The description
family here asks whether an image should be described at all, and the role family asks how the
same image needs different treatment in different positions — questions the banked pair cannot
reach, because one family cannot carry both.

NOT EVERY BARRIER IS A SCREEN READER. Keyboard reach, focus order, colour as the only signal, and
error messages that never reach the person who caused them are separate barriers affecting
separate people. A skill that only ever meant blindness would measure a quarter of its subject,
so the first family exists to force the distinction and the rest keep it.

DECORATIVE IMAGES SHOULD BE PASSED OVER SILENTLY, AND THAT IS A WRONG ANSWER STUDENTS NEVER GIVE.
"Describe everything" sounds conscientious and produces a page that reads as a stream of noise.
Both the under-described and the over-described case appear.

REDUNDANT COLOUR IS NOT A FAULT. A status shown in red and also labelled "failed" is correct, and
a family flagging it would teach that colour is forbidden rather than that colour alone carries
nothing.

EQUIVALENCE IS ABOUT INFORMATION, NOT EXPERIENCE. Two users need not have the same experience;
they need to be able to learn the same things and do the same things. A workaround requiring
another person is not equivalence, and that distinction carries its own item.
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
# WA_FAM01_BARRIER_RECOGNITION — D1 x4, D2 x1
# =========================================================================
q('GB_WA_001', 'WA_FAM01_BARRIER_RECOGNITION', 'D1',
  'A page control can only be operated by clicking it with a mouse. Who is prevented from using '
  'it?',
  'Anyone navigating by keyboard',
  ['Anyone using a screen reader only',
   'Anyone with a small screen',
   'Anyone on a slow connection'],
  'The barrier is about how the control is operated rather than how it is perceived. People '
  'navigate by keyboard for many reasons, including motor difficulties and simple preference.')

q('GB_WA_002', 'WA_FAM01_BARRIER_RECOGNITION', 'D1',
  'A status is shown only by making a row red or green. Who is prevented from reading it?',
  'Anyone who cannot distinguish those colours, and anyone hearing the page read aloud',
  ['Anyone navigating by keyboard',
   'Anyone using a large screen',
   'Nobody; colour is universally understood'],
  'Two separate groups are affected by the same fault. Colour vision and non-visual reading are '
  'different situations with the same consequence here.')

q('GB_WA_003', 'WA_FAM01_BARRIER_RECOGNITION', 'D1',
  'An image conveys information and carries no description. Who is prevented from getting that '
  'information?',
  'Anyone who cannot see the image',
  ['Anyone navigating by keyboard',
   'Anyone who cannot distinguish colours',
   'Anyone using an old browser'],
  'A missing description affects people who do not receive the image itself. Keyboard use and '
  'colour vision are unrelated to it.')

q('GB_WA_004', 'WA_FAM01_BARRIER_RECOGNITION', 'D1',
  'What identifies something as an accessibility barrier?',
  'That a described person cannot do or learn something others can',
  ['That the page looks unpolished',
   'That the page is slow to load',
   'That the page has not been tested'],
  'A barrier is stated as who is prevented from what. Whether a page looks acceptable is a '
  'separate judgement entirely.')

q('GB_WA_005', 'WA_FAM01_BARRIER_RECOGNITION', 'D2',
  'A team fixes every missing image description and declares the page accessible. What is wrong '
  'with the conclusion?',
  'One barrier has been removed and others — keyboard reach, focus order, colour alone — were '
  'never examined',
  ['Nothing; image descriptions are the whole of accessibility',
   'The descriptions should have been checked by a specialist',
   'The page cannot be accessible until it is retested for speed'],
  'Image descriptions address people who cannot see images and nobody else. A page can have '
  'perfect descriptions and be entirely unusable by keyboard.')

# =========================================================================
# WA_FAM02_DESCRIPTION_NEED — D1 x3, D2 x1
# =========================================================================
q('GB_WA_006', 'WA_FAM02_DESCRIPTION_NEED', 'D1',
  'A chart shows the sales figures being discussed, and the figures appear nowhere else on the '
  'page. Should it be described?',
  'Yes; it carries information available nowhere else',
  ['No; charts are decorative',
   'No; the surrounding text is enough',
   'Only if the page has no other images'],
  'The chart is the only source of those figures, so a reader who cannot see it loses them. That '
  'is what makes an image meaningful rather than decorative.')

q('GB_WA_007', 'WA_FAM02_DESCRIPTION_NEED', 'D1',
  'A decorative swirl separates two sections and carries no information. Should it be described?',
  'No; it should be passed over silently',
  ['Yes; every image should be described',
   'Yes; it should be described as a swirl',
   'Yes; it should be described as decorative'],
  'Describing it inserts noise into the reading of the page. Being passed over is the correct '
  'treatment for an image that says nothing.')

q('GB_WA_008', 'WA_FAM02_DESCRIPTION_NEED', 'D1',
  'What decides whether an image needs describing?',
  'Whether it carries information the reader would otherwise lose',
  ['How large the image is',
   'How many images the page contains',
   'Whether the image loads quickly'],
  'The test is what would be missing without it. Size and quantity have nothing to do with it.')

q('GB_WA_009', 'WA_FAM02_DESCRIPTION_NEED', 'D2',
  'A team adds a description to every image on the page, including forty decorative dividers. What '
  'is the consequence for someone hearing the page read aloud?',
  'Forty meaningless announcements interrupt the content',
  ['Nothing; more description is always better',
   'The page becomes faster to navigate',
   'The decorative images are skipped automatically'],
  'Every description is read out, so describing nothing-in-particular forty times buries the '
  'content. Conscientiousness applied without judgement makes the page worse.')

# =========================================================================
# WA_FAM03_KEYBOARD_REACH — D1 x3, D2 x1
# =========================================================================
q('GB_WA_010', 'WA_FAM03_KEYBOARD_REACH', 'D1',
  'A page uses a genuine button element for an action. Can a keyboard user reach and operate it?',
  'Yes; a button is reachable and operable by keyboard as it stands',
  ['No; buttons require a mouse',
   'Only if extra code is added',
   'Only if the button carries a description'],
  'Elements that exist to be operated come with keyboard behaviour already. That is the main '
  'practical reason to use them.')

q('GB_WA_011', 'WA_FAM03_KEYBOARD_REACH', 'D1',
  'A page makes a plain area of the layout clickable by attaching code to it. Can a keyboard user '
  'reach it?',
  'No; a plain area is not something the keyboard stops at',
  ['Yes; anything clickable is keyboard reachable',
   'Yes, if it is styled to look like a button',
   'Only on a page with no other controls'],
  'Attaching a click handler adds mouse behaviour and nothing else. The element remains ordinary '
  'layout as far as the keyboard is concerned.')

q('GB_WA_012', 'WA_FAM03_KEYBOARD_REACH', 'D1',
  'What makes a control reachable by keyboard?',
  'Being the kind of element the keyboard stops at, or being explicitly made one',
  ['Being visible on the page',
   'Being styled to look interactive',
   'Having a click handler attached'],
  'Reachability follows from what the element is rather than how it looks or what code it '
  'carries. Styling and handlers are both invisible to keyboard navigation.')

q('GB_WA_013', 'WA_FAM03_KEYBOARD_REACH', 'D2',
  'A developer styles a plain area to look exactly like the page other buttons and attaches a '
  'click handler. A reviewer using a mouse finds no difference between it and the real buttons. '
  'What has the review missed?',
  'That the keyboard never stops at it, which a mouse review cannot reveal',
  ['That it is styled differently from the real buttons',
   'That the click handler is slower than a real button',
   'Nothing; it is equivalent to a real button'],
  'A mouse review exercises the one route that works. The fault is invisible until somebody tries '
  'to reach the control another way.')

# =========================================================================
# WA_FAM04_HEADING_STRUCTURE — D2 x1, D3 x1
# =========================================================================
q('GB_WA_014', 'WA_FAM04_HEADING_STRUCTURE', 'D2',
  'A page uses heading levels one, two, two, three, two. What does that sequence describe?',
  'A top-level section with three subsections, the first of which has a subsection of its own',
  ['Five sections of equal importance',
   'A section with four subsections',
   'Nothing; the sequence is invalid'],
  'Levels state nesting, so each level two opens a subsection of the level one and the level '
  'three sits inside the first of them. The sequence is entirely well formed.')

q('GB_WA_015', 'WA_FAM04_HEADING_STRUCTURE', 'D3',
  'A page uses heading levels one, four, two. What is the problem with jumping from one to four?',
  'It claims two intervening levels of nesting that do not exist, so the structure is misleading',
  ['Nothing; heading levels may be used in any order',
   'The page will not display correctly',
   'Level four headings are not permitted on a page'],
  'Someone navigating by structure is told there are two enclosing levels between them. The page '
  'displays perfectly and describes itself wrongly.')

# =========================================================================
# WA_FAM05_CONTROL_NAMING — D2 x1, D3 x1
# =========================================================================
q('GB_WA_016', 'WA_FAM05_CONTROL_NAMING', 'D2',
  'A button shows only a pencil icon and carries no text of any kind. What is announced to '
  'somebody hearing the page?',
  'That there is a button, with nothing to say what it does',
  ['That there is a pencil icon',
   'That there is an edit button',
   'Nothing; the button is skipped'],
  'The icon is a picture and conveys nothing to a non-visual reader. The control is reachable and '
  'unidentifiable, which is worse than being absent.')

q('GB_WA_017', 'WA_FAM05_CONTROL_NAMING', 'D3',
  'A row of five icon-only buttons carries no text. What does somebody hearing the page '
  'encounter?',
  'Five buttons, none of which can be told apart',
  ['Five buttons, distinguishable by their position',
   'One button, since the five are identical',
   'Nothing, since the buttons carry no text'],
  'Each is announced as a button and nothing distinguishes them. Guessing which is which by '
  'counting positions is not something the page has offered.')

# =========================================================================
# WA_FAM06_FOCUS_ORDER — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_WA_018', 'WA_FAM06_FOCUS_ORDER', 'D2',
  'A page contains three controls, appearing in the markup in the order A, B, C, and displayed on '
  'screen in that same order. In what order does keyboard focus visit them?',
  'A, then B, then C',
  ['C, then B, then A', 'Whichever is visually closest to the top',
   'In a random order'],
  'Focus follows the order in the markup, which here matches the visual order. The two agreeing '
  'is what makes ordinary pages behave predictably.')

q('GB_WA_019', 'WA_FAM06_FOCUS_ORDER', 'D3',
  'Three controls appear in the markup in the order A, B, C. Styling places them on screen in the '
  'order C, A, B. In what order does keyboard focus visit them?',
  'A, then B, then C, following the markup rather than the screen',
  ['C, then A, then B, following the screen',
   'In whichever order they were styled',
   'Focus visits only the first of the three'],
  'Focus follows the markup and the eye follows the screen, so the two disagree here. A sighted '
  'keyboard user watches the focus jump around the page.')

q('GB_WA_020', 'WA_FAM06_FOCUS_ORDER', 'D4',
  'A form is laid out in two visual columns. In the markup, every field of the left column comes '
  'first, followed by every field of the right. Focus follows the markup, in which the whole left '
  'column precedes the whole right column. A visitor tabbing through expects to move across each '
  'row. What do they experience?',
  'Focus travels down the whole left column before returning to the top of the right',
  ['Focus travels across each row as expected',
   'Focus visits the left column only',
   'Focus travels down the right column first'],
  'The visual arrangement suggests rows and the markup describes columns. Reordering the markup, '
  'rather than restyling, is what aligns the two.',
  evidence='Focus follows the markup, in which the whole left column precedes the whole right '
           'column')

# =========================================================================
# WA_FAM07_COLOUR_ALONE — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_WA_021', 'WA_FAM07_COLOUR_ALONE', 'D2',
  'A table marks overdue rows in red and current rows in green, with no other difference between '
  'them. What information is lost to someone who cannot distinguish those colours?',
  'Which rows are overdue',
  ['The contents of the rows', 'The order of the rows', 'Nothing at all'],
  'The colour is the only carrier of the status, so the status is what disappears. Everything '
  'else in the row is still readable.')

q('GB_WA_022', 'WA_FAM07_COLOUR_ALONE', 'D3',
  'A table marks overdue rows in red and also labels each one "Overdue" in a status column. Is '
  'this a fault?',
  'No; the colour is redundant and the information is carried in text as well',
  ['Yes; colour should never be used to convey status',
   'Yes; the label duplicates the colour unnecessarily',
   'Only if the red is too pale'],
  'Colour used alongside another signal is a help rather than a barrier. Removing it would make '
  'the table harder for sighted readers and easier for nobody.')

q('GB_WA_023', 'WA_FAM07_COLOUR_ALONE', 'D4',
  'A form marks fields with errors by turning their borders red, and adds no other indication. A '
  'visitor reports submitting repeatedly without knowing what was wrong. The red border is the '
  'only indication of which fields are at fault and it is a purely visual one. What is the fault?',
  'The error is conveyed by colour alone, so anyone not perceiving it has nothing to go on',
  ['The red is not bright enough to notice',
   'The form should not have refused the submission',
   'The fields should have been marked before submission'],
  'The visitor is told something is wrong and never which field or why. A message associated with '
  'each faulty field carries the information regardless of colour.',
  evidence='The red border is the only indication of which fields are at fault')

# =========================================================================
# WA_FAM08_LINK_TEXT_STANDALONE — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_WA_024', 'WA_FAM08_LINK_TEXT_STANDALONE', 'D2',
  'A page contains six links, each reading "click here". Read out on their own, what do they '
  'convey?',
  'Nothing about where any of them goes',
  ['Their destinations, from the surrounding sentences',
   'That they are all the same link',
   'That the page has six sections'],
  'Listing links is a common way of navigating, and six identical entries distinguish nothing. '
  'The surrounding sentence is not part of the link.')

q('GB_WA_025', 'WA_FAM08_LINK_TEXT_STANDALONE', 'D3',
  'Which link text works when read on its own, away from its sentence?',
  '"Download the 2024 annual report"',
  ['"Read more"', '"Here"', '"This document"'],
  'Only the first names its destination without help. The other three depend entirely on text '
  'that does not travel with them.')

q('GB_WA_026', 'WA_FAM08_LINK_TEXT_STANDALONE', 'D4',
  'A results table gives every row a link reading "View". A team argues the row makes the '
  'destination obvious. A list of the links on the page shows the link text without the row it '
  'sat in. What is the difficulty?',
  'Listed on their own, every link reads identically and none can be told from another',
  ['The word View is too short to be a link',
   'The links should open in a new window',
   'Nothing; the row supplies the context'],
  'Within the row the meaning is clear and the row is exactly what is lost. Naming the subject in '
  'each link, visibly or otherwise, is what makes the list usable.',
  evidence='A list of the links on the page shows the link text without the row it sat in')

# =========================================================================
# WA_FAM09_ERROR_COMMUNICATION — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_WA_027', 'WA_FAM09_ERROR_COMMUNICATION', 'D2',
  'A form shows an error message in small text at the top of the page after a failed submission. '
  'A visitor hearing the page is left at the submit button. What is the difficulty?',
  'Nothing draws their attention to the message, which is now far from where they are',
  ['The message is too small to read',
   'The message should be at the bottom instead',
   'Nothing; the message is on the page'],
  'Being present on the page and being noticed are different things. Somebody reading '
  'sequentially has no reason to go back up.')

q('GB_WA_028', 'WA_FAM09_ERROR_COMMUNICATION', 'D3',
  'A form marks a faulty field with a message placed immediately beside it, associated with the '
  'field. What does a visitor hearing the page get when they reach that field?',
  'The field, its name and the message describing what is wrong',
  ['The field and its name only',
   'The message only',
   'Nothing, since messages are visual'],
  'Associating the message with the field makes it part of what the field announces. Placement '
  'beside it is what helps a sighted reader.')

q('GB_WA_029', 'WA_FAM09_ERROR_COMMUNICATION', 'D4',
  'A form reports errors by scrolling to the first faulty field and turning its border red, '
  'without moving keyboard focus or announcing anything. A visitor hearing the page and navigating '
  'by keyboard is not moved and is told nothing. What do they experience?',
  'A submission that appears to do nothing at all',
  ['A clear indication of which field is wrong',
   'A message read out automatically',
   'The form being submitted successfully'],
  'The page changed in ways that reach only a sighted mouse user. Moving focus to the faulty '
  'field would carry both the location and its message.',
  evidence='A visitor hearing the page and navigating by keyboard is not moved and is told '
           'nothing')

# =========================================================================
# WA_FAM10_ROLE_DEPENDENT_DESCRIPTION — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_WA_030', 'WA_FAM10_ROLE_DEPENDENT_DESCRIPTION', 'D2',
  'A company logo appears in the page header as decoration beside the company name in text. How '
  'should it be treated?',
  'Passed over silently, since the name is already present as text',
  ['Described as the company logo',
   'Described with the company name',
   'Described as a decorative image'],
  'Describing it would announce the company name twice in succession. The text beside it already '
  'carries the information.')

q('GB_WA_031', 'WA_FAM10_ROLE_DEPENDENT_DESCRIPTION', 'D3',
  'The same company logo is the entire content of a link to the home page, with no text beside '
  'it. How should it be treated now?',
  'Described by where the link goes, since it is the only content the link has',
  ['Passed over silently, as before',
   'Described as the company logo',
   'Described as a decorative image'],
  'The image is now carrying the name of a control rather than decorating one. A silently passed '
  'over image would leave the link announcing nothing.')

q('GB_WA_032', 'WA_FAM10_ROLE_DEPENDENT_DESCRIPTION', 'D4',
  'A magnifying-glass icon is the whole content of a button that runs a search. A team describes '
  'it as "magnifying glass". The icon is the only content of the button, and what a user needs to '
  'know is what pressing it does. What should it be described as?',
  'What the button does, since the description is naming a control rather than a picture',
  ['A magnifying glass, since that is what the image shows',
   'A search icon, since that names the image accurately',
   'Nothing, since icons are decorative'],
  'Describing the picture tells the user what they cannot see and not what they can do. When an '
  'image is a control, its description is the control name.',
  evidence='The icon is the only content of the button, and what a user needs to know is what '
           'pressing it does')

# =========================================================================
# WA_FAM11_UNREACHABLE_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_WA_033', 'WA_FAM11_UNREACHABLE_DIAGNOSIS', 'D3',
  'A control works perfectly with a mouse and cannot be reached by keyboard at all. It is built '
  'from a plain layout element with a click handler. What is the cause?',
  'The element is not a kind the keyboard stops at',
  ['The click handler is written incorrectly',
   'The control is styled to hide it from the keyboard',
   'The browser does not support keyboard navigation'],
  'A click handler adds one route and creates none for the keyboard. Using a real button, or '
  'explicitly making the element focusable and operable, is the repair.')

q('GB_WA_034', 'WA_FAM11_UNREACHABLE_DIAGNOSIS', 'D4',
  'A menu opens on hover and closes as soon as the pointer leaves it. A keyboard user cannot open '
  'it at all. The menu opens only in response to a pointer hovering, and a keyboard produces no '
  'hover. What is the cause?',
  'Opening is tied to an interaction the keyboard cannot produce',
  ['The menu items are not focusable',
   'The menu closes too quickly to use',
   'The menu is positioned outside the page'],
  'Even perfectly focusable items are unreachable inside a menu that never opens. Opening on '
  'focus as well as on hover is what makes both routes work.',
  evidence='The menu opens only in response to a pointer hovering, and a keyboard produces no '
           'hover')

# =========================================================================
# WA_FAM12_MISLEADING_STRUCTURE_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_WA_035', 'WA_FAM12_MISLEADING_STRUCTURE_DIAGNOSIS', 'D3',
  'A developer uses a heading element for a line of bold text that is not a heading, because it '
  'produced the right size. What does the page now claim?',
  'That a new section begins there, which is untrue',
  ['Nothing; the size is all that changed',
   'That the text is important',
   'That the text should be read first'],
  'Choosing an element for its appearance puts a false statement into the structure. Anyone '
  'navigating by heading is offered a section that does not exist.')

q('GB_WA_036', 'WA_FAM12_MISLEADING_STRUCTURE_DIAGNOSIS', 'D4',
  'A page lays out a set of related items using a table, because the columns line up neatly. The '
  'items have no row-and-column relationship. A table states that its cells are related by row and '
  'column, and these items have no such relationship. What does the page claim?',
  'That the items stand in a row-and-column relationship they do not have',
  ['Nothing; a table is a layout choice',
   'That the items are in a particular order',
   'That the items are of equal importance'],
  'Somebody navigating a table is told which column and row each cell belongs to, and the answers '
  'are meaningless here. Layout that carries no relationship should not use an element that '
  'asserts one.',
  evidence='A table states that its cells are related by row and column, and these items have no '
           'such relationship')

# =========================================================================
# WA_FAM13_EQUIVALENCE_REASONING — D3 x1, D4 x1, D5 x3
# =========================================================================
q('GB_WA_037', 'WA_FAM13_EQUIVALENCE_REASONING', 'D3',
  'A page presents a chart visually and the same figures in a table below it. Is a reader who '
  'cannot see the chart at a disadvantage in what they can learn?',
  'No; the figures are available to both, though the experience differs',
  ['Yes; they cannot see the chart',
   'Yes; a table is harder to read than a chart',
   'No; the two experiences are identical'],
  'Equivalence is about what can be learned rather than about having the same experience. Both '
  'readers can obtain every figure.')

q('GB_WA_038', 'WA_FAM13_EQUIVALENCE_REASONING', 'D4',
  'A page offers a phone number for anyone who cannot use its booking form. A team calls this '
  'equivalent access. Using the phone route requires another person to act, and the form does '
  'not. Is it equivalent?',
  'No; one route requires another person and the other does not',
  ['Yes; both routes result in a booking',
   'Yes, provided the phone line is always staffed',
   'No; a phone number is never an acceptable alternative'],
  'A route that depends on somebody else answering is not the same as one the person completes '
  'themselves. It is a genuine fallback and not equivalence.',
  evidence='Using the phone route requires another person to act, and the form does not')

q('GB_WA_039', 'WA_FAM13_EQUIVALENCE_REASONING', 'D5',
  'A team builds a separate simplified version of the site for people using screen readers. It '
  'carries the same content and is updated less often than the main site. The two versions carry '
  'the same content today, and only one of them is updated regularly. What is the difficulty?',
  'The two will diverge, and the people on the simplified version will silently get older '
  'information',
  ['Nothing; a separate version is a reasonable solution',
   'The simplified version will be too slow',
   'Screen reader users prefer the main site'],
  'Equivalence today is not equivalence next month, and the divergence is invisible to the people '
  'affected by it. One site that works for everybody has no such drift.',
  mode='EDGE',
  hinge='The two versions carry the same content today, and only one of them is updated '
        'regularly')

q('GB_WA_040', 'WA_FAM13_EQUIVALENCE_REASONING', 'D5',
  'A video carries captions and no transcript. A team asks whether that is sufficient. Captions '
  'appear synchronised with the video and cannot be searched or read at the reader own pace. Who '
  'is still not served?',
  'Anyone who cannot hear and cannot see, and anyone wanting to search or skim the content',
  ['Nobody; captions cover the requirement',
   'Only people who cannot hear',
   'Only people on slow connections'],
  'Captions serve people who can see and not hear, which is a real and partial win. A transcript '
  'reaches people using braille output and everyone who would rather read than watch.',
  mode='TRANSFER',
  hinge='Captions appear synchronised with the video and cannot be searched or read at the reader '
        'own pace')

q('GB_WA_041', 'WA_FAM13_EQUIVALENCE_REASONING', 'D5',
  'A page is fully operable by keyboard, and reaching the main content requires tabbing through '
  'sixty navigation links on every page. A keyboard user passes sixty controls before reaching '
  'the content, and a mouse user passes none. Is the page equivalent?',
  'Not in practice; the same information is reachable at a cost nobody else pays',
  ['Yes; everything is reachable by keyboard',
   'Yes, since sixty links is not many',
   'No; the page is not operable by keyboard at all'],
  'Reachability is satisfied and the cost is not shared. A link that jumps straight to the main '
  'content removes the difference at almost no expense.',
  mode='EDGE',
  hinge='A keyboard user passes sixty controls before reaching the content, and a mouse user '
        'passes none')

# =========================================================================
# WA_FAM14_REMEDY_CHOICE — D4 x1, D5 x4
# =========================================================================
q('GB_WA_042', 'WA_FAM14_REMEDY_CHOICE', 'D4',
  'A control cannot be reached by keyboard because it is built from a plain layout element. Four '
  'changes are proposed. The barrier is that the keyboard never stops at the element, and only a '
  'change to what the element is can alter that. Which removes the barrier?',
  'Replacing it with a real button element',
  ['Increasing its contrast against the background',
   'Adding a description to it',
   'Making it larger and easier to click'],
  'All four are genuine improvements and three of them address different barriers. Only changing '
  'what the element is affects whether the keyboard stops there.',
  evidence='The barrier is that the keyboard never stops at the element')

q('GB_WA_043', 'WA_FAM14_REMEDY_CHOICE', 'D5',
  'Status is conveyed by row colour alone. A team proposes darkening the colours so they are '
  'easier to distinguish. Darkening changes which colours are used and leaves colour as the only '
  'carrier of the status. Does that remove the barrier?',
  'No; the information is still carried by colour alone',
  ['Yes; the colours will now be distinguishable',
   'Yes, provided the contrast is checked',
   'No; the rows should be reordered instead'],
  'Improving contrast helps people with low vision and is worth doing. It does nothing for '
  'somebody who cannot distinguish hues, or for anyone hearing the page.',
  mode='TRANSFER',
  hinge='Darkening changes which colours are used and leaves colour as the only carrier of the '
        'status')

q('GB_WA_044', 'WA_FAM14_REMEDY_CHOICE', 'D5',
  'A page has a barrier for keyboard users. A team proposes hiding the affected control from '
  'screen readers so that it is not announced. Hiding the control removes the announcement and '
  'leaves the control unreachable by keyboard. What does that achieve?',
  'It hides the symptom from one group and removes the function from another',
  ['It removes the barrier for both groups',
   'It removes the barrier for screen reader users only',
   'Nothing at all; the page is unchanged'],
  'Hiding something that does not work is a way of removing the evidence rather than the fault. '
  'Keyboard users are still unable to reach it and now nobody is told it exists.',
  mode='EDGE', hinge='Hiding the control removes the announcement')

q('GB_WA_045', 'WA_FAM14_REMEDY_CHOICE', 'D5',
  'A team can fix a barrier affecting a small number of users at significant cost, or fix three '
  'smaller barriers affecting many users at the same cost. The single barrier prevents its users '
  'from completing the task at all, while the three make the task slower. One group cannot '
  'complete the task and the other is merely slowed. What should decide?',
  'That one group cannot complete the task at all, which outranks inconvenience to a larger group',
  ['The number of users affected, which favours the three',
   'The cost, which is the same either way',
   'Neither; both should be deferred until cheaper'],
  'Counting affected users treats prevention and inconvenience as the same quantity. Being unable '
  'to complete a task is a different kind of harm from taking longer over it.',
  mode='TRADEOFF',
  hinge='One group cannot complete the task and the other is merely slowed')

q('GB_WA_046', 'WA_FAM14_REMEDY_CHOICE', 'D5',
  'An automated checker reports no problems on a page. A team concludes the page is accessible. '
  'The checker examines what can be determined from the markup and cannot judge whether a '
  'description is meaningful or an order is sensible. What has been established?',
  'That the page passes the checks the tool performs, which are a subset of what matters',
  ['That the page is accessible',
   'That the page has no barriers for screen reader users',
   'Nothing; automated checkers are useless'],
  'Automated checking genuinely catches missing descriptions and unlabelled controls, which is '
  'worth having. Whether a description says anything useful is not something a tool can decide.',
  mode='TRADEOFF',
  hinge='The checker examines what can be determined from the markup and cannot judge whether a '
        'description is meaningful')

# =========================================================================
# WA_FAM15_ACCESSIBILITY_TRANSFER — D4 x1, D5 x3
# =========================================================================
q('GB_WA_047', 'WA_FAM15_ACCESSIBILITY_TRANSFER', 'D4',
  'A ticket machine presents every option on a touchscreen and has no physical buttons. The '
  'screen requires the user to see where to touch, and the machine offers no other way to select '
  'an option. Who is prevented from using it?',
  'Anyone who cannot see the screen',
  ['Anyone unfamiliar with ticket machines',
   'Anyone in a hurry',
   'Nobody; touchscreens are universally usable'],
  'The barrier is the same as an unlabelled control on a page, in a machine with no markup at '
  'all. A physical keypad or audio guidance is the equivalent remedy.',
  evidence='The screen requires the user to see where to touch, and the machine offers no other '
           'way to select an option')

q('GB_WA_048', 'WA_FAM15_ACCESSIBILITY_TRANSFER', 'D5',
  'A telephone menu system announces its options and requires a response within three seconds. A '
  'caller who needs longer to process the options is cut off before choosing. The options are '
  'announced once and the response window is fixed at three seconds. What is the barrier?',
  'A fixed time limit that some callers cannot meet, with no way to repeat the options',
  ['The menu has too many options',
   'The announcements are too quiet',
   'Nothing; three seconds is a reasonable time'],
  'This is a time limit with no extension, which is a recognised barrier on a page as well. '
  'Allowing the options to be repeated, or removing the limit, is the remedy.',
  mode='TRANSFER',
  hinge='The options are announced once and the response window is fixed at three seconds')

q('GB_WA_049', 'WA_FAM15_ACCESSIBILITY_TRANSFER', 'D5',
  'A printed form asks respondents to tick a box in one of two coloured columns, with no other '
  'label distinguishing them. A team argues that a printed form is outside the scope of '
  'accessibility work. The two columns are distinguished by colour alone and carry no other '
  'label. Is the argument sound?',
  'No; the barrier is the same one, and being printed does not change who it excludes',
  ['Yes; accessibility applies to digital products',
   'Yes, provided a digital version is also offered',
   'No; printed forms should not use colour at all'],
  'The medium changes the remedy and not the reasoning. A heading on each column removes the '
  'barrier as surely as a text label removes it on a page.',
  mode='EDGE',
  hinge='The two columns are distinguished by colour alone and carry no other label')

q('GB_WA_050', 'WA_FAM15_ACCESSIBILITY_TRANSFER', 'D5',
  'A team must decide whether to build accessibility into a new product from the start or to '
  'audit and remedy it before release. Retrofitting has previously required changing the '
  'structure of pages rather than their styling. Barriers of this kind live in the structure, and '
  'changing structure late is far more expensive than choosing it early. Which fits?',
  'Building it in from the start, since the barriers live in decisions made early',
  ['Auditing before release, since it can be done once for the whole product',
   'Auditing before release, since the product may change during development',
   'Either, since the resulting product is the same'],
  'The resulting product can indeed be the same, which is why cost is what decides. Element '
  'choices and focus order are structural, and structure is what a late remedy has to unpick.',
  mode='TRADEOFF',
  hinge='Barriers of this kind live in the structure, and changing structure late is far more '
        'expensive than choosing it early')
