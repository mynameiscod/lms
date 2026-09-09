# -*- coding: utf-8 -*-
"""
Wave 4 — COMPUTER_NETWORKS, 50 Golden Bank questions, all newly authored.

NO PROTOCOL NAMES AND NO NUMBERED LAYER MODEL. The blueprint is explicit on both: the reliability
family asks which kind of delivery suits a use and what it gives up, and the layer family asks
which responsibility a job belongs to, in words. A student who can recite a seven-layer list has
not shown that they can place retransmission or encryption in it.

THE "IT WORKS ON MY MACHINE" FAMILY IS THE PRACTICAL CENTRE OF THIS SKILL. A service reachable
locally and nowhere else is the first networking problem a first-year meets, and three separate
families here — local address scope, blocking, and reachability — approach it from different
sides.
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
# CN_FAM01_NETWORK_ROLE — D1 x4, D2 x1
# =========================================================================
q('GB_CN_001', 'CN_FAM01_NETWORK_ROLE', 'D1',
  'What is needed for two machines to exchange data?',
  'A connection between them and an agreed way of addressing each other',
  ['A browser on each machine',
   'A connection to the internet',
   'Both machines to be made by the same manufacturer'],
  'A network is machines connected with a shared way of finding one another. The internet is one '
  'very large example rather than a requirement, and a browser is one program among many that '
  'uses a network.')

q('GB_CN_002', 'CN_FAM01_NETWORK_ROLE', 'D1',
  'Two machines in one room are connected to each other and to nothing else. Is that a network?',
  'Yes; connected machines that can exchange data form a network whatever its size',
  ['No; a network must reach the internet',
   'No; two machines are too few',
   'Yes, but only while data is actually moving'],
  'What makes a network is the connection and the ability to exchange, not the scale or the reach. '
  'A network with no traffic is idle rather than nonexistent.')

q('GB_CN_003', 'CN_FAM01_NETWORK_ROLE', 'D1',
  'Must both machines be switched on at the same moment for any exchange to be possible?',
  'For a direct exchange yes; a message left with an intermediary can be collected later',
  ['Yes, always; data cannot be held anywhere',
   'No; data waits on the network until the other machine appears',
   'No; the network stores everything sent over it'],
  'A direct conversation needs both ends present, and services that hold messages exist precisely '
  'so that they do not have to be. The network itself carries rather than stores.')

q('GB_CN_004', 'CN_FAM01_NETWORK_ROLE', 'D1',
  'Is the internet the same thing as a network?',
  'No; the internet is a very large network built out of many smaller ones',
  ['Yes; the two words mean the same thing',
   'No; a network is part of a computer and the internet is outside it',
   'Yes; every network is connected to the internet'],
  'Networks exist at every scale and most are not connected to the internet at all. Treating the '
  'two as synonyms makes a disconnected office network impossible to describe.')

q('GB_CN_005', 'CN_FAM01_NETWORK_ROLE', 'D2',
  'A machine is connected to a network and cannot reach any other machine on it. What has to be '
  'true for it to succeed?',
  'It must be able to address the other machine and have a path to it',
  ['It must have a browser installed',
   'It must be the same kind of machine as the others',
   'It must be switched on before the others'],
  'Reaching another machine needs both a way to name it and a route that carries the data. A '
  'physical connection alone is not enough if either is missing.')

# =========================================================================
# CN_FAM02_ADDRESS_VS_NAME — D1 x3, D2 x1
# =========================================================================
q('GB_CN_006', 'CN_FAM02_ADDRESS_VS_NAME', 'D1',
  'Which does a network use to decide where to send data?',
  'The address',
  ['The name', 'Either; they are interchangeable', 'The name, converted to uppercase'],
  'Routing works on addresses, and a name has to be looked up to obtain one first. The two exist '
  'for different audiences: names for people, addresses for machines.')

q('GB_CN_007', 'CN_FAM02_ADDRESS_VS_NAME', 'D1',
  'What is a name used for?',
  'So that people can refer to a machine without remembering its address',
  ['So that the network can route data',
   'So that the machine can identify itself to its operating system',
   'So that two machines can share one address'],
  'A name is a convenience for people, resolved to an address before anything is sent. The network '
  'never sees it.')

q('GB_CN_008', 'CN_FAM02_ADDRESS_VS_NAME', 'D1',
  'Does one name always refer to the same machine?',
  'No; the address a name points at can be changed at any time',
  ['Yes; a name is permanently tied to one machine',
   'Yes, unless the machine is switched off',
   'No; a name refers to a different machine on each request'],
  'The point of a name is that it can be redirected, which is how a service moves to new hardware '
  'without anybody learning a new address. It does not change on its own between requests.')

q('GB_CN_009', 'CN_FAM02_ADDRESS_VS_NAME', 'D2',
  'A name is entered in a browser. What has to happen before any data is sent to that machine?',
  'The name is looked up to obtain an address',
  ['The data is sent to the name and forwarded',
   'The machine announces its address to the browser',
   'Nothing; names are routable in the same way as addresses'],
  'Nothing can be routed until an address exists, so the lookup happens first. Sending to a name '
  'would require every machine on the path to understand names.')

# =========================================================================
# CN_FAM03_PORT_PURPOSE — D1 x3, D2 x1
# =========================================================================
q('GB_CN_010', 'CN_FAM03_PORT_PURPOSE', 'D1',
  'What does a port identify?',
  'Which service on a machine the data is for',
  ['Which machine the data is for',
   'A physical socket the cable plugs into',
   'How fast the data may be sent'],
  'The address gets data to the machine and the port decides which program on it receives them. '
  'The physical socket is a different thing that happens to share the word.')

q('GB_CN_011', 'CN_FAM03_PORT_PURPOSE', 'D1',
  'Two services on one machine try to use the same port. What happens?',
  'One of them fails to start, because a port can serve only one at a time',
  ['Both work, sharing the port',
   'Both fail to start',
   'The machine chooses a different port for one of them automatically'],
  'A port has to identify one recipient unambiguously, so a second claim on it is refused. '
  'Nothing reassigns it, which is why the second service reports that the port is in use.')

q('GB_CN_012', 'CN_FAM03_PORT_PURPOSE', 'D1',
  'Can two different machines each run a service on the same port number?',
  'Yes; the port only has to be unique on its own machine',
  ['No; a port number may be used once anywhere',
   'Yes, but only if the machines are on different networks',
   'No; port numbers are assigned centrally'],
  'A recipient is identified by an address and a port together, so the same port on two machines '
  'is two different destinations. That is why every web server can use the same port.')

q('GB_CN_013', 'CN_FAM03_PORT_PURPOSE', 'D2',
  'A developer starts a second copy of their application and it reports that the port is already '
  'in use. What is happening?',
  'The first copy still holds the port, and only one service may hold it at a time',
  ['The machine has run out of ports',
   'The application cannot be run twice on any machine',
   'The port number is reserved by the operating system'],
  'The first copy is still running and still holding its port. Starting a second on a different '
  'port works perfectly well, which shows the limit is the port rather than the application.')

# =========================================================================
# CN_FAM04_RESOLUTION_ORDER — D2, D3
# =========================================================================
q('GB_CN_014', 'CN_FAM04_RESOLUTION_ORDER', 'D2',
  'Put the steps of reaching a named machine in order.',
  'Look the name up, obtain an address, connect to that address, exchange data',
  ['Connect to the name, look up the address, exchange data',
   'Exchange data with the name, which forwards it',
   'Look the name up once for all sites, then connect'],
  'A connection needs an address, so the lookup comes first. Looking up once for everything would '
  'require knowing every site to be visited in advance.')

q('GB_CN_015', 'CN_FAM04_RESOLUTION_ORDER', 'D3',
  'A machine visits two different named sites. How many lookups are needed?',
  'One per name, though a remembered result may be reused',
  ['One in total, covering both',
   'One per request, always',
   'None; the addresses are already known'],
  'Each name needs its own address, and results are commonly remembered for a while so a repeat '
  'visit may need no lookup. Neither extreme — one lookup for everything, or one for every '
  'request — describes what happens.')

# =========================================================================
# CN_FAM05_LOCAL_ADDRESS_SCOPE — D2, D3
# =========================================================================
q('GB_CN_016', 'CN_FAM05_LOCAL_ADDRESS_SCOPE', 'D2',
  'A developer runs a service and reaches it at an address meaning "this machine". Can a colleague '
  'use that same address to reach it?',
  'No; on the colleague\'s machine that address means their own machine',
  ['Yes; the address identifies the developer\'s machine',
   'Yes, if they are on the same network',
   'No; the colleague needs the same browser'],
  'An address meaning "this machine" is relative to whoever uses it, so it never points anywhere '
  'else. Sharing it sends the colleague to their own machine, where nothing is listening.')

q('GB_CN_017', 'CN_FAM05_LOCAL_ADDRESS_SCOPE', 'D3',
  'A service is reachable from other machines in the same office and not from outside. What does '
  'that tell you about its address?',
  'It is an address meaningful only within that network, not reachable from the wider internet',
  ['It is a public address that has been blocked',
   'It is an address meaning "this machine"',
   'It has no address, only a name'],
  'Working across the office rules out an address meaning "this machine", and failing outside '
  'points at a range that is valid only within a network. Many networks reuse the same such '
  'ranges, which is why they cannot be routed globally.')

# =========================================================================
# CN_FAM06_PACKET_REASONING — D2, D3, D4
# =========================================================================
q('GB_CN_018', 'CN_FAM06_PACKET_REASONING', 'D2',
  'A large file is sent across a network. How does it travel?',
  'Divided into many small pieces sent separately',
  ['As one continuous unit from start to finish',
   'As one piece per second, regardless of size',
   'Compressed into a single small piece'],
  'Data is broken into pieces so that a network can interleave traffic from many sources. Sending '
  'a large file as one unit would block everything else for its duration.')

q('GB_CN_019', 'CN_FAM06_PACKET_REASONING', 'D3',
  'The pieces of one file arrive at the destination out of order. What must happen?',
  'The receiver reassembles them into the right order using information each piece carries',
  ['The whole file must be sent again',
   'The pieces are used in the order they arrive',
   'Out-of-order arrival is impossible'],
  'Pieces may take different routes and arrive in any order, so each carries enough to place it. '
  'Reassembly is the receiver\'s job and is why arriving out of order is ordinary rather than a '
  'failure.')

q('GB_CN_020', 'CN_FAM06_PACKET_REASONING', 'D4',
  'One piece of a file is lost in transit and the file arrives complete anyway. Nothing was sent '
  'again by the application. What happened?',
  'The layer below the application noticed the loss and sent that piece again',
  ['The receiver reconstructed the missing piece from the others',
   'The piece was not really lost',
   'The file was small enough not to need that piece'],
  'The application seeing a complete file while a piece was lost means something below it handled '
  'the loss. Reconstructing missing data from the rest is not something an ordinary transfer '
  'does.',
  evidence='Nothing was sent again by the application')

# =========================================================================
# CN_FAM07_RELIABILITY_CHOICE — D2, D3, D4   (no protocol names)
# =========================================================================
q('GB_CN_021', 'CN_FAM07_RELIABILITY_CHOICE', 'D2',
  'A file is being downloaded. Which kind of delivery suits it?',
  'One that guarantees every piece arrives, resending anything lost',
  ['One that sends pieces once and accepts losses',
   'One that sends every piece twice',
   'Either; a file is unaffected by losses'],
  'A file with a missing piece is corrupt, so completeness matters more than timing. Accepting '
  'losses would produce a file that is quietly wrong.')

q('GB_CN_022', 'CN_FAM07_RELIABILITY_CHOICE', 'D3',
  'A live video call is in progress. Which kind of delivery suits it, and what is given up?',
  'One that accepts losses, giving up perfect quality to avoid waiting for resends',
  ['One that guarantees delivery, giving up nothing',
   'One that guarantees delivery, giving up bandwidth',
   'Either; the choice affects only cost'],
  'A piece resent arrives too late to be shown, so waiting for it delays everything after it. A '
  'brief glitch is preferable to a call that falls steadily further behind.')

q('GB_CN_023', 'CN_FAM07_RELIABILITY_CHOICE', 'D4',
  'A team uses guaranteed delivery for a live audio stream and users report that the audio drifts '
  'further and further behind. The connection loses a small number of pieces. Why does the '
  'guarantee hurt here?',
  'Every lost piece is resent and everything after it waits, so the delay accumulates',
  ['The guarantee makes each piece larger',
   'The guarantee sends every piece twice',
   'The guarantee is unrelated; the network is simply slow'],
  'Guaranteed delivery preserves order as well as completeness, so a resend holds up what follows '
  'it. Losses that would have been an inaudible glitch become a growing lag instead.',
  evidence='The connection loses a small number of pieces')

# =========================================================================
# CN_FAM08_PATH_REASONING — D2, D3, D4
# =========================================================================
q('GB_CN_024', 'CN_FAM08_PATH_REASONING', 'D2',
  'Data sent from one machine to another across the internet travels how?',
  'Through a series of intermediate machines that pass it along',
  ['Directly, over a dedicated connection between the two',
   'Through one intermediate machine, always',
   'Through every machine on the internet'],
  'A path is built from many hops, each forwarding towards the destination. A dedicated connection '
  'between every pair of machines would need an impossible number of links.')

q('GB_CN_025', 'CN_FAM08_PATH_REASONING', 'D3',
  'What do the intermediate machines along a path do with the data?',
  'Forward it towards its destination, without needing to understand its content',
  ['Read the content to decide where to send it',
   'Store a copy of everything they forward',
   'Rewrite the content for the next machine'],
  'Forwarding needs the destination address and nothing more, which is what makes the same '
  'machines able to carry any kind of traffic. Reading the content would be a separate act rather '
  'than a requirement of forwarding.')

q('GB_CN_026', 'CN_FAM08_PATH_REASONING', 'D4',
  'A measurement shows data taking one route from A to B and a different route from B back to A. '
  'Both directions work correctly. Is that a fault?',
  'No; each direction is routed independently and the paths need not match',
  ['Yes; a connection must use one path in both directions',
   'Yes; different paths mean one of them is misconfigured',
   'No; but only because the measurement is unreliable'],
  'Routing decisions are made hop by hop for each direction, so asymmetry is ordinary. Expecting a '
  'single shared path treats a route as a physical circuit rather than a series of independent '
  'decisions.',
  evidence='Both directions work correctly')

# =========================================================================
# CN_FAM09_LAYER_ASSIGNMENT — D2, D3, D4   (responsibilities in words)
# =========================================================================
q('GB_CN_027', 'CN_FAM09_LAYER_ASSIGNMENT', 'D2',
  'Which responsibility covers getting data to the right machine?',
  'Addressing and routing',
  ['Resending anything lost',
   'Deciding what the data means',
   'Encrypting the data'],
  'Each responsibility is a separate job and this one is about destination. Resending is about '
  'reliability and meaning belongs to whatever produced the data.')

q('GB_CN_028', 'CN_FAM09_LAYER_ASSIGNMENT', 'D3',
  'Which responsibility covers noticing that a piece did not arrive and sending it again?',
  'Reliable delivery',
  ['Addressing and routing',
   'Deciding what the data means',
   'Choosing which service receives it'],
  'Detecting loss and repairing it is a distinct job from getting data to a machine. Routing '
  'delivers what it can and reports nothing about what went missing.')

q('GB_CN_029', 'CN_FAM09_LAYER_ASSIGNMENT', 'D4',
  'A team argues that encryption belongs to routing, because routing is what moves the data. '
  'Encryption can be applied without changing how anything is routed. Where does it belong?',
  'To a separate responsibility, since routed data is carried unchanged whether or not it is '
  'encrypted',
  ['To routing, since routing moves the data',
   'To reliable delivery, since encryption protects data',
   'To addressing, since encrypted data still needs an address'],
  'Responsibilities are separated by what would have to change if one were altered, and encrypting '
  'changes nothing about how data is addressed or forwarded. That independence is what makes it a '
  'separate concern.',
  evidence='Encryption can be applied without changing how anything is routed')

# =========================================================================
# CN_FAM10_CAPACITY_AND_DELAY — D2, D3, D4
# =========================================================================
q('GB_CN_030', 'CN_FAM10_CAPACITY_AND_DELAY', 'D2',
  'A large file downloads slowly but steadily. Which is the limit?',
  'Capacity — how much can travel per second',
  ['Delay — how long each piece takes to arrive',
   'Neither; the file is simply large',
   'Both equally'],
  'A steady transfer that takes a long time is limited by how much can flow at once. Delay affects '
  'how soon the first piece appears rather than how fast the bulk arrives.')

q('GB_CN_031', 'CN_FAM10_CAPACITY_AND_DELAY', 'D3',
  'A remote application feels sluggish: every click takes a noticeable moment to respond, though '
  'large files download quickly. Which is the limit?',
  'Delay — each exchange takes time regardless of how little data it carries',
  ['Capacity, which must be low',
   'Neither; the application is slow',
   'Both, since they are the same quantity'],
  'Fast downloads show capacity is ample, and a pause on every small exchange is what delay '
  'produces. The two are separate quantities and are commonly collapsed into the single word '
  '"speed".')

q('GB_CN_032', 'CN_FAM10_CAPACITY_AND_DELAY', 'D4',
  'A team buys a much larger connection to fix an application that felt sluggish, and it feels '
  'exactly the same. Downloads were already fast before the upgrade. What was the real limit?',
  'Delay, which a larger connection does not reduce',
  ['Capacity, and the new connection is faulty',
   'The application, which cannot use the extra capacity',
   'The number of users sharing the connection'],
  'Downloads already being fast showed capacity was not the constraint, so buying more of it '
  'changed nothing. Delay is a property of distance and the path rather than of how much can flow '
  'at once.',
  evidence='Downloads were already fast before the upgrade')

# =========================================================================
# CN_FAM11_LOOKUP_STALENESS — D3, D4
# =========================================================================
q('GB_CN_033', 'CN_FAM11_LOOKUP_STALENESS', 'D3',
  'A name is pointed at a new address. When does everyone start reaching the new machine?',
  'Gradually, as remembered results expire in different places',
  ['Immediately everywhere',
   'Never; the old address is permanent',
   'When every affected machine is restarted'],
  'Lookup results are remembered for a period that differs by location, so the change spreads '
  'rather than switching. That is why a move is planned around the remembering period.')

q('GB_CN_034', 'CN_FAM11_LOOKUP_STALENESS', 'D4',
  'After a name is repointed, some users reach the new machine and others the old one. Both '
  'machines are running and both answer correctly. Where is the difference?',
  'In how recently each user\'s lookup result was obtained',
  ['In the browsers, which are caching the page',
   'In the servers, one of which is misconfigured',
   'In the users\' network connections'],
  'Both machines answering rules out a misconfiguration, and the split is by which address each '
  'user resolved. A browser cache would produce a stale page rather than a connection to a '
  'different machine.',
  evidence='Both machines are running and both answer correctly')

# =========================================================================
# CN_FAM12_BLOCKING_REASONING — D3, D4
# =========================================================================
q('GB_CN_035', 'CN_FAM12_BLOCKING_REASONING', 'D3',
  'A service is unreachable from an office network and reachable from a home connection. The '
  'service is the same in both cases. Where is the block?',
  'On the office network, which is preventing the connection',
  ['On the server, which is refusing the office',
   'In the name lookup, which fails at the office',
   'In the application, which behaves differently at the office'],
  'The service answering from elsewhere shows it is running and reachable, so what differs is the '
  'network in between. A server refusing one network specifically is possible and far less likely '
  'than a network restricting outbound access.')

q('GB_CN_036', 'CN_FAM12_BLOCKING_REASONING', 'D4',
  'A connection to a service fails from one network. The name resolves correctly there, and the '
  'same address is reachable from another network. Which stage is failing?',
  'The connection itself, after the address is known — something on the path is refusing it',
  ['The name lookup, which must be returning the wrong address',
   'The server, which must be down',
   'The application, which must be rejecting the request'],
  'A correct lookup rules out the naming stage, and reachability from elsewhere rules out the '
  'server. What is left is the path between this network and the service.',
  evidence='The name resolves correctly there, and the same address is reachable from another '
           'network')

# =========================================================================
# CN_FAM13_CONNECTION_DIAGNOSIS — D3, D4, D5 x3
# =========================================================================
q('GB_CN_037', 'CN_FAM13_CONNECTION_DIAGNOSIS', 'D3',
  'A connection attempt reports that the name could not be found. Which stage failed?',
  'The lookup, before any connection was attempted',
  ['The connection, which was refused',
   'The server, which did not answer',
   'The application, which rejected the request'],
  'Failing to find a name means no address was obtained, so nothing was ever sent. Every later '
  'stage requires an address to exist.')

q('GB_CN_038', 'CN_FAM13_CONNECTION_DIAGNOSIS', 'D4',
  'A connection attempt reports that it was refused. The name resolved to an address without any '
  'trouble. Which stage failed?',
  'The connection, because something at the address actively declined it',
  ['The lookup, which returned nothing',
   'The application, which returned an error',
   'Nothing; a refusal is a normal response'],
  'A refusal means the address was reached and something answered by declining, which places the '
  'failure after the lookup and before any application exchange. An application error would have '
  'required a connection to succeed first.',
  evidence='The name resolved to an address without any trouble')

q('GB_CN_039', 'CN_FAM13_CONNECTION_DIAGNOSIS', 'D5',
  'A connection attempt resolves the name and then simply waits, with no refusal and no answer. '
  'What are the two likely causes, and what would separate them?',
  'Nothing is listening at that address, or something silently discards the traffic; whether the '
  'address is reachable at all separates them',
  ['The name is wrong, or the server is down; a second lookup separates them',
   'The application is slow, or the file is large; waiting longer separates them',
   'There is only one cause: the server is down'],
  'A refusal means something answered, and silence means nothing did — which happens both when the '
  'address is unreachable and when traffic is dropped on the way. Establishing whether the address '
  'responds to anything at all is what tells them apart.',
  mode='TRANSFER', hinge='with no refusal and no answer')

q('GB_CN_040', 'CN_FAM13_CONNECTION_DIAGNOSIS', 'D5',
  'A connection succeeds and the reply takes eight seconds. Is that a connection failure?',
  'No; the connection worked and something after it is slow, which is a different investigation',
  ['Yes; a slow reply is a failed connection',
   'Yes; the connection must have been retried several times',
   'No; eight seconds is normal for any network'],
  'A slow answer is an answer, so every stage of connecting succeeded. Treating slowness as '
  'failure sends the investigation to the network when the delay may be entirely in the '
  'application.',
  mode='TRANSFER', hinge='the reply takes eight seconds')

q('GB_CN_041', 'CN_FAM13_CONNECTION_DIAGNOSIS', 'D5',
  'Three failures produce three different symptoms: a name that cannot be found, a refusal, and '
  'silence. Why is that useful?',
  'Each symptom names a different stage, so the symptom alone narrows the investigation before '
  'anything is tried',
  ['It is not useful; all three mean the service is unavailable',
   'It is useful only because the messages can be searched for',
   'It is useful because each has a standard fix'],
  'The stages fail in observably different ways, which turns the first symptom into evidence about '
  'where to look. Treating all three as "unavailable" discards that information at the outset.',
  mode='TRANSFER', hinge='a name that cannot be found, a refusal, and silence')

# =========================================================================
# CN_FAM14_VISIBILITY_TRANSFER — D4, D5 x4
# =========================================================================
q('GB_CN_042', 'CN_FAM14_VISIBILITY_TRANSFER', 'D4',
  'A password is sent over an unencrypted connection on a shared network. The page looked ordinary '
  'and nothing appeared to go wrong. What can someone on the same network learn?',
  'The password itself, along with everything else that was sent',
  ['Only which site was contacted',
   'Nothing, since the data is in pieces',
   'Only the length of what was sent'],
  'Without encryption the contents travel in the clear and anyone on the path can read them. That '
  'the exchange looked ordinary is exactly why the risk is invisible to the user.',
  evidence='The page looked ordinary and nothing appeared to go wrong')

q('GB_CN_043', 'CN_FAM14_VISIBILITY_TRANSFER', 'D5',
  'The connection is encrypted. What can someone on the path still learn?',
  'Which host was contacted, roughly how much was exchanged and when',
  ['Nothing at all',
   'The full contents, but not who sent them',
   'Only whether the connection succeeded'],
  'Encryption conceals the contents and leaves the shape of the traffic visible — who was '
  'contacted, how much and when. Claiming nothing is visible is the overstatement that leads '
  'people to rely on it too far.',
  mode='TRANSFER', hinge='The connection is encrypted')

q('GB_CN_044', 'CN_FAM14_VISIBILITY_TRANSFER', 'D5',
  'A user believes a private home network makes their traffic unreadable. Is that so?',
  'No; the traffic leaves the network and is readable on the path unless it is encrypted',
  ['Yes; a private network is not visible to others',
   'Yes, provided nobody else knows the network password',
   'No; but only for traffic to sites in other countries'],
  'A private network controls who can join it and nothing about what happens once traffic leaves. '
  'The protection people are relying on is encryption, which is a separate matter from the '
  'network being private.',
  mode='TRANSFER', hinge='a private home network makes their traffic unreadable')

q('GB_CN_045', 'CN_FAM14_VISIBILITY_TRANSFER', 'D5',
  'A page shows a padlock and a user concludes the site is safe to give their bank details to. '
  'What has the padlock actually established?',
  'That the connection is encrypted and the site is the one the name refers to — not that the '
  'operator is honest',
  ['That the site is trustworthy',
   'That the site is a bank',
   'That the data will be stored securely'],
  'The indicator says the exchange is protected and the name matches, which any site including a '
  'fraudulent one can obtain. Nothing about it speaks to what happens to the data afterwards.',
  mode='TRANSFER', hinge='a user concludes the site is safe to give their bank details to')

q('GB_CN_046', 'CN_FAM14_VISIBILITY_TRANSFER', 'D5',
  'Encrypting traffic costs a little time on every exchange. When is that cost not worth paying?',
  'Almost never for anything crossing a network; the cost is small and the alternative is exposure '
  'of everything sent',
  ['Whenever the data is not secret',
   'Whenever the network is private',
   'Whenever the connection is already slow'],
  'The cost is a small and fixed overhead, and the exposure it prevents applies to everything '
  'including data nobody thought was sensitive. Judging each exchange separately is how '
  'credentials end up travelling in the clear.',
  mode='TRADEOFF', hinge='Encrypting traffic costs a little time on every exchange')

# =========================================================================
# CN_FAM15_REACHABILITY_TRANSFER — D4, D5 x3
# =========================================================================
q('GB_CN_047', 'CN_FAM15_REACHABILITY_TRANSFER', 'D4',
  'A service runs on a developer\'s machine and must be reachable by a colleague in the same '
  'office. Sharing the local address did not work. What must change?',
  'The colleague must use the machine\'s address on the office network, and the service must accept '
  'connections from it',
  ['The colleague must use the same local address',
   'The service must be moved to a different port',
   'The colleague must install the same browser'],
  'A local address means "this machine" wherever it is used, so it can never point at somebody '
  'else\'s. What is needed is an address that identifies the machine on the shared network, and a '
  'service willing to answer on it.',
  evidence='Sharing the local address did not work')

q('GB_CN_048', 'CN_FAM15_REACHABILITY_TRANSFER', 'D5',
  'The same service must now be reachable from the internet. What is needed beyond an office '
  'address?',
  'An address reachable from outside, and a path opened to it through whatever stands in the way',
  ['A public name pointing at the office address',
   'A different port number',
   'Nothing further; office addresses are reachable from anywhere'],
  'An address valid only within a network cannot be routed from outside, so a reachable address '
  'comes first and a path through has to be opened. A name pointing at an unreachable address '
  'resolves and still fails.',
  mode='TRANSFER', hinge='must now be reachable from the internet')

q('GB_CN_049', 'CN_FAM15_REACHABILITY_TRANSFER', 'D5',
  'A public name is created and points at the service\'s address, and it is still unreachable from '
  'outside. What does that show about names?',
  'A name only supplies an address; it cannot make an unreachable address reachable',
  ['The name was created incorrectly',
   'Names take time to work and this one is not ready',
   'The service must be restarted for the name to take effect'],
  'Resolution and reachability are separate stages, and a name settles only the first. Propagation '
  'delay is real and would produce the same symptom, which is why the address itself has to be '
  'checked rather than assumed.',
  mode='TRANSFER', hinge='A public name is created and points at the service\'s address')

q('GB_CN_050', 'CN_FAM15_REACHABILITY_TRANSFER', 'D5',
  'Making a local service reachable from the internet is easy to do and easy to do badly. What is '
  'the trade?',
  'It gains access for anyone who needs it and exposes the service to everyone else, so what it '
  'accepts has to be considered',
  ['There is no trade; reachability is simply a setting',
   'It costs only performance, since more traffic arrives',
   'It costs only the effort of configuring it'],
  'Opening a path does not distinguish between the colleague who needs access and everything else '
  'that will find it. The cost is not effort or speed but that the service now answers to the '
  'whole internet.',
  mode='TRADEOFF', hinge='easy to do and easy to do badly')
