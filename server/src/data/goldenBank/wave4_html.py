# -*- coding: utf-8 -*-
"""
Wave 4 — HTML, 50 Golden Bank questions, all newly authored.

MEANING RATHER THAN APPEARANCE IS THE THREAD THROUGH THIS SKILL. The blueprint says so in its very
first family: a heading chosen to make text large, a list chosen for its indentation and a quote
chosen to push text across are the confusions that semantics exists to correct. Several families
here therefore offer options that look identical on screen and differ in what they mean.

THE ACCESSIBILITY FAMILY IS BUILT ON THAT SAME POINT. Every option in it looks fine visually, which
is precisely why the question is answerable only by reasoning about structure — a label that is
not associated with its control, a heading level skipped, an image whose alternative text
describes its appearance rather than its purpose.
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
# HT_FAM01_ELEMENT_PURPOSE — D1 x4, D2 x1
# =========================================================================
q('GB_HT_001', 'HT_FAM01_ELEMENT_PURPOSE', 'D1',
  'A page has a title at the top of a section. Which element fits its meaning?',
  'A heading element',
  ['A paragraph with large text',
   'A list item, for the indentation',
   'A quote element, which stands out'],
  'A heading element says that the text titles what follows, which is what the content is. The '
  'other three would be chosen for how they look rather than for what they mean.')

q('GB_HT_002', 'HT_FAM01_ELEMENT_PURPOSE', 'D1',
  'A page shows three product names, one after another, with no ordering between them. Which '
  'element fits?',
  'An unordered list',
  ['Three paragraphs',
   'An ordered list, since they appear in an order on screen',
   'A table with one column'],
  'A group of related items with no meaningful order is exactly what an unordered list expresses. '
  'Appearing one after another on screen is not the same as being ordered.')

q('GB_HT_003', 'HT_FAM01_ELEMENT_PURPOSE', 'D1',
  'A page reproduces a sentence taken from another source. Which element fits?',
  'A quotation element',
  ['A paragraph in italics',
   'A list item, which indents it',
   'A heading, to set it apart'],
  'The content is a quotation, and one element says so. Italics and indentation are how quotations '
  'often look, which is a consequence rather than the meaning.')

q('GB_HT_004', 'HT_FAM01_ELEMENT_PURPOSE', 'D1',
  'A developer uses a heading element because it makes the text large. What is wrong with that?',
  'The element says the text is a heading, which will be untrue and will mislead anything reading '
  'the structure',
  ['Nothing; the text is the right size',
   'Headings should never be used',
   'The text will be the wrong size on some screens'],
  'Choosing an element for its appearance puts a false claim into the document. Size can be set '
  'directly without changing what the markup says the content is.')

q('GB_HT_005', 'HT_FAM01_ELEMENT_PURPOSE', 'D2',
  'Two developers produce pages that look identical. One used headings for its section titles and '
  'the other used styled paragraphs. What differs?',
  'What the document says its structure is, which anything other than a sighted reader depends on',
  ['Nothing; the pages are identical',
   'The file size',
   'How quickly each page loads'],
  'Appearance is the same and meaning is not. A reader navigating by structure, or a tool building '
  'an outline, sees sections in one page and undifferentiated text in the other.')

# =========================================================================
# HT_FAM02_TAG_STRUCTURE — D1 x3, D2 x1
# =========================================================================
q('GB_HT_006', 'HT_FAM02_TAG_STRUCTURE', 'D1',
  'Which fragment is written correctly?',
  '<p>Hello</p>',
  ['<p>Hello', '<p>Hello<p>', '<p>Hello</p></p>'],
  'An element that holds content opens and closes once around it. Repeating the opening tag opens '
  'a second element, and a second closing tag closes something that is not open.')

q('GB_HT_007', 'HT_FAM02_TAG_STRUCTURE', 'D1',
  'An image is being placed on a page. Which fragment is written correctly?',
  '<img src="cat.png" alt="A cat">',
  ['<img src="cat.png" alt="A cat"></img>',
   '<img>cat.png</img>',
   '<img src="cat.png" alt="A cat"</img>'],
  'An image element holds no content, so it takes no closing tag and its source is supplied as an '
  'attribute. Giving it content or a closing tag treats it like an element that wraps something.')

q('GB_HT_008', 'HT_FAM02_TAG_STRUCTURE', 'D1',
  'Which fragment closes its tags in the right order?',
  '<p><strong>text</strong></p>',
  ['<p><strong>text</p></strong>',
   '<strong><p>text</strong></p>',
   '<p><strong>text<p></strong>'],
  'Elements close in the reverse of the order they open, so the inner one closes first. Crossing '
  'them leaves each element half inside the other, which nothing can represent.')

q('GB_HT_009', 'HT_FAM02_TAG_STRUCTURE', 'D2',
  'A paragraph element is opened and never closed, and the rest of the page follows. What happens '
  'to that later content?',
  'It may be absorbed into the unclosed element, so it is treated as part of the paragraph',
  ['It is discarded',
   'The page refuses to render',
   'It renders exactly as though the tag had been closed'],
  'An element that is never closed continues, so what follows falls inside it. The page still '
  'renders, which is why the fault shows up as misplaced content rather than as an error.')

# =========================================================================
# HT_FAM03_ATTRIBUTE_RECOGNITION — D1 x3, D2 x1
# =========================================================================
q('GB_HT_010', 'HT_FAM03_ATTRIBUTE_RECOGNITION', 'D1',
  'In <a href="/help">Help</a>, which part is an attribute?',
  'href="/help"',
  ['a', 'Help', '</a>'],
  'The attribute is href="/help", a name-and-value pair inside the opening tag. The letter at '
  'the front is the element name and the word between the tags is the content.')

q('GB_HT_011', 'HT_FAM03_ATTRIBUTE_RECOGNITION', 'D1',
  'In <img src="logo.png" alt="Company logo">, what does the alt attribute supply?',
  'Text to use in place of the image',
  ['The file the image comes from',
   'The name of the element',
   'The width of the image'],
  'Each attribute supplies one thing, and this one supplies the alternative text. The file is '
  'supplied by a different attribute in the same tag.')

q('GB_HT_012', 'HT_FAM03_ATTRIBUTE_RECOGNITION', 'D1',
  'Where do attributes belong?',
  'In the opening tag',
  ['In the closing tag',
   'In either tag',
   'Between the opening and closing tags, with the content'],
  'Attributes configure the element and are written where it opens. A closing tag carries the '
  'element name and nothing else.')

q('GB_HT_013', 'HT_FAM03_ATTRIBUTE_RECOGNITION', 'D2',
  'A tag reads <a href=/help>Help</a>, with no quotation marks around the value. Is the value part '
  'of the attribute or content?',
  'Part of the attribute; it sits inside the opening tag whether or not it is quoted',
  ['Content, because it is not quoted',
   'Neither; the tag is invalid and is ignored',
   'Part of the element name'],
  'What decides is position rather than punctuation: anything inside the opening tag after the '
  'element name is an attribute. Quoting is good practice and its absence does not move the value '
  'out of the tag.')

# =========================================================================
# HT_FAM04_NESTING_VALIDITY — D2, D3
# =========================================================================
q('GB_HT_014', 'HT_FAM04_NESTING_VALIDITY', 'D2',
  'Which fragment nests correctly?',
  '<ul><li><strong>One</strong></li></ul>',
  ['<ul><strong><li>One</li></strong></ul>',
   '<ul><li>One</ul></li>',
   '<li><ul>One</ul></li>'],
  'A list contains list items and an item may contain anything inline. Placing an emphasis element '
  'directly inside the list, or crossing the closing tags, breaks the containment.')

q('GB_HT_015', 'HT_FAM04_NESTING_VALIDITY', 'D3',
  'A fragment reads <p>Some <strong>bold</p></strong> text. What is wrong, and what will happen?',
  'The two elements overlap rather than nest, and the browser will guess at a structure',
  ['Nothing; the tags are all present',
   'The strong element is missing a closing tag',
   'The paragraph is missing an opening tag'],
  'Every tag is present and they cross, which is what no tree can represent. Browsers recover by '
  'inventing a structure, and different ones may invent different structures.')

# =========================================================================
# HT_FAM05_SEMANTIC_CHOICE — D2, D3
# =========================================================================
q('GB_HT_016', 'HT_FAM05_SEMANTIC_CHOICE', 'D2',
  'Text is to be emphasised because it is genuinely important. Two elements render it in bold. '
  'Which fits?',
  'The one that means the text is important',
  ['The one that means the text should be bold',
   'Either; they render the same',
   'A generic container with bold styling'],
  'Both look the same and only one says why the text is different. That claim is what anything '
  'reading the structure rather than the pixels acts on.')

q('GB_HT_017', 'HT_FAM05_SEMANTIC_CHOICE', 'D3',
  'A page has a block of navigation links. A generic container and a navigation element both '
  'produce the same appearance. Which fits, and why does it matter?',
  'The navigation element, because it lets a reader jump to or skip the navigation',
  ['The generic container, because it is more flexible',
   'Either; the appearance is what users see',
   'The generic container, because it is shorter to type'],
  'A specific element exists for this content and carries information a generic one does not. '
  'Flexibility and brevity are real considerations and neither restores what the meaning would '
  'have supplied.')

# =========================================================================
# HT_FAM06_RENDERED_OUTPUT — D2, D3, D4
# =========================================================================
q('GB_HT_018', 'HT_FAM06_RENDERED_OUTPUT', 'D2',
  'A fragment reads <p>Hello     world</p>, with five spaces between the words. What appears on '
  'the page?',
  'Hello world, with a single space',
  ['Hello world, with five spaces',
   'Helloworld, with no space',
   'The text with the tags shown'],
  'Runs of whitespace collapse to one space when rendered. Tags are instructions rather than '
  'content and are not displayed.')

q('GB_HT_019', 'HT_FAM06_RENDERED_OUTPUT', 'D3',
  'A fragment has a paragraph whose text is written across three lines in the file, with no other '
  'markup. How does it appear?',
  'As one continuous line of text, wrapped to fit the width',
  ['As three separate lines, as written',
   'As three separate paragraphs',
   'With the line breaks shown as blank lines'],
  'A newline in the source is whitespace and collapses like any other. Breaking lines on the page '
  'requires markup that says so.')

q('GB_HT_020', 'HT_FAM06_RENDERED_OUTPUT', 'D4',
  'A developer formats their markup neatly across several lines and the rendered spacing between '
  'two words changes. The markup is valid and the elements are unchanged. What happened?',
  'A newline was introduced where the two words previously touched, and it renders as a space',
  ['The formatting changed the elements',
   'The browser reformatted the text',
   'Nothing changed; the difference is imagined'],
  'Collapsing whitespace turns a newline into one space, so a line break inserted between two '
  'words adds a space that was not there. Reformatting markup is usually safe and is not always '
  'so.',
  evidence='The markup is valid and the elements are unchanged')

# =========================================================================
# HT_FAM07_STRUCTURED_CONTENT — D2, D3, D4
# =========================================================================
q('GB_HT_021', 'HT_FAM07_STRUCTURED_CONTENT', 'D2',
  'A list fragment contains three list items and one line of text placed directly inside the list '
  'itself. How many list items does it have?',
  'Three',
  ['Four', 'One', 'Three, plus a fourth once the text is wrapped'],
  'Only content inside a list item counts as an item. The stray text is inside the list and inside '
  'no item, which is why it is not counted and is also not valid.')

q('GB_HT_022', 'HT_FAM07_STRUCTURED_CONTENT', 'D3',
  'A table has a header row of 3 cells and 4 further rows of 3 cells each. How many cells does it '
  'contain in total?',
  '15',
  ['12', '5', '3'],
  'Every row contributes its cells, header rows included, so five rows of three give fifteen. '
  'Omitting the header row is the commonest miscount.')

q('GB_HT_023', 'HT_FAM07_STRUCTURED_CONTENT', 'D4',
  'A table is meant to have 4 columns. One row contains 3 cells and the rest contain 4. The markup '
  'is otherwise valid and the page renders. What is the effect?',
  'That row is short by a cell, so its remaining cells may not line up with the columns above',
  ['The table refuses to render',
   'The missing cell is created automatically and left blank',
   'The whole table is reduced to three columns'],
  'A row supplies exactly the cells it contains, and nothing fills a gap. The table still renders, '
  'which is why the fault appears as misaligned data rather than as an error.',
  evidence='The markup is otherwise valid and the page renders')

# =========================================================================
# HT_FAM08_LINK_PATH_BEHAVIOUR — D2, D3, D4   (folder tree shown)
# =========================================================================
q('GB_HT_024', 'HT_FAM08_LINK_PATH_BEHAVIOUR', 'D2',
  'A site has /index.html and /about.html. A link in index.html reads href="about.html". Which '
  'file does it reach?',
  '/about.html',
  ['/index.html', 'A file called about.html inside a folder called about', 'Nothing; the path is '
   'incomplete'],
  'A path with no leading slash is resolved beside the page containing it, and both files sit at '
  'the top level. Nothing about it is incomplete.')

q('GB_HT_025', 'HT_FAM08_LINK_PATH_BEHAVIOUR', 'D3',
  'The folder tree is: index.html at the top level, and a guides folder containing setup.html. A '
  'link written inside setup.html begins with a slash: href="/index.html". What does the leading '
  'slash change?',
  'It resolves from the top of the site rather than from the folder the page is in',
  ['Nothing; a leading slash is optional',
   'It resolves from the folder the page is in, as usual',
   'It makes the link point outside the site'],
  'A leading slash starts the path at the root, so the same text means the same file wherever the '
  'page sits. Without it the link would be looked for inside the guides folder.')

q('GB_HT_026', 'HT_FAM08_LINK_PATH_BEHAVIOUR', 'D4',
  'A site has /guides/setup.html and /images/logo.png. A link in setup.html reads '
  'href="../images/logo.png" and works. The same link is copied into /index.html and breaks. '
  'Neither file was moved. Why?',
  'The parent step goes up one level from wherever the page is, and from the top level there is '
  'nowhere to go up to',
  ['The image was moved',
   'A leading slash is missing from both links',
   'index.html cannot reach the images folder'],
  'A relative path is measured from the page containing it, so the same text means different '
  'things in different places. From the top level the parent step overshoots the site entirely.',
  evidence='Neither file was moved')

# =========================================================================
# HT_FAM09_FORM_BEHAVIOUR — D2, D3, D4
# =========================================================================
q('GB_HT_027', 'HT_FAM09_FORM_BEHAVIOUR', 'D2',
  'A form contains a text input with no name attribute. Is its value submitted?',
  'No; a control without a name has nothing to submit its value under',
  ['Yes; the value is submitted under its label',
   'Yes; the value is submitted without a name',
   'No; the form refuses to submit at all'],
  'The name is what the value is sent as, so a control without one is silently omitted. The form '
  'submits normally, which is what makes the omission hard to spot.')

q('GB_HT_028', 'HT_FAM09_FORM_BEHAVIOUR', 'D3',
  'A form contains a disabled text input with a name and a value. Is its value submitted?',
  'No; a disabled control is excluded from the submission',
  ['Yes; it has a name and a value',
   'Yes; disabling only prevents editing',
   'No; and the form refuses to submit'],
  'Disabling removes the control from the submission as well as from interaction. That is '
  'different from making it read-only, which prevents editing and still submits.')

q('GB_HT_029', 'HT_FAM09_FORM_BEHAVIOUR', 'D4',
  'A form has a checkbox that the user leaves unchecked. The server receives no value for it and '
  'treats the field as missing rather than false. The checkbox has a name and the form submits '
  'correctly. What is happening?',
  'An unchecked box submits nothing at all, so absence is the only signal that it was unchecked',
  ['The checkbox is disabled',
   'The checkbox has no name',
   'The form is submitting before the box is read'],
  'A checkbox submits its value only when checked, so unchecked and absent are indistinguishable '
  'on the server. The stem rules out the name and the submission, which leaves the behaviour '
  'itself.',
  evidence='The checkbox has a name and the form submits correctly')

# =========================================================================
# HT_FAM10_ALT_TEXT_BEHAVIOUR — D2, D3, D4
# =========================================================================
q('GB_HT_030', 'HT_FAM10_ALT_TEXT_BEHAVIOUR', 'D2',
  'An image is a company logo appearing in the page header. What alternative text fits?',
  'The company name',
  ['logo.png',
   'A rectangular blue image with white lettering',
   'Image'],
  'Alternative text conveys what the image conveys, which here is the company\'s identity. A '
  'filename and a description of the appearance both leave the reader without the information the '
  'image carried.')

q('GB_HT_031', 'HT_FAM10_ALT_TEXT_BEHAVIOUR', 'D3',
  'An image is a chart showing sales rising over four quarters. What alternative text fits?',
  'A statement of what the chart shows, such as that sales rose across the four quarters',
  ['chart.png',
   'A line chart with four points',
   'Chart'],
  'The image carries a finding, so the alternative text has to carry that finding. Describing the '
  'shape of the chart gives the reader the picture without the point.')

q('GB_HT_032', 'HT_FAM10_ALT_TEXT_BEHAVIOUR', 'D4',
  'An image is a decorative flourish beside a heading and conveys nothing a reader needs. Every '
  'option below is a well-formed value. What alternative text fits?',
  'Empty text, so that the image is passed over',
  ['A description of the flourish',
   'The word "decoration"',
   'The filename'],
  'An image carrying no information should not interrupt a reader, and empty alternative text is '
  'how that is expressed. Describing it, or announcing that it is decorative, makes the reader '
  'stop for something that does not matter.',
  evidence='Every option below is a well-formed value')

# =========================================================================
# HT_FAM11_TREE_READING — D3, D4
# =========================================================================
q('GB_HT_033', 'HT_FAM11_TREE_READING', 'D3',
  'A fragment reads: <div><p>One <em>two</em></p><p>Three</p></div>. What is the parent of the em '
  'element?',
  'The first paragraph',
  ['The div', 'The second paragraph', 'The text "One"'],
  'A parent is the element that directly contains another, and the em sits inside The first '
  'paragraph. The div is its grandparent rather than its parent.')

q('GB_HT_034', 'HT_FAM11_TREE_READING', 'D4',
  'In the same fragment, someone says the em element and the second paragraph are siblings. Both '
  'are contained within the div at some depth. Are they?',
  'No; siblings share the same direct parent, and these have different ones',
  ['Yes; both are inside the div',
   'Yes; they are at the same visual level',
   'No; the em element has no siblings at all'],
  'Being inside the same ancestor is not the same as sharing a parent, which is what makes the '
  'claim tempting. The em element does have a sibling — the text beside it in the first '
  'paragraph.',
  evidence='Both are contained within the div at some depth')

# =========================================================================
# HT_FAM12_MARKUP_ERROR_DIAGNOSIS — D3, D4
# =========================================================================
q('GB_HT_035', 'HT_FAM12_MARKUP_ERROR_DIAGNOSIS', 'D3',
  'A page shows its whole second half in bold. The markup contains an opening emphasis tag '
  'halfway down. Which line is at fault?',
  'The line with the opening emphasis tag, which is never closed',
  ['The first line of the bold text',
   'The last line of the page',
   'The stylesheet, which must set bold'],
  'The symptom starts where the element opens and continues because nothing closes it. The lines '
  'that appear bold are affected rather than responsible.')

q('GB_HT_036', 'HT_FAM12_MARKUP_ERROR_DIAGNOSIS', 'D4',
  'A page shows its navigation links inside the first article rather than above it. The '
  'stylesheet is unchanged and correct, and the navigation markup itself is well formed. Which '
  'kind of fault is it?',
  'A structural one: something before the navigation was left unclosed, so it was absorbed',
  ['A styling fault in the navigation',
   'A fault in the navigation markup',
   'A fault in the article markup, which is too wide'],
  'Content appearing in the wrong place with correct styling and correct local markup points at an '
  'unclosed element earlier in the document. The cause sits before the symptom, which is what '
  'makes it awkward to find.',
  evidence='The stylesheet is unchanged and correct, and the navigation markup itself is well '
           'formed')

# =========================================================================
# HT_FAM13_ACCESSIBILITY_REASONING — D3, D4, D5 x3   (every option looks fine on screen)
# =========================================================================
q('GB_HT_037', 'HT_FAM13_ACCESSIBILITY_REASONING', 'D3',
  'A form shows the word "Email" beside a text box, written as plain text with no association '
  'between them. What can a screen reader user not do?',
  'Know what the box is for when they reach it',
  ['See the text',
   'Type into the box',
   'Submit the form'],
  'The text is visible and unconnected, so a reader moving to the control is told nothing about '
  'it. Everything else on the page continues to work, which is why the fault is invisible on '
  'screen.')

q('GB_HT_038', 'HT_FAM13_ACCESSIBILITY_REASONING', 'D4',
  'A page uses a top-level heading, then jumps to a third-level heading for its next section. The '
  'page looks correct and the headings are real heading elements. What is lost?',
  'The outline implies a missing level, so a reader navigating by structure cannot tell how the '
  'sections relate',
  ['Nothing; the appearance is correct',
   'The headings will not be announced at all',
   'The second-level heading is created automatically'],
  'Heading levels describe nesting, and skipping one describes a nesting that does not exist. '
  'Everything is announced and the relationships between the sections are wrong.',
  evidence='The page looks correct and the headings are real heading elements')

q('GB_HT_039', 'HT_FAM13_ACCESSIBILITY_REASONING', 'D5',
  'A developer fixes an accessibility complaint by increasing the font size and the contrast. The '
  'complaint was that a form control had no label. Has the complaint been addressed?',
  'No; the fix is visual and the fault is structural, so a reader who cannot see it is no better '
  'off',
  ['Yes; the page is now easier to read',
   'Yes, provided the contrast is sufficient',
   'No; the font size should have been left alone'],
  'The change is a genuine improvement for some readers and touches nothing the complaint was '
  'about. Matching the kind of fix to the kind of fault is what makes accessibility work rather '
  'than gesture.',
  mode='TRANSFER', hinge='The complaint was that a form control had no label')

q('GB_HT_040', 'HT_FAM13_ACCESSIBILITY_REASONING', 'D5',
  'Two pages look identical. One uses heading elements and lists; the other uses styled generic '
  'containers throughout. What can a reader do on one and not the other?',
  'Navigate by structure — jump between sections, or move through a list — which only the marked-up '
  'page supports',
  ['Read the text, which only the first page allows',
   'See the page, which only the first page allows',
   'Nothing differs; both pages carry the same information'],
  'Both pages present the same words and only one says how they are organised. Structure is what '
  'navigation is built on, so its absence removes a way of moving through the page rather than '
  'the content.',
  mode='TRANSFER', hinge='the other uses styled generic containers throughout')

q('GB_HT_041', 'HT_FAM13_ACCESSIBILITY_REASONING', 'D5',
  'Adding correct structure to a page costs a little time and changes nothing visible. Why is it '
  'worth doing?',
  'Because the structure is what every non-visual route through the page depends on, and nothing '
  'else supplies it',
  ['Because it makes the page load faster',
   'Because it makes the page look better',
   'It is not worth doing if nothing changes visually'],
  'Nothing changing visually is exactly the point: the benefit accrues to readers who are not '
  'using the visual presentation at all. Judging the change by what it does to the picture '
  'measures the wrong thing.',
  mode='TRADEOFF', hinge='costs a little time and changes nothing visible')

# =========================================================================
# HT_FAM14_UNCLOSED_TAG_EFFECT — D4, D5 x4
# =========================================================================
q('GB_HT_042', 'HT_FAM14_UNCLOSED_TAG_EFFECT', 'D4',
  'A page is correct until its third section, after which everything is indented and misplaced. '
  'The third section\'s own markup is well formed. Where is the fault?',
  'In an element opened before the third section and never closed',
  ['In the third section, where the symptom begins',
   'In the last section, which is most affected',
   'In the stylesheet, which indents the content'],
  'An unclosed element absorbs everything after it, so the symptom starts where the effect begins '
  'and the cause sits earlier. The section where trouble first appears is the one being affected.',
  evidence='The third section\'s own markup is well formed')

q('GB_HT_043', 'HT_FAM14_UNCLOSED_TAG_EFFECT', 'D5',
  'Why is an unclosed tag harder to locate than a misspelled element name?',
  'Its effect appears at a distance from its cause, and everything between them looks correct',
  ['Because browsers hide unclosed tags',
   'Because a misspelled name is always reported as an error',
   'It is not harder; both are equally visible'],
  'The symptom of an unclosed tag is displaced from the line responsible, so reading around the '
  'symptom finds nothing wrong. A misspelling affects the element it appears on.',
  mode='TRANSFER', hinge='harder to locate than a misspelled element name')

q('GB_HT_044', 'HT_FAM14_UNCLOSED_TAG_EFFECT', 'D5',
  'A page has one unclosed element near the top and renders as one enormous nested block. How many '
  'faults should be looked for?',
  'One; a single unclosed element can misplace everything after it',
  ['One per misplaced section',
   'At least two, since one tag cannot affect so much',
   'None; the browser recovers automatically'],
  'The scale of a symptom says nothing about the number of causes, and containment cascades '
  'through everything that follows. Browsers do recover, and the structure they invent is what '
  'produces the symptom.',
  mode='TRANSFER', hinge='renders as one enormous nested block')

q('GB_HT_045', 'HT_FAM14_UNCLOSED_TAG_EFFECT', 'D5',
  'A developer proposes fixing misplaced content by adding closing tags at the end of the '
  'document. What is wrong with that?',
  'It closes the elements in the wrong place, so the content is still inside them',
  ['Nothing; the tags are now balanced',
   'Closing tags may not appear at the end of a document',
   'It would make the page refuse to render'],
  'Balance is not the requirement; the element has to close where its content ends. Closing '
  'everything at the bottom produces a well-formed document with exactly the wrong structure.',
  mode='TRANSFER', hinge='adding closing tags at the end of the document')

q('GB_HT_046', 'HT_FAM14_UNCLOSED_TAG_EFFECT', 'D5',
  'Browsers recover from unclosed tags rather than refusing to render. What does that buy, and what '
  'does it cost?',
  'It keeps imperfect pages usable, and it lets a structural fault reach users without anything '
  'reporting it',
  ['It buys nothing; strictness would be better',
   'It costs nothing; recovery is always correct',
   'It buys speed, since no checking is needed'],
  'Recovery is why a small mistake does not take a page down, and it is also why the mistake is '
  'never announced. Different browsers may recover differently, so the same page can render '
  'differently for different people.',
  mode='TRADEOFF', hinge='Browsers recover from unclosed tags rather than refusing to render')

# =========================================================================
# HT_FAM15_MARKUP_EQUIVALENCE — D4, D5 x3
# =========================================================================
q('GB_HT_047', 'HT_FAM15_MARKUP_EQUIVALENCE', 'D4',
  'Two fragments render identically: one uses a heading element, the other a paragraph styled to '
  'match. Both look the same in every browser tested. Are they equivalent?',
  'No; they look alike and say different things about what the content is',
  ['Yes; identical rendering is what equivalence means',
   'No; they will render differently on some browsers',
   'Yes, provided the styling is applied everywhere'],
  'Equivalence in markup covers structure and meaning as well as appearance. Identical rendering '
  'is what makes the difference invisible rather than absent.',
  evidence='Both look the same in every browser tested')

q('GB_HT_048', 'HT_FAM15_MARKUP_EQUIVALENCE', 'D5',
  'Two fragments differ only in how their whitespace is laid out across lines, with no whitespace '
  'inserted between words. Are they equivalent?',
  'Yes; whitespace between tags collapses and carries no meaning',
  ['No; the layout of the source affects the page',
   'No; different line lengths render differently',
   'Yes, but only if both are on one line'],
  'Formatting the source is one of the few changes that genuinely preserves both structure and '
  'appearance. The exception is whitespace between words, which the stem excludes.',
  mode='EDGE', hinge='differ only in how their whitespace is laid out across lines')

q('GB_HT_049', 'HT_FAM15_MARKUP_EQUIVALENCE', 'D5',
  'Two fragments produce the same page: one wraps its content in three nested containers and one '
  'in a single container. Are they equivalent?',
  'In appearance and in meaning yes; they differ in the tree, which styling and scripts may depend '
  'on',
  ['Yes, entirely',
   'No; the extra containers change the meaning',
   'No; extra containers always change the appearance'],
  'Containers carry no meaning of their own, so the document says the same thing either way. The '
  'shape of the tree is still real, and anything selecting by relationship can tell the two '
  'apart.',
  mode='TRANSFER', hinge='one wraps its content in three nested containers')

q('GB_HT_050', 'HT_FAM15_MARKUP_EQUIVALENCE', 'D5',
  'What does it take to say two fragments are truly equivalent?',
  'That they agree in structure and meaning as well as in appearance',
  ['That they render identically',
   'That they contain the same text',
   'That they use the same number of elements'],
  'Appearance is one of three things a fragment carries, and the other two are what markup exists '
  'to express. Two fragments can share their text and their picture while describing entirely '
  'different documents.',
  mode='TRANSFER', hinge='What does it take to say two fragments are truly equivalent')
