import { SeedBook } from '../types';

/**
 * Python Full Stack + AI track: the technical questions a fresher applying for a
 * Python full-stack role is asked. Python 3, Django + DRF, FastAPI, MySQL, React.
 */
const book: SeedBook = {
  slug: 'track-python-fullstack',
  title: 'Python Full Stack + AI Interview Questions',
  kind: 'topic',
  subject: 'Python Full Stack + AI',
  description: `40 Python full-stack interview questions: Python for web work, Django and DRF, FastAPI and MySQL, React integration, deployment, GenAI and agents, and project scenarios.`,
  color: '#15803d',
  emblem: '🐍',
  audience: 'careerpilot',
  stages: ['specialize', 'placement'],
  tracks: ['PY_FULLSTACK_AI'],
  order: 201,
  chapters: [
    {
      title: `Python and DSA for web developers`,
      questions: [
        {
          q: `What are type hints in Python? Why do FastAPI and Pydantic depend on them?`,
          a: `**Type hints** (Python 3.5+) annotate the expected types of variables, parameters and return values. Python itself does **not** enforce them at runtime; tools like mypy and your editor use them to catch mistakes and give autocompletion.

\`\`\`python
def total_price(prices: list[float], discount: float = 0.0) -> float:
    return sum(prices) * (1 - discount)

user_id: int | None = None   # Python 3.10+ union syntax
\`\`\`

**FastAPI and Pydantic read the hints at runtime** and turn them into behaviour:
- a parameter \`item_id: int\` is parsed from the URL and converted to \`int\`, and a value like \`"abc"\` returns a **422** validation error automatically;
- a Pydantic model's fields become the JSON schema for request validation;
- the same hints generate the interactive OpenAPI docs at \`/docs\`.

So in FastAPI, type hints are not just documentation — they are your validation and API contract. In Django, hints are optional but still help readability and tooling.`,
          d: 'easy',
          at: 'Product companies, startups',
        },
        {
          q: `How are decorators used in web frameworks? Write a simple login-required decorator.`,
          a: `A **decorator** is a function that takes a function and returns a new function that adds behaviour before or after it. Web frameworks use them everywhere: \`@app.get("/")\` in FastAPI registers a route, \`@login_required\` and \`@api_view\` in Django wrap views.

\`\`\`python
from functools import wraps
from django.http import JsonResponse

def login_required_json(view_func):
    @wraps(view_func)                 # keeps the original name and docstring
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({"detail": "Login required"}, status=401)
        return view_func(request, *args, **kwargs)
    return wrapper

@login_required_json
def my_orders(request):
    ...
\`\`\`

Explain:
- \`@login_required_json\` is shorthand for \`my_orders = login_required_json(my_orders)\`;
- \`*args, **kwargs\` pass through whatever the view receives;
- \`functools.wraps\` matters because frameworks and debugging tools rely on the function's name.

Django already ships \`django.contrib.auth.decorators.login_required\` (it redirects to the login page); writing one shows you understand how it works.`,
          d: 'medium',
        },
        {
          q: `What is a context manager? Write one that manages a database transaction.`,
          a: `A **context manager** sets something up when a \`with\` block starts and always cleans up when it ends — even if an exception is raised. Files, locks and database connections are typical uses.

\`\`\`python
from contextlib import contextmanager

@contextmanager
def transaction(conn):
    cursor = conn.cursor()
    try:
        yield cursor          # the body of the with-block runs here
        conn.commit()
    except Exception:
        conn.rollback()
        raise                 # don't hide the error
    finally:
        cursor.close()

with transaction(conn) as cur:
    cur.execute("UPDATE accounts SET balance = balance - %s WHERE id = %s", (500, 1))
    cur.execute("UPDATE accounts SET balance = balance + %s WHERE id = %s", (500, 2))
\`\`\`

If either update fails, both are rolled back. The class-based form implements \`__enter__\` and \`__exit__\`.

Frameworks give you ready-made ones: Django's \`transaction.atomic()\` works as a context manager or decorator, and SQLAlchemy sessions support \`with Session(engine) as session:\`.`,
          d: 'medium',
        },
        {
          q: `What is the difference between a dict, a dataclass and a Pydantic model for holding data?`,
          a: `- **dict** — flexible, no fixed shape. Typos in keys (\`user["emial"]\`) fail only at runtime, and editors cannot help. Fine for quick, local data.
- **dataclass** (\`@dataclass\`, standard library) — a class with named, typed fields; generates \`__init__\`, \`__repr__\` and \`__eq__\`. Types are **not validated**: \`User(age="ten")\` is accepted.
- **Pydantic model** — like a dataclass but **validates and converts** data at runtime, and can parse/produce JSON. Ideal at the boundaries of your app: API requests, config, LLM structured output.

\`\`\`python
from dataclasses import dataclass
from pydantic import BaseModel, EmailStr

@dataclass
class Point:
    x: int
    y: int

class SignupRequest(BaseModel):
    email: EmailStr          # needs the email-validator extra
    age: int

SignupRequest(email="a@b.com", age="21")   # age converted to 21
SignupRequest(email="bad", age=21)         # raises ValidationError
\`\`\`

Rule of thumb: Pydantic for untrusted input from outside, dataclasses for internal data, dicts for small throwaway structures.`,
          d: 'easy',
        },
        {
          q: `Explain the GIL. When would you use threading, multiprocessing or asyncio in a web backend?`,
          a: `The **GIL (Global Interpreter Lock)** in CPython lets only one thread run Python bytecode at a time. So threads do not speed up **CPU-bound** work, but they still help **I/O-bound** work, because a thread waiting on the network or disk releases the GIL. (Python 3.13 added an experimental free-threaded build without the GIL, but the standard build still has it.)

| Tool | Best for | Example in a backend |
|---|---|---|
| \`threading\` / thread pool | Blocking I/O with sync libraries | Calling several REST APIs at once with \`requests\` |
| \`multiprocessing\` | CPU-heavy work | Image resizing, PDF generation, ML preprocessing |
| \`asyncio\` | Many concurrent I/O tasks in one thread | FastAPI endpoints calling databases and APIs with async libraries |

\`\`\`python
import asyncio, httpx

async def fetch_all(urls: list[str]) -> list[int]:
    async with httpx.AsyncClient(timeout=5) as client:
        responses = await asyncio.gather(*(client.get(u) for u in urls))
    return [r.status_code for r in responses]
\`\`\`

In production, web servers also scale with **multiple worker processes** (Gunicorn/Uvicorn workers), and long CPU jobs go to a task queue such as Celery rather than the request.`,
          d: 'hard',
          at: 'Product companies',
          tip: `Say clearly: "GIL hurts CPU-bound threads, not I/O-bound ones." Most candidates stop at "Python has no real threads".`,
        },
        {
          q: `Why do we use virtual environments? How do you manage project dependencies?`,
          a: `A **virtual environment** is an isolated folder with its own Python interpreter link and installed packages. Each project gets its own versions, so Project A can use Django 4.2 while Project B uses Django 5, without conflicts or touching the system Python.

\`\`\`bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\\Scripts\\activate
pip install django djangorestframework mysqlclient
pip freeze > requirements.txt    # record exact versions
# on another machine / server
pip install -r requirements.txt
\`\`\`

Good practices:
- Never commit \`.venv\` — add it to \`.gitignore\`; commit \`requirements.txt\` instead.
- **Pin versions** so the server installs exactly what you tested.
- Keep dev-only tools (pytest, black) in a separate file such as \`requirements-dev.txt\`.
- Modern tools like **Poetry**, **pipenv** or **uv** manage the environment and a lock file together, with \`pyproject.toml\` describing the project.
- In Docker, the image itself is the isolation, but you still install from the pinned file.`,
          d: 'easy',
          at: 'Service companies, startups',
        },
        {
          q: `Group a list of words into anagrams in Python.`,
          a: `Two words are anagrams if they have the same letters. Sorting the letters gives the same **key** for every anagram, so group words by that key in a dictionary.

\`\`\`python
from collections import defaultdict

def group_anagrams(words: list[str]) -> list[list[str]]:
    groups: defaultdict[str, list[str]] = defaultdict(list)
    for w in words:
        key = "".join(sorted(w))
        groups[key].append(w)
    return list(groups.values())

print(group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]))
# [['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']]
\`\`\`

**Complexity:** for n words of max length k, sorting each word costs O(k log k), so total O(n · k log k) time and O(n · k) space.

**Faster key:** count letters instead of sorting — a tuple of 26 counts — giving O(n · k):
\`\`\`python
key = tuple(w.count(c) for c in "abcdefghijklmnopqrstuvwxyz")  # simple but scans 26 times
\`\`\`
(A single pass filling a list of 26 zeros is the efficient version.)

\`defaultdict(list)\` avoids checking "is the key already there?" on every word.`,
          d: 'medium',
          at: 'Amazon, product companies',
        },
        {
          q: `Find the k most frequent elements in a list.`,
          a: `Count with \`collections.Counter\`, then pick the top k.

\`\`\`python
from collections import Counter
import heapq

def top_k_frequent(nums: list[int], k: int) -> list[int]:
    counts = Counter(nums)
    return [num for num, _ in counts.most_common(k)]

def top_k_heap(nums: list[int], k: int) -> list[int]:
    counts = Counter(nums)
    return heapq.nlargest(k, counts, key=counts.get)

print(top_k_frequent([1, 1, 1, 2, 2, 3], 2))   # [1, 2]
\`\`\`

**Complexity:** counting is O(n). \`most_common(k)\` and \`heapq.nlargest\` use a heap, about O(m log k) for m distinct values — better than sorting everything (O(m log m)) when k is small.

A **bucket sort** version is O(n): make a list of buckets indexed by frequency, place each number in its bucket, then walk from the highest bucket down until you have k numbers.

Web connection: the same idea gives "top 5 most viewed products" — though for data in MySQL you would let the database do \`GROUP BY ... ORDER BY COUNT(*) DESC LIMIT 5\`.`,
          d: 'easy',
        },
      ],
    },
    {
      title: `Django and Django REST Framework`,
      questions: [
        {
          q: `Explain Django's MVT architecture and the request-response flow.`,
          a: `**MVT = Model, View, Template.**
- **Model** — Python classes mapped to database tables through the ORM.
- **View** — a function or class that receives a request, uses models, and returns a response.
- **Template** — HTML with Django template tags, filled with data by the view.

Django's "view" plays the role a *controller* plays in MVC; the template is the MVC "view".

**Request flow:**
1. The request reaches the WSGI/ASGI server (Gunicorn, Uvicorn) and Django.
2. **Middleware** runs (sessions, authentication, CSRF, security).
3. **URL dispatcher** matches the path in \`urls.py\` to a view.
4. The **view** runs, queries **models**, and renders a **template** (or returns JSON).
5. The response goes back through middleware to the client.

\`\`\`python
# urls.py
urlpatterns = [path("books/<int:pk>/", views.book_detail, name="book-detail")]

# views.py
def book_detail(request, pk):
    book = get_object_or_404(Book, pk=pk)
    return render(request, "books/detail.html", {"book": book})
\`\`\`

In a React + DRF project, templates are mostly replaced by JSON responses and React renders the UI.`,
          d: 'easy',
          at: 'TCS, Infosys, service companies',
        },
        {
          q: `How do models and migrations work in Django?`,
          a: `A **model** is a class inheriting \`models.Model\`; each attribute is a column. Django creates an \`id\` primary key automatically.

\`\`\`python
class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)

class Product(models.Model):
    name = models.CharField(max_length=200)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
\`\`\`

**Migrations** are version-controlled files describing schema changes:
\`\`\`bash
python manage.py makemigrations   # compare models with last migration, write a new file
python manage.py migrate          # apply pending migrations to the database
python manage.py showmigrations   # what is applied
python manage.py sqlmigrate shop 0002   # see the SQL
\`\`\`

Points to mention:
- Commit migration files to Git so every environment gets the same schema.
- \`on_delete\` choices: \`CASCADE\`, \`PROTECT\`, \`SET_NULL\` (needs \`null=True\`), and others.
- Use \`DecimalField\`, not \`FloatField\`, for money.
- Data changes can be written as migrations with \`RunPython\`.`,
          d: 'easy',
        },
        {
          q: `What is the difference between select_related and prefetch_related?`,
          a: `Both fix the **N+1 query problem**, where looping over objects triggers one extra query per object.

\`\`\`python
for p in Product.objects.all():      # 1 query
    print(p.category.name)           # +1 query per product
\`\`\`

- **select_related** — for **ForeignKey and OneToOne** (single related object). It does a SQL **JOIN** and gets everything in **one query**.
\`\`\`python
Product.objects.select_related("category")
\`\`\`
- **prefetch_related** — for **reverse ForeignKey and ManyToMany** (many related objects). It runs **one extra query per relation** with \`WHERE id IN (...)\` and joins the results in Python.
\`\`\`python
Category.objects.prefetch_related("products")          # 2 queries total
Order.objects.select_related("customer").prefetch_related("items__product")
\`\`\`

For more control, \`Prefetch("products", queryset=Product.objects.filter(active=True))\` prefetches a filtered set.

**Find the problem first** with django-debug-toolbar or by checking \`len(connection.queries)\` in DEBUG mode. In DRF, nested serializers are a classic source of N+1, so set \`select_related\`/\`prefetch_related\` in the view's \`get_queryset()\`.`,
          d: 'hard',
          at: 'Product companies',
          tip: `Remember: select_related = JOIN for single objects, prefetch_related = separate IN query for many.`,
        },
        {
          q: `What is middleware in Django? Write a simple custom middleware.`,
          a: `**Middleware** is a chain of hooks that process every request before it reaches the view and every response before it leaves. Django's built-ins handle security headers, sessions, CSRF, authentication and messages. Order in the \`MIDDLEWARE\` setting matters: requests pass top to bottom, responses bottom to top.

A middleware that logs how long each request took:

\`\`\`python
import logging, time

logger = logging.getLogger(__name__)

class TimingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response    # called once at startup

    def __call__(self, request):
        start = time.perf_counter()
        response = self.get_response(request)   # runs the rest of the chain + view
        ms = (time.perf_counter() - start) * 1000
        logger.info("%s %s %s %.1fms", request.method, request.path, response.status_code, ms)
        response["X-Response-Time-ms"] = f"{ms:.1f}"
        return response
\`\`\`

Register it in \`settings.py\`: \`MIDDLEWARE = [..., "core.middleware.TimingMiddleware"]\`.

Typical uses: logging, request ids, maintenance mode, tenant detection, adding headers. \`django-cors-headers\` is itself a middleware and must be placed high in the list.`,
          d: 'medium',
        },
        {
          q: `What are serializers in Django REST Framework? How do you validate data with them?`,
          a: `A **serializer** converts model instances to JSON-friendly data (serialization) and validates incoming JSON before turning it into objects (deserialization). \`ModelSerializer\` builds fields from the model automatically.

\`\`\`python
from rest_framework import serializers

class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Product
        fields = ["id", "name", "price", "category", "category_name"]
        read_only_fields = ["id"]

    def validate_price(self, value):          # one field
        if value <= 0:
            raise serializers.ValidationError("Price must be positive.")
        return value

    def validate(self, data):                 # several fields together
        if data.get("name", "").lower() == "test":
            raise serializers.ValidationError("Invalid product name.")
        return data
\`\`\`

In a view:
\`\`\`python
s = ProductSerializer(data=request.data)
s.is_valid(raise_exception=True)   # 400 with field errors if invalid
s.save()                           # calls create() or update()
\`\`\`

Never expose sensitive fields (like password) — list fields explicitly instead of \`"__all__"\`, and use \`write_only=True\` for inputs that must not be returned.`,
          d: 'medium',
          at: 'Product companies, startups',
        },
        {
          q: `Compare APIView, generic views and ViewSets in DRF.`,
          a: `They are levels of abstraction — more automatic as you go down:

- **APIView** — you write \`get\`, \`post\`, etc. yourself. Full control, more code. Good for custom endpoints like "checkout".
- **Generic views** (\`ListCreateAPIView\`, \`RetrieveUpdateDestroyAPIView\`) — set \`queryset\` and \`serializer_class\`; standard behaviour is built in.
- **ViewSet / ModelViewSet** — one class provides list, create, retrieve, update, partial_update and destroy, and a **router** generates the URLs.

\`\`\`python
from rest_framework import viewsets, permissions
from rest_framework.routers import DefaultRouter

class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return Product.objects.select_related("category").order_by("-created_at")

router = DefaultRouter()
router.register("products", ProductViewSet, basename="product")
urlpatterns = router.urls
# /products/  and  /products/{id}/
\`\`\`

Extra endpoints on a ViewSet use \`@action(detail=True, methods=["post"])\`. Choose ModelViewSet for plain CRUD, APIView when the endpoint is a business process rather than a resource.`,
          d: 'medium',
        },
        {
          q: `How do authentication and permissions work in DRF? How would you add JWT?`,
          a: `**Authentication** answers "who are you?"; **permissions** answer "are you allowed?". DRF runs authentication classes first, sets \`request.user\`, then checks permission classes.

Built-in authentication: \`SessionAuthentication\` (cookie, good when Django serves the pages), \`TokenAuthentication\` (one token per user in the database). For a React SPA or mobile app, **JWT** via the \`djangorestframework-simplejwt\` package is common.

\`\`\`python
# settings.py
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
}

# urls.py
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
urlpatterns += [
    path("api/token/", TokenObtainPairView.as_view()),          # returns access + refresh
    path("api/token/refresh/", TokenRefreshView.as_view()),
]
\`\`\`

Custom object-level permission:
\`\`\`python
class IsOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.user == request.user
\`\`\`

Also filter querysets by user (\`Order.objects.filter(user=self.request.user)\`) so one user can never list another's data.`,
          d: 'medium',
          at: 'Product companies',
        },
        {
          q: `QuerySets are lazy — what does that mean? When do you use Q and F objects?`,
          a: `**Lazy** means building a QuerySet does not hit the database. Filters can be chained, and the SQL runs only when results are needed: iterating, \`list()\`, slicing with a step, \`len()\`, \`bool()\`, or printing.

\`\`\`python
qs = Product.objects.filter(active=True)   # no query yet
qs = qs.exclude(stock=0).order_by("price") # still none
for p in qs[:10]: ...                      # one query with LIMIT 10
\`\`\`
Results are cached on the QuerySet, so iterating it twice runs one query — but a new \`.filter()\` creates a new QuerySet and a new query. Use \`.exists()\` and \`.count()\` instead of loading rows just to check.

**Q objects** build OR / NOT conditions:
\`\`\`python
from django.db.models import Q, F
Product.objects.filter(Q(name__icontains="pen") | Q(category__name="Stationery"))
\`\`\`

**F objects** refer to a column's value inside the database — no race condition from reading into Python first:
\`\`\`python
Product.objects.filter(id=5, stock__gt=0).update(stock=F("stock") - 1)
Product.objects.filter(stock__lt=F("reorder_level"))   # compare two columns
\`\`\``,
          d: 'medium',
        },
      ],
    },
    {
      title: `FastAPI, MySQL and data access`,
      questions: [
        {
          q: `What is FastAPI and how is it different from Django?`,
          a: `**FastAPI** is a modern Python framework for building APIs, built on **Starlette** (ASGI web layer) and **Pydantic** (validation). Its main features:
- request validation and serialization from **type hints**;
- automatic interactive docs at \`/docs\` (Swagger UI) and \`/redoc\`;
- native **async** support, so it handles many concurrent I/O-bound requests well;
- dependency injection through \`Depends\`.

\`\`\`python
from fastapi import FastAPI
app = FastAPI()

@app.get("/items/{item_id}")
def read_item(item_id: int, q: str | None = None):
    return {"item_id": item_id, "q": q}
# run: uvicorn main:app --reload
\`\`\`

| | Django (+ DRF) | FastAPI |
|---|---|---|
| Style | "Batteries included" | Minimal, pick your parts |
| ORM, admin, auth | Built in | Choose (SQLAlchemy, SQLModel…) |
| Async | Supported, ORM partly | Designed around it |
| Best for | Full web apps, admin-heavy products | APIs, microservices, ML/AI model serving |

Many teams use both: Django for the main product, FastAPI for a small fast service such as an AI endpoint.`,
          d: 'easy',
          at: 'Startups, product companies',
        },
        {
          q: `How do you validate request bodies and shape responses in FastAPI?`,
          a: `Declare **Pydantic models**. FastAPI parses the JSON body into the input model, validates it (returning **422** with details on failure), and filters the output through \`response_model\`.

\`\`\`python
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field

app = FastAPI()

class ProductIn(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    price: float = Field(gt=0)

class ProductOut(BaseModel):
    id: int
    name: str
    price: float

fake_db: dict[int, ProductOut] = {}

@app.post("/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(body: ProductIn):
    product = ProductOut(id=len(fake_db) + 1, **body.model_dump())
    fake_db[product.id] = product
    return product

@app.get("/products/{product_id}", response_model=ProductOut)
def get_product(product_id: int):
    if product_id not in fake_db:
        raise HTTPException(status_code=404, detail="Product not found")
    return fake_db[product_id]
\`\`\`

Separate input and output models so clients cannot set server fields like \`id\`, and internal fields (password hashes) never leak. \`model_dump()\` is the Pydantic v2 method (v1 used \`.dict()\`).`,
          d: 'medium',
        },
        {
          q: `How does dependency injection work in FastAPI? Show a database session dependency.`,
          a: `A **dependency** is a function FastAPI calls for you before the endpoint, passing its result in. You declare it with \`Depends\`. Dependencies can depend on other dependencies, and a \`yield\` dependency can run cleanup after the response.

\`\`\`python
from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

engine = create_engine("mysql+pymysql://app:secret@localhost/shop", pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine)
app = FastAPI()

def get_db():
    db = SessionLocal()
    try:
        yield db          # value injected into the endpoint
    finally:
        db.close()        # always runs after the request

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user = decode_token_and_load_user(token, db)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user

@app.get("/me/orders")
def my_orders(user=Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(select(Order).where(Order.user_id == user.id)).all()
\`\`\`

(\`oauth2_scheme\`, \`Order\` and the token helper are defined elsewhere.) Benefits: no global state, reusable auth/DB logic, and in tests you replace a dependency with \`app.dependency_overrides[get_db] = fake_db\`.`,
          d: 'medium',
          at: 'Startups, product companies',
        },
        {
          q: `In FastAPI, when should an endpoint be async def and when plain def?`,
          a: `FastAPI treats them differently:
- **\`async def\`** runs on the main **event loop**. While it \`await\`s I/O, the loop serves other requests.
- **plain \`def\`** runs in a **thread pool**, so blocking code inside it does not freeze the server.

**The trap:** calling *blocking* code inside \`async def\` — for example \`requests.get()\`, \`time.sleep()\`, or a synchronous database driver. It blocks the whole event loop, and every other request waits.

\`\`\`python
import httpx, requests

@app.get("/good-async")
async def good_async():
    async with httpx.AsyncClient() as client:      # async library + await
        r = await client.get("https://api.example.com/data")
    return r.json()

@app.get("/good-sync")
def good_sync():
    return requests.get("https://api.example.com/data").json()   # runs in thread pool

@app.get("/bad")
async def bad():
    return requests.get("https://api.example.com/data").json()   # blocks the loop!
\`\`\`

**Rule:** use \`async def\` only if everything slow inside it is awaited with async libraries (httpx, async SQLAlchemy, aiomysql, async LLM clients). Otherwise use \`def\`. CPU-heavy work belongs in a worker process or task queue either way.`,
          d: 'hard',
          at: 'Product companies, AI startups',
          tip: `"Blocking call inside async def freezes the event loop" is the single most-asked FastAPI follow-up.`,
        },
        {
          q: `How do you connect Python to MySQL and run safe queries?`,
          a: `Use a driver such as **mysql-connector-python** (official) or **PyMySQL**, and always pass values as **parameters**, never with f-strings.

\`\`\`python
import os
import mysql.connector

conn = mysql.connector.connect(
    host="localhost", user="shop_app",
    password=os.environ["DB_PASSWORD"], database="shop",
)
cur = conn.cursor(dictionary=True)

email = input("Email: ")
cur.execute("SELECT id, name FROM users WHERE email = %s", (email,))   # parameterised
for row in cur.fetchall():
    print(row["id"], row["name"])

cur.execute("INSERT INTO users (name, email) VALUES (%s, %s)", ("Ravi", "ravi@x.com"))
conn.commit()                 # changes are not saved without commit
print(cur.lastrowid)

cur.close()
conn.close()
\`\`\`

Why parameters: the driver sends values separately and escapes them, so input like \`' OR '1'='1\` stays data — this prevents **SQL injection**. Note the placeholder is \`%s\` for these drivers (not \`?\`), and a single parameter still needs a tuple: \`(email,)\`.

Keep credentials in environment variables, and close cursors and connections (or use \`with\` blocks).`,
          d: 'easy',
          at: 'TCS, Infosys, Wipro',
        },
        {
          q: `What is connection pooling? How do you handle transactions in Python with MySQL?`,
          a: `Opening a database connection is slow (network handshake, authentication). A **pool** keeps a set of open connections and lends them out per request, then takes them back. Without one, a busy API opens and closes connections constantly or runs out of MySQL's connection limit.

- **SQLAlchemy** pools by default: \`create_engine(url, pool_size=10, max_overflow=20, pool_pre_ping=True)\`. \`pool_pre_ping\` checks a connection before use, avoiding "MySQL server has gone away" after idle time.
- **mysql-connector** offers \`mysql.connector.pooling.MySQLConnectionPool\`.
- **Django** keeps connections open per worker with \`CONN_MAX_AGE\`.

**Transactions** group statements so they all succeed or all fail:

\`\`\`python
conn = pool.get_connection()
try:
    cur = conn.cursor()
    cur.execute("UPDATE products SET stock = stock - 1 WHERE id = %s AND stock > 0", (pid,))
    if cur.rowcount == 0:
        raise ValueError("Out of stock")
    cur.execute("INSERT INTO orders (user_id, product_id) VALUES (%s, %s)", (uid, pid))
    conn.commit()
except Exception:
    conn.rollback()
    raise
finally:
    conn.close()      # returns it to the pool
\`\`\`

The table must use **InnoDB** (MySQL's default) for transactions to work.`,
          d: 'medium',
        },
        {
          q: `How do you configure a Django project to use MySQL?`,
          a: `1. Create the database and a user in MySQL:
\`\`\`sql
CREATE DATABASE shop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'shop_app'@'%' IDENTIFIED BY 'strong-password';
GRANT ALL PRIVILEGES ON shop.* TO 'shop_app'@'%';
\`\`\`
2. Install a driver: \`pip install mysqlclient\` (Django's recommended MySQL driver; needs MySQL client libraries to build on some systems).
3. Configure \`settings.py\`, reading secrets from the environment:

\`\`\`python
import os

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": os.environ.get("DB_NAME", "shop"),
        "USER": os.environ.get("DB_USER", "shop_app"),
        "PASSWORD": os.environ["DB_PASSWORD"],
        "HOST": os.environ.get("DB_HOST", "127.0.0.1"),
        "PORT": "3306",
        "OPTIONS": {"charset": "utf8mb4"},
    }
}
\`\`\`
4. Run \`python manage.py migrate\` to create the tables.

Use **utf8mb4** so emojis and all Indian-language characters store correctly (MySQL's old \`utf8\` is only 3 bytes). Give the app user only the privileges it needs in production.`,
          d: 'easy',
        },
        {
          q: `How do you add database indexes in a Django model, and how do you know an index is needed?`,
          a: `An **index** lets MySQL find rows without scanning the whole table — like a book's index. Primary keys, \`unique=True\` fields and ForeignKeys get indexes automatically in Django with MySQL.

Add others for columns you often **filter, join or sort** on:

\`\`\`python
class Order(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)   # indexed automatically
    status = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)
    reference = models.CharField(max_length=30, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "-created_at"]),   # "my orders, newest first"
            models.Index(fields=["status"]),
        ]
\`\`\`
Then \`makemigrations\` and \`migrate\`.

**How to know:** find slow queries (django-debug-toolbar, MySQL slow query log), then run \`EXPLAIN\` on them; \`type: ALL\` means a full table scan. In Django: \`print(Order.objects.filter(status="PAID").explain())\`.

**Trade-off:** indexes speed up reads but slow down inserts/updates and use disk, so don't index everything. Columns with very few distinct values (like a boolean) gain little alone; composite indexes follow the **leftmost-prefix** rule.`,
          d: 'medium',
        },
      ],
    },
    {
      title: `React integration, deployment and GenAI`,
      questions: [
        {
          q: `Your React app gets a CORS error calling the Django API. How do you fix it?`,
          a: `The browser's **same-origin policy** blocks a page on one origin (scheme + host + **port**) from reading responses from another, unless the server sends CORS headers. React on \`localhost:5173\` (Vite) or \`:3000\` and Django on \`:8000\` are different origins. Postman works because it is not a browser.

Use the **django-cors-headers** package:

\`\`\`bash
pip install django-cors-headers
\`\`\`
\`\`\`python
INSTALLED_APPS = [..., "corsheaders"]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",   # as high as possible
    "django.middleware.common.CommonMiddleware",
    ...
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "https://shop.example.com",
]
CORS_ALLOW_CREDENTIALS = True   # only if you send cookies
\`\`\`

Avoid \`CORS_ALLOW_ALL_ORIGINS = True\` in production. If you use cookie/session auth from React, also configure \`CSRF_TRUSTED_ORIGINS\`.

Alternatives: a dev proxy in Vite (\`server.proxy\`), or serving React and the API under one domain via Nginx in production, which removes CORS completely.`,
          d: 'easy',
          at: 'Startups, product companies',
        },
        {
          q: `Describe the JWT login flow between React and DRF. Where should the front end keep the token?`,
          a: `**Flow with simplejwt:**
1. React posts username/password to \`/api/token/\`.
2. DRF returns a short-lived **access** token (minutes) and a longer **refresh** token.
3. React sends \`Authorization: Bearer <access>\` with each API call.
4. When the API returns **401** because the access token expired, React calls \`/api/token/refresh/\` with the refresh token, gets a new access token and retries.
5. Logout discards tokens (and blacklists the refresh token if that app is enabled).

\`\`\`tsx
async function api(path: string, token: string) {
  const res = await fetch(path, { headers: { Authorization: 'Bearer ' + token } });
  if (res.status === 401) throw new Error('expired');   // trigger refresh here
  return res.json();
}
\`\`\`

**Where to store tokens:**
- \`localStorage\` — simple, but any injected script (XSS) can read it.
- **Memory** for the access token + refresh token in an **httpOnly, Secure, SameSite cookie** — JavaScript cannot read the cookie, which limits XSS damage; you then need CSRF care for the refresh endpoint.

For a fresher project, localStorage is acceptable if you explain the XSS risk and how you would harden it.`,
          d: 'medium',
          at: 'Product companies',
          tip: `Naming the XSS trade-off of localStorage matters more than the "right" answer.`,
        },
        {
          q: `How do you deploy a Django + React application to production?`,
          a: `**Django checklist:**
- \`DEBUG = False\`, a real \`SECRET_KEY\` from the environment, and \`ALLOWED_HOSTS\` set.
- Run \`python manage.py check --deploy\` to see security warnings.
- \`python manage.py collectstatic\` and serve static files with Nginx or **WhiteNoise**; media uploads go to object storage (S3) or a served folder.
- Run with a production server — **Gunicorn** (WSGI), or Uvicorn workers for ASGI — never \`runserver\`.
- Apply migrations as a deployment step.

**React:** \`npm run build\` creates static files; serve them from Nginx or a CDN, with a fallback to \`index.html\` for client-side routes.

**Typical layout:**
\`\`\`text
Browser -> Nginx (HTTPS) -> /        React build files
                         -> /api/    Gunicorn -> Django -> MySQL
\`\`\`

\`\`\`bash
gunicorn shop.wsgi:application --workers 3 --bind 0.0.0.0:8000
\`\`\`

Package it with Docker and Docker Compose, or use platforms such as AWS (EC2, Elastic Beanstalk), Render or Railway. Add HTTPS (Let's Encrypt), logging, backups for MySQL, and a CI pipeline (GitHub Actions) that runs tests before deploying.`,
          d: 'medium',
          at: 'Startups, product companies',
        },
        {
          q: `What should a .gitignore contain for a Django + React project, and what do you do if a secret was committed?`,
          a: `Ignore anything generated, machine-specific or secret:

\`\`\`text
# Python / Django
.venv/
__pycache__/
*.pyc
.env
db.sqlite3
media/
staticfiles/

# React
node_modules/
dist/
build/
.env.local

# Editors / OS
.vscode/
.idea/
.DS_Store
\`\`\`

Do commit: source code, \`requirements.txt\`, \`package.json\` and \`package-lock.json\`, migrations, and a \`.env.example\` listing variable *names* without values.

**If a secret (API key, DB password) was committed:**
1. **Revoke/rotate it immediately** at the provider — assume it is already stolen, especially in a public repo.
2. Remove it from the code, move it to an environment variable, and add the file to \`.gitignore\`.
3. Deleting it in a new commit is not enough; it is still in history. Rewrite history with a tool such as \`git filter-repo\` if needed, and force-push only after agreeing with the team.

GitHub's secret scanning and pre-commit hooks help catch this early.`,
          d: 'easy',
        },
        {
          q: `How do you call an LLM API from Python? Show a basic chat call and streaming.`,
          a: `Most providers ship an official Python SDK (OpenAI, Anthropic, Google). The pattern is the same: create a client with an API key from the environment, send a list of messages, read the reply.

\`\`\`python
from openai import OpenAI

client = OpenAI()   # reads OPENAI_API_KEY from the environment

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "You are a helpful assistant for a bookstore. Be brief."},
        {"role": "user", "content": "Suggest two beginner Python books."},
    ],
    temperature=0.3,
)
print(response.choices[0].message.content)

# streaming: print tokens as they arrive
stream = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Explain REST in 3 lines."}],
    stream=True,
)
for chunk in stream:
    if chunk.choices and chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
\`\`\`

In a web app, put this in a Django/FastAPI endpoint — the React app calls your API, never the provider directly, so the key stays secret. In FastAPI use the \`AsyncOpenAI\` client inside \`async def\` endpoints and stream back with \`StreamingResponse\`. Add timeouts, retries and per-user rate limits to control cost.`,
          d: 'medium',
          tip: `Mention that the key never reaches the browser; that is the first security check on any AI feature.`,
        },
        {
          q: `What is RAG? Outline how you would build a "chat with our documents" feature in Python.`,
          a: `**RAG (Retrieval-Augmented Generation)** answers questions from *your* data: retrieve relevant text, put it in the prompt, and let the LLM answer from it.

**Pipeline:**
1. **Load** documents (PDFs, web pages, database rows).
2. **Chunk** them into pieces of a few hundred words, with a little overlap.
3. **Embed** each chunk with an embedding model, giving a vector that represents its meaning.
4. **Store** vectors with the text and metadata in a vector database — Chroma, FAISS, pgvector, Qdrant, etc.
5. **Retrieve:** embed the question and fetch the top-k most similar chunks.
6. **Generate:** prompt the LLM with the question and the chunks, instructing it to answer only from them and cite sources.

\`\`\`python
def answer(question: str) -> str:
    q_vec = embed(question)                         # call embedding model
    chunks = vector_store.search(q_vec, top_k=4)    # similarity search
    context = "\\n\\n".join(c.text for c in chunks)
    prompt = (f"Answer using only the context below. If the answer is not there, "
              f"say you don't know.\\n\\nContext:\\n{context}\\n\\nQuestion: {question}")
    return llm(prompt)
\`\`\`

Frameworks like **LangChain** and **LlamaIndex** provide loaders, splitters and retrievers. Quality depends mostly on chunking, retrieval and good test questions — not on the biggest model. Show source links so users can verify.`,
          d: 'hard',
          at: 'AI startups, product companies',
        },
        {
          q: `What is an AI agent? Show the tool-calling loop in Python.`,
          a: `An **agent** is an LLM that can take **actions** through tools (your functions) in a loop: decide → call a tool → read the result → decide again → final answer. Tool calling is the mechanism: you describe functions with a JSON schema, and the model replies with a structured request to call one.

\`\`\`python
import json
from openai import OpenAI

client = OpenAI()

def get_order_status(order_id: int) -> str:
    return {"42": "Shipped"}.get(str(order_id), "Not found")   # real code: DB + ownership check

tools = [{
    "type": "function",
    "function": {
        "name": "get_order_status",
        "description": "Get the delivery status of an order",
        "parameters": {"type": "object",
                       "properties": {"order_id": {"type": "integer"}},
                       "required": ["order_id"]},
    },
}]

messages = [{"role": "user", "content": "Where is my order 42?"}]
for _ in range(5):                                   # cap the steps
    msg = client.chat.completions.create(
        model="gpt-4o-mini", messages=messages, tools=tools).choices[0].message
    if not msg.tool_calls:
        print(msg.content)
        break
    messages.append(msg)
    for call in msg.tool_calls:
        args = json.loads(call.function.arguments)
        result = get_order_status(**args)
        messages.append({"role": "tool", "tool_call_id": call.id, "content": result})
\`\`\`

Frameworks (LangGraph, OpenAI Agents SDK and others) wrap this loop. Always limit steps, validate arguments, authorise every action for the current user, and ask for human confirmation before anything irreversible.`,
          d: 'hard',
          at: 'AI startups, product companies',
          tip: `Point out the step cap and the ownership check; they show you think about agents failing, not just working.`,
        },
        {
          q: `What are the basics of prompt engineering for an app feature? How do you get reliable JSON from an LLM?`,
          a: `**Prompt basics:**
- A **system message** sets role, rules and tone ("You are a support assistant for X. Answer only about our products.").
- Be **specific**: the task, the audience, the length and the format you want.
- Give **examples** (few-shot) of good input → output pairs.
- Provide the **context** the model needs (product data, retrieved documents) instead of hoping it knows.
- **Temperature**: low (0–0.3) for consistent, factual answers; higher for creative text.

**Reliable JSON (structured output):**
1. Ask for JSON and describe the fields.
2. Use the provider's **JSON mode / structured output** feature where available, which constrains the reply to a schema.
3. **Validate** the reply in code with a Pydantic model, and retry or fall back if it fails.

\`\`\`python
from pydantic import BaseModel, ValidationError

class Ticket(BaseModel):
    category: str
    priority: int
    summary: str

try:
    ticket = Ticket.model_validate_json(llm_reply)
except ValidationError:
    ticket = None   # retry once, then show a friendly error
\`\`\`

Never trust model output blindly — treat it like user input.`,
          d: 'easy',
        },
      ],
    },
    {
      title: `Scenarios and project questions`,
      questions: [
        {
          q: `Explain your Python full-stack capstone project.`,
          a: `Keep it to about two minutes with a clear structure:

1. **Problem and users** — "A job portal where students apply to openings and recruiters shortlist them."
2. **Architecture** — React front end → Django REST Framework API → MySQL, JWT authentication; maybe a small FastAPI service for an AI resume-feedback feature.
3. **Your part** — specific: "I built the application and shortlisting APIs, the permission classes, and the recruiter dashboard in React."
4. **Data model** — main models and relationships: User, Company, Job, Application (User ↔ Job many-to-many through Application with a status).
5. **One hard problem** — something real: a slow applicants list fixed with \`select_related\`/\`prefetch_related\` and pagination, or duplicate applications blocked with a unique constraint.
6. **Quality** — serializer validation, tests with pytest or Django's test client, Git with pull requests, environment-based settings.
7. **Deployment and next steps** — where it runs (Gunicorn + Nginx, Docker), and what you would add next.

Have a diagram ready, be honest about what teammates did, and expect deep follow-ups on anything you mention.`,
          d: 'easy',
          at: 'All companies',
          tip: `Quote a number: "the applicants page went from 120 queries to 3". Specifics make the project believable.`,
        },
        {
          q: `A Django page that lists orders has become very slow. How do you investigate and fix it?`,
          a: `**Measure first:**
- Install **django-debug-toolbar** (or use DRF's browsable API with it) to see the number of queries and their time.
- Log slow queries in MySQL and run \`EXPLAIN\` on them.

**Common causes and fixes:**
1. **N+1 queries** — a loop or nested serializer touching \`order.customer\` or \`order.items\`. Fix with \`select_related("customer")\` and \`prefetch_related("items__product")\`.
2. **No pagination** — returning thousands of rows. Add DRF pagination (\`PageNumberPagination\` with a page size).
3. **Missing index** — filtering by \`status\` or sorting by \`created_at\` on a large table. Add \`Meta.indexes\`.
4. **Loading too much** — use \`.only()\`, \`.values()\` or a lighter serializer for list pages.
5. **Work in Python that the DB can do** — counting or summing in loops instead of \`annotate(Count(...))\` / \`aggregate(Sum(...))\`.
6. **Slow external calls in the request** — move them to a background task (Celery).
7. Only then, **caching** (Django cache with Redis) for data read often and changed rarely.

\`\`\`python
Order.objects.filter(user=request.user)\\
    .select_related("customer").prefetch_related("items__product")\\
    .order_by("-created_at")
\`\`\`

Re-measure after each change and report before/after numbers.`,
          d: 'medium',
          at: 'Product companies',
        },
        {
          q: `Design the REST API for a job portal using DRF.`,
          a: `| Method | Endpoint | Who | Purpose | Success |
|---|---|---|---|---|
| POST | \`/api/auth/register/\` | Anyone | Sign up | 201 |
| POST | \`/api/token/\` | Anyone | Login (JWT) | 200 |
| GET | \`/api/jobs/?q=python&location=Hyderabad&page=1\` | Anyone | Search jobs | 200 |
| GET | \`/api/jobs/{id}/\` | Anyone | Job detail | 200 / 404 |
| POST | \`/api/jobs/\` | Recruiter | Post a job | 201 |
| PATCH | \`/api/jobs/{id}/\` | Owner recruiter | Edit job | 200 / 403 |
| POST | \`/api/jobs/{id}/apply/\` | Student | Apply | 201 / 409 if already applied |
| GET | \`/api/me/applications/\` | Student | My applications | 200 |
| GET | \`/api/jobs/{id}/applications/\` | Owner recruiter | Applicants | 200 |
| PATCH | \`/api/applications/{id}/\` | Owner recruiter | Change status (shortlisted, rejected) | 200 |

**Implementation notes:**
- \`JobViewSet\` (ModelViewSet) with a custom \`@action\` for \`apply\`.
- Permissions: \`IsAuthenticated\`, a role check, and an \`IsJobOwner\` object permission.
- \`UniqueConstraint(fields=["user", "job"])\` on Application stops duplicate applications even under double clicks.
- Filtering with \`django-filter\` and pagination on lists.
- Status values as \`TextChoices\` so invalid states are rejected.
- Resume uploads validated for type and size.`,
          d: 'medium',
          at: 'Product companies, service companies',
        },
        {
          q: `Sending a welcome email makes signup take 5 seconds. How do you move it to the background?`,
          a: `Slow, non-essential work should not block the response. Use a **task queue**: the request puts a job on a queue and returns immediately; a separate **worker** process does the job.

With **Celery** and **Redis** (or RabbitMQ) as the broker:

\`\`\`python
# shop/celery.py
import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "shop.settings")
app = Celery("shop")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

# accounts/tasks.py
from celery import shared_task
from django.core.mail import send_mail

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_welcome_email(self, user_id):
    user = User.objects.get(pk=user_id)
    try:
        send_mail("Welcome!", "Thanks for joining.", None, [user.email])
    except Exception as exc:
        raise self.retry(exc=exc)

# in the signup view, after the user is saved
transaction.on_commit(lambda: send_welcome_email.delay(user.id))
\`\`\`

\`\`\`bash
celery -A shop worker -l info
\`\`\`

Key points: pass **ids**, not model objects (arguments are serialized); use \`transaction.on_commit\` so the worker does not run before the user row is committed; add retries; and monitor workers (Flower). For a small project, FastAPI's \`BackgroundTasks\` or a simpler queue like RQ can be enough.`,
          d: 'hard',
          at: 'Product companies',
        },
        {
          q: `How do you handle file uploads (like resumes) with React and DRF?`,
          a: `**React** sends \`multipart/form-data\` using \`FormData\`; let the browser set the \`Content-Type\` with its boundary.

\`\`\`tsx
async function uploadResume(file: File, token: string) {
  const form = new FormData();
  form.append('resume', file);
  const res = await fetch('/api/me/resume/', {
    method: 'PUT',
    headers: { Authorization: 'Bearer ' + token },
    body: form,
  });
  if (!res.ok) throw new Error('Upload failed');
}
\`\`\`

**DRF:**
\`\`\`python
class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    resume = models.FileField(upload_to="resumes/", blank=True)

class ResumeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ["resume"]

    def validate_resume(self, f):
        if f.size > 2 * 1024 * 1024:
            raise serializers.ValidationError("Max size is 2 MB.")
        if not f.name.lower().endswith(".pdf"):
            raise serializers.ValidationError("Only PDF files are allowed.")
        return f

class ResumeView(generics.UpdateAPIView):
    serializer_class = ResumeSerializer
    parser_classes = [MultiPartParser]
    def get_object(self):
        return self.request.user.profile
\`\`\`

Set \`MEDIA_ROOT\`/\`MEDIA_URL\`, or store files on S3 with \`django-storages\`. Validate size and type, keep files private if they hold personal data, and serve them through an authorised view or signed URLs.`,
          d: 'medium',
        },
        {
          q: `With DEBUG off, production shows a blank "Server Error (500)". How do you find the cause?`,
          a: `With \`DEBUG = False\`, Django hides the traceback from users (correctly). You need the errors to go somewhere you can read.

1. **Check the logs** — Gunicorn/Uvicorn output, the systemd journal or container logs (\`docker logs\`). Configure Django's \`LOGGING\` to write \`django.request\` errors to the console or a file; set \`ADMINS\` to get error emails, or use an error tracker like Sentry.
2. **Common causes right after deploying:**
   - \`ALLOWED_HOSTS\` missing the domain (this gives a 400, but often confused with it);
   - a missing environment variable — \`KeyError\` on \`os.environ["..."]\`;
   - migrations not applied — "no such column/table";
   - \`collectstatic\` not run, so a template referencing a static file via a manifest storage fails;
   - a package missing from \`requirements.txt\` that existed on your laptop;
   - database unreachable or wrong credentials from the server.
3. **Reproduce** in a staging environment with production-like settings — never switch \`DEBUG = True\` on the live site; it exposes settings and code to everyone.
4. Fix, add a test, redeploy through the pipeline.

\`\`\`python
LOGGING = {
    "version": 1,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "loggers": {"django.request": {"handlers": ["console"], "level": "ERROR"}},
}
\`\`\``,
          d: 'medium',
          at: 'Service companies, product companies',
        },
        {
          q: `How does Django store user passwords? Why not store them encrypted?`,
          a: `Django **never stores the plain password**. \`user.set_password()\` (and \`create_user()\`) stores a **salted hash** in this format:

\`\`\`text
<algorithm>$<iterations>$<salt>$<hash>
pbkdf2_sha256$<iterations>$Xy7...$K3a...
\`\`\`

- The default hasher is **PBKDF2 with SHA-256** and a high iteration count, which makes each guess slow for attackers. **Argon2** and bcrypt hashers are also supported (Argon2 needs \`argon2-cffi\`) and can be set first in \`PASSWORD_HASHERS\`.
- A random **salt** per user means equal passwords give different hashes, defeating precomputed (rainbow) tables.
- On login, \`check_password()\` hashes the attempt the same way and compares. If you change the preferred hasher, Django upgrades old hashes automatically at next login.

\`\`\`python
user = User.objects.create_user("ravi", "ravi@x.com", "s3cret-Pass")
user.check_password("s3cret-Pass")   # True
\`\`\`

**Why not encryption:** encryption is reversible — whoever gets the key gets every password. Hashing is one-way.

Never assign \`user.password = raw\` directly, never log passwords, keep them \`write_only\` in serializers, and enable \`AUTH_PASSWORD_VALIDATORS\`.`,
          d: 'easy',
          at: 'Service companies, product companies',
        },
        {
          q: `Two requests try to buy the last item in stock at the same moment. How do you prevent overselling in Django?`,
          a: `This is a **race condition**: both requests read \`stock = 1\`, both pass the check, both save — stock goes to −1.

**Option 1 — row lock with \`select_for_update\`** inside a transaction. The second request waits until the first commits, then sees the updated stock:

\`\`\`python
from django.db import transaction

def buy(user, product_id):
    with transaction.atomic():
        product = Product.objects.select_for_update().get(pk=product_id)
        if product.stock < 1:
            raise OutOfStock()
        product.stock -= 1
        product.save(update_fields=["stock"])
        Order.objects.create(user=user, product=product)
\`\`\`

**Option 2 — atomic conditional update with F()**, no explicit lock:

\`\`\`python
with transaction.atomic():
    updated = Product.objects.filter(pk=product_id, stock__gte=1)\\
                             .update(stock=F("stock") - 1)
    if updated == 0:
        raise OutOfStock()
    Order.objects.create(user=user, product_id=product_id)
\`\`\`

MySQL does the check and decrement in one statement, so only one request can win.

Notes: \`select_for_update\` must be inside \`atomic()\`; keep locked transactions short; add a database \`CheckConstraint\` (stock ≥ 0) as a final safety net. Return **409 Conflict** to the losing request.`,
          d: 'hard',
          at: 'Product companies',
          tip: `Explain the race in one sentence before the fix: "both read 1, both write 0".`,
        },
      ],
    },
  ],
};

export default book;
