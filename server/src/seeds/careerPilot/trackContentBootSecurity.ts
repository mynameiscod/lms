/**
 * Career-track content: Spring Security and JWT (JT_BOOT_SECURITY), for Java Full Stack + AI and
 * Java Backend Engineer.
 *
 * Stack: Spring Boot 3 / Spring Security 6 with the lambda DSL (a SecurityFilterChain bean — never
 * WebSecurityConfigurerAdapter, which was removed), BCryptPasswordEncoder, stateless sessions, and
 * jjwt 0.12 for tokens (Jwts.builder()...signWith(key), Jwts.parser().verifyWith(key)). The
 * students already have a Spring Boot REST API on Spring Data JPA and MySQL; this topic locks it
 * down. Storing and sending the token from React belongs to JT_FULLSTACK and is only mentioned.
 *
 * The questions are about what Spring Security does with a specific configuration or request,
 * because that is how it is examined: "why is this 403?", "why does this token still work?".
 *
 * Attribution: the topic is multi-skill (SPRING_SECURITY, AUTHENTICATION, AUTHORIZATION). Every
 * checkpoint question names the one skill it measures — from the unit's own skillKeys where the
 * unit declares them, else from the topic's list. Practice mcqs name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_BOOT_SECURITY_BUNDLES: PilotBundle[] = [
  /* ── FILTER_CHAIN ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_SECURITY_FILTER_CHAIN',
    notes: `Your shop API works: products, orders, customers, all in MySQL. Right now anyone who can reach
port 8080 can read every order and delete every product. **Spring Security** is the module that
decides, for every request, *who is calling* (authentication) and *whether they may do this*
(authorization) — before your controller runs.

## What the starter does on its own

Add one dependency:

    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>

Restart, and **every endpoint now answers 401**. Boot's default configuration requires
authentication for every request, creates one in-memory user called \`user\` and prints its
password in the log:

    Using generated security password: 8f1c2a7e-...

It also switches on a login form and HTTP Basic. That default is deliberately locked down; it is
not what a REST API wants, so you replace it with your own configuration.

## Where security sits: filters, not controllers

Spring Security is a set of **servlet filters** that run *before* the \`DispatcherServlet\`:

    request
      → DelegatingFilterProxy        (a normal servlet filter registered by Boot)
      → FilterChainProxy             (Spring Security's entry point)
      → SecurityFilterChain: CorsFilter → CsrfFilter → LogoutFilter
           → [authentication filters: form login, HTTP Basic, your JWT filter]
           → AnonymousAuthenticationFilter → ExceptionTranslationFilter
           → AuthorizationFilter     (last: allow or deny)
      → DispatcherServlet → your @RestController

Two consequences you will meet again and again:

- A request that is denied **never reaches your controller**, so nothing in it — not even a
  \`@RestControllerAdvice\` — runs for that request.
- An exception thrown inside a filter is outside Spring MVC's exception handling.

Each authentication filter tries to work out who the caller is and, if it can, stores an
\`Authentication\` in the **\`SecurityContextHolder\`** (a thread-local for this request). If none
can, \`AnonymousAuthenticationFilter\` puts in an anonymous one. Finally \`AuthorizationFilter\`
compares that \`Authentication\` with your rules.

## Your own SecurityFilterChain

In Spring Security 6 there is no \`WebSecurityConfigurerAdapter\` to extend; you declare a
\`SecurityFilterChain\` bean with the lambda DSL. When such a bean exists, Boot's default chain
backs off.

    @Configuration
    @EnableWebSecurity
    public class SecurityConfig {

        @Bean
        SecurityFilterChain api(HttpSecurity http) throws Exception {
            http
                .csrf(csrf -> csrf.disable())                       // why: see below
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                    .requestMatchers("/api/auth/**", "/error").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/products/**").permitAll()
                    .requestMatchers("/api/admin/**").hasRole("ADMIN")
                    .anyRequest().authenticated());
            return http.build();
        }
    }

**Rules are checked top to bottom and the first match wins.** Put specific paths first and
\`anyRequest()\` last — Spring Security 6 refuses to start if a \`requestMatchers\` call comes after
\`anyRequest()\`. \`antMatchers\` and \`authorizeRequests\` are the old Spring Security 5 names; use
\`requestMatchers\` and \`authorizeHttpRequests\`.

Why \`/error\` is permitted: when a controller throws, Boot forwards to \`/error\` to render the
error JSON. Spring Security 6 secures that forward too, so without the rule a 400 or 500 turns
into a confusing 401.

**STATELESS** means Spring Security never creates an \`HttpSession\` and never sends a
\`JSESSIONID\` cookie: every request must prove who it is on its own — in this topic, with a
bearer token.

## 401 versus 403

\`ExceptionTranslationFilter\` turns security failures into responses:

| Situation | Status | Meaning |
|---|---|---|
| No credentials, or a bad/expired token | **401 Unauthorized** | "I don't know who you are" |
| Known user without the right role | **403 Forbidden** | "I know who you are; you may not" |

401 comes from the **AuthenticationEntryPoint**, 403 from the **AccessDeniedHandler**. Watch out:
with no login mechanism configured (no form login, no HTTP Basic), Spring Security's default entry
point answers **403** even for anonymous callers. A JWT API therefore sets its own entry point
that returns 401 — you will do that in the JWT unit.

## Why CSRF is off — and when it must not be

A CSRF attack makes a victim's browser send a request to your site, and the browser helpfully
attaches the victim's **cookies**. If your API authenticated with a session cookie, that forged
request would be logged in. This API authenticates with an \`Authorization: Bearer ...\` header,
which a browser **never attaches on its own**, and keeps no session. So there is nothing for a
forged request to ride on, and disabling CSRF is correct *here*. If you ever move the token into
a cookie, CSRF protection comes back on.

## Common mistakes

- Putting \`anyRequest().authenticated()\` first and wondering why the public paths are locked.
- Forgetting \`/error\`, so every real error is reported as 401.
- Disabling CSRF "because Postman complained" in an app that uses session cookies.
- Treating 401 and 403 as the same thing in logs and in the frontend.`,
    mcqs: [
      mcq('After adding spring-boot-starter-security to the shop API and nothing else, GET /api/products returns 401 for every client. Why?', [
        ['The starter disables all controllers until a role is assigned', false],
        ['Boot\'s default chain requires authentication for every request', true],
        ['GET requests now need a CSRF token in a header', false],
      ], 'With no SecurityFilterChain of your own, Boot installs a default one that authenticates every request (with a generated user). Controllers still exist; CSRF does not apply to GET.'),
      mcq(`An anonymous client sends GET /api/products/5. What does it get with these rules?

    .authorizeHttpRequests(auth -> auth
        .requestMatchers("/api/**").authenticated()
        .requestMatchers(HttpMethod.GET, "/api/products/**").permitAll()
        .anyRequest().denyAll())`, [
        ['200, because the more specific rule is preferred', false],
        ['403, because anyRequest() denies everything', false],
        ['A rejection, because /api/** matches first', true],
      ], 'Rules are evaluated in order and the first match decides. /api/** already matches, so the permitAll line is never reached and the anonymous caller is refused. Specific rules must come first.'),
      mcq('Where in a request\'s journey does Spring Security\'s check happen?', [
        ['In servlet filters, before the DispatcherServlet', true],
        ['Inside the DispatcherServlet, after the handler is chosen', false],
        ['In an interceptor wrapped around each controller method', false],
      ], 'FilterChainProxy runs as a servlet filter ahead of the DispatcherServlet, which is why a denied request never reaches a controller or its advice.'),
    ],
    checkpoint: [
      ck('AUTHORIZATION', 'A valid token for ravi@shop.in (authority ROLE_USER) is sent to /api/admin/reports, which requires hasRole("ADMIN"). What does the API answer?', [
        ['401, because the token was not accepted', false],
        ['404, because admin paths are hidden from users', false],
        ['403, because he is known but not allowed', true],
      ], 'The token authenticated Ravi, so this is not a 401. He lacks ROLE_ADMIN, so AuthorizationFilter denies access and the AccessDeniedHandler answers 403 Forbidden.'),
      ck('SPRING_SECURITY', 'The shop API is stateless and every call carries `Authorization: Bearer <token>`. Why is `csrf(csrf -> csrf.disable())` acceptable for it?', [
        ['A browser never attaches that header to a forged request by itself', true],
        ['CSRF attacks only work against GET requests, which are read-only', false],
        ['The JWT signature also encrypts the body of every request sent', false],
      ], 'CSRF relies on the browser automatically sending credentials, which means cookies. A bearer header is added only by your own code, so a forged cross-site request carries no credentials.'),
      ck('SPRING_SECURITY', 'Which part of the chain converts an AccessDeniedException from AuthorizationFilter into a 401 or 403 response?', [
        ['CsrfFilter, which runs near the start of the chain', false],
        ['ExceptionTranslationFilter', true],
        ['A @RestControllerAdvice with @ExceptionHandler', false],
      ], 'ExceptionTranslationFilter sits just before AuthorizationFilter and catches its exceptions: anonymous callers go to the AuthenticationEntryPoint (401), authenticated ones to the AccessDeniedHandler (403). Controller advice never sees them.'),
    ],
  },

  /* ── USERS_PASSWORDS ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_SECURITY_USERS_PASSWORDS',
    notes: `Before anyone can log in, there must be users — in MySQL, next to your orders — and their
passwords must be stored so that even a leaked database does not leak them.

## The user table and entity

    CREATE TABLE users (
      id            BIGINT PRIMARY KEY AUTO_INCREMENT,
      email         VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(100) NOT NULL,
      role          VARCHAR(20)  NOT NULL,
      active        BOOLEAN      NOT NULL DEFAULT TRUE
    );

    public enum Role { USER, ADMIN }

    @Entity
    @Table(name = "users")
    public class AppUser {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;
        @Column(nullable = false, unique = true)
        private String email;
        @Column(name = "password_hash", nullable = false, length = 100)
        private String passwordHash;
        @Enumerated(EnumType.STRING)
        private Role role;
        private boolean active = true;
        // constructors, getters
    }

    public interface UserRepository extends JpaRepository<AppUser, Long> {
        Optional<AppUser> findByEmail(String email);
        boolean existsByEmail(String email);
    }

The column is called \`password_hash\` on purpose: a plain password is never stored.

## Hashing with BCrypt

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();          // strength 10 by default
    }

A BCrypt hash looks like this:

    $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
    └┬┘└┬┘└────────── 22-char salt ─────┘└───────── hash ──────────┘
     │  cost 10 (2^10 rounds)

- It is **one-way**: there is no "decrypt". To check a login you hash the attempt and compare.
- Every \`encode()\` picks a **new random salt**, so the same password encodes differently each
  time. Two users with \`Welcome@123\` get different hashes, and precomputed tables are useless.
- It is **deliberately slow**; the cost factor lets you make it slower as hardware gets faster.
- The salt and cost live inside the string, so \`matches(raw, hash)\` needs nothing else.

Because of the salt, you can **never** look a user up by \`WHERE password_hash = encode(raw)\`. You
load by email and call \`encoder.matches(raw, storedHash)\` — or, better, let Spring do it.

## Teaching Spring where users live: UserDetailsService

    @Service
    public class AppUserDetailsService implements UserDetailsService {
        private final UserRepository users;
        public AppUserDetailsService(UserRepository users) { this.users = users; }

        @Override
        public UserDetails loadUserByUsername(String email) {
            AppUser u = users.findByEmail(email)
                    .orElseThrow(() -> new UsernameNotFoundException("Unknown user"));
            return User.withUsername(u.getEmail())
                    .password(u.getPasswordHash())
                    .roles(u.getRole().name())        // USER → authority ROLE_USER
                    .disabled(!u.isActive())
                    .build();
        }
    }

"Username" is just Spring's word for the login identifier; here it is the email. With exactly one
\`UserDetailsService\` bean and one \`PasswordEncoder\` bean, Boot wires them into a
\`DaoAuthenticationProvider\`: it loads the user, checks the account is enabled, and calls
\`matches()\`. A wrong password and an unknown email both come out as the same
\`BadCredentialsException\` — so the API cannot be used to find out which emails are registered.

## Registration: encode exactly once

    @Service
    public class RegistrationService {
        private final UserRepository users;
        private final PasswordEncoder encoder;
        // constructor

        @Transactional
        public UserDto register(RegisterRequest req) {
            if (users.existsByEmail(req.email())) throw new EmailTakenException();
            AppUser u = new AppUser(req.email(), encoder.encode(req.password()), Role.USER);
            users.save(u);
            log.info("Registered user id={}", u.getId());   // never the password, never the hash
            return UserDto.from(u);                          // the DTO has no password field
        }
    }

- The role is **set by the server**. A \`role\` field in the request body would let anyone register
  as ADMIN.
- Encode in one place only. Encoding in the controller *and* the service stores a hash of a hash,
  and that user can never log in.
- Never log the request body of \`/register\` or \`/login\`, and never return \`passwordHash\` from
  an endpoint — return a DTO.

## Common mistakes

- Seeding test users with plain passwords in \`data.sql\`: BCrypt then warns *"Encoded password
  does not look like BCrypt"* and every login fails. Seed real hashes.
- A \`password_hash\` column shorter than 60 characters. Use 100 to leave room.
- Calling \`encode()\` to compare instead of \`matches()\`.
- Accepting \`role\` from the client.`,
    workedExample: `**Problem.** Add \`POST /api/auth/register\` so that a new customer can sign up, and prove that
Spring can then authenticate them.

**Step 1 — the request.** A record with validation, and deliberately no role:

    public record RegisterRequest(
        @Email @NotBlank String email,
        @NotBlank @Size(min = 8, max = 64) String password) {}

The 64 cap matters: BCrypt only uses the first 72 bytes of its input.

**Step 2 — the controller** stays thin and returns 201:

    @PostMapping("/api/auth/register")
    public ResponseEntity<UserDto> register(@RequestBody @Valid RegisterRequest body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(registration.register(body));
    }

No encoding here: that is the service's single responsibility.

**Step 3 — the service** encodes once, saves, logs only the id (code in the notes).

**Step 4 — check the database.**

    SELECT email, password_hash FROM users WHERE email = 'meena@shop.in';
    -- meena@shop.in | $2a$10$Xk3...   (60 chars, starts with $2a$10$)

Register a second user with the same password: the hash is different — the salt at work.

**Step 5 — prove authentication works** before any JWT exists, with a tiny test:

    @Test
    void storedHashMatchesRawPassword() {
        registration.register(new RegisterRequest("meena@shop.in", "Monsoon#2026"));
        UserDetails u = userDetailsService.loadUserByUsername("meena@shop.in");
        assertTrue(encoder.matches("Monsoon#2026", u.getPassword()));
        assertFalse(encoder.matches("monsoon#2026", u.getPassword()));
    }

If the first assertion fails, the password was encoded twice or not at all — the two classic
faults. Only once this passes is it worth building login on top.`,
    mcqs: [
      mcq('Meena and Ravi both register with the password Welcome@123 using BCryptPasswordEncoder. Their password_hash values differ. Why?', [
        ['BCrypt mixes the user\'s email into each hash', false],
        ['The cost factor rises by one on every encode()', false],
        ['Each encode() call generates a new random salt', true],
      ], 'BCrypt generates a fresh random salt per encode() and stores it inside the hash string. Same password, different salt, different hash — which defeats precomputed tables.'),
      mcq('A login method calls `userRepo.findByEmailAndPasswordHash(email, encoder.encode(raw))`. What happens for a correct password?', [
        ['It finds the user, since equal input gives equal hashes', false],
        ['It finds the user only when the strength is set to 4', false],
        ['It never finds the user: the new hash has another salt', true],
      ], 'encode() salts randomly, so the freshly made hash never equals the stored one. Load the user by email and call matches(raw, storedHash), or let DaoAuthenticationProvider do it.'),
      mcq('In a custom UserDetailsService, what should loadUserByUsername do when no row has that email?', [
        ['Throw UsernameNotFoundException', true],
        ['Return null so Spring can try other users', false],
        ['Return an empty User with a blank password', false],
      ], 'The contract is to throw UsernameNotFoundException. DaoAuthenticationProvider then reports it as BadCredentialsException, so the caller cannot tell an unknown email from a wrong password.'),
    ],
    checkpoint: [
      ck('AUTHENTICATION', 'A BCrypt hash is 60 characters. The shop\'s password_hash column was created as VARCHAR(50) and MySQL runs in its default strict mode. What happens when a user registers?', [
        ['The insert fails with a "Data too long" error', true],
        ['Hibernate widens the column on the first save', false],
        ['The hash is shortened to fit and stored quietly', false],
      ], 'Strict mode rejects a value longer than the column instead of truncating it, so the insert fails. (Without strict mode it would be truncated and the user could never log in.) Size the column at 100.'),
      ck('AUTHENTICATION', 'Which bean makes Boot\'s DaoAuthenticationProvider compare login passwords against BCrypt hashes?', [
        ['@Bean String passwordAlgorithm() { return "BCRYPT"; }', false],
        ['@Bean PasswordEncoder encoder() { return new BCryptPasswordEncoder(); }', true],
        ['@Bean UserDetails admin() { return User.withDefaultPasswordEncoder()...; }', false],
      ], 'DaoAuthenticationProvider uses the PasswordEncoder bean in the context. A string naming an algorithm does nothing, and withDefaultPasswordEncoder is a deprecated demo helper for in-memory users.'),
      ck('SPRING_SECURITY', 'The RegisterRequest record has a `role` field that the service copies into AppUser. What is the risk?', [
        ['Anyone can register themselves as an ADMIN', true],
        ['BCrypt fails when the role is part of the row', false],
        ['Spring rejects users whose role is not USER', false],
      ], 'Whatever the client sends is under the client\'s control. The server must assign the role (USER for sign-ups) and only an existing admin may promote someone.'),
    ],
  },

  /* ── JWT_AUTH ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_SECURITY_JWT_AUTH',
    notes: `With no session, every request must prove who sent it. The standard way for a REST API is a
**JSON Web Token**: the client logs in once, receives a signed token, and sends it on every call
as \`Authorization: Bearer <token>\`.

## What a JWT is

Three base64url parts separated by dots:

    eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtZWVuYUBzaG9wLmluIiwiZXhwIjoxNzk...}.Hk2v9...
    └──── header ────┘ └──────────────── payload (claims) ────────────┘ └ signature ┘

    header : {"alg":"HS256"}
    payload: {"sub":"meena@shop.in","roles":["ROLE_USER"],"iat":1791000000,"exp":1791000900}

The **signature** is an HMAC of header and payload made with a secret only the server knows. If
anyone changes one character of the payload, the signature no longer matches and the server
rejects the token.

**Signed is not encrypted.** Anyone holding the token can base64-decode the payload and read it.
Put an identifier and roles in it — never a password, phone number or anything private.

## Dependencies and configuration (jjwt 0.12)

    <dependency><groupId>io.jsonwebtoken</groupId><artifactId>jjwt-api</artifactId><version>0.12.6</version></dependency>
    <dependency><groupId>io.jsonwebtoken</groupId><artifactId>jjwt-impl</artifactId><version>0.12.6</version><scope>runtime</scope></dependency>
    <dependency><groupId>io.jsonwebtoken</groupId><artifactId>jjwt-jackson</artifactId><version>0.12.6</version><scope>runtime</scope></dependency>

\`application.properties\`:

    app.jwt.secret=\${JWT_SECRET}
    app.jwt.ttl-minutes=15

The secret comes from an **environment variable**, never from a committed file. Generate one with
\`openssl rand -base64 32\` (32 random bytes = 256 bits; HS256 refuses a shorter key with
\`WeakKeyException\`). Use a different secret per environment. Fifteen minutes is a deliberately
short lifetime, for a reason explained below.

## Issuing and checking tokens

    @Service
    public class JwtService {
        private final SecretKey key;
        private final long ttlMinutes;

        public JwtService(@Value("\${app.jwt.secret}") String secret,
                          @Value("\${app.jwt.ttl-minutes}") long ttlMinutes) {
            this.key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
            this.ttlMinutes = ttlMinutes;
        }

        public String issue(UserDetails user) {
            Instant now = Instant.now();
            return Jwts.builder()
                    .subject(user.getUsername())
                    .claim("roles", user.getAuthorities().stream()
                            .map(GrantedAuthority::getAuthority).toList())
                    .issuedAt(Date.from(now))
                    .expiration(Date.from(now.plus(ttlMinutes, ChronoUnit.MINUTES)))
                    .signWith(key)                         // HS256 for a 256-bit key
                    .compact();
        }

        /** The subject (email); throws JwtException if forged, malformed or expired. */
        public String subjectOf(String token) {
            return Jwts.parser().verifyWith(key).build()
                    .parseSignedClaims(token)
                    .getPayload()
                    .getSubject();
        }
    }

