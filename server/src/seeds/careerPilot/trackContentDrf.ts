/**
 * Career-track content: Django REST Framework (JT_DRF), for Python Full Stack + AI.
 *
 * Django 5.x with Django REST Framework 3.15+, django-filter and drf-spectacular. One product
 * catalogue API (categories, products, reviews) grows through the topic and ends as the mini project
 * on MySQL through mysqlclient. React is wired to this API later in the track.
 *
 * Every serializer, view, validation, pagination, filter and schema behaviour claimed here was run
 * with APIClient / APIRequestFactory on Django 5.2 and DRF 3.18 (SQLite stands in for MySQL; nothing
 * claimed depends on the database). Error texts are DRF's own, copied from those runs.
 *
 * Attribution: the topic declares DJANGO_REST and REST_APIS and defaults to DJANGO_REST. A checkpoint
 * question that measures HTTP and REST design (status codes, verbs, PUT vs PATCH) names REST_APIS
 * with ck(); the rest take the default. Practice mcqs name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_DRF_BUNDLES: PilotBundle[] = [
  /* ── SERIALIZERS ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DRF_SERIALIZERS',
    notes: `Plain Django renders HTML from templates. An API instead sends and receives **JSON**, and something
has to turn a \`Product\` model instance into a dict (for the response) and an untrusted dict from
the request into a validated \`Product\` (for the database). In Django REST Framework (DRF) that
something is a **serializer**. It does both directions, and it validates on the way in.

    pip install djangorestframework        # 3.15+ for Django 5.x
    # settings.py
    INSTALLED_APPS = [..., "rest_framework", "catalog"]

The models this topic works with:

    # catalog/models.py
    from django.db import models

    class Category(models.Model):
        name = models.CharField(max_length=60, unique=True)
        slug = models.SlugField(unique=True)

    class Product(models.Model):
        sku = models.CharField(max_length=20, unique=True)
        name = models.CharField(max_length=120)
        price = models.DecimalField(max_digits=10, decimal_places=2)
        stock = models.PositiveIntegerField(default=0)
        category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
        is_active = models.BooleanField(default=True)
        created = models.DateTimeField(auto_now_add=True)

        class Meta:
            constraints = [models.UniqueConstraint(fields=["category", "name"],
                                                   name="uniq_name_per_category")]

    class Review(models.Model):
        product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="reviews")
        rating = models.PositiveSmallIntegerField()
        text = models.CharField(max_length=300, blank=True)

## Serializer: every field by hand

A plain \`serializers.Serializer\` is like a Django form for JSON — you declare each field:

    from rest_framework import serializers

    class StockCheckSerializer(serializers.Serializer):
        sku = serializers.CharField(max_length=20)
        qty = serializers.IntegerField(min_value=1)

Use it for input that is **not** a model: a search request, a "check stock" body, a login form. It
has no idea how to save — calling \`save()\` raises \`NotImplementedError: \`create()\` must be
implemented.\` until you write \`create()\` (and \`update()\`) yourself.

## ModelSerializer: fields generated from the model

    class ProductSerializer(serializers.ModelSerializer):
        class Meta:
            model = Product
            fields = ["id", "sku", "name", "price", "stock", "category", "created"]
            read_only_fields = ["created"]

\`print(repr(ProductSerializer()))\` shows what DRF generated, and it is worth doing once:

    id = BigIntegerField(label='ID', read_only=True)
    sku = CharField(max_length=20, validators=[<UniqueValidator(queryset=Product.objects.all())>])
    name = CharField(max_length=120, required=True)
    price = DecimalField(decimal_places=2, max_digits=10)
    stock = IntegerField(max_value=..., min_value=0, required=False)
    category = PrimaryKeyRelatedField(queryset=Category.objects.all(), required=True)
    created = DateTimeField(read_only=True)
    class Meta:
        validators = [<UniqueTogetherValidator(queryset=Product.objects.all(), fields=('category', 'name'))>]

So \`unique=True\` became a \`UniqueValidator\`, the \`UniqueConstraint\` became a
\`UniqueTogetherValidator\`, \`PositiveIntegerField\` became \`min_value=0\`, \`default=0\` made \`stock\`
optional, and the foreign key became a **primary-key** field: clients send \`"category": 1\`.

\`fields\` (or \`exclude\`) is **required**. Leaving both out is an \`AssertionError\` since DRF 3.3, and
\`fields = "__all__"\` exposes every column — including the ones you add next year. List fields
explicitly in anything public.

## Two directions

**Out (serialising):** pass an instance (or a queryset with \`many=True\`) and read \`.data\`:

    ProductSerializer(product).data
    # {'id': 1, 'sku': 'BK-1', 'name': 'Clean Code', 'price': '499.00', 'stock': 3,
    #  'category': 1, 'created': '2026-10-14T08:12:50.038498Z'}

    ProductSerializer(Product.objects.all(), many=True).data    # a list of those dicts

Note \`"price": "499.00"\` is a **string**: DRF renders \`Decimal\` as a string by default
(\`COERCE_DECIMAL_TO_STRING\`) so no precision is lost in JSON. Forgetting \`many=True\` on a queryset
gives \`AttributeError: Got AttributeError when attempting to get a value for field \`name\` on
serializer ... QuerySet\`.

**In (deserialising):** pass \`data=\`, call \`is_valid()\`, then read \`validated_data\` or \`errors\`:

    s = ProductSerializer(data={"sku": "BK-2", "name": "Refactoring", "price": "abc", "category": 99})
    s.is_valid()     # False
    s.errors
    # {'price': ['A valid number is required.'],
    #  'category': ['Invalid pk "99" - object does not exist.']}

All field errors are collected in one pass — the client sees every problem at once, not the first.
Reading \`.data\` or calling \`.save()\` before \`is_valid()\` is an \`AssertionError\`
("You must call \`.is_valid()\` before calling \`.save()\`"). Keys the serializer does not know
(\`"junk": 1\`) and read-only fields (\`"created"\`) in the input are **silently ignored**.

## save(), create() and update()

\`save()\` calls \`create(validated_data)\` when the serializer was built without an instance, and
\`update(instance, validated_data)\` when it was built with one. \`ModelSerializer\` implements both:

    s = ProductSerializer(data=payload)
    s.is_valid(raise_exception=True)
    product = s.save()                       # INSERT -> returns the Product

    s = ProductSerializer(product, data={"price": "450.00"}, partial=True)
    s.is_valid(raise_exception=True)
    s.save()                                 # UPDATE only the price

Without \`partial=True\` an update needs every required field — the "PUT replaces the whole resource"
rule. \`save(**kwargs)\` merges extra values the client must not choose:
\`serializer.save(created_by=request.user)\`.

## Controlling fields

    class ProductSerializer(serializers.ModelSerializer):
        category = serializers.SlugRelatedField(slug_field="slug", queryset=Category.objects.all())
        category_name = serializers.CharField(source="category.name", read_only=True)
        in_stock = serializers.SerializerMethodField()

        class Meta:
            model = Product
            fields = ["id", "sku", "name", "price", "category", "category_name", "in_stock"]
            extra_kwargs = {"sku": {"write_only": True}}

        def get_in_stock(self, obj) -> bool:
            return obj.stock > 0

- **\`read_only_fields\`** — output only. It applies to *generated* fields only: a field you declare
  yourself ignores it, so mark declared fields with \`read_only=True\` directly.
- **\`extra_kwargs\`** — tweak a generated field without redeclaring it; \`{"write_only": True}\` for
  values accepted on input but never returned (passwords, internal codes).
- **\`source\`** — a different attribute, or a dotted path across relations: \`"category.name"\`.
- **\`SerializerMethodField\`** — read-only, computed by \`get_<name>(self, obj)\`. Always read-only.
- **\`SlugRelatedField\`** — the relation as a readable unique value (\`"category": "books"\`); an
  unknown slug gives \`Object with slug=toys does not exist.\` \`PrimaryKeyRelatedField\` (the
  default) gives \`Invalid pk "99" - object does not exist.\` or \`Incorrect type. Expected pk value,
  received str.\`

## Nested serializers

    class ReviewSerializer(serializers.ModelSerializer):
        class Meta:
            model = Review
            fields = ["id", "rating", "text"]

    class ProductDetailSerializer(serializers.ModelSerializer):
        reviews = ReviewSerializer(many=True, read_only=True)
        class Meta:
            model = Product
            fields = ["id", "name", "price", "reviews"]

Output: \`{'id': 1, 'name': 'Clean Code', 'price': '499.00', 'reviews': [{'id': 1, 'rating': 5,
'text': 'great'}]}\`. (\`Meta.depth = 1\` nests every relation automatically — quick, but you lose
control of which fields leak.)

**Writable nested** is where people get stuck. Drop \`read_only=True\` and the input validates, but
\`save()\` fails:

    AssertionError: The \`.create()\` method does not support writable nested fields by default.
    Write an explicit \`.create()\` method for serializer ..., or set \`read_only=True\` on nested
    serializer fields.

DRF cannot guess how child rows relate to the parent, so you pop the nested data and write it
yourself, inside a transaction (the worked example). Many teams avoid writable nesting and give
reviews their own endpoint instead.

## to_representation

Override \`to_representation(self, instance)\` to reshape output once all fields are read — call
\`super()\`, then change the dict. Use sparingly; most shaping belongs in fields.

## What a serializer does not do

It does not call the model's \`clean()\` or \`full_clean()\`. Field validators and unique checks are
copied over, but a rule written only in \`Model.clean()\` is skipped. Put API rules in the serializer
(the validation unit).`,
    workedExample: `**Problem:** \`POST /api/products/\` should accept a product together with its first reviews,
and return the product with the reviews nested:

    {"sku": "BK-2", "name": "Refactoring", "price": "650.00", "category": 1,
     "reviews": [{"rating": 4, "text": "ok"}, {"rating": 5}]}

**Solution:**

    from django.db import transaction
    from rest_framework import serializers
    from .models import Product, Review

    class ReviewSerializer(serializers.ModelSerializer):
        class Meta:
            model = Review
            fields = ["id", "rating", "text"]

    class ProductWithReviewsSerializer(serializers.ModelSerializer):
        reviews = ReviewSerializer(many=True)

        class Meta:
            model = Product
            fields = ["id", "sku", "name", "price", "category", "reviews"]

        def create(self, validated_data):
            reviews = validated_data.pop("reviews", [])
            with transaction.atomic():
                product = Product.objects.create(**validated_data)
                Review.objects.bulk_create(Review(product=product, **r) for r in reviews)
            return product

Running it:

    s = ProductWithReviewsSerializer(data=payload)
    s.is_valid()        # True
    s.save()
    s.data
    # {'id': 2, 'sku': 'BK-2', 'name': 'Refactoring', 'price': '650.00', 'category': 1,
    #  'reviews': [{'id': 1, 'rating': 4, 'text': 'ok'}, {'id': 2, 'rating': 5, 'text': ''}]}

**Reasoning:**

- \`validated_data["reviews"]\` is a list of dicts (already validated by \`ReviewSerializer\`), so it is
  popped before \`Product.objects.create(**validated_data)\` — \`Product\` has no \`reviews\` argument.
- \`transaction.atomic()\`: if a review insert fails, the product is rolled back too. No orphan rows.
- \`s.data\` after \`save()\` re-reads \`product.reviews\`, which is why the generated ids appear.
- A bad child, \`"reviews": [{"rating": "x"}]\`, fails \`is_valid()\` with the error nested under the
  item's index — recent DRF (3.18 here) reports \`{'reviews': {0: {'rating': ['A valid integer is
  required.']}}}\`; older versions returned a list with an empty \`{}\` for each valid item.
- \`update()\` is still the default, which raises the same "writable nested" error if \`reviews\` is
  sent on a PUT/PATCH. Either implement \`update()\` or document that reviews change through
  \`/api/reviews/\`.`,
    mcqs: [
      mcq('ProductSerializer lists "created" in read_only_fields. A client POSTs a valid product that also contains "created": "2020-01-01T00:00:00Z". What happens?', [
        ['It saves, and created is set by auto_now_add, not the client', true],
        ['It returns 400 saying created is a read-only field', false],
        ['It saves the product with created set to 1 January 2020', false],
        ['It raises a 500 because the field cannot be assigned', false],
      ], 'Read-only fields are left out of validated_data, so DRF silently ignores them on input. The model then fills created itself; no error is raised for the extra key.'),
      mcq('A view does s = ProductSerializer(data=request.data) and immediately return Response(s.data). What does DRF do?', [
        ['Raises AssertionError: call .is_valid() before reading .data', true],
        ['Returns the request data unchanged with status 200', false],
        ['Validates automatically and returns the cleaned data', false],
        ['Returns an empty dict because nothing was saved yet', false],
      ], 'With data= the serializer refuses to produce .data until is_valid() has run, and the AssertionError says so. Validation is never implicit in DRF.'),
      mcq('category = serializers.SlugRelatedField(slug_field="slug", queryset=Category.objects.all()). A POST sends "category": "toys" and no category has that slug. What is in serializer.errors?', [
        ['{"category": ["Object with slug=toys does not exist."]}', true],
        ['{"category": ["Invalid pk \\"toys\\" - object does not exist."]}', false],
        ['{"non_field_errors": ["Category matching query does not exist."]}', false],
        ['Nothing; a new Category with slug toys is created', false],
      ], 'SlugRelatedField looks the value up by its slug_field and reports a missing object under the field name. The "Invalid pk" text belongs to PrimaryKeyRelatedField, and related objects are never created.'),
    ],
    checkpoint: [
      mcq('A ModelSerializer exposes price = models.DecimalField(max_digits=10, decimal_places=2). With default settings, how does a price of 499 appear in the JSON response?', [
        ['"price": "499.00"', true],
        ['"price": 499.00 as a JSON number', false],
        ['"price": 499', false],
        ['"price": "499"', false],
      ], 'DRF formats Decimal values to the field\'s decimal_places and renders them as strings (COERCE_DECIMAL_TO_STRING is True) so that JSON numbers never lose precision.'),
      mcq('ProductSerializer declares reviews = ReviewSerializer(many=True) with no read_only and no create() override. A valid POST with two reviews reaches serializer.save(). What happens?', [
        ['AssertionError: create() does not support writable nested fields', true],
        ['The product and both reviews are saved in one transaction', false],
        ['The product is saved and the reviews are silently dropped', false],
        ['is_valid() fails first with a non_field_errors message', false],
      ], 'Validation succeeds, but ModelSerializer.create() refuses nested data it cannot map to the model. Write create() that pops reviews and saves them, or mark the nested field read_only=True.'),
      mcq('class S(serializers.ModelSerializer): sku = serializers.CharField(); class Meta: model = Product; fields = ["id", "sku", "name"]; read_only_fields = ["sku"]. Is sku accepted on input?', [
        ['Yes — read_only_fields does not apply to declared fields', true],
        ['No — read_only_fields wins and sku is ignored on every input', false],
        ['No — DRF raises an error about the conflicting settings', false],
        ['Only on update, because create always ignores it', false],
      ], 'read_only_fields and extra_kwargs only adjust fields that ModelSerializer generates. A field declared on the class is used exactly as declared, so it must be given read_only=True itself.'),
    ],
  },

  /* ── VIEWS_VIEWSETS ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DRF_VIEWS_VIEWSETS',
    notes: `A serializer knows JSON; a **view** knows HTTP. DRF offers four levels of view, each one less code
than the last and each one hiding more. Knowing all four is what lets you drop down a level when the
shortcut stops fitting.

## Level 1: @api_view and APIView

    from django.shortcuts import get_object_or_404
    from rest_framework import status
    from rest_framework.decorators import api_view
    from rest_framework.response import Response
    from rest_framework.views import APIView

    @api_view(["GET"])
    def health(request):
        return Response({"status": "ok"})

    class ProductDetailAPIView(APIView):
        def get(self, request, pk):
            product = get_object_or_404(Product, pk=pk)
            return Response(ProductSerializer(product).data)

        def delete(self, request, pk):
            get_object_or_404(Product, pk=pk).delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

What DRF adds over a plain Django view:

- **\`request.data\`** — the parsed body, whether JSON, form data or multipart. A body that is not
  valid JSON returns \`400 {"detail": "JSON parse error - ..."}\`; a content type no parser handles
  returns \`415 Unsupported media type\`.
- **\`Response(data, status=...)\`** — content negotiation renders it as JSON (or the browsable API
  in a browser). An \`Accept\` header nothing can satisfy gets \`406\`.
- **Method checking** — \`@api_view(["GET"])\` answers a POST with
  \`405 {"detail": "Method \\"POST\\" not allowed."}\`; an \`APIView\` does the same for any method it has
  no handler for.
- **Exceptions become responses** — \`get_object_or_404\` raises \`Http404\`, which DRF turns into
  \`404 {"detail": "No Product matches the given query."}\`.
- Authentication, permissions and throttling hooks (the security topic).

Use the \`status\` constants (\`status.HTTP_201_CREATED\`) rather than bare numbers; they read like
the spec.

## Level 2: GenericAPIView plus mixins

Every list/create/retrieve/update/delete endpoint repeats the same steps. **\`GenericAPIView\`** holds
the shared configuration (\`queryset\`, \`serializer_class\`, \`get_object()\`, \`get_serializer()\`,
pagination and filtering) and the **mixins** supply the actions:

    from rest_framework import generics, mixins

    class ProductList(mixins.ListModelMixin, mixins.CreateModelMixin, generics.GenericAPIView):
        queryset = Product.objects.order_by("id")
        serializer_class = ProductSerializer

        def get(self, request, *args, **kwargs):
            return self.list(request, *args, **kwargs)

        def post(self, request, *args, **kwargs):
            return self.create(request, *args, **kwargs)

| Mixin | Method | Success |
|---|---|---|
| \`ListModelMixin.list\` | GET collection | 200 |
| \`CreateModelMixin.create\` | POST | **201** with the created object |
| \`RetrieveModelMixin.retrieve\` | GET one | 200 |
| \`UpdateModelMixin.update\` / \`partial_update\` | PUT / PATCH | 200 |
| \`DestroyModelMixin.destroy\` | DELETE | **204**, empty body |

## Level 3: concrete generic views

The common combinations are prebuilt: \`ListAPIView\`, \`CreateAPIView\`, **\`ListCreateAPIView\`**,
\`RetrieveAPIView\`, **\`RetrieveUpdateDestroyAPIView\`** and others.

    class ProductListCreate(generics.ListCreateAPIView):
        queryset = Product.objects.select_related("category").order_by("id")
        serializer_class = ProductSerializer

    class ProductDetail(generics.RetrieveUpdateDestroyAPIView):
        queryset = Product.objects.all()
        serializer_class = ProductSerializer

    # urls.py
    urlpatterns = [
        path("api/products/", ProductListCreate.as_view()),
        path("api/products/<int:pk>/", ProductDetail.as_view()),
    ]

Customise with hooks rather than rewriting methods: \`get_queryset()\` (e.g. only the user's rows),
\`get_serializer_class()\` (a lighter serializer for lists), \`perform_create(serializer)\`
(\`serializer.save(created_by=self.request.user)\`), \`perform_update\`, \`perform_destroy\`.

## Level 4: ViewSets and routers

A **ViewSet** puts the list and detail endpoints in one class, with *actions* instead of methods:

    from rest_framework import viewsets
    from rest_framework.decorators import action

    class ProductViewSet(viewsets.ModelViewSet):
        queryset = Product.objects.select_related("category").order_by("id")
        serializer_class = ProductSerializer

        @action(detail=True, methods=["post"])
        def deactivate(self, request, pk=None):
            product = self.get_object()
            product.is_active = False
            product.save(update_fields=["is_active"])
            return Response({"id": product.id, "is_active": False})

        @action(detail=False)
        def low_stock(self, request):
            qs = self.get_queryset().filter(stock__lt=5)
            return Response(self.get_serializer(qs, many=True).data)

    class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
        queryset = Category.objects.all()
        serializer_class = CategorySerializer

A **router** writes the URLs:

    # urls.py
    from rest_framework.routers import DefaultRouter

    router = DefaultRouter()
    router.register("products", ProductViewSet)
    router.register("categories", CategoryViewSet)
    urlpatterns = [path("api/", include(router.urls))]

| URL | Name | Methods |
|---|---|---|
| \`/api/products/\` | \`product-list\` | GET (list), POST (create) |
| \`/api/products/{pk}/\` | \`product-detail\` | GET, PUT, PATCH, DELETE |
| \`/api/products/{pk}/deactivate/\` | \`product-deactivate\` | POST |
| \`/api/products/low_stock/\` | \`product-low-stock\` | GET |
| \`/api/\` | \`api-root\` | GET — links to every registered list |

- \`ModelViewSet\` = all five actions; \`ReadOnlyModelViewSet\` = list and retrieve only, so a POST to
  \`/api/categories/\` gets **405**.
- \`@action\` **requires** \`detail\` (\`True\` = on one object, URL includes \`{pk}\`; \`False\` = on the
  collection). \`methods\` defaults to GET. The URL uses the method name; the URL *name* swaps
  underscores for dashes.
- The URL-name prefix (the **basename**) comes from \`queryset.model\` — \`product\`. A viewset with
  only \`get_queryset()\` and no \`queryset\` attribute makes \`register()\` fail with "\`basename\`
  argument not specified"; pass \`basename="product"\`.
- \`DefaultRouter\` adds the API root and \`.json\` format suffixes; \`SimpleRouter\` does not.
- Routes end in a slash. \`GET /api/products\` (no slash) is a 404 unless \`CommonMiddleware\` with
  \`APPEND_SLASH\` redirects it — and it cannot redirect a POST.

## Which level?

ViewSets for plain CRUD resources (most of a catalogue). Generic views when an endpoint is not CRUD
on one model or URLs must be spelled out. \`APIView\` for things that are not a resource at all — a
health check, a "checkout" command. Mixing them in one project is normal.`,
    workedExample: `**Problem:** the catalogue needs \`GET /api/products/\` (light list: id, name, price),
\`GET /api/products/{id}/\` (full detail), create/update/delete, and \`POST /api/products/{id}/restock/\`
with \`{"quantity": 10}\` that adds stock and returns the product.

**Solution:**

    class ProductListSerializer(serializers.ModelSerializer):
        class Meta:
            model = Product
            fields = ["id", "name", "price"]

    class RestockSerializer(serializers.Serializer):
        quantity = serializers.IntegerField(min_value=1, max_value=1000)

    class ProductViewSet(viewsets.ModelViewSet):
        queryset = Product.objects.select_related("category").order_by("id")

        def get_serializer_class(self):
            if self.action == "list":
                return ProductListSerializer
            if self.action == "restock":
                return RestockSerializer
            return ProductSerializer

        @action(detail=True, methods=["post"])
        def restock(self, request, pk=None):
            product = self.get_object()                       # 404 if no such product
            body = self.get_serializer(data=request.data)
            body.is_valid(raise_exception=True)               # 400 on a bad quantity
            Product.objects.filter(pk=product.pk).update(
                stock=F("stock") + body.validated_data["quantity"])
            product.refresh_from_db()
            return Response(ProductSerializer(product).data, status=status.HTTP_200_OK)

    router.register("products", ProductViewSet)

**Checking it with APIClient:**

    client = APIClient()
    client.get("/api/products/").json()[0]       # {'id': 1, 'name': 'Clean Code', 'price': '499.00'}
    r = client.post("/api/products/1/restock/", {"quantity": 10}, format="json")
    r.status_code, r.json()["stock"]            # 200, 13
    client.post("/api/products/1/restock/", {"quantity": 0}, format="json").status_code   # 400
    client.get("/api/products/1/restock/").status_code                                   # 405

**Reasoning:**

- \`self.action\` holds the action name (\`list\`, \`retrieve\`, \`create\`, \`restock\`...), so one hook
  picks the serializer; the list stays light without a second endpoint.
- The restock body is validated by a plain \`Serializer\` — input that is not a model still deserves
  validation and a proper 400.
- \`F("stock") + n\` makes the database do the addition, so two restocks at once cannot overwrite each
  other (the ORM topic's race condition).
- The action returns 200, not 201: it changed an existing resource; nothing new was created.`,
    mcqs: [
      mcq('CategoryViewSet extends viewsets.ReadOnlyModelViewSet and is registered with a DefaultRouter at "categories". What does POST /api/categories/ return?', [
        ['405 Method Not Allowed', true],
        ['201 Created with the new category', false],
        ['404 Not Found, as no POST route exists', false],
        ['403 Forbidden for every client', false],
      ], 'The router still maps /api/categories/ (for GET list), but the viewset has no create action, so DRF answers the POST with 405 and "Method \\"POST\\" not allowed."'),
      mcq('ProductViewSet is registered as router.register("products", ProductViewSet) and has @action(detail=True, methods=["post"]) def mark_featured(self, request, pk=None). Which URL and URL name does DefaultRouter create?', [
        ['/api/products/{pk}/mark_featured/ named product-mark-featured', true],
        ['/api/products/mark_featured/{pk}/ named product-mark_featured', false],
        ['/api/mark_featured/{pk}/ named products-mark-featured', false],
        ['No URL; @action methods must be added to urls.py by hand', false],
      ], 'A detail action goes after the object\'s pk and uses the method name as the path. The URL name is basename plus the name with underscores turned into dashes.'),
      mcq('A generics.ListCreateAPIView receives a valid POST. Which response does CreateModelMixin produce?', [
        ['201 with the serialized new object', true],
        ['200 with the serialized new object', false],
        ['204 with an empty response body', false],
        ['302 redirecting to the new object', false],
      ], 'CreateModelMixin.create validates, calls perform_create and returns Response(serializer.data, status=201). 204 is what DestroyModelMixin returns after a delete.'),
    ],
    checkpoint: [
      ck('REST_APIS', 'A client sends DELETE /api/products/2/ to a ModelViewSet and product 2 exists. What comes back?', [
        ['204 No Content with an empty body', true],
        ['200 OK with the deleted product\'s JSON', false],
        ['202 Accepted with {"deleted": true}', false],
        ['200 OK with {"detail": "Deleted."}', false],
      ], 'DestroyModelMixin deletes the object and returns status 204 with no body, the standard answer when a request succeeded and there is nothing to send back.'),
      mcq('A viewset defines only get_queryset() (scoped to the current user) and no queryset attribute. router.register("orders", OrderViewSet) fails at import. What is the fix?', [
        ['Pass basename="order" to router.register', true],
        ['Switch to SimpleRouter, which never asks for a basename', false],
        ['Rename get_queryset to queryset so the router finds it', false],
        ['Add the viewset to INSTALLED_APPS so it is discovered', false],
      ], 'The router derives URL names from queryset.model. Without a queryset attribute it raises "basename argument not specified", and any router needs it passed explicitly.'),
      ck('REST_APIS', 'PUT /api/products/1/ with only {"price": "399.00"} is sent to a ModelViewSet whose serializer requires sku, name and category. What is the response?', [
        ['400 listing sku, name and category as required', true],
        ['200 with only the price changed', false],
        ['200 with the other fields set to null', false],
        ['405, because only PATCH can change a price', false],
      ], 'PUT replaces the resource, so DRF validates it as a full update and every required field must be present. PATCH (partial_update) would accept the price alone and return 200.'),
    ],
  },

  /* ── VALIDATION_ERRORS ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DRF_VALIDATION_ERRORS',
    notes: `Every request body is untrusted. DRF validates in layers, and knowing the order tells you where each
rule belongs and why some rules seem not to run.

## The order inside is_valid()

1. **Field-level built-ins** — type conversion, \`required\`, \`max_length\`, \`min_value\`,
   \`max_digits\`/\`decimal_places\`, field \`validators=[...]\` (including the generated
   \`UniqueValidator\`).
2. **\`validate_<field>(self, value)\`** — your rule for one field, run only if step 1 passed for it.
3. **Serializer \`Meta.validators\`** (such as \`UniqueTogetherValidator\`) and **\`validate(self,
   attrs)\`** — rules across fields. These run **only if every field passed**.

Errors from steps 1–2 are collected for all fields at once.

## Field-level: validate_<field>

    class ProductSerializer(serializers.ModelSerializer):
        class Meta:
            model = Product
            fields = ["id", "sku", "name", "price", "stock", "category", "is_active"]

        def validate_sku(self, value):
            value = value.strip().upper()
            if not value.startswith(("BK-", "EL-")):
                raise serializers.ValidationError("SKU must start with BK- or EL-.")
            return value                     # the returned value is what gets saved

        def validate_price(self, value):
            if value <= 0:
                raise serializers.ValidationError("Price must be positive.")
            return value

\`" bk-5 "\` is stored as \`"BK-5"\` — a validator may **normalise** as well as reject, and must
return the value. Forgetting \`return value\` stores \`None\`.

A bad SKU and a bad price give both messages together:

    {'sku': ['SKU must start with BK- or EL-.'], 'price': ['Price must be positive.']}

## Object-level: validate()

    def validate(self, attrs):
        if attrs.get("is_active", True) and attrs.get("stock", 0) == 0 and attrs["price"] > 10000:
            raise serializers.ValidationError("An expensive product cannot be active with no stock.")
        return attrs

A plain message lands under **\`non_field_errors\`** (the key is the \`NON_FIELD_ERRORS_KEY\`
setting). To blame one field, raise with a dict:

    raise serializers.ValidationError({"end": "End must be after start."})
    # errors: {'end': ['End must be after start.']}

On a \`partial=True\` update, \`attrs\` holds only the fields sent — read missing ones from
\`self.instance\`.

## Uniqueness across fields

\`ModelSerializer\` turns \`unique=True\` into \`UniqueValidator\` and a \`UniqueConstraint\` (or
\`unique_together\`) into **\`UniqueTogetherValidator\`**:

    {'non_field_errors': ['The fields category, name must make a unique set.']}

For a rule the model does not declare, add it yourself:

    from rest_framework.validators import UniqueTogetherValidator

    class Meta:
        model = Review
        fields = ["product", "author", "rating", "text"]
        validators = [UniqueTogetherValidator(queryset=Review.objects.all(),
                                              fields=["product", "author"],
                                              message="You have already reviewed this product.")]

Every field named must be in the serializer. These checks are a **friendly early answer**, not a
guarantee: two simultaneous requests can both pass them, so keep the database constraint too and
treat its \`IntegrityError\` as the last word.

## raise_exception=True

    serializer = ProductSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)      # raises ValidationError -> 400
    serializer.save()

DRF's view machinery turns a \`ValidationError\` raised **anywhere** in a view into a 400 — including
from \`perform_create\` or \`perform_destroy\`:

    def perform_destroy(self, instance):
        if instance.stock > 0:
            raise ValidationError({"stock": "Cannot delete a product with stock."})
        instance.delete()

(Raised outside a serializer, the message stays a plain string: \`{"stock": "Cannot delete..."}\`.)

## Exceptions and status codes

| Raise | Status |
|---|---|
| \`ValidationError\` | 400 |
| \`ParseError\` (malformed JSON) | 400 |
| \`NotAuthenticated\` / \`AuthenticationFailed\` | 401 (or 403, depending on the auth scheme) |
| \`PermissionDenied\` | 403 |
| \`NotFound\`, Django's \`Http404\` | 404 |
| \`MethodNotAllowed\` | 405 |
| your \`APIException\` subclass | its \`status_code\` |

    from rest_framework.exceptions import APIException

    class OutOfStock(APIException):
        status_code = 409
        default_detail = "Product is out of stock."
        default_code = "out_of_stock"

Anything else (\`KeyError\`, \`IntegrityError\`, \`RuntimeError\`) is **not** handled: it becomes a 500,
an HTML debug page with \`DEBUG=True\`.

## One error shape: a custom EXCEPTION_HANDLER

Out of the box the shapes differ — \`{"price": [...]}\` for validation, \`{"detail": "..."}\` for the
rest. A frontend wants one shape. Wrap DRF's handler:

    # catalog/exceptions.py
    from rest_framework.exceptions import ValidationError
    from rest_framework.views import exception_handler

    def api_exception_handler(exc, context):
        response = exception_handler(exc, context)      # DRF's default first
        if response is None:
            return None                                  # not an API error: let it be a 500
        if isinstance(exc, ValidationError):
            body = {"code": "validation_error", "message": "Invalid input.", "fields": response.data}
        else:
            detail = response.data.get("detail", "")
            body = {"code": getattr(detail, "code", "error"), "message": str(detail), "fields": {}}
        response.data = body
        return response

    # settings.py
    REST_FRAMEWORK = {"EXCEPTION_HANDLER": "catalog.exceptions.api_exception_handler"}

Results, run with APIClient:

    400 {'code': 'validation_error', 'message': 'Invalid input.',
         'fields': {'sku': ['SKU must start with BK- or EL-.'], 'name': ['This field is required.']}}
    404 {'code': 'not_found', 'message': 'No Product matches the given query.', 'fields': {}}
    409 {'code': 'out_of_stock', 'message': 'Product is out of stock.', 'fields': {}}

Note \`return None\` for non-API exceptions: the handler does not swallow bugs. Turn them into a JSON
500 with logging in production if you must, but never hide the traceback from your logs, and never
send it to the client.`,
    mcqs: [
      mcq('ProductSerializer has validate_sku and validate_price, and both reject a POST that has a bad SKU and a negative price. What does serializer.errors contain?', [
        ['Both messages, one under sku and one under price', true],
        ['Only the sku message, because validation stops there', false],
        ['Only the price message, the last validator to run', false],
        ['One combined message under non_field_errors', false],
      ], 'DRF runs field validation for every field and collects all failures before returning, so the client can fix everything in one round trip. non_field_errors is for object-level failures.'),
      mcq('A serializer defines validate(self, attrs) with a print at the top. A POST arrives where "qty" is "abc" for an IntegerField. Is the print reached?', [
        ['No — validate() runs only after every field passed', true],
        ['Yes — validate() always runs, and sees qty as None', false],
        ['Yes — validate() runs first, before any field checks', false],
        ['No — a TypeError stops the request before validation', false],
      ], 'Object-level validation needs clean values for all fields, so DRF skips validate() (and Meta validators) when any field failed. The response holds only the qty error.'),
      mcq('Product has UniqueConstraint(fields=["category", "name"]). A POST repeats an existing name in the same category. Which error does the ModelSerializer report?', [
        ['non_field_errors: The fields category, name must make a unique set.', true],
        ['name: product with this name already exists in the database.', false],
        ['An IntegrityError from MySQL, shown as a 500 response', false],
        ['Nothing; the duplicate is saved and the constraint is ignored', false],
      ], 'ModelSerializer turns the constraint into a UniqueTogetherValidator, which checks before saving and reports under non_field_errors, so the client gets a 400 instead of a database error.'),
    ],
    checkpoint: [
      mcq('With the custom handler from this unit (it returns None when DRF\'s handler does), a view raises RuntimeError("boom"). DEBUG is True. What does the client receive?', [
        ['A 500 with Django\'s HTML error page', true],
        ['A 400 in the {"code", "message", "fields"} shape', false],
        ['A 500 in the {"code", "message", "fields"} shape', false],
        ['A 200 with an empty JSON body', false],
      ], 'DRF\'s exception_handler only handles APIException and Http404/PermissionDenied. For anything else it returns None, so the error escapes to Django, which renders its debug page as a 500.'),
      mcq('def validate_sku(self, value): if not value.startswith("BK-"): raise serializers.ValidationError("Bad SKU") — and nothing else. A valid SKU "BK-9" is posted. What is saved as sku?', [
        ['None, because the method never returns the value', true],
        ['"BK-9", since a validator only has to raise on errors', false],
        ['"BK-9" upper-cased, the default for CharField', false],
        ['Nothing; DRF raises an error about the missing return', false],
      ], 'Whatever validate_<field> returns replaces the field\'s value in validated_data. Falling off the end returns None, which then fails at the database or saves an empty value.'),
      ck('REST_APIS', 'Checkout must refuse an order when stock ran out between viewing and paying. The team adds class OutOfStock(APIException) and raises it. Which status_code fits best?', [
        ['409 Conflict', true],
        ['500 Internal Server Error', false],
        ['404 Not Found', false],
        ['401 Unauthorized', false],
      ], 'The request is well formed and the product exists, but it conflicts with the current state of the resource, which is what 409 means. 500 would blame the server, and 401 is about credentials.'),
    ],
  },

  /* ── PAGINATION_FILTERING ──────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DRF_PAGINATION_FILTERING',
    notes: `A list endpoint that returns every row works on the first day and breaks the day the table has
200,000 rows: the response takes seconds, uses megabytes, and the phone app freezes. Every list
endpoint in a real API is **paged**, and usually filterable, searchable and sortable.

## Pagination

Set a default for the whole API:

    REST_FRAMEWORK = {
        "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
        "PAGE_SIZE": 20,
    }

Or a class per view, to let clients choose the size within a cap:

    from rest_framework.pagination import PageNumberPagination

    class ProductPagination(PageNumberPagination):
        page_size = 20
        page_size_query_param = "page_size"   # ?page_size=50
        max_page_size = 100                   # never more than this

    class ProductViewSet(viewsets.ModelViewSet):
        queryset = Product.objects.select_related("category").order_by("id")
        pagination_class = ProductPagination

The response changes shape — the list moves into \`results\`:

    GET /api/products/?page=2
    {"count": 57,
     "next": "http://localhost:8000/api/products/?page=3",
     "previous": "http://localhost:8000/api/products/",
     "results": [ ... 20 products ... ]}

A page past the end or a non-number (\`?page=99\`, \`?page=abc\`) is **404 \`{"detail": "Invalid
page."}\`**. \`?page_size=500\` is quietly cut to \`max_page_size\`.

| Style | Query | Good for |
|---|---|---|
| \`PageNumberPagination\` | \`?page=3\` | Numbered pages in a UI; has \`count\` |
| \`LimitOffsetPagination\` | \`?limit=20&offset=40\` | Clients that think in offsets |
| \`CursorPagination\` | \`?cursor=cD0yMDI2...\` | Infinite scroll, feeds, huge or fast-changing tables |

\`CursorPagination\` needs a stable, unique-ish **\`ordering\`** (default \`"-created"\`), returns only
\`next\`/\`previous\` (no \`count\`, no jumping to page 7), and stays correct when rows are inserted
while someone scrolls — page-number paging would show an item twice. It is also fast on deep pages,
because it filters (\`WHERE created < ...\`) instead of \`OFFSET 200000\`.

**Order the queryset.** Paging an unordered queryset logs \`UnorderedObjectListWarning:
Pagination may yield inconsistent results with an unordered object_list\` — without \`ORDER BY\`, the
database may return rows in a different order per query, so pages overlap or skip.

Paging costs two queries: a \`COUNT(*)\` and a \`SELECT ... LIMIT 20\` (cursor paging skips the count).
Use \`select_related\` for foreign keys the serializer reads, or each row adds a query.

## Filtering with django-filter

    pip install django-filter
    INSTALLED_APPS += ["django_filters"]

    from django_filters.rest_framework import DjangoFilterBackend
    from rest_framework import filters

    class ProductViewSet(viewsets.ModelViewSet):
        queryset = Product.objects.select_related("category").order_by("id")
        serializer_class = ProductSerializer
        filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
        filterset_fields = ["category__slug", "is_active"]   # ?category__slug=books&is_active=true
        search_fields = ["name", "sku"]                         # ?search=python
        ordering_fields = ["price", "name", "created"]          # ?ordering=-price
        ordering = ["id"]                                       # default order

\`filterset_fields\` does **nothing** unless \`DjangoFilterBackend\` is in \`filter_backends\` (or in
\`DEFAULT_FILTER_BACKENDS\`) — the parameter is silently ignored and every row comes back. And
setting \`filter_backends\` on a view **replaces** the default list, it does not add to it.

For ranges and friendly names, write a \`FilterSet\`:

    import django_filters

    class ProductFilter(django_filters.FilterSet):
        min_price = django_filters.NumberFilter(field_name="price", lookup_expr="gte")
        max_price = django_filters.NumberFilter(field_name="price", lookup_expr="lte")
        category = django_filters.CharFilter(field_name="category__slug")

        class Meta:
            model = Product
            fields = ["is_active"]

    class ProductViewSet(viewsets.ModelViewSet):
        filterset_class = ProductFilter        # instead of filterset_fields

\`?min_price=400&max_price=1000\` filters the range; \`?min_price=abc\` is a **400**
\`{"min_price": ["Enter a number."]}\`. Unknown parameters are ignored.

## Search

\`SearchFilter\` makes \`?search=\` match **any** of \`search_fields\` with a case-insensitive contains
(\`icontains\`). Several words are split on spaces and commas and **all** must match:
\`?search=python keyboard\` finds "Python Keyboard" and "Keyboard Python Cover", not "Python Crash
Course". Prefixes change the lookup: \`"^name"\` starts-with, \`"=sku"\` exact (case-insensitive),
\`"@name"\` full-text (PostgreSQL only). On MySQL, \`icontains\` with a leading wildcard cannot use a
B-tree index — fine for thousands of rows, a full-text index or a search engine for millions.

## Ordering

\`OrderingFilter\` reads \`?ordering=price\`, \`?ordering=-price\`, or several: \`?ordering=-price,name\`.
A field **not** in \`ordering_fields\` is ignored (the default \`ordering\` is used) — set
\`ordering_fields\` explicitly; leaving it out allows any readable serializer field, which can mean
sorting on an unindexed column.

## They compose

\`/api/products/?category__slug=books&search=python&ordering=price&page=2\` — the backends run in
order (filter, search, sort), then pagination slices the result. \`count\` is the count *after*
filtering. All of it happens in \`self.filter_queryset(self.get_queryset())\`, which the generic
\`list()\` calls; a hand-written \`list()\` or \`@action\` that skips \`filter_queryset\` silently loses
every filter.`,
    mcqs: [
      mcq('A viewset uses PageNumberPagination with page_size 2 and the table holds 5 products. What does GET /api/products/?page=9 return?', [
        ['404 with {"detail": "Invalid page."}', true],
        ['200 with "results": [] and "count": 5', false],
        ['200 with the last page, holding 1 product', false],
        ['400 with {"page": ["Out of range."]}', false],
      ], 'PageNumberPagination raises NotFound for a page that does not exist, so the client gets a 404 rather than an empty page. A page number that is not a number gives the same response.'),
      mcq('ProductPagination sets page_size = 2, page_size_query_param = "page_size" and max_page_size = 3. With 5 products, how many come back for ?page_size=50?', [
        ['3', true],
        ['5', false],
        ['2', false],
        ['50', false],
      ], 'The client may choose a page size through page_size_query_param, but never above max_page_size. The request is capped silently rather than refused.'),
      mcq('A ListAPIView sets filterset_fields = ["category__slug"] but filter_backends = [filters.SearchFilter]. What does ?category__slug=books return?', [
        ['Every product; the parameter is ignored', true],
        ['Only the products in the books category', false],
        ['400 because the filter is not allowed', false],
        ['An ImproperlyConfigured error at startup', false],
      ], 'filterset_fields is read only by DjangoFilterBackend. With that backend missing from filter_backends, nothing looks at the parameter and the unfiltered list is returned.'),
    ],
    checkpoint: [
      mcq('A viewset has OrderingFilter with ordering_fields = ["price", "name"] and ordering = ["id"]. What does ?ordering=stock do?', [
        ['It is ignored, and results come back in id order', true],
        ['It sorts by stock, since stock is a real model field', false],
        ['It returns 400 because stock is not allowed', false],
        ['It returns the rows in random database order', false],
      ], 'OrderingFilter drops any term not in ordering_fields and falls back to the view\'s default ordering. No error is raised, so a typo in a sort parameter goes unnoticed by the client.'),
      mcq('search_fields = ["name", "sku"]. Products are "Python Crash Course", "Python Keyboard" and "Keyboard Python Cover". Which match ?search=python keyboard?', [
        ['"Python Keyboard" and "Keyboard Python Cover"', true],
        ['All three, since each one contains "python"', false],
        ['None; the whole phrase must appear in a field', false],
        ['Only "Python Keyboard", as words must be in order', false],
      ], 'SearchFilter splits the query into terms and requires every term to match some search field (icontains). Word order does not matter, and "Python Crash Course" lacks "keyboard".'),
      mcq('An app shows an infinitely scrolling feed of products while new ones are added every few seconds. Why is CursorPagination a better fit than PageNumberPagination here?', [
        ['New rows do not shift items between pages', true],
        ['It returns a total count with every page', false],
        ['It lets the user jump straight to page 50', false],
        ['It needs no ordering on the queryset at all', false],
      ], 'A cursor marks a position in a fixed ordering, so inserts do not push items onto the next page and cause duplicates. It gives up count and random page access, and it requires an ordering.'),
    ],
  },

  /* ── OPENAPI ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DRF_OPENAPI',
    notes: `The React developer (often you, next month) needs to know every endpoint, its parameters, the body
it accepts and the shapes it returns — including errors. **OpenAPI** is the standard machine-readable
description of an HTTP API; **Swagger UI** renders it as a page where you can read and try each
endpoint. In DRF, **drf-spectacular** generates the OpenAPI 3 schema from your serializers and views.
(DRF's own built-in schema generation is deprecated; drf-spectacular is the maintained choice.)

## Setup

    pip install drf-spectacular

    # settings.py
    INSTALLED_APPS += ["drf_spectacular"]

    REST_FRAMEWORK = {
        "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
        # ... pagination, filters, EXCEPTION_HANDLER
    }

    SPECTACULAR_SETTINGS = {
        "TITLE": "Catalogue API",
        "DESCRIPTION": "Products, categories and reviews for the shop.",
        "VERSION": "1.0.0",
        "SERVE_INCLUDE_SCHEMA": False,     # hide /api/schema/ from its own docs
    }

    # urls.py
    from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

    urlpatterns += [
        path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
        path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
        path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    ]

\`/api/schema/\` serves the schema as YAML (\`application/vnd.oai.openapi\`; \`?format=json\` for JSON).
\`/api/docs/\` is a Swagger UI page that loads it from the URL named \`schema\`. Forget
\`DEFAULT_SCHEMA_CLASS\` and the schema view fails with \`AssertionError: Incompatible AutoSchema used
on View ... Is DRF's DEFAULT_SCHEMA_CLASS pointing to "drf_spectacular.openapi.AutoSchema"\`.

## What it infers on its own

For generic views and viewsets with a \`serializer_class\` it gets a lot right:

- Paths and methods from the URLconf: \`/api/products/\`, \`/api/products/{id}/\`, actions such as
  \`/api/products/{id}/deactivate/\`.
- Request and response bodies from the serializer. \`ProductSerializer\` becomes the component
  **\`Product\`** (the \`Serializer\` suffix is dropped), and PATCH gets **\`PatchedProduct\`** with
  no required fields.
- \`read_only\` fields marked \`readOnly\`, \`write_only\` ones \`writeOnly\`, required fields listed,
  \`DecimalField\` as a decimal string with a pattern.
- Status codes: 201 for create, 204 for delete. Pagination, filter, search and ordering query
  parameters from the configured classes.
- \`operationId\`s like \`products_list\` and \`products_partial_update\`, which client generators use
  as function names.

## Where it needs help

Generation prints warnings and errors to the console. **Read them**; each is a hole in the docs.

**A \`SerializerMethodField\` without a return type:**

    Warning [ProductViewSet > ProductSerializer]: unable to resolve type hint for function
    "get_in_stock". Consider using a type hint or @extend_schema_field. Defaulting to string.

Fix with a type hint, \`def get_in_stock(self, obj) -> bool:\`, and the schema says \`boolean\`. For
complex returns use \`@extend_schema_field(OpenApiTypes.OBJECT)\` or a serializer.

**An \`APIView\` or \`@api_view\` without a serializer:**

    Error [StatsView]: unable to guess serializer. This is graceful fallback handling for APIViews.

The path still appears, but its 200 says "No response body". Describe it:

    from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter, OpenApiExample

    class StatsSerializer(serializers.Serializer):
        products = serializers.IntegerField()
        out_of_stock = serializers.IntegerField()

    class StatsView(APIView):
        @extend_schema(responses=StatsSerializer, summary="Catalogue counts")
        def get(self, request):
            ...

**Actions with their own body, errors, and extra parameters:**

    class ErrorSerializer(serializers.Serializer):      # the one error shape from the last unit
        code = serializers.CharField()
        message = serializers.CharField()
        fields = serializers.DictField()

    @extend_schema_view(
        list=extend_schema(summary="List products",
                           parameters=[OpenApiParameter("in_stock", bool, description="Only products with stock")]),
    )
    class ProductViewSet(viewsets.ModelViewSet):
        ...
        @extend_schema(request=None,
                       responses={200: ProductSerializer, 404: ErrorSerializer, 409: ErrorSerializer},
                       summary="Deactivate a product")
        @action(detail=True, methods=["post"])
        def deactivate(self, request, pk=None):
            ...

\`request=None\` says the action takes no body. Listing error responses with the error serializer is
what makes the docs honest: a client generated from them knows a 409 carries \`code\` and
\`message\`. \`OpenApiExample\` adds sample bodies, \`tags=["catalogue"]\` groups operations, and
\`@extend_schema(exclude=True)\` hides internal endpoints.

## In the workflow

    python manage.py spectacular --file schema.yml --validate

Run it in CI and commit \`schema.yml\`: the diff in a pull request then shows every API change, and
\`--validate\` (with \`--fail-on-warn\`) stops a build whose docs have holes. In production, decide
whether \`/api/docs/\` is public — it is a full map of your API; many teams restrict it to staff or
to non-production environments.`,
    mcqs: [
      mcq('ProductSerializer has in_stock = SerializerMethodField() with def get_in_stock(self, obj): return obj.stock > 0. What does drf-spectacular put in the schema for in_stock?', [
        ['A read-only string, plus a warning about the missing type hint', true],
        ['A read-only boolean, inferred from the returned comparison', false],
        ['Nothing; method fields are left out of the generated schema', false],
        ['An error that stops the schema from being generated at all', false],
      ], 'drf-spectacular cannot run the method, so it relies on the return annotation. Without one it warns and defaults to string; adding -> bool or @extend_schema_field fixes it.'),
      mcq('An APIView named StatsView has a get() that returns Response({"products": 57}) and no serializer_class. What does the generated documentation show for it?', [
        ['The path, but its 200 response has no body described', true],
        ['Nothing at all; the path is missing from the generated schema', false],
        ['A full response schema inferred from the dict keys', false],
        ['A 500 error when /api/schema/ is requested', false],
      ], 'drf-spectacular logs "unable to guess serializer" and documents the operation without a response schema. Adding @extend_schema(responses=StatsSerializer) fills it in.'),
      mcq('ProductViewSet uses ProductSerializer. Which component names does drf-spectacular create for its request and response bodies?', [
        ['Product, plus PatchedProduct for PATCH', true],
        ['ProductSerializer, plus ProductSerializerPartial', false],
        ['ProductViewSet, plus ProductViewSetUpdate', false],
        ['products_list, plus products_partial_update', false],
      ], 'Component names drop the Serializer suffix, and the partial variant gets a Patched prefix with no required fields. products_list and products_partial_update are operationIds, not components.'),
    ],
    checkpoint: [
      mcq('A project adds drf-spectacular URLs but leaves REST_FRAMEWORK without DEFAULT_SCHEMA_CLASS. What happens when /api/schema/ is requested?', [
        ['It fails with "Incompatible AutoSchema used on View"', true],
        ['It returns an empty schema with no paths in it', false],
        ['It serves DRF\'s legacy schema in place of OpenAPI 3', false],
        ['It works, as drf-spectacular sets the setting itself', false],
      ], 'drf-spectacular reads each view\'s schema object, which comes from DEFAULT_SCHEMA_CLASS. With DRF\'s default class it raises an AssertionError that names the missing setting.'),
      mcq('An action is decorated with @extend_schema(request=None, responses={200: ProductSerializer, 409: ErrorSerializer}). What does the generated operation document?', [
        ['No request body; a 200 with Product and a 409 with the error shape', true],
        ['A request body of Product, and a 200 response with no body at all', false],
        ['A null JSON body that must be sent, and only the 200 response', false],
        ['Only the 409 response, because it overrides the default 200', false],
      ], 'request=None tells drf-spectacular the operation takes no body, and the responses dict lists each status with its serializer, so clients see both the success and the conflict shapes.'),
      mcq('Why run "python manage.py spectacular --file schema.yml --validate" in CI and commit schema.yml?', [
        ['The diff shows API changes, and validation catches broken docs', true],
        ['It makes the API run faster, since the schema is precomputed', false],
        ['Django refuses to start unless a committed schema.yml exists', false],
        ['It turns on request validation against the schema at runtime', false],
      ], 'A committed schema makes every contract change visible in review, and --validate fails the build on an invalid schema. drf-spectacular documents the API; it does not validate requests at runtime.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DRF_DEBUGGING',
    notes: `DRF errors are unusually helpful: most are \`AssertionError\`s or \`ImproperlyConfigured\` with a
sentence telling you the fix. Read the last line of the traceback before changing anything, and
reproduce with \`APIClient\` in a test or the shell so you see the exact status and body.

## 1. Forgot many=True

    return Response(ProductSerializer(Product.objects.all()).data)

\`AttributeError: Got AttributeError when attempting to get a value for field \`name\` on serializer
\`ProductSerializer\`. ... not match any attribute or key on the \`QuerySet\` instance.\` The serializer
was given a queryset and looked for \`.name\` on it. **Fix:** \`ProductSerializer(qs, many=True)\`.

## 2. A field declared but not listed

    class ProductSerializer(serializers.ModelSerializer):
        in_stock = serializers.SerializerMethodField()
        class Meta:
            model = Product
            fields = ["id", "name"]

\`AssertionError: The field 'in_stock' was declared on serializer ProductSerializer, but has not been
included in the 'fields' option.\` **Fix:** add it to \`fields\`. The cousin: a name in \`fields\` that
the model lacks — \`ImproperlyConfigured: Field name \`title\` is not valid for model \`Product\`\` —
and a \`SerializerMethodField\` with no \`get_<name>\` method — \`AttributeError: ... has no attribute
'get_in_stock'\`. Both appear the first time \`.data\` is read, not at import.

## 3. Writable nested save

\`AssertionError: The \`.create()\` method does not support writable nested fields by default.\`
**Fix:** \`read_only=True\` on the nested serializer, or write \`create()\`/\`update()\` that pop the
nested data and save it in \`transaction.atomic()\`.

## 4. The filter that does nothing

\`?category__slug=books\` returns every product. The view sets \`filterset_fields\` but its
\`filter_backends\` lacks \`DjangoFilterBackend\` (or a hand-written \`list()\`/\`@action\` never calls
\`self.filter_queryset(...)\`). Unknown parameters and disallowed \`ordering\` fields are ignored
silently, so there is no error to see. **Fix:** add the backend; call \`filter_queryset\`; write a
test asserting the filtered count.

## 5. A 200 with the errors in it

    serializer = ProductSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors)            # status 200!

The frontend shows "Saved!" for an invalid product. **Fix:** \`is_valid(raise_exception=True)\`, or
\`Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)\`.

## 6. The validator that wiped the value

A product saves with \`sku = NULL\` (or MySQL complains "Column 'sku' cannot be null"). \`validate_sku\`
checks the value but has no \`return value\`. **Fix:** return the (normalised) value from every
\`validate_<field>\`, and \`attrs\` from \`validate()\`.

## 7. Router errors at import

\`AssertionError: \`basename\` argument not specified, and could not automatically determine the name
from the viewset, as it does not have a \`.queryset\` attribute.\` The viewset uses only
\`get_queryset()\`. **Fix:** \`router.register("orders", OrderViewSet, basename="order")\`. And
\`@action(methods=["post"])\` without \`detail\` fails with \`@action() missing required argument:
'detail'\`.

## 8. Test client posts that never arrive as JSON

    client.post("/api/products/", {"name": "X", "reviews": [{"rating": 4}]})

\`AssertionError: Test data contained a dictionary value for key ..., but multipart uploads do not
support nested data\` — or, with flat data, a body parsed as a form instead of JSON. **Fix:**
\`format="json"\` (or \`TEST_REQUEST_DEFAULT_FORMAT = "json"\` in \`REST_FRAMEWORK\`).

## Also common

- **N+1 queries** — a list of 20 products issued 21+ queries because the serializer reads
  \`category.name\`. Check with \`django.test.utils.CaptureQueriesContext\` or the debug toolbar; fix
  with \`select_related\` / \`prefetch_related\` in the view's queryset.
- **415 Unsupported Media Type** — the client sent \`Content-Type: text/plain\` or forgot the header.
- **A 500 instead of a 400 for a duplicate** — the unique rule exists only in the database, so the
  \`IntegrityError\` escapes. Declare it on the model (so a validator is generated) or validate it.

## Method

Reproduce with APIClient and print \`response.status_code, response.json()\`; \`print(repr(Serializer()))\`
to see the generated fields; \`str(queryset.query)\` for the SQL a filter built. Fix one thing, keep the
failing request as a test.`,
    mcqs: [
      mcq('A list view returns Response(ProductSerializer(Product.objects.all()).data) and fails with "Got AttributeError when attempting to get a value for field name ... QuerySet". What is wrong?', [
        ['many=True is missing for a queryset', true],
        ['The name field is not in Meta.fields', false],
        ['The queryset needs select_related()', false],
        ['is_valid() must be called before .data', false],
      ], 'Without many=True the serializer treats the queryset as one object and asks it for .name. many=True makes a ListSerializer that serializes each product in turn.'),
      mcq('A create view does: if not s.is_valid(): return Response(s.errors). The frontend reports that invalid products "save successfully". Why?', [
        ['The errors are sent with the default status 200', true],
        ['is_valid() saves the object even when invalid', false],
        ['Response() drops the errors from the body', false],
        ['The browser caches the previous success response', false],
      ], 'Response defaults to 200, so the client sees success with an error body. Use is_valid(raise_exception=True) or pass status=400 so the failure is visible in the status code.'),
      mcq('An APIClient test calls client.post("/api/products/", {"name": "X", "reviews": [{"rating": 4}]}) and gets an AssertionError about multipart and nested data. What is the fix?', [
        ['Pass format="json" to the post call', true],
        ['Mark the reviews field read_only=True', false],
        ['Add MultiPartParser to the view parsers', false],
        ['Wrap the dict in json.dumps() first', false],
      ], 'APIClient encodes data as multipart by default, which cannot hold nested dicts. format="json" sends a JSON body; json.dumps alone would also need content_type set.'),
      mcq('?category__slug=books returns every product, even ones in other categories. The view sets filterset_fields = ["category__slug"]. Which cause should you check first?', [
        ['DjangoFilterBackend missing from filter_backends', true],
        ['The slug field is missing an index in MySQL', false],
        ['The pagination class ignores query parameters', false],
        ['django-filter supports only exact id lookups', false],
      ], 'filterset_fields is read only by DjangoFilterBackend; without the backend the parameter is ignored silently. django-filter handles lookups across relations, and pagination keeps query parameters.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DRF_PRACTICE',
    notes: `Work these in one Django project (\`catalog\` app, the models from this topic) with DRF,
django-filter and drf-spectacular installed. Use SQLite while you practise; nothing here depends on
MySQL. Check every exercise with \`APIClient\` — in a pytest test or \`python manage.py shell\` —
printing the status code and the JSON, not by eyeballing code.

## Exercise 1 — Serializer by hand, then generated

Write \`CategorySerializer\` as a plain \`Serializer\` (\`id\` read-only, \`name\`, \`slug\`) with
\`create()\` and \`update()\`. Then replace it with a \`ModelSerializer\` and print \`repr()\` of both.
List what the generated one added that you had forgotten (hint: uniqueness).

## Exercise 2 — Shaping output

\`ProductSerializer\` returns \`category\` as its slug (writable), \`category_name\` (read-only via
\`source\`), \`in_stock\` (a typed \`SerializerMethodField\`) and accepts \`sku\` on input without
returning it. Confirm \`"price"\` is a string in the JSON and that \`"created"\` sent by a client is
ignored.

## Exercise 3 — Four styles, one endpoint

Implement \`GET/POST /products/\` four times: \`@api_view\`, \`APIView\`, \`GenericAPIView\` + mixins,
and \`ListCreateAPIView\`. Run the same five APIClient requests against each (list, valid create,
invalid create, wrong method, malformed JSON) and confirm identical status codes: 200, 201, 400, 405,
400.

## Exercise 4 — A ViewSet with actions

\`ProductViewSet\` (\`ModelViewSet\`) and \`CategoryViewSet\` (\`ReadOnlyModelViewSet\`) on a
\`DefaultRouter\`. Add \`@action(detail=True, methods=["post"]) restock\` with a validated body, and
\`@action(detail=False) low_stock\`. Print \`router.urls\` and match each URL name to a request.

## Exercise 5 — Validation and one error shape

\`validate_sku\` (normalise to upper case; must start \`BK-\` or \`EL-\`), \`validate_price\` (> 0),
\`validate()\` (an active product with price over 10,000 needs stock), a 409 \`OutOfStock\` exception,
and the custom \`EXCEPTION_HANDLER\`. Write one test per error type asserting the body is
\`{"code", "message", "fields"}\`.

## Exercise 6 — Lists that scale, documented

Add \`ProductPagination\` (20 per page, client may ask up to 100), a \`ProductFilter\` with
\`min_price\`/\`max_price\`/\`category\`, \`search_fields\` and \`ordering_fields\`. Seed 60 products and
assert: page 4 is 404, \`?page_size=500\` returns 100 at most, a combined
filter+search+ordering query gives the expected ids in order, and the list makes 2 queries
(\`CaptureQueriesContext\`). Then add drf-spectacular, open \`/api/docs/\`, and remove every warning
from \`manage.py spectacular --validate\`.

**Self-check:** every write path validates with \`raise_exception=True\`; every list is ordered and
paged; every status code is one you chose on purpose.`,
    mcqs: [
      mcq('In Exercise 3 the @api_view(["GET", "POST"]) version receives a body that is not valid JSON with Content-Type application/json. What does it return?', [
        ['400 with a JSON parse error message', true],
        ['415 Unsupported Media Type', false],
        ['500, because json.loads raised', false],
        ['200 with request.data as an empty dict', false],
      ], 'DRF\'s JSONParser raises ParseError for a malformed body, which becomes a 400 with "JSON parse error - ...". 415 is for a content type that no parser accepts.'),
      mcq('In Exercise 2, sku has extra_kwargs {"write_only": True}. A client creates a product with sku "BK-7". Which statement about the 201 response is true?', [
        ['The product is saved with BK-7, but sku is not in the body', true],
        ['The response body includes sku, as it was just sent in', false],
        ['The request fails, since write-only fields need a password', false],
        ['sku is stored as null because write-only fields are skipped', false],
      ], 'write_only fields are accepted and validated on input and saved like any other field, but left out whenever the serializer produces output.'),
      mcq('In Exercise 4 the @action low_stock builds its list from Product.objects.filter(stock__lt=5) instead of self.get_queryset(). What is lost?', [
        ['The viewset\'s queryset settings, such as select_related', true],
        ['The router URL, so low_stock returns 404', false],
        ['The serializer, so the response is empty', false],
        ['Nothing at all; both querysets behave the same', false],
      ], 'Starting from get_queryset() keeps whatever the viewset does to its queryset: select_related, ordering and (later) per-user scoping. A fresh Product.objects query bypasses all of it.'),
      mcq('In Exercise 5 a POST has an invalid sku and also breaks the rule checked in validate(). What does the 400 body list under "fields"?', [
        ['Only the sku error, since validate() is skipped', true],
        ['The sku error and the validate() message', false],
        ['Only the validate() message under non_field_errors', false],
        ['Nothing; the handler drops field-level errors', false],
      ], 'Object-level validation runs only when every field is valid, so the client first sees the field error and meets the cross-field rule after fixing it.'),
      mcq('In Exercise 6 the products queryset has select_related("category") and the list is paged. How many SQL queries does one list request make?', [
        ['2: a COUNT and a SELECT with a JOIN', true],
        ['1: the SELECT with a LIMIT and JOIN', false],
        ['21: one per product plus the list', false],
        ['3: count, products and categories', false],
      ], 'PageNumberPagination counts the filtered rows for "count" and then selects one page; select_related joins the category into that same SELECT, so no per-row queries follow.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DRF_INTERVIEW_QUESTION',
    notes: `Three questions a Python backend interview asks about DRF. Answer each in under two minutes, and
mention one thing you have actually seen go wrong.

## Q1. "What is a serializer in DRF, and when would you use Serializer instead of ModelSerializer?"

**Model answer.** A serializer converts between Python objects and JSON-friendly data in both
directions, and validates input on the way in: \`is_valid()\` fills \`validated_data\` or \`errors\`, and
\`save()\` calls \`create()\` or \`update()\`. \`ModelSerializer\` generates the fields, validators
(including unique and unique-together checks) and default \`create()\`/\`update()\` from a model, so
CRUD on a model is a few lines. I use a plain \`Serializer\` for input that is not a model — a login
body, a "restock" command, a report filter — and I list \`fields\` explicitly rather than \`__all__\`
so a new column never leaks. For related data I nest read-only serializers in output and accept ids or
slugs on input, because writable nested serializers need hand-written \`create()\` and \`update()\`.

**Follow-ups:** *"How do you return a computed value?"* — \`SerializerMethodField\` with a typed
\`get_<name>\`, or a model property with \`source\`. *"Does it run model \`clean()\`?"* — No; API rules
go in the serializer, and database constraints stay as the backstop.

## Q2. "APIView, generic views or ViewSets — how do you choose?"

**Model answer.** They are levels of the same thing. \`APIView\` gives me request parsing, \`Response\`
negotiation and exception handling, and I write each method — right for endpoints that are not CRUD,
like a checkout or a health check. Generic views add \`get_object\`, \`get_serializer\`, pagination and
filtering, and the mixins implement list/create/retrieve/update/destroy with the correct status codes
(201 on create, 204 on delete). ViewSets group the list and detail endpoints of one resource and a
router generates the URLs, with \`@action\` for extra operations like \`/products/{id}/deactivate/\`.
I default to ViewSets for resources, customise through hooks — \`get_queryset\`,
\`get_serializer_class\`, \`perform_create\` — and drop a level when the shortcut fights me.

**Follow-ups:** *"How do you give list and detail different serializers?"* — \`get_serializer_class\`
switching on \`self.action\`. *"PUT vs PATCH?"* — PUT replaces and needs every required field; PATCH
is \`partial=True\`.

## Q3. "How do you make a list endpoint production-ready?"

**Model answer.** First, never return everything: pagination by default, page number for numbered
UIs or cursor pagination for feeds and very large tables, with \`max_page_size\` capping what a client
can ask for. The queryset is always ordered, or pages overlap. Filtering through django-filter with
explicit \`filterset_fields\` or a \`FilterSet\` for ranges, \`SearchFilter\` on a few indexed fields,
and \`OrderingFilter\` restricted to \`ordering_fields\` so nobody sorts on an unindexed column. Then
query count: \`select_related\`/\`prefetch_related\` so a page is two queries, not twenty-one, checked
in a test. And it is documented with drf-spectacular so the frontend knows the parameters and the
error shape.

**Follow-ups:** *"Why is OFFSET slow on page 10,000?"* — the database still walks every skipped row;
a cursor filters with \`WHERE created < x\` and uses the index. *"What does a bad page number return?"*
— 404 "Invalid page."

## How you are judged

Interviewers listen for what happens on the wire — status codes, error bodies, query counts — not
class names recited. One real story ("our list endpoint ran 400 queries until I added
select_related") beats any definition.`,
    mcqs: [
      mcq('An interviewer asks how to use a light serializer for the product list and a full one for the detail page, in one ModelViewSet. What is the standard answer?', [
        ['Override get_serializer_class and switch on self.action', true],
        ['Register the same viewset twice with two routers', false],
        ['Set serializer_class to a list of two serializer classes', false],
        ['Use depth = 1 so the list nests fewer related fields', false],
      ], 'get_serializer_class is the hook generic views call for every request, and self.action tells it whether this is list, retrieve or another action. serializer_class takes one class only.'),
      mcq('Asked "why not just return all products and let the frontend filter?", which answer best shows production thinking?', [
        ['Response size and query time grow with the table, so page on the server', true],
        ['JSON cannot hold more than a few thousand objects in a single response', false],
        ['DRF refuses to serialize more than PAGE_SIZE objects without pagination', false],
        ['Browsers cache list responses, so the data would always be out of date', false],
      ], 'Without paging, each request loads, serializes and transfers every row, which gets slower and heavier as the table grows. JSON and DRF impose no such limit; it is a cost problem.'),
      mcq('An interviewer asks what ModelSerializer.save() does when the serializer was built as ProductSerializer(product, data=payload, partial=True). Which answer is right?', [
        ['It calls update(), changing only the fields sent', true],
        ['It calls create(), inserting a copy of the product', false],
        ['It deletes the product and inserts it again', false],
        ['It does nothing until the view commits the transaction', false],
      ], 'Passing an instance makes save() call update(instance, validated_data), and partial=True means validated_data holds only the submitted fields, so the rest keep their values.'),
    ],
  },

  /* ── MINI_PROJECT ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DRF_MINI_PROJECT',
    notes: `# A Product Catalogue API on DRF

Build the back end of a small shop's catalogue: a Django REST Framework API on MySQL 8 that a React
front end (built later in the track) will call. No authentication yet — the security topic adds JWT
and permissions to this same project — so keep it a clean, well-documented, well-behaved API.

## Stack

Django 5.x, DRF 3.15+, django-filter, drf-spectacular, MySQL 8 through \`mysqlclient\`:

    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.mysql",
            "NAME": os.environ.get("DB_NAME", "catalogue"),
            "USER": os.environ["DB_USER"],
            "PASSWORD": os.environ["DB_PASSWORD"],
            "HOST": os.environ.get("DB_HOST", "localhost"),
            "PORT": os.environ.get("DB_PORT", "3306"),
            "OPTIONS": {"charset": "utf8mb4"},
        }
    }

## Data model

- **Category** — \`name\` (unique), \`slug\` (unique).
- **Product** — \`sku\` (unique, \`BK-\`/\`EL-\`/\`HM-\` prefix), \`name\`, \`description\`, \`price\`
  (\`DecimalField(10, 2)\`), \`stock\` (\`PositiveIntegerField\`), \`category\` (FK, \`PROTECT\`),
  \`is_active\`, \`created\`, \`updated\`. Name unique within a category (\`UniqueConstraint\`).
- **Review** — \`product\` (FK), \`reviewer_name\`, \`rating\` (1–5), \`comment\`, \`created\`. One
  review per reviewer name per product.

## Endpoints

| Method and path | Behaviour |
|---|---|
| \`GET/POST /api/categories/\`, \`GET/PUT/PATCH/DELETE /api/categories/{id}/\` | CRUD; deleting a category that has products is a 409 |
| \`GET /api/products/\` | Paged list (20, client up to 100) with a light serializer: id, sku, name, price, category slug, in_stock |
| \`GET /api/products/{id}/\` | Full detail with category name, average rating and the latest 5 reviews nested (read-only) |
| \`POST/PUT/PATCH/DELETE /api/products/...\` | Category given as its slug on input |
| \`POST /api/products/{id}/restock/\` | Body \`{"quantity": n}\`, 1–1000; adds stock with \`F()\`, returns the product |
| \`POST /api/products/{id}/deactivate/\` | Sets \`is_active = False\` |
| \`GET /api/products/low_stock/\` | Active products with stock under 5, paged |
| \`GET/POST /api/products/{id}/reviews/\` | List and add reviews for one product |
| \`GET /api/docs/\`, \`GET /api/schema/\` | Swagger UI and the OpenAPI schema |

**Filtering:** \`?category=<slug>\`, \`?min_price=\`, \`?max_price=\`, \`?in_stock=true\`, \`?is_active=\`;
**search** on name, sku and description; **ordering** by price, name or created (default newest).

## Rules

- SKU normalised to upper case; price > 0; rating 1–5; an active product priced over ₹10,000 must
  have stock (object-level).
- Every error — validation, 404, 405, 409 — uses one shape from a custom \`EXCEPTION_HANDLER\`:
  \`{"code": ..., "message": ..., "fields": {...}}\`.
- Lists are always ordered and paged; the product list runs at most 3 queries for any page size.
- Every operation is documented: typed method fields, \`@extend_schema\` on actions, error responses
  listed, zero warnings from \`manage.py spectacular --validate\`.

## Acceptance criteria

- \`POST /api/products/\` with a bad SKU and a negative price returns one 400 listing both fields.
- Posting a duplicate name in the same category returns 400, not a 500.
- \`DELETE\` on a category with products returns 409 in the error shape; the category remains.
- \`?category=books&min_price=300&search=python&ordering=price&page=1\` returns the right products in
  the right order, and \`count\` reflects the filters.
- \`?page=999\` is a 404 in the error shape; \`?page_size=1000\` returns at most 100.
- Two concurrent restocks of 10 each add exactly 20.
- \`/api/docs/\` lets a reviewer try every endpoint without reading your code.`,
    mcqs: [
      mcq('In the catalogue project, deleting a Category that still has products must return 409. Category.products uses on_delete=PROTECT. Where is the cleanest place to turn that into the error shape?', [
        ['Catch ProtectedError in perform_destroy and raise a 409 APIException', true],
        ['Remove PROTECT so the products are deleted along with the category', false],
        ['Let the ProtectedError reach Django so it becomes a 500 response', false],
        ['Check for products in the serializer\'s validate_name method', false],
      ], 'ProtectedError is not an API exception, so unhandled it is a 500. Translating it in perform_destroy into an APIException with status 409 sends it through the custom handler.'),
      mcq('The product list must stay at most 3 queries for any page size, yet each row shows its category slug. What makes that possible?', [
        ['select_related("category") on the list queryset', true],
        ['A larger PAGE_SIZE so fewer pages are requested', false],
        ['SlugRelatedField, which caches every category', false],
        ['Running the list request inside transaction.atomic()', false],
      ], 'select_related joins the category into the page\'s SELECT, so reading product.category.slug needs no extra query. Without it, every row triggers its own category lookup.'),
    ],
    assignment: {
      title: 'A Product Catalogue API on DRF',
      description: 'A Django REST Framework API on MySQL for a product catalogue: serializers, viewsets and routers, validation and one error shape, pagination, filtering and search, and Swagger docs.',
      instructions: `Build the API described in this unit's brief and submit it as a repository link or a zip.

**Submit:**

1. The Django project with the \`catalog\` app (models, serializers, views, filters, exceptions, urls)
   and its migrations.
2. \`requirements.txt\` pinning Django, djangorestframework, django-filter, drf-spectacular and
   mysqlclient, and a \`.env.example\` with the variable names (no real passwords).
3. Tests (pytest-django or Django's test runner) using \`APIClient\` that cover every acceptance
   criterion, including the query-count check with \`CaptureQueriesContext\`.
4. The generated \`schema.yml\` from \`manage.py spectacular --file schema.yml --validate\`.
5. A README with setup steps, the error shape with one example of each status, and a short note on
   why you chose your pagination style.

**Before you submit, run every acceptance criterion as a request** — in a test or with curl — not by
reading your code.`,
      rubric: [
        { criterion: 'Correct endpoints and status codes', description: 'Every endpoint in the brief works with the right methods; 201 on create, 204 on delete, 405 for unsupported methods, 404 for missing objects; restock is concurrency-safe with F().', maxPoints: 25 },
        { criterion: 'Serializers and validation', description: 'Explicit fields, light list and full detail serializers chosen per action, slug input for category, read-only nested reviews, typed method fields; field and object rules as specified with normalised SKUs; duplicates are 400s, not 500s.', maxPoints: 25 },
        { criterion: 'One error shape', description: 'A custom EXCEPTION_HANDLER gives every API error the same {code, message, fields} body, including 404, 405, 409 and invalid pages; unexpected exceptions are not swallowed.', maxPoints: 15 },
        { criterion: 'Pagination, filtering, search and ordering', description: 'Every list ordered and paged with a size cap; FilterSet ranges, search and restricted ordering compose correctly; the product list stays within 3 queries.', maxPoints: 20 },
        { criterion: 'Documentation and tests', description: 'Swagger UI documents every operation including request bodies and error responses with zero spectacular warnings; APIClient tests cover the acceptance criteria; README complete.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DRF_CHECKPOINT',
    notes: `Ten questions on Django REST Framework as a backend interview examines it: a serializer, a view or a
request, and what actually comes back. They cover serializers and their fields, the view levels and
routers, validation and error responses, pagination and filtering, and OpenAPI docs. Answer from what
DRF does, not what the code seems to intend.`,
    checkpoint: [
      mcq('s = ProductSerializer(data={"sku": "BK-4", "name": "Pragmatic", "price": "10.50", "category": 1, "junk": 1}). Category 1 exists. What does s.is_valid() return, and what happens to "junk"?', [
        ['True; junk is ignored and absent from validated_data', true],
        ['False; errors say junk is not a field of the serializer', false],
        ['True; junk is passed through to Product(**validated_data)', false],
        ['False; non_field_errors reports an unexpected key', false],
      ], 'DRF serializers only read the fields they declare, so unknown keys never reach validated_data and no error is raised. That is why typos in client field names can go unnoticed.'),
      ck('REST_APIS', '@api_view(["GET"]) def health(request): ... receives a POST. What is the response?', [
        ['405 Method Not Allowed', true],
        ['404 with {"detail": "Not found."}', false],
        ['200, the GET handler runs for any method', false],
        ['403 with a CSRF verification failure', false],
      ], 'The decorator lists the allowed methods, and DRF rejects any other with 405 Method Not Allowed before the function body runs. The 405 response also carries an Allow header listing the allowed methods.'),
      mcq('ProductSerializer(data=payload).save() is called right after construction, with no is_valid(). What happens?', [
        ['AssertionError: call .is_valid() before .save()', true],
        ['The payload is saved without validation', false],
        ['save() validates first, then inserts the row', false],
        ['A 400 response is returned to the client', false],
      ], 'DRF asserts that validation ran before save(), so the mistake surfaces at once in development. save() never validates by itself, and a serializer does not produce HTTP responses.'),
      mcq('class OrderLineSerializer(serializers.Serializer) declares product_id and qty, and a view calls serializer.save() after is_valid(). No create() is written. What happens?', [
        ['NotImplementedError: create() must be implemented', true],
        ['An OrderLine is inserted using the declared fields', false],
        ['validated_data is returned instead of an object', false],
        ['Nothing; save() is a no-op on plain serializers', false],
      ], 'A plain Serializer has no model, so its create() and update() are abstract and raise NotImplementedError. ModelSerializer is the one that implements them.'),
      ck('REST_APIS', 'A ViewSet action @action(detail=True, methods=["post"]) def restock adds stock to an existing product and returns it. Which success status fits?', [
        ['200 OK, as an existing resource was changed', true],
        ['201 Created, as stock was added to the row', false],
        ['204 No Content, even though a body is sent', false],
        ['202 Accepted, as every POST is asynchronous', false],
      ], '201 means a new resource was created and should come with it; restocking changes an existing product and returns it, which is a 200. 204 would mean there is no body.'),
      mcq('In validate(self, attrs) a serializer raises serializers.ValidationError("Start must be before end.") with a plain string. Under which key does the error appear?', [
        ['non_field_errors', true],
        ['validation_errors', false],
        ['detail', false],
        ['validate', false],
      ], 'Object-level errors without a field belong to the NON_FIELD_ERRORS_KEY, non_field_errors by default. Raising ValidationError({"end": "..."}) instead attaches it to one field.'),
      mcq('A FilterSet declares min_price = NumberFilter(field_name="price", lookup_expr="gte"). A client requests ?min_price=abc. What comes back?', [
        ['400 with {"min_price": ["Enter a number."]}', true],
        ['200 with every product, the bad value ignored', false],
        ['200 with no products, nothing is >= "abc"', false],
        ['500 because Decimal("abc") raised an error', false],
      ], 'django-filter validates its parameters like a form, and DjangoFilterBackend turns an invalid form into a ValidationError, which DRF returns as a 400 naming the parameter.'),
      mcq('A ListAPIView paginates Product.objects.all() with no ordering anywhere. What does DRF warn about, and why does it matter?', [
        ['UnorderedObjectListWarning; pages can overlap or skip rows', true],
        ['ImproperlyConfigured; pagination requires a FilterSet', false],
        ['A missing index warning; COUNT(*) will be very slow', false],
        ['No warning; the primary key order is always used', false],
      ], 'Without ORDER BY the database may return rows in a different order for each LIMIT/OFFSET query, so a row can appear on two pages or none. Order the queryset explicitly.'),
      mcq('DefaultRouter registers ProductViewSet at "products". Which URL name does reverse() need for one product\'s detail URL?', [
        ['product-detail', true],
        ['products-detail', false],
        ['product_retrieve', false],
        ['productviewset-detail', false],
      ], 'The basename comes from the queryset\'s model, lower-cased (product), and the detail route adds -detail. The registered prefix "products" shapes the path, not the name.'),
      mcq('A SerializerMethodField is written as def get_rating_avg(self, obj) -> float. What does the type hint change?', [
        ['The OpenAPI schema types the field as a number', true],
        ['DRF converts the return value to float at runtime', false],
        ['The field becomes writable and accepts a float', false],
        ['Nothing; DRF and drf-spectacular ignore the hint', false],
      ], 'drf-spectacular reads the return annotation to type method fields; without it the field is documented as a string with a warning. The hint has no effect on runtime output, and method fields stay read-only.'),
    ],
  },
];
