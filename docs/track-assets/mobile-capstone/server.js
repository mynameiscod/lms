// GharFix mock API: the small backend a capstone student runs on their laptop (node mock-api/server.js).
// No dependencies. In-memory data, reset on restart. Synthetic data only.
const http = require('http');
const crypto = require('crypto');

function start(opts = {}) {
  const accessTtlSec = opts.accessTtlSec ?? 900;
  const latencyMs = opts.latencyMs ?? 0;
  const stats = { refreshCalls: 0, bookingPosts: 0, log: [] };
  const DEV_OTP = '123456';

  const services = [
    { id: 'svc-1', name: 'AC service (split)', category: 'ac', pricePaise: 59900, durationMin: 60 },
    { id: 'svc-2', name: 'Fan installation', category: 'electrical', pricePaise: 19900, durationMin: 30 },
    { id: 'svc-3', name: 'Kitchen sink leak', category: 'plumbing', pricePaise: 24900, durationMin: 45 },
    { id: 'svc-4', name: 'Switchboard repair', category: 'electrical', pricePaise: 14900, durationMin: 30 },
    { id: 'svc-5', name: 'Geyser repair', category: 'plumbing', pricePaise: 34900, durationMin: 60 },
  ];
  // Slots are tomorrow (India time), so the app always has future times to book whenever it is run.
  const day = opts.slotDate ?? new Date(Date.now() + 5.5 * 3600e3 + 24 * 3600e3).toISOString().slice(0, 10);
  const slots = new Map(); // slotId -> { id, serviceId, start, taken }
  ['svc-1', 'svc-2', 'svc-3', 'svc-4', 'svc-5'].forEach((s) => {
    for (const h of [10, 12, 15, 17]) {
      const id = `${s}-${day}T${h}`;
      slots.set(id, { id, serviceId: s, start: `${day}T${String(h).padStart(2, '0')}:00:00+05:30`, taken: false });
    }
  });
  const users = new Map(); // phone -> { id, phone }
  const access = new Map(); // token -> { userId, exp }
  const refresh = new Map(); // token -> { userId, used }
  const bookings = new Map(); // id -> booking
  const byIdemKey = new Map(); // key -> { status, body }

  const issue = (userId) => {
    const a = crypto.randomBytes(16).toString('hex');
    const r = crypto.randomBytes(16).toString('hex');
    access.set(a, { userId, exp: Date.now() + accessTtlSec * 1000 });
    refresh.set(r, { userId, used: false });
    return { accessToken: a, refreshToken: r, expiresIn: accessTtlSec };
  };

  const send = (res, status, body, headers = {}) => {
    const text = body === undefined ? '' : JSON.stringify(body);
    res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
    res.end(text);
  };

  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => setTimeout(() => handle(req, res, raw), latencyMs));
  });

  function authUser(req) {
    const h = req.headers.authorization || '';
    const t = h.startsWith('Bearer ') ? h.slice(7) : '';
    const a = access.get(t);
    if (!a || a.exp < Date.now()) return null;
    return a.userId;
  }

  function handle(req, res, raw) {
    const url = new URL(req.url, 'http://x');
    const path = url.pathname;
    let body = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch { return send(res, 400, { error: 'bad_json' }); }
    stats.log.push(`${req.method} ${path}`);

    if (req.method === 'POST' && path === '/auth/otp/verify') {
      if (!/^[6-9]\d{9}$/.test(body.phone || '')) return send(res, 422, { error: 'invalid_phone' });
      if (body.otp !== DEV_OTP) return send(res, 401, { error: 'wrong_otp' });
      if (!users.has(body.phone)) users.set(body.phone, { id: `u-${users.size + 1}`, phone: body.phone });
      return send(res, 200, issue(users.get(body.phone).id));
    }
    if (req.method === 'POST' && path === '/auth/refresh') {
      stats.refreshCalls++;
      const r = refresh.get(body.refreshToken);
      if (!r) return send(res, 401, { error: 'invalid_refresh' });
      if (r.used) { // reuse: revoke the family (here: every token of the user)
        for (const [k, v] of refresh) if (v.userId === r.userId) refresh.delete(k);
        return send(res, 401, { error: 'refresh_reused' });
      }
      r.used = true;
      return send(res, 200, issue(r.userId));
    }
    if (req.method === 'GET' && path === '/services') {
      const cat = url.searchParams.get('category');
      const items = services.filter((s) => !cat || s.category === cat);
      return send(res, 200, { items });
    }
    const slotMatch = path.match(/^\/services\/([\w-]+)\/slots$/);
    if (req.method === 'GET' && slotMatch) {
      const items = [...slots.values()].filter((s) => s.serviceId === slotMatch[1])
        .map(({ id, start, taken }) => ({ id, start, available: !taken }));
      return send(res, 200, { items });
    }

    const userId = authUser(req);
    if (!userId) return send(res, 401, { error: 'unauthenticated' });

    if (req.method === 'GET' && path === '/bookings') {
      const items = [...bookings.values()].filter((b) => b.userId === userId).map(({ userId: _u, ...b }) => b);
      return send(res, 200, { items });
    }
    if (req.method === 'POST' && path === '/bookings') {
      stats.bookingPosts++;
      const key = req.headers['idempotency-key'];
      if (!key) return send(res, 400, { error: 'idempotency_key_required' });
      if (byIdemKey.has(key)) { const prev = byIdemKey.get(key); return send(res, prev.status, prev.body); }
      const slot = slots.get(body.slotId);
      if (!slot) return send(res, 422, { error: 'unknown_slot' });
      if (!body.address || String(body.address).trim().length < 10) return send(res, 422, { error: 'address_too_short' });
      let out;
      if (slot.taken) out = { status: 409, body: { error: 'slot_taken' } };
      else {
        slot.taken = true;
        const b = { id: `bk-${bookings.size + 1001}`, userId, serviceId: slot.serviceId, slotId: slot.id,
          start: slot.start, address: body.address, status: 'confirmed' };
        bookings.set(b.id, b);
        const { userId: _u, ...pub } = b;
        out = { status: 201, body: pub };
      }
      byIdemKey.set(key, out);
      return send(res, out.status, out.body);
    }
    return send(res, 404, { error: 'not_found' });
  }

  return new Promise((resolve) => {
    server.listen(opts.port ?? 0, opts.host ?? '127.0.0.1', () => {
      resolve({ server, stats, baseUrl: `http://127.0.0.1:${server.address().port}`,
        bookingCount: () => bookings.size,
        stop: () => { server.closeAllConnections(); server.close(); } });
    });
  });
}

module.exports = { start };
// Run directly it listens on every interface, so a phone on the same Wi-Fi can reach it at http://<laptop IP>:4000
// (the Android emulator reaches the laptop at http://10.0.2.2:4000). Tests call start() and stay on 127.0.0.1.
if (require.main === module) {
  start({ port: Number(process.env.PORT || 4000), host: process.env.HOST || '0.0.0.0' })
    .then((s) => console.log('GharFix mock API on port', s.server.address().port, '- sign in with any Indian mobile number and OTP 123456'));
}
