# CareerPilot roadmaps — every year, every kind of member

How a member gets a roadmap, what is in it for each year, and how it changes for a fresh joiner,
a continuing member and a member on a career track. Code references are given so each rule can
be checked.

---

## 1. How any member gets a roadmap

| Step | What happens | Where |
|---|---|---|
| 1. Career setup | The member enters degree + year of study, role, main language and commitment. The **year (stage)** comes from degree + year. | `careerStageService.stageFromCourse`, `CareerSetup.tsx` |
| 2. Skill assessment | The member answers the year's assessment. Every answer becomes **Skill DNA** (a score per skill, with confidence). | `skillDnaService`, see `SCORES.md` |
| 3. Membership | When the membership is active, the trigger builds the **journey**, its **day plans** and the **curriculum enrollment**. If a journey is missing when the member opens the roadmap, it is built then. | `applyFoundationTrigger`, `foundationJourneyService` |
| 4. Orientation | Welcome days **0.1 – 0.5** come first for every member, in every year. Day 1 does not open until they are done. | `orientationService` |
| 5. Day by day | After the welcome days, **one day opens per calendar day** (India time). | day-by-day gate |

**The stages (years):**

| Stage key | Year | Default days | Admin can change |
|---|---|---|---|
| `foundation` | Year 1 | 90 | yes |
| `build` | Year 2 | 110 (**set 120** in admin, as decided) | yes |
| `specialize` | Year 3 | 130 | yes |
| `placement` | Year 4 | 150 | yes |
| `job_seeker` | Graduate | — | no year-long programme; no roadmap is planned |

Defaults: `DEFAULT_PROGRAM_DAYS_BY_STAGE` in `foundationProgramLengthService`.

**Daily load.** A roadmap is planned at the tenant's daily minutes (default **150 min = 2.5 h**,
admin range 60–300). A career track may stretch a day up to **10 h** so that the full track fits
(see §4).

**What a day holds.** Lessons (concepts), practice, projects, and checkpoints/quizzes. Practice is
never removed from a lesson that is kept.

---

## 2. How personalisation works (all years)

The roadmap is built from the member's **Skill DNA**, not only from the year:

- **Weak topic** → full teaching: lesson, practice, debug drill, checkpoint.
- **Held topic** (already strong) → shortened to lesson + proof; the debug drill is skipped.
- **Order** → weakest topics first where order allows.
- **What is cut when days are short** → by priority, never at random:
  OPTIONAL first, then drills, then SHOULD. A **MUST topic is never cut**.
- Two members in the same year therefore get **different roadmaps** from the same content.

Priorities live in `topicPriorityPolicy`; fitting is `fitToDays` in `roadmapV2ComposerService`.

---

## 3. Roadmaps without a career track

Applies to every Year-1 member, and to Year 2–4 members whose role is "Not sure" or has no
matching track.

### Year 1 — Foundation (90 days)

- No role: Year 1 always records **Not sure**; language defaults to **Not sure**.
- Commitment defaults to **1.5 h × 6 days** (editable, same as every year).
- Roadmap = the Year-1 topics, personalised by Skill DNA (§2).
- **Role readiness is hidden** in Year 1; it appears from Year 2.

### Year 2 — Build, Year 3 — Specialize, Year 4 — Placement

| Member | Roadmap |
|---|---|
| **Fresh joiner** (new to CareerPilot this year) | A **bridge** of the earlier years' MUST topics they do not hold (judged from Skill DNA alone, capped at about **1/3** of the days), then the year's topics. |
| **Continuing member** (did the previous year here) | **Revision days** first (default **7**, admin 0–30), weakest topics first, then the year's topics. |
| Year 3 | Needs a **direction** (chosen at purchase; a provisional one is used until then). |
| Year 4 | The year's part is **placement** preparation. |

The year refresher module (`_BRIDGE`, e.g. "Proving the Fundamentals") is not part of the year's
curriculum days.

---

## 4. Roadmaps with a career track (Years 2, 3, 4)

**Which track.** From the setup role + main language (e.g. Java Full Stack + AI), or set by an
admin. Once the roadmap is built the track is fixed; an admin can change it, which rebuilds it.
Tracks: Java / Python / .NET full stack, Data Analytics, AI, Data Science, Cybersecurity,
Cloud & DevOps, Data Engineer, QA/SDET, Mobile, and others as they are published.

