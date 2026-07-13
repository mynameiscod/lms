# Placement/College + Platform Infrastructure + Cost — Audit Summary

Domain: **Placement/College + Platform Infrastructure + Cost Rollup** cluster of CodeBegun LMS (multi-tenant Node/Express/Mongoose + React/TS). Audit date: 2026-07. 10 module docs + 1 cost rollup (`_cost-and-integrations.md`) in this folder. All percentages derived from traced source; no fabrication.

## Cross-Cutting Findings (apply to nearly every module)
- **Testing ~0%** across the whole domain (repo has almost no tests; none touch these modules).
- **Cost governance gap:** only LLM/Whisper spend is tracked (`AiUsage`, in ₹). 100ms, Bunny, Razorpay fees, WhatsApp, Exotel are **unmetered** in-app — no unified platform-cost ledger, no budget caps/alerts. 100ms + Bunny Stream are the unbounded cost bombs if Live Classes scale.
- **Automation is the weakest dimension everywhere** (College 10%, Meetings 10%, Alumni 15%, Concerns 20%, Fees 40%): CRUD is solid, but scheduled reminders/escalations/notifications are largely missing.
- **Notifications are poll-only** (Socket.io exists but isn't used to push notifications) and **email-only side channel**; College/Concerns fire no notifications at all.
- **AI backbone is strong:** dual-provider failover gateway (OpenAI `gpt-4o-mini` primary → Claude `claude-haiku-4-5` fallback) with per-call ₹ cost logging; `USD_TO_INR=85` default. Most paid integrations are behind Platform Settings feature-flags and degrade to free fallbacks.
- **Security notes:** cleartext passwords emailed on onboarding/convert; Meeting model has no indexes; permissive route guards in College/Alumni; SMTP is single-instance in-process (no queue) and Socket.io has no Redis adapter (no horizontal scale).

## Third-Party Cost Snapshot (₹ INR, ~200 students) — see `_cost-and-integrations.md` for the full 23-service rollup
| Service | Where | Approx monthly |
|---|---|---|
| Anthropic Claude (fallback/some primary) | AI gateway | ₹1,500–6,000 |
| OpenAI GPT + Whisper | AI gateway + STT | ₹1,100–4,500 |
| 100ms | Live Classes | ₹0 now → ₹15,000+ if daily |
| Bunny Storage + Stream | Resource lib + recordings | ₹700–3,800 |
| Razorpay | Fees/unlock | ~2% of collections |
| WhatsApp Cloud API | OTP/drip/reminders | ₹200–1,500 |
| Exotel + Redis | AI voice calls | ₹0 unless enabled |
| SMTP/IMAP Hostinger, Brevo, Google Sheets, GitHub, OAuth, Meta/Google Ads, Playwright, Socket.io | misc | ~₹0 (free/bundled) |
| VPS + MongoDB | Infra | ₹1,500–4,000 |
| **Realistic baseline total** | | **≈ ₹4,000–12,000/mo** (+ Razorpay % ; + ₹15k–30k if 100ms goes live) |

## SUMMARY TABLE
| Module | Overall% | BE% | FE% | API% | DB% | Auto% | AI% | Priority | Impact | Top-3 Gaps | Third-party + Cost ₹ | 1-line status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Placement & Companies | 70 | 82 | 75 | 88 | 90 | 50 | 0 | P1 | High | No drive-status/deadline crons; no AI match/resume-parse; list pagination cap 1000 | SMTP/IMAP/Todoist/pdfkit (~₹0) | Solid drive + partner CRM core; automation & AI are the edges |
| College Management | 61 | 75 | 70 | 85 | 85 | 10 | 0 | P2 | High | No notifications/CRT reminders; no graduation/GPA/transcript; thin role guards | None (~₹0) | Operational CRUD backbone; missing automation, notifications, analytics |
| Alumni Network | 61 | 70 | 65 | 78 | 80 | 15 | 20 | P3 | Medium | No mentoring scheduling/feedback; referral deadline automation; no emails | None (AI mentor cost lands in AiUsage) | Directory + referrals + basic mentoring; scheduling/feedback missing |
| Fees & Payments | 75 | 92 | 65 | 95 | 90 | 40 | 0 | P1 | High | No reminder/escalation crons; 3 forked payment surfaces; cleartext pwd email | Razorpay ~2% + WhatsApp ₹0.13–0.35 | Production-grade money core; automation + unified ledger needed |
| Notifications | 55 | 60 | 40 | 50 | 85 | 70 | 0 | P2 | Medium | No realtime push (poll-only); no preferences; no admin broadcast | SMTP ~₹0 | Polled in-app centre; limited delivery channels |
| Email System | 70 | 85 | 20 | 60 | 60 | 60 | 0 | P1 | High | No bounce/suppression; Brevo not auto-failover; no send queue | SMTP ~₹0; Brevo free≤300/day | Reliable transactional core w/ pacing+retry; deliverability ops gap |
| AI Infrastructure | 88 | 95 | 85 | 95 | 100 | 80 | 100 | P1 | High | No budget caps/alerts; no rate-limit/circuit-breaker; WhatsApp fallback stub | OpenAI+Claude+Whisper (₹2,600–10k/mo) | Cost-aware dual-provider failover backbone; needs budget governance |
| Reports & Analytics | 69 | 75 | 60 | 70 | 90 | 40 | 0 | P2 | High | No CSV/PDF export; no scheduled reports/caching; no AI insight | pdfkit/SMTP (~₹0) | Broad on-demand dashboards; export/scheduling/AI missing |
| Concerns / Support | 55 | 70 | 50 | 75 | 80 | 20 | 0 | P3 | Medium | No notify on raise/resolve; no assignment/SLA; one-way (no threading) | None (~₹0) | Functional but silent ticket loop |
| Meetings & Scheduling | 45 | 65 | 40 | 60 | 50 | 10 | 0 | P3 | Medium | Notify flags unused; no reminders/calendar; NO DB indexes | None (flags unused) | Basic CRUD; automation & calendar essentially absent |
| **COST & 3rd-PARTY ROLLUP** | — | — | — | — | — | — | — | P1 | High | Unmetered 100ms/Bunny/Razorpay/WhatsApp; no budget caps; SMTP/Socket single-instance | 23 integrations; baseline ≈ **₹4,000–12,000/mo @200 students** | See `_cost-and-integrations.md` for full enumeration + pricing |

## Domain averages (my 10 modules)
Overall ~65% | BE ~77 | FE ~57 | API ~76 | DB ~81 | Auto ~40 | AI ~12. **Automation, testing, and cost governance are the systemic weak spots; DB/API/BE are consistently strong.**
