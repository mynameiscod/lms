/**
 * T_NETWORKING — the complete topic, nine units. DIRECTION: CLOUD_DEVOPS and CYBERSECURITY.
 *
 * ── WHY THIS TOPIC ────────────────────────────────────────────────────────────────────────
 *
 * Direction inventory for the two directions with the least of it, and the strong profiles
 * sample CLOUD_DEVOPS among their four. Nine units: seven GUIDED concepts, a DEBUG and a
 * PRACTICE, plus a STANDARD-depth project.
 *
 * ── THE LINE THIS TOPIC HOLDS ─────────────────────────────────────────────────────────────
 *
 * Networking is usually taught as the OSI model and a list of acronyms, which produces students
 * who can recite seven layers and cannot work out why a site will not load. Every unit here is
 * organised around the CHAIN a request travels — name, address, port, transport, encryption —
 * because that chain is also the diagnostic order. A student should finish able to say which
 * link is broken, which is the only networking skill most developers ever need.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const NETWORKING_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'T_NETWORKING_WHAT_IS_A_NETWORK',
    notes: `A network is machines exchanging messages. Everything else is detail about how the
message gets there — and the detail is organised in **layers**, each of which lets you ignore
the one below.

**The chain a request travels**, which is the order everything in this topic follows:

1. You type a **name** — \`example.com\`
2. **DNS** turns it into an **address** — 93.184.216.34
3. The **port** selects which service on that machine — 443
4. **TCP** opens a reliable connection to that address and port
5. **TLS** encrypts it, because the port was 443
6. **HTTP** carries the actual request
7. **IP routing** moves the packets across many networks to get there

**Why layers.** Your browser does not know whether the packets travel over fibre, wifi or a
mobile network, and it does not need to. Each layer offers a service to the one above and hides
how it is done. That is why the same HTTP request works over every physical medium ever
invented, including ones that did not exist when HTTP was designed.

**You will hear about the OSI model's seven layers.** It is a reference model and it is worth
knowing the words exist. In practice four matter:

| Layer | Does what | You meet it as |
|---|---|---|
| Link | One hop, machine to machine | Wifi, Ethernet |
| Internet | Addressing and routing across networks | IP addresses |
| Transport | Getting data to the right program, reliably or not | TCP, UDP, ports |
| Application | What the data means | HTTP, DNS, SSH |

**Why the chain is the useful framing.** When something does not work, the question is always
*which link broke*: the name did not resolve, the address is unreachable, the port is closed,
the connection was refused, the certificate is wrong, or the application returned an error.
Those are six different problems with six different fixes, and they present almost identically
to a user — "it doesn't work".

Learning the chain is learning the diagnostic order, which is what the tools unit builds on.`,
    mcqs: [
      mcq('Why is networking organised in layers?',
        [['Each layer offers a service and hides how it is done, so the one above can ignore it', true],
          ['To make it easier to teach', false],
          ['For security', false],
          ['To allow more addresses', false]],
        'It is why the same HTTP request works over media that did not exist when HTTP was designed.'),
      mcq('What does DNS contribute to the chain?',
        [['Turning a name into an IP address', true],
          ['Encrypting the connection', false],
          ['Choosing the port', false],
          ['Routing the packets', false]],
        'One link in the chain, and a very common place for it to break independently of everything else.'),
      mcq('A user reports "it does not work". Why is the chain the useful framing?',
        [['Six different failures present identically, and each has a different fix', true],
          ['It is faster to explain', false],
          ['Users understand layers', false],
          ['It identifies the cause automatically', false]],
        'Name, address, port, connection, certificate, application — the chain is also the diagnostic order.'),
      mcq('Which layer are ports part of?',
        [['Transport', true], ['Internet', false], ['Link', false], ['Application', false]],
        'The address gets you to the machine; the port gets you to the right program on it.'),
    ],
    checkpoint: [
      mcq('Your browser works identically on wifi and on mobile data because:',
        [['Lower layers hide the medium from the ones above', true],
          ['Both use the same IP address', false],
          ['HTTP detects the connection type', false],
          ['The server adapts', false]],
        'The defining benefit of layering, and the reason protocols outlive the hardware they were designed on.'),
      mcq('In the chain, what comes immediately after resolving the name?',
        [['Connecting to the address on a particular port', true],
          ['Encrypting', false],
          ['Sending the HTTP request', false],
          ['Routing', false]],
        'Name to address, then address plus port to a connection. Keeping the order straight is what makes diagnosis systematic.'),
    ],
  },
  {
    unitCode: 'T_NETWORKING_IP_ADDRESSES',
    notes: `An IP address identifies a machine on a network. Two things about them cause most of
the confusion: there are two versions, and there are two kinds.

**IPv4** — four numbers, each 0-255: \`192.168.1.10\`. About 4 billion possible, which ran out.

**IPv6** — much longer, hexadecimal: \`2001:0db8::1\`. Enormous address space. You will meet it
and rarely need to type it.

**Private versus public**, which is the distinction that actually matters day to day.

Private ranges, reserved and not routable on the public internet:

    10.0.0.0    - 10.255.255.255
    172.16.0.0  - 172.31.255.255
    192.168.0.0 - 192.168.255.255

Your laptop almost certainly has one. So does everybody else's — \`192.168.1.10\` is not unique
in the world, it is unique on your network.

**NAT is what makes that work.** Your router has one public address and translates on the way
out, remembering which internal machine each conversation belongs to so replies come back
correctly. It is why many devices share one public address, and why **an inbound connection to
your laptop does not work by default** — the router receives it and has no record saying where
to send it.

That single fact explains an enormous amount: why you must configure port forwarding to host
something at home, why peer-to-peer software needs workarounds, and why "it works locally"
routinely fails to mean "it works from outside".

**\`localhost\` / \`127.0.0.1\`** is the machine itself. Traffic never reaches a network card. A
server bound only to \`127.0.0.1\` is unreachable from any other machine — a common and
confusing deployment problem, because it works perfectly on the machine you are testing from.

**Binding to \`0.0.0.0\`** means all interfaces. That is usually what a server in a container
needs, and it is also why "it works in dev and not in Docker" is so often a binding issue
rather than a networking one.

**Subnet masks and CIDR**, briefly: \`/24\` means the first 24 bits identify the network, leaving
256 addresses. Machines in the same subnet talk directly; anything else goes via the gateway.`,
    mcqs: [
      mcq('Your laptop has 192.168.1.10. What does that tell you?',
        [['It is a private address, unique only on your local network', true],
          ['It is publicly reachable', false],
          ['It is an IPv6 address', false],
          ['It is unique worldwide', false]],
        'Private ranges are not routable on the public internet, and the same address exists on millions of home networks.'),
      mcq('Why does an inbound connection to your laptop fail by default?',
        [['NAT has no record telling the router which internal machine it belongs to', true],
          ['Firewalls block everything', false],
          ['Laptops cannot accept connections', false],
          ['The ISP forbids it', false]],
        'One fact that explains port forwarding, peer-to-peer workarounds, and why "works locally" is not "works from outside".'),
      mcq('A server bound to 127.0.0.1 is reachable from:',
        [['Only the machine it runs on', true],
          ['Any machine on the LAN', false],
          ['Anywhere', false],
          ['Only via the gateway', false]],
        'And it works perfectly on the machine you are testing from, which is what makes it such a confusing deployment failure.'),
      mcq('A service works in development and not in Docker. A likely networking cause is:',
        [['It binds to 127.0.0.1 rather than 0.0.0.0', true],
          ['The image is too large', false],
          ['DNS is missing', false],
          ['The port is in use', false]],
        'Inside a container 127.0.0.1 is the container itself, so nothing outside it can connect.'),
    ],
    checkpoint: [
      mcq('Many devices in a home share one public IP because of:',
        [['NAT translating outbound connections and tracking the replies', true],
          ['IPv6', false], ['DNS', false], ['Subnetting', false]],
        'The router remembers which internal machine each conversation belongs to, which is also why unsolicited inbound traffic has nowhere to go.'),
      mcq('`/24` in CIDR notation means:',
        [['The first 24 bits identify the network, leaving 256 addresses', true],
          ['24 machines', false],
          ['Version 24 of the protocol', false],
          ['A 24-second timeout', false]],
        'Machines inside the subnet talk directly; anything outside it goes via the gateway.'),
    ],
  },
  {
    unitCode: 'T_NETWORKING_DNS',
    notes: `DNS turns a name into an address. It is the first link in the chain and a
disproportionate share of "the site is down" is actually "the name did not resolve".

**What happens when you type a name:**

1. The browser checks its own cache
2. Then the operating system's cache, and the \`hosts\` file
3. Then it asks a **resolver** — usually your ISP's, or 8.8.8.8, or 1.1.1.1
4. The resolver walks the hierarchy: root servers → \`.com\` → \`example.com\`'s nameservers
5. The answer comes back and is **cached**, for a duration set by the record's TTL

**Record types worth knowing:**

| Type | Holds |
|---|---|
| A | An IPv4 address |
| AAAA | An IPv6 address |
| CNAME | An alias to another name |
| MX | Where mail for this domain goes |
| TXT | Arbitrary text, used for domain verification |
| NS | Which nameservers are authoritative |

**Caching is the source of nearly every DNS surprise.** You change a record and it does not take
effect, because resolvers all over the world are still serving the old answer until its TTL
expires. **Lower the TTL BEFORE a planned change**, not during it — lowering it at the moment
of the change does nothing for anybody already holding the old value.

**"The site is up but the name is broken"** is a real and separate state. The server is running
and reachable by IP; the name does not resolve, or resolves to the wrong address. A user cannot
distinguish it from the server being down, and the fixes are entirely different.

**How to tell in ten seconds:**

    $ dig example.com +short          # what does the name resolve to?
    $ curl -I https://93.184.216.34   # is the server reachable by address?

If the second works and the first returns nothing, it is DNS. **Checking name resolution
separately before anything else is the single highest-value diagnostic habit in this topic**,
because it is fast and it eliminates or confirms the first link of the chain.

**Propagation is a misleading word.** Nothing is pushed anywhere. Old cached answers simply
expire, at different times in different places, which is why a change appears to reach people
gradually.`,
    mcqs: [
      mcq('You change a DNS record and it does not take effect. Most likely cause?',
        [['Resolvers are still serving the cached old answer until the TTL expires', true],
          ['The record is invalid', false],
          ['The nameserver is down', false],
          ['Propagation takes days inherently', false]],
        'Nothing is pushed anywhere. Old answers expire at different times in different places, which is what "propagation" actually describes.'),
      mcq('When should you lower a TTL before a planned change?',
        [['In advance — lowering it during the change helps nobody already holding the old value', true],
          ['At the moment of the change', false],
          ['Afterwards', false],
          ['It makes no difference', false]],
        'Anybody who has already cached the old record cached the old TTL with it.'),
      mcq('`dig example.com +short` returns nothing but `curl` to the IP works. Conclusion?',
        [['The server is fine and name resolution is broken', true],
          ['The server is down', false],
          ['A firewall is blocking', false],
          ['The certificate expired', false]],
        'A real and separate state that a user cannot distinguish from an outage, with an entirely different fix.'),
      mcq('A CNAME record holds:',
        [['An alias pointing at another name', true],
          ['An IPv4 address', false],
          ['A mail server', false],
          ['Arbitrary text', false]],
        'Which is why resolving one involves a further lookup, and why chains of CNAMEs slow things down.'),
    ],
    checkpoint: [
      mcq('The highest-value first diagnostic when a site will not load is:',
        [['Check whether the name resolves, separately from anything else', true],
          ['Restart the server', false],
          ['Check the certificate', false],
          ['Check the firewall', false]],
        'It takes seconds and it either eliminates or confirms the first link in the chain.'),
      mcq('Why is "DNS propagation" a misleading term?',
        [['Nothing is pushed — cached answers simply expire at different times', true],
          ['It is instant', false],
          ['It only applies to A records', false],
          ['It is not misleading', false]],
        'The word suggests a broadcast that never happens, which is why people wait rather than checking TTLs.'),
    ],
  },
  {
    unitCode: 'T_NETWORKING_PORTS',
    notes: `An IP address gets you to a machine. A port gets you to the right **program** on it.

One server may run a website, a database and SSH simultaneously. They are distinguished by port
number — 16 bits, so 0 to 65535.

**The ones worth memorising:**

| Port | Service |
|---|---|
| 22 | SSH |
| 80 | HTTP |
| 443 | HTTPS |
| 3306 | MySQL |
| 5432 | PostgreSQL |
| 6379 | Redis |
| 27017 | MongoDB |

**Ports below 1024 are privileged** on Unix — binding to them requires root. This is why
development servers default to 3000 or 8080, and why a container usually runs the app on 8080
and maps it to 80 from outside.

**A connection is identified by four things**, not one: source address, source port,
destination address, destination port. That is why thousands of clients can talk to port 443 on
one server at once — each conversation has a different source, so the tuple is unique.

**The three states, and telling them apart is the whole diagnostic value of this unit:**

- **Open** — something is listening and accepted the connection
- **Closed** — nothing is listening; the machine actively refuses, and you get
  "connection refused" **immediately**
- **Filtered** — a firewall dropped the packet silently; you get **a timeout**

**Refused and timed out mean different things and point at different fixes.** Refused means you
reached the machine and no program was listening — so the service is not running, or is on a
different port, or is bound to the wrong interface. Timed out means nothing came back at all —
a firewall, a security group, a wrong address, or the machine is off.

Confusing these is the commonest waste of time in network debugging: people restart a service
that was never the problem because a firewall was dropping the packets.

**What is listening here?**

    $ ss -tlnp        # Linux: TCP, listening, numeric, with process
    $ netstat -an | grep LISTEN

Check this before blaming the network. A service bound to \`127.0.0.1\` shows as listening and is
still unreachable from anywhere else — which brings the previous unit's point back as a concrete
diagnosis.`,
    mcqs: [
      mcq('"Connection refused" immediately means:',
        [['You reached the machine and nothing was listening on that port', true],
          ['A firewall blocked it', false],
          ['The address is wrong', false],
          ['The machine is off', false]],
        'Reaching the machine is real information: the service is not running, is on another port, or is bound to the wrong interface.'),
      mcq('A connection attempt that times out suggests:',
        [['Something dropped the packet silently — a firewall, or the wrong address', true],
          ['The service is not running', false],
          ['The port is closed', false],
          ['A certificate problem', false]],
        'Silence rather than refusal. Confusing this with refused is the commonest waste of time in network debugging.'),
      mcq('Why can thousands of clients use port 443 on one server simultaneously?',
        [['A connection is identified by source address and port as well as destination', true],
          ['The server opens more ports', false],
          ['Connections are queued', false],
          ['Each gets a time slice', false]],
        'The four-part tuple is unique per conversation even though the destination is shared.'),
      mcq('Development servers default to 3000 or 8080 because:',
        [['Ports below 1024 require root on Unix', true],
          ['Those ports are faster', false],
          ['80 is reserved for browsers', false],
          ['Convention only', false]],
        'Which is also why a container runs the app on 8080 and maps it to 80 from outside.'),
    ],
    checkpoint: [
      mcq('Before blaming the network for an unreachable service, check:',
        [['What is actually listening, with ss -tlnp or netstat', true],
          ['The DNS record', false],
          ['The certificate', false],
          ['The route', false]],
        'A service bound to 127.0.0.1 appears as listening and is still unreachable from anywhere else.'),
      mcq('Refused and timed out point at different fixes because:',
        [['Refused means you reached the machine; timed out means nothing came back at all', true],
          ['They are the same', false],
          ['Refused is always a firewall', false],
          ['Timeout means the service crashed', false]],
        'People restart services that were never the problem because a firewall was dropping packets.'),
    ],
  },
  {
    unitCode: 'T_NETWORKING_TCP_UDP',
    notes: `Two transport protocols, and the choice between them is a genuine engineering
trade-off rather than one being better.

**TCP — reliable and ordered.**

- Establishes a connection first, with a three-way handshake
- Guarantees delivery: lost packets are retransmitted
- Guarantees order: data arrives in the sequence it was sent
- Controls congestion: slows down when the network is struggling

Costs: the handshake adds a round trip before any data moves, and retransmission means a lost
packet **delays everything behind it** while it is recovered.

Used by: HTTP, SSH, email, databases — anything where missing or reordered data would be wrong.

**UDP — fast and lossy.**

- No connection, no handshake. Send and hope.
- No delivery guarantee, no ordering guarantee
- No congestion control unless the application adds it

Costs: you must handle loss yourself, if it matters.

Used by: DNS, video calls, live streaming, games.

**Why a video call uses UDP, which is the example that makes the trade-off click.** A packet
carrying 20 milliseconds of audio goes missing. TCP would stop and retransmit it, and by the
time it arrived the moment has passed — you would hear a gap, then everything delayed behind
it. UDP simply loses those 20ms and carries on. **A tiny glitch beats a growing delay**, and
for a live conversation that is not a compromise, it is the correct behaviour.

**The general rule:** if late data is useless, use UDP. If missing data is wrong, use TCP.

**The three-way handshake** — SYN, SYN-ACK, ACK — is why establishing a TCP connection costs a
round trip before anything useful happens. Over a long-distance link that is real latency, and
it is why connection reuse and keep-alive matter so much for performance.

**HTTP/3 uses UDP**, which surprises people. It rebuilds reliability on top, in a way that
avoids one lost packet blocking unrelated streams — the head-of-line blocking problem TCP has
by design. The trade-off was not abolished; it was moved somewhere the application could make
better decisions about it.`,
    mcqs: [
      mcq('Why does a video call use UDP?',
        [['Retransmitting 20ms of stale audio is worse than losing it — late data is useless', true],
          ['UDP is more secure', false],
          ['TCP does not support audio', false],
          ['UDP uses less bandwidth', false]],
        'A tiny glitch beats a growing delay. For live conversation that is the correct behaviour, not a compromise.'),
      mcq('The TCP three-way handshake costs:',
        [['A round trip before any data moves', true],
          ['Nothing measurable', false],
          ['Three round trips', false],
          ['Extra bandwidth only', false]],
        'Real latency on a long link, and the reason connection reuse and keep-alive matter so much.'),
      mcq('The general rule for choosing is:',
        [['Late data useless means UDP; missing data wrong means TCP', true],
          ['Always TCP unless speed matters', false],
          ['UDP for small data', false],
          ['TCP for anything important', false]],
        'It frames the choice as a property of the data rather than a preference about protocols.'),
      mcq('HTTP/3 uses UDP in order to:',
        [['Avoid one lost packet blocking unrelated streams, as TCP does by design', true],
          ['Be faster to implement', false],
          ['Reduce encryption cost', false],
          ['Support older networks', false]],
        'The trade-off was moved rather than abolished — reliability is rebuilt where the application can make better decisions.'),
    ],
    checkpoint: [
      mcq('TCP retransmits a lost packet. What happens to data sent after it?',
        [['It waits — head-of-line blocking delays everything behind the lost packet', true],
          ['It is delivered immediately', false],
          ['It is also retransmitted', false],
          ['It is discarded', false]],
        'Ordering is a guarantee, and guaranteeing it means later data cannot be delivered first.'),
      mcq('DNS uses UDP primarily because:',
        [['A query and reply are small and a retry is cheaper than a handshake', true],
          ['DNS data is unimportant', false],
          ['UDP is encrypted', false],
          ['TCP cannot carry DNS', false]],
        'Paying a round trip to set up a connection for one small exchange would double the cost of every lookup.'),
    ],
  },
  {
    unitCode: 'T_NETWORKING_SECURITY_BASICS',
    notes: `HTTPS is HTTP over TLS. It provides three things, and they are separate — knowing which
one a warning is about is most of the value here.

**1. Encryption.** Nobody between you and the server can read the traffic. Without it, anybody
on the same wifi, the network operator, and every intermediate hop can read everything —
including passwords and session cookies, in plain text.

**2. Integrity.** Nobody can modify it undetected. Without it, an intermediary can inject
content into a page, which has been done at scale by ISPs inserting advertising.

**3. Authentication.** You are talking to who you think. **This is the one people
misunderstand.**

**What a certificate actually proves.** That the holder controls the domain name. That is all.
It does not prove the organisation is honest, legitimate, or safe. A phishing site at
\`paypaI-secure.com\` can hold a perfectly valid certificate, and its padlock is genuine.

**"It has a padlock so it is safe" is wrong**, and it is worth saying plainly. The padlock means
the connection is private and you are connected to the name in the address bar. Whether that
name is one you should trust is a separate question the browser cannot answer.

**How the trust chain works.** Your browser ships with a list of Certificate Authorities it
trusts. A CA signs a certificate after verifying domain control. Your browser checks the
signature chains up to one it already trusts. So trust is delegated — and a compromised CA is
a serious event for exactly that reason.

**The common warnings, and what each means:**

- **Expired** — certificates have a lifetime and this one passed it. Usually somebody forgot to
  renew; occasionally it means something worse.
- **Name mismatch** — the certificate is for a different domain. Could be a misconfiguration,
  could be an interception.
- **Self-signed** — nobody vouched for it. Fine on your own development machine, meaningless
  from a stranger.
- **Untrusted issuer** — signed by a CA your browser does not trust.

**Do not teach yourself to click through these.** The habit is the vulnerability: the warnings
are almost always a misconfiguration, and the one time they are not is the time that matters.

**What HTTPS does not protect.** Which site you visited is still visible — the domain name is
sent in the clear during setup, and DNS lookups are usually unencrypted. Traffic size and timing
leak information. And it protects the connection, not the server: an encrypted connection to a
compromised server is an encrypted connection to a compromised server.`,
    mcqs: [
      mcq('What does a valid certificate prove?',
        [['That the holder controls that domain name — nothing more', true],
          ['That the organisation is legitimate', false],
          ['That the site is safe', false],
          ['That the content is accurate', false]],
        'A phishing site can hold a perfectly valid certificate, and its padlock is genuine.'),
      mcq('A "name mismatch" certificate warning means:',
        [['The certificate is for a different domain — misconfiguration, or interception', true],
          ['The certificate expired', false],
          ['The CA is untrusted', false],
          ['The connection is unencrypted', false]],
        'Two very different causes with the same symptom, which is exactly why clicking through is a bad habit.'),
      mcq('Which does HTTPS NOT hide?',
        [['Which site you visited', true],
          ['The page content', false],
          ['Submitted passwords', false],
          ['Session cookies', false]],
        'The domain is visible during setup and DNS is usually unencrypted, so the destination leaks even when the content does not.'),
      mcq('Why is a self-signed certificate acceptable in development and not from a stranger?',
        [['Nobody vouched for it — you trust it only because you created it', true],
          ['It uses weaker encryption', false],
          ['It expires sooner', false],
          ['It is not acceptable anywhere', false]],
        'The encryption is identical. What is missing is the authentication, which is precisely what matters with a stranger.'),
    ],
    checkpoint: [
      mcq('A site shows a padlock. What can a user conclude?',
        [['The connection is private and matches the name shown — not that the site is trustworthy', true],
          ['The site is safe', false],
          ['The company is verified', false],
          ['The content is accurate', false]],
        'The browser can confirm who you are connected to and cannot judge whether they deserve trust.'),
      mcq('Why is clicking through certificate warnings a serious habit?',
        [['They are usually misconfiguration, and the one time they are not is the time that matters', true],
          ['It is slow', false],
          ['It disables encryption', false],
          ['It is not serious', false]],
        'The habit itself is the vulnerability, because it removes the only signal you would get.'),
    ],
  },
  {
    unitCode: 'T_NETWORKING_TOOLS',
    notes: `When something will not connect, work **along the chain** and stop at the first link
that fails. Guessing is slower than four commands.

**1. Does the name resolve?**

    $ dig example.com +short
    $ nslookup example.com

Nothing back means DNS. Stop here — everything after depends on it.

**2. Is the machine reachable?**

    $ ping 93.184.216.34

Replies mean the machine is up and routable. **No replies does NOT mean it is down** — plenty
of hosts block ICMP deliberately, so a failed ping is weak evidence. Treat success as
informative and failure as inconclusive.

**3. Where does the path break?**

    $ traceroute example.com

Shows each hop. Where it stops is roughly where the problem is — though many routers do not
respond to traceroute either, so gaps in the middle are normal and only a consistent stop
matters.

**4. Is the port open?**

    $ nc -zv example.com 443
    $ curl -v https://example.com

**Read the failure precisely**, because the word tells you the layer:

| Message | Means |
|---|---|
| Could not resolve host | DNS — link 1 |
| Connection refused | Reached the machine, nothing listening — link 3 |
| Connection timed out | Dropped silently, likely a firewall — link 3 |
| SSL certificate problem | Connected fine; the certificate is the issue — link 5 |
| 404 / 500 | The whole chain worked; this is the application — link 6 |

**That table is the unit.** A 500 error means networking is entirely fine and the problem is
somebody's code. A timeout means packets are not arriving and no amount of restarting the
application will help. Knowing which you have saves hours routinely.

**\`curl -v\` is the single most useful command here**, because it narrates the whole chain —
resolution, connection, TLS handshake, request, response — and tells you exactly where it
stopped.

**Check from more than one place.** If it fails from your machine and works from elsewhere, the
problem is local: your DNS, your firewall, your VPN. That comparison takes seconds and
eliminates half the possibilities.`,
    coding: [
      {
        title: 'Match the symptom to the broken link',
        description: `For each symptom, print the number of the chain link that is broken, one per line, in order.

Symptoms:
1. \`curl: (6) Could not resolve host\`
2. \`curl: (7) Failed to connect: Connection refused\`
3. \`curl: (60) SSL certificate problem\`
4. \`HTTP/1.1 500 Internal Server Error\`

Links:
1 = DNS / name resolution
2 = port / listening service
3 = TLS / certificate
4 = the application itself

Print four lines: the link number for symptom 1, then 2, then 3, then 4.`,
        starter: `# Print four numbers, one per line.
`,
        language: 'python',
        tests: [
          // Hidden deliberately: the task takes no input, so a visible case would print the key.
          { input: '', expectedOutput: '1\n2\n3\n4', isHidden: true },
        ],
      },
    ],
    mcqs: [
      mcq('`ping` gets no reply. What can you conclude?',
        [['Very little — many hosts block ICMP, so failure is inconclusive', true],
          ['The host is down', false],
          ['DNS is broken', false],
          ['The port is closed', false]],
        'Success is informative; failure is not. Treating a failed ping as proof of an outage sends people down the wrong path.'),
      mcq('`curl` reports a 500 error. What does that tell you about the network?',
        [['It is entirely fine — the whole chain worked and the application failed', true],
          ['A firewall is interfering', false],
          ['DNS is misconfigured', false],
          ['The certificate is invalid', false]],
        'Reaching an application error means every link before it succeeded, which eliminates the whole network as a cause.'),
      mcq('"Connection refused" versus "connection timed out":',
        [['Refused means you reached the machine; timed out means packets vanished', true],
          ['They are equivalent', false],
          ['Refused means DNS failed', false],
          ['Timed out means the app crashed', false]],
        'Different layers and different fixes, and confusing them is the classic waste of an afternoon.'),
      mcq('Why is `curl -v` the most useful single command here?',
        [['It narrates resolution, connection, TLS and response, showing exactly where it stopped', true],
          ['It is fastest', false],
          ['It works without DNS', false],
          ['It bypasses firewalls', false]],
        'One command covering the whole chain, which is why it usually replaces three others.'),
    ],
    checkpoint: [
      mcq('It fails from your machine and works from a colleague\'s. What does that establish?',
        [['The problem is local — your DNS, firewall or VPN', true],
          ['The server is intermittent', false],
          ['A routing problem upstream', false],
          ['Nothing', false]],
        'A comparison that takes seconds and eliminates half the possible causes immediately.'),
      mcq('You should stop diagnosing at:',
        [['The first link in the chain that fails', true],
          ['The last link', false],
          ['The application layer', false],
          ['After checking every link', false]],
        'Everything after a broken link depends on it, so results beyond that point carry no information.'),
    ],
  },
  {
    unitCode: 'T_NETWORKING_PRACTICE',
    notes: `No new concepts. These exercises trace and diagnose real connections using the chain
and the tools: \`dig\`, \`ping\`, \`traceroute\`, \`nc\`, \`curl -v\`, \`ss\`.

**Work on real machines and real sites.** A networking exercise on paper teaches the vocabulary;
running the commands and reading the actual output teaches the skill, because the output is
never quite as tidy as an example.

**The method, every time:**

1. **State what you expect** before running anything. "This should resolve to an address, connect
   on 443, present a valid certificate and return 200."
2. **Work along the chain in order.** Name, address, port, connection, certificate, application.
3. **Stop at the first failure.** Everything after it is meaningless.
4. **Say which layer**, in those words, before proposing a fix.
5. **Compare from a second location** when the result is surprising.

**The checklist:**

- Did I check name resolution separately, or assume it?
- Do I know the difference between what refused and what timed out here?
- Am I treating a failed ping as proof? It is not.
- Is the service listening on the interface I am connecting to, or only on localhost?
- Have I read the exact error text, or paraphrased it in my head?

**Exercises worth doing on your own machine:**

- Resolve a domain and connect to its IP directly with \`curl\`. Explain why the certificate
  warning appears.
- Find every listening port on your machine and identify what owns each.
- Start a server bound to \`127.0.0.1\`, try to reach it from another device, then rebind to
  \`0.0.0.0\` and try again.
- Use \`curl -v\` against an HTTPS site and name each stage in the output.`,
    mcqs: [
      mcq('You connect to a site by IP with curl and get a certificate warning. Why?',
        [['The certificate is issued for the name, and you did not use the name', true],
          ['The certificate expired', false],
          ['IP connections cannot use TLS', false],
          ['The CA is untrusted', false]],
        'Name mismatch, and here it is expected rather than suspicious — a useful demonstration of what a certificate binds to.'),
      mcq('A service is listening but unreachable from another machine. Check first:',
        [['Which interface it is bound to — 127.0.0.1 versus 0.0.0.0', true],
          ['The DNS record', false],
          ['The certificate', false],
          ['The route', false]],
        'It appears as listening in every local check and is still unreachable from anywhere else.'),
      mcq('Before running any command, you should:',
        [['State what you expect to happen at each link', true],
          ['Check the logs', false],
          ['Restart the service', false],
          ['Ping the gateway', false]],
        'A prediction turns each command into a test rather than a fishing expedition.'),
      mcq('The output says "connection timed out". The next step is:',
        [['Investigate what might be dropping packets — firewall, security group, wrong address', true],
          ['Restart the application', false],
          ['Renew the certificate', false],
          ['Check the DNS record', false]],
        'Restarting an application that never received the packets is the commonest wasted action in this whole topic.'),
      mcq('Why compare from a second machine?',
        [['It separates a local problem from a genuine one in seconds', true],
          ['To measure latency', false],
          ['To test DNS only', false],
          ['It is not useful', false]],
        'Your DNS, your firewall and your VPN account for a large share of "the site is down" reports.'),
    ],
    checkpoint: [
      mcq('Diagnosis should proceed:',
        [['Along the chain in order, stopping at the first failure', true],
          ['From the application backwards', false],
          ['By checking everything then deciding', false],
          ['By restarting components one at a time', false]],
        'Everything after a broken link depends on it, so testing beyond that point produces no information.'),
      mcq('Which finding proves the network is fine?',
        [['An HTTP 500 response from the application', true],
          ['A successful ping', false],
          ['A resolved DNS name', false],
          ['An open port', false]],
        'Each of the others confirms only one link. A 500 means every link succeeded and the application itself failed.'),
    ],
  },
  {
    unitCode: 'T_NETWORKING_MINI_PROJECT',
    notes: `Map what is actually talking to what on a system, then find and explain a fault in it.

**Why mapping first.** Every diagnosis in this topic assumed you knew what the chain was. In
reality you usually do not — a running system has services you have forgotten, ports you did not
open deliberately, and connections you cannot account for. **Producing an accurate map is most
of the work**, and it is the part that transfers to every system you will ever be handed.

**What a map contains:**

- Every listening port, what owns it, and which interface it is bound to
- Which of those are reachable from outside the machine, and which only from localhost
- What each service talks *out* to — a database, an API, a DNS resolver
- Which connections are encrypted and which are not

**How to build it:**

    $ ss -tlnp              # listening TCP sockets, with owning process
    $ ss -tnp               # established connections
    $ ps aux                # what those processes actually are

Then for each, ask: should this be listening? Should it be reachable from where it is
reachable? Is it encrypted?

**The three findings people reliably get, and each is worth reporting:**

1. **A service listening on \`0.0.0.0\` that should be on \`127.0.0.1\`.** A development database
   reachable from the network is the classic.
2. **Something listening you had forgotten about.** Left over from an experiment.
3. **An unencrypted connection carrying something that matters.**

**Then break it deliberately and diagnose it.** Block a port, point a name at the wrong address,
stop a service — and work the chain as though you did not know what you did. Predict which
symptom each will produce before you look, then check whether you were right. **Being wrong
about the predicted symptom is the most useful outcome available**, because it is an inaccuracy
in your model that you can correct now rather than during a real incident.

The brief, acceptance criteria and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — Map and Diagnose a Network',
      description: `Produce an accurate map of what is talking to what on a real system, then deliberately break it three ways and diagnose each by working the chain. Predicting the symptom before observing it is the assessed skill.`,
      instructions: `**The brief**

Use your own machine, a VM, or a small set of containers. Not a diagram from the internet — a
system you can actually run commands against.

**Part 1 — The map**

Produce a table of every listening service:

| Port | Process | Bound to | Reachable from | Encrypted | Should it be? |
|---|---|---|---|---|---|

Then a second table of outbound connections the system makes: what it talks to, on what port,
and whether that traffic is encrypted.

Include a simple diagram — boxes and arrows is fine — showing the components and what talks to
what.

**Part 2 — Findings**

Identify at least **two** things worth changing, with reasons. Candidates:

- A service bound to \`0.0.0.0\` that only needs \`127.0.0.1\`
- Something listening that you do not need at all
- Unencrypted traffic carrying something that matters
- A port open to the network with no reason

For each: what it is, why it matters, and what you would change.

**Part 3 — Break it three ways**

Create each of these faults deliberately, one at a time:

1. **A DNS fault** — point a name at the wrong address, or make it unresolvable
2. **A port fault** — stop a service, or block its port with a firewall rule
3. **A certificate fault** — use a self-signed certificate, or connect by IP to an HTTPS name

For each, **before** running any diagnostic:

- Write down the exact symptom you predict
- Write down which command you expect to reveal it

Then diagnose it by working the chain, and record:

- The actual symptom, with the exact error text
- Which link of the chain it was
- Whether your prediction was right, and if not, what your model had wrong

**What to submit**

1. Both tables and the diagram.
2. Your findings with reasons.
3. For each of the three faults: prediction, actual output, the link identified, and whether
   you were right.
4. A short note (roughly 200-300 words) on what surprised you.

**Constraints**

- Only systems you own or are explicitly authorised to test. **Do not scan or probe anything
  else** — it is at best rude and in many places illegal.
- Restore everything you break.
- Real command output, not reconstructed from memory.

**Where the marks are.** A wrong prediction, honestly recorded with what your model had wrong,
scores higher than a right one reported without reasoning. The point is calibrating your model
of the chain, and you only learn where it is wrong by committing to a prediction first.`,
      rubric: [
        {
          criterion: 'The map',
          description: 'Complete table of listening services with process, binding, reachability and encryption; outbound connections documented; a diagram matching them.',
          maxPoints: 25,
        },
        {
          criterion: 'Findings',
          description: 'At least two genuine issues identified, each with why it matters and what to change. Reasoned rather than listed.',
          maxPoints: 20,
        },
        {
          criterion: 'Predictions',
          description: 'A specific predicted symptom and expected diagnostic command recorded BEFORE each fault was investigated, for all three.',
          maxPoints: 25,
        },
        {
          criterion: 'Diagnosis',
          description: 'Each fault correctly located to a link of the chain, with the real error text quoted and the reasoning shown.',
          maxPoints: 20,
        },
        {
          criterion: 'Reflection',
          description: 'Honest account of where predictions were wrong and what the model had wrong. A corrected misunderstanding scores highest.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },
];
