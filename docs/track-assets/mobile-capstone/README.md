# GharFix mock API — Mobile track capstone

The backend for capstone Option A (GharFix, a home-services booking app) in the Mobile App Development
track (`MB_CAPSTONE`, `trackContentMbCapstone.ts`). Mentors give this file to students; it is not served by
the LMS.

- One Node file, no dependencies, in-memory data (reset on restart), synthetic data only.
- Run: `node server.js` (port 4000; `PORT=5000 node server.js` to change it).
- Sign in with any 10-digit Indian mobile number and the development OTP `123456`.
- A phone on the same Wi-Fi reaches it at `http://<laptop IP>:4000`; the Android emulator at
  `http://10.0.2.2:4000`. Set `HOST=127.0.0.1` to keep it to the laptop only.

| Endpoint | Auth | Notes |
|---|---|---|
| `POST /auth/otp/verify` `{ phone, otp }` | – | 200 with `{ accessToken, refreshToken, expiresIn }`; 422 bad phone, 401 wrong OTP |
| `POST /auth/refresh` `{ refreshToken }` | – | Rotates tokens; reusing a spent refresh token revokes the user's session (401 `refresh_reused`) |
| `GET /services?category=` | – | Five services (AC, electrical, plumbing); prices in paise |
| `GET /services/:id/slots` | – | Four slots tomorrow (India time), `available` false once booked |
| `GET /bookings` | Bearer | The signed-in user's bookings |
| `POST /bookings` `{ slotId, address }` | Bearer + `Idempotency-Key` | 201 booking; 409 `slot_taken`; a repeated key returns the first answer |

Access tokens last 15 minutes. Tests can `require('./server.js').start({ port: 0, accessTtlSec: 1, latencyMs })`
to get short-lived tokens and slow responses.