\`parseSignedClaims\` verifies the signature **and** the \`exp\` claim. An expired token throws
\`ExpiredJwtException\`; a tampered one \`SignatureException\`; garbage \`MalformedJwtException\`.
All extend \`JwtException\`. It also refuses an unsigned token (\`"alg":"none"\`).

## The login endpoint

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @PostMapping("/api/auth/login")
    public TokenResponse login(@RequestBody @Valid LoginRequest body) {
        Authentication auth = authManager.authenticate(
                new UsernamePasswordAuthenticationToken(body.email(), body.password()));
        return new TokenResponse(jwt.issue((UserDetails) auth.getPrincipal()), "Bearer", 900);
    }

\`authenticate()\` runs the \`DaoAuthenticationProvider\` from the previous unit. A wrong password
throws \`BadCredentialsException\`; map it to **401** in your \`@RestControllerAdvice\` with a
message that does not say *which* part was wrong.

## The filter that reads the token

    @Component
    public class JwtAuthFilter extends OncePerRequestFilter {
        private final JwtService jwt;
        private final UserDetailsService users;
        // constructor

        @Override
        protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res,
                                        FilterChain chain) throws ServletException, IOException {
            String header = req.getHeader(HttpHeaders.AUTHORIZATION);
            if (header == null || !header.startsWith("Bearer ")) {
                chain.doFilter(req, res);              // no token: stay anonymous, rules decide
                return;
            }
            try {
                UserDetails user = users.loadUserByUsername(jwt.subjectOf(header.substring(7)));
                if (user.isEnabled()) {
                    var auth = new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
                    SecurityContext ctx = SecurityContextHolder.createEmptyContext();
                    ctx.setAuthentication(auth);
                    SecurityContextHolder.setContext(ctx);
                }
            } catch (JwtException | UsernameNotFoundException e) {
                log.debug("Bearer token rejected: {}", e.getClass().getSimpleName()); // never the token
            }
            chain.doFilter(req, res);
        }
    }

Points worth saying out loud in an interview:

- The **three-argument** \`UsernamePasswordAuthenticationToken\` constructor creates an
  *authenticated* token; the two-argument one creates an unauthenticated login request.
- A bad or expired token is **caught**, not thrown. The request carries on anonymous, and the
  authorization rules plus the entry point turn that into a clean 401. An exception escaping a
  filter would become a 500, and \`@RestControllerAdvice\` cannot catch it.
- Loading the user on every request costs one query but lets you refuse a disabled account
  immediately. Trusting only the token's claims saves the query and loses that.
- Because the class is a \`@Component\`, Boot also registers it as a plain servlet filter;
  \`OncePerRequestFilter\` guarantees it still runs once per request.

## Wiring it into the chain

    http
        .csrf(csrf -> csrf.disable())
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(/* rules from the first unit */)
        .exceptionHandling(ex -> ex.authenticationEntryPoint((req, res, e) -> {
            res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            res.setContentType("application/json");
            res.getWriter().write("{\\"error\\":\\"unauthorized\\"}");
        }))
        .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

\`addFilterBefore\` places your filter among the authentication filters, well before
\`AuthorizationFilter\`. Put it anywhere after \`AuthorizationFilter\` and the decision is made
before the token is ever read.

## What a JWT does NOT do

- **It cannot be revoked.** A token is valid until \`exp\` because the server checks only the
  signature and the clock. "Logout" in a pure JWT API is the client throwing the token away; a
  stolen token keeps working. Mitigations: a **short expiry** (minutes) with a separate refresh
  token the server stores and can delete; a server-side deny-list of token ids (\`jti\`); a
  "token version" column on the user that is bumped on password change. Each one adds back state.
- **It does not update itself.** Roles copied into the token stay as they were at login until it
  expires.
- **It is not a secret.** Anyone who reads it can use it until it expires — so HTTPS always, and
  never log an \`Authorization\` header.

Where the browser keeps the token and how React attaches it is covered in the full-stack topic
(JT_FULLSTACK).`,
    workedExample: `**Problem.** Trace three requests through the finished API and predict each response before
running it.

**Request 1 — login.**

    POST /api/auth/login   {"email":"meena@shop.in","password":"Monsoon#2026"}

\`/api/auth/**\` is \`permitAll()\`. \`JwtAuthFilter\` sees no \`Authorization\` header and passes the
request on. The controller calls \`authManager.authenticate(...)\`; \`DaoAuthenticationProvider\`
loads Meena, \`matches()\` succeeds, and \`JwtService.issue\` signs a token with
\`sub=meena@shop.in\`, \`roles=["ROLE_USER"]\`, \`exp\` = now + 15 min.
**Response: 200** \`{"token":"eyJ...","type":"Bearer","expiresIn":900}\`.

**Request 2 — her orders, with the token.**

    GET /api/orders
    Authorization: Bearer eyJ...

The filter strips \`Bearer \`, \`parseSignedClaims\` verifies signature and expiry, the user is
loaded and enabled, and an authenticated token with \`ROLE_USER\` goes into the
\`SecurityContextHolder\`. \`AuthorizationFilter\` checks \`anyRequest().authenticated()\` — satisfied.
The controller runs. **Response: 200** with her orders.

**Request 3 — the same call, 16 minutes later.**

\`parseSignedClaims\` throws \`ExpiredJwtException\`. The filter catches it, logs the exception
*class* at debug level, and does **not** set an authentication. \`AnonymousAuthenticationFilter\`
marks the request anonymous; \`AuthorizationFilter\` denies it; \`ExceptionTranslationFilter\` calls
the entry point. **Response: 401** \`{"error":"unauthorized"}\` — and the client knows to log in
again (or use its refresh token).

**What would go wrong without the try/catch?** The \`ExpiredJwtException\` would escape the filter
before the \`DispatcherServlet\`, no controller advice could handle it, and the client would get a
**500** — telling it "the server is broken" when the truth is "your token is old".

**What if Meena's account is disabled at minute 5?** Because this filter reloads the user and checks
\`isEnabled()\`, her next request is anonymous and gets 401. A filter that trusted only the token's
claims would keep accepting her until minute 15 — the revocation gap every JWT design has to answer.`,
    mcqs: [
      mcq('A teammate puts customers\' phone numbers in the JWT payload, saying "it is signed, so it is private". What is wrong?', [
        ['jjwt 0.12 refuses custom claims that are not registered', false],
        ['The signature hides the payload only while the token is valid', false],
        ['Signing stops tampering, but anyone can decode and read it', true],
      ], 'A JWS payload is only base64url-encoded. The signature proves it was not changed; it does nothing to hide it. Keep private data out of the claims.'),
      mcq('An admin deactivates Priya\'s account at 10:00. Her token expires at 10:15, and the shop\'s filter checks only signature and expiry from the claims. What happens to her requests at 10:05?', [
        ['They are still accepted until the token expires', true],
        ['They fail at once, because her user row changed', false],
        ['They fail, because Spring revokes all her tokens', false],
      ], 'A JWT is valid until exp; nothing in the token knows about the database. Short expiry, reloading the user in the filter, or a deny-list are what close the gap.'),
      mcq('JwtAuthFilter receives a request to a permitAll() path with no Authorization header. What should it do?', [
        ['Answer 401 at once, before the rest of the chain', false],
        ['Pass the request on and leave the context empty', true],
        ['Store an anonymous token with ROLE_USER and go on', false],
      ], 'A missing token is not an error for the filter: the request continues anonymous and the authorization rules decide. Rejecting it in the filter would lock out login and public paths.'),
    ],
    checkpoint: [
      ck('AUTHENTICATION', `The token's exp claim is in the past. What does this line do?

    Jwts.parser().verifyWith(key).build().parseSignedClaims(token)`, [
        ['Returns the claims with an expired flag set', false],
        ['Throws ExpiredJwtException, a JwtException', true],
        ['Returns null so the caller can choose what to do', false],
      ], 'parseSignedClaims validates the signature and the exp claim, and throws ExpiredJwtException (a subclass of JwtException) when the token has expired. The filter must catch it.'),
      ck('SPRING_SECURITY', 'JwtService builds its key with `Keys.hmacShaKeyFor("shop-secret".getBytes())` and startup fails with WeakKeyException. Why?', [
        ['HMAC-SHA keys need at least 256 bits; this one is 88', true],
        ['The secret has to be uppercase for an HMAC algorithm', false],
        ['Keys.hmacShaKeyFor only accepts RSA private keys', false],
      ], 'HS256 requires a key of at least 256 bits (32 bytes); "shop-secret" is 11 bytes. Generate 32 random bytes (openssl rand -base64 32) and supply them through an environment variable.'),
      ck('AUTHENTICATION', 'Why does the filter create `new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities())` rather than the two-argument form?', [
        ['The third argument encrypts the credentials in memory', false],
        ['The two-argument form is reserved for HTTP Basic logins', false],
        ['The three-argument form marks the token as authenticated', true],
      ], 'The two-argument constructor creates an unauthenticated request for an AuthenticationManager to check. The three-argument one is already authenticated and carries the authorities that the rules will read.'),
    ],
  },

  /* ── ROLES_ACCESS ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_SECURITY_ROLES_ACCESS',
    notes: `Authentication answered *who*. Authorization answers *may they* — at two levels: may this
user call this endpoint at all (roles), and may this user touch **this particular record**
(ownership). Most real breaches are the second kind.

## Roles and authorities

Spring Security works with **authorities**: plain strings in the \`Authentication\`. A **role** is
an authority with the prefix \`ROLE_\`:

    User.withUsername(email).roles("ADMIN")            // authority "ROLE_ADMIN"
    User.withUsername(email).authorities("ADMIN")      // authority "ADMIN" — no prefix
    new SimpleGrantedAuthority("ROLE_ADMIN")           // the same as roles("ADMIN")

    .requestMatchers("/api/admin/**").hasRole("ADMIN")        // looks for ROLE_ADMIN
    .requestMatchers("/api/reports/**").hasAuthority("REPORTS_READ")   // exact string

\`hasRole("ADMIN")\` adds the prefix for you; \`hasRole("ROLE_ADMIN")\` is rejected at startup.
Mixing these up is the single most common "why is my admin getting 403" bug.

## URL rules

    .authorizeHttpRequests(auth -> auth
        .requestMatchers("/api/auth/**", "/error").permitAll()
        .requestMatchers(HttpMethod.GET, "/api/products/**").permitAll()
        .requestMatchers(HttpMethod.POST, "/api/products/**").hasRole("ADMIN")
        .requestMatchers("/api/admin/**").hasRole("ADMIN")
        .requestMatchers("/api/orders/**").hasAnyRole("USER", "ADMIN")
        .anyRequest().authenticated())

URL rules are good for coarse decisions: whole areas of the API.

## Method security

    @Configuration
    @EnableMethodSecurity            // Spring Security 6; replaces @EnableGlobalMethodSecurity
    public class SecurityConfig { ... }

    @Service
    public class ProductService {
        @PreAuthorize("hasRole('ADMIN')")
        public ProductDto updatePrice(long id, BigDecimal price) { ... }
    }

\`@PreAuthorize\` puts the rule next to the code it protects, so it also holds when another
controller or a scheduled job calls the method. It works through a **proxy**, exactly like
\`@Transactional\`: calling the method via \`this\` from inside the same class skips the check, and
it does nothing without \`@EnableMethodSecurity\`. A failed check throws \`AccessDeniedException\` →
403 — unless a catch-all \`@ExceptionHandler(Exception.class)\` in your advice grabs it first and
turns it into 500. Rethrow it or handle \`AccessDeniedException\` explicitly.

## Ownership: "may this user touch THIS order?"

    @GetMapping("/api/orders/{id}")
    public OrderDto get(@PathVariable long id) {
        return OrderDto.from(orders.findById(id).orElseThrow(NotFoundException::new));   // BUG
    }

Every logged-in customer can read every order by changing the number in the URL. This is called
**IDOR** (insecure direct object reference) or broken object-level authorization, and it tops the
OWASP API list. Roles cannot catch it — Ravi and Meena are both \`ROLE_USER\`.

Fix it in the **query**, using the identity from the security context — never an id sent by the
client:

    public interface OrderRepository extends JpaRepository<Order, Long> {
        Optional<Order> findByIdAndCustomerEmail(Long id, String email);
    }

    @GetMapping("/api/orders/{id}")
    public OrderDto get(@PathVariable long id, @AuthenticationPrincipal UserDetails me) {
        return orders.findByIdAndCustomerEmail(id, me.getUsername())
                .map(OrderDto::from)
                .orElseThrow(NotFoundException::new);          // 404: do not confirm it exists
    }

Answering 404 rather than 403 for someone else's record avoids confirming that order 1043 exists.
An admin view that may see everything gets its own endpoint under \`/api/admin\`.

Method security can express the same rule declaratively:

    @PreAuthorize("hasRole('ADMIN') or @orderAccess.isOwner(#id, authentication.name)")
    public OrderDto find(long id) { ... }

## Roles in the token or from the database?

If the filter reloads the user per request (as ours does), role changes apply on the next request.
If it trusts the \`roles\` claim instead, a demoted admin keeps admin rights until the token expires.
Either is defensible; know which one you built.

## Common mistakes

- Storing \`ADMIN\` and testing \`hasRole\` (or storing \`ROLE_ADMIN\` and calling \`.roles("ROLE_ADMIN")\`).
- Securing only the URL and calling the same service method from an unsecured place.
- Taking the owner id from a request parameter (\`?userId=7\`) instead of the authenticated user.
- Hiding the admin button in the UI and calling that "authorization".`,
    mcqs: [
      mcq('The users table stores role = "ADMIN" and the UserDetailsService builds `new SimpleGrantedAuthority(user.getRole())`. The rule is `.requestMatchers("/api/admin/**").hasRole("ADMIN")`. Why does the admin get 403?', [
        ['hasRole looks for ROLE_ADMIN, but the authority is ADMIN', true],
        ['hasRole only reads roles that are stored inside the JWT', false],
        ['Admin paths are only checked once @EnableMethodSecurity is on', false],
      ], 'hasRole("ADMIN") checks for the authority "ROLE_ADMIN". Build it with .roles("ADMIN") or "ROLE_" + role, or use hasAuthority("ADMIN") consistently.'),
      mcq('Ravi (ROLE_USER) calls GET /api/orders/1043, an order belonging to Meena. The rule is authenticated() and the controller calls orderRepo.findById(id). What is the result?', [
        ['403, because the order is not his', false],
        ['Ravi sees Meena\'s order: a classic IDOR', true],
        ['404, because findById filters by the caller', false],
      ], 'Nothing checks ownership: authenticated() is satisfied and findById returns any row. The query must include the caller\'s identity, e.g. findByIdAndCustomerEmail(id, me.getUsername()).'),
      mcq('`@PreAuthorize("hasRole(\'ADMIN\')")` on ProductService.updatePrice lets ordinary users through, and no error appears. What is the most likely cause?', [
        ['The method returns a DTO, which method security skips', false],
        ['hasRole is not allowed inside a @PreAuthorize expression', false],
        ['@EnableMethodSecurity is missing from the configuration', true],
      ], 'Without @EnableMethodSecurity no proxy evaluates @PreAuthorize, so the annotation is silently ignored. hasRole is the usual expression, and return types do not matter.'),
    ],
    checkpoint: [
      ck('AUTHORIZATION', `A USER calls cancelAll() through the controller. Does the role check on cancel() run?

    @Service
    public class OrderService {
        public void cancelAll(List<Long> ids) { ids.forEach(this::cancel); }

        @PreAuthorize("hasRole('ADMIN')")
        public void cancel(Long id) { ... }
    }`, [
        ['No, the call through this skips the proxy', true],
        ['Yes, and the first cancel() call gets a 403', false],
        ['Yes, because method security uses bytecode', false],
      ], 'Method security is proxy-based like @Transactional. cancelAll is not annotated and calls cancel on the raw object, so the check never runs. Annotate the entry method or move cancel to another bean.'),
      ck('AUTHORIZATION', 'The shop\'s @RestControllerAdvice has `@ExceptionHandler(Exception.class)` returning 500. A USER calls a controller method marked `@PreAuthorize("hasRole(\'ADMIN\')")`. What does the client receive?', [
        ['403, as Spring Security handles access errors first', false],
        ['401, as a failed method check means no valid login', false],
        ['500, as the catch-all handler takes the exception', true],
      ], 'The AccessDeniedException is thrown inside handler invocation, where controller advice runs first. A catch-all handler converts it to 500; handle AccessDeniedException explicitly (403) or rethrow it.'),
      ck('AUTHORIZATION', 'Which way of loading an order best enforces "a customer may only see their own order" for GET /api/orders/{id}?', [
        ['findById(id), then hide the button in React for others', false],
        ['findByIdAndCustomerEmail(id, the authenticated email)', true],
        ['findByIdAndCustomerEmail(id, a ?email= query parameter)', false],
      ], 'Ownership must come from the authenticated principal on the server. A query parameter is controlled by the caller, and hiding UI does not stop a direct API call.'),
    ],
  },

  /* ── DEBUGGING ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_SECURITY_DEBUGGING',
    notes: `Security bugs show up as a status code and nothing else: the request is refused before your
code runs, so there is no stack trace of yours to read. Start every case by writing down three
facts: **the status (401, 403 or 500), the method and path, and whether a token was sent.** Then
turn on security logging in development only:

    logging.level.org.springframework.security=DEBUG

It prints which filter decided and why. Never leave it on in production, and never enable
\`@EnableWebSecurity(debug = true)\` there — it prints request headers, including the
\`Authorization\` token.

## 1. Every request is 401 after adding the starter

The log says \`Using generated security password\`. **Cause:** no \`SecurityFilterChain\` bean of
your own, so Boot's default locks everything. Or you wrote one, but it sits in a package outside
component scanning, so it never loaded. **Fix:** declare the chain in a scanned \`@Configuration\`
and \`permitAll()\` the public paths.

## 2. GET works, POST returns 403

Postman: \`GET /api/orders\` 200, \`POST /api/orders\` with the same token 403, empty body.
**Cause:** CSRF protection is on by default and rejects state-changing requests without a CSRF
token. **Fix:** for this stateless bearer-token API, \`csrf(csrf -> csrf.disable())\` — and know the
reason (no cookies, nothing for a forged request to carry). With session cookies you would keep it.

## 3. The admin gets 403

**Cause:** the authority is \`ADMIN\` but the rule says \`hasRole("ADMIN")\`, which looks for
\`ROLE_ADMIN\`. **Fix:** build authorities with \`.roles(...)\`, or switch the rule to
\`hasAuthority("ADMIN")\`. Print \`authentication.getAuthorities()\` once to see the truth.

## 4. A valid token is ignored

Every protected call is 401 even with a fresh token; the filter's log line appears *after* the
denial. **Cause:** \`http.addFilterAfter(jwtFilter, AuthorizationFilter.class)\` — authorization
is decided while the context is still anonymous. **Fix:**
\`addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)\`.

## 5. The password never matches

Registration works; login always fails with "Bad credentials". Look at the row:

    -- plain text: someone inserted test users by hand
    meena@shop.in | Monsoon#2026
    -- or a hash of a hash: encode() in the controller AND in the service
    meena@shop.in | $2a$10$Wq...   (matches(raw, hash) is false)

A plain value also logs *"Encoded password does not look like BCrypt"*. **Fix:** encode exactly
once, in the service, and reseed test users with real hashes. A \`password_hash\` column too short
for 60 characters causes the same symptom where truncation is allowed.

## 6. An expired token gives 500

The response is 500 and the log shows \`io.jsonwebtoken.ExpiredJwtException\` thrown from
\`JwtAuthFilter\`. An \`@ExceptionHandler(ExpiredJwtException.class)\` was added and does nothing.
**Cause:** the filter runs before the \`DispatcherServlet\`, out of reach of controller advice.
**Fix:** catch \`JwtException\` inside the filter, leave the request unauthenticated and let the
entry point answer 401.

## 7. The browser says CORS, Postman works

React on \`http://localhost:5173\` calls the API; the console shows *"Response to preflight request
doesn't pass access control check"*. A \`WebMvcConfigurer.addCorsMappings\` exists. **Cause:** the
browser's \`OPTIONS\` preflight carries no \`Authorization\` header, so Spring Security rejects it
before Spring MVC's CORS handling is reached. Postman sends no preflight, which is why it works.
**Fix:** \`http.cors(Customizer.withDefaults())\` plus a \`CorsConfigurationSource\` bean allowing
that origin, the methods, and the \`Authorization\` and \`Content-Type\` headers. Do not "fix" it
with \`allowedOrigins("*")\`.

## 8. Every error turns into 401

A bad request body should give 400; the client sees 401. **Cause:** Boot forwards errors to
\`/error\`, and Spring Security 6 applies authorization to that forward. **Fix:** \`permitAll()\` on
\`/error\`.

## 9. Anonymous calls get 403, not 401

No token sent, yet the answer is 403. **Cause:** no form login or HTTP Basic is configured, so the
default entry point is \`Http403ForbiddenEntryPoint\`. **Fix:** set an \`authenticationEntryPoint\`
that returns 401.`,
    mcqs: [
      mcq('In Postman, GET /api/orders with a valid bearer token returns 200, but POST /api/orders with the same token returns 403 and an empty body. The chain does not mention csrf at all. What is the cause?', [
        ['The token lacks a scope that allows POST requests', false],
        ['CsrfFilter rejects the POST, which has no CSRF token', true],
        ['POST mappings need @PreAuthorize to be reachable', false],
      ], 'CSRF protection is enabled by default and applies to state-changing methods. GET is exempt, so only the POST fails. A stateless bearer-token API disables it deliberately.'),
      mcq('An expired token gives 500 with ExpiredJwtException thrown from JwtAuthFilter. A new @ExceptionHandler(ExpiredJwtException.class) in the advice changes nothing. Why?', [
        ['The handler must be declared as a static method', false],
        ['jjwt wraps the exception so the type never matches', false],
        ['The filter runs before the DispatcherServlet and its advice', true],
      ], 'Controller advice only handles exceptions raised during Spring MVC handling. A filter runs earlier, so the exception escapes as a 500. Catch JwtException in the filter and let the entry point answer 401.'),
      mcq('React at localhost:5173 gets a CORS preflight error from the API, although addCorsMappings is configured and Postman works. What is happening?', [
        ['Spring Security refuses the OPTIONS request before MVC\'s CORS', true],
        ['Postman sends a different Origin header than the browser', false],
        ['addCorsMappings applies only to @Controller, not REST', false],
      ], 'The preflight has no Authorization header, so the security chain rejects it before Spring MVC can add CORS headers. http.cors(...) makes the security chain handle CORS first.'),
      mcq('Every protected call returns 401 even with a fresh token, and the debug log shows JwtAuthFilter running after the access decision. Which line causes it?', [
        ['http.addFilterAfter(jwtFilter, AuthorizationFilter.class)', true],
        ['http.addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)', false],
        ['http.sessionManagement(s -> s.sessionCreationPolicy(STATELESS))', false],
      ], 'AuthorizationFilter is the last security filter. Adding the JWT filter after it means the decision is made while the request is still anonymous. addFilterBefore the username/password filter is the correct place.'),
      mcq('Registration succeeds, but Meena\'s login always fails with "Bad credentials". The controller calls encoder.encode(body.password()) and passes the result to RegistrationService.register, which encodes it again. What is stored?', [
        ['Her password in plain text', false],
        ['A BCrypt hash of a BCrypt hash', true],
        ['An empty string for the hash', false],
      ], 'Encoding twice stores hash(hash(password)). At login, matches(raw, stored) compares against hash(raw), which never equals it. Encode exactly once, in the service.'),
    ],
  },

  /* ── PRACTICE ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_SECURITY_PRACTICE',
    notes: `Secure your own shop API from the REST and Data JPA topics. Test every step with curl or
Postman, and predict the status code **before** you send each request.

## Exercise 1 — Lock it down, then open the public doors

Add the security starter and confirm everything is 401. Write a \`SecurityFilterChain\`: stateless,
CSRF disabled (write a one-line comment saying why), \`/api/auth/**\` and \`/error\` open, \`GET
/api/products/**\` open, everything else authenticated. Check: \`GET /api/products\` → 200,
\`GET /api/orders\` → 401.

## Exercise 2 — Users with BCrypt

Create the \`users\` table, \`AppUser\` entity, \`UserRepository\`, a \`PasswordEncoder\` bean and an
\`AppUserDetailsService\`. Add \`POST /api/auth/register\` that always assigns \`Role.USER\` and
returns a DTO without the hash. Register two users with the same password and compare the rows in
MySQL. Seed one admin through a \`CommandLineRunner\` that encodes the password — not by hand-written
SQL with a plain value.

## Exercise 3 — Login and tokens

Add jjwt 0.12, a \`JwtService\` reading \`JWT_SECRET\` from the environment (generate it with
\`openssl rand -base64 32\`), and \`POST /api/auth/login\`. Paste a token into a JWT decoder and
read its payload — then explain in one sentence why that is not a vulnerability, and what would
make it one. Start the app without \`JWT_SECRET\` and note the error.

## Exercise 4 — The filter and the 401

Write \`JwtAuthFilter\` and a JSON 401 entry point. Send four requests to \`GET /api/orders\`: no
header, \`Bearer garbage\`, a token with one payload character changed, and an expired token (set
\`app.jwt.ttl-minutes=1\` and wait). All four must be 401 — none may be 500. Check your logs contain
no token.

## Exercise 5 — Roles and ownership

Put product create/update/delete behind \`hasRole("ADMIN")\` and add \`@PreAuthorize\` on the service
method too. Change \`GET /api/orders/{id}\` to use \`findByIdAndCustomerEmail\`. As Ravi, request
Meena's order: you must get 404. As the admin, call \`/api/admin/orders\`. As Ravi, call it: 403.

## Exercise 6 — Let the browser in

Configure CORS through \`http.cors(...)\` for \`http://localhost:5173\`. Simulate the browser's
preflight:

    curl -i -X OPTIONS http://localhost:8080/api/orders \\
      -H "Origin: http://localhost:5173" \\
      -H "Access-Control-Request-Method: POST" \\
      -H "Access-Control-Request-Headers: authorization,content-type"

You need 200 with \`Access-Control-Allow-Origin: http://localhost:5173\`. Repeat with origin
\`http://evil.example\` and confirm it is refused.`,
    mcqs: [
      mcq('In Exercise 4, which response is correct for `Authorization: Bearer garbage` on GET /api/orders?', [
        ['400, since the header has a malformed value', false],
        ['500, since jjwt cannot parse the token at all', false],
        ['401 from the entry point, as for no token', true],
      ], 'The filter catches the MalformedJwtException, leaves the request anonymous, and the authenticated() rule sends it to the entry point. A broken token is a failed authentication, not a client syntax error or a server crash.'),
      mcq('In Exercise 3, you decode your token\'s payload in an online JWT decoder without knowing the secret. Why is that not a vulnerability by itself?', [
        ['Decoders only work with the server\'s secret key', false],
        ['The payload holds no secrets and cannot be altered', true],
        ['Tokens expire before a decoder can finish the job', false],
      ], 'The payload is meant to be readable; the protection is the signature, which makes any change detectable. It becomes a problem only if you put private data in the claims.'),
      mcq('In Exercise 5, Ravi requests Meena\'s order through findByIdAndCustomerEmail. Why is 404 a better answer than 403?', [
        ['404 avoids confirming that the order exists at all', true],
        ['403 is reserved for callers who sent no token', false],
        ['Spring Data cannot raise an exception for 403', false],
      ], 'A 403 tells Ravi that order 1043 exists and belongs to someone else. To him it should look like any id that does not exist. (403 is for authenticated callers, not anonymous ones.)'),
      mcq('In Exercise 2, why seed the admin with a CommandLineRunner calling encoder.encode() instead of an INSERT in data.sql with the password typed in?', [
        ['data.sql cannot insert into a table that has an enum', false],
        ['A plain value never matches, as BCrypt expects a hash', true],
        ['CommandLineRunner beans run before Hibernate starts', false],
      ], 'DaoAuthenticationProvider calls matches(raw, stored) and expects stored to be a BCrypt hash. A plain value fails ("does not look like BCrypt"), and a plain password in a repo is a leak anyway.'),
      mcq('In Exercise 6, the preflight for http://localhost:5173 returns 401 although CORS is configured in a WebMvcConfigurer. What did you leave out?', [
        ['allowCredentials(true) on the CORS mapping', false],
        ['A @CrossOrigin("*") on every REST controller', false],
        ['http.cors(...) in the SecurityFilterChain', true],
      ], 'Without http.cors(...), the security chain handles the OPTIONS preflight like any other request and rejects it for having no token. With it, CorsFilter answers the preflight early in the chain.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_SECURITY_INTERVIEW_QUESTION',
    notes: `Spring Security plus JWT is on almost every Java full-stack resume, so interviewers probe it
hard. These three questions come up most; each has an answer at the level that earns the follow-up.

## Q1. "Walk me through how authentication works in your Spring Boot project."

**Strong answer.** "It is a stateless REST API with JWT. On \`POST /api/auth/login\`, I call the
\`AuthenticationManager\` with the email and password. That uses a \`DaoAuthenticationProvider\`
with my \`UserDetailsService\`, which loads the user from MySQL, and a \`BCryptPasswordEncoder\`,
which checks the password against the stored hash. If it matches, I issue a JWT signed with HS256
— subject is the email, roles as a claim, fifteen-minute expiry — with the secret read from an
environment variable. On every other request a \`OncePerRequestFilter\`, added before
\`UsernamePasswordAuthenticationFilter\`, reads the Bearer header, verifies the signature and expiry
with jjwt, loads the user and puts an authenticated token into the \`SecurityContextHolder\`. Then
\`AuthorizationFilter\` applies my rules. Sessions are \`STATELESS\` and CSRF is disabled because the
token is in a header, not a cookie."

**Follow-up:** "What happens with an expired token?" — the filter catches \`ExpiredJwtException\`,
leaves the request anonymous, and the entry point returns 401; the client refreshes or logs in
again. Letting it escape the filter would give a 500.

## Q2. "How does logout work with JWT? Can you revoke a token?"

**Strong answer.** "Not by itself — that is the main trade-off of JWT. The server only checks the
signature and \`exp\`, so a token is valid until it expires, even after logout or a password change.
Logout on the client is just deleting the token. To limit the damage I keep the access token short,
around fifteen minutes, and use a longer-lived refresh token that the server stores and can delete,
so revoking means deleting the refresh token and waiting at most one access-token lifetime. If I
need instant revocation — a stolen token, a banned user — I add state back: a deny-list of token
ids (\`jti\`) in Redis until their expiry, or a token-version number on the user that the filter
compares. My filter also reloads the user, so a disabled account is refused immediately."

**Follow-up:** "Then why not just use sessions?" — sessions *are* simpler for a single server-rendered
app and revoke instantly. JWT suits stateless APIs, multiple services and mobile clients that verify
tokens without a shared session store. It is a trade-off, not an upgrade.

## Q3. "What is the difference between 401 and 403, and how do you stop a user reading another user's data?"

**Strong answer.** "401 means the server doesn't know who you are — no token, or an invalid or
expired one; Spring sends it from the \`AuthenticationEntryPoint\`. 403 means it knows exactly who
you are and you are not allowed — wrong role; that comes from the \`AccessDeniedHandler\`. Roles are
coarse: \`hasRole("ADMIN")\` on \`/api/admin/**\` and \`@PreAuthorize\` on sensitive service methods
with \`@EnableMethodSecurity\`. For data ownership, roles don't help — two customers have the same
role. So every query for user-owned data includes the current user from the security context, like
\`findByIdAndCustomerEmail(id, principal.getUsername())\`, and I return 404 for someone else's
record. Never trust a user id sent by the client."

**Follow-up:** "Your admin gets 403 — where do you look?" — the authorities actually loaded:
\`hasRole("ADMIN")\` needs \`ROLE_ADMIN\`. Then rule order, then method security being enabled.

## How you are judged

Naming the real classes (\`SecurityFilterChain\`, \`OncePerRequestFilter\`, \`SecurityContextHolder\`,
\`BCryptPasswordEncoder\`) shows you built it. Volunteering the revocation limitation and the reason
CSRF is off shows you understood it. Saying "JWT is encrypted" ends the conversation badly.`,
    mcqs: [
      mcq('The interviewer asks "So how do you log a user out when you use JWT?" Which answer earns the follow-up?', [
        ['Short access tokens, plus a server-held refresh token', true],
        ['Call SecurityContextHolder.clearContext() on the server', false],
        ['Spring Security blacklists the token when it sees /logout', false],
      ], 'A stateless JWT cannot be invalidated by the server, and clearing the context only affects the current request. Short expiry plus a revocable, server-stored refresh token (or a deny-list) is the honest answer.'),
      mcq('Asked "Why did you disable CSRF in your Spring Boot API?", which reason is the right one?', [
        ['Postman calls kept failing while the API was being tested', false],
        ['Bearer tokens in headers are never sent by the browser itself', true],
        ['CSRF protection is incompatible with Spring Boot 3 APIs', false],
      ], 'CSRF exploits credentials a browser attaches automatically (cookies). A token in an Authorization header is attached only by the app\'s own code, and the API keeps no session. "Postman failed" is the answer that worries an interviewer.'),
      mcq('Follow-up: "A customer guesses another order id in the URL and sees it. What was missing in your Spring code?"', [
        ['A hasRole("USER") rule on /api/orders/**', false],
        ['A longer JWT secret to stop the forged token', false],
        ['A filter of the query by the logged-in user', true],
      ], 'Both customers legitimately hold ROLE_USER and a genuine token. The bug is object-level authorization: the repository query must include the authenticated user, not just the id.'),
    ],
  },

  /* ── CHECKPOINT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_SECURITY_CHECKPOINT',
    notes: `Ten questions across the whole topic: the filter chain and rule order, users and BCrypt,
issuing and checking JWTs, roles, method security and ownership. Most show a configuration line or
a request and ask what Spring Security does with it. Predict the status code before you look at
the options — that is the skill an interviewer is testing.`,
    checkpoint: [
      ck('SPRING_SECURITY', `Which statement about this configuration is true?

    .authorizeHttpRequests(auth -> auth
        .anyRequest().authenticated()
        .requestMatchers("/api/auth/**").permitAll())`, [
        ['Spring Security 6 refuses to start the application', true],
        ['/api/auth/** is public, as permitAll overrides others', false],
        ['Every request needs a login, including /api/auth/**', false],
      ], 'Spring Security 6 rejects a requestMatchers call after anyRequest(), failing at startup with "Can\'t configure requestMatchers after anyRequest". anyRequest must be the last rule.'),
      ck('AUTHENTICATION', 'An anonymous request reaches a protected path in a chain with no form login, no HTTP Basic and no entry point configured. What status comes back?', [
        ['401, the standard answer for an anonymous caller', false],
        ['403, from the default Http403ForbiddenEntryPoint', true],
        ['302, a redirect to Spring\'s generated /login page', false],
      ], 'With no authentication mechanism configured there is no 401-producing entry point, so Spring Security falls back to Http403ForbiddenEntryPoint. A JWT API sets its own entry point that returns 401.'),
      ck('AUTHENTICATION', '`encoder.matches("Monsoon#2026", storedHash)` returns true for Meena. What does that prove?', [
        ['storedHash was produced by encoding exactly that password', true],
        ['storedHash can be decrypted back into Monsoon#2026', false],
        ['storedHash was created with the same salt as this call', false],
      ], 'matches() reads the salt and cost from the stored hash, hashes the attempt with them and compares. BCrypt is one-way; nothing is decrypted, and matches() does not create a new salt.'),
      ck('AUTHENTICATION', 'Why does a Spring Boot JWT API set `SessionCreationPolicy.STATELESS`?', [
        ['So the JWT is stored in the HttpSession between calls', false],
        ['So Spring Security never creates or uses an HttpSession', true],
        ['So CSRF protection switches itself off automatically', false],
      ], 'STATELESS stops Spring Security from creating a session or reading one, so no JSESSIONID cookie authenticates anything; each request must carry its token. It does not disable CSRF — that is a separate setting.'),
      ck('SPRING_SECURITY', 'In application.properties the shop has `app.jwt.secret=${JWT_SECRET}`. JWT_SECRET is not set on the server. What happens at startup?', [
        ['It fails: the placeholder cannot be resolved', true],
        ['It starts and signs tokens with an empty key', false],
        ['It starts and Spring generates a random secret', false],
      ], 'An unresolvable placeholder with no default fails startup with "Could not resolve placeholder". That is the safe outcome; never give the secret a hard-coded default.'),
      ck('AUTHENTICATION', 'A token issued at 09:00 with a 15-minute expiry is stolen at 09:05. Meena changes her password at 09:06. The filter verifies only the signature and exp. Until when can the thief use the token?', [
        ['Until 09:06, as a password change ends old tokens', false],
        ['Until 09:15, when the token\'s exp is reached', true],
        ['Indefinitely, as the stolen copy has no expiry', false],
      ], 'Nothing ties the token to the password. It remains valid until its exp claim. A token-version column checked by the filter, or a deny-list, is needed to cut it off earlier.'),
      ck('AUTHORIZATION', 'The UserDetailsService builds users with `.authorities("ADMIN")`. Which rule lets those admins into /api/admin/**?', [
        ['.hasRole("ADMIN")', false],
        ['.hasRole("ROLE_ADMIN")', false],
        ['.hasAuthority("ROLE_ADMIN")', false],
        ['.hasAuthority("ADMIN")', true],
      ], 'authorities("ADMIN") creates the authority "ADMIN" with no prefix, which hasAuthority matches exactly. hasRole("ADMIN") and hasAuthority("ROLE_ADMIN") both look for "ROLE_ADMIN", and hasRole with a ROLE_ prefix is rejected at startup.'),
      ck('AUTHORIZATION', `What does a caller with only ROLE_USER get from DELETE /api/products/9?

    .requestMatchers(HttpMethod.GET, "/api/products/**").permitAll()
    .requestMatchers("/api/products/**").hasRole("ADMIN")
    .anyRequest().authenticated()`, [
        ['200, because the GET rule opens the path to all', false],
        ['401, because only GET calls are matched at all', false],
        ['403, because DELETE falls to the ADMIN rule', true],
      ], 'The first rule matches only GET. DELETE skips it and matches the second rule, which needs ROLE_ADMIN. The caller is authenticated but lacks the role, so the answer is 403.'),
      ck('AUTHENTICATION', 'JwtAuthFilter logs `log.info("Auth header: {}", header)` on every request. What is the problem?', [
        ['Logging inside a filter blocks the request thread', false],
        ['Bearer tokens are rejected once they are logged', false],
        ['Anyone with log access can reuse live tokens', true],
      ], 'A bearer token is a credential: whoever holds it is that user until it expires. Logs are widely readable and kept for a long time, so tokens and passwords must never be written to them.'),
      ck('AUTHORIZATION', `Ravi is logged in. What does GET /api/orders?customerId=7 return?

    @GetMapping("/api/orders")
    List<OrderDto> list(@RequestParam long customerId) {
        return orders.findByCustomerId(customerId).stream().map(OrderDto::from).toList();
    }`, [
        ['Only Ravi\'s orders, since the request is authenticated', false],
        ['Customer 7\'s orders, whoever that customer may be', true],
        ['A 403, since customerId differs from Ravi\'s own id', false],
      ], 'The code trusts the id from the URL and never consults the security context, so any logged-in user can list anyone\'s orders. Take the customer from @AuthenticationPrincipal instead.'),
    ],
  },
];
