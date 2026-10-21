# Communication Coach

**Why:** 35 CodeBegun candidates were sent to one company and every one scored zero on communication: nervous, unable to explain their introduction or project. The Communication Lab scored one 3-minute introduction a day; it did not find out why a student struggles or help them get better. Only 4 students practised in the 14 days before this was written.

**Decisions (2026-10-21):** readiness gate on from the start; the daily session is for everyone; design doc then Phase 1.

## The loop

Measure → Diagnose → Prescribe → Practise → Prove.

1. **Baseline (once).** Four real questions with no help: introduction, project, technical concept, HR question. This is the starting point against which progress is shown.
2. **Measured hesitation.** Whisper returns when each word starts and ends. From that the server computes, with no AI involved: time to first word, pauses of 1s+ and 3s+, longest silence, silence share, pace variation, restarts, filler density, stopping early. They combine into a **hesitation index** (0 calm … 100 frozen): `communicationSignalsService.ts`. This is a proxy for nervousness (what an interviewer hears), not a diagnosis.
3. **Skill map.** Fluency, Confidence (= measured steadiness, not an AI guess), Clarity, Structure, Content, Language; first five recordings vs latest five.
4. **Prescription.** A daily session of three short recordings, chosen from the student's own picture: a warm-up, a focus on their weakest area, one interview question. The **level** is worked out from the last four recordings, never stored:
   1. Read it aloud (script built from their own profile) · 2. Answer with a guide · 3. Answer on your own · 4. Interview pressure (plus a follow-up question).
   Hesitation ≥ 60 or score < 35 → level 1; ≥ 45 or < 50 → 2; ≥ 30 or < 65 → 3; otherwise 4.
5. **Proof.** Readiness = 50% average score of the last five + 30% steadiness + 20% practice days in the last 14. Ready needs: baseline done, ≥ 5 recordings, ≥ 5 practice days, readiness ≥ threshold (`COMMUNICATION_READY_THRESHOLD`, default 60), hesitation < 45.

## How it fits the existing app (no breaking change)

- Coach recordings are ordinary `CommunicationAttempt` rows with `kind: 'coach'` and a `coach` block (area, level, step, signals, skills, tips). So **streak, achievements, leaderboard, Practice Pass (comm task ≥ 20s), the lab gate and the weekly report count them with no extra wiring.**
- Each area has one inactive `CommunicationChallenge` holder (`isCoach: true`) so the required `challengeId` exists; they never enter the daily rotation and are hidden from the admin list.
- The existing Daily Practice tab ignores coach attempts (`kind: {$ne:'coach'}`), so doing the coach session never marks the daily challenge "completed".
- Cost: about ₹5–8 per student per day (shorter, more recordings).

## API (`/api/v1/communication`)

| Route | Who | What |
|---|---|---|
| `GET /coach` | student | state: mode, level, today's steps, skill map, hesitation trend, readiness |
| `POST /coach/submit` (multipart `recording`, `area`) | student | transcribe with word timings → signals → AI → store → streak → notify; max 12 a day |
| `GET /admin/coach/overview?batchId=` | trainer | who never started / went quiet / sounds frozen / is ready |
| `GET /admin/coach/readiness/:studentId` | trainer | one student's readiness |

Readiness also appears on the Candidate Proof Profile (`communication.coachReadiness`, `coachReady`, `steadiness`).

## Not in Phase 1 (planned)

- **Hard gate on company submission.** Readiness is computed and shown to the trainer and on the proof profile; no placement action is blocked yet. Needs a decision on where "sent to a company" happens (Drives apply vs placement shortlist) and who may override.
- WhatsApp daily reminder (needs a Meta-approved template; the in-app nudge and the lab gate's escalation exist).
- Record company feedback per candidate, to calibrate scoring against real interview results.
- AI mock interviewer with live follow-ups; voice-tremor and video (eye contact, posture) analysis.
- Project content: model answers saved per student; trainer review queue for the weakest ten each week.

## Honest limits

Software does not cure nervousness. It creates a safe, daily, low-stakes habit and shows each student their real gap. Improvement still needs the student to do the session every day for weeks.