**The rule.** The **same track** content is used in Years 2, 3 and 4, but each year's roadmap is
different: it depends on the year, on whether the member is fresh or continuing, and on Skill DNA.

### 4.1 Fresh joiner, Year 2 or Year 3

1. **The full track — compulsory.** Every lesson, practice and project of the track.
   - Debug drills are skipped on topics they already hold.
   - Checkpoints may be dropped if days are short (practice never is).
   - A day may carry more lessons; the day stretches in 15-minute steps up to 10 h.
2. **Then the year's curriculum** in the days left: Year-2 or Year-3 topics not already in the
   track, MUST first, chosen by weakness, fitted to exactly the days left.

### 4.2 Continuing member, Year 3 (did the track in Year 2)

1. **Revision** of the track — about **15%** of the days, weakest topics first.
2. **Any track topic they never reached**, taught in full.
3. **The Year-3 curriculum** in the days left.

### 4.3 Fresh joiner, Year 4

1. **The full track** (as 4.1), packed into the days not reserved for placement.
2. **Placement** in the rest — at least **20%** of the days (track share ≤ 80%), and never fewer
   days than placement's MUST topics need.

### 4.4 Continuing member, Year 4

1. **Revision** of the track — about **15%** of the days.
2. **Placement** for the rest of the year.

Shares are admin settings: `memberTrackShare` 0.15, `MAX_TRACK_SHARE` 0.8
(`careerTrackPolicy`). Composer: `careerTrackComposerService.composeTrackRoadmap`.

---

## 5. Use cases at a glance

| # | Member | Year | Track? | Roadmap, in order |
|---|---|---|---|---|
| 1 | New, 1st year | Y1 | — | Welcome → Year-1 topics (by Skill DNA) |
| 2 | New, 2nd year, role "Not sure" | Y2 | no | Welcome → bridge (≤ 1/3) → Year-2 topics |
| 3 | Continuing from Y1 | Y2 | no | Welcome → 7 revision days → Year-2 topics |
| 4 | New, 2nd year, Java FS | Y2 | yes | Welcome → **full Java track** → Year-2 curriculum |
| 5 | New, 3rd year, Python FS | Y3 | yes | Welcome → **full Python track** → Year-3 curriculum |
| 6 | Continuing, did track in Y2 | Y3 | yes | Welcome → 15% revision → unreached track topics → Year-3 curriculum |
| 7 | New, 3rd year, no track | Y3 | no | Welcome → bridge → Year-3 topics (direction) |
| 8 | New, 4th year, Data Analytics | Y4 | yes | Welcome → **full track** → placement (≥ 20%) |
| 9 | Continuing, did track in Y3 | Y4 | yes | Welcome → 15% revision → placement |
| 10 | Continuing, no track | Y4 | no | Welcome → 7 revision days → placement |
| 11 | Graduate (job seeker) | — | — | No year roadmap |

---

## 6. Measured examples (local tenant, 110-day Year 2, 150 min/day, weak fresh joiner)

| Track | Track days | Longest day | Rest of the year |
|---|---|---|---|
| Java Full Stack | 103 – 108 | 4.25 h | Year-2 curriculum (e.g. OOP) |
| Python Full Stack | 107 – 108 | 5.25 h | Year-2 curriculum |
| Data Analytics | 105 | 2.75 h | Year-2 curriculum |

Browser check: a real Year-2 Java member showed welcome days, Day 1 HTML … Day 103 Demo Day (full
track), then Days 104 – 110 Year-2 OOP — on desktop and phone.

With **120** Year-2 days the curriculum part grows by 10 days and the longest day gets shorter.

`server/src/scripts/verifyCareerTrack.ts` checks every case: full track present, exact days,
no day over 10 h, the revision split, and placement MUST topics.

---

## 7. Admin controls that change roadmaps

| Setting | Effect |
|---|---|
| Programme days per year | Rebuilds that year's roadmaps; started roadmaps keep their completed days. |
| Daily minutes, revision days | Used the next time a roadmap is built. |
| Career track packs / shares | Which skill packs a track holds; member and track shares. |
| A member's track | Changing it rebuilds the member's roadmap. |
| Rebuild roadmap | Rebuilds one member's roadmap from their current Skill DNA. |
| Publishing content | Only **PUBLISHED** units appear in roadmaps; drafts never do. |
