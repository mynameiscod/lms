# Domain Audit Summary — Assignments & Coding

Auditor domain: Assignments & Coding (6 modules). Repo: `d:\Simple_CB_LMS\Codebegun\lms-saas`. Percentages derived from traced source code; "Not Implemented" marked where features are absent. Prices in ₹ (INR).

### SUMMARY

| Module | Overall% | BE% | FE% | API% | DB% | Auto% | AI% | Priority | Impact | Top-3 Gaps | Third-party + Cost ₹ | 1-line status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Assignments | 82 | 88 | 85 | 90 | 90 | 75 | 40 | P1 | High | AI grading; plagiarism (fields only); tests/analytics | OpenAI gpt-4o-mini (gen, ~₹0.05/1K out); Piston self-hosted ₹0; SMTP bundled | Mature, production-used coursework engine; gaps are AI grading, real plagiarism, tests |
| Code Snippet Assessments | 60 | 70 | 80 | 70 | 75 | 20 | 30 | P2 | Medium | MCQ auto-grade not wired; no notifications; no AI explanation grading | AI question-gen (quiz model); LinkedIn ₹0; Piston unused | Good manual code-comprehension tool; name implies auto-exec that doesn't exist |
| Code Playground | 75 | 80 | 82 | 78 | 80 | 55 | 0 | P2 | Medium | No versioning/collab; shortcuts unwired; ext. PythonTutor dependency | Piston ₹0; PythonTutor ₹0 (ext); GitHub OAuth ₹0; StackBlitz ₹0; Monaco ₹0 | Feature-rich Monaco IDE with real debug + GitHub push; needs versioning/security |
| Project Builder | 63 | 80 | 82 | 78 | 78 | 55 | 70 | P3 | Medium | No AiUsage cost logging; no notifications; GitHub URL unvalidated | Anthropic Claude Sonnet (~₹1,250/1M out) NOT cost-logged; OpenAI fallback | AI project blueprints via Claude work well; missing observability & integrations |
| Code Execution Engine | 70 | 78 | N/A | 70 | N/A | 65 | 0 | P1 | High | Fake time/memory metrics; sim fallback can misgrade; sequential (slow) | Piston self-hosted ₹0 (public emkc.org disabled) | Solid when Piston up; simulation fallback + fabricated metrics are integrity gaps |
| Gamification | 68 | 85 | 70 | 80 | 85 | 75 | 0 | P3 | Medium | Coins never spendable; no admin badge/XP config; leaderboards siloed | None (self-contained) ₹0 | Engaging Thinking-Lab core; fragmented across labs, dead-end coin economy |

### Cross-Cutting Findings
- **AI stack is split**: Assignments + Snippet question-gen use **OpenAI gpt-4o-mini**; Project Builder uses **Claude Sonnet** (`ASSESSMENT_ROADMAP_MODEL` default `claude-sonnet-4-6`). Product direction is Anthropic — consolidate.
- **Piston self-hosted** is the shared execution backbone (public emkc.org explicitly disabled). Simulation fallback is a scoring-integrity risk that should fail closed in production.
- **Fabricated metrics**: execution time/memory are `Math.random()` in `codeRunnerService` — pollutes analytics and student feedback.
- **No automated tests** across all 6 modules (Testing ~5% everywhere).
- **Notifications weak**: Assignments has email/reminders; Snippets, Playground, Project Builder, Gamification have little/none (no grade-ready, badge-earned, or due-date alerts).
- **Cost governance gap**: Project Builder Claude calls are NOT logged to AiUsage — invisible spend.
- **Gamification is isolated**: only Thinking + Communication labs award XP; the actual coding modules (Assignments/Snippets/Playground/Projects) grant no XP — big untapped engagement hook.

### Priority Recommendations (highest leverage first)
1. **P1 — Harden Code Execution Engine**: fail-closed simulation, real metrics, queue/parallelize test cases. (~2–3 wks)
2. **P1 — Assignments AI grading + real plagiarism** (Claude): auto-feedback for theory/rubric, MOSS-style similarity. (~3 wks)
3. **P2 — Snippet MCQ auto-grade + Claude explanation-scoring**: cut instructor grading time drastically. (~2–3 wks)
4. **P3 — Unify gamification + wire coding modules to award XP + coin economy**: engagement lift. (~4 wks)
5. **Cross-cutting**: AiUsage logging everywhere, notification coverage, and a test suite.
