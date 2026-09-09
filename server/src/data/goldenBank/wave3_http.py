# -*- coding: utf-8 -*-
"""
Wave 3 — HTTP, 50 Golden Bank questions.

1 comes from the existing bank, remapped in from HOW_COMPUTERS_WORK, and 49 are new.

NO HEADER NAMES ARE RECALLED. The blueprint says so for HP_FAM09: the stem states what a header is
for and the question asks what it tells the other side, because remembering a name measures
nothing about whether the exchange is understood.

STATUS CLASSES, NOT INDIVIDUAL NUMBERS. A number is evidence about which side failed, and the
skill is reading that evidence — so the items ask where the fault is and what to check, not what a
particular code is called.
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
# HP_FAM01_EXCHANGE_RECOGNITION — D1 x4, D2 x1
# =========================================================================
q('GB_HP_001', 'HP_FAM01_EXCHANGE_RECOGNITION', 'D1',
  'In a web exchange, which side sends first?',
  'The client, with a request',
  ['The server, with a response',
   'Either; whichever is ready first',
   'Both at once, and the exchange settles afterwards'],
  'An exchange begins with a request and the response answers it. A server that could start the '
  'conversation would have to know which client to speak to and when.')

q('GB_HP_002', 'HP_FAM01_EXCHANGE_RECOGNITION', 'D1',
  'How many responses does a server send for one request?',
  'One',
  ['None; the response is optional',
   'As many as it needs, over time',
   'Two: one to acknowledge and one with the answer'],
  'One request is answered by one response, even when that response reports a failure. A client '
  'waiting for an answer that never comes has no way to tell success from silence.')

q('GB_HP_003', 'HP_FAM01_EXCHANGE_RECOGNITION', 'D1',
  'A page is loaded and then the reader does nothing for an hour. What is passing between the '
  'browser and the server during that hour?',
  'Nothing, unless something on the page asks for more',
  ['A continuous stream keeping the page alive',
   'A response every few seconds, confirming the page is still valid',
   'The page itself, sent repeatedly'],
  'The exchange finished when the response arrived, and nothing continues by itself. Anything '
  'further requires a new request.')

q('GB_HP_004', 'HP_FAM01_EXCHANGE_RECOGNITION', 'D1',
  'A browser asks for a page and the server has no such page. What does the server send?',
  'A response saying the page was not found',
  ['Nothing, since there is nothing to send',
   'The nearest page it does have',
   'A request asking the browser to try again'],
  'Every request gets a response, and reporting an absence is one of the things a response is '
  'for. Sending nothing would leave the browser unable to distinguish a missing page from a '
  'broken connection.')

q('GB_HP_005', 'HP_FAM01_EXCHANGE_RECOGNITION', 'D2',
  'A page contains three images. How many exchanges take place to display it fully?',
  'Four: one for the page and one for each image',
  ['One; the page arrives complete',
   'Two: one for the page and one for the images together',
   'Three: one per image, with the page included in the first'],
  'The page arrives first and names the images, and each of those is fetched by its own request. '
  'The browser cannot ask for the images before it has read the page that mentions them.')

# =========================================================================
# HP_FAM02_METHOD_RECOGNITION — D1 x3, D2 x1
# =========================================================================
q('GB_HP_006', 'HP_FAM02_METHOD_RECOGNITION', 'D1',
  'A request uses the method that means "give me this". What is it asking for?',
  'Data, without changing anything',
  ['A change to be made on the server',
   'A record to be deleted',
   'A new record to be created'],
  'A fetch states an intention to read. The other three describe changes, which a different '
  'method exists to express.')

q('GB_HP_007', 'HP_FAM02_METHOD_RECOGNITION', 'D1',
  'A request uses the method that means "here is something to store". What is it asking for?',
  'A change on the server',
  ['Data to be returned unchanged',
   'The connection to be closed',
   'The page to be reloaded'],
  'A submitting method states an intention to change something. The response may still return '
  'data, and that is not what the method is for.')

q('GB_HP_008', 'HP_FAM02_METHOD_RECOGNITION', 'D1',
  'Who decides which method a request uses?',
  'The client, when it makes the request',
  ['The server, when it decides how to answer',
   'The protocol, according to the address',
   'The browser, according to the page size'],
  'The method states what the client intends, so the client chooses it. The server may refuse, '
  'which is a different matter from choosing.')

q('GB_HP_009', 'HP_FAM02_METHOD_RECOGNITION', 'D2',
  'A request made with a fetch method changes a record on the server. Is that possible, and is it '
  'appropriate?',
  'Possible, because nothing enforces the meaning, and inappropriate, because everything treats a '
  'fetch as safe to repeat',
  ['Impossible; the protocol prevents it',
   'Possible and appropriate, if it is what the application needs',
   'Impossible; the server would refuse the request'],
  'The method is a statement of intent rather than a rule the protocol enforces, so a fetch that '
  'changes things will work. Everything from browsers to caches assumes a fetch is repeatable, '
  'which is what makes it a poor choice rather than an impossible one.')

# =========================================================================
# HP_FAM03_STATUS_CLASS_RECOGNITION — D1 x3, D2 x1
# =========================================================================
q('GB_HP_010', 'HP_FAM03_STATUS_CLASS_RECOGNITION', 'D1',
  'A response carries a status in the 400 range. What does that indicate?',
  'The request was refused because of something about the request itself',
  ['The server failed while handling the request',
   'The request succeeded',
   'The request should be sent to a different address'],
  'The 400 range places the problem on the client side — a bad address, missing identification, a '
  'malformed body. A server failure falls in a different range.')

q('GB_HP_011', 'HP_FAM03_STATUS_CLASS_RECOGNITION', 'D1',
  'A response carries a status in the 500 range. What does that indicate?',
  'The server failed while handling a request that may have been perfectly valid',
  ['The request was malformed',
   'The request succeeded',
   'The address does not exist'],
  'The 500 range says the fault is on the server side, so resending the same request unchanged is '
  'reasonable. A malformed request would be reported in the 400 range instead.')

q('GB_HP_012', 'HP_FAM03_STATUS_CLASS_RECOGNITION', 'D1',
  'A response carries a status in the 300 range, telling the client to look elsewhere. Did the '
  'request fail?',
  'No; the client is being told where to go next, which is a normal outcome',
  ['Yes; anything other than success is a failure',
   'Yes; the resource does not exist',
   'No; the response is the resource itself'],
  'A redirection is an instruction rather than a failure, and following it usually succeeds. '
  'Treating every non-success status as a failure loses that distinction.')

q('GB_HP_013', 'HP_FAM03_STATUS_CLASS_RECOGNITION', 'D2',
  'A request returns a success status and an empty body. Did it fail?',
  'No; the request succeeded and the answer happens to be empty',
  ['Yes; an empty body means the server failed',
   'Yes; a success status with no data is a contradiction',
   'It cannot be said without the status number'],
  'A search that matched nothing succeeds and returns nothing, which is exactly this. Reading an '
  'empty answer as a failure confuses "no results" with "no answer".')

# =========================================================================
# HP_FAM04_MESSAGE_PARTS — D2, D3
# =========================================================================
q('GB_HP_014', 'HP_FAM04_MESSAGE_PARTS', 'D2',
  'A request shows: a method, an address, several lines of the form name: value, a blank line, '
  'and then some data. Which part are the name-and-value lines?',
  'The headers, which describe the message',
  ['The body, which carries the data',
   'The address, split across lines',
   'The status, reporting the outcome'],
  'Headers sit between the first line and the blank line and describe the message rather than '
  'carrying its content. The data after the blank line is the body.')

q('GB_HP_015', 'HP_FAM04_MESSAGE_PARTS', 'D3',
  'In the same request, what separates the headers from the body?',
  'A blank line',
  ['A header naming the body\'s length',
   'The address, which comes between them',
   'Nothing; the reader has to infer where the body begins'],
  'A blank line marks the end of the headers, which is what lets a reader know where the body '
  'starts without counting. A length header describes the body and does not delimit it.')

# =========================================================================
# HP_FAM05_STATELESSNESS — D2, D3
# =========================================================================
q('GB_HP_016', 'HP_FAM05_STATELESSNESS', 'D2',
  'A client makes a request, and then a second one a minute later. What does the server remember '
  'about the first by default?',
  'Nothing; each request arrives without any memory of the last',
  ['Everything, for as long as the browser stays open',
   'The address requested, but not the data sent',
   'Whether the client was logged in'],
  'Each request is independent, and anything the server is to know must arrive with it. That is '
  'why identifying information travels in every request rather than being established once.')

q('GB_HP_017', 'HP_FAM05_STATELESSNESS', 'D3',
  'How does a server recognise the same user across several requests, given that it remembers '
  'nothing by default?',
  'Something identifying is sent with each request, and the server looks it up',
  ['The connection stays open and identifies the user',
   'The server recognises the address the requests come from',
   'The browser tells the server it is the same user, and the server trusts it'],
  'Recognition is rebuilt on every request from something the client sends. An address identifies '
  'a network location rather than a person, and many people can share one.')

# =========================================================================
# HP_FAM06_METHOD_SELECTION — D2, D3, D4
# =========================================================================
q('GB_HP_018', 'HP_FAM06_METHOD_SELECTION', 'D2',
  'A page must show a list of orders without changing anything. Which method fits?',
  'A fetch, because nothing is being changed',
  ['A submitting method, because data is being returned',
   'A deleting method, because the list may shrink',
   'Either; the method makes no difference for reading'],
  'The method states intent, and the intent here is to read. Everything that handles the request '
  'is entitled to assume a fetch is safe to repeat.')

q('GB_HP_019', 'HP_FAM06_METHOD_SELECTION', 'D3',
  'A form places an order. What goes wrong if it is submitted with a fetch?',
  'Reloading the page or following a link back can place the order again',
  ['The order will not be recorded at all',
   'The server will refuse the request',
   'Nothing; the method is a matter of style'],
  'A fetch is treated as repeatable by browsers, caches and users, so a request that changes '
  'something can be replayed. The order is recorded perfectly well the first time, which is what '
  'makes the problem easy to miss.')

q('GB_HP_020', 'HP_FAM06_METHOD_SELECTION', 'D4',
  'A team reports that their "delete" links occasionally remove records nobody asked to remove. '
  'The links use a fetch method and are working exactly as written. What is happening?',
  'Something that follows links automatically is visiting them, and a fetch is assumed safe to '
  'follow',
  ['The server is deleting records at random',
   'The links are pointing at the wrong records',
   'The requests are being sent twice by the browser'],
  'Anything that prefetches or crawls links treats a fetch as harmless, so a fetch that deletes '
  'gets triggered by something that never intended to. The links work as written, which is '
  'exactly the problem.',
  evidence='The links use a fetch method and are working exactly as written')

# =========================================================================
# HP_FAM07_STATUS_DIAGNOSIS — D2, D3, D4
# =========================================================================
q('GB_HP_021', 'HP_FAM07_STATUS_DIAGNOSIS', 'D2',
  'A request returns a status in the 400 range. Where should the investigation start?',
  'With the request: its address, its headers and its body',
  ['With the server logs, since the server sent the status',
   'With the network, since the request travelled',
   'With the browser version'],
  'The status names the side at fault, and the 400 range points at the request. Server logs are '
  'worth reading and start further from the evidence.')

q('GB_HP_022', 'HP_FAM07_STATUS_DIAGNOSIS', 'D3',
  'A request returns a status in the 500 range and the same request succeeded an hour ago, '
  'unchanged. Where is the fault?',
  'On the server; the request is the same one that worked',
  ['In the request, which must have changed',
   'In the address, which must be wrong',
   'In the network, which must have dropped the request'],
  'An unchanged request that used to work rules out the request itself, and the status already '
  'places the fault on the server side. A dropped request would produce no status at all.')

q('GB_HP_023', 'HP_FAM07_STATUS_DIAGNOSIS', 'D4',
  'A page shows no data. The request returned a success status with an empty body, and the server '
  'logs record no errors. What is the most likely explanation?',
  'The request succeeded and matched nothing, so the fault is in what was asked for rather than '
  'in the exchange',
  ['The server failed silently',
   'The address is wrong, so nothing was found',
   'The response was lost in transit'],
  'A success status with clean logs means the exchange worked, so an empty page is an answer '
  'rather than a failure. A wrong address would have produced a status in the 400 range.',
  evidence='The request returned a success status with an empty body, and the server logs record '
           'no errors')

# =========================================================================
# HP_FAM08_ADDRESS_STRUCTURE — D2, D3, D4
# =========================================================================
q('GB_HP_024', 'HP_FAM08_ADDRESS_STRUCTURE', 'D2',
  'An address must identify one particular order. Where does the identifier belong?',
  'In the path, because it names which resource is wanted',
  ['In the query, because it is a value',
   'In a header, because it is metadata',
   'In the body, because a fetch may carry one'],
  'The path names what is being asked for, so an identifier that selects a single thing belongs '
  'there. The query narrows or modifies a collection rather than naming a member of it.')

q('GB_HP_025', 'HP_FAM08_ADDRESS_STRUCTURE', 'D3',
  'An address must request all orders placed in March. Where does the month belong?',
  'In the query, because it filters a collection rather than naming one order',
  ['In the path, because it identifies which orders',
   'In a header, because it is a condition',
   'Either; the two are interchangeable'],
  'The resource being asked for is the collection of orders, and March narrows it. Putting a '
  'filter in the path implies a different resource for every possible filter.')

q('GB_HP_026', 'HP_FAM08_ADDRESS_STRUCTURE', 'D4',
  'A team\'s addresses put filters in the path, so every filter combination is a different '
  'address. Every address they have built works correctly. What does the design cost them?',
  'A new address has to be defined for each combination, and nothing can be filtered in a way '
  'nobody anticipated',
  ['Nothing; the addresses work',
   'The server cannot tell one filter from another',
   'The addresses become too long to send'],
  'The design works, which is why it survives. What it gives up is the ability to combine filters '
  'freely, since each combination is a separate address somebody has to add.',
  evidence='Every address they have built works correctly')

# =========================================================================
# HP_FAM09_HEADER_ROLE — D2, D3, D4   (the stem states the header's purpose)
# =========================================================================
q('GB_HP_027', 'HP_FAM09_HEADER_ROLE', 'D2',
  'A request carries a header stating that the body is in a particular format. What does that tell '
  'the server?',
  'How to interpret the body it has been sent',
  ['That the body has been converted into that format',
   'That the server must reply in that format',
   'That the body is valid'],
  'The header describes the message so the other side knows how to read it. Nothing converts or '
  'validates the body because a header says so.')

q('GB_HP_028', 'HP_FAM09_HEADER_ROLE', 'D3',
  'A request carries a header stating a format that does not match the body actually sent. What '
  'happens?',
  'The server tries to read the body as the stated format and fails or misreads it',
  ['The server detects the real format and uses it',
   'The protocol rejects the request before it arrives',
   'The header is ignored, since the body speaks for itself'],
  'A header is a claim, and the receiver acts on it. Nothing checks the claim against the body, '
  'which is why a wrong header produces a confusing failure rather than a clear one.')

q('GB_HP_029', 'HP_FAM09_HEADER_ROLE', 'D4',
  'A server rejects a request as malformed. The body is exactly what the server expects, and the '
  'address and method are correct. What should be checked next?',
  'The header describing the body\'s format, which may not match what was sent',
  ['The server\'s available memory',
   'Whether the body is too long',
   'Whether the request was sent twice'],
  'A correct body rejected as malformed points at how the body was described rather than at its '
  'content. The header and the body are two separate claims and only one of them has been '
  'verified.',
  evidence='The body is exactly what the server expects, and the address and method are correct')

# =========================================================================
# HP_FAM10_TRANSPORT_SECURITY — D2 (legacy), D3, D4
# =========================================================================
q('GB_HP_030', 'HP_FAM10_TRANSPORT_SECURITY', 'D2',
  'A secure connection is in use. What does that mainly indicate?',
  'That the exchange is encrypted while it travels',
  ['That the site is trustworthy',
   'That the site has no server',
   'That the browser is working offline'],
  'Encryption protects the data in transit and says nothing about who is at the other end or what '
  'they do with it. A dishonest site can hold a perfectly valid certificate.',
  provenance='LEGACY_REMAP', source='dc4e1e')

q('GB_HP_031', 'HP_FAM10_TRANSPORT_SECURITY', 'D3',
  'A user worries that someone on the same network can see which sites they visit. Does a secure '
  'connection address that?',
  'Only partly; the contents are hidden, and which site was contacted is largely not',
  ['Yes, completely; nothing is visible',
   'No; a secure connection hides nothing on a shared network',
   'Yes; the site name is encrypted along with everything else'],
  'The contents of the exchange are protected and the fact that a connection was made to a '
  'particular host is largely observable. Overstating what encryption covers is as unhelpful as '
  'denying it covers anything.')

q('GB_HP_032', 'HP_FAM10_TRANSPORT_SECURITY', 'D4',
  'Data submitted over a secure connection is later found exposed. The connection was genuinely '
  'encrypted and no interception occurred. Where is the likely exposure?',
  'Where the data was stored or handled after arriving, which encryption in transit does not touch',
  ['During transmission, which must not have been encrypted after all',
   'In the browser, which must have kept a copy',
   'In the address, which carried the data'],
  'Encryption protects the journey, and the stem rules out any failure there. Once the data '
  'arrives it is in the clear on the server, which is a separate problem needing separate '
  'measures.',
  evidence='The connection was genuinely encrypted and no interception occurred')

# =========================================================================
# HP_FAM11_IDENTITY_REASONING — D3, D4
# =========================================================================
q('GB_HP_033', 'HP_FAM11_IDENTITY_REASONING', 'D3',
  'A request that needs identification arrives without any. What does the server do?',
  'Refuses it, because it has no way to know who is asking',
  ['Serves it, because the user is logged in elsewhere',
   'Serves it, using the address to identify the user',
   'Waits for a second request carrying the identification'],
  'Each request stands alone, so identification missing from this one is simply missing. Being '
  'logged in is a property of what the client sends, not a state the server holds.')

q('GB_HP_034', 'HP_FAM11_IDENTITY_REASONING', 'D4',
  'A user is logged in in one browser tab and a request from a second tab is refused as '
  'unidentified. Both tabs are open to the same site in the same browser. What explains it?',
  'The second request did not carry the identifying data, which travels per request rather than '
  'per user',
  ['The server has logged the user out',
   'Two tabs cannot share a login',
   'The second tab is using a different address'],
  'Identity rides on each request, so a request that omits it is anonymous whatever other tabs '
  'are doing. Tabs can and normally do share stored identification — this one did not send it.',
  evidence='Both tabs are open to the same site in the same browser')

# =========================================================================
# HP_FAM12_RESPONSE_REUSE — D3, D4
# =========================================================================
q('GB_HP_035', 'HP_FAM12_RESPONSE_REUSE', 'D3',
  'A page is requested twice in quick succession. Does the second request necessarily reach the '
  'server?',
  'No; a stored copy of the earlier response may be used instead',
  ['Yes; every request reaches the server',
   'Yes, unless the server is unavailable',
   'No; a second identical request is always discarded'],
  'Responses may be kept and reused, which is what makes a second load fast. Whether the server is '
  'contacted depends on what the first response said about reuse.')

q('GB_HP_036', 'HP_FAM12_RESPONSE_REUSE', 'D4',
  'A user reports that a page shows yesterday\'s data. The server has today\'s data and returns it '
  'to every request it receives. Where is the problem?',
  'A stored copy is being reused, so the request is not reaching the server',
  ['The server is returning stale data',
   'The user is looking at the wrong address',
   'The data was never updated'],
  'The server behaving correctly for every request it receives, combined with a stale page, means '
  'some requests are not arriving. Reuse of an earlier response is what produces exactly that.',
  evidence='The server has today\'s data and returns it to every request it receives')

# =========================================================================
# HP_FAM13_EXCHANGE_DIAGNOSIS — D3, D4, D5 x3
# =========================================================================
q('GB_HP_037', 'HP_FAM13_EXCHANGE_DIAGNOSIS', 'D3',
  'A request produces no status at all and no response. What does that suggest?',
  'The request never reached a server, so nothing was there to answer it',
  ['The server failed while handling it',
   'The address was wrong',
   'The response was empty'],
  'A status is produced by a server, so its complete absence points at the request not arriving. '
  'A wrong address would have reached a server and been refused with a status.')

q('GB_HP_038', 'HP_FAM13_EXCHANGE_DIAGNOSIS', 'D4',
  'A request returns a status saying the resource was not found. The address is confirmed correct '
  'and the server is running. What follows?',
  'The address is right and the resource is not there',
  ['The address must be wrong after all',
   'The server must be down',
   'The request was malformed'],
  'A not-found status distinguishes a reachable server from a present resource, and the stem '
  'confirms both the address and the server. What remains is that nothing exists at that address '
  'to return.',
  evidence='The address is confirmed correct and the server is running')

q('GB_HP_039', 'HP_FAM13_EXCHANGE_DIAGNOSIS', 'D5',
  'A request returns a success status, and the body contains a message saying the operation '
  'failed. Which is true?',
  'The exchange succeeded and the operation did not; the two are separate outcomes',
  ['The status is wrong and should have reported a failure',
   'The body is wrong, since the status says success',
   'Both report the same thing, so the operation succeeded'],
  'A status describes whether the request was received and handled; the body describes what '
  'happened. A server can perfectly well succeed in telling you that something did not work.',
  mode='TRANSFER', hinge='the body contains a message saying the operation failed')

q('GB_HP_040', 'HP_FAM13_EXCHANGE_DIAGNOSIS', 'D5',
  'Two failures look alike to a user: the request never arrived, and the server refused it. How '
  'would you tell them apart, and why does it matter?',
  'By whether a status came back at all; one is worth retrying and one will fail identically every '
  'time',
  ['By the time each takes, which is always different',
   'They cannot be told apart from the client',
   'By the address, which differs in each case'],
  'A status is produced only by a server, so its presence separates the two. Retrying is sensible '
  'for one and futile for the other, which is why the distinction is worth making before acting.',
  mode='TRANSFER', hinge='the request never arrived, and the server refused it')

q('GB_HP_041', 'HP_FAM13_EXCHANGE_DIAGNOSIS', 'D5',
  'A request fails intermittently, succeeding about half the time with no change to the request. '
  'What class of cause fits, and what does not?',
  'Something varying between attempts — load, timing or which server answered; a wrong address '
  'would fail every time',
  ['A wrong address, which sometimes resolves',
   'A malformed body, which is sometimes accepted',
   'Randomness, which needs no further explanation'],
  'An unchanging request with varying outcomes means something on the other side varies. Both a '
  'wrong address and a malformed body would produce the same refusal on every attempt.',
  mode='TRANSFER', hinge='succeeding about half the time with no change to the request')

# =========================================================================
# HP_FAM14_TRUST_TRANSFER — D4, D5 x4
# =========================================================================
q('GB_HP_042', 'HP_FAM14_TRUST_TRANSFER', 'D4',
  'A server reads a price from a hidden field the page itself set, and charges that amount. The '
  'page sets the field correctly and the site works as intended for ordinary users. Is the '
  'assumption safe?',
  'No; anything in a request can be altered before it is sent, whatever the page set',
  ['Yes; the page set the value, so it is correct',
   'Yes, provided the field is hidden from view',
   'No; but only if the connection is not encrypted'],
  'The page runs on the client, so what it sets is a starting value rather than a guarantee. '
  'Encryption protects the journey and does nothing about what was put in before it began.',
  evidence='The page sets the field correctly and the site works as intended for ordinary users')

q('GB_HP_043', 'HP_FAM14_TRUST_TRANSFER', 'D5',
  'A server trusts a header claiming which user is making the request, because its own pages '
  'always set that header correctly. Is that safe?',
  'No; a request can carry any header at all, and the server cannot tell which page it came from',
  ['Yes; the header is set by the server\'s own pages',
   'Yes, provided the header name is not documented',
   'No; but only for requests from other sites'],
  'Nothing about a request reveals what produced it, so a header is a claim like any other. Being '
  'undocumented is obscurity rather than protection.',
  mode='TRANSFER', hinge='because its own pages always set that header correctly')

q('GB_HP_044', 'HP_FAM14_TRUST_TRANSFER', 'D5',
  'A page validates a form before submitting it, and the server accepts whatever arrives. Where is '
  'the gap?',
  'A request need not come from that page at all, so nothing has been validated as far as the '
  'server knows',
  ['There is no gap; the page validates correctly',
   'The gap is that validation runs twice, wasting time',
   'The gap is that the page may fail to validate some inputs'],
  'Client-side validation improves the experience for someone using the page and constrains '
  'nothing about what reaches the server. Requests can be made without the page being involved.',
  mode='TRANSFER', hinge='A page validates a form before submitting it')

q('GB_HP_045', 'HP_FAM14_TRUST_TRANSFER', 'D5',
  'If the server must validate everything anyway, is validating in the page worth doing?',
  'Yes; it gives immediate feedback and saves round trips, and it replaces nothing on the server',
  ['No; it duplicates work the server must do',
   'No; it gives users a false sense of security',
   'Yes; it removes the need for some server checks'],
  'The two validations serve different purposes: one is about the experience and one is about '
  'correctness. Treating the client check as removing server checks is exactly the error, and '
  'dropping it costs the user a round trip for every mistake.',
  mode='TRADEOFF', hinge='If the server must validate everything anyway')

q('GB_HP_046', 'HP_FAM14_TRUST_TRANSFER', 'D5',
  'Which parts of a request can a server trust as coming unaltered from its own page?',
  'None of them; every part is supplied by the client and can be anything',
  ['The headers, which the browser controls',
   'The method and address, which the page sets',
   'Hidden fields, which the user cannot see'],
  'The whole request is constructed on the client side, and a request can be built without any '
  'page at all. Browsers restrict what a page may do, and nothing restricts what some other tool '
  'may send.',
  mode='TRANSFER', hinge='Which parts of a request can a server trust')

# =========================================================================
# HP_FAM15_EXCHANGE_DESIGN — D4, D5 x3
# =========================================================================
q('GB_HP_047', 'HP_FAM15_EXCHANGE_DESIGN', 'D4',
  'An action must record a payment. Every design below works. Which is the safest to repeat if the '
  'client resends it?',
  'A submitting method carrying an identifier the server uses to recognise a repeat',
  ['A fetch that records the payment when visited',
   'A submitting method that records a payment each time it arrives',
   'A fetch that records the payment and returns the receipt'],
  'A request may be resent for reasons outside anybody\'s control, so the design has to make a '
  'repeat harmless. Only one option gives the server a way to recognise that it has already seen '
  'this payment.',
  evidence='Every design below works')

q('GB_HP_048', 'HP_FAM15_EXCHANGE_DESIGN', 'D5',
  'An action creates a record. What should the response contain, and why?',
  'A status saying it was created and enough to identify the new record, so the caller can refer '
  'to it',
  ['Nothing; the creation is what mattered',
   'The entire collection, so the caller sees the new state',
   'A status only, since the caller made the request'],
  'A caller that has just created something almost always needs to refer to it next, and only the '
  'server knows the identifier it assigned. Returning the whole collection answers a much larger '
  'question at much greater cost.',
  mode='TRANSFER', hinge='What should the response contain')

q('GB_HP_049', 'HP_FAM15_EXCHANGE_DESIGN', 'D5',
  'One design fetches a large collection and filters it in the browser; another asks the server '
  'for the filtered subset. Both display the same thing. What does each cost?',
  'The first sends far more data and can filter without asking again; the second sends less and '
  'needs a request per filter',
  ['The first costs nothing, since filtering is fast in the browser',
   'The second costs nothing, since less data travels',
   'They cost the same, since the display is identical'],
  'Identical output settles correctness and leaves the traffic pattern entirely open. Which is '
  'better depends on how large the collection is and how often the filter changes, so neither is '
  'right in general.',
  mode='TRADEOFF', hinge='another asks the server for the filtered subset')

q('GB_HP_050', 'HP_FAM15_EXCHANGE_DESIGN', 'D5',
  'A design puts a state-changing action behind a fetch because it is easier to trigger from a '
  'link. What follows, and is the convenience worth it?',
  'Anything that follows links can trigger the action; the convenience is real and is not worth an '
  'action that fires without being asked',
  ['Nothing follows; the method is a matter of style',
   'The action becomes slower, which is the only cost',
   'The convenience is worth it, since users click links deliberately'],
  'The method is a promise to everything that handles the request, and breaking it means the '
  'action can be triggered by things that never intended to. Users clicking deliberately is only '
  'half of what visits a link.',
  mode='TRADEOFF', hinge='because it is easier to trigger from a link')
