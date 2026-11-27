/**
 * Career-track content: Django Fundamentals (JT_DJANGO_CORE), for Python Full Stack + AI.
 *
 * Targets Django 5.x (checked against 5.2) on Python 3.10+, with MySQL 8 through mysqlclient. Every
 * behaviour claimed here that does not need MySQL was run in a throwaway project: middleware order,
 * path converters and route order, reverse() with namespaces, JsonResponse and safe=False,
 * get_object_or_404, APPEND_SLASH, as_view() keyword checks, the admin's system checks (E108, E112,
 * E122, E124), staff vs superuser access, DisallowedHost, runserver with DEBUG off, and collectstatic
 * without STATIC_ROOT. MySQL-only details (utf8mb4, sql_mode) are stated as documented behaviour.
 *
 * The topic's single skill is DJANGO, so checkpoint questions name no skillKey.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_DJANGO_CORE_BUNDLES: PilotBundle[] = [
  /* ── PROJECT_APPS ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_CORE_PROJECT_APPS',
    notes: `You have written a library manager by hand: a connection function, repositories, a service
layer and a CLI. **Django** is the framework that gives you all of that plumbing — routing, an ORM,
an admin, settings, security middleware — so that your code is mostly the rules of your app. This
part of the track builds one API on Django and MySQL: a **course catalogue** that later grows into a
REST API with authentication and tests, and that the React frontend calls.

We use **Django 5.x** (5.2 is the long-term-support release; 4.2 LTS is still common in companies,
and everything in this topic works there too unless flagged).

## Project vs app

A **project** is the deployable whole: one settings module, one root URL configuration, one
database. An **app** is a Python package that does one job inside it — \`catalogue\`, \`accounts\`,
\`orders\` — with its own models, views, URLs and admin. One project, many apps; a well-cut app can be
reused in another project.

    python -m venv .venv
    .venv\\Scripts\\activate                 # source .venv/bin/activate on Linux/macOS
    pip install "django>=5.2,<6" mysqlclient
    django-admin startproject config .      # the dot: put manage.py here, not in a nested folder
    python manage.py startapp catalogue

Naming the project package \`config\` (rather than repeating the repository name) is a common
convention: it makes clear that the package holds configuration, not features.

    .
    ├── manage.py               # command-line entry point; sets DJANGO_SETTINGS_MODULE
    ├── config/
    │   ├── __init__.py
    │   ├── settings.py         # all configuration
    │   ├── urls.py             # the root URLconf
    │   ├── asgi.py / wsgi.py   # entry points for the production server
    └── catalogue/
        ├── __init__.py
        ├── admin.py            # admin registrations
        ├── apps.py             # the AppConfig
        ├── migrations/         # generated schema changes
        ├── models.py
        ├── tests.py
        └── views.py

\`manage.py\` is \`django-admin\` with \`DJANGO_SETTINGS_MODULE=config.settings\` already set. You will
use \`runserver\`, \`makemigrations\`, \`migrate\`, \`createsuperuser\`, \`shell\`, \`check\` and
\`collectstatic\` constantly.

## INSTALLED_APPS and AppConfig

Creating an app folder does nothing until the app is listed in \`INSTALLED_APPS\`:

    INSTALLED_APPS = [
        "django.contrib.admin",
        "django.contrib.auth",
        "django.contrib.contenttypes",
        "django.contrib.sessions",
        "django.contrib.messages",
        "django.contrib.staticfiles",
        "catalogue",                       # or "catalogue.apps.CatalogueConfig"
    ]

Django uses this list to find models (for migrations), admin modules (\`admin.py\` is auto-discovered),
templates, static files and management commands. Forget the entry and the first import of your
models fails:

    RuntimeError: Model class catalogue.models.Category doesn't declare an explicit app_label
    and isn't in an application in INSTALLED_APPS.

\`startapp\` generates an **AppConfig** in \`apps.py\`:

    from django.apps import AppConfig

    class CatalogueConfig(AppConfig):
        default_auto_field = "django.db.models.BigAutoField"   # primary keys are BIGINT
        name = "catalogue"                                     # the Python path of the app
        verbose_name = "Course catalogue"                      # shown in the admin

        def ready(self):
            from . import signals   # noqa: F401 — connect signal handlers once, at startup

Listing \`"catalogue"\` picks up this class automatically (it is the only AppConfig in \`apps.py\`).
\`ready()\` runs once when the app registry is loaded — the place to connect signals, never the place
to query the database.

## The request–response cycle

Every request takes the same path, and knowing it is how you debug Django:

1. The server (\`runserver\` in development; Gunicorn or Uvicorn in production) receives the HTTP
   request and calls Django through \`wsgi.py\`/\`asgi.py\`.
2. Django builds an **\`HttpRequest\`** — method, path, \`GET\`, headers, \`body\`, later \`user\`.
3. The request passes **down** through \`MIDDLEWARE\`, top to bottom.
4. The **URL resolver** matches the path against \`ROOT_URLCONF\`, in order; the first match wins.
5. The matched **view** runs, usually using models (the ORM) and returns an **\`HttpResponse\`**.
6. The response passes back **up** through the middleware, bottom to top, and is sent to the client.

## Middleware and its order

Middleware is a chain of callables wrapped around the view. A minimal one:

    import time

    class TimingMiddleware:
        def __init__(self, get_response):
            self.get_response = get_response          # the next layer inward

        def __call__(self, request):
            start = time.perf_counter()               # before the view: on the way in
            response = self.get_response(request)
            response["X-Elapsed-ms"] = f"{(time.perf_counter() - start) * 1000:.1f}"
            return response                           # after the view: on the way out

With \`MIDDLEWARE = ["M1", "M2"]\` a request runs **M1 in → M2 in → view → M2 out → M1 out** (we ran
this and logged exactly that). If a middleware returns a response without calling
\`get_response\` — a maintenance page, a rate limit — the layers inside it and the view never run,
but the layers outside it still see the response.

The default order is not arbitrary:

    MIDDLEWARE = [
        "django.middleware.security.SecurityMiddleware",        # HTTPS redirects, security headers
        "django.contrib.sessions.middleware.SessionMiddleware", # request.session
        "django.middleware.common.CommonMiddleware",            # APPEND_SLASH and friends
        "django.middleware.csrf.CsrfViewMiddleware",            # CSRF checks on unsafe methods
        "django.contrib.auth.middleware.AuthenticationMiddleware",  # request.user — needs session
        "django.contrib.messages.middleware.MessageMiddleware",
        "django.middleware.clickjacking.XFrameOptionsMiddleware",
    ]

Swap Session and Authentication and every request fails with \`ImproperlyConfigured: The Django
authentication middleware requires session middleware to be installed\`. Later, django-cors-headers'
\`CorsMiddleware\` goes high in the list, before \`CommonMiddleware\`, so even a redirect gets CORS
headers.

## Django and Spring Boot, side by side

| Spring Boot | Django |
|---|---|
| \`@RestController\` method | a view function or class |
| \`@GetMapping("/courses/{id}")\` | \`path("courses/<int:pk>/", view)\` |
| Filters / interceptors | middleware |
| JPA entity + repository | model + \`Model.objects\` manager |
| \`application.yml\` / profiles | \`settings\` modules + environment variables |
| Flyway / Liquibase | migrations (\`makemigrations\` / \`migrate\`) |

Django is "batteries included": the admin, auth, sessions and migrations ship in the box.`,
    workedExample: `**Problem:** start the catalogue project, prove the app is wired in, and see the
request–response cycle with your own middleware.

**1. Create and register.**

    django-admin startproject config .
    python manage.py startapp catalogue

Add \`"catalogue"\` to \`INSTALLED_APPS\`, then:

    python manage.py check
    System check identified no issues (0 silenced).

**2. A first view and URL.** \`catalogue/views.py\`:

    from django.http import JsonResponse

    def health(request):
        return JsonResponse({"status": "ok", "method": request.method})

\`config/urls.py\`:

    from django.contrib import admin
    from django.urls import path
    from catalogue.views import health

    urlpatterns = [
        path("admin/", admin.site.urls),
        path("health/", health),
    ]

**3. Log the order.** \`catalogue/middleware.py\`:

    import logging
    log = logging.getLogger(__name__)

    class RequestLogMiddleware:
        def __init__(self, get_response):
            self.get_response = get_response

        def __call__(self, request):
            log.info("-> %s %s", request.method, request.path)
            response = self.get_response(request)
            log.info("<- %s %s", response.status_code, request.path)
            return response

Append \`"catalogue.middleware.RequestLogMiddleware"\` to the **end** of \`MIDDLEWARE\`, run
\`python manage.py runserver\` and open \`http://127.0.0.1:8000/health/\`:

    {"status": "ok", "method": "GET"}

**4. Read what happened.** Because the new middleware is last, it is the innermost layer: its "->"
line runs after authentication has set \`request.user\`, and its "<-" line runs before the outer
layers add their headers. Move it to the top and it would see the request before
\`SecurityMiddleware\` — the place to measure the full time a request spends in Django.

**5. Break it on purpose.** Remove \`"catalogue"\` from \`INSTALLED_APPS\` once the app has a model, run
\`check\`, read the \`RuntimeError\`, and put it back. Recognising that error in two seconds is the
skill.`,
    mcqs: [
      mcq('MIDDLEWARE lists A, then B, then C, and each logs "in" before calling get_response and "out" after it. A request reaches a view that returns 200. What is the log order?', [
        ['A in, B in, C in, C out, B out, A out', true],
        ['A in, B in, C in, A out, B out, C out', false],
        ['C in, B in, A in, A out, B out, C out', false],
        ['A in, A out, B in, B out, C in, C out', false],
      ], 'Middleware wraps the view like layers of an onion: the request travels down the list, the response travels back up it, so the first entry is the first in and the last out.'),
      mcq('A developer runs startapp payments, writes a Payment model, and runs makemigrations. Django reports "No changes detected". What is the likely cause?', [
        ['payments is not listed in INSTALLED_APPS', true],
        ['The model needs a migrations/ folder by hand', false],
        ['makemigrations only works after migrate', false],
        ['Models must be declared in config/models.py', false],
      ], 'Django only looks for models in installed apps, so an unlisted app is invisible to makemigrations. startapp already created migrations/, and migrate is run after makemigrations, not before.'),
      mcq('In the catalogue AppConfig, what is ready() the right place for?', [
        ['Connecting signal handlers once at startup', true],
        ['Seeding categories into the database on boot', false],
        ['Declaring the app’s URL patterns for include()', false],
        ['Choosing which database the models should use', false],
      ], 'ready() runs once when the app registry is loaded, so importing a signals module there connects the handlers exactly once. Django warns against database queries in ready(): they run on every management command, including migrate.'),
    ],
    checkpoint: [
      mcq('A rate-limit middleware sits third in MIDDLEWARE and returns HttpResponse(status=429) without calling get_response. Which code runs for that request?', [
        ['The first two middleware, in and out', true],
        ['Every middleware, but not the view', false],
        ['The view, then the 429 replaces it', false],
        ['Only the rate-limit middleware itself, nothing else', false],
      ], 'Returning early stops the request going further in, so later middleware and the view never run. The two outer layers called get_response and receive the 429 on the way out.'),
      mcq('After swapping SessionMiddleware and AuthenticationMiddleware in MIDDLEWARE, every request fails. Why?', [
        ['Authentication reads request.session, which is not set yet', true],
        ['Django sorts MIDDLEWARE itself and rejects any manual reordering', false],
        ['The session cookie is only created by the security layer', false],
        ['The CSRF layer now runs after the view has finished', false],
      ], 'AuthenticationMiddleware loads request.user from the session, so SessionMiddleware must run first; Django raises ImproperlyConfigured saying exactly that. The list order is respected as written.'),
      mcq('Which statement about a Django project and its apps is accurate?', [
        ['One settings module and URLconf; each app owns a feature', true],
        ['Each app has its own settings.py file and its own database', false],
        ['An app is a project that runs on a separate port', false],
        ['manage.py is created once inside every app folder', false],
      ], 'The project holds the single settings module, root URLconf and deployment entry points. Apps are packages inside it that each own models, views and URLs for one job; manage.py lives at the project root.'),
    ],
  },

  /* ── URLS_VIEWS ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_CORE_URLS_VIEWS',
    notes: `A **view** takes an \`HttpRequest\` and returns an \`HttpResponse\`. A **URLconf** maps paths to
views. Everything else in this unit is detail on those two sentences.

## path() and converters

    from django.urls import path
    from . import views

    app_name = "catalogue"                    # the namespace for reverse()

    urlpatterns = [
        path("courses/", views.course_list, name="course-list"),
        path("courses/count/", views.CourseCountView.as_view(), name="course-count"),
        path("courses/<slug:slug>/", views.course_detail, name="course-detail"),
        path("categories/<int:pk>/", views.category_detail, name="category-detail"),
    ]

Patterns have **no leading slash** and conventionally **end with one**. A **path converter** both
matches and converts the captured part, which is passed to the view as a keyword argument:

| Converter | Matches | View receives |
|---|---|---|
| \`str\` (default) | anything except \`/\` | \`str\` |
| \`int\` | \`0\` or a positive integer | \`int\` (\`007\` → \`7\`) |
| \`slug\` | letters, digits, \`-\`, \`_\` | \`str\` |
| \`uuid\` | a formatted UUID | \`uuid.UUID\` |
| \`path\` | anything, including \`/\` | \`str\` |

\`<int:pk>\` does not match \`-5\` or \`abc\`, so a bad id never reaches your view — the resolver tries the
next pattern and finally returns 404. (\`re_path()\` exists for full regular expressions; you rarely
need it.)

**Order matters.** Patterns are tried top to bottom, first match wins. If
\`courses/<slug:slug>/\` came before \`courses/count/\`, the slug pattern would capture \`"count"\` and
the count view would never run — we ran exactly this and got a 404 from \`get_object_or_404\`. Put
fixed paths before patterns that could swallow them.

## include() and namespaces

The project URLconf delegates whole prefixes to apps:

    # config/urls.py
    from django.contrib import admin
    from django.urls import include, path

    urlpatterns = [
        path("admin/", admin.site.urls),
        path("api/", include("catalogue.urls")),     # catalogue paths live under /api/
    ]

\`include()\` strips the matched prefix and hands the rest to the app's \`urlpatterns\`. With
\`app_name = "catalogue"\` in the app's \`urls.py\`, its names live in the \`catalogue\` namespace.

## reverse(): never hard-code a URL

    from django.urls import reverse

    reverse("catalogue:course-detail", kwargs={"slug": "django-basics"})
    # '/api/courses/django-basics/'
    reverse("catalogue:course-list")
    # '/api/courses/'

Change \`"api/"\` to \`"api/v1/"\` in one place and every \`reverse()\` follows. Mistakes raise
\`NoReverseMatch\`: \`reverse("course-detail", ...)\` without the namespace is "not a valid view
function or pattern name"; \`reverse("catalogue:category-detail", args=["abc"])\` reports the pattern
it tried, because \`abc\` does not fit \`<int:pk>\`. In templates the same thing is
\`{% url 'catalogue:course-detail' slug=course.slug %}\`, and \`redirect("catalogue:course-list")\`
reverses for you.

## Function-based views

    import json
    from django.http import JsonResponse
    from django.shortcuts import get_object_or_404
    from django.views.decorators.http import require_GET, require_http_methods
    from .models import Course

    @require_GET
    def course_list(request):
        courses = Course.objects.filter(is_published=True).order_by("title")
        data = [{"id": c.id, "title": c.title, "fee": c.fee} for c in courses]
        return JsonResponse(data, safe=False)

    @require_GET
    def course_detail(request, slug):
        course = get_object_or_404(Course, slug=slug, is_published=True)
        return JsonResponse({"id": course.id, "title": course.title, "fee": course.fee})

What the request gives you:

- \`request.method\` — \`"GET"\`, \`"POST"\`, …
- \`request.GET\` — the query string as a \`QueryDict\`: \`request.GET.get("page", "1")\` (always a
  string), \`request.GET.getlist("tag")\` for \`?tag=a&tag=b\`
- \`request.POST\` — form-encoded bodies only; for JSON, \`json.loads(request.body)\`
- \`request.headers["Authorization"]\`, \`request.user\` (after the auth middleware)

\`@require_http_methods(["GET", "POST"])\` answers any other method with **405** and an \`Allow\`
header.

## JsonResponse and safe=False

\`JsonResponse(data)\` serialises with \`DjangoJSONEncoder\` (which turns \`Decimal("4999.00")\` into
\`"4999.00"\`, and dates into ISO strings) and sets \`Content-Type: application/json\`. By default it
only accepts a **dict**:

    JsonResponse([1, 2])
    TypeError: In order to allow non-dict objects to be serialized set the safe parameter to False.

Pass \`safe=False\` to return a list. The guard is historical — very old browsers let a page steal a
top-level JSON array through a script tag — but it is a common interview question, and many APIs
wrap lists anyway: \`{"results": [...], "count": 12}\` leaves room for paging metadata later.

## get_object_or_404

\`get_object_or_404(Course, slug=slug)\` runs \`Course.objects.get(...)\` and turns
\`Course.DoesNotExist\` into \`Http404\`, which Django renders as a 404 response. It accepts a queryset
too — \`get_object_or_404(Course.objects.filter(is_published=True), slug=slug)\` — so drafts are 404
to the public. (\`get_list_or_404\` is the list version; an empty list is a 404.) Without it, a bad
slug raises \`DoesNotExist\` and the client gets a 500.

## Class-based views

A class-based view (CBV) puts each HTTP method in its own method. \`View.as_view()\` returns the actual
function the URLconf needs; on each request it creates a **new instance** and calls \`dispatch()\`,
which picks \`get()\`, \`post()\`, … by \`request.method\`:

    from django.views import View
    from django.views.generic import TemplateView

    class CourseCountView(View):
        def get(self, request):
            return JsonResponse({"count": Course.objects.filter(is_published=True).count()})

    class AboutView(TemplateView):
        template_name = "catalogue/about.html"

        def get_context_data(self, **kwargs):
            context = super().get_context_data(**kwargs)
            context["course_total"] = Course.objects.count()
            return context

    # urls.py
    path("courses/count/", CourseCountView.as_view(), name="course-count"),
    path("about/", AboutView.as_view(), name="about"),
    path("terms/", TemplateView.as_view(template_name="terms.html")),

A method the class does not define gets **405** automatically (a POST to \`CourseCountView\` returns
405 with \`Allow: GET, HEAD, OPTIONS\`). \`as_view()\` only accepts keywords that are already class
attributes — a typo such as \`template_nam=\` raises \`TypeError\` at import time, which is a gift.

**FBV or CBV?** A function is explicit and easy to read for one-off endpoints. Classes win when
behaviour is shared through inheritance and mixins — which is exactly how Django REST Framework's
\`APIView\`, generic views and ViewSets are built, later in this track.

## Returning other responses

    HttpResponse("plain text", status=201, content_type="text/plain")
    JsonResponse({"error": "seats must be positive"}, status=400)
    redirect("catalogue:course-detail", slug=course.slug)     # 302

APPEND_SLASH (on by default, via \`CommonMiddleware\`) redirects \`GET /api/courses\` to
\`/api/courses/\` with a 301. It cannot do that for a POST without losing the body, so with
\`DEBUG = True\` a POST to a slash-less URL raises a \`RuntimeError\` that tells you to fix the URL.`,
    workedExample: `**Problem:** expose the catalogue as JSON: a list of published courses, a detail by
slug, a count, and a list per category — with names, not hard-coded paths.

**catalogue/views.py**

    from django.http import JsonResponse
    from django.shortcuts import get_object_or_404
    from django.views import View
    from django.views.decorators.http import require_GET
    from .models import Category, Course

    def course_to_dict(c):
        return {"id": c.id, "title": c.title, "slug": c.slug, "fee": c.fee}

    @require_GET
    def course_list(request):
        qs = Course.objects.filter(is_published=True).order_by("title")
        return JsonResponse({"results": [course_to_dict(c) for c in qs]})

    @require_GET
    def course_detail(request, slug):
        course = get_object_or_404(Course, slug=slug, is_published=True)
        return JsonResponse(course_to_dict(course))

    @require_GET
    def category_courses(request, pk):
        category = get_object_or_404(Category, pk=pk)
        qs = category.courses.filter(is_published=True)
        return JsonResponse([course_to_dict(c) for c in qs], safe=False)

    class CourseCountView(View):
        def get(self, request):
            return JsonResponse({"count": Course.objects.filter(is_published=True).count()})

**catalogue/urls.py**

    from django.urls import path
    from . import views

    app_name = "catalogue"
    urlpatterns = [
        path("courses/", views.course_list, name="course-list"),
        path("courses/count/", views.CourseCountView.as_view(), name="course-count"),
        path("courses/<slug:slug>/", views.course_detail, name="course-detail"),
        path("categories/<int:pk>/courses/", views.category_courses, name="category-courses"),
    ]

**Check it** in \`python manage.py shell\`:

    >>> from django.test import Client
    >>> from django.urls import reverse
    >>> c = Client()
    >>> c.get(reverse("catalogue:course-detail", kwargs={"slug": "django-basics"})).json()
    {'id': 1, 'title': 'Django Basics', 'slug': 'django-basics', 'fee': '4999.00'}
    >>> c.get("/api/courses/draft/").status_code
    404
    >>> c.get("/api/courses/count/").json()
    {'count': 1}

(If the shell answers 400, add \`"testserver"\` to \`ALLOWED_HOSTS\` for the session — the test client
uses that host name.)

**Notes on the choices:** the list wraps results in a dict (room for \`count\` and \`next\` later);
\`category_courses\` returns a bare list to show \`safe=False\`; \`count/\` sits above the slug pattern so
it is not captured as a slug; \`fee\` arrives as the string \`"4999.00"\` because Decimal must not be
turned into a float for money.`,
    mcqs: [
      mcq('urlpatterns has path("books/<slug:slug>/", book_detail) above path("books/new/", new_book). What happens on GET /books/new/?', [
        ['book_detail runs with slug="new"', true],
        ['new_book runs, as fixed paths win', false],
        ['Django raises an ambiguous-URL error', false],
        ['Both views run, in the listed order', false],
      ], 'The resolver tries patterns top to bottom and stops at the first match; "new" is a valid slug, so book_detail handles it. Fixed paths must be listed before patterns that could capture them.'),
      mcq('A view ends with return JsonResponse(list(Course.objects.values("id", "title"))). What happens when it is called?', [
        ['TypeError, because the data is a list and safe is True', true],
        ['A JSON array, since a values() queryset is always serialisable', false],
        ['A JSON object keyed by each course id', false],
        ['An empty 204 response with no body', false],
      ], 'JsonResponse rejects anything but a dict unless safe=False is passed. The fix is safe=False, or wrapping the list as {"results": [...]}.'),
      mcq('With app_name = "catalogue" and path("courses/<int:pk>/", ..., name="course-detail") included under "api/", what does reverse("catalogue:course-detail", args=[5]) return?', [
        ['"/api/courses/5/"', true],
        ['"courses/5/"', false],
        ['"/catalogue/courses/5/"', false],
        ['"/api/catalogue:course-detail/5/"', false],
      ], 'reverse builds the full path, including the "api/" prefix from include() and a leading slash. The namespace selects the URLconf; it is not part of the path.'),
    ],
    checkpoint: [
      mcq('class StatsView(View) defines only get(). What does a POST to its URL return?', [
        ['405 Method Not Allowed', true],
        ['200 with the get() output', false],
        ['404, as no route accepts POST', false],
        ['500 from a missing post()', false],
      ], 'View.dispatch looks for a method named after request.method and calls http_method_not_allowed when it is missing, which returns 405 with an Allow header listing the defined methods.'),
      mcq('course_detail calls Course.objects.get(slug=slug) directly. A client requests a slug that does not exist. What does it get with DEBUG off?', [
        ['A 500 error, from the uncaught DoesNotExist', true],
        ['A 404, since Django maps missing rows itself', false],
        ['A 200 with an empty JSON body', false],
        ['A 400, since the slug failed validation', false],
      ], 'DoesNotExist is an ordinary exception, so it becomes a server error. get_object_or_404 exists to turn it into Http404.'),
      mcq('path("orders/<int:pk>/", order_detail) receives GET /orders/0042/. What is pk inside the view?', [
        ['The integer 42', true],
        ['The string "0042"', false],
        ['The integer 0042 is a 404', false],
        ['The string "42"', false],
      ], 'The int converter matches the digits and converts them with int(), so leading zeros disappear and the view receives 42 as an int.'),
    ],
  },

  /* ── TEMPLATES_FORMS ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_CORE_TEMPLATES_FORMS',
    notes: `This track's frontend is **React**, which calls the Django API for JSON. So why learn
templates and forms at all? Because you will meet them: the admin is built from them, many company
codebases render server-side pages, password-reset emails are templates, and Django REST Framework's
serializers are modelled on Django forms. Learn to **read and adjust** them; you will not build the
product UI with them.

## Templates

A template is text with **variables** \`{{ }}\` and **tags** \`{% %}\`. With \`APP_DIRS: True\` in
\`TEMPLATES\`, Django finds \`catalogue/templates/catalogue/course_list.html\` as
\`"catalogue/course_list.html"\` (the repeated folder name avoids clashes between apps).

    {% extends "base.html" %}
    {% block content %}
      <h1>Courses</h1>
      <ul>
        {% for course in courses %}
          <li>
            <a href="{% url 'catalogue:course-detail' slug=course.slug %}">{{ course.title }}</a>
            — ₹{{ course.fee|floatformat:2 }}
          </li>
        {% empty %}
          <li>No courses yet.</li>
        {% endfor %}
      </ul>
      <p>{{ courses|length }} course{{ courses|length|pluralize }}</p>
    {% endblock %}

    # the view
    from django.shortcuts import render

    def course_page(request):
        courses = Course.objects.filter(is_published=True)
        return render(request, "catalogue/course_list.html", {"courses": courses})

Things to know when reading one:

- **Dots** look up dict keys, attributes and list indexes: \`{{ course.category.name }}\`. A missing
  variable renders as an empty string — silently, by design.
- **Filters** transform: \`|default:"n/a"\`, \`|date:"d M Y"\`, \`|truncatechars:40\`, \`|upper\`.
- **Auto-escaping** is on: a title of \`<b>Hi</b>\` renders as \`&lt;b&gt;Hi&lt;/b&gt;\`, which is what
  stops stored XSS. \`|safe\` turns it off for one value — use it only on HTML you produced yourself.
- **Inheritance**: \`base.html\` declares \`{% block content %}{% endblock %}\`, children fill it.
- \`{% csrf_token %}\` must appear inside every POST form; \`CsrfViewMiddleware\` rejects the POST with
  403 otherwise.

## Forms

A **form** declares fields, turns submitted strings into Python values, and validates them:

    from django import forms

    class EnquiryForm(forms.Form):
        name = forms.CharField(max_length=50)
        email = forms.EmailField()
        seats = forms.IntegerField(min_value=1, max_value=5)

        def clean_name(self):                       # per-field cleaning: clean_<field>
            return self.cleaned_data["name"].strip().title()

    form = EnquiryForm({"name": " asha rao ", "email": "bad", "seats": "3"})
    form.is_valid()      # False
    form.errors          # {'email': ['Enter a valid email address.']}
    form.cleaned_data    # {'name': 'Asha Rao', 'seats': 3}  — only the valid fields

Note \`seats\` arrived as the string \`"3"\` and left as the integer \`3\`: **cleaning converts**.
\`cleaned_data\` exists only after \`is_valid()\` and holds only fields that passed. For cross-field
rules, override \`clean()\` and raise \`forms.ValidationError\`.

A **ModelForm** builds its fields from a model:

    class CourseForm(forms.ModelForm):
        class Meta:
            model = Course
            fields = ["title", "category", "fee"]     # list them; never "__all__" on public forms

    form = CourseForm(request.POST)
    if form.is_valid():
        course = form.save()                          # INSERT, with model validation applied

The classic view pattern:

    def enquiry(request):
        form = EnquiryForm(request.POST or None)
        if request.method == "POST" and form.is_valid():
            Enquiry.objects.create(**form.cleaned_data)
            return redirect("catalogue:thanks")       # Post/Redirect/Get: no resubmit on refresh
        return render(request, "catalogue/enquiry.html", {"form": form})

## Why this track serves JSON instead

| Server-rendered templates | Django API + React |
|---|---|
| Django builds every page's HTML | Django returns JSON; React builds the UI |
| One codebase, simple to deploy | Two apps, one contract (the API) |
| Every interaction is a page load | Rich, fast interactions in the browser |
| Only a browser can use it | The same API serves web, mobile and other services |
| Forms validate input | DRF serializers validate input — same idea |

Templates still fit internal tools, emails and simple sites. The skills carry over: a DRF
serializer has fields, \`validate_<field>\` methods and \`.errors\`, just like a form.`,
    mcqs: [
      mcq('A course title stored as <script>alert(1)</script> is shown with {{ course.title }} in a template. What reaches the browser?', [
        ['The text escaped as &lt;script&gt;…, so no script runs', true],
        ['The script tag itself, which runs as soon as the page loads', false],
        ['An empty string, as Django strips tags by default', false],
        ['A TemplateSyntaxError raised during rendering', false],
      ], 'Auto-escaping converts < > & and quotes to entities, so the title displays as text. Only |safe or {% autoescape off %} would let the tag through.'),
      mcq('form = EnquiryForm({"name": "Asha", "seats": "2"}) where seats is an IntegerField and email is required. After form.is_valid(), what is form.cleaned_data["seats"]?', [
        ['The integer 2', true],
        ['The string "2"', false],
        ['A KeyError, since the form is invalid', false],
        ['None, since validation stopped early', false],
      ], 'Each valid field is cleaned and converted even when another field (the missing email) fails, so seats is in cleaned_data as an int. Only the invalid field is left out.'),
      mcq('Why does the catalogue in this track return JSON from Django instead of rendering templates?', [
        ['React builds the UI and one API can serve any client', true],
        ['Django templates cannot loop over a queryset of model objects', false],
        ['Templates are deprecated as of Django 5.0', false],
        ['JSON responses skip the request–response cycle', false],
      ], 'The architecture splits the UI (React) from the data (a JSON API), and the API can also serve mobile apps and other services. Templates are fully supported and loop over querysets fine.'),
    ],
    checkpoint: [
      mcq('A template uses {{ course.instructor.name }} but the context course has no instructor attribute. What is rendered?', [
        ['An empty string', true],
        ['The text "None"', false],
        ['An AttributeError page', false],
        ['The literal variable', false],
      ], 'Django templates fail silently on missing variables and render the string_if_invalid setting, which is empty by default. That is why a typo in a template shows nothing rather than an error.'),
      mcq('A POST form template omits {% csrf_token %}, and CsrfViewMiddleware is enabled. What does submitting it return?', [
        ['403 Forbidden, CSRF verification failed', true],
        ['200, as the token is only advisory in Django', false],
        ['302 back to the form with an error', false],
        ['400, as the form failed is_valid()', false],
      ], 'The middleware rejects an unsafe-method request with no valid token before the view runs, returning 403. The view and its form validation never execute.'),
      mcq('In a ModelForm for Course, why list fields explicitly rather than using fields = "__all__"?', [
        ['A new model field must not become editable by surprise', true],
        ['"__all__" is rejected by Django when the form is saved', false],
        ['Explicit lists make the form validate input much faster', false],
        ['"__all__" includes the primary key as a required field', false],
      ], 'With "__all__", adding a field such as is_featured to the model silently makes it settable by whoever submits the form — mass assignment. An explicit list keeps the exposed fields a deliberate choice.'),
    ],
  },

  /* ── ADMIN ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_CORE_ADMIN',
    notes: `The **Django admin** is a complete, permission-aware back office generated from your models:
list pages with search and filters, add/edit forms, delete confirmations and a change history. For
the catalogue it means staff can manage categories and courses on day one without anyone writing a
screen. It is a **staff tool**, not the product: customers never see it, and you do not bend it into
a public UI.

## The models it will manage

    # catalogue/models.py
    from django.db import models

    class Category(models.Model):
        name = models.CharField(max_length=80, unique=True)
        slug = models.SlugField(unique=True)

        class Meta:
            verbose_name_plural = "categories"
            ordering = ["name"]

        def __str__(self):
            return self.name

    class Course(models.Model):
        category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="courses")
        title = models.CharField(max_length=150)
        slug = models.SlugField(unique=True)
        fee = models.DecimalField(max_digits=8, decimal_places=2)
        is_published = models.BooleanField(default=False)
        created_at = models.DateTimeField(auto_now_add=True)

        def __str__(self):
            return self.title

\`__str__\` matters: it is what the admin shows in lists, dropdowns and the history. Without it you get
"Course object (7)". (Models and migrations get a full topic next; here run
\`python manage.py makemigrations\` and \`python manage.py migrate\`.)

## Register with a ModelAdmin

    # catalogue/admin.py
    from django.contrib import admin
    from .models import Category, Course

    @admin.register(Category)
    class CategoryAdmin(admin.ModelAdmin):
        list_display = ["name", "slug"]
        prepopulated_fields = {"slug": ("name",)}     # fills the slug as you type the name
        search_fields = ["name"]

    @admin.register(Course)
    class CourseAdmin(admin.ModelAdmin):
        list_display = ["title", "category", "fee", "is_published", "created_at"]
        list_filter = ["is_published", "category"]
        search_fields = ["title", "category__name"]
        list_editable = ["is_published"]
        list_select_related = ["category"]            # one JOIN instead of a query per row
        readonly_fields = ["created_at"]
        ordering = ["-created_at"]
        actions = ["publish"]

        @admin.action(description="Publish selected courses")
        def publish(self, request, queryset):
            updated = queryset.update(is_published=True)
            self.message_user(request, f"{updated} course(s) published.")

What each option does:

| Option | Effect |
|---|---|
| \`list_display\` | columns on the list page — fields, model methods, or ModelAdmin methods |
| \`list_filter\` | the right-hand filter sidebar (booleans, choices, foreign keys, dates) |
| \`search_fields\` | the search box; \`category__name\` follows the relation |
| \`list_editable\` | edit these columns in place on the list page |
| \`readonly_fields\` | shown on the form but not editable |
| \`prepopulated_fields\` | JavaScript slug filling from other fields |
| \`list_select_related\` | avoid an extra query per row for foreign-key columns |
| \`actions\` | bulk operations on selected rows |

\`search_fields = ["category"]\` passes \`check\` but fails on the first search with
\`FieldError: Unsupported lookup 'icontains' for ForeignKey\` — search a text field across the relation
(\`category__name\`), never the foreign key itself.

## The system checks catch the typos

Mistakes in a ModelAdmin are reported by \`python manage.py check\` (and by \`runserver\` at startup):

    (admin.E108) The value of 'list_display[3]' refers to 'published', which is not a callable
                 or attribute of 'CourseAdmin', or an attribute, method, or field on 'catalogue.Course'.
    (admin.E122) The value of 'list_editable[0]' refers to 'is_published', which is not
                 contained in 'list_display'.
    (admin.E124) The value of 'list_editable[0]' refers to the first field in 'list_display'
                 ('title'), which cannot be used unless 'list_display_links' is set.
    (admin.E112) The value of 'list_filter' must be a list or tuple.

The last one is the classic \`list_filter = ("is_published")\` — parentheses without a comma make a
string, not a tuple.

## Who can get in: staff, permissions and superusers

    python manage.py createsuperuser

Three flags on the \`User\` decide admin access (we checked each case):

- **\`is_active = False\`** — cannot log in at all.
- **\`is_staff = False\`** — can log in to the site but \`/admin/\` redirects to the admin login. The
  admin is for staff only.
- **\`is_staff = True\`, no permissions** — gets into \`/admin/\` and sees "You don't have permission to
  view or edit anything." Opening \`/admin/catalogue/course/\` returns **403**.
- **Staff with \`catalogue.view_course\`** — can see courses, but not edit them or see categories.
  Django creates \`add_\`, \`change_\`, \`delete_\` and \`view_\` permissions for every model; grant them to
  users or, better, to **groups** ("Catalogue editors").
- **\`is_superuser = True\`** — every permission, implicitly. Keep superusers to one or two people.

## Locking it down

- Change the URL from \`admin/\` to something not guessable; bots scan \`/admin/\` all day.
- Give staff **groups with the least permissions** they need, not superuser.
- Serve it only over HTTPS; consider restricting it by IP or VPN at the proxy.
- Strong passwords (Django's \`AUTH_PASSWORD_VALIDATORS\`), and 2FA via a package if exposed publicly.
- Use \`readonly_fields\` for audit columns, and \`has_delete_permission\` returning \`False\` where rows
  must never be deleted from a screen.

\`admin.site.site_header = "CodeBegun Catalogue"\` and \`site_title\` brand it.`,
    mcqs: [
      mcq('CourseAdmin has list_display = ["title", "fee"] and list_editable = ["is_published"]. What does manage.py check report?', [
        ['admin.E122: is_published is not in list_display', true],
        ['admin.E108: is_published is not a field on Course', false],
        ['Nothing; list_editable adds its own columns', false],
        ['admin.E124: is_published is the first column', false],
      ], 'A field can only be edited in place if it is shown as a column, so list_editable must be a subset of list_display. is_published is a real field, so E108 does not apply.'),
      mcq('A trainer\'s account has is_staff=True, is_superuser=False and no permissions or groups. What happens when they open /admin/catalogue/course/?', [
        ['403 Forbidden', true],
        ['The course list, read-only', false],
        ['A redirect to the login page', false],
        ['The full list, with edit rights', false],
      ], 'is_staff only lets a user into the admin; each model page also needs at least the view permission. A redirect to login is what a non-staff user gets.'),
      mcq('Why does the course admin declare list_select_related = ["category"]?', [
        ['The category column costs one JOIN, not a query per row', true],
        ['Without it, the category column cannot be displayed', false],
        ['It allows search_fields to follow the category relation', false],
        ['It makes the category dropdown load in alphabetical order', false],
      ], 'Showing category for each course otherwise triggers a separate query per row (N+1). The column and the category__name search both work without it; ordering of the dropdown comes from Category.Meta.'),
    ],
    checkpoint: [
      mcq('A developer writes list_filter = ("is_published") in CourseAdmin. What does manage.py check say?', [
        ['admin.E112: list_filter must be a list or tuple', true],
        ['Nothing, and the filter sidebar works as written', false],
        ['admin.E108: is_published is not a known field', false],
        ['Nothing, but the sidebar shows one letter per row', false],
      ], 'Parentheses alone do not make a tuple, so list_filter is the string "is_published", and the check rejects it. ("is_published",) or a list fixes it.'),
      mcq('The admin search box for courses should match category names. Which search_fields works?', [
        ['["title", "category__name"]', true],
        ['["title", "category"]', false],
        ['["title", "category.name"]', false],
        ['["title", "category_set__name"]', false],
      ], 'Lookups follow relations with a double underscore. Searching the foreign key itself raises FieldError on the first search, dotted paths are not lookup syntax, and category_set is a reverse-relation name that Course does not have.'),
      mcq('What is the safest way to let five content editors change courses in the admin?', [
        ['A group with change_course and view_course, staff flags on', true],
        ['Make all five superusers so they never hit a 403 page', false],
        ['Share one staff login that has every model permission', false],
        ['Set is_staff on each with no permissions, as it implies edit', false],
      ], 'A group gives each person only the permissions the job needs and keeps individual logins for the history. Superuser grants everything; is_staff alone grants nothing beyond entry.'),
    ],
  },

  /* ── SETTINGS_ENV ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_CORE_SETTINGS_ENV',
    notes: `\`startproject\` gives you one \`settings.py\` with a hard-coded \`SECRET_KEY\`, \`DEBUG = True\`,
\`ALLOWED_HOSTS = []\` and SQLite. That is fine for the first hour and wrong for everything after:
production needs different values, and secrets must never be in Git. The rule (the "twelve-factor"
rule): **code is the same everywhere; configuration comes from the environment**.

## The three settings that matter most

**\`SECRET_KEY\`** signs sessions, password-reset tokens, CSRF tokens and anything using
\`django.core.signing\`. Leaked, it lets an attacker forge those. It must be long, random, different
per environment, and read from the environment:

    python -c "from django.core.management.utils import get_random_secret_key as g; print(g())"

**\`DEBUG\`** shows full tracebacks, local variables and settings to anyone who triggers an error. It
must be \`False\` in production. With \`DEBUG = False\`, Django also stops serving static files itself.

**\`ALLOWED_HOSTS\`** lists the host names this site answers to; a request with any other \`Host\` header
gets **400 Bad Request** (\`DisallowedHost\`). It protects against Host-header attacks such as poisoned
password-reset links. With \`DEBUG = False\` and an empty list, Django refuses to start:

    CommandError: You must set settings.ALLOWED_HOSTS if DEBUG is False.

## Reading the environment

    import os
    from pathlib import Path

    BASE_DIR = Path(__file__).resolve().parent.parent

    SECRET_KEY = os.environ["DJANGO_SECRET_KEY"]                 # KeyError at startup if missing
    DEBUG = os.environ.get("DJANGO_DEBUG", "False") == "True"   # never bool(os.environ[...])
    ALLOWED_HOSTS = [h for h in os.environ.get("DJANGO_ALLOWED_HOSTS", "").split(",") if h]

Watch the classic bug: \`bool("False")\` is \`True\` — every non-empty string is truthy — so
\`DEBUG = bool(os.environ.get("DJANGO_DEBUG"))\` turns debug **on** in production. Compare strings, or
use a library.

**django-environ** (\`pip install django-environ\`) parses types and reads a \`.env\` file in
development:

    import environ

    env = environ.Env(DEBUG=(bool, False))            # type and default
    environ.Env.read_env(BASE_DIR / ".env")           # values already set in the environment win

    SECRET_KEY = env("SECRET_KEY")
    DEBUG = env("DEBUG")
    ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=[])
    DATABASES = {"default": env.db("DATABASE_URL")}   # mysql://user:pass@host:3306/catalogue

\`.env\` goes in \`.gitignore\`; commit a \`.env.example\` with the variable names and dummy values.
(\`python-dotenv\` plus \`os.environ\` is the lighter alternative.)

## Splitting settings per environment

    config/settings/
        __init__.py
        base.py         # everything shared: INSTALLED_APPS, MIDDLEWARE, TEMPLATES, DATABASES from env
        dev.py          # from .base import *; DEBUG = True; console email; debug toolbar
        prod.py         # from .base import *; DEBUG = False; security settings; logging

    # config/settings/prod.py
    from .base import *  # noqa: F401,F403

    DEBUG = False
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 3600            # raise once HTTPS is proven

Choose with \`DJANGO_SETTINGS_MODULE=config.settings.prod\` (and update the default in \`manage.py\`,
\`wsgi.py\` and \`asgi.py\` after moving the file — \`BASE_DIR\` also gains one more \`.parent\`). Many
teams use a single settings file driven entirely by environment variables instead; either is fine,
as long as no secret lives in code.

\`python manage.py check --deploy\` lists what production still lacks. On a fresh project with
\`DEBUG = False\` it warns about HSTS, SSL redirect, the \`django-insecure-\` key, insecure cookies and
the empty \`ALLOWED_HOSTS\` (\`security.W004\`, \`W008\`, \`W009\`, \`W012\`, \`W016\`, \`W020\`).

## Static files vs media files

| | Static files | Media files |
|---|---|---|
| What | CSS, JS, images that ship **with the code** | files **users upload** (course thumbnails) |
| Settings | \`STATIC_URL\`, \`STATIC_ROOT\`, \`STATICFILES_DIRS\` | \`MEDIA_URL\`, \`MEDIA_ROOT\` |
| In Git? | Yes (source) | Never |
| Production | \`collectstatic\` → served by the web server, WhiteNoise or a CDN | object storage (S3) or a served folder |

    STATIC_URL = "static/"
    STATIC_ROOT = BASE_DIR / "staticfiles"          # where collectstatic copies everything
    MEDIA_URL = "media/"
    MEDIA_ROOT = BASE_DIR / "media"

\`python manage.py collectstatic\` copies every app's \`static/\` folder (including the admin's CSS and
JS) into \`STATIC_ROOT\`. Without \`STATIC_ROOT\` it stops with \`ImproperlyConfigured: You're using the
staticfiles app without having set the STATIC_ROOT setting\`. A common production symptom — the admin
appears unstyled — means \`DEBUG\` is off and nobody serves \`STATIC_ROOT\`: add WhiteNoise's middleware
right after \`SecurityMiddleware\`, or configure the web server.

In development only, serve uploads with
\`urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)\` (it does nothing when
\`DEBUG\` is off). An \`ImageField\` needs Pillow installed.

## MySQL

    pip install mysqlclient          # Django's recommended MySQL driver (C extension)

    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.mysql",
            "NAME": os.environ.get("DB_NAME", "catalogue"),
            "USER": os.environ["DB_USER"],
            "PASSWORD": os.environ["DB_PASSWORD"],
            "HOST": os.environ.get("DB_HOST", "127.0.0.1"),
            "PORT": os.environ.get("DB_PORT", "3306"),
            "OPTIONS": {
                "charset": "utf8mb4",
                "init_command": "SET sql_mode='STRICT_TRANS_TABLES'",
            },
            "CONN_MAX_AGE": 60,       # keep a connection open for reuse (0 = close per request)
        }
    }

Create the database with a full-Unicode character set first:

    CREATE DATABASE catalogue CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

- **utf8mb4** is real UTF-8 (up to 4 bytes per character: emoji, many CJK characters). MySQL's old
  \`utf8\` is \`utf8mb3\`, which rejects them. Django 5.2 connects with \`utf8mb4\` by default; on 4.2
  set \`"charset": "utf8mb4"\` yourself — and either way the **database and tables** must be created
  with it, because the connection charset does not convert existing columns.
- **Strict mode** makes MySQL reject a too-long string or an invalid value instead of silently
  truncating it with a warning. Django's check \`mysql.W002\` warns when it is off.
- Django 5.x supports MySQL 8.0.11+ and needs mysqlclient 1.4.3+. On Windows, if mysqlclient fails to
  install, use a recent wheel version or PyMySQL with \`pymysql.install_as_MySQLdb()\` in development.

Run \`python manage.py migrate\` and \`python manage.py dbshell\` to confirm the connection.`,
    mcqs: [
      mcq('settings.py has DEBUG = bool(os.environ.get("DJANGO_DEBUG")), and production sets DJANGO_DEBUG=False. What is DEBUG in production?', [
        ['True, since the string "False" is truthy', true],
        ['False, as bool() parses the word False', false],
        ['None, as bool() cannot read a string', false],
        ['A ValueError raised at startup time', false],
      ], 'bool() of any non-empty string is True, so debug is switched on — tracebacks and settings exposed to visitors. Compare the string, or use env.bool / django-environ.'),
      mcq('Production runs with DEBUG = False and ALLOWED_HOSTS = ["api.codebegun.com"]. A request arrives with Host: 13.235.10.4. What is returned?', [
        ['400 Bad Request (DisallowedHost)', true],
        ['200, as the IP belongs to the server', false],
        ['301 to https://api.codebegun.com', false],
        ['403 Forbidden from CsrfViewMiddleware', false],
      ], 'Django compares the Host header with ALLOWED_HOSTS and rejects anything not listed with a 400, whatever IP the server has. Add the IP only if clients genuinely use it.'),
      mcq('After deploying with DEBUG = False, the admin pages load but have no CSS. What is the most likely cause?', [
        ['Nothing serves STATIC_ROOT once DEBUG is off', true],
        ['The admin app was removed from INSTALLED_APPS', false],
        ['MEDIA_ROOT must point at the admin CSS folder', false],
        ['ALLOWED_HOSTS blocks requests for .css files', false],
      ], 'runserver serves static files only in debug mode. In production, run collectstatic and serve STATIC_ROOT through WhiteNoise, the web server or a CDN. Media is for uploads, not the admin assets.'),
    ],
    checkpoint: [
      mcq('A Django 4.2 project on MySQL saves a course review containing an emoji and gets "Incorrect string value". The table was created with utf8. What fixes it?', [
        ['Convert the table to utf8mb4 and set charset utf8mb4', true],
        ['Encode the review as ASCII before calling save()', false],
        ['Set CONN_MAX_AGE to zero so each request reconnects', false],
        ['Turn on DEBUG so Django can convert the characters', false],
      ], 'MySQL utf8 is utf8mb3, which cannot store 4-byte characters such as emoji. Both the column and the connection must use utf8mb4; on 4.2 the connection default is not utf8mb4.'),
      mcq('Which pair belongs in media files rather than static files?', [
        ['Thumbnails that instructors upload for their courses', true],
        ['The admin CSS and JS files shipped with Django itself', false],
        ['The site logo kept in the repository under static/', false],
        ['A compiled stylesheet produced by the frontend build', false],
      ], 'Media is user-uploaded content stored under MEDIA_ROOT and never committed. Everything that ships with the code is static and is gathered by collectstatic.'),
      mcq('A team splits settings into base.py, dev.py and prod.py. How does a production server choose prod.py?', [
        ['DJANGO_SETTINGS_MODULE=config.settings.prod', true],
        ['Django picks prod.py whenever DEBUG is False', false],
        ['manage.py --prod imports the file at startup', false],
        ['base.py imports prod.py when HOSTNAME is set', false],
      ], 'Django loads whatever module DJANGO_SETTINGS_MODULE names, so the environment selects the file. There is no automatic choice by DEBUG and no --prod flag.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_CORE_DEBUGGING',
    notes: `Most early Django bugs are configuration, not logic, and Django names them precisely. Read
the last line of the traceback, then the setting or file it points to. \`python manage.py check\`
finds many of them without a single request.

## 1. The app is not installed

    RuntimeError: Model class catalogue.models.Course doesn't declare an explicit app_label
    and isn't in an application in INSTALLED_APPS.

Or, more quietly, \`makemigrations\` says "No changes detected" and the admin shows nothing.
**Cause:** \`startapp\` created the folder but nobody added it to \`INSTALLED_APPS\`. **Fix:** add
\`"catalogue"\`.

## 2. A pattern swallows a fixed path

    path("courses/<slug:slug>/", views.course_detail),
    path("courses/count/", views.CourseCountView.as_view()),

\`GET /api/courses/count/\` returns 404 with "No Course matches the given query." **Cause:**
\`"count"\` is a valid slug and the first match wins, so \`course_detail\` looked for a course called
count. **Fix:** list fixed paths first.

## 3. NoReverseMatch

    NoReverseMatch: Reverse for 'course-detail' not found. 'course-detail' is not a valid
    view function or pattern name.

**Causes, in order of likelihood:** the namespace is missing (\`"catalogue:course-detail"\`); the
\`name=\` in \`urls.py\` is spelled differently; the arguments do not fit the converter (a slug passed to
\`<int:pk>\` — the message then lists the pattern it tried). Read the message: it says which.

## 4. JsonResponse with a list

    TypeError: In order to allow non-dict objects to be serialized set the safe parameter to False.

**Cause:** \`JsonResponse(list_of_dicts)\`. **Fix:** \`safe=False\`, or wrap it:
\`{"results": list_of_dicts}\`. A related one — \`TypeError: Object of type Course is not JSON
serializable\` — means a model instance went into the data; convert it to a dict first.

## 5. A missing row becomes a 500

\`Course.objects.get(slug=slug)\` with an unknown slug raises \`Course.DoesNotExist\`; in production the
client sees **500**, and your error tracker fills up. **Fix:** \`get_object_or_404(Course, slug=slug)\`.

## 6. POST to a URL without the trailing slash

    RuntimeError: You called this URL via POST, but the URL doesn't end in a slash and you have
    APPEND_SLASH set. Django can't redirect to the slash URL while maintaining POST data.

**Cause:** the frontend posts to \`/api/courses\`. With \`DEBUG\` off it is worse: a 301 redirect, and
the browser re-sends it as a GET, so the data vanishes. **Fix:** post to \`/api/courses/\` — build URLs
with the trailing slash everywhere.

## 7. Middleware in the wrong order

    ImproperlyConfigured: The Django authentication middleware requires session middleware
    to be installed. Edit your MIDDLEWARE setting to insert '...SessionMiddleware' before
    '...AuthenticationMiddleware'.

**Cause:** someone reordered or appended middleware. **Fix:** restore the default order; add new
middleware where its documentation says (CORS high, WhiteNoise right after \`SecurityMiddleware\`).

## 8. Production-only failures

- \`CommandError: You must set settings.ALLOWED_HOSTS if DEBUG is False.\` — set it from the
  environment.
- Every request returns **400** after deploying — the domain is missing from \`ALLOWED_HOSTS\`.
- The admin is unstyled — \`DEBUG\` is off and \`STATIC_ROOT\` is not served; run \`collectstatic\` and
  configure WhiteNoise or the web server.
- \`ImproperlyConfigured: ... STATIC_ROOT\` from \`collectstatic\` — set \`STATIC_ROOT\`.
- \`django.db.utils.OperationalError: (1045, "Access denied for user ...")\` — wrong \`DB_USER\`/\`DB_PASSWORD\`
  in the environment, or the variables are not exported to the process that runs Django.
- \`KeyError: 'DJANGO_SECRET_KEY'\` at startup — the variable is not set; that is the fail-fast design
  working, not a bug to hide with a default.

## The admin's own errors

\`manage.py check\` reports \`admin.E108\` (a \`list_display\` entry that is not a field or method),
\`admin.E122\` (\`list_editable\` not in \`list_display\`), \`admin.E124\` (\`list_editable\` on the first
column) and \`admin.E112\` (\`list_filter = ("x")\` is a string). Run \`check\` before \`runserver\`.`,
    mcqs: [
      mcq('GET /api/courses/count/ returns 404 "No Course matches the given query." The count view exists and is routed. What is the most likely cause?', [
        ['A slug pattern above it captures "count" first', true],
        ['The count view is missing its @require_GET', false],
        ['The include() prefix must not end with a slash', false],
        ['as_view() was called without parentheses here', false],
      ], 'The message comes from get_object_or_404 in the detail view, which means the slug pattern matched first. Moving the fixed path above it fixes the routing.'),
      mcq('The React app posts JSON to /api/enquiries (no slash). With DEBUG = False the view receives a GET with no body. Why?', [
        ['APPEND_SLASH redirected with 301, and the client re-sent GET', true],
        ['CsrfViewMiddleware strips the body from all cross-site requests', false],
        ['JsonResponse cannot read a body sent without the slash', false],
        ['ALLOWED_HOSTS converts POST to GET for unknown origins', false],
      ], 'CommonMiddleware redirects slash-less URLs, and browsers follow a 301 for a POST with a GET. With DEBUG on, Django raises a RuntimeError instead so you notice. Post to the slash URL.'),
      mcq('reverse("catalogue:category-detail", args=["web"]) raises NoReverseMatch listing the pattern "api/categories/(?P<pk>[0-9]+)/". What is wrong?', [
        ['The argument does not fit the int converter', true],
        ['The namespace catalogue is not registered', false],
        ['reverse() needs kwargs and never accepts args', false],
        ['The URL name contains a hyphen, which is invalid', false],
      ], 'The name and namespace resolved, which is why a pattern is listed; "web" simply does not match [0-9]+. Pass the category id, or route categories by slug.'),
      mcq('A fresh production deploy crashes at startup with KeyError: \'DJANGO_SECRET_KEY\'. What is the right fix?', [
        ['Set the variable in the server\'s environment', true],
        ['Use os.environ.get with a fixed default key', false],
        ['Commit the development key to prod.py', false],
        ['Catch the KeyError and generate a key', false],
      ], 'The crash is the fail-fast design working. A fixed default or a committed key puts a known secret in production, and a key generated at each start invalidates every session and token on restart.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_CORE_PRACTICE',
    notes: `Work these in one project, \`config\` with a \`catalogue\` app, in a virtual environment with
Django 5.x installed. Start on SQLite; exercise 6 moves it to MySQL. Check each with
\`python manage.py check\`, the browser or the test \`Client\` in \`manage.py shell\`.

## Exercise 1 — Project, app and the cycle

Create the project with \`django-admin startproject config .\` and the \`catalogue\` app. Add a
\`TimingMiddleware\` that sets an \`X-Elapsed-ms\` header. Put it first, then last, in \`MIDDLEWARE\`,
and with logging in each of two middleware classes, write down the order of the "in" and "out" lines
for one request. Then make one of them return a 503 for paths starting \`/maintenance/\` and note
which lines disappear.

## Exercise 2 — URLs and function views

Add \`Category\` and \`Course\` models (name/slug; category, title, slug, fee as Decimal,
is_published). Write \`course_list\`, \`course_detail\` (by slug, published only, with
\`get_object_or_404\`) and \`category_courses\` (by \`<int:pk>\`, returning a bare list). Use
\`app_name\`, \`include()\` under \`api/\`, and names on every path. Confirm: an unknown slug is 404,
\`/api/categories/abc/courses/\` is 404 without reaching the view, and the fee arrives as \`"4999.00"\`.

## Exercise 3 — reverse() everywhere

In the shell, \`reverse()\` every named URL with valid arguments. Then produce each \`NoReverseMatch\`
on purpose — missing namespace, misspelt name, a string for \`<int:pk>\` — and note how each message
differs. Add a \`"url"\` key to each course in the list response, built with \`reverse()\`.

## Exercise 4 — Class-based views

Rewrite \`course_list\` as a \`View\` subclass with \`get()\`, add \`CourseCountView\`, and an
\`AboutView(TemplateView)\` whose \`get_context_data\` adds the course total. Send a POST to the count
view and read the status and \`Allow\` header. Pass a misspelt keyword to \`as_view()\` and read the
error.

## Exercise 5 — The admin

Register both models with \`list_display\`, \`list_filter\`, \`search_fields\` (including the category
name), \`list_editable\` for \`is_published\`, \`prepopulated_fields\` for slugs and a "Publish selected"
action. Create a superuser, then a staff user in a "Catalogue editors" group with only view and
change on courses. Log in as each and record what each can and cannot do. Break \`list_display\`,
\`list_editable\` and \`list_filter\` one at a time and read the check codes.

## Exercise 6 — Settings for two environments

Split settings into \`base.py\`, \`dev.py\` and \`prod.py\`. Read \`SECRET_KEY\`, \`DEBUG\`,
\`ALLOWED_HOSTS\` and the database from environment variables (with a \`.env\` in development,
git-ignored, and a committed \`.env.example\`). Switch to MySQL with \`utf8mb4\` and strict mode, run
\`migrate\`, and save a course title containing an emoji. With \`prod\` settings, run
\`python manage.py check --deploy\` and fix every warning you can, set \`STATIC_ROOT\`, run
\`collectstatic\`, and make the admin styled with \`DEBUG = False\` using WhiteNoise.`,
    mcqs: [
      mcq('In exercise 1, the 503 maintenance middleware is second of three, with timing middleware first. Does the response carry the X-Elapsed-ms header?', [
        ['Yes, the first middleware still wraps the response', true],
        ['No, an early response skips every middleware', false],
        ['No, headers are only added by the view itself', false],
        ['Yes, but only when the view also runs normally', false],
      ], 'The timing middleware called get_response and gets the 503 back on its way out, so it adds the header. Only middleware inside the short-circuit, and the view, are skipped.'),
      mcq('In exercise 2, which request never reaches category_courses at all?', [
        ['GET /api/categories/abc/courses/', true],
        ['GET /api/categories/999/courses/', false],
        ['GET /api/categories/0/courses/', false],
        ['GET /api/categories/007/courses/', false],
      ], 'The int converter matches only digits, so "abc" fails resolution and Django returns 404 without calling the view. 999 reaches the view (and get_object_or_404 may 404), and 0 and 007 are valid ints.'),
      mcq('In exercise 3 each course needs a "url" key. Which line builds it correctly?', [
        ['reverse("catalogue:course-detail", kwargs={"slug": c.slug})', true],
        ['f"/api/courses/{c.slug}/" written into the view by hand', false],
        ['reverse("course-detail", c.slug) without a namespace', false],
        ['reverse("catalogue:course-detail", slug=c.slug)', false],
      ], 'reverse takes the namespaced name and args or kwargs. A hand-built path breaks when the prefix changes, the bare name raises NoReverseMatch under a namespace, and slug= is not a reverse() parameter.'),
      mcq('In exercise 5 the editor (view and change on courses, staff) opens the admin. What do they see?', [
        ['Courses to view and edit, and no categories', true],
        ['Courses and categories, both read-only', false],
        ['Everything, since staff implies full access', false],
        ['A redirect to the admin login page each time', false],
      ], 'Model permissions are checked per model: the group grants view and change on Course only, so Category does not appear. Staff status lets them in; it grants no model access by itself.'),
      mcq('In exercise 6, prod settings use STATIC_ROOT and WhiteNoise. Where should WhiteNoiseMiddleware go?', [
        ['Right after SecurityMiddleware', true],
        ['Last, after XFrameOptionsMiddleware', false],
        ['Before SecurityMiddleware, at the very top', false],
        ['Inside INSTALLED_APPS instead of MIDDLEWARE', false],
      ], 'WhiteNoise documents placing it directly after SecurityMiddleware, so static requests are answered early but still get the security headers. It is middleware, not an app, for this purpose.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_CORE_INTERVIEW_QUESTION',
    notes: `Django fundamentals questions test whether you have run a real project or only followed a
tutorial. Answer with the mechanism, then a concrete case you have met.

## Q1. "Walk me through what happens when a request hits a Django app."

**Model answer.** The application server — Gunicorn or Uvicorn in production — calls Django through
WSGI or ASGI. Django builds an \`HttpRequest\` and passes it down the \`MIDDLEWARE\` list, top to bottom:
security headers, sessions, CSRF, authentication, which sets \`request.user\`. The URL resolver matches
the path against \`ROOT_URLCONF\` in order, converting captured parts with path converters, and calls
the first matching view with them as keyword arguments. The view uses the ORM and returns an
\`HttpResponse\` — for our API usually a \`JsonResponse\`. The response travels back up the middleware
in reverse order and goes out. Any middleware can return early: a rate limiter returning 429 means
the view never runs.

**Follow-ups:** *"Why does middleware order matter?"* — Each depends on what the outer ones did:
authentication needs the session, so \`SessionMiddleware\` must come before
\`AuthenticationMiddleware\`; CORS goes high so even redirects get its headers. *"Where would you add
request timing?"* — In middleware at the top of the list, so it measures everything.

## Q2. "Function-based or class-based views — which do you use, and why?"

**Model answer.** Both are just callables that return a response. A function view is explicit and
easy to read for a one-off endpoint. A class-based view separates methods into \`get\`, \`post\` and so
on, answers unsupported methods with 405 automatically, and shares behaviour through inheritance and
mixins. \`as_view()\` turns the class into a function, creating a fresh instance per request, so
instance attributes never leak between requests. For APIs I use Django REST Framework's class-based
views and ViewSets, because pagination, permissions and serialisation come from mixins; for a small
health check, a function is clearer.

**Follow-ups:** *"Why can't you return a list from JsonResponse?"* — \`safe=True\` by default only
allows dicts, a guard against an old JSON-array hijacking attack; pass \`safe=False\` or wrap the list.
*"What does get_object_or_404 do?"* — Turns \`DoesNotExist\` into \`Http404\`, so a missing row is a 404,
not a 500.

## Q3. "How do you configure Django differently for development and production?"

**Model answer.** The code is the same; configuration comes from environment variables. I either
split settings into \`base\`, \`dev\` and \`prod\` modules selected by \`DJANGO_SETTINGS_MODULE\`, or keep
one file that reads everything with django-environ. \`SECRET_KEY\` and database credentials come only
from the environment, never Git. In production \`DEBUG\` is \`False\`, \`ALLOWED_HOSTS\` lists the real
domains, cookies are secure, HTTPS is forced, and I run \`check --deploy\`. Static files are gathered
with \`collectstatic\` and served by WhiteNoise or the web server; uploads go to media storage. On
MySQL I use \`utf8mb4\` for the database and connection, and strict mode.

**Follow-ups:** *"What happens if DEBUG is True in production?"* — Error pages expose code, local
variables and settings to anyone. *"What does ALLOWED_HOSTS protect against?"* — Host-header attacks,
such as password-reset links pointing at an attacker's domain; requests with other hosts get 400.

## How you are judged

Order of middleware, why \`safe=False\` exists, \`bool("False")\`, why the admin is unstyled in
production: specific, real details show you have deployed something. Reciting "Django is an MVT
framework" does not.`,
    mcqs: [
      mcq('An interviewer asks why a class-based view\'s instance attributes do not leak between two users\' requests. What is the right answer?', [
        ['as_view() makes a new instance for every request', true],
        ['Django runs every request in a separate process', false],
        ['The class is reloaded from disk on each request', false],
        ['Instance attributes are cleared by middleware', false],
      ], 'The function returned by as_view() constructs the view class afresh for each request and calls dispatch on it. Class-level mutable attributes, however, are shared — keep request state on self.'),
      mcq('Asked "what does ALLOWED_HOSTS protect against?", which answer is accurate?', [
        ['Forged Host headers, such as poisoned reset links', true],
        ['Requests from IP addresses that are not trusted', false],
        ['Browsers on other origins calling the JSON API', false],
        ['Cross-site form posts that lack a CSRF token', false],
      ], 'Django builds absolute URLs from the Host header, so an attacker-supplied host could end up in emails. ALLOWED_HOSTS rejects unknown hosts with 400. CORS and CSRF are separate mechanisms.'),
      mcq('An interviewer asks where a request-timing middleware should go to measure the most time. What is the best answer?', [
        ['First in MIDDLEWARE, so it wraps all the others', true],
        ['Last in MIDDLEWARE, so it is closest to the view', false],
        ['Inside the view, as the first and last lines', false],
        ['In urls.py, wrapped around each path() entry', false],
      ], 'The first middleware is the outermost layer: its start time comes before every other middleware and its end after them. Last in the list would only time the view.'),
    ],
  },

  /* ── MINI_PROJECT ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_CORE_MINI_PROJECT',
    notes: `# A Course Catalogue with the Django Admin

Build the first version of CodeBegun's course catalogue: a Django 5.x project on MySQL 8 where staff
manage categories and courses in the admin, and the public reads published courses as JSON. The
Django REST Framework topic later replaces the JSON views with a full API, and React consumes it, so
keep the structure clean.

## Models (\`catalogue\` app)

- **Category**: \`name\` (unique), \`slug\` (unique), \`description\` (optional). \`__str__\` returns the name.
- **Course**: \`category\` (FK, \`on_delete=PROTECT\`, \`related_name="courses"\`), \`title\`, \`slug\`
  (unique), \`summary\`, \`fee\` (\`DecimalField(max_digits=8, decimal_places=2)\`), \`level\` (choices:
  beginner / intermediate / advanced), \`duration_weeks\` (positive integer), \`is_published\`
  (default \`False\`), \`created_at\` and \`updated_at\` (auto). \`__str__\` returns the title.

## The admin

- **CourseAdmin**: \`list_display\` with title, category, level, fee, is_published, updated_at;
  \`list_filter\` on is_published, level and category; \`search_fields\` on title, summary and category
  name; \`list_editable\` for is_published; \`prepopulated_fields\` for slug; \`readonly_fields\` for the
  timestamps; \`list_select_related\`; "Publish selected" and "Unpublish selected" actions.
- **CategoryAdmin**: name and slug columns, a course-count column (a ModelAdmin method), slug
  prepopulated, search by name.
- A **"Catalogue editors"** group with view/add/change on courses and view on categories; one editor
  account in it; one superuser. Admin served at a non-default path from an environment variable.
- Branded \`site_header\` and \`site_title\`.

## JSON endpoints (\`/api/\`, namespace \`catalogue\`)

| Method and path | Returns |
|---|---|
| \`GET /api/categories/\` | \`{"results": [...]}\` with id, name, slug, published course count |
| \`GET /api/categories/<slug>/courses/\` | that category's **published** courses, or 404 |
| \`GET /api/courses/\` | published courses; optional \`?level=\` filter; \`{"results": [...]}\` |
| \`GET /api/courses/<slug>/\` | one published course, or 404 (drafts are 404 too) |
| \`GET /api/health/\` | \`{"status": "ok"}\` — a class-based view |

Every course item includes a \`url\` built with \`reverse()\`. Fees are strings (\`"4999.00"\`). Any
other method gets 405. At least one view is class-based.

## Settings

- \`config/settings/base.py\`, \`dev.py\`, \`prod.py\`; \`DJANGO_SETTINGS_MODULE\` chooses.
- \`SECRET_KEY\`, \`DEBUG\`, \`ALLOWED_HOSTS\`, the database and the admin path from the environment
  (django-environ or \`os.environ\`), \`.env\` git-ignored, \`.env.example\` committed.
- MySQL with \`ENGINE django.db.backends.mysql\`, \`utf8mb4\` and strict mode; the database created
  with \`utf8mb4\`.
- \`STATIC_ROOT\` set, \`collectstatic\` working, WhiteNoise serving static files with \`DEBUG = False\`;
  \`MEDIA_ROOT\` set for a later course thumbnail.
- A request-logging middleware that logs method, path, status and time.

## Acceptance criteria

- \`python manage.py check\` is clean; \`check --deploy\` with prod settings has no warnings you could fix.
- A draft course is invisible at \`/api/courses/<slug>/\` (404) and in the lists, but visible in the admin.
- \`/api/courses/count\`-style fixed paths are not captured by the slug pattern.
- A category with courses cannot be deleted (PROTECT) — the admin shows why.
- The editor can edit courses but cannot see the Users page or delete categories; a staff user with
  no group sees "You don't have permission to view or edit anything."
- A course title with an emoji saves and reads back correctly from MySQL.
- With prod settings and \`DEBUG = False\`, an unknown host gets 400 and the admin is styled.
- No secret appears anywhere in the repository history.`,
    mcqs: [
      mcq('In the catalogue, a draft course must be 404 on the public detail endpoint but editable in the admin. Which view code achieves that?', [
        ['get_object_or_404(Course, slug=slug, is_published=True)', true],
        ['Course.objects.get(slug=slug) and a check in the template', false],
        ['get_object_or_404(Course, slug=slug), then an empty dict', false],
        ['A list_filter on is_published in CourseAdmin', false],
      ], 'Filtering on is_published in the lookup makes drafts indistinguishable from missing rows, so the public gets 404, while the admin queries all courses. list_filter only affects the admin sidebar.'),
      mcq('The brief asks for Category deletion to be refused while it has courses. Which model choice delivers that?', [
        ['on_delete=models.PROTECT on Course.category', true],
        ['on_delete=models.CASCADE on Course.category', false],
        ['on_delete=models.SET_NULL with null=True', false],
        ['unique=True on the Category.slug field', false],
      ], 'PROTECT raises ProtectedError when a referenced category is deleted, and the admin shows the blocking courses. CASCADE would delete the courses; SET_NULL would orphan them.'),
    ],
    assignment: {
      title: 'A Course Catalogue with the Django Admin',
      description: 'A Django 5.x project on MySQL 8: a catalogue app with categories and courses, a locked-down admin for staff, JSON endpoints for published courses, and settings split for development and production with every secret in the environment.',
      instructions: `Build the project described in this unit's brief and submit it as a repository link or a zip.

**Submit:**

1. The project (\`config\` with split settings, the \`catalogue\` app with models, migrations, admin,
   views, urls and middleware), \`requirements.txt\` pinning Django, mysqlclient and any
   environment/static packages, and \`.env.example\`.
2. A README with: how to create the MySQL database (with \`utf8mb4\`), set the environment and run in
   development; and how to run with prod settings.
3. Evidence: screenshots of the admin course list (filters, search, editable column, actions) as the
   superuser and as the editor, and the "no permission" page for a staff user without a group.
4. Terminal or browser output for each JSON endpoint, a draft course returning 404, a POST returning
   405, and an unknown host returning 400 under prod settings.
5. The output of \`python manage.py check --deploy\` with prod settings, with one line on any warning
   you left and why.

**Before you submit, check every acceptance criterion in the brief by running it**, not by reading
your code.`,
      rubric: [
        { criterion: 'Models and admin', description: 'Models match the brief with __str__, PROTECT and choices; both ModelAdmins use list_display, list_filter, search_fields across the relation, list_editable, prepopulated and read-only fields, list_select_related and working bulk actions; check is clean.', maxPoints: 25 },
        { criterion: 'URLs and views', description: 'Namespaced URLs with include(), converters and correct ordering; reverse() for every url field; get_object_or_404 hides drafts; JSON shapes and status codes (404, 405) as specified; at least one class-based view.', maxPoints: 25 },
        { criterion: 'Settings and secrets', description: 'Split settings selected by DJANGO_SETTINGS_MODULE; SECRET_KEY, DEBUG, ALLOWED_HOSTS, database and admin path from the environment with correct boolean parsing; no secret in the repository; check --deploy addressed.', maxPoints: 20 },
        { criterion: 'MySQL, static and media', description: 'MySQL backend with utf8mb4 and strict mode, emoji round-trip shown; STATIC_ROOT and collectstatic working with WhiteNoise when DEBUG is off; MEDIA_ROOT configured.', maxPoints: 15 },
        { criterion: 'Access control and evidence', description: 'Editors group with least privilege, editor and no-group staff behave as specified, admin at a non-default path; README and evidence complete and matching the running project.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_CORE_CHECKPOINT',
    notes: `Ten questions on Django fundamentals as a backend interview examines them: the
request–response cycle and middleware, URLs, converters and reverse(), function and class-based
views, JsonResponse, the admin and its permissions, and settings for production on MySQL. Read each
snippet for what Django actually does with it.`,
    checkpoint: [
      mcq('MIDDLEWARE is [Security, Session, Common, Csrf, Auth, Logging]. A view raises no error. In which order do the response halves of Logging and Security run?', [
        ['Logging first, then Security', true],
        ['Security first, then Logging', false],
        ['Both run at the same moment', false],
        ['Only Security sees the response', false],
      ], 'Responses travel back up the list, so the innermost layer (Logging, last) handles the response first and the outermost (Security) last.'),
      mcq('With path("api/", include("shop.urls")) and, in shop/urls.py, app_name = "shop" and path("items/<uuid:id>/", item, name="item"), which call reverses successfully?', [
        ['reverse("shop:item", kwargs={"id": uuid.uuid4()})', true],
        ['reverse("item", kwargs={"id": uuid.uuid4()})', false],
        ['reverse("shop:item", kwargs={"id": 42})', false],
        ['reverse("api:shop:item", kwargs={"id": uuid.uuid4()})', false],
      ], 'The name lives in the shop namespace and the value must fit the uuid converter. The bare name fails because the name is namespaced, the "api" prefix is a path not a namespace, and 42 does not match the UUID pattern.'),
      mcq('def tags(request): return JsonResponse(["python", "django"], safe=False). What does the client receive?', [
        ['A 200 with the JSON array ["python", "django"]', true],
        ['A 500, since lists are never allowed in JSON', false],
        ['A JSON object {"0": "python", "1": "django"}', false],
        ['A 200 with the Python repr of the list', false],
      ], 'safe=False lifts the dict-only guard, so the list is encoded as a JSON array with application/json. Without it, the call raises TypeError.'),
      mcq('TemplateView.as_view(template_nme="home.html") is in urls.py. When does the mistake show up?', [
        ['At import of urls.py, as a TypeError', true],
        ['On the first request, as a 404 page', false],
        ['Never; unknown keywords are ignored', false],
        ['On render, as TemplateDoesNotExist', false],
      ], 'as_view() only accepts keywords that are existing class attributes and raises TypeError immediately, so the server fails to load the URLconf rather than failing later.'),
      mcq('A view does request.GET.get("page") for /api/courses/?page=3. What type is the value?', [
        ['str, the text "3"', true],
        ['int, the number 3', false],
        ['list, ["3"]', false],
        ['None until parsed', false],
      ], 'QueryDict values are always strings; get returns the last value for the key. Convert with int() and handle ValueError, or use getlist for repeated keys.'),
      mcq('CourseAdmin has list_display = ["title", "is_published"] and list_editable = ["title"]. What does check report?', [
        ['admin.E124, as title is the first column and the link', true],
        ['admin.E122, as title is not in list_display', false],
        ['Nothing; the title becomes an editable text box', false],
        ['admin.E108, as title is not a field on Course', false],
      ], 'The first list_display column links to the change page, so it cannot also be editable unless list_display_links names another column. title is in list_display and is a real field.'),
      mcq('A user has is_staff=False and is_superuser=True. What happens when they open /admin/?', [
        ['Redirected to the admin login page', true],
        ['Full admin access as a superuser', false],
        ['The admin index with no models', false],
        ['A 500 error from conflicting flags', false],
      ], 'The admin requires is_staff before checking any permission; superuser grants every permission but not staff status. createsuperuser sets both flags, which is why this case is rare.'),
      mcq('prod.py sets DEBUG = False and ALLOWED_HOSTS = []. What happens when the server is started with these settings?', [
        ['Startup fails, saying ALLOWED_HOSTS must be set', true],
        ['It starts and accepts requests on any host', false],
        ['It starts and accepts only localhost requests', false],
        ['It starts with DEBUG forced back to True', false],
      ], 'With DEBUG off, an empty ALLOWED_HOSTS would reject every request, so runserver refuses to start with a CommandError. In DEBUG mode Django allows localhost names when the list is empty.'),
      mcq('Which DATABASES entry is right for this track\'s MySQL catalogue?', [
        ['ENGINE django.db.backends.mysql, charset utf8mb4', true],
        ['ENGINE django.db.backends.pymysql, charset utf8mb4', false],
        ['ENGINE mysql, charset latin1, strict mode off', false],
        ['ENGINE django.db.backends.mysql, charset utf8', false],
      ], 'The built-in backend is django.db.backends.mysql (used with mysqlclient), and utf8mb4 stores every Unicode character. MySQL utf8 is utf8mb3; there is no pymysql backend module.'),
      mcq('A colleague runs collectstatic in production and gets ImproperlyConfigured about STATIC_ROOT. What should they add?', [
        ['STATIC_ROOT = BASE_DIR / "staticfiles"', true],
        ['STATIC_URL = "/static/" in prod.py', false],
        ['MEDIA_ROOT = BASE_DIR / "media"', false],
        ['"django.contrib.admin" to the apps', false],
      ], 'collectstatic needs a destination folder, which is STATIC_ROOT. STATIC_URL is the public prefix, already set by startproject, and media settings are for uploads.'),
    ],
  },
];
