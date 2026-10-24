# Backlog: one person, two products (CareerPilot ↔ LMS)

**Status:** DESIGN DECISION RECORDED, NOT BUILT. Raised 2026-10-24.
**Owner decision needed:** 3 questions at the bottom.

## The question

Can CareerPilot members live in their own collection? The case that matters: someone joins CareerPilot in first year, and after their degree joins CodeBegun and needs the LMS. How should that work?

## Recommendation: keep ONE account per person; CareerPilot and LMS are two ENROLMENTS on it

Do **not** split into a separate CareerPilot collection now.

Why:
- About 30 collections (progress, XP, coins, resumes, roadmaps, attempts, notifications…) point at the account's `_id`. Moving a person means copying the account and rewriting every one of those links, or leaving their history behind.
- Two collections means the same email/phone in two places with two passwords: duplicate people, conflicting records (we already hit this with shared mobile numbers).
- Every CareerPilot screen, the login, rewards and reports read the shared account. A split is weeks of work with real risk to paying members.

How it works instead (most of the separation is already shipped, `f8b2022c`):
- CareerPilot enrolment = `passport.product` is set. LMS enrolment = a batch (`batchId`). Someone can hold both (2 people today).
- Separate doors: the LMS login refuses a CareerPilot-only member; the CareerPilot login accepts only an enrolled member. The session token carries `product`, and a router boundary keeps each person inside their product (`server/src/services/accountProduct.ts`, `client/src/utils/product.ts`).

### The upgrade (member becomes an LMS student)

1. Student finishes the degree and joins CodeBegun.
2. An admin uses an explicit **"Enrol this person in LMS"** action: pick the existing person, pick a batch. It never creates a second account.
3. CareerPilot history is untouched: nothing is copied or deleted.
4. The LMS login opens. They now hold both; the door they sign in through decides the product.
5. The business decides whether the CareerPilot membership continues or lapses.

## Work to do when approved

1. **Explicit marker.** Add `products: ['lms' | 'careerpilot']` on the account, instead of inferring from `batchId` + `passport.product`.
2. **One safe filter** for reports and bulk admin actions (the CareerPilot removal on 2026-10-24 showed how easily "the CareerPilot users" also matches LMS staff). Build on `services/careerPilotPopulation.ts`.
3. **"Enrol in LMS" action** in the admin Users screen (audited), and **duplicate detection** when an admin adds an LMS student whose email or phone already belongs to a CareerPilot member: offer "enrol this person", never fail or create a copy.
4. **Scores stay per product.** CareerPilot XP/coins stay in CareerPilot; LMS keeps its own game stats. No merging.
5. **Tests** for the lifecycle: member → both → LMS-only; both doors; the boundary; duplicate email.
6. Optional later: API-level fence per product (the token already carries `product`).

## When to reconsider a physical split

If CodeBegun runs **three or more separate products**, move to a shared `persons` identity table plus one profile table per product. Item 1 above is the first step toward that, so nothing is wasted.

## Decisions needed from the owner

1. After someone joins the LMS, does their **CareerPilot membership continue** (free, paid) or **lapse**?
2. A person with both products: **choose at login**, or **always land in the LMS**?
3. Who may enrol a CareerPilot member into the LMS: **admins only**, or can the **member request it**?

## Context

- 2026-10-24: separation fix (login doors, session `product`, router boundary) deployed.
- 2026-10-24: the 35 CareerPilot-only test/early accounts were removed (backup in `/app/uploads/backups/`); production now has 3 enrolled accounts (1 staff test, 2 holding both).
