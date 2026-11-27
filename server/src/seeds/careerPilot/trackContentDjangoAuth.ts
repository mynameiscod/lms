/**
 * Career-track content: auth and security in Django (JT_DJANGO_AUTH), for Python Full Stack + AI.
 *
 * Stack: Django 5.x, Django REST Framework 3.15+, djangorestframework-simplejwt 5.x and
 * django-cors-headers 4.x, on MySQL (ENGINE django.db.backends.mysql). The students already have a
 * DRF shop API with serializers, viewsets and routers from JT_DRF; this topic gives it real users,
 * JWT login, permissions and object ownership, and production settings. Sending the token from
 * React belongs to batch P3 and is only mentioned.
 *
 * Every status code, response body, header and check message quoted here was produced by running
 * the code with APIClient on Django 5.2, DRF 3.18, Simple JWT 5.5 and django-cors-headers 4.9
 * (SQLite stood in for MySQL; nothing here depends on the database). Argon2 needs the extra
 * argon2-cffi package and is described from Django's documentation.
 *
 * Attribution: the topic is multi-skill (DJANGO_REST, AUTHENTICATION, AUTHORIZATION). USER_MODEL and
 * JWT declare AUTHENTICATION and PERMISSIONS declares AUTHORIZATION, so their checkpoint questions
 * name only that key; the other checkpoints name the skill each question measures. Practice mcqs
 * name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_DJANGO_AUTH_BUNDLES: PilotBundle[] = [
  /* ── USER_MODEL ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_AUTH_USER_MODEL',
    notes: `The shop API from the DRF topic has products and orders, but no idea who is calling it. Before
tokens or permissions, it needs **users**: a table of accounts, passwords stored safely, and a way to
sign up. Django ships all of that in \`django.contrib.auth\` — the decision you make on day one is
*which user model* it uses.

## What django.contrib.auth gives you

\`startproject\` already lists \`django.contrib.auth\` and \`django.contrib.contenttypes\` in
\`INSTALLED_APPS\`. Together they provide:

- a **User** model with \`username\`, \`password\` (a hash, never the password), \`email\`,
  \`first_name\`, \`last_name\`, \`is_active\`, \`is_staff\`, \`is_superuser\`, \`last_login\`, \`date_joined\`;
- **groups and permissions** (\`user.groups\`, \`user.user_permissions\`, \`user.has_perm("shop.add_product")\`);
- **password hashing** and validation (\`AUTH_PASSWORD_VALIDATORS\`);
- \`authenticate(request, username=..., password=...)\`, \`login()\` and \`logout()\` for sessions.

## Start with a custom user model — before the first migrate

Django's own documentation recommends a custom user model **for every new project**, even if it is
identical to the default. The reason is migrations: every table that points at a user (orders, the
admin log, token blacklists) gets a foreign key to whatever \`AUTH_USER_MODEL\` names *when that
migration is created*. Swap it later and the history no longer fits. Here is what really happens if
you run \`migrate\` with the default user, then add a custom one:

    InconsistentMigrationHistory: Migration admin.0001_initial is applied before its
    dependency users.0001_initial on database 'default'.

Fixing that on a live database is a manual, risky data migration. Doing it first costs four lines:

    # accounts/models.py
    from django.contrib.auth.models import AbstractUser
    from django.db import models

    class User(AbstractUser):
        email = models.EmailField(unique=True)       # the default email is optional and not unique
        phone = models.CharField(max_length=15, blank=True)

    # config/settings.py
    INSTALLED_APPS = [..., "accounts"]
    AUTH_USER_MODEL = "accounts.User"                # "<app_label>.<ModelName>"

Then \`python manage.py makemigrations accounts\` and only then the first \`migrate\`. On MySQL the
table is \`accounts_user\`.

## AbstractUser or AbstractBaseUser?

| | \`AbstractUser\` | \`AbstractBaseUser\` (+ \`PermissionsMixin\`) |
|---|---|---|
| Fields you get | everything the default User has | only \`password\`, \`last_login\` (+ \`is_superuser\`, groups, permissions from the mixin) |
| Login field | \`username\` (you can change \`USERNAME_FIELD\`) | whatever you set as \`USERNAME_FIELD\` |
| You must write | nothing | a manager with \`create_user\` / \`create_superuser\`, \`is_active\`, \`is_staff\`, \`REQUIRED_FIELDS\` |
| Use when | you want the default plus a few fields (most projects) | you want a different shape, e.g. email-only login with no username |

An email-login user on \`AbstractBaseUser\`:

    from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
    from django.db import models

    class MemberManager(BaseUserManager):
        def create_user(self, email, password=None, **extra):
            if not email:
                raise ValueError("Email is required")
            user = self.model(email=self.normalize_email(email), **extra)
            user.set_password(password)                 # hashes; None makes it unusable
            user.save(using=self._db)
            return user

        def create_superuser(self, email, password=None, **extra):
            extra.setdefault("is_staff", True)
            extra.setdefault("is_superuser", True)
            return self.create_user(email, password, **extra)

    class Member(AbstractBaseUser, PermissionsMixin):
        email = models.EmailField(unique=True)
        full_name = models.CharField(max_length=100, blank=True)
        is_active = models.BooleanField(default=True)
        is_staff = models.BooleanField(default=False)

        objects = MemberManager()
        USERNAME_FIELD = "email"            # what authenticate() and login forms use
        REQUIRED_FIELDS = ["full_name"]     # asked by createsuperuser, besides email and password

Note: \`normalize_email\` lowercases only the **domain**, so \`Priya@Example.COM\` is stored as
\`Priya@example.com\` — and a login as \`priya@example.com\` then fails. Lowercase the whole address
yourself if your product treats emails as case-insensitive.

## Never import User directly

Code that does \`from django.contrib.auth.models import User\` breaks the moment you swap the model.

    from django.contrib.auth import get_user_model
    from django.conf import settings

    User = get_user_model()                        # in views, serializers, services, tests

    class Order(models.Model):                     # in models: the string setting
        owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                  related_name="orders")

\`settings.AUTH_USER_MODEL\` is a string, safe to use while models are still loading;
\`get_user_model()\` returns the class, for everywhere else.

## Passwords: hashed, salted, slow

Django never stores a password. \`set_password\` / \`create_user\` store a string like

    pbkdf2_sha256$1000000$OYFVpqQS...$<base64 hash>
    algorithm     iterations salt      hash

The default hasher is **PBKDF2 with SHA-256**, with an iteration count Django raises every release
(1,000,000 in 5.2). Each password gets its own random salt, so two users with the same password have
different hashes. \`check_password\` recomputes and compares in constant time.

    from django.contrib.auth.hashers import make_password, check_password

    h = make_password("abc")            # 'pbkdf2_sha256$1000000$...'
    check_password("abc", h)            # True
    user.check_password("wrong")        # False

\`PASSWORD_HASHERS\` lists the hashers; the **first** is used for new hashes, the others can still
verify old ones, and Django upgrades a user's hash the next time they log in. To prefer Argon2
(memory-hard, the winner of the Password Hashing Competition), \`pip install django[argon2]\` and put
\`"django.contrib.auth.hashers.Argon2PasswordHasher"\` first.

The trap is any path that bypasses hashing:

    User(username="ravi", password="plain123").save()   # stores 'plain123' as-is
    user.check_password("plain123")                       # False — it is not a valid hash

\`User.objects.create(...)\`, assigning \`user.password = ...\`, and a plain \`ModelSerializer.save()\`
all do this. Use \`create_user\` or \`set_password\`.

## A registration endpoint that never returns the password

    # accounts/serializers.py
    from django.contrib.auth import get_user_model
    from django.contrib.auth.password_validation import validate_password
    from rest_framework import serializers

    User = get_user_model()

    class RegisterSerializer(serializers.ModelSerializer):
        password = serializers.CharField(write_only=True, min_length=8,
                                         validators=[validate_password])

        class Meta:
            model = User
            fields = ["id", "username", "email", "password"]

        def create(self, validated_data):
            return User.objects.create_user(**validated_data)

    # accounts/views.py
    class RegisterView(generics.CreateAPIView):
        serializer_class = RegisterSerializer
        permission_classes = [AllowAny]
        authentication_classes = []

\`POST /api/auth/register/\` returns \`201 {"id": 4, "username": "meena", "email": "meena@x.in"}\`.
Without \`write_only=True\` and without the custom \`create\`, the same endpoint answered
\`{..., "password": "Very$ecure1"}\` **and** stored the password in plain text. A duplicate email or a
short password comes back as a normal 400:
\`{"email": ["user with this email already exists."], "password": ["Ensure this field has at least 8 characters."]}\`.`,
    workedExample: `**Goal: add email-unique users and a safe sign-up endpoint to a fresh shop project.**

1. Before any \`migrate\`, create the app: \`python manage.py startapp accounts\`.
2. In \`accounts/models.py\`, \`class User(AbstractUser)\` with \`email = models.EmailField(unique=True)\`.
   Nothing else is needed — you keep username, staff flags and permissions.
3. In settings: add \`"accounts"\` to \`INSTALLED_APPS\` and \`AUTH_USER_MODEL = "accounts.User"\`.
4. \`makemigrations accounts\`, then \`migrate\`. Check: \`python manage.py shell -c "from django.contrib.auth
   import get_user_model; print(get_user_model())"\` prints \`<class 'accounts.models.User'>\`.
5. In \`admin.py\`, \`admin.site.register(User, UserAdmin)\` (from \`django.contrib.auth.admin\`) so the admin
   shows the password as a hash with a change-password form, not a text box.
6. Write \`RegisterSerializer\` with \`password = CharField(write_only=True, min_length=8,
   validators=[validate_password])\` and \`create()\` calling \`User.objects.create_user(**validated_data)\`.
7. Expose it with a \`CreateAPIView\`, \`permission_classes = [AllowAny]\` (the project default will be
   \`IsAuthenticated\` in the next unit).
8. Prove it: POST a user and see a 201 body with **no** \`password\` key; open the shell and check
   \`User.objects.get(username="meena").password.startswith("pbkdf2_sha256$")\` is \`True\` and
   \`check_password("Very$ecure1")\` is \`True\`. POST the same email again and see the 400.

**Why each step matters:** steps 1–4 in that order are the only cheap moment to choose the user model;
step 6 is the difference between a hash and a plain-text password in MySQL; step 8 tests the two
things a reviewer will ask — the hash and the response.`,
    mcqs: [
      mcq('A team ran `migrate` on day one with the default User, then added `class User(AbstractUser)` and `AUTH_USER_MODEL = "accounts.User"`. The next `migrate` stops with `InconsistentMigrationHistory`. Why?', [
        ['admin and other apps were already migrated with a foreign key to auth.User', true],
        ['AbstractUser cannot be used once the auth app has created its own user tables', false],
        ['AUTH_USER_MODEL must be the path to the class, accounts.models.User', false],
        ['The accounts app must be listed before django.contrib.auth', false],
      ], 'Applied migrations such as admin.0001_initial depend on whatever user model existed when they ran. Swapping AUTH_USER_MODEL afterwards makes the new accounts.0001_initial a dependency that should have run first, so the history is inconsistent.'),
      mcq('A serializer has `fields = ["id", "username", "email", "password"]` and no overrides. A sign-up POST succeeds. What is wrong?', [
        ['Nothing; ModelSerializer hashes the password field automatically', false],
        ['The username is ignored because AbstractUser makes it optional', false],
        ['The view returns 400 because password is not a serializer field', false],
        ['The password is stored as typed and echoed back in the response', true],
      ], 'The default create() calls Model.objects.create(), which stores the raw string, and the field is readable, so the 201 body includes it. Declare password write_only and call create_user (or set_password) in create().'),
      mcq('Which statement about `make_password("abc")` called twice is true?', [
        ['Both hashes are identical, so they can be compared directly', false],
        ['The hashes differ because each gets its own random salt', true],
        ['The second call raises because the password is already hashed', false],
        ['Both return the password base64-encoded, not hashed', false],
      ], 'Each call generates a new salt that is stored inside the hash string, so equal passwords produce different hashes. check_password reads the algorithm, iterations and salt from the stored string and recomputes.'),
    ],
    checkpoint: [
      ck('AUTHENTICATION', `Member uses AbstractBaseUser with USERNAME_FIELD = "email" and the manager shown in the lesson.
What happens on the second line?

    Member.objects.create_user("Priya@Example.COM", "Pass#2026x")
    # then POST /api/auth/token/ {"email": "priya@example.com", "password": "Pass#2026x"}`, [
        ['200 with tokens, since email lookups are case-insensitive', false],
        ['401: the stored email is Priya@example.com and the lookup is exact', true],
        ['400: the token view expects a username key, not email', false],
        ['500: create_user lowercased nothing and stored an invalid email', false],
      ], 'normalize_email lowercases only the domain part, so the stored value is Priya@example.com. The token view looks up the USERNAME_FIELD exactly, finds no match and answers 401 "No active account found with the given credentials".'),
      ck('AUTHENTICATION', 'In a model in a reusable app, which way of pointing an `owner` foreign key at the user model is correct?', [
        ['ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)', true],
        ['ForeignKey(django.contrib.auth.models.User, on_delete=models.CASCADE)', false],
        ['ForeignKey("auth.User", on_delete=models.CASCADE)', false],
        ['ForeignKey(get_user_model, on_delete=models.CASCADE)', false],
      ], 'settings.AUTH_USER_MODEL is the string "app_label.Model" of whatever user model the project chose, and it is safe while models load. Naming auth.User hard-codes the default and breaks with a custom user.'),
      ck('AUTHENTICATION', `What does this print?

    u = User(username="ravi", email="ravi@x.in", password="plain123")
    u.save()
    print(u.check_password("plain123"))`, [
        ['True, because save() hashes the password field', false],
        ['True, because check_password accepts plain text as well', false],
        ['False, because the column holds "plain123", not a hash', true],
        ['It raises, because password cannot be passed to the constructor', false],
      ], 'Only set_password, create_user and make_password hash. The constructor stored the raw string, which is not a valid hash, so check_password returns False — and the password sits in the database in plain text.'),
    ],
  },

  /* ── JWT ───────────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_AUTH_JWT',
    notes: `Users exist; now the React app needs to prove, on every request, which user it is. A browser on
the same domain can use Django's session cookie. A separate SPA, a mobile app or another service
usually sends a **JSON Web Token** in a header instead. In DRF that is **Simple JWT**
(\`djangorestframework-simplejwt\`).

## What a JWT is

Three base64url parts joined by dots: \`header.payload.signature\`. The payload Simple JWT puts in an
access token, decoded:

    {"token_type": "access", "exp": 1791984536, "iat": 1791983636,
     "jti": "ad2e8822...", "user_id": "4"}

It is **signed, not encrypted** — anyone holding the token can read the payload, so never put
anything secret in it. The signature (HMAC-SHA256 with \`SECRET_KEY\` by default) lets the server
check, without a database lookup, that nobody changed it and that \`exp\` has not passed.

## Setup

    pip install djangorestframework-simplejwt

    # settings.py
    from datetime import timedelta

    INSTALLED_APPS += ["rest_framework_simplejwt.token_blacklist"]    # for rotation and logout

    REST_FRAMEWORK = {
        "DEFAULT_AUTHENTICATION_CLASSES": [
            "rest_framework_simplejwt.authentication.JWTAuthentication",
        ],
        "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    }

    SIMPLE_JWT = {
        "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
        "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
        "ROTATE_REFRESH_TOKENS": True,
        "BLACKLIST_AFTER_ROTATION": True,
        "AUTH_HEADER_TYPES": ("Bearer",),          # the default
    }

    # urls.py
    from rest_framework_simplejwt.views import (
        TokenObtainPairView, TokenRefreshView, TokenBlacklistView)

    urlpatterns += [
        path("api/auth/token/", TokenObtainPairView.as_view()),
        path("api/auth/token/refresh/", TokenRefreshView.as_view()),
        path("api/auth/logout/", TokenBlacklistView.as_view()),
    ]

Run \`migrate\` after adding \`token_blacklist\` — it adds the outstanding-token and blacklisted-token tables.

## The flow, as it really answers

    POST /api/auth/token/  {"username": "meena", "password": "Very$ecure1"}
    → 200 {"refresh": "eyJ...", "access": "eyJ..."}

    POST /api/auth/token/  {"username": "meena", "password": "nope"}
    → 401 {"detail": "No active account found with the given credentials"}

    GET /api/me/   Authorization: Bearer <access>      → 200
    GET /api/me/   (no header)                         → 401 "Authentication credentials were not provided."
                                                          WWW-Authenticate: Bearer realm="api"
    GET /api/me/   Authorization: Token <access>       → 401 (wrong prefix: treated as no credentials)
    GET /api/me/   Authorization: Bearer <refresh>     → 401 "Token has wrong type"
    GET /api/me/   Authorization: Bearer <edited>      → 401 "Token is invalid"

The token view reads the field named by \`USERNAME_FIELD\`: with an email-login user the body is
\`{"email": ..., "password": ...}\`, and sending \`username\` gets \`400 {"email": ["This field is required."]}\`.

## Two tokens, two lifetimes

- **Access token** — short-lived (5–15 minutes). Sent on every request. If stolen, it works until it
  expires, so keep it short.
- **Refresh token** — long-lived (days). Sent **only** to the refresh endpoint to get a new access
  token. The API rejects it as a bearer token (\`Token has wrong type\`).

    POST /api/auth/token/refresh/  {"refresh": "<refresh>"}
    → 200 {"access": "...", "refresh": "..."}         # a new refresh too, because ROTATE_REFRESH_TOKENS

## Rotation and the blacklist

With \`ROTATE_REFRESH_TOKENS\`, every refresh issues a new refresh token. With
\`BLACKLIST_AFTER_ROTATION\` (and the \`token_blacklist\` app installed), the **old** refresh token is
blacklisted, so replaying it fails:

    POST /api/auth/token/refresh/  {"refresh": "<the old one>"}
    → 401 {"detail": "Token is blacklisted", "code": "token_not_valid"}

That turns a stolen refresh token into a race the attacker can lose, and \`TokenBlacklistView\` gives
you a logout: POST the refresh token, it is blacklisted, and refreshing with it answers 401.

## What a JWT does not do

- **It cannot be revoked by itself.** After logout or rotation, the old **access** token still
  answered **200** in our run until its \`exp\`. The blacklist covers refresh tokens; access tokens
  are checked by signature and expiry only (an expired one gets 401 "Token is expired"). That is why
  access lifetimes are short. Deactivating the user (\`is_active=False\`) does stop them —
  \`JWTAuthentication\` loads the user on each request and answered \`401 {"detail": "User is inactive"}\`.
- **It does not protect against XSS.** A token in \`localStorage\` is readable by any script that
  runs on your page; one injected script sends it elsewhere. Keep the access token in memory, and if
  you store the refresh token in an \`HttpOnly\`, \`Secure\`, \`SameSite\` cookie you are back to needing
  CSRF thinking for that endpoint.
- **It does not hide data.** The payload is readable. Put an id in it, not an address.
- **Changing \`SECRET_KEY\` (or \`SIGNING_KEY\`) invalidates every token at once** — the emergency
  "log everyone out" switch.

## Session authentication vs JWT, and CSRF

| | \`SessionAuthentication\` | \`JWTAuthentication\` |
|---|---|---|
| Credential | \`sessionid\` cookie the browser attaches automatically | \`Authorization: Bearer\` header your code attaches |
| State | session row on the server; logout deletes it | none on the server (except the blacklist) |
| CSRF | **enforced** for unsafe methods on authenticated requests | not needed: a forged cross-site request cannot add your header |
| Fits | Django templates, the admin, same-site SPAs | separate SPAs, mobile apps, service-to-service |

With \`APIClient(enforce_csrf_checks=True)\`, a logged-in session POST without a CSRF token got
\`403 {"detail": "CSRF Failed: CSRF cookie not set."}\`, while the same POST with a Bearer token got
**201**. CSRF exists because browsers send cookies on their own; headers are never added for you.`,
    workedExample: `**Goal: JWT login for the shop API, with logout that actually works for refresh tokens.**

1. \`pip install djangorestframework-simplejwt\`; add \`"rest_framework_simplejwt.token_blacklist"\` to
   \`INSTALLED_APPS\`; \`migrate\`.
2. Set \`JWTAuthentication\` as the default authentication class and \`IsAuthenticated\` as the default
   permission. The register view keeps \`AllowAny\`; the token views already allow anyone.
3. \`SIMPLE_JWT\`: access 15 minutes, refresh 7 days, \`ROTATE_REFRESH_TOKENS\` and
   \`BLACKLIST_AFTER_ROTATION\` on.
4. Routes: \`token/\` → \`TokenObtainPairView\`, \`token/refresh/\` → \`TokenRefreshView\`, \`logout/\` →
   \`TokenBlacklistView\`.
5. Add \`GET /api/me/\` returning \`request.user.username\` — the quickest way to see who a token is.
6. Check with APIClient:

       c = APIClient()
       tok = c.post("/api/auth/token/", {"username": "meena", "password": "Very$ecure1"},
                    format="json").json()
       assert c.get("/api/me/").status_code == 401
       c.credentials(HTTP_AUTHORIZATION=f"Bearer {tok['access']}")
       assert c.get("/api/me/").status_code == 200
       c.credentials()
       new = c.post("/api/auth/token/refresh/", {"refresh": tok["refresh"]}, format="json").json()
       old = c.post("/api/auth/token/refresh/", {"refresh": tok["refresh"]}, format="json")
       assert old.status_code == 401 and old.json()["detail"] == "Token is blacklisted"

7. Write down, for the team, the one thing the tests also show: the old access token still works
   until it expires. That is the design, and it is why 15 minutes, not 15 days.`,
    mcqs: [
      mcq('A React app stores the access token in `localStorage`. A comment field on the site renders unescaped HTML and someone injects a script. What does JWT authentication do about it?', [
        ['Nothing: the script reads the token and can replay it until it expires', true],
        ['The signature check rejects any token that is sent from a different origin', false],
        ['Simple JWT blacklists access tokens used from a second IP address', false],
        ['The browser refuses to let scripts read tokens shaped like a JWT', false],
      ], 'A bearer token works for whoever holds it, and localStorage is readable by any script on the page. JWT verifies integrity and expiry, not who is sending it. Prevent XSS, keep access tokens short-lived, and keep tokens out of storage scripts can read where possible.'),
      mcq('With `ROTATE_REFRESH_TOKENS` on but `token_blacklist` not in `INSTALLED_APPS`, what happens when an old refresh token is replayed after a rotation?', [
        ['It is rejected, because rotation alone invalidates the old token', false],
        ['It still works until its own expiry, since nothing records it as used', true],
        ['The refresh endpoint returns 500 because the table is missing', false],
        ['Both the old and the newly issued refresh tokens are invalidated together', false],
      ], 'Rotation only issues a new refresh token. Rejecting the old one needs the blacklist app (and BLACKLIST_AFTER_ROTATION) to record it; without that, every rotated-out token stays valid until its exp.'),
      mcq('Why does a DRF API that uses only JWTAuthentication not need CSRF tokens on POST?', [
        ['JWTAuthentication validates the CSRF cookie inside the token itself', false],
        ['Django turns CSRF checks off whenever DEBUG is False', false],
        ['A cross-site page cannot make the browser add the Authorization header', true],
        ['POST requests with JSON bodies can never be sent across sites by a browser', false],
      ], 'CSRF works because browsers attach cookies to cross-site requests automatically. The Bearer header is added by your own code, so a forged request from another site arrives unauthenticated. If the token lives in a cookie instead, CSRF matters again.'),
    ],
    checkpoint: [
      ck('AUTHENTICATION', `Rotation and blacklisting are on. A user calls refresh, then logs out (TokenBlacklistView with the new refresh token). Which request still succeeds?

    tok = POST /api/auth/token/           -> access A1, refresh R1
    new = POST /api/auth/token/refresh/   {"refresh": R1} -> access A2, refresh R2
          POST /api/auth/logout/          {"refresh": R2}`, [
        ['POST /api/auth/token/refresh/ with R1 as the body', false],
        ['POST /api/auth/token/refresh/ with R2', false],
        ['GET /api/me/ with Bearer A2, within 15 minutes', true],
        ['GET /api/me/ with Authorization: Bearer R2', false],
      ], 'R1 was blacklisted by rotation and R2 by logout, and a refresh token is never accepted as a bearer token ("Token has wrong type"). Access tokens are checked by signature and expiry only, so A2 keeps working until it expires.'),
      ck('AUTHENTICATION', 'A client sends `Authorization: Token eyJhbGciOi...` to an API configured with JWTAuthentication and default settings. What comes back from a view that requires login?', [
        ['200, because Simple JWT accepts both Token and Bearer', false],
        ['401 with "Authentication credentials were not provided."', true],
        ['403 with "You do not have permission to perform this action."', false],
        ['400 with "Token is invalid" and code token_not_valid', false],
      ], 'AUTH_HEADER_TYPES defaults to ("Bearer",). With any other prefix JWTAuthentication does not try the header at all, so the request is anonymous and IsAuthenticated fails with the "not provided" message.'),
      ck('AUTHENTICATION', 'Which value belongs in a JWT payload issued by your API?', [
        ['The user\'s hashed password, to re-check it on each request', false],
        ['The user\'s Aadhaar number, so services avoid a lookup', false],
        ['The user id and a short expiry time', true],
        ['The SECRET_KEY, so other services can verify the token', false],
      ], 'The payload is only base64url-encoded, so anyone with the token can read it. Put identifiers and claims needed for routing decisions in it, never secrets or personal data, and never the signing key.'),
    ],
  },

  /* ── PERMISSIONS ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_AUTH_PERMISSIONS',
    notes: `Authentication answers *who is this?*. **Permissions** answer *may they do this?* In DRF they run in
\`initial()\`, after authentication and before your handler, and again (object level) when a view
fetches one object.

## Setting them

    # settings.py — the project default: secure unless a view says otherwise
    REST_FRAMEWORK = {
        "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    }

    # per view
    class ProductViewSet(viewsets.ModelViewSet):
        permission_classes = [IsAuthenticatedOrReadOnly]

DRF's own default is \`AllowAny\` — forget to set the project default and every new view is public.
A list on a view **replaces** the default; all classes in it must pass (AND).

## The built-in classes

| Class | Allows |
|---|---|
| \`AllowAny\` | everyone (register, login, health checks) |
| \`IsAuthenticated\` | any logged-in user |
| \`IsAdminUser\` | users with \`is_staff=True\` (not "superuser", not a role) |
| \`IsAuthenticatedOrReadOnly\` | anyone for GET/HEAD/OPTIONS, logged-in users for writes |
| \`DjangoModelPermissions\` | the model permission matching the method (\`add_\`, \`change_\`, \`delete_\`) |

Run against the shop API: an anonymous GET on an \`IsAuthenticatedOrReadOnly\` endpoint got 200 and
an anonymous POST got 401; a logged-in non-staff user on an \`IsAdminUser\` report got
\`403 {"detail": "You do not have permission to perform this action."}\`.

Classes combine with \`&\`, \`|\` and \`~\`: \`permission_classes = [IsAdminUser | IsOwner]\`.

## 401 or 403?

DRF decides from the request and the **first** authentication class:

- the user is authenticated but refused → **403 Forbidden**;
- the user is anonymous and the first authentication class has an \`authenticate_header()\` →
  **401 Unauthorized** with a \`WWW-Authenticate\` header (JWT: \`Bearer realm="api"\`);
- the user is anonymous and the first class has none — \`SessionAuthentication\` — → **403**.

So the same anonymous request to a session-only view gave \`403 {"detail": "Authentication
credentials were not provided."}\` with no \`WWW-Authenticate\` header, while the JWT-first view gave
401. Tests that assert "401 for anonymous" depend on which class is listed first.

## Custom permissions

    from rest_framework.permissions import BasePermission, SAFE_METHODS

    class IsOwnerOrReadOnly(BasePermission):
        message = "You can only change your own orders."

        def has_permission(self, request, view):              # every request
            return request.user.is_authenticated

        def has_object_permission(self, request, view, obj):  # one object
            if request.method in SAFE_METHODS:
                return True
            return obj.owner == request.user

\`has_permission\` runs for every request. \`has_object_permission\` runs **only** when the view calls
\`self.get_object()\` — which the generic retrieve, update and destroy actions do. If you write your
own \`get()\` and fetch the object yourself, call \`self.check_object_permissions(request, obj)\`.

## The list view does not check objects

This is the classic leak. With \`permission_classes = [IsAuthenticated, IsOwner]\` and
\`queryset = Order.objects.all()\`:

    GET /api/leaky-orders/      as meena → 200 [{"id": 1, "owner": 4, ...}, {"id": 2, "owner": 1, ...}]
    GET /api/leaky-orders/2/    as meena → 403

\`has_object_permission\` was called once — for the detail request — and **never** for the list. Meena
sees Asha's order in the list and is refused only when she opens it.

## Scope the queryset to the user

    class OrderViewSet(viewsets.ModelViewSet):
        serializer_class = OrderSerializer               # owner is read-only in it
        permission_classes = [IsAuthenticated]

        def get_queryset(self):
            return Order.objects.filter(owner=self.request.user)

        def perform_create(self, serializer):
            serializer.save(owner=self.request.user)     # never trust an owner from the body

Now the list contains only Meena's orders, and Asha's order is simply **not found**:

    GET    /api/orders/2/   → 404 {"detail": "No Order matches the given query."}
    DELETE /api/orders/2/   → 404
    POST   /api/orders/ {"total": "50.00", "owner": 1}  → 201, owner 4 (Meena)

A **404** for someone else's record is deliberate: a 403 confirms the record exists, which lets an
attacker enumerate ids. Scoping \`get_queryset\` fixes list, retrieve, update and delete in one place;
keep an object permission too when rules depend on more than ownership (for example "only while the
order is PENDING").

## Roles

For staff-only actions use \`IsAdminUser\`. For real roles, use Django groups (\`user.groups.filter(name="support").exists()\`)
or \`DjangoModelPermissions\` and assign permissions to groups in the admin — not a role string
checked in twenty views.`,
    mcqs: [
      mcq('A view has `permission_classes = [IsAuthenticated, IsOwner]` and `queryset = Order.objects.all()`. IsOwner implements only `has_object_permission`. What does a logged-in user see from the list endpoint?', [
        ['Only their own orders, because IsOwner filters the list', false],
        ['A 403, because the list contains orders they do not own', false],
        ['Every order, because the list action never checks objects', true],
        ['An empty list, because object permissions fail closed', false],
      ], 'has_object_permission runs only through get_object(), which list() does not call. The list returns the whole queryset. Filter get_queryset by request.user to scope the list as well.'),
      mcq('The project default is `IsAuthenticated`. A view sets `permission_classes = [IsAdminUser]`. A logged-in non-staff user calls it. What is the result?', [
        ['200, since the default IsAuthenticated is still satisfied', false],
        ['401, since IsAdminUser treats non-staff users as anonymous', false],
        ['403, since the view\'s list replaces the default and fails', true],
        ['404, since admin views are hidden from non-staff users', false],
      ], 'A view\'s permission_classes replaces DEFAULT_PERMISSION_CLASSES rather than adding to it. IsAdminUser checks is_staff; the user is authenticated, so the refusal is a 403.'),
      mcq('Why is `serializer.save(owner=self.request.user)` in `perform_create` better than letting the client send `owner`?', [
        ['A client could otherwise create records owned by someone else', true],
        ['DRF cannot deserialise foreign keys from a JSON body', false],
        ['save() with keyword arguments skips all of the serializer validation', false],
        ['The owner column cannot be set before the row has an id', false],
      ], 'Anything in the request body is attacker-controlled. Making owner read-only in the serializer and setting it from request.user on the server means the ownership rule cannot be bypassed.'),
    ],
    checkpoint: [
      ck('AUTHORIZATION', `The first authentication class is SessionAuthentication. An anonymous user calls this view. What comes back?

    @api_view(["GET"])
    @authentication_classes([SessionAuthentication])
    @permission_classes([IsAuthenticated])
    def my_orders(request): ...`, [
        ['401 with a WWW-Authenticate header', false],
        ['302 redirect to the login page', false],
        ['403 "Authentication credentials were not provided."', true],
        ['200 with an empty list for the anonymous user', false],
      ], 'DRF uses 401 only when the first authentication class supplies a WWW-Authenticate value. SessionAuthentication does not, so an unauthenticated request is answered 403 with the "not provided" detail.'),
      ck('AUTHORIZATION', `Meena (id 4) is logged in. Order 2 belongs to Asha. With this viewset, what does DELETE /api/orders/2/ return?

    class OrderViewSet(viewsets.ModelViewSet):
        serializer_class = OrderSerializer
        permission_classes = [IsAuthenticated]
        def get_queryset(self):
            return Order.objects.filter(owner=self.request.user)`, [
        ['204, because IsAuthenticated is satisfied', false],
        ['403, because the order belongs to another user', false],
        ['404, because the order is outside the scoped queryset', true],
        ['405, because ModelViewSet disables delete by default', false],
      ], 'get_object() looks the id up in get_queryset(), which contains only Meena\'s orders, so it raises Http404. Answering 404 also avoids confirming that order 2 exists.'),
      ck('AUTHORIZATION', `A custom APIView fetches the object itself. Why does IsOwner never refuse anyone here?

    class OrderDetail(APIView):
        permission_classes = [IsAuthenticated, IsOwner]
        def get(self, request, pk):
            order = get_object_or_404(Order, pk=pk)
            return Response(OrderSerializer(order).data)`, [
        ['IsOwner must be listed before IsAuthenticated to take effect', false],
        ['APIView ignores permission_classes unless a router is used', false],
        ['get_object_or_404 returns objects without the owner field loaded', false],
        ['Nothing calls check_object_permissions with the fetched order', true],
      ], 'Object-level permissions run from get_object() in generic views, or when you call self.check_object_permissions(request, obj). This view does neither, so only has_permission checks run.'),
    ],
  },

  /* ── SECURITY_SETTINGS ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_AUTH_SECURITY_SETTINGS',
    notes: `The API authenticates and authorises. What is left is the configuration around it — the settings
that are fine on a laptop and dangerous on a server.

## CORS with django-cors-headers

The React dev server (\`http://localhost:5173\`) and the API (\`http://localhost:8000\`) are different
**origins**. The browser blocks the React code from reading cross-origin responses unless the API
sends \`Access-Control-Allow-Origin\`. CORS is a browser rule; curl and Postman ignore it, which is why
"it works in Postman" proves nothing here.

    pip install django-cors-headers

    INSTALLED_APPS += ["corsheaders"]
    MIDDLEWARE = [
        "django.middleware.security.SecurityMiddleware",
        "corsheaders.middleware.CorsMiddleware",            # as high as possible,
        "django.middleware.common.CommonMiddleware",        # and before CommonMiddleware
        ...
    ]
    CORS_ALLOWED_ORIGINS = ["http://localhost:5173", "https://shop.example.in"]

Observed: a request with \`Origin: http://localhost:5173\` got
\`Access-Control-Allow-Origin: http://localhost:5173\`; one from \`http://evil.com\` got a 200 with **no**
such header — the server still answered, the browser just won't hand the body to that page. The
preflight \`OPTIONS\` for a POST with an \`Authorization\` header was answered with the allowed methods and
headers, \`authorization\` included.

Order matters. With \`CorsMiddleware\` placed **after** \`CommonMiddleware\`, a request to
\`/api/products\` (no slash) got the APPEND_SLASH **301** without any CORS header, so the browser
reported a CORS error instead of following the redirect; placed before it, the 301 carried the header.

Never \`CORS_ALLOW_ALL_ORIGINS = True\` in production, and \`CORS_ALLOW_CREDENTIALS = True\` only when
the browser must send cookies cross-origin.

## CSRF: when it applies to an API

Django's \`CsrfViewMiddleware\` plus DRF's \`SessionAuthentication\` enforce CSRF for unsafe methods
from logged-in sessions. A JWT-only API is not exposed to CSRF (previous unit). If the React app uses
session cookies across subdomains, the HTTPS origin must be trusted:

    CSRF_TRUSTED_ORIGINS = ["https://shop.example.in"]     # scheme required since Django 4.0

## DEBUG = False, and what changes

\`DEBUG = True\` on a server shows every visitor a traceback with your settings, SQL and local
variables. With \`DEBUG = False\`:

- an unknown URL returns Django's plain \`404\` HTML page (DRF exceptions in your views are still JSON);
- \`ALLOWED_HOSTS\` is enforced with no development fallback — a \`Host\` header not in the list gets
  **400 Bad Request** (observed with \`Host: evil.example\`);
- Django stops serving static files; collect them (\`collectstatic\`) and let the web server or
  WhiteNoise serve them;
- unhandled errors are logged and mailed to \`ADMINS\` (if configured) instead of displayed.

    DEBUG = os.environ.get("DJANGO_DEBUG") == "1"           # off unless explicitly on
    ALLOWED_HOSTS = ["api.shop.example.in"]
    SECRET_KEY = os.environ["DJANGO_SECRET_KEY"]            # crash at start if missing

## HTTPS settings

    SECURE_SSL_REDIRECT = True                 # http -> https
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")   # only behind a proxy that sets it
    SESSION_COOKIE_SECURE = True               # cookies only over HTTPS
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000             # browsers refuse plain HTTP for a year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True

HSTS cannot be undone quickly — browsers remember it for the whole duration — so start with a small
value (3600) and raise it once HTTPS is solid everywhere. \`SECURE_PROXY_SSL_HEADER\` without a proxy
that strips and sets that header lets any client claim to be on HTTPS.

## manage.py check --deploy

    python manage.py check --deploy

Run against a settings file with \`DEBUG = False\`, a \`django-insecure-\` key and none of the HTTPS
settings, it reported five warnings: **W004** (no \`SECURE_HSTS_SECONDS\`), **W008**
(\`SECURE_SSL_REDIRECT\` not True), **W009** (weak or \`django-insecure-\` \`SECRET_KEY\`), **W012**
(\`SESSION_COOKIE_SECURE\`) and **W016** (\`CSRF_COOKIE_SECURE\`). With \`DEBUG = True\` it adds **W018**.
With the settings above and a long random key: \`System check identified no issues (0 silenced).\`
Put it in CI, run against the production settings module.`,
    mcqs: [
      mcq('The React app on `http://localhost:5173` calls the API and the console shows a CORS error, but the same request works in Postman. What is the most likely cause?', [
        ['The API does not send Access-Control-Allow-Origin for that origin', true],
        ['Postman sends a CSRF token automatically and the browser does not', false],
        ['The API has DEBUG on, which disables CORS headers', false],
        ['ALLOWED_HOSTS does not include localhost:5173', false],
      ], 'CORS is enforced by the browser, not the server, and Postman ignores it. Add the dev origin to CORS_ALLOWED_ORIGINS. ALLOWED_HOSTS is about the Host header of the API itself, not the calling page.'),
      mcq('With `DEBUG = False` and `ALLOWED_HOSTS = ["api.shop.example.in"]`, a request arrives with `Host: 13.233.10.5` (the server IP). What happens?', [
        ['200, because IP addresses are always allowed', false],
        ['301 redirect to the first entry in ALLOWED_HOSTS', false],
        ['403 from CsrfViewMiddleware for the unknown host', false],
        ['400 Bad Request, because the host is not listed', true],
      ], 'Django validates the Host header against ALLOWED_HOSTS and raises DisallowedHost, answered as 400. Load balancer health checks that use the IP need the IP listed, or a check that sends the right Host.'),
      mcq('Why is starting with `SECURE_HSTS_SECONDS = 3600` rather than a year a sensible rollout?', [
        ['Django ignores HSTS values longer than one hour', false],
        ['Browsers obey HSTS for the full duration, even if you remove it', true],
        ['A long HSTS value silently disables SECURE_SSL_REDIRECT in Django', false],
        ['check --deploy fails when HSTS exceeds one day', false],
      ], 'Once a browser has seen the header it refuses plain HTTP for that many seconds. If some subdomain or path is not ready for HTTPS, a year-long value locks users out for a year; raise it once everything works.'),
    ],
    checkpoint: [
      ck('DJANGO_REST', `CORS_ALLOWED_ORIGINS includes the React origin. A fetch to /api/products (no trailing slash) fails with a CORS error, while /api/products/ works. What is wrong?

    MIDDLEWARE = [
        "django.middleware.security.SecurityMiddleware",
        "django.middleware.common.CommonMiddleware",
        ...,
        "corsheaders.middleware.CorsMiddleware",
    ]`, [
        ['CORS_ALLOWED_ORIGINS needs a trailing slash on each origin', false],
        ['CorsMiddleware runs after CommonMiddleware, so the 301 lacks CORS headers', true],
        ['APPEND_SLASH must be False whenever django-cors-headers is installed', false],
        ['SecurityMiddleware strips CORS headers from redirects', false],
      ], 'CommonMiddleware turns the 404 into an APPEND_SLASH redirect on the way out, after the inner CorsMiddleware has already added its header to the old response. Placing CorsMiddleware above CommonMiddleware puts the header on the redirect.'),
      ck('DJANGO_REST', 'Which change makes `manage.py check --deploy` stop reporting security.W009?', [
        ['A SECRET_KEY of 50+ random characters, read from the environment', true],
        ['Setting DEBUG = False in the production settings module', false],
        ['Adding the server address to ALLOWED_HOSTS', false],
        ['Setting both SESSION_COOKIE_SECURE and CSRF_COOKIE_SECURE to True', false],
      ], 'W009 is about the key itself: under 50 characters, under 5 unique characters, or the django-insecure- prefix that startproject generates. DEBUG is W018 and the cookie flags are W012 and W016.'),
      ck('AUTHENTICATION', 'Behind a load balancer that terminates HTTPS, `SECURE_SSL_REDIRECT = True` causes an endless redirect loop. What fixes it?', [
        ['Turning SECURE_SSL_REDIRECT off and relying on HSTS alone', false],
        ['Adding the load balancer address to CSRF_TRUSTED_ORIGINS and ALLOWED_HOSTS', false],
        ['SECURE_PROXY_SSL_HEADER for the X-Forwarded-Proto the balancer sets', true],
        ['Setting SESSION_COOKIE_SECURE so Django can detect HTTPS', false],
      ], 'Django sees plain HTTP from the balancer and keeps redirecting. SECURE_PROXY_SSL_HEADER tells it to trust the forwarded scheme — safe only if the proxy always sets that header and strips it from clients.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_AUTH_DEBUGGING',
    notes: `Eight faults from real Django APIs. Each has a symptom you will actually see, the cause, and the
smallest fix. Reproduce them with APIClient before you change anything.

## 1. InconsistentMigrationHistory after adding a custom user

\`Migration admin.0001_initial is applied before its dependency users.0001_initial\`. **Cause:**
\`AUTH_USER_MODEL\` was changed after the first \`migrate\`. **Fix:** on a new project, drop the dev
database and migrate again from scratch; on a live one, plan a data migration — and next time set
the custom user before the first migrate.

## 2. Users cannot log in after sign-up

The token endpoint answers 401 "No active account found" for a user that clearly exists. **Cause:**
the password was stored in plain text — a \`ModelSerializer\` without a custom \`create\`, or
\`User.objects.create(password=...)\`. \`user.password\` in the shell shows the raw string.
**Fix:** \`create_user\` / \`set_password\`; reset the affected users' passwords.

## 3. The password comes back in the response

\`201 {"id": 5, "username": "kiran", ..., "password": "Very$ecure1"}\`. **Cause:** the field is not
\`write_only\`. **Fix:** \`password = serializers.CharField(write_only=True)\` or
\`extra_kwargs = {"password": {"write_only": True}}\`.

## 4. 401 with a valid token

**Cause, one of:** the header prefix is \`Token\` or \`JWT\` but \`AUTH_HEADER_TYPES\` is \`("Bearer",)\`
("credentials were not provided"); the client sent the **refresh** token ("Token has wrong type");
the access token expired ("Token is expired"); or \`SECRET_KEY\` differs between the server that issued
and the one that checks ("Token is invalid"). **Fix:** read the \`detail\` and \`messages\` in the 401
body — Simple JWT tells you which.

## 5. Every user sees every order

The list endpoint returns other users' records although an \`IsOwner\` permission is set. **Cause:**
\`has_object_permission\` is not called for list actions. **Fix:** filter \`get_queryset\` by
\`self.request.user\`.

## 6. Tests expect 401 and get 403

**Cause:** \`SessionAuthentication\` is first in \`DEFAULT_AUTHENTICATION_CLASSES\`, and it has no
\`WWW-Authenticate\` header, so DRF answers anonymous requests with 403. **Fix:** put
\`JWTAuthentication\` first if it is the API's main scheme, or assert the code your configuration
actually produces.

## 7. "CSRF Failed" on a POST from React

\`403 {"detail": "CSRF Failed: CSRF cookie not set."}\` **Cause:** the request was authenticated by
the session cookie (often the admin login in the same browser), so \`SessionAuthentication\` enforced
CSRF. **Fix:** for a token-based SPA, remove \`SessionAuthentication\` from the API's classes (keep it
for the browsable API in development only), or send the \`X-CSRFToken\` header if sessions are intended.

## 8. CORS error only on some URLs, or only in production

**Cause, one of:** \`CorsMiddleware\` is below \`CommonMiddleware\` so redirects lack the header; the
production origin is missing from \`CORS_ALLOWED_ORIGINS\` or has a trailing slash or wrong scheme
(\`http\` vs \`https\`) — a path is refused outright by the \`corsheaders.E014\` system check; or the
proxy in front (nginx, a load balancer) answers 502/504 itself, and its error page carries no CORS
header. **Fix:** move the middleware up, list exact origins, and check the Network tab for the real
status code behind the CORS message.`,
    mcqs: [
      mcq('A sign-up endpoint returns 201, but logging in with the same password returns 401. In the shell, `User.objects.get(username="kiran").password` prints `Very$ecure1`. What is the fix?', [
        ['Lowercase the username before calling the token endpoint', false],
        ['Add the user to the token_blacklist outstanding tokens', false],
        ['Mark the user is_staff so the token view accepts them', false],
        ['Create users with create_user, which hashes the password', true],
      ], 'The column holds the raw password, so check_password fails during login. A ModelSerializer\'s default create() bypasses hashing; override create() to call create_user (or set_password) and reset the affected accounts.'),
      mcq('A 401 body reads `"messages": [{"token_class": "AccessToken", "token_type": "access", "message": "Token has wrong type"}]`. What did the client send?', [
        ['An access token that has passed its exp time', false],
        ['The refresh token in the Authorization header', true],
        ['An access token signed with a different SECRET_KEY', false],
        ['A token whose header prefix was JWT instead of Bearer', false],
      ], 'Simple JWT stores token_type in the payload and JWTAuthentication accepts only access tokens. An expired one says "Token is expired", a re-signed one "Token is invalid", and a wrong prefix is treated as no credentials at all.'),
      mcq('After adding `SessionAuthentication` first to the default classes "for the browsable API", several tests that assert 401 for anonymous requests now get 403. Why?', [
        ['SessionAuthentication rejects every request that carries no cookie', false],
        ['The browsable API converts all 401 responses into 403 pages', false],
        ['DRF picks 401 or 403 from the first authentication class', true],
        ['IsAuthenticated returns 403 whenever two classes are configured', false],
      ], 'An anonymous refusal is a 401 only if the first authentication class provides a WWW-Authenticate header. SessionAuthentication provides none, so DRF answers 403.'),
      mcq('React on `https://shop.example.in` gets a CORS error in production only. `CORS_ALLOWED_ORIGINS = ["http://shop.example.in/"]`. What is wrong?', [
        ['The origin has the wrong scheme and a trailing slash', true],
        ['Production needs CORS_ALLOW_ALL_ORIGINS instead', false],
        ['CORS settings are ignored when DEBUG is False', false],
        ['The API domain must be in CORS_ALLOWED_ORIGINS too', false],
      ], 'An origin is scheme plus host plus optional port, with no path, so "https://shop.example.in" must match exactly. django-cors-headers also rejects entries with a path at startup through its system checks.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_AUTH_PRACTICE',
    notes: `Six exercises on the shop API. Use the project from the DRF topic (or start a fresh one — then do
Exercise 1 before the first \`migrate\`). Test every outcome with \`APIClient\`, not by eye.

**Exercise 1 — An email-login user.** Write \`accounts.User\` on \`AbstractBaseUser\` + \`PermissionsMixin\`
with \`email\` as \`USERNAME_FIELD\`, \`full_name\`, \`is_active\`, \`is_staff\`, and a manager whose
\`create_user\` lowercases the **whole** email. Prove \`createsuperuser\` asks for email and full name,
and that \`user.password\` starts with \`pbkdf2_sha256$\`.

**Exercise 2 — Registration.** A \`RegisterSerializer\` with a \`write_only\` password, Django's password
validators, and a \`confirm_password\` that must match (validated in \`validate()\` and removed before
\`create_user\`). Tests: 201 body has no password; mismatched passwords → 400 naming the field;
duplicate email → 400; weak \`"12345678"\` → 400 with the validator's message.

**Exercise 3 — JWT end to end.** Simple JWT with 10-minute access, 3-day refresh, rotation and
blacklist; routes for token, refresh and logout. Tests: wrong password → 401; Bearer access → 200 on
\`/api/me/\`; refresh token as Bearer → 401; reused refresh after rotation → 401 "Token is blacklisted";
refresh after logout → 401. Write a comment explaining why the access token still works after logout.

**Exercise 4 — Ownership.** \`Order\` with \`owner\`. A viewset scoped in \`get_queryset\`, \`owner\` set in
\`perform_create\` and read-only in the serializer. Tests with two users: each lists only their own;
GET, PATCH and DELETE on the other's order → 404; POST with someone else's \`owner\` id still creates
an order owned by the caller.

**Exercise 5 — Roles.** Products: anyone reads, only staff write. Then a \`support\` group that may
\`PATCH\` an order's status but nothing else — a custom permission checking the group and the method.
Tests for anonymous, customer, support and staff on each method, asserting 200/201, 401 or 403.

**Exercise 6 — Production settings.** A \`settings/prod.py\` that reads \`SECRET_KEY\`, \`ALLOWED_HOSTS\`
and \`CORS_ALLOWED_ORIGINS\` from the environment, \`DEBUG = False\`, and the HTTPS settings. Run
\`python manage.py check --deploy --settings=config.settings.prod\` until it reports no issues, and
note what each warning you fixed protects against.`,
    mcqs: [
      mcq('In Exercise 2, `confirm_password` is validated in `validate()`. What happens if `create()` passes `validated_data` straight to `create_user` without removing it?', [
        ['create_user ignores keys it does not recognise', false],
        ['The user is created with confirm_password stored in plain text', false],
        ['The model constructor raises TypeError for an unexpected keyword', true],
        ['DRF strips write-only fields before create() is called', false],
      ], 'create_user forwards extra keyword arguments to the model constructor, which raises TypeError for a field that does not exist. Pop confirm_password in validate() or create() before saving.'),
      mcq('In Exercise 3, which test proves rotation and blacklisting work together?', [
        ['Refresh with R1, then refresh with R1 again and expect 401', true],
        ['Refresh with R1 and assert the new access token differs from the old', false],
        ['Call /api/me/ with the first access token after a refresh and expect 401', false],
        ['Log in twice and assert the two refresh tokens differ', false],
      ], 'Rotation issues a new refresh token; the blacklist rejects the old one. Replaying R1 must fail with "Token is blacklisted". The old access token still working is expected, so asserting 401 there would be a wrong test.'),
      mcq('In Exercise 4, Meena PATCHes Asha\'s order. The test asserts 404, a teammate asks for 403. Which reason supports 404?', [
        ['404 is the only status DRF can return from a scoped queryset', false],
        ['403 would confirm that an order with that id exists', true],
        ['404 responses are cached by browsers, which reduces load', false],
        ['403 is reserved for anonymous users in DRF', false],
      ], 'Answering 403 tells the caller the id is real, which helps enumeration. A scoped queryset makes the record not exist for that user, and 404 says exactly that.'),
      mcq('In Exercise 5, the support group must PATCH order status only. Which permission method holds the method check?', [
        ['has_object_permission, so list requests also check the method', false],
        ['has_permission, using request.method and the user\'s groups', true],
        ['get_queryset, returning no rows for non-PATCH requests', false],
        ['The serializer\'s validate(), raising PermissionDenied', false],
      ], 'Whether this user may use this method on this endpoint does not depend on a specific object, so has_permission is the right place, and it runs for every request. Hiding rows or raising from a serializer mixes concerns and gives misleading status codes.'),
      mcq('In Exercise 6, `check --deploy` warns W018 only when run with the dev settings. What does that tell you?', [
        ['The production settings module is missing the HSTS settings', false],
        ['The dev settings have DEBUG on, which the check expects there', true],
        ['ALLOWED_HOSTS is empty in the production settings module', false],
        ['The SECRET_KEY in the dev settings starts with django-insecure-', false],
      ], 'security.W018 is "DEBUG set to True in deployment". It is expected for development settings; the check matters for the module you deploy, which is why the exercise passes --settings explicitly.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_AUTH_INTERVIEW_QUESTION',
    notes: `Three questions Django backend interviews ask about auth, with an answer that gets you through and
the follow-up a good answer earns.

## 1. "How does Django store passwords, and why start with a custom user model?"

**Model answer.** Django never stores the password. \`set_password\` stores
\`algorithm$iterations$salt$hash\` — PBKDF2-SHA256 by default with a high, rising iteration count and a
random salt per password — and \`check_password\` recomputes it. \`PASSWORD_HASHERS\` controls the
algorithm; I can put Argon2 first and old hashes are upgraded on the next login. A custom user model,
even \`class User(AbstractUser): pass\`, set in \`AUTH_USER_MODEL\` before the first migration, costs
nothing and avoids a painful migration later, because every foreign key to the user is fixed when its
migration is created. Code then uses \`get_user_model()\` and \`settings.AUTH_USER_MODEL\`, never
\`auth.User\` directly.

**Follow-up:** "AbstractUser or AbstractBaseUser?" \`AbstractUser\` when I want the default fields plus
some of my own — most projects. \`AbstractBaseUser\` with \`PermissionsMixin\` when the shape differs,
like email-only login, and then I write the manager (\`create_user\`, \`create_superuser\`),
\`USERNAME_FIELD\` and \`REQUIRED_FIELDS\` myself.

## 2. "Walk me through JWT auth in your DRF API. How do you log a user out?"

**Model answer.** Simple JWT: \`TokenObtainPairView\` takes credentials and returns an access and a
refresh token. The client sends \`Authorization: Bearer <access>\`; \`JWTAuthentication\` verifies the
signature and expiry and loads the user. Access tokens live minutes, refresh tokens days. With
\`ROTATE_REFRESH_TOKENS\` and \`BLACKLIST_AFTER_ROTATION\` (and the \`token_blacklist\` app), each refresh
issues a new refresh token and the old one is rejected. Logout posts the refresh token to
\`TokenBlacklistView\`. The access token cannot be revoked — it stays valid until it expires — which
is why it is short. The client also drops both tokens.

**Follow-up:** "A user's account is compromised. How do you cut off access right now?" Set
\`is_active=False\` — \`JWTAuthentication\` loads the user on every request and refuses inactive ones —
and blacklist their outstanding refresh tokens. Rotating \`SIGNING_KEY\` logs out everyone, which is
the last resort.

## 3. "How do you make sure users can only access their own data?"

**Model answer.** Two layers. First, \`get_queryset\` filtered by \`request.user\`, so list, retrieve,
update and delete all see only the user's rows, and another user's id is a 404 — which also does not
reveal that the record exists. Second, the owner is set on the server in \`perform_create\` and is
read-only in the serializer. On top of that, a \`BasePermission\` with \`has_object_permission\` for rules
beyond ownership. The pitfall is relying on the object permission alone: list views never call it.

**Follow-up:** "When would you return 403 instead of 404?" When the user is allowed to know the
resource exists but not to do this action — a customer may read their order but not cancel it once
it has shipped. That is a 403 from an object permission on a record they can see.`,
    mcqs: [
      mcq('An interviewer asks how to cut off a compromised user who holds a 15-minute access token and a 7-day refresh token. Which answer is complete?', [
        ['Delete their session row; JWTs depend on the session table', false],
        ['Wait for the access token to expire; nothing else is possible', false],
        ['Rotate SECRET_KEY, which only invalidates that user\'s tokens', false],
        ['Set is_active=False and blacklist their outstanding refresh tokens', true],
      ], 'JWTAuthentication loads the user per request and rejects inactive accounts, so the access token stops working at once; blacklisting stops refreshes. Rotating the key would log out every user, not one.'),
      mcq('A candidate says "I added an IsOwner object permission, so users only see their own orders." What should the interviewer probe?', [
        ['Whether IsOwner is listed before IsAuthenticated', false],
        ['Whether the list endpoint returns everyone\'s orders', true],
        ['Whether the permission class has a custom message', false],
        ['Whether IsOwner subclasses BasePermission or object', false],
      ], 'has_object_permission is never called for list actions, so an unscoped queryset still lists every order. The fix is filtering get_queryset by request.user.'),
      mcq('Why does Django upgrade a user\'s password hash when they log in, after `PASSWORD_HASHERS` changes?', [
        ['Only at login does it have the plain password needed to rehash it', true],
        ['The old hash expires on its own once a new hasher is configured', false],
        ['check_password can verify only hashes made by the first hasher', false],
        ['Rehashing at login lets Django drop the salt from older hashes', false],
      ], 'A hash cannot be converted to another algorithm. When check_password succeeds with an older hasher, Django has the password in hand and stores a new hash with the preferred one.'),
    ],
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_AUTH_CHECKPOINT',
    notes: `Ten questions across the topic: the custom user model and password hashing, Simple JWT tokens and
their limits, permission classes, 401 versus 403, object ownership, CORS and production settings.
Most show a setting or a view and ask what DRF answers. Decide the status code and the reason before
you read the options.`,
    checkpoint: [
      ck('AUTHENTICATION', `What does POST /api/auth/register/ return for {"username": "meena", "email": "meena@x.in", "password": "Very$ecure1"}?

    class RegisterSerializer(serializers.ModelSerializer):
        password = serializers.CharField(write_only=True, min_length=8)
        class Meta:
            model = User
            fields = ["id", "username", "email", "password"]
        def create(self, data):
            return User.objects.create_user(**data)`, [
        ['201 with id, username, email and the hashed password', false],
        ['201 with id, username and email only', true],
        ['201 with id, username, email and the password as typed', false],
        ['400, because write_only fields cannot be sent in a POST', false],
      ], 'write_only fields are accepted on input and left out of the output, and create_user hashes the password. The response carries only id, username and email.'),
      ck('AUTHENTICATION', 'Which `PASSWORD_HASHERS` change makes Django store new passwords with Argon2 while existing PBKDF2 users can still log in?', [
        ['Replace the whole list with the Argon2 hasher alone', false],
        ['Put the Argon2 hasher first and keep the PBKDF2 hashers after it', true],
        ['Append the Argon2 hasher to the end of the default list', false],
        ['Set ARGON2_ENABLED = True alongside the default list', false],
      ], 'The first hasher is used for new hashes; the rest are only for verifying existing ones. Removing PBKDF2 would lock out existing users, and appending Argon2 would never use it for new hashes. It also needs argon2-cffi installed.'),
      ck('AUTHENTICATION', 'ACCESS_TOKEN_LIFETIME is 15 minutes. A user logs out through TokenBlacklistView at 10:00 using their refresh token. Their access token was issued at 09:55. Until when does it authenticate requests?', [
        ['Until 10:00, the moment of logout', false],
        ['Until 10:10, when it expires', true],
        ['Until the refresh token\'s own expiry, days later', false],
        ['Until the next deploy rotates the server process', false],
      ], 'The blacklist records refresh tokens. The access token is validated by signature and exp only, so it works until 09:55 plus 15 minutes.'),
      ck('AUTHORIZATION', `An anonymous user sends POST /api/products/ to this view, with JWTAuthentication as the first authentication class. What comes back?

    @api_view(["GET", "POST"])
    @permission_classes([IsAuthenticatedOrReadOnly])
    def products(request): ...`, [
        ['200, because the view allows anonymous access', false],
        ['403 "You do not have permission to perform this action."', false],
        ['405, because anonymous users may only use GET', false],
        ['401 with WWW-Authenticate: Bearer realm="api"', true],
      ], 'IsAuthenticatedOrReadOnly allows anonymous GET, HEAD and OPTIONS only. For a write it fails, the user is anonymous, and JWTAuthentication supplies a WWW-Authenticate header, so DRF answers 401.'),
      ck('AUTHORIZATION', 'A user with `is_superuser=True` but `is_staff=False` calls a view protected by `IsAdminUser`. What happens?', [
        ['403, because IsAdminUser checks is_staff only', true],
        ['200, because superusers pass every permission check', false],
        ['401, because the account is treated as inactive', false],
        ['200, because is_superuser implies is_staff in the model', false],
      ], 'IsAdminUser returns request.user and request.user.is_staff. Superuser status grants all model permissions via has_perm, but this class does not consult it.'),
      ck('AUTHORIZATION', `Which line removes the leak from this viewset, where any logged-in user can list every invoice?

    class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
        queryset = Invoice.objects.all()
        serializer_class = InvoiceSerializer
        permission_classes = [IsAuthenticated, IsInvoiceOwner]`, [
        ['Swap the order of IsAuthenticated and IsInvoiceOwner', false],
        ['Filter get_queryset with customer=self.request.user', true],
        ['Change ReadOnlyModelViewSet to ModelViewSet', false],
        ['Add has_permission to IsInvoiceOwner that checks request.user.is_authenticated', false],
      ], 'The object permission protects retrieve only. Scoping the queryset to the user removes other customers\' invoices from the list and turns their detail URLs into 404s.'),
      ck('AUTHORIZATION', 'Order 7 belongs to another user. Your viewset scopes `get_queryset` to `request.user`. Why is the resulting 404 for `GET /api/orders/7/` the right answer?', [
        ['A 404 tells the caller to retry later with a token', false],
        ['DRF cannot produce a 403 from a ModelViewSet', false],
        ['A 403 would reveal that order 7 exists', true],
        ['404 is required by the HTTP spec for ownership checks', false],
      ], 'For the caller, records they may not see should be indistinguishable from records that do not exist. A 403 confirms the id is valid and helps enumeration.'),
      ck('DJANGO_REST', 'A React app on `http://localhost:5173` calls the API with `Authorization: Bearer ...`. Before the real POST, the browser sends `OPTIONS` with `Access-Control-Request-Headers: authorization,content-type`. What must the API answer for the POST to proceed?', [
        ['A 401, since the preflight carries no token', false],
        ['The allowed origin, methods and headers, including authorization', true],
        ['A CSRF cookie, which the browser then echoes in the POST', false],
        ['A 204 with no headers at all; the browser only needs a success code', false],
      ], 'The preflight asks permission to send that method and those headers from that origin. django-cors-headers answers it with Access-Control-Allow-Origin, -Methods and -Headers (authorization is in its default list); without them the browser never sends the POST.'),
      ck('DJANGO_REST', `What is wrong with these production settings?

    DEBUG = True
    ALLOWED_HOSTS = ["api.shop.example.in"]
    SECRET_KEY = os.environ["DJANGO_SECRET_KEY"]
    SECURE_SSL_REDIRECT = True`, [
        ['ALLOWED_HOSTS is ignored unless SECURE_SSL_REDIRECT is off', false],
        ['SECRET_KEY must be written in the settings file for check --deploy to be able to read it', false],
        ['SECURE_SSL_REDIRECT requires DEBUG to be True to take effect', false],
        ['DEBUG = True shows tracebacks with settings and locals to any visitor', true],
      ], 'With DEBUG on, any error page exposes code, SQL, settings and local variables; check --deploy flags it as security.W018. The other lines are what production settings should look like.'),
      ck('DJANGO_REST', 'The API uses only JWTAuthentication. A teammate adds `@csrf_exempt` to every view "to stop CSRF errors". What do you tell them?', [
        ['That is required, since DRF enforces CSRF on all POST requests', false],
        ['It is needed only for viewsets, since routers enforce CSRF', false],
        ['It is pointless: DRF enforces CSRF only for session-authenticated requests', true],
        ['It breaks JWT logins, because Simple JWT needs the CSRF cookie to sign tokens', false],
      ], 'DRF views are already CSRF-exempt at the Django level; SessionAuthentication re-applies the check only for requests it authenticates by cookie. With Bearer tokens there is no CSRF check to silence. CSRF errors mean a session cookie is authenticating the request.'),
    ],
  },
];
