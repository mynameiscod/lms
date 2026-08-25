# Student Core — CodeBegun System Style Migration

This migration standardises the remaining LMS student-facing surfaces against the approved CodeBegun System Style Guide while preserving the existing APIs, data model, routes and business logic.

## Design tokens

- Primary: `#005897`
- Secondary: `#1976D2`
- Page background: `#F4F8FC`
- Card: `#FFFFFF`
- Text: `#1E293B`
- Muted: `#64748B`
- Border: `#E4EAF1`
- Card radius: `16px`
- UI font: Inter/system UI
- Code font: JetBrains Mono/Cascadia Code/Consolas fallback
- CTA gradients are restricted to primary actions and highlighted actions.

## Previously migrated Student Core

The route-scoped remaining stylesheet deliberately does not touch the screens already migrated independently:

- Dashboard
- My Learning Plan
- Learning Plan Day View
- My Journey
- My Tasks
- My Attendance
- My Quizzes
- Quiz Attempt
- Quiz Result / Review
- My Assignments
- Assignment Workspace / Attempt
- Assignment Result / Evaluation
- My Code Practice / Coding Assessments
- Coding assessment attempt and result states contained by the Code Practice flow

## Remaining routes covered by this pass

### Daily Practice

- `/ai-communication-lab`
- `/thinking-lab`
- `/logic-gym` (back-compatible student practice route)

### My Learning

- `/hms-classes`
- `/interview-questions/*`

### Prep & Career

- `/playground`
- `/my-interviews`
- `/student/interviews/*`
- `/resume-builder`
- `/career-profile`
- `/ai-mentor`
- `/job-tracker`
- `/project-builder`
- `/resource-library`

### College

- `/student/college`
- `/student/my-applications`
- `/student/alumni-directory`

### My Account / Support

- `/student/fee-details`
- `/my-leave`
- `/profile`
- `/notifications`

## Implementation approach

`Layout.tsx` identifies only the remaining student routes and adds a route-scoped `student-core-remaining-surface` class plus a stable `data-student-core-route` key. `StudentCoreRemaining.css` then applies the CodeBegun tokens and responsive rules to those surfaces only.

This keeps the independently migrated screens isolated and avoids changing backend calls or component state. Specialized surfaces such as Monaco/code areas and interview/live-class workspaces keep their functional layout while inheriting CodeBegun typography, focus treatment, primary actions, borders and responsive spacing.

## API / backend impact

None. This is a frontend presentation migration only.
