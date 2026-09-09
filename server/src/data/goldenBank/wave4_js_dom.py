# -*- coding: utf-8 -*-
"""
Wave 4 — JS_DOM, 50 Golden Bank questions, all newly authored.

THE THREE CAUSES OF "NOTHING HAPPENS" ARE THE SPINE OF THIS SKILL: the script ran before the
element existed, the selector matches nothing, and the handler was called rather than referenced.
All three produce the same silence, and the whole diagnostic families exist to make a student
separate them by evidence instead of by guessing and moving code around.

THE LIVE TREE VERSUS THE DELIVERED FILE is the other load-bearing distinction. A student who
believes a change to the page has changed the file believes they have saved data.

EVERY EXPLANATION STATES ITS OWN ANSWER in the words the key holds.
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
# JD_FAM01_DOM_RECOGNITION — D1 x4, D2 x1
# =========================================================================
q('GB_JD_001', 'JD_FAM01_DOM_RECOGNITION', 'D1',
  'What is the page tree that scripts work with?',
  'The browser\'s live in-memory representation of the page',
  ['The file that was delivered from the server',
   'A browser option that has to be switched on',
   'Something supplied by a framework'],
  'Scripts work on the browser\'s live in-memory representation of the page, which the browser '
  'keeps for as long as the page is open. The delivered file is only what it was built from.')

q('GB_JD_002', 'JD_FAM01_DOM_RECOGNITION', 'D1',
  'Where does that tree come from?',
  'The browser builds it from the delivered markup',
  ['It is downloaded from the server as a second file',
   'The developer writes it alongside the markup',
   'It is created only when a script first asks for it'],
  'The browser builds it from the delivered markup as the page is read, before any script runs. '
  'Nothing extra is fetched and nothing has to be requested.')

q('GB_JD_003', 'JD_FAM01_DOM_RECOGNITION', 'D1',
  'Once a page has finished loading, can that tree still be changed?',
  'Yes, for as long as the page stays open',
  ['No; it is fixed until the page is reloaded',
   'No; it can be read but never changed',
   'Only while the page is still loading'],
  'The tree stays available and changeable for as long as the page stays open, which is what makes '
  'interactive pages possible at all. Loading finishing is not a freeze.')

q('GB_JD_004', 'JD_FAM01_DOM_RECOGNITION', 'D1',
  'Does a plain script on a page need a library before it can reach the page tree?',
  'No; reaching it is part of the browser itself',
  ['Yes; a library is required',
   'Yes, unless a framework is used instead',
   'Only for changing it, not for reading it'],
  'Reaching the tree is part of the browser itself, so a plain script can already read and change '
  'it. Libraries make the same work shorter to write rather than possible.')

q('GB_JD_005', 'JD_FAM01_DOM_RECOGNITION', 'D2',
  'A script inserts a new paragraph into the page. The developer then asks the browser to show the '
  'page source. Is the new paragraph in what they see?',
  'No; the source shown is the delivered file, which the script never touched',
  ['Yes; the source is kept in step with the page',
   'Yes, but only after the page is reloaded',
   'No; the paragraph was never really added'],
  'The paragraph is genuinely in the live page and not in the delivered file, so the source shown '
  'is the delivered file, which the script never touched. Inspecting the live tree shows the '
  'paragraph; viewing the source does not.')

# =========================================================================
# JD_FAM02_SELECTION_RESULT_RECOGNITION — D1 x3, D2 x1
# =========================================================================
q('GB_JD_006', 'JD_FAM02_SELECTION_RESULT_RECOGNITION', 'D1',
  'A lookup by identifier finds a matching element. What does the lookup produce?',
  'That one element',
  ['A collection containing that one element',
   'The text inside that element',
   'True, to say it was found'],
  'A lookup by identifier produces that one element, ready to be read or changed directly. No '
  'collection is involved, so no position has to be taken from it.')

q('GB_JD_007', 'JD_FAM02_SELECTION_RESULT_RECOGNITION', 'D1',
  'A lookup for every element carrying a class matches three elements. What does the lookup '
  'produce?',
  'A collection of the three elements',
  ['The first of the three elements',
   'The three elements joined into one piece of text',
   'The number of matches'],
  'A lookup for every match produces a collection of the three elements, whatever the number of '
  'matches turns out to be. Reaching any one of them means taking it out of the collection first.')

q('GB_JD_008', 'JD_FAM02_SELECTION_RESULT_RECOGNITION', 'D1',
  'A lookup by identifier matches nothing. What happens?',
  'It produces null and the program carries on',
  ['It throws an error and the program stops',
   'It produces an empty collection',
   'It produces the closest matching element instead'],
  'A failed lookup produces null and the program carries on, which is why the failure is only '
  'noticed on the next line. Nothing is raised at the lookup itself.')

q('GB_JD_009', 'JD_FAM02_SELECTION_RESULT_RECOGNITION', 'D2',
  'One lookup asks for a single element and another asks for every match. Neither finds anything. '
  'How do the two results differ?',
  'The single lookup gives null and the every-match lookup gives an empty collection',
  ['Both give null',
   'Both give an empty collection',
   'Both raise the same error'],
  'The two failures are shaped differently: the single lookup gives null and the every-match '
  'lookup gives an empty collection. That is why one crashes on the next line and the other '
  'quietly loops zero times.')

# =========================================================================
# JD_FAM03_EVENT_TIMING_RECOGNITION — D1 x3, D2 x1
# =========================================================================
q('GB_JD_010', 'JD_FAM03_EVENT_TIMING_RECOGNITION', 'D1',
  'A click handler is attached while the page is loading. Has the code inside it run at that '
  'point?',
  'No; it runs when a click happens',
  ['Yes; attaching runs it once',
   'Yes, and it will also run on each click',
   'Only once the page has been reloaded'],
  'Attaching only records what should happen later, so the code inside runs when a click happens '
  'and not before. Nothing about the attaching itself executes the body.')

q('GB_JD_011', 'JD_FAM03_EVENT_TIMING_RECOGNITION', 'D1',
  'A button carrying one handler is clicked three times. How many times does the handler run?',
  'Three times',
  ['Once, after which it stops listening',
   'Once per page load, however many clicks occur',
   'Never, unless it is attached again after each click'],
  'A handler stays attached and answers every click, so it runs three times. Nothing detaches it '
  'after the first.')

q('GB_JD_012', 'JD_FAM03_EVENT_TIMING_RECOGNITION', 'D1',
  'A handler is attached and the user never clicks the element. What becomes of the code inside '
  'it?',
  'It never runs',
  ['It runs once when the page finishes loading',
   'It runs when the user leaves the page',
   'It runs after a short delay'],
  'Code inside a handler waits for its event and nothing else triggers it, so it never runs. There '
  'is no fallback moment at which it is executed anyway.')

q('GB_JD_013', 'JD_FAM03_EVENT_TIMING_RECOGNITION', 'D2',
  'A script attaches a click handler and then prints a line. The user clicks a second later. In '
  'what order do the printing and the handler run?',
  'The printing first, because attaching does not wait for anything',
  ['The handler first, because handlers take priority',
   'They run at the same moment',
   'The printing is held back until the click arrives'],
  'Attaching finishes immediately and the script continues, so the printing happens first, because '
  'attaching does not wait for anything. The handler runs a second later when the click actually '
  'arrives.')

# =========================================================================
# JD_FAM04_SELECTION_MATCHING — D2, D3
# =========================================================================
q('GB_JD_014', 'JD_FAM04_SELECTION_MATCHING', 'D2',
  'The page contains <p class="note">A</p><p class="note">B</p>. A lookup asks for a single '
  'element matching .note. Which is produced?',
  'The paragraph containing A',
  ['The paragraph containing B, as the last match',
   'Both paragraphs, as a collection',
   'null, because more than one element matches'],
  'A single-element lookup takes the first match in document order, which is the paragraph '
  'containing A. Extra matches are ignored rather than causing a failure.')

q('GB_JD_015', 'JD_FAM04_SELECTION_MATCHING', 'D3',
  'The page contains <div id="box"><span class="tag">X</span></div> followed by <span '
  'class="tag">Y</span>. A lookup asks for every element matching #box .tag. How many are found, '
  'and which?',
  'One: the span containing X',
  ['Two: both spans', 'One: the span containing Y', 'None, because the span is not a direct child'],
  'The lookup is limited to what sits inside the identified element, so it finds one: the span '
  'containing X. The second span carries the same class but sits outside.')

# =========================================================================
# JD_FAM05_READ_ELEMENT_CONTENT — D2, D3
# =========================================================================
q('GB_JD_016', 'JD_FAM05_READ_ELEMENT_CONTENT', 'D2',
  'The page contains <p>Hello <b>there</b></p>. What does reading the paragraph\'s text produce?',
  'Hello there',
  ['Hello <b>there</b>', 'Hello', 'there'],
  'Reading the text gives the words with the tags stripped out and the nested words kept, which is '
  'Hello there. The nested element contributes its words but not its tags.')

q('GB_JD_017', 'JD_FAM05_READ_ELEMENT_CONTENT', 'D3',
  'The page contains <li>Price: <span>99</span></li>. What does reading the item\'s markup '
  'produce?',
  'Price: <span>99</span>',
  ['Price: 99', 'Price:', '<li>Price: <span>99</span></li>'],
  'Reading the markup gives everything between the opening and closing tags exactly as it stands, '
  'which is Price: <span>99</span>. The element\'s own tags are not part of what is inside it.')

# =========================================================================
# JD_FAM06_CHANGE_SCOPE — D2, D3, D4
# =========================================================================
q('GB_JD_018', 'JD_FAM06_CHANGE_SCOPE', 'D2',
  'A script sets a heading\'s text to Welcome. Who sees the change?',
  'Only this visitor, in this browser, on this open page',
  ['Everyone who loads the page from now on',
   'Everyone, once the server has caught up',
   'Nobody, until the change is saved'],
  'The change is made to the copy of the page held in one browser, so only this visitor, in this '
  'browser, on this open page sees it. Nothing was sent anywhere.')

q('GB_JD_019', 'JD_FAM06_CHANGE_SCOPE', 'D3',
  'After a script has changed a heading, the visitor reloads the page. What heading appears?',
  'The original one, because the page is built again from the delivered markup',
  ['The changed one, which survives reloads',
   'No heading at all',
   'The changed one, until the browser cache is cleared'],
  'A reload throws the live tree away and builds a new one, so the original one appears, because '
  'the page is built again from the delivered markup. The script would have to run again to '
  'change it again.')

q('GB_JD_020', 'JD_FAM06_CHANGE_SCOPE', 'D4',
  'A student is sure their form saves data, because after clicking Save the entered values are '
  'still on the screen. Their Save handler only writes the values into the page. They reload and '
  'everything is gone. What does the reload demonstrate?',
  'That nothing ever left the browser; only the live page had been changed',
  ['That the save worked but the server has not caught up',
   'That reloading deleted what had been saved',
   'That the browser cache was cleared at the wrong moment'],
  'Values staying on screen prove only that the live page holds them, and the reload rebuilds the '
  'page from the delivered markup: nothing ever left the browser; only the live page had been '
  'changed. Saving requires sending the values somewhere that outlives the page.',
  evidence='Their Save handler only writes the values into the page')

# =========================================================================
# JD_FAM07_STYLE_CHANGE_RESULT — D2, D3, D4
# =========================================================================
q('GB_JD_021', 'JD_FAM07_STYLE_CHANGE_RESULT', 'D2',
  'A stylesheet contains .hidden { display: none; }. A script adds the class hidden to a paragraph '
  'that is currently on screen. What happens to it?',
  'It disappears from view',
  ['It stays, because the sheet had already been applied when the script ran',
   'It disappears once the page is reloaded',
   'It stays, because a script cannot bring a sheet rule into play'],
  'Which rules match is worked out again every time the page changes, so the paragraph now matches '
  'and It disappears from view. Sheets are not applied once at the start and then forgotten.')

q('GB_JD_022', 'JD_FAM07_STYLE_CHANGE_RESULT', 'D3',
  'A stylesheet contains #save { color: red; } and .btn { color: blue; }. A script adds the class '
  'btn to the element whose identifier is save. What colour is the element?',
  'Red, because the identifier rule is the more specific of the two',
  ['Blue, because the class was added most recently',
   'Blue, because a change made by a script outranks the stylesheet',
   'Neither; the two rules cancel each other'],
  'The element now matches both rules and the cascade settles it on specificity, so it stays red, '
  'because the identifier rule is the more specific of the two. When the class was added makes no '
  'difference.')

q('GB_JD_023', 'JD_FAM07_STYLE_CHANGE_RESULT', 'D4',
  'A stylesheet sets an element\'s colour to red through its identifier. A script sets the colour '
  'to green on the element itself. The element shows green, even though an identifier rule is '
  'highly specific. Why?',
  'A style set on the element itself is considered after every stylesheet rule',
  ['Because the script ran later in time than the stylesheet',
   'Because a script always overrides a stylesheet',
   'Because green is applied to the text and red to the background'],
  'What the script produced is not another stylesheet rule but a style on the element, and a style '
  'set on the element itself is considered after every stylesheet rule. Running later is not the '
  'reason: a stylesheet loaded afterwards would still lose.',
  evidence='The element shows green, even though an identifier rule is highly specific')

# =========================================================================
# JD_FAM08_HANDLER_TARGET — D2, D3, D4
# =========================================================================
q('GB_JD_024', 'JD_FAM08_HANDLER_TARGET', 'D2',
  'Three buttons each receive their own handler, and each handler hides the element that was '
  'clicked. The second button is clicked. What happens?',
  'The second button is hidden',
  ['All three buttons are hidden', 'The first button is hidden', 'Nothing happens'],
  'Each handler acts on whatever was clicked, so the second button is hidden and the others are '
  'untouched. The click decides the target.')

q('GB_JD_025', 'JD_FAM08_HANDLER_TARGET', 'D3',
  'Three similar buttons exist, but a handler was attached to the first one only. The third button '
  'is clicked. What happens?',
  'Nothing, because the third button has no handler',
  ['The first button is hidden', 'The third button is hidden', 'All three buttons are hidden'],
  'A handler only answers clicks on the element it was attached to, so nothing happens, because '
  'the third button has no handler. Attaching to one element does not cover its lookalikes.')

q('GB_JD_026', 'JD_FAM08_HANDLER_TARGET', 'D4',
  'Every button in a list has a handler attached, and clicking any of them always hides the first '
  'button. What is the fault?',
  'The handler acts on a fixed element instead of the one that was clicked',
  ['Only the first button actually received a handler',
   'The handlers were attached before the buttons existed',
   'All the buttons share one identifier'],
  'Something happens on every click, so every button really is wired up and the attaching timing '
  'is fine; what is wrong is that the handler acts on a fixed element instead of the one that was '
  'clicked. The handler needs the clicked element rather than a name resolved once.',
  evidence='clicking any of them always hides the first button')

# =========================================================================
# JD_FAM09_SCRIPT_TIMING — D2, D3, D4
# =========================================================================
q('GB_JD_027', 'JD_FAM09_SCRIPT_TIMING', 'D2',
  'A script is placed above the markup it looks up and runs as soon as it is reached. Does the '
  'lookup find the element?',
  'No; that part of the page has not been built yet',
  ['Yes; the browser waits for the whole page first',
   'Yes; lookups search the delivered file rather than the page',
   'Only when the lookup uses an identifier'],
  'The page is built from the top downwards and the script runs where it sits, so no, that part '
  'of the page has not been built yet. The lookup searches the live tree, which is still '
  'incomplete.')

q('GB_JD_028', 'JD_FAM09_SCRIPT_TIMING', 'D3',
  'The same script is moved below the markup it looks up. Does the lookup find the element now?',
  'Yes; the element has been built by the time the script runs',
  ['No; where a script sits makes no difference',
   'Only after the page is reloaded once',
   'Only if it also waits for the page to finish loading'],
  'Everything above a script exists before the script runs, so yes, the element has been built by '
  'the time the script runs. Waiting for a load event is another way to get the same guarantee, '
  'not a further requirement.')

q('GB_JD_029', 'JD_FAM09_SCRIPT_TIMING', 'D4',
  'A lookup gives null when the page loads. Typing exactly the same lookup into the console '
  'afterwards finds the element. What is the cause?',
  'The script ran before that element had been built',
  ['The selector does not match the element',
   'The element is hidden by a stylesheet rule',
   'The browser does not support that kind of lookup'],
  'The console result proves the selector matches and the element exists, so the only thing that '
  'differs between the two attempts is when they happened: the script ran before that element had '
  'been built.',
  evidence='Typing exactly the same lookup into the console afterwards finds the element')

# =========================================================================
# JD_FAM10_COLLECTION_HANDLING — D2, D3, D4
# =========================================================================
q('GB_JD_030', 'JD_FAM10_COLLECTION_HANDLING', 'D2',
  'A lookup returns the three elements carrying a class. The script then sets a style on the '
  'returned collection itself. What happens on the page?',
  'Nothing changes',
  ['All three elements change', 'The first element changes', 'An error stops the script'],
  'A collection is a list of elements and not an element, so setting a style on it changes nothing '
  'on the page. No error is raised either, which is what makes this hard to spot.')

q('GB_JD_031', 'JD_FAM10_COLLECTION_HANDLING', 'D3',
  'How is a style applied to every element in such a collection?',
  'By going through the collection and setting the style on each element in turn',
  ['By setting the style on the collection once',
   'By setting the style on the first element, which the rest follow',
   'By running the lookup again for each element'],
  'The collection holds the elements but is not one of them, so the work is done by going through '
  'the collection and setting the style on each element in turn. There is no shortcut that reaches '
  'them all at once.')

q('GB_JD_032', 'JD_FAM10_COLLECTION_HANDLING', 'D4',
  'A script sets a style on a collection and nothing changes, with no error reported. A colleague '
  'says the selector must be wrong. What single check settles which of the two it is?',
  'Print how many elements the collection holds',
  ['Reload the page and try again',
   'Set the style on the first element instead',
   'Try a different style property'],
  'A wrong selector and a style set on the collection look identical from outside, and they differ '
  'in exactly one observable: print how many elements the collection holds. Zero means the '
  'selector, three means the collection was styled instead of its members.',
  evidence='sets a style on a collection and nothing changes, with no error reported')

# =========================================================================
# JD_FAM11_INPUT_VALUE_TYPE — D3, D4
# =========================================================================
q('GB_JD_033', 'JD_FAM11_INPUT_VALUE_TYPE', 'D3',
  'A control declared to accept numbers holds 20. A script reads its value and compares it with '
  'the number 20 using the strict form of equality. What is the result?',
  'False, because the value read out is text',
  ['True, because both are 20',
   'True, but only because the control accepts numbers',
   'An error, because the two types cannot be compared'],
  'A control hands back what the user typed as text whatever the control is declared to accept, so '
  'the comparison is false, because the value read out is text. The strict form refuses to convert '
  'before comparing.')

q('GB_JD_034', 'JD_FAM11_INPUT_VALUE_TYPE', 'D4',
  'A script checks a text control against undefined to see whether the user typed nothing. The '
  'user types nothing and the check still never matches. Why?',
  'An untouched control gives an empty string, which is not undefined',
  ['The control was not found by the lookup',
   'The value is null rather than undefined',
   'The check has to use the converting form of equality'],
  'A control always has a value and it starts as text with no characters in it, so an untouched '
  'control gives an empty string, which is not undefined. Checking the length, or comparing '
  'against an empty string, is what detects it.',
  evidence='The user types nothing and the check still never matches')

# =========================================================================
# JD_FAM12_TRAVERSAL — D3, D4
# =========================================================================
q('GB_JD_035', 'JD_FAM12_TRAVERSAL', 'D3',
  'The page contains <div><section><p id="t">X</p></section></div>. Starting from the paragraph, '
  'which element is its parent?',
  'The section',
  ['The div', 'The paragraph itself', 'The body'],
  'The section is the parent, because a parent is the element that directly contains another. The '
  'div contains that section and is therefore one level further out.')

q('GB_JD_036', 'JD_FAM12_TRAVERSAL', 'D4',
  'The page contains a list written across several lines, with each item on its own line. Asking '
  'the first item for its next element sibling gives the second item. Asking it for its next node '
  'instead often gives something else. What?',
  'The whitespace text sitting between the two items',
  ['The list itself', 'The second item again, by another route', 'Nothing, in every case'],
  'Line breaks and indentation between tags are themselves content in the tree, so the next node '
  'is the whitespace text sitting between the two items. Asking specifically for elements is what '
  'skips it.',
  evidence='Asking it for its next node instead often gives something else')

# =========================================================================
# JD_FAM13_LOOKUP_FAILURE_DIAGNOSIS — D3, D4, D5 x3
# =========================================================================
q('GB_JD_037', 'JD_FAM13_LOOKUP_FAILURE_DIAGNOSIS', 'D3',
  'A lookup written with the class name but without a leading dot finds nothing, although '
  'elements carrying that class exist and the script runs late enough. What is wrong?',
  'The selector is being read as an element name rather than a class',
  ['The script still runs too early',
   'The class is spelled differently in the markup',
   'A class can only be found through a collection lookup'],
  'Without the dot the text names a kind of element, and no element is called that, so the '
  'selector is being read as an element name rather than a class. Adding the dot is the whole fix.')

q('GB_JD_038', 'JD_FAM13_LOOKUP_FAILURE_DIAGNOSIS', 'D4',
  'A lookup gives null. The script sits at the bottom of the page and runs after the markup, and '
  'the same selector typed into the console afterwards also finds nothing. What is the cause?',
  'The selector matches nothing in the page',
  ['The script ran before the element existed',
   'The element is hidden by a stylesheet rule',
   'The page failed to finish loading'],
  'Timing is ruled out twice over, by the script\'s position and by the console attempt made after '
  'loading, so the selector matches nothing in the page. A hidden element would still be found.',
  evidence='the same selector typed into the console afterwards also finds nothing')

q('GB_JD_039', 'JD_FAM13_LOOKUP_FAILURE_DIAGNOSIS', 'D5',
  'Two causes give the same null lookup: the script ran too early, or the selector matches '
  'nothing. Which single check separates them?',
  'Run the same lookup in the console once the page has finished loading',
  ['Reload the page and watch whether it happens again',
   'Move the script to the bottom of the page',
   'Add a short wait before the lookup'],
  'The two causes differ only in whether the element exists at lookup time, so run the same lookup '
  'in the console once the page has finished loading and the answer is immediate. Moving the '
  'script or adding a wait would fix one cause without ever showing which it was.',
  mode='TRANSFER', hinge='the script ran too early, or the selector matches')

q('GB_JD_040', 'JD_FAM13_LOOKUP_FAILURE_DIAGNOSIS', 'D5',
  'Moving a script to the bottom of the page makes a failing lookup start working. What has that '
  'established?',
  'That timing was the cause, and the selector was correct all along',
  ['That the selector was wrong and has now been corrected',
   'Nothing; the change could have fixed anything',
   'That the element was hidden and is now visible'],
  'Only when the script runs changed, and the outcome changed with it, so timing was the cause, '
  'and the selector was correct all along. A wrong selector would still find nothing from the '
  'bottom of the page.',
  mode='TRANSFER', hinge='Moving a script to the bottom of the page makes a failing lookup start')

q('GB_JD_041', 'JD_FAM13_LOOKUP_FAILURE_DIAGNOSIS', 'D5',
  'A lookup works on the developer\'s page and gives null on another page built from the same '
  'template, where that element is only rendered when there is data to show. What is the likeliest '
  'cause?',
  'On that page the element genuinely is not there',
  ['The script runs earlier on that page',
   'The selector is wrong and only appeared to work',
   'That page loads the script from a different place'],
  'The stem gives a condition under which the element is left out entirely, and the failing page '
  'is the one meeting it, so on that page the element genuinely is not there. The code is the same '
  'on both pages; the data is not.',
  mode='TRANSFER', hinge='that element is only rendered when there is data to show')

# =========================================================================
# JD_FAM14_HANDLER_FAILURE_DIAGNOSIS — D4, D5 x4
# =========================================================================
q('GB_JD_042', 'JD_FAM14_HANDLER_FAILURE_DIAGNOSIS', 'D4',
  'A handler was attached by writing the function name followed by parentheses. Its message '
  'appears once while the page is loading, and clicking afterwards does nothing. What happened?',
  'The function was run at that moment and what it returned was attached instead of the function',
  ['The handler was attached to the wrong element',
   'The element did not exist when the attaching ran',
   'Another element sits on top and swallows the clicks'],
  'The parentheses call the function there and then, which is why the message appeared during '
  'loading: the function was run at that moment and what it returned was attached instead of the '
  'function. Dropping the parentheses attaches the function itself.',
  evidence='Its message appears once while the page is loading')

q('GB_JD_043', 'JD_FAM14_HANDLER_FAILURE_DIAGNOSIS', 'D5',
  'Three faults all end with nothing happening on click: the handler was called instead of '
  'referenced, the element did not exist when the attaching ran, and the handler was attached to a '
  'collection. Which of them leaves a visible trace while the page loads?',
  'The one that called the handler, because its body runs once immediately',
  ['The one attached before the element existed',
   'The one attached to a collection',
   'None of them leaves a trace'],
  'Two of the faults do nothing observable at attach time, while calling the function runs it: the '
  'one that called the handler, because its body runs once immediately, is the one that shows. '
  'That single early trace is what separates it from the other two without reading the code.',
  mode='TRANSFER', hinge='the handler was called instead of referenced')

q('GB_JD_044', 'JD_FAM14_HANDLER_FAILURE_DIAGNOSIS', 'D5',
  'Nothing happens on click, and the console shows an error at the attaching line saying a '
  'property cannot be read of null. Which of the three faults is it?',
  'The element did not exist when the attaching ran',
  ['The handler was called instead of referenced',
   'The handler was attached to a collection',
   'The body of the handler has a fault in it'],
  'A failed lookup gives null, and attaching to null is what raises that error at that line, so '
  'the element did not exist when the attaching ran. A fault inside the body could not report '
  'itself before any click.',
  mode='TRANSFER', hinge='an error at the attaching line saying a property cannot be read of null')

q('GB_JD_045', 'JD_FAM14_HANDLER_FAILURE_DIAGNOSIS', 'D5',
  'Nothing happens on click, no error appears anywhere, and nothing ran while the page was '
  'loading. Which of the three faults fits?',
  'The handler was attached to a collection rather than to its members',
  ['The handler was called instead of referenced',
   'The element did not exist when the attaching ran',
   'All three fit this description equally'],
  'Calling the handler would have left a trace during loading and attaching to null would have '
  'raised an error, so the silence on both counts points at the remaining one: the handler was '
  'attached to a collection rather than to its members. Attaching to a collection succeeds and '
  'reaches nothing.',
  mode='EDGE', hinge='no error appears anywhere, and nothing ran while the page was loading')

q('GB_JD_046', 'JD_FAM14_HANDLER_FAILURE_DIAGNOSIS', 'D5',
  'A table of fifty rows can be wired up by attaching a handler to each row, or by attaching one '
  'handler to the table and working out which row was clicked. What does the single handler cost?',
  'It has to work out the row itself, and gets that wrong when the markup inside a row changes',
  ['Nothing; it is better in every respect',
   'It stops working as soon as rows are added',
   'It runs once for every row on each click'],
  'The single handler is cheaper to attach and keeps working for rows added later, and the price '
  'is that it has to work out the row itself, and gets that wrong when the markup inside a row '
  'changes. Fifty handlers know their row without asking.',
  mode='TRADEOFF', hinge='or by attaching one handler to the table')

# =========================================================================
# JD_FAM15_UPDATE_APPROACH_CHOICE — D4, D5 x3
# =========================================================================
q('GB_JD_047', 'JD_FAM15_UPDATE_APPROACH_CHOICE', 'D4',
  'A row must be shown as selected. Replacing the row\'s markup and adding a class to the existing '
  'row both produce the right appearance. Which has the fewest side effects?',
  'Adding the class, because replacing the markup throws away the handlers attached to that row',
  ['Replacing the markup, because it keeps the change in one place',
   'They are identical in effect',
   'Replacing the markup, because a class can be overridden by the stylesheet'],
  'Both look right, so the choice is decided by what else changes: adding the class, because '
  'replacing the markup throws away the handlers attached to that row. New elements start with '
  'nothing attached to them.',
  evidence='Replacing the row\'s markup and adding a class to the existing row both produce the '
           'right appearance')

q('GB_JD_048', 'JD_FAM15_UPDATE_APPROACH_CHOICE', 'D5',
  'One item in a list of two hundred has changed. Rebuilding the whole list and updating that one '
  'item both end with the right list on screen. What does rebuilding cost?',
  'The other items are discarded and remade, losing focus, scroll position and attached handlers',
  ['Nothing; the two are equivalent',
   'It stops working once the list is long enough',
   'It changes the order the items appear in'],
  'The screen ends up the same either way, and the difference is in what was destroyed on the way '
  'there: the other items are discarded and remade, losing focus, scroll position and attached '
  'handlers. Rebuilding is simpler to write, which is why it is chosen.',
  mode='TRADEOFF', hinge='Rebuilding the whole list and updating that one item')

q('GB_JD_049', 'JD_FAM15_UPDATE_APPROACH_CHOICE', 'D5',
  'A message needs part of it in bold. Setting the paragraph\'s text to a string containing bold '
  'tags shows the tags as literal characters on screen. Why?',
  'Setting text treats everything given as characters rather than as markup',
  ['A bold element is not allowed inside a paragraph',
   'The stylesheet has removed the bolding',
   'The text was set before the paragraph existed'],
  'The two ways of putting content into an element differ exactly here: setting text treats '
  'everything given as characters rather than as markup. Setting markup instead is what would '
  'produce a bold word.',
  mode='TRANSFER', hinge='shows the tags as literal characters on screen')

q('GB_JD_050', 'JD_FAM15_UPDATE_APPROACH_CHOICE', 'D5',
  'Something a user typed has to be shown back to them. Which way of putting it into the page '
  'should be preferred, and why?',
  'Setting text, because interpreting what a user typed as markup lets it bring behaviour with it',
  ['Setting markup, because it is the more flexible of the two',
   'Either; what appears on screen is the same',
   'Setting markup, because text cannot show punctuation'],
  'The safe default is setting text, because interpreting what a user typed as markup lets it '
  'bring behaviour with it. The two only look interchangeable while the input is well behaved.',
  mode='TRADEOFF', hinge='Something a user typed has to be shown back to them')
