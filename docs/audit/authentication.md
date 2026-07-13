# Authentication
**Completion:** 72%  |  **Priority:** P1  |  **Business Impact:** High

## Purpose & Business Goal
Gate every request to the LMS. Handles email/password login, self-service registration, organization sign-up (creates a tenant + first admin), password reset via emailed token, admin-driven password setup for invited students, JWT issuance/refresh, and student OAuth (GitHub/LinkedIn) connections. It is the front door for all 7 roles across all tenants.

## Primary Users & Roles
- Anonymous visitors (login, register, forgot/reset password, setup password).
- TENANT_ADMIN (created via `register-organization`).
- STUDENT (created via invite → setup-password, or self-register into existing tenant).
- All authenticated roles (token refresh, OAuth connect).

## Key Files (traced — real paths)
- `server/src/routes/authRoutes.ts` — `/register`, `/register-organization`, `/login`, `/forgot-password`, `/reset-password`, `/refresh-token`.
- `server/src/controllers/authController.ts` — all auth handlers.
- `server/src/services/authService.ts` — `register`, `registerOrganizationFull`, `login` (JWT sign + permission resolution).
- `server/src/middleware/auth.ts` — `authMiddleware` (JWT verify, active-user check).
- `server/src/models/User.ts` — bcrypt pre-save hook, `comparePassword`, `resetToken`/`resetTokenExpires`.
- `server/src/controllers/userController.ts` — `setupPassword` (invited-student flow).
- `server/src/routes/oauthRoutes.ts`, `server/src/controllers/oauthController.ts` — GitHub/LinkedIn OAuth.
- `client/src/contexts/AuthContext.tsx` — token storage (localStorage), global 401 interceptor, refresh.
- `client/src/pages/Login/`, `Register/`, `ForgotPassword/`, `ResetPassword/`, `SetupPassword/`, `OAuthCallback/`.

## Dependencies & Connected Modules
- Multi-Tenancy (creates/resolves tenant on register).
- User Management (setupPassword, reset tokens live on User).
- RBAC (`ROLE_PERMISSIONS` resolved at login into token payload consumer).
- Email service (welcome, reset, tenant-admin welcome).
- Student Profiles (OAuth tokens stored on StudentProfile).

## Entry / Exit Points
- Entry: `POST /api/v1/auth/{login,register,register-organization,forgot-password,reset-password,refresh-token}`, `POST /api/v1/users/setup-password`, `GET/POST /api/v1/oauth/*`.
- Exit: JWT (HS256, 7d default) + user object + tenant; reset email; welcome email; OAuth redirect back to `FRONTEND_URL/profile/oauth-callback`.

## Database Tables & Relationships
- `User` (email unique, password hashed, `resetToken`, `resetTokenExpires`, `tenantId` → Tenant, `customRoleId` → Role).
- `Tenant` (auto-created on org registration / unknown-tenant registration).
- `StudentProfile.oauthConnections` (GitHub/LinkedIn tokens, `select:false`).

## Events / Notifications / Emails / WhatsApp
- Welcome email (`sendWelcomeEmail`) on invite/create.
- Tenant-admin welcome email (`sendTenantAdminWelcomeEmail`) on org registration.
- Password reset email (`sendPasswordResetEmail`), token hashed (sha256) with 1h expiry.
- No LOGIN/LOGOUT audit-log write (enum exists in AuditLog but unused here).
- No WhatsApp.

## AI Features
None.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
| GitHub OAuth | Student code-push / profile connect | ₹0 | OAuth app free |
| LinkedIn OAuth | Profile connect / post | ₹0 | OAuth app free |
| SMTP/Gmail/Brevo | Reset & welcome emails | ~₹0 (Gmail) / Brevo free ≤300/day, paid from ~₹1,600/mo | Via emailService |

## Validation Rules & Edge Cases
- Login: rejects missing fields, inactive users, bad credentials (generic "Invalid credentials").
- Forgot-password: does NOT reveal account existence or deactivation (good).
- Reset-password: min length 8; token hashed + expiry-checked.
- Setup-password: min length **6** (inconsistent with reset's 8); blocks inactive users; validates token equality + expiry.
- Register: creates tenant if identifier unknown (first user becomes TENANT_ADMIN) — surprising side effect.
- OAuth state = base64 JSON `{userId, timestamp}` — decoded but timestamp/expiry NOT enforced; weak CSRF.

## Completion Breakdown
| Dimension | % | Reasoning (from actual code) |
| Backend | 78 | Login/register/reset/refresh/setup all implemented and working; missing rate-limiting, lockout, MFA, audit logging. |
| Frontend/UI | 80 | All auth pages exist (Login, Register, Forgot, Reset, Setup, OAuthCallback); AuthContext has 401 interceptor + refresh. |
| API | 80 | Clean REST endpoints; no logout endpoint (client-side only); no `/me` on auth. |
| Database | 75 | Reset token hashed+expiring; but JWT is stateless with no revocation list; no login-history table. |
| Automation | 55 | Email automation present; no failed-login throttling, no session expiry notifications beyond client. |
| AI | 0 | None (N/A). |
| Testing | 5 | No test files found for auth. |
| **Overall** | **72** | Functional core, notable security/hardening gaps. |

## Gaps (be specific; mark "Not Implemented" where truly absent)
Missing:
- **Security:** rate-limiting / brute-force lockout on login & forgot-password — Not Implemented. MFA/2FA — Not Implemented. JWT fallback secret `'secret-key'` used if `JWT_SECRET` unset (auth.ts:21, authService.ts:155). No token revocation/blacklist on logout. Password complexity rules absent; min-length inconsistent (6 vs 8).
- **OAuth:** state timestamp not validated (replay window open); no PKCE.
- **Automation:** no login/logout audit events despite AuditLog enum supporting them.
- **APIs:** no server-side logout endpoint; no `GET /auth/me`.
- **UX:** verbose `console.log('[AUTH] ...')` on every request leaks path/user id to logs.
- **Testing:** no automated tests.
- **Register side effect:** `authService.register` silently creates a tenant for an unknown identifier — abuse/spam risk on the public register endpoint.

## Technical Debt / Performance / Security / Scalability issues
- `authMiddleware` hits DB (`User.findById`) on every request (adds latency; no cache).
- Stateless JWT + 7-day expiry means a deactivated user's existing token is only caught because middleware re-checks `isActive` each request (good) — but relies on that DB call.
- Client stores token in `localStorage` (XSS-exposed) rather than httpOnly cookie.
- `console.log` auth tracing in production.

## Suggestions & AI Opportunities
- Add `express-rate-limit` + account lockout; move JWT to httpOnly+SameSite cookie; enforce a shared min-length (≥8) + zxcvbn strength.
- Add refresh-token rotation with a server-side session/allowlist for true logout/revoke.
- AI opportunity: anomaly detection on login (impossible-travel / new-device email alerts) — low effort with an LLM summarizer over a login-history table.

## Estimated Dev Effort (to close gaps)
~5–8 dev-days: rate-limit + lockout (1d), cookie-based JWT + revocation (2–3d), password policy unification (0.5d), login audit events (1d), OAuth state hardening (0.5d), basic test suite (1–2d).
