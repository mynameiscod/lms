/**
 * Project Studio starter project: Clinic Appointment System (Spring Boot + MySQL + React).
 *
 * A DRAFT for the institute to edit before publishing. Loaded by
 * scripts/seedProjectTemplate.ts. 4 sprints · 20 days · 27 tasks, each with a brief,
 * a "done when" checklist, the proof required, a weight and interview questions.
 */

type Q = { q: string; a: string };
type Task = { title: string; story: string; brief: string; acceptance: string[]; proofType: 'commit' | 'pr' | 'url' | 'text'; weight: number; questions: Q[] };
type Day = { title: string; tasks: Task[] };
type Sprint = { title: string; goal: string; days: Day[] };

const task = (title: string, proofType: Task['proofType'], weight: number, story: string, brief: string, acceptance: string[], questions: Q[]): Task =>
  ({ title, story, brief: brief.trim(), acceptance, proofType, weight, questions });

const sprints: Sprint[] = [
  /* ── Sprint 1 ─────────────────────────────────────────────────────────────── */
  {
    title: 'Sprint 1 — Foundations',
    goal: 'A running Spring Boot API and React app, the database designed, and the team workflow (branch → PR → merge) in place.',
    days: [
      {
        title: 'Day 1 — Project setup',
        tasks: [
          task('Repository, README and .gitignore', 'commit', 1,
            'As a developer I have a clean public repository that explains the project.',
            `
## Steps
1. Create a public repository on GitHub with a README.
2. Create two folders: \`backend/\` (Spring Boot) and \`frontend/\` (React).
3. Add a \`.gitignore\` that ignores \`target/\`, \`node_modules/\`, \`.env\`, IDE folders.
4. Write the README: what the app does, the tech stack, and the three roles (Admin, Doctor, Patient).

## Hint
A recruiter reads your README first. Write it for them, not for you.
`,
            ['Repository is public and has backend/ and frontend/ folders', 'README explains the app, stack and roles', '.gitignore keeps build output and secrets out of git'],
            [
              { q: 'Why should .env files never be committed?', a: 'They hold secrets (DB passwords, JWT keys). Once pushed they stay in git history even if deleted later, so anyone with the repo can read them. Commit a .env.example with dummy values instead.' },
              { q: 'What is the difference between git fetch and git pull?', a: 'fetch downloads new commits from the remote but does not change your branch. pull = fetch + merge (or rebase) into your current branch.' },
            ]),
          task('Spring Boot skeleton with a health endpoint', 'commit', 2,
            'As a developer I can start the API and check it is alive.',
            `
## Steps
1. Generate a project on start.spring.io: Java 17, Maven, dependencies **Web, Data JPA, MySQL Driver, Validation, Lombok**.
2. Put it in \`backend/\`.
3. Configure \`application.yml\` with the MySQL URL, read username/password from environment variables.
4. Add \`GET /api/health\` that returns \`{ "status": "UP" }\`.
5. Use packages: \`controller\`, \`service\`, \`repository\`, \`entity\`, \`dto\`, \`config\`, \`exception\`.

\`\`\`yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/clinic
    username: \${DB_USER}
    password: \${DB_PASSWORD}
\`\`\`
`,
            ['mvn spring-boot:run starts without errors', 'GET /api/health returns status UP', 'DB credentials come from environment variables, not hard-coded', 'Code is split into layered packages'],
            [
              { q: 'What does @SpringBootApplication do?', a: 'It combines @Configuration, @EnableAutoConfiguration and @ComponentScan: marks the main config class, turns on auto-configuration from the classpath, and scans the package and sub-packages for components.' },
              { q: 'Why separate controller, service and repository layers?', a: 'Each has one job: controller handles HTTP, service holds business rules and transactions, repository talks to the DB. It keeps code testable and lets you change one layer without touching the others.' },
            ]),
        ],
      },
      {
        title: 'Day 2 — Database design',
        tasks: [
          task('ER diagram and schema', 'commit', 2,
            'As a team we agree on the data model before writing code.',
            `
Design these tables and their relations, draw an ER diagram (dbdiagram.io / draw.io), export it to \`docs/er-diagram.png\`:

- **users** (id, name, email, password_hash, role, active, created_at)
- **doctors** (id, user_id, specialization, experience_years, consultation_fee, bio)
- **patients** (id, user_id, phone, date_of_birth, gender, blood_group)
- **availability** (id, doctor_id, day_of_week, start_time, end_time, slot_minutes)
- **appointments** (id, doctor_id, patient_id, date, start_time, status, reason, created_at)
- **visit_notes** (id, appointment_id, diagnosis, prescription, follow_up_date)

Mark primary keys, foreign keys and the unique rule that stops double booking.
`,
            ['docs/er-diagram.png is in the repo', 'Every relation (1:1, 1:N) is shown with foreign keys', 'A unique constraint on (doctor_id, date, start_time) is planned for appointments'],
            [
              { q: 'What is normalization and why do it?', a: 'Organising tables so each fact is stored once (1NF: atomic values, 2NF: no partial dependency on part of a key, 3NF: no transitive dependency). It avoids update anomalies and duplicated data.' },
              { q: 'Why keep doctors and patients in separate tables instead of more columns on users?', a: 'They have different fields. Separate tables avoid many NULL columns, keep users only for login/identity, and let each role grow independently (one-to-one with users).' },
            ]),
          task('JPA entities and repositories', 'commit', 2,
            'As a developer my tables are created from Java entities.',
            `
Create entities \`User\`, \`Doctor\`, \`Patient\` with relations (\`@OneToOne\` to User), a \`Role\` enum (ADMIN, DOCTOR, PATIENT) stored as a string, and a \`JpaRepository\` for each.

Use \`spring.jpa.hibernate.ddl-auto=update\` for now (we will discuss why not in production).
`,
            ['Entities map to the agreed schema', 'Role is an enum stored as STRING', 'Tables are created on startup', 'UserRepository has findByEmail'],
            [
              { q: 'Why store an enum as STRING and not ORDINAL?', a: 'ORDINAL stores the position (0,1,2). Adding or reordering constants later silently changes the meaning of existing rows. STRING stores the name and is safe to extend.' },
              { q: 'Difference between FetchType.LAZY and EAGER?', a: 'EAGER loads the related entity with the parent immediately; LAZY loads it only when accessed. LAZY is the safer default for performance; EAGER can cause large, unnecessary joins.' },
              { q: 'Why is ddl-auto=update not used in production?', a: 'It can make unpredictable schema changes and never drops/renames safely. Production uses versioned migrations (Flyway/Liquibase) so every change is reviewed and repeatable.' },
            ]),
        ],
      },
      {
        title: 'Day 3 — Frontend skeleton',
        tasks: [
          task('React app with routing and layout', 'commit', 2,
            'As a user I see a consistent layout and can move between pages.',
            `
1. Create the app in \`frontend/\` with Vite (React + TypeScript or JavaScript).
2. Add React Router with pages: Home, Login, Register, Doctors, My Appointments, Admin.
3. A shared layout: top bar with the clinic name and links, footer.
4. One \`api.js\` file with an axios instance whose base URL comes from \`VITE_API_URL\`.
`,
            ['npm run dev opens the app', 'All six routes render a page', 'API base URL comes from an environment variable'],
            [
              { q: 'What is the virtual DOM?', a: 'An in-memory copy of the UI. On state change React builds a new virtual tree, diffs it with the old one and applies only the changed parts to the real DOM, which is faster than re-rendering everything.' },
              { q: 'Why keep the API URL in an environment variable?', a: 'The same code runs against localhost in development and the real server in production; only the variable changes, no code edits or accidental production calls from dev.' },
            ]),
        ],
      },
      {
        title: 'Day 4 — Errors and the PR workflow',
        tasks: [
          task('Global exception handler (your first pull request)', 'pr', 2,
            'As a client of the API I always get errors in the same shape.',
            `
Work on a branch and open a **pull request** to main — from now on every task is a PR.

1. Create \`ApiError { timestamp, status, message, path, fieldErrors }\`.
2. \`@RestControllerAdvice\` handling: \`ResourceNotFoundException\` → 404, \`MethodArgumentNotValidException\` → 400 with field errors, \`BadRequestException\` → 400, any other \`Exception\` → 500 (no stack trace in the response).
3. Write a clear PR description: what, why, how to test.
`,
            ['Work was done on a feature branch and merged by PR', 'All errors return the same JSON shape', 'Validation errors list each field', 'No stack traces leak to the client'],
            [
              { q: 'What does @RestControllerAdvice do?', a: 'It is a global interceptor for exceptions thrown by controllers. Methods marked @ExceptionHandler turn exceptions into HTTP responses in one place instead of try/catch in every controller.' },
              { q: 'Why work in branches and pull requests instead of committing to main?', a: 'main stays deployable, changes get reviewed before merging, history shows why each change was made, and several people can work in parallel without breaking each other.' },
            ]),
        ],
      },
    ],
  },

  /* ── Sprint 2 ─────────────────────────────────────────────────────────────── */
  {
    title: 'Sprint 2 — Authentication & roles',
    goal: 'Patients register and log in, doctors are created by the admin, and every API is protected by role.',
    days: [
      {
        title: 'Day 5 — Registration',
        tasks: [
          task('Patient registration API', 'pr', 3,
            'As a patient I can create an account with my email and a password.',
            `
\`POST /api/auth/register\` with \`{ name, email, password, phone, dateOfBirth, gender }\`.

- Validate with Bean Validation: email format, password at least 8 characters with a digit, phone 10 digits.
- Reject a duplicate email with 409.
- Hash the password with **BCrypt** — never store plain text.
- Create the User (role PATIENT) and the Patient profile **in one transaction**.
- Return a DTO, never the entity (no password hash in the response).
`,
            ['Valid input creates a user + patient and returns 201', 'Duplicate email returns 409', 'Invalid fields return 400 with field errors', 'Password is stored as a BCrypt hash', 'Response contains no password or hash'],
            [
              { q: 'Why BCrypt and not SHA-256 for passwords?', a: 'SHA-256 is fast, so attackers can try billions of guesses. BCrypt is deliberately slow, has a work factor you can raise, and adds a random salt per password so identical passwords get different hashes.' },
              { q: 'Why return a DTO instead of the entity?', a: 'It controls exactly what leaves the API (no password hash, no internal fields), avoids lazy-loading/serialization loops, and lets the database model change without breaking clients.' },
              { q: 'What does @Transactional guarantee here?', a: 'Creating the user and the patient either both succeed or both roll back, so you never end up with a user without a profile.' },
            ]),
        ],
      },
      {
        title: 'Day 6 — Login with JWT',
        tasks: [
          task('Login API that issues a JWT', 'pr', 3,
            'As a user I can log in and receive a token for later requests.',
            `
\`POST /api/auth/login\` with \`{ email, password }\` → \`{ token, role, name }\`.

1. Add Spring Security and a JWT library (jjwt).
2. Authenticate with \`AuthenticationManager\` + a \`UserDetailsService\` that loads by email.
3. Generate a JWT signed with a secret from an environment variable; claims: subject = email, role, expiry 24 h.
4. Wrong email or wrong password → the **same** 401 message ("Invalid email or password").
5. An inactive user cannot log in.
`,
            ['Correct credentials return a signed JWT with role and expiry', 'Wrong email and wrong password give the same 401', 'Secret key is read from the environment', 'Inactive users are refused'],
            [
              { q: 'How is a JWT different from a server session?', a: 'A session stores state on the server and the client keeps only an id. A JWT carries the user claims itself, signed by the server, so the server stays stateless and any instance can verify it. The trade-off: a JWT cannot be revoked easily before it expires.' },
              { q: 'What are the three parts of a JWT?', a: 'Header (algorithm, type), payload (claims like sub, role, exp) and signature. Header and payload are only Base64-encoded, not encrypted — never put secrets in them.' },
              { q: 'Why give the same error for a wrong email and a wrong password?', a: 'Different messages let an attacker find out which emails are registered (user enumeration).' },
            ]),
        ],
      },
      {
        title: 'Day 7 — Authorization',
        tasks: [
          task('JWT filter and role-based access', 'pr', 3,
            'As the clinic we make sure each role can reach only its own APIs.',
            `
1. A \`OncePerRequestFilter\` reads \`Authorization: Bearer <token>\`, validates it and sets the authentication in the \`SecurityContext\`.
2. \`SecurityFilterChain\`: stateless sessions, CSRF off for the API, CORS for the frontend origin.
3. Rules: \`/api/auth/**\` and \`GET /api/doctors/**\` public; \`/api/admin/**\` ADMIN; \`/api/doctor/**\` DOCTOR; \`/api/patient/**\` PATIENT.
4. Add \`GET /api/me\` that returns the logged-in user.
5. Missing/invalid token → 401, wrong role → 403 (in your ApiError format).
`,
            ['Requests without a token to protected APIs get 401', 'A patient calling an admin API gets 403', 'GET /api/me returns the current user', 'Sessions are stateless'],
            [
              { q: 'Authentication vs authorization?', a: 'Authentication answers "who are you?" (login, token check). Authorization answers "what may you do?" (role/permission checks). 401 = not authenticated, 403 = authenticated but not allowed.' },
              { q: 'Why is CSRF protection usually disabled for a JWT API?', a: 'CSRF abuses cookies the browser sends automatically. A token sent in the Authorization header is not attached automatically, so a forged cross-site request cannot carry it. (If you store the JWT in a cookie, you need CSRF protection again.)' },
              { q: 'Where does the filter sit in the request flow?', a: 'In the Spring Security filter chain, before UsernamePasswordAuthenticationFilter; it runs before the request reaches DispatcherServlet and your controller.' },
            ]),
        ],
      },
      {
        title: 'Day 8 — Login screens',
        tasks: [
          task('Register and login screens with protected routes', 'pr', 3,
            'As a user I can register, log in, and only see pages for my role.',
            `
1. Register and Login forms with client-side validation and server error messages shown under the fields.
2. Store the token, an \`AuthContext\` that exposes \`user\`, \`login\`, \`logout\`.
3. An axios interceptor adds the token; on 401 it logs the user out.
4. A \`ProtectedRoute\` component that checks login and role; after login send each role to its own home page.
`,
            ['A new patient can register and is logged in', 'Token is attached to every API call', 'A patient cannot open admin pages by typing the URL', 'An expired token logs the user out'],
            [
              { q: 'localStorage vs httpOnly cookie for the token?', a: 'localStorage is simple but readable by any JavaScript, so an XSS bug can steal it. An httpOnly cookie cannot be read by JS, but then you need CSRF protection. Many apps use a short-lived access token in memory plus an httpOnly refresh cookie.' },
              { q: 'Is hiding a page in React enough to protect it?', a: 'No. Frontend checks are only for user experience; anyone can call the API directly. The real protection is on the server (Day 7).' },
            ]),
        ],
      },
      {
        title: 'Day 9 — Doctor accounts',
        tasks: [
          task('Admin creates doctor accounts', 'pr', 2,
            'As the admin I create doctor accounts; doctors set their own password on first login.',
            `
- Seed one ADMIN user on startup from environment variables (only if none exists).
- \`POST /api/admin/doctors\`: creates a User (role DOCTOR) + Doctor profile with a temporary password and \`mustChangePassword = true\`.
- \`POST /api/auth/change-password\`: old + new password; clears the flag.
- Frontend: if \`mustChangePassword\`, force the change-password screen after login.
- Admin can deactivate a doctor (soft delete, \`active = false\`).
`,
            ['An admin is created on first startup', 'Admin can create and deactivate doctors', 'A new doctor must change the password before anything else', 'Patients cannot create doctors (403)'],
            [
              { q: 'Soft delete vs hard delete?', a: 'Soft delete sets a flag (active=false) and keeps the row, so history (past appointments) stays intact and it can be undone. Hard delete removes the row and can break foreign keys or lose records.' },
              { q: 'How would you make an endpoint admin-only besides URL rules?', a: '@PreAuthorize("hasRole(\'ADMIN\')") on the method with @EnableMethodSecurity — useful when rules depend on the method rather than the path.' },
            ]),
          task('Explain your auth flow', 'text', 1,
            'As a candidate I can explain authentication and authorization in my own words.',
            `
Write (in your own words, no copy-paste) how a request travels in **your** app:
register → password hashing → login → token creation → token on each request → filter → SecurityContext → role check → controller.

Also add this explanation, with a diagram, to your README under "Security". You will be asked this in every interview.
`,
            ['Covers every step from login to the controller', 'Explains 401 vs 403 with an example from the app', 'README has a Security section'],
            [
              { q: 'Walk me through what happens when a logged-in patient books an appointment.', a: 'The browser sends POST with Authorization: Bearer token → JWT filter validates signature and expiry → loads the user and sets the SecurityContext → the rule for /api/patient/** checks role PATIENT → controller → service applies business rules in a transaction → repository saves → 201 with a DTO.' },
              { q: 'How would you log a user out with JWTs?', a: 'Delete the token on the client; for real revocation keep tokens short-lived with refresh tokens, or keep a deny-list of token ids until they expire.' },
            ]),
        ],
      },
    ],
  },

  /* ── Sprint 3 ─────────────────────────────────────────────────────────────── */
  {
    title: 'Sprint 3 — Core clinic features',
    goal: 'Patients find doctors and book free slots without double bookings; doctors manage their day and write visit notes.',
    days: [
      {
        title: 'Day 10 — Doctors directory',
        tasks: [
          task('Doctor list with search, filter and pagination', 'pr', 3,
            'As a patient I can find a doctor by name or specialization.',
            `
- \`GET /api/doctors?search=&specialization=&page=0&size=10&sort=experienceYears,desc\` (public).
- Use \`Pageable\` and return \`Page<DoctorDto>\` (content, totalElements, totalPages).
- Admin can edit specialization, fee, bio.
- Frontend: doctor cards, search box (debounced), specialization dropdown, pagination controls.
`,
            ['Search by name works (case-insensitive)', 'Filter by specialization works', 'Results are paginated and sortable', 'Inactive doctors never appear'],
            [
              { q: 'Why paginate instead of returning all rows?', a: 'Large lists are slow to query, transfer and render. Pagination keeps response size bounded and the database uses LIMIT/OFFSET (or keyset pagination for very large tables).' },
              { q: 'What is debouncing and why use it on a search box?', a: 'Waiting until the user stops typing for a short time (e.g. 300 ms) before calling the API, so you send one request instead of one per keystroke.' },
              { q: 'Derived query method vs @Query?', a: 'Derived methods (findBySpecializationIgnoreCase) are generated from the name — great for simple queries. @Query (JPQL/native) is for complex joins or when the name would become unreadable.' },
            ]),
        ],
      },
      {
        title: 'Day 11 — Availability',
        tasks: [
          task('Doctor availability and free slots', 'pr', 3,
            'As a doctor I set my weekly hours; as a patient I see the free slots for a date.',
            `
- Doctor: \`PUT /api/doctor/availability\` — weekly schedule, e.g. Mon 10:00–13:00, slot 15 min. Validate start < end, no overlapping ranges on the same day.
- Public: \`GET /api/doctors/{id}/slots?date=2026-12-01\` — generate slots from the schedule, **remove already-booked ones and past times**.
- Use \`LocalDate\`/\`LocalTime\`, and decide the clinic time zone (Asia/Kolkata) in one place.
`,
            ['Doctor can save a weekly schedule; overlaps are rejected', 'Slots for a date exclude booked and past slots', 'A day with no schedule returns an empty list', 'Times use the clinic time zone consistently'],
            [
              { q: 'Why are dates and time zones a common source of bugs?', a: 'The server, database and browser may be in different zones; mixing LocalDateTime with UTC instants shifts times. Pick one rule (store UTC instants or a fixed clinic zone) and convert only at the edges.' },
              { q: 'Why compute slots instead of storing every slot as a row?', a: 'Slots are derived data. Generating them from the schedule avoids millions of rows and keeps schedule changes simple; only actual bookings are stored.' },
            ]),
        ],
      },
      {
        title: 'Day 12 — Booking',
        tasks: [
          task('Book an appointment without double booking', 'pr', 3,
            'As a patient I can book a free slot, and two patients can never get the same slot.',
            `
\`POST /api/patient/appointments\` \`{ doctorId, date, startTime, reason }\`.

Rules:
- The slot must exist in the doctor\'s schedule, be in the future, and be free.
- A patient cannot hold two appointments at the same time.
- **Concurrency:** two requests for the same slot at the same moment — only one may succeed. Add a unique constraint on (doctor_id, date, start_time) and turn the duplicate-key exception into 409 "Slot just got booked".
- Status starts as BOOKED.
`,
            ['Booking a free slot returns 201', 'Booking a taken slot returns 409', 'Two simultaneous requests: exactly one succeeds (show how you tested it)', 'Past slots and slots outside the schedule are rejected'],
            [
              { q: 'How do you prevent double booking under concurrency?', a: 'Checking "is it free?" then inserting is a race. Let the database decide: a unique constraint on (doctor, date, time) makes the second insert fail; or lock with SELECT … FOR UPDATE / optimistic locking (@Version). Catch the failure and return 409.' },
              { q: 'What is optimistic vs pessimistic locking?', a: 'Optimistic: no lock, a @Version column is checked on update and a conflict throws an exception — good when conflicts are rare. Pessimistic: lock the row while working (SELECT FOR UPDATE) — safe but reduces concurrency.' },
              { q: 'Which HTTP status for a conflict and why?', a: '409 Conflict: the request is valid but conflicts with the current state of the resource.' },
            ]),
        ],
      },
      {
        title: 'Day 13 — Booking screen',
        tasks: [
          task('Booking flow in the UI', 'pr', 3,
            'As a patient I pick a doctor, a date and a slot, and confirm.',
            `
Doctor page → date picker (next 14 days) → slot buttons → reason → confirm.
- Show loading and empty states ("No free slots on this day").
- On 409, show "Someone just booked this slot" and reload the slots.
- After booking, go to My Appointments with a success message.
`,
            ['Patient can complete a booking end to end', 'Loading and empty states are handled', 'A 409 refreshes the slots with a clear message'],
            [
              { q: 'useEffect dependency array — what happens if you leave it out or leave it empty?', a: 'No array: runs after every render. Empty []: runs once after mount. [date, doctorId]: runs when those values change — correct for "reload slots when the date changes".' },
              { q: 'Lifting state up vs Context — when to use which?', a: 'Lift state to the nearest common parent when a few nearby components share it. Use Context for app-wide data (logged-in user, theme) to avoid passing props through many levels.' },
            ]),
        ],
      },
      {
        title: 'Day 14 — Appointment lifecycle',
        tasks: [
          task('Cancel, reschedule and status changes', 'pr', 3,
            'As a patient I can cancel or reschedule; as a doctor I confirm, complete or mark no-show.',
            `
Status flow: BOOKED → CONFIRMED → COMPLETED, or CANCELLED / NO_SHOW.

- Patient: cancel or reschedule only up to **2 hours before** the slot; reschedule = same rules as booking.
- Doctor: confirm, complete, mark no-show — only for **their own** appointments.
- Reject illegal transitions (e.g. COMPLETED → BOOKED) with 400.
- Patient: \`GET /api/patient/appointments?status=upcoming|past\`.
`,
            ['Allowed transitions work, illegal ones return 400', 'Cancel/reschedule is refused within 2 hours of the slot', 'A doctor cannot change another doctor\'s appointment (403)', 'Patients see upcoming and past appointments separately'],
            [
              { q: 'How would you model allowed status transitions cleanly?', a: 'Put the rules in one place — e.g. the enum holds the set of next allowed states and a method canMoveTo(next) — instead of if/else spread across services. This is a simple state machine.' },
              { q: 'What is an IDOR bug and how does this task avoid it?', a: 'Insecure Direct Object Reference: changing an id in the URL to reach someone else\'s data. Always check ownership on the server (appointment.doctor == logged-in doctor), not just the role.' },
            ]),
        ],
      },
      {
        title: 'Day 15 — Doctor\'s day and history',
        tasks: [
          task('Doctor\'s day view and visit notes', 'pr', 2,
            'As a doctor I see today\'s patients and record diagnosis and prescription.',
            `
- \`GET /api/doctor/appointments?date=\` — sorted by time, with patient name and age.
- \`POST /api/doctor/appointments/{id}/notes\` — diagnosis, prescription, follow-up date; only for COMPLETED appointments, only the treating doctor.
- Frontend: a day timeline and a notes form.
`,
            ['Doctor sees their appointments for a date', 'Notes can only be added to their own completed appointments', 'Follow-up date must be in the future'],
            [
              { q: 'What is the N+1 query problem and how do you spot and fix it?', a: 'Loading a list then lazily loading a relation per row causes 1 + N queries. Spot it with SQL logging; fix with JOIN FETCH, @EntityGraph or a DTO projection query.' },
            ]),
          task('Patient medical history', 'pr', 2,
            'As a patient I see my past visits with the doctor\'s notes.',
            `
\`GET /api/patient/history\` — past appointments with doctor name, specialization and visit notes, newest first. A patient can only see their own history.
`,
            ['History lists past visits with notes, newest first', 'A patient can never see another patient\'s notes'],
            [
              { q: 'Why is health data treated as sensitive, and what does that mean for your API?', a: 'It is personal and can cause harm if leaked. Return it only to the owner and the treating doctor, never log it, use HTTPS, and keep access checks on the server.' },
            ]),
        ],
      },
    ],
  },

  /* ── Sprint 4 ─────────────────────────────────────────────────────────────── */
  {
    title: 'Sprint 4 — Quality, reports & release',
    goal: 'Notifications, an admin dashboard, tests, API docs, a live deployment, and one feature you design yourself.',
    days: [
      {
        title: 'Day 16 — Notifications',
        tasks: [
          task('Email confirmation on booking', 'pr', 2,
            'As a patient I get an email when I book, cancel or reschedule.',
            `
- Spring Mail with SMTP settings from environment variables (use Mailtrap/Gmail app password for testing).
- Send **asynchronously** (\`@Async\` or an application event) so booking stays fast even if mail is slow.
- Mail failure must not fail the booking — log it.
`,
            ['Booking, cancelling and rescheduling send an email', 'Booking response time does not wait for the email', 'A mail error is logged and the booking still succeeds'],
            [
              { q: 'Why send the email asynchronously?', a: 'SMTP can take seconds or fail. Doing it in the request makes the user wait and can fail the booking for an unrelated reason. Async (or a queue) decouples the two.' },
              { q: 'What is @TransactionalEventListener(phase = AFTER_COMMIT) useful for here?', a: 'It sends the email only after the booking transaction commits, so you never email about a booking that was rolled back.' },
            ]),
        ],
      },
      {
        title: 'Day 17 — Admin dashboard',
        tasks: [
          task('Admin dashboard with reports', 'pr', 2,
            'As the admin I see how the clinic is doing.',
            `
\`GET /api/admin/stats?from=&to=\`: appointments per day, per doctor, by status, no-show rate, revenue (completed × fee).
Do the grouping **in SQL** (GROUP BY), not by loading all rows into Java. Show it with simple charts in React.
`,
            ['Stats are correct for a date range', 'Aggregation happens in the database', 'Dashboard shows at least three charts or tables'],
            [
              { q: 'Why aggregate in SQL instead of Java?', a: 'The database is built for it, uses indexes, and returns a few rows instead of shipping thousands of rows over the network into memory.' },
              { q: 'Which index would help "appointments per doctor per day"?', a: 'A composite index on (doctor_id, date) — it matches the filter and grouping columns. Column order matters: the most selective/filtered column first.' },
            ]),
        ],
      },
      {
        title: 'Day 18 — Tests and API docs',
        tasks: [
          task('Unit and integration tests', 'pr', 3,
            'As a team we can change code without fear because tests catch regressions.',
            `
- Unit tests (JUnit 5 + Mockito) for the booking service: free slot, taken slot, past slot, 2-hour rule, illegal transition.
- Integration tests (\`@SpringBootTest\` + MockMvc, H2 or Testcontainers MySQL): register → login → book → 409 on a second booking.
- Aim for the business rules, not getters/setters. Add a GitHub Actions workflow that runs \`mvn test\` on every PR.
`,
            ['At least 8 meaningful tests pass', 'The double-booking rule has a test', 'GitHub Actions runs the tests on every PR'],
            [
              { q: 'Unit test vs integration test?', a: 'A unit test checks one class in isolation with dependencies mocked — fast and precise. An integration test runs several layers together (web, service, DB) — slower but proves they work together.' },
              { q: 'What is mocking and when should you not mock?', a: 'Replacing a dependency with a fake that returns controlled results. Do not mock the thing you are testing, and prefer a real DB (Testcontainers) for repository queries, since a mock cannot prove the SQL is right.' },
            ]),
          task('API documentation with Swagger', 'commit', 1,
            'As a frontend developer I can read and try every API.',
            `
Add springdoc-openapi, describe endpoints and DTOs, and configure the bearer-token "Authorize" button. Link \`/swagger-ui.html\` in the README.
`,
            ['Swagger UI lists every endpoint', 'Protected endpoints can be tried with a token', 'README links to the docs'],
            [
              { q: 'What are idempotent HTTP methods?', a: 'Calling them many times has the same effect as once: GET, PUT, DELETE (and HEAD, OPTIONS). POST is not — two POSTs can create two appointments.' },
            ]),
        ],
      },
      {
        title: 'Day 19 — Deploy',
        tasks: [
          task('Dockerize and deploy', 'url', 3,
            'As a recruiter I can open your app on the internet.',
            `
1. Dockerfile for the backend (multi-stage: build with Maven, run on a slim JRE).
2. \`docker-compose.yml\` with backend + MySQL for local runs.
3. Deploy: backend + DB (Render / Railway / AWS EC2 + RDS), frontend (Vercel / Netlify).
4. Secrets only in the host\'s environment settings. Enable HTTPS.

Submit the live frontend URL. Put demo logins for each role in the README.
`,
            ['The app is live over HTTPS', 'docker compose up runs it locally', 'No secret is in the repository', 'README has the live link and demo logins'],
            [
              { q: 'What is a multi-stage Docker build and why use it?', a: 'One stage compiles with the full JDK and Maven, the final stage copies only the jar onto a small JRE image. The result is smaller, faster to ship and has fewer tools an attacker could use.' },
              { q: 'Docker image vs container?', a: 'An image is the read-only template (layers of files + config). A container is a running instance of an image with its own writable layer.' },
            ]),
          task('README with screenshots and a demo video', 'url', 2,
            'As a candidate my project sells itself in two minutes.',
            `
Update the README: problem, features per role, architecture diagram, ER diagram, screenshots, tech stack, how to run, live link. Record a 2–3 minute demo video (Loom/YouTube unlisted) and submit its link.
`,
            ['README has screenshots, architecture and run steps', 'Demo video shows all three roles in under 3 minutes'],
            [
              { q: 'Tell me about your project in two minutes.', a: 'Use: problem (clinics juggle bookings on phone/paper) → what you built (roles, booking without double booking, notes, dashboard) → one hard problem you solved (concurrency with a unique constraint, or the auth flow) → result (live link, tests, CI).' },
            ]),
        ],
      },
      {
        title: 'Day 20 — Your feature and demo',
        tasks: [
          task('Design and build your own feature', 'pr', 4,
            'As the product owner of my project I add a feature that makes it mine.',
            `
Pick ONE (or propose your own to your mentor): waiting-list when a day is full · appointment reminders 24 h before · doctor ratings after a completed visit · invoice PDF · video-consultation link · multi-clinic branches · SMS/WhatsApp notification.

Before coding, write in the PR description: the user story, the API design, the DB changes, and edge cases. Then build it with tests.
`,
            ['PR description has story, API design, DB changes and edge cases', 'Feature works end to end with tests', 'README mentions the feature'],
            [
              { q: 'What feature did you add on your own, and what trade-offs did you make?', a: 'Your own answer — interviewers expect: why this feature, how you designed it, one edge case you handled, and what you would improve next.' },
            ]),
          task('Final demo and retrospective', 'text', 1,
            'As a team member I reflect on what I built and learned.',
            `
Write a short retrospective: what went well, what was hard, what you would do differently, and the three things you learned that you will mention in interviews.
`,
            ['Covers went well / hard / do differently', 'Lists three concrete learnings'],
            [
              { q: 'What was the hardest bug you faced in this project and how did you fix it?', a: 'Your own answer — structure it as situation, what you tried, how you found the root cause (logs, debugger, tests), the fix, and what you changed to prevent it again.' },
            ]),
        ],
      },
    ],
  },
];

export const clinicAppointmentSystem = {
  title: 'Clinic Appointment System',
  domain: 'Healthcare',
  techStack: ['Java 17', 'Spring Boot', 'Spring Security + JWT', 'MySQL', 'React'],
  level: 'intermediate' as const,
  reviewMode: 'mentor' as const,
  summary: `
A clinic where **patients** find doctors and book appointments online, **doctors** manage their schedule and write visit notes, and the **admin** manages doctors and sees how the clinic is doing.

## What you will be able to say in an interview
- Built a role-based REST API with Spring Boot, Spring Security and JWT (Admin, Doctor, Patient)
- Prevented double booking under concurrent requests with a database constraint
- Designed the schema, wrote unit + integration tests, ran them in GitHub Actions
- Deployed the app with Docker, HTTPS and environment-based secrets

## How you work
Every task is a branch and a pull request in your own repository. Read the brief, check every "Done when" point, submit the proof, then answer the interview questions.
`.trim(),
  sprints,
};
