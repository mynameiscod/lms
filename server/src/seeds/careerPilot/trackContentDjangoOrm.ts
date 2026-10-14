/**
 * Career-track content: the Django ORM (JT_DJANGO_ORM), for Python Full Stack + AI.
 *
 * Django 5.x on MySQL 8 through mysqlclient (ENGINE django.db.backends.mysql). One shop API grows
 * through the Django topics; here its `catalog` app gets its models — Category, Tag, Product,
 * Customer, Order, OrderItem (the through model) and Review — and every query the API will need.
 *
 * Every query, its SQL, its result and every query count claimed below was run on Django 5.2 against
 * SQLite with the same models (CaptureQueriesContext around each one). Where MySQL behaves
 * differently (non-transactional DDL, bulk_create primary keys, select_for_update, LIKE BINARY for
 * __contains) the text says so and states Django's documented behaviour.
 *
 * The topic is single-skill (DJANGO), so no question names a skillKey.
 * Options are written correct-first; `arrange` rotates the correct option through every position.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

let slot = 0;
const arrange = (options: [string, boolean][]): [string, boolean][] => {
  const correct = options.filter(o => o[1]);
  const rest = options.filter(o => !o[1]);
  if (correct.length !== 1) return options;
  rest.splice(slot++ % options.length, 0, correct[0]);
  return rest;
};

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: arrange(options).map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_DJANGO_ORM_BUNDLES: PilotBundle[] = [
  /* ── MODELS_MIGRATIONS ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_ORM_MODELS_MIGRATIONS',
    notes: `In the PyMySQL topic you wrote \`CREATE TABLE\` by hand and mapped rows to dataclasses yourself.
Django turns that around: you describe the data as **model classes** in Python, and Django generates
the tables, the SQL for every query, and a versioned history of schema changes called
**migrations**. This unit builds the \`catalog\` app of the shop API.

## A model is a class, a field is a column

    # catalog/models.py
    from django.conf import settings
    from django.db import models
    from django.db.models import Q


    class Category(models.Model):
        name = models.CharField(max_length=80, unique=True)
        slug = models.SlugField(unique=True)

        class Meta:
            ordering = ["name"]
            verbose_name_plural = "categories"

        def __str__(self):
            return self.name


    class Product(models.Model):
        class Status(models.TextChoices):
            DRAFT = "DRAFT", "Draft"
            LIVE = "LIVE", "Live"
            RETIRED = "RETIRED", "Retired"

        category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
        name = models.CharField(max_length=120)
        sku = models.CharField(max_length=20, unique=True)
        description = models.TextField(blank=True)
        price = models.DecimalField(max_digits=10, decimal_places=2)
        stock = models.PositiveIntegerField(default=0)
        status = models.CharField(max_length=10, choices=Status.choices,
                                  default=Status.DRAFT, db_index=True)
        discontinued_on = models.DateField(null=True, blank=True)
        created_at = models.DateTimeField(auto_now_add=True)
        updated_at = models.DateTimeField(auto_now=True)

        class Meta:
            ordering = ["-created_at"]
            indexes = [models.Index(fields=["category", "status"], name="product_cat_status_idx")]
            constraints = [
                models.CheckConstraint(condition=Q(price__gte=0), name="product_price_non_negative"),
            ]

        def __str__(self):
            return f"{self.sku} {self.name}"

The table is \`catalog_product\` (app label + model name). Every model gets an \`id\` primary key — a
\`BigAutoField\` when settings say \`DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"\`, which new
projects do. \`CheckConstraint(condition=...)\` is the Django 5.1+ spelling; 4.2 and 5.0 use
\`check=...\`.

## The field types you will use most

| Field | MySQL column | Use it for |
|---|---|---|
| \`CharField(max_length=…)\` | \`varchar(n)\` | names, codes — \`max_length\` is required |
| \`TextField\` | \`longtext\` | descriptions, bodies |
| \`IntegerField\`, \`PositiveIntegerField\` | \`int\`, \`int unsigned\` | counts, stock |
| \`DecimalField(max_digits, decimal_places)\` | \`decimal(10,2)\` | **money — never \`FloatField\`** |
| \`BooleanField\` | \`bool\` (tinyint) | flags |
| \`DateField\`, \`DateTimeField\` | \`date\`, \`datetime(6)\` | dates; with \`USE_TZ=True\` datetimes are stored in UTC |
| \`SlugField\`, \`EmailField\`, \`URLField\` | \`varchar\` | a CharField plus validation |
| \`JSONField\` | \`json\` | genuinely schemaless extras, not a way to avoid modelling |

## Field options — the ones interviews ask about

- **\`null=True\`** is about the **database**: the column allows NULL.
- **\`blank=True\`** is about **validation**: forms, the admin, \`full_clean()\` and DRF serializers
  accept an empty value. It does not change the column.
- For text fields, use \`blank=True\` alone, so "no value" is always \`''\` and never two things
  (\`''\` and NULL). For a date or number that may be missing, use \`null=True, blank=True\`.
- **\`default\`** fills the value when you do not; it is applied by Django, in Python.
- **\`unique=True\`** creates a unique index; a duplicate raises \`IntegrityError\` from the database.
- **\`db_index=True\`** adds a plain index. Foreign keys get one automatically.
- **\`choices\`** limits the value in forms, the admin and \`full_clean()\`, and gives you
  \`get_status_display()\`. It adds **no** database constraint.
- **\`auto_now_add=True\`** sets the value once, on insert. **\`auto_now=True\`** sets it on every
  \`save()\` — but not on \`QuerySet.update()\`, and not on \`save(update_fields=[...])\` unless the
  field is in the list.

Run on Django 5.2, these show where validation lives:

    p = Product(category=books, name="X", sku="Q-1", price=Decimal("10"), status="BOGUS")
    p.save()                     # saved! status is now 'BOGUS' in the database
    p.full_clean()               # ValidationError {'status': ["Value 'BOGUS' is not a valid choice."]}

    Product.objects.create(category=books, name="", sku="Q-2", price=1)   # saved with name ''
    Product.objects.create(..., price=Decimal("-1"))     # IntegrityError: the CheckConstraint
    Product.objects.create(..., description=None)        # IntegrityError: NOT NULL (blank=True only)

\`save()\` does not validate; \`full_clean()\` does, and ModelForms and DRF's ModelSerializer call
validation for you. Constraints in \`Meta.constraints\` are enforced by the database itself (MySQL
enforces CHECK constraints from 8.0.16).

## Meta

- **\`ordering\`** — the default \`ORDER BY\` for every query on the model. Convenient, but it costs a
  sort on every query; many teams leave it off and order explicitly.
- **\`indexes\`** — composite or named indexes, for the column combinations your queries filter on.
- **\`constraints\`** — \`UniqueConstraint\` (including multi-column and conditional) and
  \`CheckConstraint\`. Prefer \`UniqueConstraint\` to the older \`unique_together\`.
- \`verbose_name\`, \`verbose_name_plural\`, \`db_table\` — names.

## Migrations: the four commands

    python manage.py makemigrations catalog     # compare models with the last migration, write a new file
    python manage.py migrate                    # apply every unapplied migration, in dependency order
    python manage.py showmigrations catalog     # [X] applied, [ ] not applied
    python manage.py sqlmigrate catalog 0002    # print the SQL a migration would run, run nothing

\`makemigrations\` never touches the database's tables; it writes Python files into
\`catalog/migrations/\`. \`migrate\` runs them and records each in the \`django_migrations\` table.
Migration files are **source code**: commit them, review them, and never edit one that has already
run on a shared database — add a new one instead. \`python manage.py migrate catalog 0002\` rolls back
to 0002 by un-applying the later ones. In CI, \`makemigrations --check --dry-run\` fails the build
when someone changed a model and forgot the migration.

When you rename a field, \`makemigrations\` asks *"Was product.sku renamed to product.code (a
CharField)? [y/N]"*. Answer **y** to get a \`RenameField\`; answering N produces remove + add, which
**drops the column and its data**.

## Adding a required field to a table that already has rows

Add \`weight_grams = models.PositiveIntegerField()\` to \`Product\` and run \`makemigrations\`:

    It is impossible to add a non-nullable field 'weight_grams' to product without specifying a
    default. This is because the database needs something to populate existing rows.
    Please select a fix:
     1) Provide a one-off default now (will be set on all existing rows with a null value for this column)
     2) Quit and manually define a default value in models.py.

A one-off default works when one value is right for every row. When the right value depends on the
row, use **three migrations**:

1. Add the field with \`null=True\` → \`makemigrations\` → \`0002_product_weight_grams\`
   (\`ALTER TABLE ... ADD COLUMN weight_grams integer unsigned NULL\`).
2. A **data migration** that fills it.
3. Remove \`null=True\` → \`makemigrations\` → \`0004\` with an \`AlterField\` to NOT NULL.

## Data migrations with RunPython

\`python manage.py makemigrations catalog --empty -n fill_weight_grams\`, then:

    from django.db import migrations

    DEFAULT_GRAMS = {"books": 400, "kitchen": 900}


    def fill_weights(apps, schema_editor):
        Product = apps.get_model("catalog", "Product")      # the historical model, not an import
        for product in Product.objects.filter(weight_grams__isnull=True).select_related("category"):
            product.weight_grams = DEFAULT_GRAMS.get(product.category.slug, 500)
            product.save(update_fields=["weight_grams"])


    class Migration(migrations.Migration):
        dependencies = [("catalog", "0002_product_weight_grams")]
        operations = [migrations.RunPython(fill_weights, migrations.RunPython.noop)]

Two rules. Use \`apps.get_model\`, never \`from catalog.models import Product\`: the migration must
see the model **as it was at that point in history**, not as it is in today's code. And give a
reverse function (\`RunPython.noop\` when there is nothing to undo); without one, rolling back
past it fails with \`IrreversibleError: Operation <RunPython ...> is not reversible\`.

On MySQL, schema changes (DDL) are **not transactional**: if the third operation of a migration fails,
the first two stay applied and the migration is not recorded. Keep schema migrations small, and keep
data and schema changes in separate migrations.

## Common mistakes

- \`FloatField\` for money — \`0.1 + 0.2\` errors end up on invoices.
- \`null=True\` on a CharField, so "empty" has two spellings.
- Trusting \`choices\` to protect the column — only validation checks it.
- Editing or deleting an applied migration so that the files and the databases disagree.
- Importing models into a data migration.`,
    workedExample: `**Problem:** the shop needs each product's shipping weight. Products already exist in
production, and books and kitchen items have different typical weights. Add a required
\`weight_grams\` column without a wrong placeholder value and without downtime surprises.

**Step 1 — nullable column.** In \`Product\`: \`weight_grams = models.PositiveIntegerField(null=True)\`.

    $ python manage.py makemigrations catalog -n product_weight_grams
    Migrations for 'catalog':
      catalog/migrations/0002_product_weight_grams.py
        + Add field weight_grams to product
    $ python manage.py sqlmigrate catalog 0002
    ALTER TABLE ... ADD COLUMN weight_grams ... NULL ...

Adding a nullable column needs no value for the existing rows, so it is safe on a full table.

**Step 2 — fill it.** \`makemigrations catalog --empty -n fill_weight_grams\`, then the
\`RunPython(fill_weights, migrations.RunPython.noop)\` shown in the notes, using
\`apps.get_model\` and \`save(update_fields=["weight_grams"])\`.

**Step 3 — make it required.** Remove \`null=True\` and run \`makemigrations\` again →
\`0004_weight_grams_required\` containing \`AlterField(... PositiveIntegerField())\`.

    $ python manage.py showmigrations catalog
    catalog
     [X] 0001_initial
     [ ] 0002_product_weight_grams
     [ ] 0003_fill_weight_grams
     [ ] 0004_weight_grams_required
    $ python manage.py migrate catalog
      Applying catalog.0002_product_weight_grams... OK
      Applying catalog.0003_fill_weight_grams... OK
      Applying catalog.0004_weight_grams_required... OK

Afterwards every book reads 400 and every kitchen product 900. **Reasoning:** each step is valid on
its own, the data step can be re-run safely (it only touches NULL rows), and
\`migrate catalog 0002\` rolls back cleanly because the data step has a no-op reverse.`,
    mcqs: [
      mcq('Product.status has choices=Status.choices. A script runs Product(..., status="BOGUS").save(). What ends up in the database?', [
        ['The row is saved with status BOGUS', true],
        ['A ValidationError is raised by save()', false],
        ['An IntegrityError from a CHECK on status', false],
        ['The row is saved with the default DRAFT', false],
      ], 'choices is enforced by validation (full_clean, forms, serializers), not by save() and not by the database. Calling p.full_clean() would raise "Value \'BOGUS\' is not a valid choice."'),
      mcq('makemigrations asks "Was product.sku renamed to product.code (a CharField)? [y/N]" and you press Enter. What does the generated migration do to existing SKUs?', [
        ['Drops the sku column with its data and adds an empty code', true],
        ['Renames the sku column to code and keeps every existing value', false],
        ['Copies sku into code, then drops sku', false],
        ['Nothing yet; it asks again during migrate', false],
      ], 'N is the default, and it means "not a rename": Django writes RemoveField plus AddField, which loses the data. Answering y produces a RenameField that keeps the column contents.'),
      mcq('A RunPython data migration does from catalog.models import Product instead of apps.get_model("catalog", "Product"). Why is that a bug?', [
        ['It uses today\'s model, which may not match the schema at that step', true],
        ['Imports of app code are not allowed anywhere inside migration files', false],
        ['It makes the migration run twice on every deploy', false],
        ['It skips the transaction around the migration', false],
      ], 'Migrations replay history; at step 0003 the table may lack fields that today\'s Product declares, so queries through the real class can fail. apps.get_model gives the historical model for that point.'),
    ],
    checkpoint: [
      mcq('Which declaration is right for a product description that may be left empty in the admin?', [
        ['models.TextField(blank=True)', true],
        ['models.TextField(null=True)', false],
        ['models.TextField(null=True, default=None)', false],
        ['models.TextField(db_index=True)', false],
      ], 'blank=True lets validation accept an empty value, and the column stays NOT NULL holding \'\'. null=True alone still fails validation in the admin and gives text two ways to be empty.'),
      mcq('updated_at = DateTimeField(auto_now=True). Code runs Product.objects.filter(sku="KT-201").update(stock=5). What happens to updated_at?', [
        ['It keeps its old value', true],
        ['It is set to the current time', false],
        ['It is set to NULL', false],
      ], 'auto_now is applied in Model.save(); QuerySet.update() is a single UPDATE statement that never calls save(), so the timestamp does not change unless you set it in the update() call.'),
      mcq('After adding weight_grams = PositiveIntegerField() to a model whose table has rows, makemigrations stops with a prompt. Why?', [
        ['Existing rows need a value for the new NOT NULL column', true],
        ['PositiveIntegerField cannot be added after the first migration', false],
        ['The model must be migrated with migrate --fake first', false],
        ['MySQL forbids ALTER TABLE on tables with rows', false],
      ], 'The database must put something in the new column for every existing row. Give a one-off default, a default in the model, or add it nullable, fill it with a data migration, then make it required.'),
    ],
  },

  /* ── QUERYSETS ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_ORM_QUERYSETS',
    notes: `Every model has a **manager**, \`Product.objects\`, and every query starts from it. What it
returns is a **QuerySet**: a description of a SELECT that has not run yet. Learning when it runs is
most of what separates fast Django code from slow Django code.

The examples use six products: two LIVE books (BK-101 Python Crash Course, stock 12; BK-102 Fluent
Python, stock 0), a DRAFT book (BK-103), two LIVE kitchen items (KT-201 Steel Bottle, stock 40;
KT-202 Bamboo Board, stock 3) and a RETIRED one (KT-203, stock 0).

## QuerySets are lazy

    qs = Product.objects.filter(status="LIVE").exclude(stock=0).order_by("price")   # 0 queries
    names = [p.name for p in qs]                                                     # 1 query
    names = [p.name for p in qs]                                                     # still 1 — cached
    qs[0].name                                                                       # still 1 — from the cache

Building, chaining and passing a QuerySet around costs nothing. It is **evaluated** — the SQL runs —
when you iterate it, call \`list()\`, \`len()\` or \`bool()\` on it (including \`if qs:\`), \`repr()\` it
in the shell (with \`LIMIT 21\`), or pickle it. Once evaluated it keeps its rows in a **result
cache**, so the next loop is free. These were all counted with \`CaptureQueriesContext\`:

    qs = Product.objects.all()
    qs[0]; qs[0]          # 2 queries — indexing an UNevaluated queryset runs LIMIT 1 each time
    len(qs)               # 1 query, and fills the cache
    qs.count()            # 0 more — count() uses the cache once it is filled

    if qs: n = len(qs)                                  # 1 query in total
    if Product.objects.filter(status="LIVE").exists():  # SELECT 1 ... LIMIT 1
        n = Product.objects.filter(status="LIVE").count()   # SELECT COUNT(*) — 2 queries in total

So: if you only need to know whether rows exist, \`exists()\`; if you only need how many,
\`count()\`; if you will use the rows anyway, evaluate once and reuse. Each \`Product.objects...\`
expression is a **new** QuerySet with an empty cache. \`.iterator()\` streams rows without caching
— good for a million-row export, wasteful if you loop twice.

## Seeing the SQL

    print(Product.objects.filter(status="LIVE").query)
    # SELECT "catalog_product"."id", ... FROM "catalog_product"
    #   WHERE "catalog_product"."status" = LIVE ORDER BY "catalog_product"."created_at" DESC

\`str(qs.query)\` shows the SQL with parameters inlined for reading (unquoted — it is not
runnable as-is). The ORDER BY came from \`Meta.ordering\`. With \`DEBUG=True\`,
\`django.db.connection.queries\` lists every query the request ran.

## filter, exclude, get

    Product.objects.filter(status="LIVE", stock__gt=0)     # AND
    Product.objects.exclude(status="LIVE")                 # NOT
    Product.objects.exclude(status="LIVE", stock=0)        # NOT (status = LIVE AND stock = 0)

\`get()\` returns exactly one object, or raises:

    Product.objects.get(sku="NOPE")
    # Product.DoesNotExist: Product matching query does not exist.
    Product.objects.get(category__slug="books")
    # Product.MultipleObjectsReturned: get() returned more than one Product -- it returned 3!

\`Product.DoesNotExist\` is a subclass of \`django.core.exceptions.ObjectDoesNotExist\`. In a view,
\`get_object_or_404(Product, sku=sku)\` turns it into a 404. \`first()\` and \`last()\` return \`None\`
instead of raising. Slicing becomes LIMIT/OFFSET (\`[2:4]\` → \`LIMIT 2 OFFSET 2\`); a negative index
raises \`ValueError: Negative indexing is not supported.\`

## Field lookups

\`field__lookup=value\`:

    Product.objects.filter(name__icontains="python")         # LIKE %python% (case-insensitive)
    Product.objects.filter(sku__in=["BK-101", "KT-201", "NOPE"])
    Product.objects.filter(price__gte=400)                   # gt, gte, lt, lte
    Product.objects.filter(price__range=(300, 700))          # BETWEEN 300 AND 700, inclusive
    Product.objects.filter(discontinued_on__isnull=True)
    Product.objects.filter(sku__startswith="BK-")

On MySQL \`__contains\`/\`__startswith\` are case-sensitive (Django emits \`LIKE BINARY\`) and the
\`i\` versions follow the column's collation. \`__exact\` against a default \`utf8mb4_0900_ai_ci\`
column is **case-insensitive** on MySQL — a surprise if you test on SQLite or PostgreSQL.

**Spanning relations** uses the same double underscore, and becomes a JOIN:

    Product.objects.filter(category__name="Kitchen", price__gte=400)
    # ... INNER JOIN "catalog_category" ON (... category_id = ... id) WHERE "catalog_category"."name" = Kitchen ...

## Q objects: OR, AND, NOT

Keyword arguments are always ANDed. For OR and NOT, wrap conditions in \`Q\`:

    from django.db.models import Q
    Product.objects.filter(Q(stock=0) | Q(status="DRAFT"))   # WHERE (stock = 0 OR status = DRAFT)
    Product.objects.filter(Q(status="LIVE") & Q(price__lt=500))
    Product.objects.filter(~Q(status="LIVE"))               # NOT

On the data above \`Q(stock=0) | Q(status="DRAFT")\` returns BK-102, BK-103 and KT-203. Positional
Q arguments must come **before** keyword arguments in the call. Q objects can be built up in a loop
for search forms: \`cond = Q(); for word in words: cond &= Q(name__icontains=word)\`.

## F expressions: the column's value, in the database

\`F("field")\` refers to the column, so the arithmetic happens in SQL:

    Product.objects.filter(category__slug="kitchen").update(price=F("price") * Decimal("1.10"))
    # one statement: UPDATE ... SET "price" = ("price" * 1.10) WHERE ... the kitchen category
    Product.objects.filter(price__gt=F("stock") * 100)      # compare two columns

F prevents the **lost update**. Two requests both load KT-202 with stock 3:

    a = Product.objects.get(sku="KT-202"); b = Product.objects.get(sku="KT-202")
    a.stock -= 1; a.save()
    b.stock -= 1; b.save()          # stock is now 2 — one sale vanished

    Product.objects.filter(sku="KT-202").update(stock=F("stock") - 1)   # run twice → 3 - 2 = 1

Each \`UPDATE ... SET stock = stock - 1\` reads and writes in one statement, so neither overwrites the
other. Guard it in the same statement: \`filter(sku=..., stock__gte=qty).update(stock=F("stock") -
qty)\` returns the number of rows changed — 0 means not enough stock. After \`p.stock = F("stock") - 1;
p.save()\`, \`p.stock\` is still an expression object; call \`p.refresh_from_db()\` before reading it.

## Writing in bulk

    n = Product.objects.filter(stock=0).update(status="RETIRED")    # returns 2 (rows matched)
    Product.objects.filter(sku="BK-103").delete()
    # (2, {'catalog.Product_tags': 1, 'catalog.Product': 1})        — includes cascaded rows
    Product.objects.bulk_create([Product(category=books, name=f"Notebook {i}", sku=f"NB-{i:03}",
                                         price=Decimal("50")) for i in range(100)])

\`update()\`, \`delete()\` and \`bulk_create()\` skip \`Model.save()\`: no custom save logic, no
\`pre_save\`/\`post_save\` signals, no \`auto_now\` on update. \`bulk_create\` sends a few batched INSERTs
instead of 100 — but on **MySQL the returned objects have no primary key set** (Django can read back
generated ids only on PostgreSQL, MariaDB and SQLite 3.35+). \`get_or_create(name="gift")\` returns
\`(obj, created)\`.

## Common mistakes

- Calling \`.count()\` and then looping over the same rows — two queries where \`len()\` after the loop
  is free.
- \`if qs:\` to check existence when you never use the rows — use \`exists()\`.
- \`get()\` without handling \`DoesNotExist\` in a view, so a bad id is a 500 instead of a 404.
- Read-modify-write with \`obj.x += 1; obj.save()\` under concurrency.`,
    workedExample: `**Problem:** the shop's search box sends \`q\` (words), \`max_price\` and \`in_stock\`.
Build the queryset, show its SQL, and make sure no query runs until the view uses it.

    from decimal import Decimal
    from django.db.models import Q

    def search_products(q: str = "", max_price: str | None = None, in_stock: bool = False):
        qs = Product.objects.filter(status=Product.Status.LIVE)
        for word in q.split():
            qs = qs.filter(Q(name__icontains=word) | Q(description__icontains=word))
        if max_price:
            qs = qs.filter(price__lte=Decimal(max_price))
        if in_stock:
            qs = qs.filter(stock__gt=0)
        return qs.order_by("price")

    qs = search_products("python", in_stock=True)   # no query yet
    print(qs.query)
    # ... WHERE ("status" = LIVE AND ("name" LIKE %python% ESCAPE '\\' OR "description" LIKE ...)
    #       AND "stock" > 0) ORDER BY "price" ASC
    print([p.sku for p in qs])                      # ['BK-101'] — one query

**Reasoning:** each \`filter()\` returns a new QuerySet, so conditions are added only when the user
sent them, and the whole thing becomes one SELECT when the list comprehension iterates it. Fluent
Python matches "python" but has stock 0, so only BK-101 comes back. Each word must match the name
or the description (Q with |), and all words must match (chained filters AND together).
\`Decimal(max_price)\` keeps money exact; a bad value raises \`InvalidOperation\`, which the DRF layer
will turn into a 400.`,
    mcqs: [
      mcq('qs = Product.objects.all(); then the code reads qs[0].name and, on the next line, qs[0].price. How many queries run?', [
        ['Two — each index on an unevaluated queryset runs its own LIMIT 1', true],
        ['One — the first index evaluates the queryset and fills its result cache', false],
        ['None — indexing reads from the manager\'s cache', false],
        ['Seven — one for the whole table, then one per row', false],
      ], 'Indexing a queryset that has not been evaluated runs a fresh SELECT ... LIMIT 1 and does not fill the cache. Evaluate it first (list(qs)) or keep the object in a variable if you need it twice.'),
      mcq('Two requests each run p = Product.objects.get(sku="KT-202"); p.stock -= 1; p.save() at the same moment, starting from stock 3. What can the stock end at?', [
        ['2, because the second save overwrites the first', true],
        ['1, because save() applies each change in turn', false],
        ['3, because both saves are rejected as conflicts', false],
        ['An IntegrityError, because the row is shared', false],
      ], 'Both requests read 3 and both write 2: a lost update. update(stock=F("stock") - 1) computes the new value inside one UPDATE statement, so two of them end at 1.'),
      mcq('Product.objects.filter(Q(stock=0) | Q(status="DRAFT")) runs on the six example products. Which SKUs come back?', [
        ['BK-102, BK-103 and KT-203', true],
        ['BK-103 only', false],
        ['BK-102 and KT-203 only', false],
        ['Every product except KT-201', false],
      ], 'The | produces WHERE (stock = 0 OR status = DRAFT): BK-102 and KT-203 have no stock and BK-103 is a draft. Without Q, keyword arguments would be ANDed and return nothing.'),
    ],
    checkpoint: [
      mcq('A view calls Product.objects.get(category__slug="books") and the category has three products. What happens?', [
        ['Product.MultipleObjectsReturned is raised', true],
        ['The first product by primary key is returned', false],
        ['Product.DoesNotExist is raised', false],
        ['A list of three products is returned', false],
      ], 'get() must match exactly one row. With three it raises MultipleObjectsReturned ("it returned 3!"); with none it raises DoesNotExist. Use filter() for many rows or first() for "any one".'),
      mcq('qs = Product.objects.filter(status="LIVE"); print(len(qs)); print(qs.count()) — how many queries run in total?', [
        ['One, since count() reuses the filled cache', true],
        ['Two: one SELECT and one SELECT COUNT(*)', false],
        ['None, since both read from the model manager', false],
      ], 'len() evaluates the queryset and fills its result cache; count() on an evaluated queryset returns the cached length without a query. Called first, count() would have run SELECT COUNT(*).'),
      mcq('Which call increases the price of every kitchen product by 10% in one SQL statement, with no rows loaded into Python?', [
        ['filter(category__slug="kitchen").update(price=F("price") * Decimal("1.10"))', true],
        ['for p in filter(category__slug="kitchen"): p.price *= Decimal("1.10"); p.save()', false],
        ['filter(category__slug="kitchen").update(price="price * 1.10")', false],
        ['filter(category__slug="kitchen").bulk_update(price=F("price") * 1.10)', false],
      ], 'update() with an F expression becomes UPDATE ... SET price = price * 1.10 WHERE .... The loop loads and saves each row; a string is stored as a literal value; bulk_update takes objects and field names, not expressions.'),
    ],
  },

  /* ── RELATIONSHIPS ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_ORM_RELATIONSHIPS',
    notes: `The shop's data is relational: a product has a category and many tags, a customer places
orders, an order has many products with a quantity each, and a review may outlive its author. Django
has three relation fields, and each one gives you an attribute on **both** sides.

## ForeignKey — many-to-one

    class Product(models.Model):
        category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")

The column is \`category_id\`, with an index and a foreign-key constraint. From a product,
\`p.category\` is a Category (loaded with a query the first time); \`p.category_id\` is the id with
**no** query. From the other side, \`related_name\` names the **reverse manager**:

    kitchen = Category.objects.get(slug="kitchen")
    kitchen.products.filter(status="LIVE").count()      # 2
    kitchen.products.create(name="Kettle", sku="KT-204", price=999)

Without \`related_name\` it would be \`kitchen.product_set\`. Set it — \`products\` reads better in
queries, in serializers and in \`prefetch_related\`. It is also the name used to filter the other
way: \`Category.objects.filter(products__price__gt=800)\`.

## on_delete — what happens to the rows that point here

| Option | When the referenced row is deleted | Use it for |
|---|---|---|
| \`CASCADE\` | delete these rows too | parts that make no sense alone: an order's items |
| \`PROTECT\` | refuse with \`ProtectedError\` | reference data still in use: a category with products |
| \`RESTRICT\` | refuse, unless the row is also being deleted through another CASCADE | rarer, finer-grained PROTECT |
| \`SET_NULL\` | set the column to NULL — requires \`null=True\` | history to keep: a review whose author left |
| \`SET_DEFAULT\` / \`SET(...)\` | set a default or computed value | e.g. reassign to a "deleted user" placeholder |
| \`DO_NOTHING\` | Django does nothing; the database decides | only when the DB handles it |

Django emulates these in Python before it deletes: it collects related rows and runs the deletes and
updates itself. Run against the shop's models:

    Customer.objects.get(user__username="asha").delete()
    # (6, {'catalog.OrderItem': 3, 'catalog.Order': 2, 'catalog.Customer': 1})

    Category.objects.get(slug="books").delete()
    # ProtectedError: Cannot delete some instances of model 'Category' because they are
    # referenced through protected foreign keys: 'Product.category'.

    User.objects.get(username="ravi").delete()   # his 2 reviews stay, with author_id NULL

\`ForeignKey(User, on_delete=models.SET_NULL)\` without \`null=True\` fails the system check:
\`fields.E320: Field specifies on_delete=SET_NULL, but cannot be null.\` Point at the user model as
\`settings.AUTH_USER_MODEL\`, never \`auth.User\` directly — the Auth topic swaps in a custom user.

## ManyToManyField

    class Product(models.Model):
        tags = models.ManyToManyField(Tag, blank=True, related_name="products")

No column on \`catalog_product\`; Django creates a join table \`catalog_product_tags\` with
\`product_id\` and \`tag_id\`. Both sides get a manager:

    p.tags.add(gift, sale)       # INSERT into the join table
    p.tags.remove(sale)
    p.tags.set([eco])            # make it exactly this set
    p.tags.clear()
    gift.products.count()        # reverse side, through related_name

## A through model — when the link has data

An order line needs a quantity and the price at the time of sale. That data lives on the link, so
make the link a model:

    class Order(models.Model):
        customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="orders")
        products = models.ManyToManyField(Product, through="OrderItem", related_name="orders")
        placed_at = models.DateTimeField(auto_now_add=True)
        paid = models.BooleanField(default=False)


    class OrderItem(models.Model):
        order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
        product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="order_items")
        quantity = models.PositiveIntegerField()
        unit_price = models.DecimalField(max_digits=10, decimal_places=2)

        class Meta:
            constraints = [models.UniqueConstraint(fields=["order", "product"], name="one_line_per_product")]

Create lines through the through model (\`OrderItem.objects.create(order=o, product=p, quantity=2,
unit_price=p.price)\`) or with \`o.products.add(p, through_defaults={"quantity": 3, "unit_price":
p.price})\`. Without \`through_defaults\`, \`add()\` tries to insert NULL into \`quantity\` and the
database refuses (\`IntegrityError: NOT NULL constraint failed\`). \`unit_price\` is copied, not read
from the product, because the product's price will change and the invoice must not.
\`on_delete=PROTECT\` on \`OrderItem.product\` stops anyone deleting a product that has been sold;
retire it instead.

## OneToOneField

    class Customer(models.Model):
        user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="customer")
        phone = models.CharField(max_length=15, blank=True)
        city = models.CharField(max_length=60, blank=True)

A ForeignKey with a unique constraint. \`customer.user\` and \`user.customer\` each return one object.
If a user has no customer row, \`user.customer\` raises \`User.customer.RelatedObjectDoesNotExist\`
(a subclass of \`Customer.DoesNotExist\`), and \`hasattr(user, "customer")\` is \`False\`. This is how
to add profile data to users without touching the user model.

## Querying across relations

    Order.objects.filter(customer__user__username="asha")
    Product.objects.filter(order_items__order__paid=True).distinct()
    Category.objects.filter(products__isnull=True)          # categories with no products: Toys

Filtering across a reverse FK or M2M can return the **same row twice** — one per matching related
row. \`Product.objects.filter(tags__name__in=["gift", "eco"])\` returns KT-201 twice because it has
both tags; add \`.distinct()\`.

For multi-valued relations, one \`filter()\` call and two chained calls mean different things:

    Product.objects.filter(reviews__rating=5, reviews__author__username="ravi")      # 0
    Product.objects.filter(reviews__rating=5).filter(reviews__author__username="ravi")  # 1

The first asks for **one review** that is both 5 stars and by ravi (none exists). The second asks
for a product with **some** 5-star review and **some** review by ravi — BK-101 has asha's 5 and
ravi's 4.

## Common mistakes

- \`CASCADE\` everywhere — deleting a category wipes the catalogue and its order history.
- \`SET_NULL\` without \`null=True\`.
- A plain ManyToManyField where the link needs data, then a painful migration later.
- Forgetting \`distinct()\` after filtering across a to-many relation and counting duplicates.`,
    workedExample: `**Problem:** a customer asks to delete her account. Orders must stay for the accounts
team, her reviews should stay without her name, and nothing sold may lose its product.

Choose \`on_delete\` per relation and check what a delete would remove:

    class Customer(models.Model):
        user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="customer")

    class Order(models.Model):
        customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="orders")

    class Review(models.Model):
        author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                   null=True, related_name="reviews")

    class OrderItem(models.Model):
        product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="order_items")

With \`Order.customer\` as CASCADE (as in the notes), deleting her user returned
\`(7, {'catalog.OrderItem': 3, 'catalog.Order': 2, 'catalog.Customer': 1, 'auth.User': 1})\` —
her order history gone, while her review stayed with \`author_id\` NULL. With PROTECT, \`user.delete()\` now raises
\`ProtectedError\` while she has orders, which is the point: the service anonymises instead.

    from django.db import transaction

    @transaction.atomic
    def close_account(user):
        Review.objects.filter(author=user).update(author=None)   # or let SET_NULL do it
        user.username = f"deleted-{user.pk}"
        user.email = ""
        user.is_active = False
        user.set_unusable_password()
        user.save()

**Reasoning:** CASCADE is for rows that mean nothing without their parent; PROTECT is for rows other
people depend on (accounts, invoices); SET_NULL keeps content but drops the link. Reading the
\`delete()\` return value in a shell first (inside an \`atomic\` block you then roll back) is the quickest
way to see what a CASCADE will really take with it.`,
    mcqs: [
      mcq('Category has no related_name on Product.category. Which expression lists a category\'s products?', [
        ['category.product_set.all()', true],
        ['category.products.all()', false],
        ['category.product.all()', false],
        ['Product.category.all()', false],
      ], 'Without related_name the reverse manager is <model>_set in lower case. category.products only exists when related_name="products" is declared, which is why the shop declares it.'),
      mcq('An order line needs quantity and unit_price. Code runs order.products.add(product) on a through model whose quantity has no default. What happens?', [
        ['An IntegrityError: quantity cannot be NULL', true],
        ['The line is created with quantity 0', false],
        ['Django asks for the quantity interactively', false],
        ['The product is added with quantity 1', false],
      ], 'add() inserts a through-model row with only the two foreign keys set, so NOT NULL quantity fails. Pass through_defaults={"quantity": ..., "unit_price": ...} or create OrderItem directly.'),
      mcq('Product.objects.filter(tags__name__in=["gift", "eco"]).count() returns 5, but only 4 distinct products have either tag. Why?', [
        ['A product with both tags is joined, and counted, twice', true],
        ['__in counts each matching tag name as a product', false],
        ['The M2M join table still holds one stale duplicate link row', false],
        ['count() includes products with no tags as well', false],
      ], 'Filtering across a many-to-many relation joins the link table, giving one row per matching tag. KT-201 has gift and eco, so it appears twice; .distinct().count() returns 4.'),
    ],
    checkpoint: [
      mcq('Review.author = ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL). What does manage.py check report?', [
        ['fields.E320: SET_NULL needs the field to allow null', true],
        ['Nothing; Django adds null=True for SET_NULL', false],
        ['A warning that auth.User should be imported directly', false],
        ['fields.E304: the reverse accessor clashes with User', false],
      ], 'SET_NULL writes NULL into the column, so the field must be declared null=True; the system check refuses it otherwise. Pointing at settings.AUTH_USER_MODEL is the recommended practice.'),
      mcq('With Product.category on_delete=PROTECT, what does Category.objects.get(slug="books").delete() do when the books category has three products?', [
        ['Raises ProtectedError and deletes nothing', true],
        ['Deletes the category and its three products', false],
        ['Deletes the category and sets category_id to NULL', false],
      ], 'PROTECT makes Django refuse the delete when any row still references the object, naming the protecting field. Move or retire the products first.'),
      mcq('One query: Product.objects.filter(reviews__rating=5, reviews__author__username="ravi"). BK-101 has a 5-star review by asha and a 4-star review by ravi. Is BK-101 returned?', [
        ['No — both conditions must hold for the same review', true],
        ['Yes — each condition is met by some review', false],
        ['Yes, twice — once for each matching review', false],
        ['No — reverse relations cannot be filtered on', false],
      ], 'Conditions in a single filter() on a multi-valued relation apply to the same related row. Chaining .filter(reviews__rating=5).filter(reviews__author__username="ravi") would match BK-101.'),
    ],
  },

  /* ── PERFORMANCE ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_ORM_PERFORMANCE',
    notes: `The ORM makes it easy to write code that is correct and slow. The classic case is the
**N+1 query problem**: one query for a list, then one more query **per row** for something related.
On a laptop with six rows nobody notices; on a product list of 50 with a remote MySQL it is 51
round trips per page view.

## Measure first

Every count in this unit was measured like this:

    from django.db import connection
    from django.test.utils import CaptureQueriesContext

    with CaptureQueriesContext(connection) as ctx:
        names = [p.category.name for p in Product.objects.all()]
    print(len(ctx))                         # 7
    for q in ctx.captured_queries:
        print(q["sql"])

Other ways to see queries:

- **django-debug-toolbar** — its SQL panel shows every query for a page, with the "similar" and
  "duplicated" counts that give N+1 away and the stack trace of the line that ran it.
- \`connection.queries\` when \`DEBUG=True\`.
- In tests: \`self.assertNumQueries(2)\` in a Django \`TestCase\`, or pytest-django's
  \`django_assert_num_queries\` fixture. A test that pins the count stops an N+1 from creeping
  back.
- \`qs.explain()\` prints the database's plan for a query — the way to check an index is used.

## The N+1, three ways

    # 1 + 6: one per product, to load its category
    [p.category.name for p in Product.objects.all()]
    # 1 + 6: one per product, to load its tags
    [[t.name for t in p.tags.all()] for p in Product.objects.all()]
    # 1 + 3: one per category, to count its products
    [c.products.count() for c in Category.objects.all()]

Django does not reuse a category another product already loaded; every \`p.category\` access on a
fresh instance is a query. Reading \`p.category_id\` never queries — the id is on the row.

## select_related — follow FK and one-to-one with a JOIN

    [p.category.name for p in Product.objects.select_related("category")]     # 1 query

    SELECT "catalog_product".*, "catalog_category"."id", "catalog_category"."name", ...
    FROM "catalog_product" INNER JOIN "catalog_category" ON (...)

Use it for **single-valued** relations: ForeignKey and OneToOne, forwards (and reverse one-to-one).
Chain with \`__\`: \`Order.objects.select_related("customer__user")\`. Asking it for a many-valued
relation is an error: \`FieldError: Invalid field name(s) given in select_related: 'tags'. Choices
are: category\`.

## prefetch_related — many-valued relations, one extra query each

    [[t.name for t in p.tags.all()] for p in Product.objects.prefetch_related("tags")]   # 2 queries
    [len(c.products.all()) for c in Category.objects.prefetch_related("products")]       # 2 queries

The first query loads the products; the second loads all their tags with \`WHERE product_id IN
(...)\`, and Django joins them up in Python. Use it for **ManyToMany and reverse ForeignKey**
(\`category.products\`, \`order.items\`). It can also follow a path:
\`prefetch_related("items__product")\`.

What uses the prefetched rows and what throws them away:

    for p in Product.objects.prefetch_related("tags"):
        p.tags.all()                    # uses the prefetch — no query
        p.tags.count()                  # also answered from the prefetch — no query
        p.tags.filter(name="gift")      # a NEW query per product — 8 queries in total

Anything that changes the query (\`filter\`, \`exclude\`, \`order_by\`) builds a new queryset and
ignores the prefetched rows. Filter in the prefetch instead.

## Prefetch objects — filter, order, and name the result

    from django.db.models import Prefetch

    categories = Category.objects.prefetch_related(
        Prefetch("products",
                 queryset=Product.objects.filter(status="LIVE").order_by("sku"),
                 to_attr="live"))
    for c in categories:
        print(c.name, [p.sku for p in c.live])      # 2 queries in total
    # Books ['BK-101', 'BK-102'] / Kitchen ['KT-201', 'KT-202'] / Toys []

\`to_attr\` stores a plain list, so it is clear in the code that this is a filtered subset, not
\`c.products.all()\`.

## Combining them

An order page shows each order's customer name and its lines with product names:

    Order.objects.all()                                   # 15 queries for 3 orders and 5 lines
    Order.objects.select_related("customer__user").prefetch_related("items__product")   # 3 queries

The 3 are: orders JOIN customer JOIN user; the items for those orders; the products for those items.
Each \`__\` step of a prefetch path is its own query, even when the step is a ForeignKey —
\`prefetch_related("items__product__category")\` is four queries in all. To fold the single-valued
steps into the prefetch, give it a queryset that joins them:

    Order.objects.select_related("customer__user").prefetch_related(
        Prefetch("items", queryset=OrderItem.objects.select_related("product__category")))   # 2 queries

And when you only need a number, let the database count:
\`Category.objects.annotate(n=Count("products"))\` is **1** query (next unit).

## Loading less: only, defer, values, values_list

    Product.objects.only("sku", "name")         # SELECT id, name, sku ...
    Product.objects.defer("description")        # every column except description

These still return model instances, with the missing fields **deferred**: reading one later loads
it with a query **per object** — \`[p.price for p in Product.objects.only("sku", "name")]\` is 7
queries. Use them only when you are sure what the code reads.

When you need data, not objects:

    Product.objects.values("sku", "category__name")[:2]
    # <QuerySet [{'sku': 'BK-101', 'category__name': 'Books'}, ...]>
    Product.objects.values_list("sku", "price")             # tuples
    Product.objects.values_list("sku", flat=True)           # ['BK-101', 'BK-102', ...]

\`values()\` can span relations without \`select_related\` (it joins). \`flat=True\` works only with one
field; with two you get \`TypeError: 'flat' is not valid when values_list is called with more than
one field.\` No model instances means no methods, no \`__str__\`, but much less memory.

## Indexes are the other half

The ORM cannot make a query fast that the database must answer by scanning. Index what you filter
and order by: \`db_index=True\` on single columns, \`Meta.indexes\` for combinations
(\`["category", "status"]\` for "live products in a category"), and check with \`qs.explain()\`.
Foreign keys and unique fields are already indexed.

## Common mistakes

- Fixing N+1 by caching in Python instead of changing the query.
- \`select_related\` on everything — joining six tables to show one name.
- Filtering inside the loop and losing the prefetch.
- \`only()\` followed by a template or serializer that reads a deferred field.`,
    workedExample: `**Problem:** \`GET /api/orders/\` is slow. The view builds this list:

    def order_summaries():
        out = []
        for o in Order.objects.all():
            out.append({
                "id": o.id,
                "customer": o.customer.user.username,
                "lines": [(i.product.name, i.quantity) for i in o.items.all()],
            })
        return out

**Measure.** With 3 orders and 5 lines in the test data:

    with CaptureQueriesContext(connection) as ctx:
        order_summaries()
    len(ctx)   # 15

1 for orders, then per order: customer (1), user (1), items (1) = 9, then per line: product = 5.
It grows with every order and every line.

**Fix.** Single-valued paths join; many-valued paths prefetch:

    Order.objects.select_related("customer__user").prefetch_related("items__product")

Measured again: **3** queries — orders joined to customers and users, the items for those orders,
the products for those items — and 3 no matter how many orders there are.

**Lock it in** with a test, so the next change cannot quietly bring it back:

    def test_order_summaries_query_count(django_assert_num_queries, three_orders):
        with django_assert_num_queries(3):
            order_summaries()

**Reasoning:** count first, explain where each query comes from (the loop body), choose the tool by
relation type — \`select_related\` for FK/one-to-one, \`prefetch_related\` for M2M and reverse FK —
and pin the result with a test.`,
    mcqs: [
      mcq('[p.category.name for p in Product.objects.all()] over six products runs 7 queries. Which change makes it one query?', [
        ['Product.objects.select_related("category")', true],
        ['Product.objects.prefetch_related("category__name")', false],
        ['Product.objects.only("category")', false],
        ['Product.objects.values("category")', false],
      ], 'select_related joins the category table into the product SELECT, so p.category is already loaded. prefetch_related on a FK would work but take 2 queries; only("category") still loads each category later.'),
      mcq('for p in Product.objects.prefetch_related("tags"): gift = p.tags.filter(name="gift") — over six products, how many queries run?', [
        ['8 — the prefetch runs, then filter() queries per product', true],
        ['2 — the filter is applied to the prefetched tags', false],
        ['7 — the prefetch is skipped and each product queries on its own', false],
        ['1 — the prefetch joins the tags into the product query', false],
      ], 'Two queries for the products and the prefetch, then .filter() builds a new queryset that ignores the prefetched rows: 6 more. Filter with Prefetch("tags", queryset=Tag.objects.filter(name="gift"), to_attr=...).'),
      mcq('Product.objects.only("sku", "name") is used in a loop that reads p.price on each of six products. How many queries run?', [
        ['7 — price is deferred and loaded per object', true],
        ['1 — only() is a hint that Django ignores', false],
        ['2 — Django loads all deferred fields together', false],
        ['None — the loop raises an AttributeError for price', false],
      ], 'only() loads just id, sku and name. Reading a deferred field triggers a refresh query for that one instance, so the saving turns into an N+1. Include price in only() or drop it.'),
    ],
    checkpoint: [
      mcq('Which relation should be loaded with prefetch_related rather than select_related?', [
        ['category.products, a reverse ForeignKey', true],
        ['product.category, a forward ForeignKey', false],
        ['customer.user, a forward OneToOneField', false],
        ['orderitem.order, a forward ForeignKey', false],
      ], 'select_related works by JOIN and handles single-valued relations. A reverse ForeignKey or ManyToMany yields many rows per object, so prefetch_related loads them with a second query.'),
      mcq('Category.objects.prefetch_related(Prefetch("products", queryset=Product.objects.filter(status="LIVE"), to_attr="live")) is looped over to read c.live. How many queries run for three categories?', [
        ['Two', true],
        ['Four', false],
        ['One', false],
        ['Three', false],
      ], 'One query for the categories and one for all their LIVE products with WHERE category_id IN (...). to_attr stores each category\'s list on c.live, so reading it costs nothing.'),
      mcq('A test must fail if the product list view ever runs more than 2 queries. What is the right tool in a pytest-django test?', [
        ['The django_assert_num_queries fixture used as a context manager', true],
        ['Setting DEBUG=True and reading connection.queries after the test', false],
        ['django-debug-toolbar, opened in the browser for the page', false],
        ['Calling qs.explain() on every queryset the view builds', false],
      ], 'django_assert_num_queries(2) fails the test when the count differs, so a regression is caught in CI. The toolbar and connection.queries are for looking; explain() shows a query plan, not a count.'),
    ],
  },

  /* ── AGGREGATES_TRANSACTIONS ───────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_ORM_AGGREGATES_TRANSACTIONS',
    notes: `Two jobs left for the ORM: answering questions about **many rows at once** (totals, averages,
counts per group) without loading them into Python, and making **multi-step writes** all-or-nothing
under concurrency.

## aggregate — one answer for the whole queryset

    from django.db.models import Avg, Count, Max, Min, Sum

    Product.objects.aggregate(Avg("price"), Max("price"))
    # {'price__avg': Decimal('661.83...'), 'price__max': Decimal('1299.00')}
    Product.objects.aggregate(total_stock=Sum("stock"), n=Count("id"))
    # {'total_stock': 60, 'n': 6}

\`aggregate()\` is **terminal**: it runs immediately and returns a **dict**, not a queryset. On an
empty set \`Sum\` returns \`None\`, not 0: use \`Coalesce(Sum("stock"), 0)\` (from
\`django.db.models.functions\`) or the \`default=0\` argument (Django 4.0+).

## annotate — one answer per row

    Category.objects.annotate(n=Count("products"))
    # Books 3, Kitchen 3, Toys 0 — one query, with GROUP BY

    Category.objects.annotate(n=Count("products", filter=Q(products__status="LIVE")))
    # Books 2, Kitchen 2, Toys 0

\`annotate()\` adds a computed attribute to every object and returns a queryset you can keep
filtering, ordering and slicing:

    Product.objects.annotate(avg_rating=Avg("reviews__rating")).filter(avg_rating__gte=4)
    # BK-101 with avg_rating 4.5 — the filter becomes HAVING

Filter **before** annotate to limit the rows counted (WHERE); filter **after** on the annotation to
limit the groups (HAVING).

## Grouping by a column: values() then annotate()

    Product.objects.values("status").annotate(n=Count("id")).order_by("status")
    # [{'status': 'DRAFT', 'n': 1}, {'status': 'LIVE', 'n': 4}, {'status': 'RETIRED', 'n': 1}]
    # SELECT status, COUNT(id) AS n FROM catalog_product GROUP BY 1 ORDER BY ...

\`values()\` before \`annotate()\` means "group by these". Since Django 3.1, \`Meta.ordering\` is not
applied to GROUP BY queries — add \`order_by\` yourself. An \`order_by\` on a field outside
\`values()\` adds that field to the GROUP BY and silently splits the groups.

## Arithmetic inside aggregates

    from django.db.models import DecimalField, ExpressionWrapper, F

    line_total = ExpressionWrapper(F("items__quantity") * F("items__unit_price"),
                                   output_field=DecimalField(max_digits=12, decimal_places=2))
    Order.objects.annotate(total=Sum(line_total))
    Customer.objects.annotate(spent=Sum(F("orders__items__quantity") * F("orders__items__unit_price"),
                                        filter=Q(orders__paid=True)))
    # asha 1197, ravi 1449

## Count with distinct, and the join explosion

Two to-many annotations in one query multiply each other's rows:

    Product.objects.annotate(n_tags=Count("tags"), n_reviews=Count("reviews"))
    # BK-101: n_tags 2, n_reviews 2   — wrong, it has 1 tag and 2 reviews
    # KT-201: n_tags 2, n_reviews 2   — wrong, it has 2 tags and 1 review

The query joins tags **and** reviews, so each product row appears tags × reviews times. For counts,
\`Count("tags", distinct=True)\` fixes it (BK-101: 1 and 2; KT-201: 2 and 1). For \`Sum\` or \`Avg\`
there is no such fix — use a \`Subquery\` or a separate query. \`Count("customer", distinct=True)\`
on orders is "how many different customers ordered": 2, against 3 orders.

## Transactions: transaction.atomic

By default Django runs in **autocommit**: every query commits on its own (and \`ATOMIC_REQUESTS\` is
\`False\`, so a view is not one transaction). Two creates where the second fails leave the first in
the database. Wrap steps that belong together:

    from django.db import IntegrityError, transaction

    try:
        with transaction.atomic():
            Product.objects.create(category=books, name="A", sku="T-1", price=1)
            Product.objects.create(category=books, name="B", sku="T-1", price=1)   # duplicate sku
    except IntegrityError:
        pass
    Product.objects.filter(sku="T-1").exists()     # False — both rolled back

\`atomic\` is a context manager **and** a decorator (\`@transaction.atomic\`). It commits if the
block exits normally and rolls back if an exception leaves it. Catch the exception **outside** the
block: catching a database error **inside** and carrying on leaves the transaction broken —

    with transaction.atomic():
        try:
            Product.objects.create(..., sku="T-2")       # IntegrityError
        except IntegrityError:
            pass
        Product.objects.count()
    # TransactionManagementError: An error occurred in the current transaction. You can't execute
    # queries until the end of the 'atomic' block.

## Nested atomic = savepoints

    with transaction.atomic():
        Product.objects.create(..., sku="T-3")
        try:
            with transaction.atomic():                     # a SAVEPOINT
                Product.objects.create(..., sku="T-3")     # duplicate
        except IntegrityError:
            pass                                           # rolled back to the savepoint only
    # T-3 exists: the outer work committed

This is the right way to try something that may fail and keep going.

## on_commit — side effects only after the data is real

    with transaction.atomic():
        order = create_order(...)
        transaction.on_commit(lambda: send_confirmation_email.delay(order.id))

The callback runs **after** the outermost transaction commits; if it rolls back, the callback is
discarded. Sending the email inside the block would announce orders that never existed, and a
background worker might look for a row that is not committed yet. Outside any transaction,
\`on_commit\` runs the function immediately.

## select_for_update — locking the rows you are about to change

\`F()\` handles "subtract one". When the code must **read, decide, then write** — "is there enough
stock for this order?" — lock the row:

    @transaction.atomic
    def place_order(customer, sku, qty):
        product = Product.objects.select_for_update().get(sku=sku)   # SELECT ... FOR UPDATE
        if product.stock < qty:
            raise OutOfStock(sku)                                     # rolls everything back
        order = Order.objects.create(customer=customer)
        OrderItem.objects.create(order=order, product=product, quantity=qty, unit_price=product.price)
        product.stock = F("stock") - qty
        product.save(update_fields=["stock"])
        return order

A second request for the same product waits at its \`select_for_update()\` until the first
transaction ends, then reads the new stock. On MySQL (InnoDB), \`select_for_update()\` must run
inside \`atomic\`: evaluating it outside raises \`TransactionManagementError: select_for_update
cannot be used outside of a transaction.\` Options: \`nowait=True\` (fail instead of waiting),
\`skip_locked=True\` (skip locked rows — job queues), \`of=("self",)\` to lock only some joined
tables. (SQLite ignores \`select_for_update\`, so test locking on MySQL.) Keep locked transactions
short: no HTTP calls inside them.

## Common mistakes

- \`aggregate()\` expecting a queryset back, or \`Sum\` expecting 0 on no rows.
- Two to-many \`Count\`s without \`distinct=True\`.
- Catching \`IntegrityError\` inside \`atomic\` and continuing.
- Sending emails or publishing events inside the transaction instead of \`on_commit\`.
- Read-check-write on stock without a lock or a guarded \`update()\`.`,
    workedExample: `**Problem:** the admin dashboard needs, per category: the number of LIVE products, the
total stock, and the revenue from paid orders. One query, correct numbers.

    from django.db.models import Count, DecimalField, ExpressionWrapper, F, Q, Sum
    from django.db.models.functions import Coalesce

    revenue_line = ExpressionWrapper(
        F("products__order_items__quantity") * F("products__order_items__unit_price"),
        output_field=DecimalField(max_digits=14, decimal_places=2))

    report = (Category.objects
              .annotate(live=Count("products", filter=Q(products__status="LIVE"), distinct=True))
              .order_by("name"))

**Check before trusting it.** Adding \`stock=Sum("products__stock")\` and
\`revenue=Sum(revenue_line, filter=Q(products__order_items__order__paid=True))\` to the same
\`annotate\` joins products to order items: a product sold on two orders has its stock summed
**twice**. On the shop data Books then reports stock 29 instead of 17, because BK-101 (stock 12) is
on two orders. \`distinct=True\` saves the Count, but nothing saves the Sum.

**Split it** — each to-many aggregation in its own query, merged by category id:

    live_and_stock = (Category.objects
        .annotate(live=Count("products", filter=Q(products__status="LIVE")),
                  stock=Coalesce(Sum("products__stock"), 0))
        .values("id", "name", "live", "stock"))
    revenue = dict(Category.objects
        .annotate(r=Sum(revenue_line, filter=Q(products__order_items__order__paid=True)))
        .values_list("id", "r"))
    rows = [{**c, "revenue": revenue.get(c["id"]) or 0} for c in live_and_stock]

**Reasoning:** an aggregate over one to-many path is safe; two paths in one query multiply. Two
queries of known meaning beat one query of unknown meaning — and a test with a product sold twice
catches the bug the first version had.`,
    mcqs: [
      mcq('What does Product.objects.filter(status="RETIRED", stock__gt=100).aggregate(total=Sum("stock")) return when no product matches?', [
        ['{\'total\': None}', true],
        ['{\'total\': 0}', false],
        ['An empty QuerySet', false],
        ['A DoesNotExist exception', false],
      ], 'aggregate() returns a dict, and SQL SUM over no rows is NULL, which becomes None. Wrap it as Coalesce(Sum("stock"), 0) or pass default=0 to get zero.'),
      mcq('Inside with transaction.atomic(), code catches an IntegrityError from a create() and then runs Product.objects.count(). What happens on the count()?', [
        ['TransactionManagementError: no queries until the block ends', true],
        ['The count runs normally; the error was handled', false],
        ['The count runs, but in a new autocommit transaction', false],
        ['The atomic block silently retries the failed create()', false],
      ], 'After a database error the transaction is broken, and Django refuses further queries in that atomic block. Catch outside the block, or wrap the risky statement in its own nested atomic (a savepoint).'),
      mcq('Why is transaction.on_commit(lambda: send_email(order.id)) better than calling send_email directly inside the atomic block?', [
        ['The email is sent only if the order really commits', true],
        ['on_commit sends the email faster than a direct call', false],
        ['on_commit retries the email if the SMTP server is down', false],
        ['Direct calls inside atomic raise TransactionManagementError', false],
      ], 'If the transaction rolls back, on_commit callbacks are discarded, so no email for an order that does not exist. It neither speeds up nor retries the call.'),
    ],
    checkpoint: [
      mcq('Product.objects.annotate(n_tags=Count("tags"), n_reviews=Count("reviews")) gives BK-101 n_tags=2 though it has one tag and two reviews. What fixes the counts?', [
        ['Count("tags", distinct=True) and Count("reviews", distinct=True)', true],
        ['Adding .distinct() after the annotate() call', false],
        ['Swapping the order of the two Count expressions', false],
        ['Calling select_related("tags", "reviews") before the annotate call', false],
      ], 'Both joins happen in one query, so rows multiply (tags × reviews). distinct=True counts each related id once. queryset.distinct() removes duplicate result rows, not the inflation inside the GROUP BY.'),
      mcq('Product.objects.values("status").annotate(n=Count("id")) — what does it return?', [
        ['One dict per status with the number of products in it', true],
        ['Every product as a dict, each with n equal to 1', false],
        ['A single dict with the total count of products', false],
        ['A FieldError, because values() cannot be annotated', false],
      ], 'values() before annotate() sets the GROUP BY, so each result is a status and its count: DRAFT 1, LIVE 4, RETIRED 1 in the shop data.'),
      mcq('On MySQL, Product.objects.select_for_update().get(sku="KT-202") runs in a view with no atomic block and ATOMIC_REQUESTS off. What happens?', [
        ['TransactionManagementError: it cannot be used outside a transaction', true],
        ['The row stays locked until the HTTP response has been sent to the client', false],
        ['The row is locked until the next query commits', false],
        ['Django opens a transaction just for that SELECT', false],
      ], 'In autocommit a lock would be released the moment the SELECT committed, so Django raises instead. Wrap the read-check-write in transaction.atomic.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_ORM_DEBUGGING',
    notes: `ORM bugs come in two kinds: the ones that raise (read the exception — Django's messages name
the field and the model) and the ones that are silently wrong or slow (measure: print \`qs.query\`,
count queries with \`CaptureQueriesContext\` or the debug toolbar). Each fault below is real Django 5
behaviour.

## 1. "Product matching query does not exist" turns into a 500

    def product_detail(request, sku):
        product = Product.objects.get(sku=sku)

\`get()\` raises \`Product.DoesNotExist\` for an unknown SKU, and an unhandled exception is a 500.
Use \`get_object_or_404(Product, sku=sku)\` (or DRF's \`get_object()\`), which returns a 404.

## 2. "get() returned more than one Product -- it returned 3!"

\`get(category__slug="books")\` — the lookup is not unique. Use \`filter()\` for a list, or look up by a
field with \`unique=True\`. Never "fix" it with \`filter(...)[0]\`, which hides the duplicates.

## 3. The page got slow as the data grew

The debug toolbar shows 51 similar queries: \`SELECT ... FROM catalog_category WHERE id = %s\`. A
template, serializer or loop reads \`product.category\` per row. Add
\`select_related("category")\`; for tags or reviews, \`prefetch_related\`. Then pin the count with
\`django_assert_num_queries\`.

## 4. The prefetch is there, and the queries are still N+1

    qs = Product.objects.prefetch_related("reviews")
    for p in qs:
        good = p.reviews.filter(rating__gte=4)

\`.filter()\` on a prefetched relation makes a new query per object. Move the condition into
\`Prefetch("reviews", queryset=Review.objects.filter(rating__gte=4), to_attr="good_reviews")\`.

## 5. Stock goes wrong under load

\`product.stock -= qty; product.save()\` from two requests at once loses one update — and a full
\`save()\` also writes every other field back from a stale copy. Use
\`filter(pk=..., stock__gte=qty).update(stock=F("stock") - qty)\` and check the returned row count,
or \`select_for_update()\` inside \`atomic\`.

## 6. Half an order in the database

The order row exists with no items, because the item insert failed after the order insert and
Django was in autocommit. Wrap the steps in \`@transaction.atomic\`.

## 7. "You can't execute queries until the end of the 'atomic' block"

    with transaction.atomic():
        try:
            Tag.objects.create(name=name)
        except IntegrityError:
            pass
        ...more queries...

A database error inside \`atomic\` breaks the transaction. Wrap just the risky statement in its own
\`with transaction.atomic():\` (a savepoint) inside the try, or use \`get_or_create\`.

## 8. The count is too high

\`Product.objects.filter(tags__name__in=[...]).count()\` counts a product once per matching tag, and
\`annotate(Count("tags"), Count("reviews"))\` multiplies. Add \`.distinct()\` for the first,
\`Count(..., distinct=True)\` for the second.

## 9. A migration that will not apply

- \`fields.E320 ... on_delete=SET_NULL, but cannot be null\` — add \`null=True\`.
- \`It is impossible to add a non-nullable field ...\` — nullable, data migration, then required.
- \`IrreversibleError: Operation <RunPython ...> is not reversible\` — give a reverse function or
  \`RunPython.noop\`.
- \`InconsistentMigrationHistory\` or "table already exists" after someone edited an applied
  migration — restore the file from Git; never rewrite history that a shared database has run.

## How to work

Reproduce in \`python manage.py shell\` with real data, print \`qs.query\`, count the queries, change
**one** thing, measure again.`,
    mcqs: [
      mcq('The debug toolbar shows 50 near-identical queries SELECT ... FROM catalog_category WHERE id = %s on a product list page. What is the fix?', [
        ['select_related("category") on the list\'s queryset', true],
        ['An index on catalog_category.id', false],
        ['prefetch_related("products") on the Category queryset', false],
        ['Replacing filter() with get() in the view', false],
      ], 'One query per product to load its category is the N+1 pattern for a ForeignKey; select_related joins it into the product query. id is already the primary key, so an index changes nothing.'),
      mcq('A view does p = Product.objects.get(sku=sku) and a bad SKU produces a 500 page. What is the idiomatic fix in a Django view?', [
        ['p = get_object_or_404(Product, sku=sku)', true],
        ['p = Product.objects.filter(sku=sku)[0]', false],
        ['p = Product.objects.get(sku=sku) or None', false],
        ['p = Product.objects.filter(sku=sku).exists()', false],
      ], 'get_object_or_404 catches DoesNotExist and raises Http404. Indexing an empty queryset raises IndexError (still a 500), "or None" never runs because get() raises first, and exists() returns a bool.'),
      mcq('Orders sometimes exist with no items after a failed checkout. Code: order = Order.objects.create(...); then a loop creates OrderItems, one of which fails. What fixes it?', [
        ['Decorate the checkout function with @transaction.atomic', true],
        ['Call order.save() again after the loop finishes', false],
        ['Create the OrderItems first, then the order', false],
        ['Set ATOMIC_REQUESTS only for the admin site', false],
      ], 'In autocommit each create commits on its own, so the order survives the item failure. atomic makes the whole checkout one transaction that rolls back together.'),
      mcq('A migration fails with "IrreversibleError: Operation <RunPython <function fill_weights>> in catalog.0003 is not reversible" during migrate catalog 0002. What is the fix?', [
        ['Pass a reverse function, or RunPython.noop, to RunPython', true],
        ['Delete the 0003 row from django_migrations and run migrate again', false],
        ['Run migrate with --fake-initial to skip the step', false],
        ['Move fill_weights into the models.py of the app', false],
      ], 'RunPython without reverse_code cannot be un-applied. When undoing needs no work, RunPython(fill_weights, migrations.RunPython.noop) makes it reversible.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_ORM_PRACTICE',
    notes: `Work these in the shop project (\`catalog\` app) with the models from this topic. Use SQLite
for speed while you write them, then run them once against MySQL. For every exercise, print the SQL
(\`qs.query\`) and the query count (\`CaptureQueriesContext\`) — the count is part of the answer.

Seed: 3 categories (Books, Kitchen, Toys), 6 products as in the QuerySets unit, tags gift/eco/sale,
2 customers, 3 orders with 5 lines, 3 reviews. Write the seed as a management command
(\`catalog/management/commands/seed_shop.py\`) so you can rebuild it at will.

## Exercise 1 — A model change with data

Add \`Product.brand\` (CharField, required) to a database that already has products. Use three
migrations; the data migration sets brand from a dict keyed by SKU prefix (\`BK\` → "O'Reilly",
\`KT\` → "HomeCo") and has a no-op reverse. Show \`showmigrations\` before and after, and roll back to
the first one.

## Exercise 2 — The search queryset

\`search(q, category=None, min_price=None, max_price=None, tags=())\` returns LIVE products matching
every word of \`q\` in name or description, in the category slug if given, within the price range,
and having **any** of the tags — each product once. Test: \`search(tags=["gift", "eco"])\` must not
return KT-201 twice.

## Exercise 3 — Fix the N+1

This prints each order with its customer and lines. Measure it, fix it, measure again, and write a
test that pins the number:

    for o in Order.objects.all():
        print(o.id, o.customer.user.username, o.customer.city)
        for item in o.items.all():
            print("  ", item.product.sku, item.product.category.name, item.quantity)

Target: 2 queries regardless of the number of orders (the naive loop runs 20 on the seed).

## Exercise 4 — Reports

One queryset each:
- products per category, including Toys with 0, ordered by count descending;
- revenue per paid order (\`Sum(quantity * unit_price)\`);
- the number of distinct customers who bought each product;
- the average rating per product, only products with at least one review, best first.

## Exercise 5 — Checkout that cannot oversell

\`checkout(customer, lines: list[tuple[str, int]])\` creates an order with its items and lowers stock
for every line, or changes nothing at all. Lock the products with \`select_for_update()\` ordered by
id (so two checkouts lock in the same order), raise \`OutOfStock\` if any line cannot be met, and send
the confirmation through \`transaction.on_commit\`. Prove all-or-nothing with a test whose second line
is out of stock.

## Exercise 6 — Bulk import

Import 1,000 products from a CSV with \`bulk_create(batch_size=500)\`, then set their tags. Note what
\`bulk_create\` does not do (no \`save()\`, no signals) and how you get the new ids on MySQL (query
them back by SKU).

**Self-check:** no query inside a loop that you have not counted; every multi-step write in
\`atomic\`; every to-many aggregate checked for multiplication; every migration reversible.`,
    mcqs: [
      mcq('In Exercise 3, the loop runs on Order.objects.select_related("customer__user").prefetch_related("items__product__category"). How many queries is that?', [
        ['4 — orders, then one query per prefetch step', true],
        ['2 — the FK steps join into the items query', false],
        ['3 — the product and category steps share one', false],
        ['20 — prefetch_related cannot follow a reverse FK', false],
      ], 'Every step of a prefetch path is a separate query, even a ForeignKey step: items, products, categories. Prefetch("items", queryset=OrderItem.objects.select_related("product__category")) joins those steps and reaches 2.'),
      mcq('In Exercise 5, two checkouts both want the last unit of KT-202 at the same moment. With select_for_update() inside atomic, what happens?', [
        ['The second waits, then sees stock 0 and raises OutOfStock', true],
        ['Both read stock 1, and both orders are created', false],
        ['Both raise OutOfStock, since the row is locked', false],
        ['The second checkout fails at once with a lock error', false],
      ], 'The first SELECT ... FOR UPDATE holds the row lock until its transaction commits; the second blocks, then reads the committed stock of 0. nowait=True would make it fail immediately instead.'),
      mcq('In Exercise 6 on MySQL, objs = Product.objects.bulk_create(rows). What is objs[0].pk?', [
        ['None — MySQL does not return the generated ids', true],
        ['The new auto-increment id of the first inserted row', false],
        ['0, until refresh_from_db() is called on it', false],
        ['The SKU, since it is the unique field', false],
      ], 'Django can set primary keys after bulk_create only on PostgreSQL, MariaDB and SQLite 3.35+. On MySQL the objects come back without pk; query them by a unique field such as sku.'),
      mcq('In Exercise 4, Product.objects.annotate(r=Avg("reviews__rating")).filter(r__isnull=False).order_by("-r") — what SQL does the filter on r become?', [
        ['A HAVING clause on the grouped average', true],
        ['A WHERE clause on the reviews table', false],
        ['A subquery inside the SELECT list', false],
        ['A second query run after the first', false],
      ], 'A filter on an aggregate annotation applies to groups, so Django emits HAVING AVG(rating) IS NOT NULL. A filter placed before annotate() would become WHERE and limit which rows are averaged.'),
      mcq('In Exercise 1 a teammate already ran 0002 on staging, then edited 0002 in place to change a default. What is the right move?', [
        ['Revert the edit and add a new migration for the change', true],
        ['Run migrate --fake catalog 0002 on every database', false],
        ['Delete the row for 0002 from django_migrations', false],
        ['Keep the edit; migrate re-reads changed files', false],
      ], 'Applied migrations are history: migrate never re-runs them, so the edit only reaches fresh databases and the two diverge. A new migration applies the change everywhere.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_ORM_INTERVIEW_QUESTION',
    notes: `Three questions a Python backend interviewer asks about the Django ORM almost every time. Say
each answer aloud with an example from your shop project; two minutes each.

## Q1. "What is the N+1 problem, and what is the difference between select_related and prefetch_related?"

**Model answer.** N+1 is one query for a list and then one more per item for a related object —
listing 50 products and reading \`product.category\` costs 51 queries. I find it by counting: the
django-debug-toolbar SQL panel, or \`CaptureQueriesContext\` in a shell, and I pin the count in tests
with \`django_assert_num_queries\`. \`select_related\` fixes single-valued relations — ForeignKey and
OneToOne — with a SQL JOIN, so it is one query. \`prefetch_related\` handles many-valued ones —
ManyToMany and reverse ForeignKey — with one extra query using \`WHERE id IN (...)\`, joined in
Python. On the shop's order list I went from 15 queries to 3 with
\`select_related("customer__user").prefetch_related("items__product")\`.

**Follow-ups.** *"Why not JOIN the many-valued side too?"* — it repeats each parent row once per
child and multiplies with every extra relation. *"When does a prefetch not help?"* — when code calls
\`.filter()\` on the related manager; use a \`Prefetch\` object with a queryset and \`to_attr\`.

## Q2. "QuerySets are lazy — what does that mean, and when does a query actually run?"

**Model answer.** Building a queryset — \`filter\`, \`exclude\`, \`order_by\`, chaining — runs nothing; it
describes SQL. It runs when evaluated: iterating, \`list()\`, \`len()\`, \`bool()\`/\`if qs\`, slicing with
a step, \`repr()\` in the shell. Then the rows are cached on that queryset, so a second loop is free,
while \`count()\`, \`exists()\`, \`get()\`, \`first()\` and \`aggregate()\` run their own queries. Laziness
is why a view can add filters conditionally and still send one SELECT.

**Follow-ups.** *"exists() or if qs?"* — \`exists()\` if you will not use the rows, \`if qs\` if you
will (it fills the cache). *"What about iterator()?"* — streams without caching, for big exports.

## Q3. "How do you stop two users buying the last item?"

**Model answer.** The bug is read-check-write: both requests read stock 1, both pass the check, both
write 0. Two fixes. If the logic fits in one statement, a guarded update:
\`Product.objects.filter(pk=pk, stock__gte=qty).update(stock=F("stock") - qty)\` — the database
checks and decrements atomically, and a return value of 0 means "sold out". If it needs several steps,
\`transaction.atomic\` plus \`select_for_update()\`: the second request waits on the row lock and
then sees the new stock. Either way the order and its items are created in the same \`atomic\`
block, and the confirmation email goes in \`transaction.on_commit\`.

**Follow-ups.** *"What isolation level does Django use on MySQL?"* — READ COMMITTED by default since
Django 2.0, where InnoDB's own default is REPEATABLE READ. *"Deadlocks?"* — lock rows in a consistent
order (by id) and keep transactions short.

## How you are judged

Numbers (51 queries → 1), the relation type driving the choice, and naming the race in Q3 before the
fix.`,
    mcqs: [
      mcq('An interviewer asks which of these runs a database query. Which one?', [
        ['bool(Product.objects.filter(stock=0))', true],
        ['Product.objects.filter(stock=0).exclude(status="DRAFT")', false],
        ['Product.objects.filter(stock=0).order_by("sku")', false],
        ['Product.objects.filter(stock=0).select_related("category")', false],
      ], 'bool() evaluates the queryset, running the SELECT and filling its cache. Chaining exclude, order_by or select_related only returns new, still-unevaluated querysets.'),
      mcq('Asked why prefetch_related uses a second query instead of a JOIN for product tags, what is the strongest answer?', [
        ['A JOIN repeats each product per tag, and multiplies with more relations', true],
        ['MySQL does not support joins across the many-to-many link tables at all', false],
        ['A second query is always faster than any JOIN would be', false],
        ['Django cannot express a JOIN through a join table', false],
      ], 'Joining a to-many relation returns the parent row once per child, and two such joins multiply. Fetching children with WHERE id IN (...) keeps both result sets small. Django can join M2M tables when you filter across them.'),
      mcq('Product.objects.filter(pk=pk, stock__gte=2).update(stock=F("stock") - 2) returns 0. What does that tell the checkout code?', [
        ['There was not enough stock, and nothing changed', true],
        ['The update is queued until the transaction ends', false],
        ['Stock was lowered to 0 for that product', false],
        ['The product with that pk has been deleted', false],
      ], 'update() returns the number of rows matched. The stock__gte guard is part of the WHERE clause, so 0 means the condition failed (or the row is gone) and the decrement did not happen.'),
    ],
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_ORM_CHECKPOINT',
    notes: `Ten questions on the Django ORM as a backend interview examines it: models and migrations,
querysets and when they run, relations and on_delete, query counts, aggregates and transactions.
Each is about specific code on the shop's models — answer from what Django actually does.`,
    checkpoint: [
      mcq('After p.stock = F("stock") - 1; p.save(), the next line prints p.stock. What is printed?', [
        ['An expression object, not a number', true],
        ['The new stock value as an int', false],
        ['The old stock value as an int', false],
        ['None, until the transaction commits', false],
      ], 'save() sends the F expression to the database but leaves the attribute as the expression (a CombinedExpression). p.refresh_from_db() loads the computed value.'),
      mcq('Which pair of field options lets a product\'s discontinued_on date be absent both in the database and in admin forms?', [
        ['null=True, blank=True', true],
        ['blank=True only', false],
        ['null=True only', false],
        ['default=None only', false],
      ], 'A missing date must be stored as NULL (null=True) and accepted by validation (blank=True). blank alone leaves a NOT NULL column; null alone still fails form validation.'),
      mcq('qs = Product.objects.filter(status="LIVE"); for p in qs: ...; for p in qs: ... — how many queries do the two loops run?', [
        ['One', true],
        ['Two', false],
        ['None', false],
      ], 'The first loop evaluates the queryset and stores the rows in its result cache; the second loop reads the cache. A new Product.objects.filter(...) expression would query again.'),
      mcq('Product.objects.exclude(status="LIVE", stock=0) on the shop data — which products are left out?', [
        ['Only those that are LIVE and also have stock 0', true],
        ['Those that are LIVE, or have stock 0, or both', false],
        ['Only those that are neither LIVE nor out of stock', false],
        ['None, as exclude() takes a single keyword', false],
      ], 'exclude() negates the whole AND: NOT (status = LIVE AND stock = 0). Only BK-102 is LIVE with no stock, so the other five are returned.'),
      mcq('Deleting a User with Review.author on_delete=SET_NULL and Customer.user on_delete=CASCADE — what happens to his reviews and his customer row?', [
        ['Reviews stay with author NULL; the customer row is deleted', true],
        ['Both the reviews and the customer row are deleted', false],
        ['Reviews are deleted; the customer row stays with user NULL', false],
        ['The delete is refused while either kind of row exists', false],
      ], 'Each relation follows its own rule: SET_NULL keeps the review and clears the link, CASCADE removes the customer (and, through its own CASCADEs, its orders and items).'),
      mcq('Which queryset runs exactly one query for "every product with its category name" over 50 products?', [
        ['Product.objects.select_related("category")', true],
        ['Product.objects.prefetch_related("category")', false],
        ['Product.objects.defer("category")', false],
        ['Product.objects.all().distinct()', false],
      ], 'select_related joins the category in the same SELECT. prefetch_related works but needs a second query, and the other two still load each category on access.'),
      mcq('A data migration must use the Product model. Which line belongs inside the RunPython function?', [
        ['Product = apps.get_model("catalog", "Product")', true],
        ['from catalog.models import Product', false],
        ['Product = schema_editor.get_model("Product")', false],
        ['Product = django.apps.Product', false],
      ], 'apps.get_model returns the historical version of the model for that migration\'s point in history. Importing the current class can reference fields that do not exist yet; the other two are not real APIs.'),
      mcq('Category.objects.annotate(n=Count("products", filter=Q(products__status="LIVE"))) — what is n for Toys, which has no products?', [
        ['0', true],
        ['None', false],
        ['Toys is missing from the result', false],
        ['1', false],
      ], 'annotate across a reverse FK uses a LEFT OUTER JOIN, so categories without products are kept, and COUNT over no matching rows is 0 (unlike SUM, which gives None).'),
      mcq('A nested with transaction.atomic(): block inside another raises IntegrityError, and the outer block catches it around the inner block. What is rolled back?', [
        ['Only the inner block\'s work, back to its savepoint', true],
        ['Everything since the outer block started', false],
        ['Nothing, since the error was caught in time', false],
        ['The inner block\'s work, plus the next statement', false],
      ], 'An inner atomic is a savepoint. Leaving it with an exception rolls back to the savepoint, and the outer transaction carries on and can commit its own work.'),
      mcq('A queryset runs filter(price__range=(300, 700)) on the shop products priced 349, 650, 899, 499, 275 and 1299. Which prices match?', [
        ['349, 650 and 499', true],
        ['349 and 499 only', false],
        ['349, 650, 499 and 275', false],
        ['650 and 899 only', false],
      ], '__range becomes BETWEEN 300 AND 700, which is inclusive at both ends: 349, 650 and 499 fall inside, 275, 899 and 1299 do not.'),
    ],
  },
];
