# -*- coding: utf-8 -*-
"""
Wave 4 — CSS, 50 Golden Bank questions, all newly authored.

THE CASCADE FAMILIES ARE BUILT SO THAT ORDER AND SPECIFICITY POINT DIFFERENT WAYS. The blueprint
requires it, and the reason is that a student who believes "the last rule wins" is right often
enough to keep believing it. Every variant where both agree teaches nothing.

ARRANGEMENTS ARE DESCRIBED IN WORDS, never shown. Options cannot be pictures, so a layout question
has to state what appears where — side by side, stacked, overlapping — and the stylesheet in the
stem has to be small enough that the answer is derivable rather than recalled.
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
# CS_FAM01_RULE_ANATOMY — D1 x4, D2 x1
# =========================================================================
q('GB_CS_001', 'CS_FAM01_RULE_ANATOMY', 'D1',
  'In the rule p { color: blue; }, which part is the selector?',
  'p',
  ['color', 'blue', 'color: blue'],
  'The selector says which elements the rule applies to and sits before the braces. What follows '
  'inside is a property and its value.')

q('GB_CS_002', 'CS_FAM01_RULE_ANATOMY', 'D1',
  'In the same rule, which part is the property?',
  'color',
  ['p', 'blue', 'color: blue'],
  'The property names what is being set and the value says what it is set to. The two together '
  'make one declaration.')

q('GB_CS_003', 'CS_FAM01_RULE_ANATOMY', 'D1',
  'In the rule .btn { font-size: 14px; }, which part is the value?',
  '14px',
  ['.btn', 'font-size', 'font-size: 14px'],
  'The value 14px follows the colon and says what the property is being set to. Naming the whole '
  'declaration answers a different question.')

q('GB_CS_004', 'CS_FAM01_RULE_ANATOMY', 'D1',
  'How many declarations does the rule h1 { color: red; font-size: 20px; } contain?',
  'Two',
  ['One', 'Three', 'Four'],
  'Each property-and-value pair is one declaration, and there are two inside the braces. The '
  'selector is not a declaration.')

q('GB_CS_005', 'CS_FAM01_RULE_ANATOMY', 'D2',
  'A rule reads .note { margin: 10px; padding: 5px; }. How many elements does it configure, and '
  'how many things does it set on each?',
  'Every element carrying that class, and two things on each',
  ['One element, and two things on it',
   'Every element carrying that class, and one thing on each',
   'Two elements, one per declaration'],
  'A selector matches a set of elements, however many there are, and every declaration inside '
  'applies to each of them. The number of declarations has nothing to do with the number of '
  'elements.')

# =========================================================================
# CS_FAM02_PROPERTY_PURPOSE — D1 x3, D2 x1   (confusable pairs, not obscure properties)
# =========================================================================
q('GB_CS_006', 'CS_FAM02_PROPERTY_PURPOSE', 'D1',
  'Space is wanted between an element\'s border and its content. Which property produces it?',
  'padding',
  ['margin', 'border', 'width'],
  'The space inside the border, between it and the content, is padding. Margin sits outside the '
  'border and pushes other elements away instead.')

q('GB_CS_007', 'CS_FAM02_PROPERTY_PURPOSE', 'D1',
  'Space is wanted between an element and the one beside it. Which property produces it?',
  'margin',
  ['padding', 'border', 'height'],
  'Margin is space outside the element, which is what separates it from its neighbours. Padding '
  'would make the element itself larger and move nothing else away.')

q('GB_CS_008', 'CS_FAM02_PROPERTY_PURPOSE', 'D1',
  'The text of a paragraph should be green. Which property sets it?',
  'color',
  ['background-color', 'border-color', 'font-size'],
  'The colour property sets the colour of the text itself. The background property fills the area '
  'behind it, which is the pair most often mixed up.')

q('GB_CS_009', 'CS_FAM02_PROPERTY_PURPOSE', 'D2',
  'A developer adds padding expecting the element to move away from its neighbour, and the '
  'neighbour does not move. Why?',
  'Padding grows the element inwards from its edge; moving neighbours away is what margin does',
  ['Padding only works on text elements',
   'Padding was applied to the wrong side',
   'The neighbour has a margin cancelling it'],
  'The element does get larger, so something visibly changed and the neighbour still touches its '
  'edge. Which side the padding was applied to would change where the space appeared and not '
  'whether the neighbour moved.')

# =========================================================================
# CS_FAM03_SELECTOR_RECOGNITION — D1 x3, D2 x1
# =========================================================================
q('GB_CS_010', 'CS_FAM03_SELECTOR_RECOGNITION', 'D1',
  'What does the selector .warning target?',
  'Every element carrying the class warning',
  ['The one element whose identifier is warning',
   'Every element named warning',
   'The first element carrying the class warning'],
  'A leading dot marks a class, which any number of elements may carry. An identifier is marked '
  'differently and is meant to appear once.')

q('GB_CS_011', 'CS_FAM03_SELECTOR_RECOGNITION', 'D1',
  'What does the selector #total target?',
  'The element whose identifier is total',
  ['Every element carrying the class total',
   'Every element named total',
   'Every element containing the word total'],
  'A leading hash marks an identifier, which is meant to be unique within the page. Swapping the '
  'two prefixes is the commonest selector mistake.')

q('GB_CS_012', 'CS_FAM03_SELECTOR_RECOGNITION', 'D1',
  'What does the selector nav a target?',
  'Every link inside a navigation element',
  ['Every navigation element and every link',
   'Every navigation element that is also a link',
   'The first link inside a navigation element'],
  'A space between two selectors means "inside", so the second is looked for within the first. '
  'Reading it as two separate selectors would target both kinds of element.')

q('GB_CS_013', 'CS_FAM03_SELECTOR_RECOGNITION', 'D2',
  'How does the selector p.note differ from p .note, with a space?',
  'The first targets paragraphs carrying the class; the second targets elements with the class '
  'inside a paragraph',
  ['They are the same; the space is ignored',
   'The first targets any element with the class inside a paragraph',
   'The second targets paragraphs carrying the class'],
  'Without a space the two conditions apply to one element; with a space the second is looked for '
  'inside the first. The space is the whole difference and is easy to add or lose by accident.')

# =========================================================================
# CS_FAM04_SELECTOR_MATCHING — D2, D3
# =========================================================================
q('GB_CS_014', 'CS_FAM04_SELECTOR_MATCHING', 'D2',
  'Markup: <div><p class="note">A</p><p>B</p></div><p class="note">C</p>. How many elements does '
  '.note match?',
  'Two',
  ['One', 'Three', 'None'],
  'A class selector matches every element carrying the class wherever it appears, so both marked '
  'paragraphs match. Assuming a class matches one element confuses it with an identifier.')

q('GB_CS_015', 'CS_FAM04_SELECTOR_MATCHING', 'D3',
  'A menu is written as <ul id="menu"><li class="item">Home</li><li class="item current">About'
  '</li></ul>. Which selector reaches the About entry and nothing else?',
  '.current',
  ['.item', '#menu li', 'li'],
  'Only the second entry carries current, so .current isolates it. The other three each reach both '
  'entries, because both carry item and both sit inside the menu.')

# =========================================================================
# CS_FAM05_INHERITANCE — D2, D3
# =========================================================================
q('GB_CS_016', 'CS_FAM05_INHERITANCE', 'D2',
  'A colour is set on a container. Do the paragraphs inside it take that colour?',
  'Yes; colour is one of the properties children inherit',
  ['No; every property must be set on each element',
   'Only if the paragraphs have no colour of their own and no class',
   'Only the first paragraph does'],
  'Text-related properties pass down to children unless something overrides them. A paragraph '
  'with its own colour would use that instead, which is different from needing one.')

q('GB_CS_017', 'CS_FAM05_INHERITANCE', 'D3',
  'A border is set on a container. Do the paragraphs inside it get a border?',
  'No; a border is not inherited',
  ['Yes; children inherit everything from a parent',
   'Yes; borders inherit in the same way as colour',
   'Only the paragraphs with no border of their own'],
  'Some properties inherit and others do not, and box properties such as borders are in the '
  'second group. Assuming inheritance is all-or-nothing gets one of the two cases wrong whichever '
  'way it is assumed.')

# =========================================================================
# CS_FAM06_CASCADE_RESOLUTION — D2, D3, D4   (order and specificity disagree)
# =========================================================================
q('GB_CS_018', 'CS_FAM06_CASCADE_RESOLUTION', 'D2',
  'Two rules both target the same paragraph with equal specificity: the first sets the colour to '
  'red and the second to blue. Which applies?',
  'Blue, because the later rule wins when specificity is equal',
  ['Red, because the first rule was applied first',
   'Neither; the conflict cancels both',
   'Both, blended together'],
  'Order decides only when specificity is level, which it is here. Nothing blends or cancels — one '
  'value is used.')

q('GB_CS_019', 'CS_FAM06_CASCADE_RESOLUTION', 'D3',
  'A rule .note { color: red; } appears first, and p { color: blue; } appears after it. A '
  'paragraph carries the class note. Which colour applies?',
  'Red, because the class selector is more specific than the element selector',
  ['Blue, because it appears later',
   'Blue, because element selectors are stronger',
   'Neither; the two cancel out'],
  'Specificity is considered before order, so a later rule loses to a more specific earlier one. '
  'This is the case where "the last rule wins" gives the wrong answer.')

q('GB_CS_020', 'CS_FAM06_CASCADE_RESOLUTION', 'D4',
  'A developer moves a rule to the bottom of the stylesheet to make it win, and the colour does '
  'not change. Their rule uses an element selector and the competing rule uses a class. What '
  'happened?',
  'The competing rule is more specific, and moving a rule later does not overcome that',
  ['The stylesheet was cached',
   'The move introduced a syntax error',
   'The rule is now too late in the file to apply'],
  'Order is only consulted when specificity ties, so a more specific rule wins from anywhere in '
  'the file. The move was based on a rule that holds only in the equal-specificity case.',
  evidence='Their rule uses an element selector and the competing rule uses a class')

# =========================================================================
# CS_FAM07_SPECIFICITY_COMPARISON — D2, D3, D4
# =========================================================================
q('GB_CS_021', 'CS_FAM07_SPECIFICITY_COMPARISON', 'D2',
  'Which is more specific: p or .note?',
  '.note',
  ['p', 'They are equal', 'It depends which appears first'],
  'A class outranks an element selector regardless of order. Order is only consulted when the two '
  'are level.')

q('GB_CS_022', 'CS_FAM07_SPECIFICITY_COMPARISON', 'D3',
  'Which is more specific: body div section p, or .note?',
  '.note',
  ['body div section p, since it has four parts',
   'They are equal',
   'It depends which appears first'],
  'Specificity compares the kinds of selector rather than how many there are, and one class '
  'outranks any number of element selectors. Length is the intuition this case exists to break.')

q('GB_CS_023', 'CS_FAM07_SPECIFICITY_COMPARISON', 'D4',
  'A developer adds three more element names to their selector to make it beat a class rule, and '
  'it still loses. Their selector is now six elements long. Why?',
  'Element selectors never accumulate into a class\'s worth of specificity, however many are added',
  ['Six is too many selectors to combine',
   'The class rule appears later in the file',
   'The extra elements do not match the markup'],
  'The comparison is made level by level, and no quantity of the weaker kind reaches the stronger. '
  'Adding more of what is already losing cannot change the outcome.',
  evidence='Their selector is now six elements long')

# =========================================================================
# CS_FAM08_BOX_MODEL_SIZE — D2, D3, D4
# =========================================================================
q('GB_CS_024', 'CS_FAM08_BOX_MODEL_SIZE', 'D2',
  'An element has a content width of 100px and padding of 10px on each side, with no border. How '
  'wide is it in total?',
  '120px',
  ['100px', '110px', '140px'],
  'Padding is added on both sides, so twice ten is added to the content width. Counting one side '
  'only gives 110.')

q('GB_CS_025', 'CS_FAM08_BOX_MODEL_SIZE', 'D3',
  'An element must end up occupying exactly 240px across. It carries padding of 15px on each side '
  'and a border of 5px on each side. What content width is needed?',
  '200px',
  ['240px', '220px', '210px'],
  'Padding and border are both doubled, so forty of the 240 is taken before the content, leaving '
  '200px. Subtracting only one side of each leaves 220.')

q('GB_CS_026', 'CS_FAM08_BOX_MODEL_SIZE', 'D4',
  'An element has a content width of 100px, padding of 10px each side and a margin of 20px each '
  'side. A developer says it occupies 160px. The question asks for the width of the element '
  'itself, not the space it reserves. What is it?',
  '120px; the margin is outside the element rather than part of it',
  ['160px, as they said',
   '100px, since padding is inside the content',
   '140px, counting the margin on one side'],
  'Margin is space around the element and belongs to no element\'s own width. The 160 answers a '
  'different and reasonable question — how much horizontal space is reserved — which is why the '
  'stem says which is being asked.',
  evidence='The question asks for the width of the element itself, not the space it reserves')

# =========================================================================
# CS_FAM09_DISPLAY_BEHAVIOUR — D2, D3, D4
# =========================================================================
q('GB_CS_027', 'CS_FAM09_DISPLAY_BEHAVIOUR', 'D2',
  'Two block elements follow one another in the markup. How are they arranged?',
  'Stacked, one below the other',
  ['Side by side', 'Overlapping', 'Side by side if there is room'],
  'A block element takes the full width available, so the next one starts on a new line. Sitting '
  'side by side is what inline elements do.')

q('GB_CS_028', 'CS_FAM09_DISPLAY_BEHAVIOUR', 'D3',
  'Two inline elements follow one another in the markup. How are they arranged?',
  'Side by side, wrapping to the next line if there is not room',
  ['Stacked, one below the other',
   'Side by side, never wrapping',
   'Overlapping'],
  'Inline elements flow like words in a sentence and wrap when the line runs out. That flow is '
  'exactly what distinguishes them from block elements.')

q('GB_CS_029', 'CS_FAM09_DISPLAY_BEHAVIOUR', 'D4',
  'A developer sets a width on an inline element and nothing changes. The rule is being applied '
  'and the selector matches. Why is the width ignored?',
  'An inline element is sized by its content, so a width has no effect on it',
  ['The width value is invalid',
   'A more specific rule is setting the width',
   'The element has no content to size'],
  'The stem rules out the rule not applying, so the value is reaching the element and doing '
  'nothing. Width applies to elements that participate in block layout, which an inline element '
  'does not.',
  evidence='The rule is being applied and the selector matches')

# =========================================================================
# CS_FAM10_UNIT_BEHAVIOUR — D2, D3, D4
# =========================================================================
q('GB_CS_030', 'CS_FAM10_UNIT_BEHAVIOUR', 'D2',
  'A child element is given a width of 50%. What is that a percentage of?',
  'Its parent\'s width',
  ['The width of the screen',
   'The width of the whole page',
   'Its own content width'],
  'A percentage width resolves against the containing element. Resolving it against the screen '
  'would give the same answer only when the parent happens to fill the screen.')

q('GB_CS_031', 'CS_FAM10_UNIT_BEHAVIOUR', 'D3',
  'A container has a font size of 20px and a child is given a font size of 1.5 of the inherited '
  'size. What size is the child\'s text?',
  '30px',
  ['1.5px', '24px, based on a 16px default', '20px'],
  'A relative font unit multiplies the size inherited from the parent, which is 20 here. '
  'Resolving it against the document default ignores the inheritance.')

q('GB_CS_032', 'CS_FAM10_UNIT_BEHAVIOUR', 'D4',
  'A developer sets a font size in pixels and a reader\'s enlarged text setting has no effect on '
  'it. The setting works on the rest of the page. What accounts for it?',
  'A fixed unit does not scale with the reader\'s preference, while relative units do',
  ['The reader\'s setting is broken',
   'The rule is more specific than the reader\'s setting',
   'Pixels are a relative unit and should have scaled'],
  'Fixed units mean exactly what they say and ignore the reader\'s preference, which is the whole '
  'difference from relative ones. The rest of the page scaling shows the setting itself is '
  'working.',
  evidence='The setting works on the rest of the page')

# =========================================================================
# CS_FAM11_LAYOUT_RESULT — D3, D4   (arrangements described in words)
# =========================================================================
q('GB_CS_033', 'CS_FAM11_LAYOUT_RESULT', 'D3',
  'Three block elements sit inside a container whose display is set to arrange its children in a '
  'row. How are they arranged?',
  'Side by side in a row',
  ['Stacked one below the other, as blocks normally are',
   'Overlapping at the same position',
   'Side by side only if each is given a width'],
  'The container\'s arrangement governs how its children are laid out, overriding their default '
  'block behaviour. Nothing further is needed to place them in a row.')

q('GB_CS_034', 'CS_FAM11_LAYOUT_RESULT', 'D4',
  'A container arranges its children in a row, and one child also has a rule stacking its own '
  'children below one another. Both rules are valid and both apply. What is the result?',
  'The children of the container sit in a row, and inside one of them its own children are stacked',
  ['Everything is stacked',
   'Everything sits in a row',
   'The two rules conflict and neither applies'],
  'Each container governs only its own children, so the two rules act at different levels and both '
  'take effect. Reading them as competing assumes one arrangement applies to the whole page.',
  evidence='Both rules are valid and both apply')

# =========================================================================
# CS_FAM12_RESPONSIVE_BEHAVIOUR — D3, D4   (ask about the exact boundary)
# =========================================================================
q('GB_CS_035', 'CS_FAM12_RESPONSIVE_BEHAVIOUR', 'D3',
  'A stylesheet has base rules and a conditional block applying at widths of 600px and above. The '
  'screen is 800px wide. Which styles are in effect?',
  'Both; the conditional block adds to the base rules rather than replacing them',
  ['Only the conditional block',
   'Only the base rules',
   'Neither, since the conditions overlap'],
  'Conditional rules are ordinary rules that apply when their condition holds, so they join the '
  'cascade rather than replacing what came before. Anything they do not mention keeps its base '
  'value.')

q('GB_CS_036', 'CS_FAM12_RESPONSIVE_BEHAVIOUR', 'D4',
  'A conditional block applies at widths of 600px and above. The screen is exactly 600px. Does it '
  'apply?',
  'Yes; "and above" includes the boundary value itself',
  ['No; the boundary is excluded',
   'It is undefined at exactly the boundary',
   'Only if another condition also holds'],
  'The condition includes its endpoint, so the boundary width is covered. This is the same '
  'boundary reasoning as any inclusive comparison, and it is where two adjacent conditional '
  'blocks can overlap or leave a gap.',
  evidence='The screen is exactly 600px')

# =========================================================================
# CS_FAM13_UNAPPLIED_STYLE_DIAGNOSIS — D3, D4, D5 x3
# =========================================================================
q('GB_CS_037', 'CS_FAM13_UNAPPLIED_STYLE_DIAGNOSIS', 'D3',
  'A rule targeting .btn has no effect, and the developer tools show the rule is not listed against '
  'the element at all. What is the cause?',
  'The selector does not match the element',
  ['A more specific rule is overriding it',
   'The stylesheet is cached',
   'The property is misspelled'],
  'A rule that loses the cascade is still listed against the element, struck through. Not being '
  'listed at all means the selector never matched.')

q('GB_CS_038', 'CS_FAM13_UNAPPLIED_STYLE_DIAGNOSIS', 'D4',
  'A rule has no effect. The developer tools list it against the element with its value struck '
  'through. The selector clearly matches and the file is loading. What is the cause?',
  'Another rule won the cascade for that property',
  ['The selector does not match',
   'The stylesheet failed to load',
   'The property name is misspelled'],
  'Being listed means the selector matched and the file loaded; being struck through means it lost '
  'to something else. A misspelled property would be listed as unrecognised rather than '
  'overridden.',
  evidence='The developer tools list it against the element with its value struck through')

q('GB_CS_039', 'CS_FAM13_UNAPPLIED_STYLE_DIAGNOSIS', 'D5',
  'Three causes make a style fail to appear: the selector does not match, the rule lost the '
  'cascade, or the file did not load. Which single piece of evidence separates them fastest?',
  'The developer tools\' list of rules for that element: absent, struck through, or the whole file '
  'missing',
  ['Reloading the page',
   'Reading the stylesheet again',
   'Adding the style directly to the element'],
  'The rules panel distinguishes all three at once, because each cause leaves a different trace. '
  'Applying the style directly proves it can work and says nothing about which cause was blocking '
  'it.',
  mode='TRANSFER', hinge='the selector does not match, the rule lost the cascade, or the file did '
                         'not load')

q('GB_CS_040', 'CS_FAM13_UNAPPLIED_STYLE_DIAGNOSIS', 'D5',
  'A developer fixes a style that would not apply by marking it as most important. It now works. '
  'What has that established about the original cause?',
  'Only that the rule can win when forced; it does not say why it was losing, or whether it '
  'matched before',
  ['That the selector was wrong',
   'That the file was not loading',
   'That another rule was overriding it'],
  'Forcing a rule to win changes the outcome without revealing the cause, and it would not have '
  'worked had the selector never matched — so it does narrow things slightly. What it mainly does '
  'is close the investigation before the cause is known.',
  mode='TRANSFER', hinge='by marking it as most important')

q('GB_CS_041', 'CS_FAM13_UNAPPLIED_STYLE_DIAGNOSIS', 'D5',
  'A style applies on the developer\'s machine and not for other users. The stylesheet on the '
  'server contains the rule. What is the likely cause?',
  'Other users are being served a stored copy of the stylesheet from before the rule was added',
  ['The selector does not match for other users',
   'The rule is invalid for other browsers',
   'The developer\'s browser is applying an extra rule'],
  'A split between the developer and everyone else, with the server holding the right file, is '
  'what a stored copy produces. The selector and the markup are the same for everybody.',
  mode='TRANSFER', hinge='applies on the developer\'s machine and not for other users')

# =========================================================================
# CS_FAM14_OVERRIDE_TRANSFER — D4, D5 x4   (all options work; the cost differs)
# =========================================================================
q('GB_CS_042', 'CS_FAM14_OVERRIDE_TRANSFER', 'D4',
  'A style from a library cannot be edited and must be overridden on one component. Every option '
  'below would win. Which has the least collateral effect?',
  'A rule with a slightly higher specificity, targeting only that component',
  ['A rule marked as most important, applied to the element type',
   'A rule targeting the element type across the whole page',
   'An inline style on every instance of the component'],
  'Winning is not the difficulty; every option does that. What separates them is how much else '
  'they touch and how hard they make the next override — marking a rule most important wins and '
  'leaves nothing above it.',
  evidence='Every option below would win')

q('GB_CS_043', 'CS_FAM14_OVERRIDE_TRANSFER', 'D5',
  'An override relies on appearing later in the file than the rule it beats. What is the risk?',
  'If the load order changes, the override silently stops working',
  ['There is no risk; order is fixed',
   'The override will apply twice',
   'The override will affect other elements'],
  'Order-based wins depend on something outside the rule itself, and load order is not always '
  'under the author\'s control. An override that wins on specificity does not care when it is '
  'loaded.',
  mode='TRANSFER', hinge='relies on appearing later in the file')

q('GB_CS_044', 'CS_FAM14_OVERRIDE_TRANSFER', 'D5',
  'Marking a rule as most important wins reliably. Why is it a poor first choice?',
  'It leaves nothing stronger for the next override, so the next problem has no clean solution',
  ['It does not always win',
   'It is slower to apply',
   'It only works on some properties'],
  'It works, which is why it is reached for. The cost is paid later, when somebody needs to '
  'override the override and the ordinary tools have already been exhausted.',
  mode='TRADEOFF', hinge='Marking a rule as most important wins reliably')

q('GB_CS_045', 'CS_FAM14_OVERRIDE_TRANSFER', 'D5',
  'An override is written with a very long, highly specific selector so that it certainly wins. '
  'What does that cost?',
  'It ties the rule to the current markup, so it stops applying if the structure changes',
  ['Nothing; specificity is free',
   'It slows the page noticeably',
   'It affects elements elsewhere on the page'],
  'A long selector describes a path through the document, and every element in it becomes '
  'something the rule depends on. Rearranging the markup then breaks styling that has nothing '
  'wrong with it.',
  mode='TRADEOFF', hinge='a very long, highly specific selector')

q('GB_CS_046', 'CS_FAM14_OVERRIDE_TRANSFER', 'D5',
  'What is the general principle behind choosing an override?',
  'Win by the smallest margin that is robust, so later changes still have room to work',
  ['Always win by the largest margin available',
   'Always rely on order, which is simplest',
   'Avoid overriding library styles at all'],
  'Every override is followed by another one eventually, and the choice made now decides what is '
  'available then. Winning by as much as possible and refusing to override at all are both ways '
  'of avoiding the judgement.',
  mode='TRADEOFF', hinge='the general principle behind choosing an override')

# =========================================================================
# CS_FAM15_RULE_EQUIVALENCE — D4, D5 x3
# =========================================================================
q('GB_CS_047', 'CS_FAM15_RULE_EQUIVALENCE', 'D4',
  'Two rule sets produce an identical page for the markup shown: one targets .note and one targets '
  'p. The markup contains exactly one paragraph, which carries the class note. Are they '
  'equivalent?',
  'No; they differ as soon as a paragraph without the class, or a non-paragraph with it, is added',
  ['Yes; the page is identical',
   'No; they differ in appearance already',
   'Yes, provided the markup is not changed'],
  'The two selectors happen to select the same single element here and describe different sets. '
  'Equivalence for one document is much weaker than equivalence for the documents it might '
  'become.',
  evidence='The markup contains exactly one paragraph, which carries the class note')

q('GB_CS_048', 'CS_FAM15_RULE_EQUIVALENCE', 'D5',
  'Two rules set the same property to the same value and differ only in specificity. Nothing else '
  'currently competes for that property. Are they equivalent?',
  'For now yes, and they will differ as soon as another rule competes for the property',
  ['Yes, always',
   'No; different specificity always changes the result',
   'No; the more specific rule renders differently'],
  'Specificity has no effect until there is a competition, so today the two are '
  'indistinguishable. What differs is how each behaves when the stylesheet grows.',
  mode='TRANSFER', hinge='Nothing else currently competes for that property')

q('GB_CS_049', 'CS_FAM15_RULE_EQUIVALENCE', 'D5',
  'Two stylesheets differ only in the order of two rules that target different, non-overlapping '
  'sets of elements. Are they equivalent?',
  'Yes; order matters only between rules competing for the same property on the same element',
  ['No; order always matters in a stylesheet',
   'No; the later rule always wins',
   'Yes, but only if both use the same selector kind'],
  'Two rules that never apply to the same element cannot compete, so their relative order is '
  'invisible. Order is a tie-breaker rather than a general property of the file.',
  mode='EDGE', hinge='two rules that target different, non-overlapping sets of elements')

q('GB_CS_050', 'CS_FAM15_RULE_EQUIVALENCE', 'D5',
  'What has to be checked before calling two rule sets equivalent?',
  'That they agree on the markup shown and on markup the selectors might also match',
  ['That the page looks the same',
   'That they contain the same number of rules',
   'That they use the same properties'],
  'A stylesheet describes a set of documents rather than one, so agreement on the present markup '
  'is only part of the claim. Two rule sets can look identical today and diverge the moment an '
  'element is added.',
  mode='TRANSFER', hinge='before calling two rule sets equivalent')
