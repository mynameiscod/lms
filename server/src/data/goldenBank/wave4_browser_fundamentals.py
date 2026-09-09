# -*- coding: utf-8 -*-
"""
Wave 4 — BROWSER_FUNDAMENTALS, 50 Golden Bank questions.

1 comes from the existing bank, remapped in from HOW_COMPUTERS_WORK, and 49 are new.

THIS SKILL AND HTTP SHARE THREE SUBJECTS AND MEASURE THEM FROM OPPOSITE SIDES. Caching, trust and
identity appear in both blueprints; here the question is what the browser does and what a person
sees, and there it is what the protocol carries. The cross-skill similarity check over the whole
bank is what confirms the two did not collapse into each other.

THE MOST USEFUL FAMILY IN PRACTICE IS THE STALE-CONTENT ONE. Three causes produce the same
symptom for a first-year every week — a cached copy, a file that was never saved, and the wrong
file edited — and the blueprint requires the evidence in the stem to separate them rather than
leaving it to guesswork.
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
# BR_FAM01_BROWSER_ROLE — D1 x4, D2 x1
# =========================================================================
q('GB_BR_001', 'BR_FAM01_BROWSER_ROLE', 'D1',
  'Which of these does a browser do?',
  'Requests files and turns them into what appears on screen',
  ['Stores every page on the web for offline use',
   'Runs the server that holds the pages',
   'Provides the connection between machines'],
  'A browser asks for files and renders them. It holds only what it has recently fetched, the '
  'server runs elsewhere, and the network is what carries the request.')

q('GB_BR_002', 'BR_FAM01_BROWSER_ROLE', 'D1',
  'Is a browser the same thing as the internet?',
  'No; a browser is one program for using the web, which is carried over the internet',
  ['Yes; the browser is how the internet is delivered',
   'Yes; without a browser there is no internet',
   'No; a browser is the internet plus the operating system'],
  'The internet connects machines and carries many services; a browser is a program that uses one '
  'of them. Email and file transfer travel over the same internet without a browser.')

q('GB_BR_003', 'BR_FAM01_BROWSER_ROLE', 'D1',
  'A page appears on screen. Which part did the browser do?',
  'Fetched the files and drew the result',
  ['Wrote the page\'s content',
   'Decided what the page should say',
   'Stored the page permanently on the machine'],
  'The browser obtains and renders; the content was authored elsewhere and lives on a server. '
  'Anything kept locally is a temporary copy rather than the page itself.')

q('GB_BR_004', 'BR_FAM01_BROWSER_ROLE', 'D1',
  'Two different browsers open the same address and show slightly different results. How is that '
  'possible?',
  'Each browser renders the same files, and they may render some things differently',
  ['The server sent different pages to each',
   'One of the two browsers is faulty',
   'The address means something different in each browser'],
  'Rendering is the browser\'s own work, so two of them can turn identical files into slightly '
  'different pictures. Nothing about the address or the server changes between them.')

q('GB_BR_005', 'BR_FAM01_BROWSER_ROLE', 'D2',
  'A browser is closed and reopened, and a page that was open loads again. Where did the page come '
  'from?',
  'From the server, or from a stored copy the browser kept — not from the browser\'s memory of it',
  ['From the browser\'s memory, which survives being closed',
   'From the operating system, which held the page',
   'From the page itself, which reloads automatically'],
  'Closing a browser ends what it was holding in memory, so the page has to be obtained again. '
  'Whether that means contacting the server depends on what was cached.')

# =========================================================================
# BR_FAM02_URL_PARTS — D1 x3, D2 x1 (legacy)
# =========================================================================
q('GB_BR_006', 'BR_FAM02_URL_PARTS', 'D1',
  'In the address https://shop.example.com/orders/42, which part is the host?',
  'shop.example.com',
  ['https', '/orders/42', 'https://shop.example.com'],
  'The host names the machine to contact and stops before the first slash of the path. The scheme '
  'at the front says how to talk to it and is not part of its name.')

q('GB_BR_007', 'BR_FAM02_URL_PARTS', 'D1',
  'In the same address, which part is the path?',
  '/orders/42',
  ['shop.example.com', 'https', 'shop.example.com/orders'],
  'The path is what follows the host and names what is wanted from it. Including part of the host '
  'confuses which machine to ask with what to ask it for.')

q('GB_BR_008', 'BR_FAM02_URL_PARTS', 'D1',
  'In the address https://docs.example.com/guide, what is docs?',
  'Part of the host name',
  ['The first segment of the path',
   'The name of the file being requested',
   'A parameter passed to the server'],
  'Anything before the first single slash after the scheme belongs to the host, so docs is part of '
  'the machine\'s name. Reading it as a path segment would send the request to a different '
  'machine entirely.')

q('GB_BR_009', 'BR_FAM02_URL_PARTS', 'D2',
  'What is a web address, in essence?',
  'An address identifying a resource and saying where to ask for it',
  ['A type of memory used by the browser',
   'A loop that fetches a page repeatedly',
   'A part of the processor'],
  'An address names what is wanted and the machine that has it, which is what lets a browser make '
  'a request at all.',
  provenance='LEGACY_REMAP', source='dec6fa')

# =========================================================================
# BR_FAM03_DEVTOOLS_PURPOSE — D1 x3, D2 x1
# =========================================================================
q('GB_BR_010', 'BR_FAM03_DEVTOOLS_PURPOSE', 'D1',
  'Which question can a browser\'s developer tools answer?',
  'Which files this page requested and whether each one arrived',
  ['What code the server runs to produce the page',
   'What other users are seeing right now',
   'What the page will look like tomorrow'],
  'The tools show what this browser did and what it currently holds. Nothing about the server\'s '
  'own code is visible, because none of it is sent.')

q('GB_BR_011', 'BR_FAM03_DEVTOOLS_PURPOSE', 'D1',
  'A change is made to a page using the browser\'s developer tools, and the page is reloaded. What '
  'happens to the change?',
  'It is gone; the tools change the loaded page and not the file',
  ['It is saved to the file and persists',
   'It is sent to the server and applied for everyone',
   'It persists until the browser is closed'],
  'The tools operate on what the browser is currently holding, which is rebuilt from the file on '
  'every load. Expecting an edit there to persist is the commonest first surprise.')

q('GB_BR_012', 'BR_FAM03_DEVTOOLS_PURPOSE', 'D1',
  'Are developer tools a separate program from the browser?',
  'No; they are part of the browser and show what it is doing',
  ['Yes; they must be installed separately',
   'Yes; they run on the server',
   'No; they are part of the operating system'],
  'The tools are built into the browser, which is why they can see the requests it made and the '
  'page it built. A separate program would have no access to either.')

q('GB_BR_013', 'BR_FAM03_DEVTOOLS_PURPOSE', 'D2',
  'A page looks wrong and the developer tools show the page structure containing exactly what was '
  'expected. What does that suggest?',
  'The structure is right, so the problem lies in how it is being presented or in the data shown',
  ['The tools are showing a cached version',
   'The server sent the wrong page',
   'Nothing; the tools cannot show the structure'],
  'The tools show the live state, so a correct structure narrows the problem to presentation or '
  'content rather than to what was built. That is a real elimination rather than a dead end.')

# =========================================================================
# BR_FAM04_LOAD_SEQUENCE — D2, D3
# =========================================================================
q('GB_BR_014', 'BR_FAM04_LOAD_SEQUENCE', 'D2',
  'Put the stages of loading a page in order.',
  'The document arrives, the browser reads it, and it requests the files the document names',
  ['All the files arrive together, and the browser reads them',
   'The images arrive, then the document that names them',
   'The browser requests every file it might need, then reads the document'],
  'The browser cannot know which images and styles a page uses until it has read the document '
  'naming them. That is why the document arrives first and everything else follows.')

q('GB_BR_015', 'BR_FAM04_LOAD_SEQUENCE', 'D3',
  'A page appears with its text visible and its images still arriving. Is that a fault?',
  'No; the browser renders what it has and fills in the rest as it arrives',
  ['Yes; a page should appear only once everything has arrived',
   'Yes; the images should have arrived before the text',
   'No; but only because the images are optional'],
  'Rendering progressively is what makes a page usable before it is complete. Waiting for '
  'everything would leave a blank screen for as long as the slowest file took.')

# =========================================================================
# BR_FAM05_SOURCE_VS_RENDERED — D2, D3
# =========================================================================
q('GB_BR_016', 'BR_FAM05_SOURCE_VS_RENDERED', 'D2',
  'A page shows a message that appears nowhere in the file the server sent. How is that possible?',
  'Something running in the page added it after loading',
  ['The server sent a different file from the one on disk',
   'The browser invented the message',
   'The file must contain it and the search was wrong'],
  'What arrives is a starting point, and code running in the page can change it afterwards. The '
  'live page and the file it came from are two different things.')

q('GB_BR_017', 'BR_FAM05_SOURCE_VS_RENDERED', 'D3',
  'A developer changes the live page using the tools and the file on the server is unchanged. Which '
  'view shows the change, and which does not?',
  'The live view shows it; viewing the file the server sent does not',
  ['Both show it, since they describe the same page',
   'Neither shows it, since the change was temporary',
   'The file shows it; the live view reverts'],
  'One view is the document as delivered and the other is what the browser currently holds. They '
  'agree until something modifies the page, and after that they are separate records.')

# =========================================================================
# BR_FAM06_CACHE_EFFECT — D2, D3, D4
# =========================================================================
q('GB_BR_018', 'BR_FAM06_CACHE_EFFECT', 'D2',
  'A styling file is changed on the server. A returning visitor sees the old styling. Why?',
  'The browser reused a stored copy of the file rather than fetching it again',
  ['The server did not save the change',
   'The visitor is looking at a different site',
   'The browser cannot display new styling until it restarts'],
  'A stored copy is used in place of a request, so the change on the server is never seen. The '
  'server has the new file and nobody asked it for one.')

q('GB_BR_019', 'BR_FAM06_CACHE_EFFECT', 'D3',
  'A page updates correctly but its styling does not. Both were changed on the server. What does '
  'that suggest about caching?',
  'It applies to individual files, so one may be reused while another is fetched afresh',
  ['Caching applies to whole pages, so the whole page must be stale',
   'The styling file was not changed after all',
   'Caching cannot affect styling files'],
  'Each file is stored and reused on its own terms, which is why a page can be part fresh and '
  'part stale. Treating the page as a single unit cannot explain the mixture.')

q('GB_BR_020', 'BR_FAM06_CACHE_EFFECT', 'D4',
  'Some visitors see a change and others do not, and the file on the server is definitely the new '
  'one. Everyone is visiting the same address. What explains the split?',
  'Those who have visited before are reusing a stored copy; new visitors have nothing stored',
  ['The server is sending different files to different visitors',
   'The change was applied to only some of the servers',
   'The visitors who see the change are using a different address'],
  'A split between returning and new visitors is exactly what a stored copy produces, since only '
  'returning visitors have one. The stem rules out the address and the file as differences.',
  evidence='Everyone is visiting the same address')

# =========================================================================
# BR_FAM07_COOKIE_BEHAVIOUR — D2, D3, D4
# =========================================================================
q('GB_BR_021', 'BR_FAM07_COOKIE_BEHAVIOUR', 'D2',
  'A site stores a small piece of data in the browser. What happens to it on the next request to '
  'that site?',
  'It is sent along with the request',
  ['It stays in the browser and is never sent',
   'It is sent to every site the browser visits',
   'It is deleted when the page closes'],
  'Data stored this way travels with requests to the site that set it, which is what lets the '
  'server recognise a returning visitor. Sending it everywhere would leak it to every site.')

q('GB_BR_022', 'BR_FAM07_COOKIE_BEHAVIOUR', 'D3',
  'One site stores a value in the browser. Can an unrelated site read it?',
  'No; stored data belongs to the site that set it',
  ['Yes; anything in the browser is available to any page',
   'Yes, but only if both sites are open at once',
   'No; unless the two sites use the same browser'],
  'Storage is separated by site, so one site cannot read another\'s values. Sharing a browser is '
  'exactly the situation the separation exists for.')

q('GB_BR_023', 'BR_FAM07_COOKIE_BEHAVIOUR', 'D4',
  'A user clears their browser data and finds they must log in again everywhere. Nothing about '
  'their accounts changed and the sites are working normally. Why?',
  'The values proving they were logged in were stored in the browser and have been removed',
  ['The sites deleted their accounts',
   'The accounts were stored in the browser and are gone',
   'Clearing data changes the browser\'s identity'],
  'Being logged in is carried by something stored locally and sent with each request, so removing '
  'it removes the evidence. The accounts themselves live on the servers and are untouched.',
  evidence='Nothing about their accounts changed and the sites are working normally')

# =========================================================================
# BR_FAM08_ORIGIN_RESTRICTION — D2, D3, D4
# =========================================================================
q('GB_BR_024', 'BR_FAM08_ORIGIN_RESTRICTION', 'D2',
  'A page on one site displays an image hosted on another. Is that permitted?',
  'Yes; displaying a resource from another site is ordinary',
  ['No; a page may only use files from its own site',
   'Yes, but only if the two sites agree in advance',
   'No; unless the image is copied first'],
  'Pages routinely load images, styles and fonts from elsewhere. What is restricted is reading '
  'the contents of a response from another site, which is a different thing.')

q('GB_BR_025', 'BR_FAM08_ORIGIN_RESTRICTION', 'D3',
  'A page on one site makes a request to another site and cannot read the response. Was the '
  'request sent?',
  'Usually yes; the browser withheld the response rather than preventing the request',
  ['No; the browser blocked the request before it left',
   'No; the other server refused it',
   'Yes, and the response was read but discarded by the page'],
  'The restriction is on what the page may see, applied by the browser after the response arrives. '
  'That is why a request can have real effects on the other server while the page learns nothing.')

q('GB_BR_026', 'BR_FAM08_ORIGIN_RESTRICTION', 'D4',
  'A developer says another site is blocking their requests. The other server\'s logs show the '
  'requests arriving and being answered normally. Who is doing the blocking?',
  'The browser, which is withholding the response from the page',
  ['The other server, which must be refusing them',
   'The network, which is dropping the responses',
   'Nobody; the requests must not be arriving'],
  'The other server answering rules it out as the blocker, and the requests arriving rules out the '
  'network. What remains is the browser applying its own restriction on what the page may read.',
  evidence='The other server\'s logs show the requests arriving and being answered normally')

# =========================================================================
# BR_FAM09_STORAGE_SCOPE — D2, D3, D4
# =========================================================================
q('GB_BR_027', 'BR_FAM09_STORAGE_SCOPE', 'D2',
  'A site stores a preference in the browser. The user opens the same site in a different browser '
  'on the same machine. Is the preference there?',
  'No; storage belongs to the browser that set it',
  ['Yes; it is stored on the machine',
   'Yes; it follows the user',
   'Only if both browsers are open at once'],
  'Each browser keeps its own storage, so the same machine can hold several independent copies. '
  'Following the user would require an account rather than local storage.')

q('GB_BR_028', 'BR_FAM09_STORAGE_SCOPE', 'D3',
  'The same user opens the site on their phone. Is the preference stored on their laptop available '
  'there?',
  'No; the two devices have separate storage and nothing synchronises it automatically',
  ['Yes; preferences follow the user across devices',
   'Yes, if both devices use the same browser brand',
   'Only after the site is opened on both'],
  'Storage is local to a browser on a device, so nothing crosses between them by itself. Anything '
  'that does follow a user has been sent to a server and associated with an account.')

q('GB_BR_029', 'BR_FAM09_STORAGE_SCOPE', 'D4',
  'A site keeps a user\'s settings and they survive closing the browser but vanish when the user '
  'switches machines. The user is signed in to the site on both machines. What does that tell you '
  'about where the settings are held?',
  'In the browser rather than with the account, since signing in does not bring them across',
  ['On the server, associated with the account',
   'In the operating system, which differs between machines',
   'Nowhere; they are recreated each time'],
  'Surviving a restart rules out memory, and not following the signed-in account rules out the '
  'server. Local storage is exactly what persists on one machine and nowhere else.',
  evidence='The user is signed in to the site on both machines')

# =========================================================================
# BR_FAM10_REQUEST_INSPECTION — D2, D3, D4   (the list decides the answer)
# =========================================================================
q('GB_BR_030', 'BR_FAM10_REQUEST_INSPECTION', 'D2',
  'A request list shows: page.html 200, style.css 404, logo.png 200. Which file failed?',
  'style.css',
  ['page.html', 'logo.png', 'None of them'],
  'A status of 404 means the file was not found, and the other two succeeded. The page will '
  'render with its content and without its styling.')

q('GB_BR_031', 'BR_FAM10_REQUEST_INSPECTION', 'D3',
  'A request list shows: page.html 200 from the server, style.css 200 from cache, app.js 200 from '
  'the server. Which file did not reach the server on this load?',
  'style.css',
  ['page.html', 'app.js', 'All three reached the server'],
  'A response served from cache never left the browser, so the server saw two requests rather '
  'than three. Reading a cached response as a fresh one is what hides a stale file.')

q('GB_BR_032', 'BR_FAM10_REQUEST_INSPECTION', 'D4',
  'A page renders unstyled. The request list shows page.html 200, style.css 404, and no other '
  'failures. The styling file exists on the server under a slightly different name. What is the '
  'cause?',
  'The page is asking for a name that does not exist, so the address in the page is wrong',
  ['The styling file is corrupt',
   'The browser cached a failed response',
   'The server is refusing to serve styling files'],
  'A 404 means the server was reached and had nothing at that name, and the stem confirms the file '
  'exists under another. That places the fault in what the page asked for rather than in the '
  'server or the file.',
  evidence='The styling file exists on the server under a slightly different name')

# =========================================================================
# BR_FAM11_STALE_CONTENT_DIAGNOSIS — D3, D4
# =========================================================================
q('GB_BR_033', 'BR_FAM11_STALE_CONTENT_DIAGNOSIS', 'D3',
  'A developer edits a file, reloads, and sees no change. The request list shows the file served '
  'from cache. What is the cause?',
  'A stored copy is being reused, so the edited file was never fetched',
  ['The edit was never saved',
   'The wrong file was edited',
   'The change is present but has no visible effect'],
  'The evidence names the cause directly: the browser did not ask for the file. The other '
  'explanations are real and would not show a cached response.')

q('GB_BR_034', 'BR_FAM11_STALE_CONTENT_DIAGNOSIS', 'D4',
  'A developer edits a file, reloads, and sees no change. The request list shows the file fetched '
  'fresh from the server with a 200 status. What are the remaining explanations?',
  'The edit was not saved, or the file being served is not the one edited',
  ['A cached copy is being used',
   'The server is down',
   'The browser is displaying an old page from memory'],
  'A fresh fetch rules caching out, so the file the server sent did not contain the change. Either '
  'it was never written to disk or the server is serving a different copy — which is why "did you '
  'save it" and "which file is being served" are both worth asking.',
  evidence='The request list shows the file fetched fresh from the server with a 200 status')

# =========================================================================
# BR_FAM12_CLIENT_TRUST — D3, D4
# =========================================================================
q('GB_BR_035', 'BR_FAM12_CLIENT_TRUST', 'D3',
  'A form checks in the browser that an age is at least 18 before submitting. Is that check enough '
  'on its own?',
  'No; the check runs on the user\'s machine and can be bypassed',
  ['Yes; the form cannot be submitted otherwise',
   'Yes, provided the check is written correctly',
   'No; but only if the user knows how to use developer tools'],
  'Anything running in the browser is under the user\'s control, so the check improves the '
  'experience and enforces nothing. Whether a particular user knows how to bypass it does not '
  'change what the check guarantees.')

q('GB_BR_036', 'BR_FAM12_CLIENT_TRUST', 'D4',
  'A button that performs an administrative action is hidden from ordinary users by the page. The '
  'hiding works correctly and no ordinary user sees the button. Is the action protected?',
  'No; hiding a control does not prevent the request it would have made',
  ['Yes; the users cannot see it',
   'Yes, provided the hiding cannot be undone',
   'No; the button should be removed rather than hidden'],
  'The request the button would send can be made without the button, so the protection has to be '
  'on the server. Removing the button entirely changes nothing about that, which is why it is not '
  'the fix.',
  evidence='The hiding works correctly and no ordinary user sees the button')

# =========================================================================
# BR_FAM13_FAILED_REQUEST_DIAGNOSIS — D3, D4, D5 x3
# =========================================================================
q('GB_BR_037', 'BR_FAM13_FAILED_REQUEST_DIAGNOSIS', 'D3',
  'A page displays its text correctly with no styling at all. What is the likely cause?',
  'The styling file did not arrive',
  ['The document did not arrive',
   'The server is down',
   'The images failed to load'],
  'Text appearing at all proves the document arrived and the server answered. A missing styling '
  'file removes the presentation and leaves the content, which is exactly the symptom.')

q('GB_BR_038', 'BR_FAM13_FAILED_REQUEST_DIAGNOSIS', 'D4',
  'A page shows a broken image and everything else is correct. The request for that image returned '
  'a 404 and every other request succeeded. What follows?',
  'The image is not at the address the page asked for',
  ['The whole page failed to load',
   'The image file is corrupt',
   'The image was cached in a broken state'],
  'A single 404 among successes localises the fault to one file and to its address. A corrupt file '
  'would have been found and returned with a success status.',
  evidence='The request for that image returned a 404 and every other request succeeded')

q('GB_BR_039', 'BR_FAM13_FAILED_REQUEST_DIAGNOSIS', 'D5',
  'A page appears completely unstyled. Two files failed: the styling file and a font it references. '
  'How many causes need to be found?',
  'Possibly one; if the styling file is missing, the font it references is never requested '
  'successfully either',
  ['Two, one for each failure',
   'Two, since a font and a stylesheet are unrelated',
   'None; the page is working as intended'],
  'Failures can be dependent, and one missing file can produce several entries in the list. '
  'Treating each as a separate cause means investigating something that will disappear on its '
  'own.',
  mode='TRANSFER', hinge='Two files failed: the styling file and a font it references')

q('GB_BR_040', 'BR_FAM13_FAILED_REQUEST_DIAGNOSIS', 'D5',
  'A page loads perfectly on the developer\'s machine and is unstyled for everyone else. The '
  'styling file is referenced by a path that works locally. What is the likely difference?',
  'The path resolves to a file that exists only on the developer\'s machine',
  ['The other users have a caching problem',
   'The server is refusing requests from other users',
   'The styling file is too large for other connections'],
  'Something working in exactly one place points at what is present in that place and nowhere '
  'else. A cache would produce a stale page rather than an unstyled one for people who have never '
  'visited.',
  mode='TRANSFER', hinge='loads perfectly on the developer\'s machine and is unstyled for everyone '
                         'else')

q('GB_BR_041', 'BR_FAM13_FAILED_REQUEST_DIAGNOSIS', 'D5',
  'One symptom — a page without styling — has three candidate causes: the file is missing, the '
  'path is wrong, or a stale copy is cached. Which single piece of evidence separates them fastest?',
  'The request list: a 404 means missing or misnamed, and a cached response means stale',
  ['Reloading the page repeatedly',
   'Reading the styling file itself',
   'Asking another user whether they see the same thing'],
  'The request list distinguishes all three at once, because each cause leaves a different entry '
  'in it. Asking another user is useful and answers a narrower question, and reading the file '
  'assumes the browser reached it.',
  mode='TRANSFER', hinge='three candidate causes: the file is missing, the path is wrong, or a '
                         'stale copy is cached')

# =========================================================================
# BR_FAM14_PRIVACY_TRANSFER — D4, D5 x4   (every option is a real belief)
# =========================================================================
q('GB_BR_042', 'BR_FAM14_PRIVACY_TRANSFER', 'D4',
  'A user browses in private mode so that others using the same laptop cannot see where they went. '
  'The mode works exactly as designed. Does it address their concern?',
  'Yes; local history and stored data are what private mode does not keep',
  ['No; private mode keeps history like any other window',
   'No; private mode only hides the browser window',
   'Yes; and it also hides the visits from their network provider'],
  'The concern is about someone with access to the same machine, which is exactly what not '
  'retaining local records addresses. The last option is true of a different concern and is what '
  'makes the mode oversold.',
  evidence='The mode works exactly as designed')

q('GB_BR_043', 'BR_FAM14_PRIVACY_TRANSFER', 'D5',
  'A user browses in private mode so their employer\'s network cannot see which sites they visit. '
  'Does it address that?',
  'No; the requests still travel over the same network and are as visible as ever',
  ['Yes; private mode encrypts all traffic',
   'Yes; private mode routes traffic through another server',
   'No; but only for sites that are not encrypted'],
  'Private mode changes what the browser keeps locally and nothing about what leaves the machine. '
  'Encryption is a separate matter and hides the contents rather than which host was contacted.',
  mode='TRANSFER', hinge='so their employer\'s network cannot see which sites they visit')

q('GB_BR_044', 'BR_FAM14_PRIVACY_TRANSFER', 'D5',
  'A user browses in private mode so a site cannot recognise them as a returning visitor. Does it '
  'address that?',
  'Partly; stored identifiers are not carried over, and a site has other ways to recognise a '
  'returning visitor',
  ['Yes, completely; the site sees a brand-new visitor',
   'No; private mode has no effect on stored identifiers',
   'Yes; private mode changes the address requests come from'],
  'Discarding stored values removes the most direct route to recognition and leaves others, so '
  'the honest answer is partial. Claiming complete anonymity is the belief this family exists to '
  'correct.',
  mode='TRANSFER', hinge='so a site cannot recognise them as a returning visitor')

q('GB_BR_045', 'BR_FAM14_PRIVACY_TRANSFER', 'D5',
  'What is the single most accurate summary of what private browsing changes?',
  'What the browser keeps on this machine after the window closes',
  ['Who can see the traffic on the network',
   'Whether sites can identify the visitor',
   'Whether the connection is encrypted'],
  'Every capability of the mode follows from not retaining local records, and none of the other '
  'three follows from it at all. Holding the summary is what lets each specific concern be judged '
  'without memorising a list.',
  mode='TRANSFER', hinge='What is the single most accurate summary')

q('GB_BR_046', 'BR_FAM14_PRIVACY_TRANSFER', 'D5',
  'Private mode is often described as "browsing anonymously". What does that description cost?',
  'It leads users to rely on it for concerns it does not address, such as network visibility',
  ['Nothing; it is a fair short description',
   'It understates what the mode does',
   'It costs only accuracy, with no practical effect'],
  'A description that overstates a protection is worse than none, because someone will act on it. '
  'What is lost is not precision for its own sake but the user\'s ability to judge when the mode '
  'is enough.',
  mode='TRADEOFF', hinge='often described as "browsing anonymously"')

# =========================================================================
# BR_FAM15_CACHE_STRATEGY_CHOICE — D4, D5 x3   (the change rate decides)
# =========================================================================
q('GB_BR_047', 'BR_FAM15_CACHE_STRATEGY_CHOICE', 'D4',
  'A logo file has not changed in three years and is loaded on every page. What caching approach '
  'fits, and what does it cost?',
  'Reuse it for a long time; the cost is that a change would take that long to reach returning '
  'visitors',
  ['Never reuse it, so it is always current',
   'Reuse it for a few seconds, as a compromise',
   'Reuse it forever, with no cost at all'],
  'Content that almost never changes is what long reuse is for, and the price is paid only when it '
  'does change. Claiming no cost ignores that a change becomes invisible for the reuse period.',
  evidence='A logo file has not changed in three years')

q('GB_BR_048', 'BR_FAM15_CACHE_STRATEGY_CHOICE', 'D5',
  'A page shows a live share price that changes every few seconds. What caching approach fits?',
  'None; the value must be fetched each time it is shown',
  ['Reuse for a few minutes, to reduce load',
   'Reuse for a day, since the page structure is stable',
   'Reuse forever, with a manual refresh available'],
  'Reuse is only acceptable while the stored copy is still true, and here that is a matter of '
  'seconds. The page structure may well be cached, and the value inside it cannot be.',
  mode='TRANSFER', hinge='a live share price that changes every few seconds')

q('GB_BR_049', 'BR_FAM15_CACHE_STRATEGY_CHOICE', 'D5',
  'A styling file changes about once a month, unpredictably. Long reuse makes pages fast and '
  'delays updates. How can both be had?',
  'Give the file a new name when it changes, so a long reuse period never delays an update',
  ['Reuse for exactly one month',
   'Never reuse it, and accept slower pages',
   'Reuse it and ask users to clear their cache after each change'],
  'Renaming makes the address change with the content, so a new file is fetched immediately while '
  'old ones stay reusable indefinitely. A fixed period is a guess about when the next change '
  'falls, and asking users to intervene puts the cost on them.',
  mode='TRANSFER', hinge='changes about once a month, unpredictably')

q('GB_BR_050', 'BR_FAM15_CACHE_STRATEGY_CHOICE', 'D5',
  'A team sets a short reuse period for everything, so nothing is ever stale. What does that '
  'choice cost?',
  'Almost every visit re-fetches files that had not changed, which is slower for users and heavier '
  'for the server',
  ['Nothing; freshness is always worth having',
   'Only server cost, since users notice nothing',
   'Only user-visible speed, since servers are unaffected'],
  'A uniform short period treats content that never changes exactly like content that changes '
  'constantly, and pays the fetch cost on both. The cost lands on the user and the server '
  'together rather than on either alone.',
  mode='TRADEOFF', hinge='sets a short reuse period for everything')
