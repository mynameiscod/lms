"""ShopSathi: a fictional Lucknow festive-goods shop, the QA capstone's product under test.

A Flask web app (pages) and a JSON API (/api/...), in-memory data, synthetic users and products.
Nine defects are planted on purpose (SS-1 .. SS-9); create_app(fixed=True) builds the corrected version.
Run:  python -I shopsathi.py --port 5055 [--fixed]
"""
import argparse
import re
import secrets
import threading
import time

from flask import Flask, jsonify, request, session, redirect, render_template_string, abort, url_for
from markupsafe import escape

USERS = {
    "asha@example.test": {"id": 1, "name": "Asha", "password": "Asha@2026"},
    "ravi@example.test": {"id": 2, "name": "Ravi", "password": "Ravi@2026"},
}
PRODUCTS = [
    {"id": 101, "name": "Chikankari Kurta (Blue)", "category": "clothing", "price_paise": 129900, "stock": 40},
    {"id": 102, "name": "Chikankari Kurta (White)", "category": "clothing", "price_paise": 119900, "stock": 25},
    {"id": 103, "name": "Brass Diya Set of 6", "category": "festive", "price_paise": 49900, "stock": 100},
    {"id": 104, "name": "Clay Diya Pack of 12", "category": "festive", "price_paise": 19900, "stock": 200},
    {"id": 105, "name": "Rangoli Colours Kit", "category": "festive", "price_paise": 29900, "stock": 80},
    {"id": 106, "name": "Attar Gift Box", "category": "gifts", "price_paise": 89900, "stock": 30},
    {"id": 107, "name": "Dry Fruit Hamper", "category": "gifts", "price_paise": 159900, "stock": 15},
    {"id": 108, "name": "Silk Dupatta", "category": "clothing", "price_paise": 99900, "stock": 20},
]
FREE_DELIVERY_FROM = 49900      # free delivery when the subtotal is Rs 499 or more
DELIVERY_FEE = 4900
MAX_QTY = 5                     # per product per order, a sale-day rule
COUPONS = {"FESTIVE15": {"percent": 15, "cap_paise": 15000}}
UPI_RE = re.compile(r"^[a-z0-9.\-_]{2,}@[a-z]{2,}$")

PAGE = """<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{{ title }} - ShopSathi</title></head>
<body><header><nav aria-label="Main"><a href="/">ShopSathi</a>
{% if user %}<span>Signed in as {{ user }}</span> <a href="/cart">Cart (<span data-testid="cart-count">{{ count }}</span>)</a>
<form method="post" action="/logout" style="display:inline"><button>Sign out</button></form>
{% else %}<a href="/login">Sign in</a>{% endif %}</nav></header><main>{{ body|safe }}</main></body></html>"""


def rupees(paise: int) -> str:
    return f"Rs {paise // 100}.{paise % 100:02d}"


def create_app(fixed: bool = False) -> Flask:
    app = Flask(__name__)
    app.secret_key = "dev-only-not-a-secret"
    # SS-9: the session cookie is readable by page scripts and has no SameSite attribute.
    app.config.update(SESSION_COOKIE_HTTPONLY=fixed, SESSION_COOKIE_SAMESITE="Lax" if fixed else None)

    state = {"carts": {}, "orders": {}, "next_order": 5001, "tokens": {}}
    db_lock = threading.Lock()

    def reset():
        state.update(carts={}, orders={}, next_order=5001, tokens={})
        for p, s in zip(PRODUCTS, [40, 25, 100, 200, 80, 30, 15, 20]):
            p["stock"] = s

    def find_products(q: str):
        if fixed:
            q = q.strip()                    # SS-5: the buggy build does not strip the query
        # SS-8: every search holds one global lock around a 30 ms "database call", so searches queue.
        if fixed:
            time.sleep(0.03)
            return [p for p in PRODUCTS if q.lower() in p["name"].lower()]
        with db_lock:
            time.sleep(0.03)
            return [p for p in PRODUCTS if q.lower() in p["name"].lower()]

    def totals(user_id: int):
        cart = state["carts"].get(user_id, {"items": {}, "coupon": None})
        lines = []
        for pid, qty in cart["items"].items():
            p = next(x for x in PRODUCTS if x["id"] == pid)
            lines.append({"product_id": pid, "name": p["name"], "qty": qty,
                          "unit_price_paise": p["price_paise"], "line_paise": qty * p["price_paise"]})
        subtotal = sum(line["line_paise"] for line in lines)
        discount = 0
        if cart["coupon"]:
            c = COUPONS[cart["coupon"]]
            discount = subtotal * c["percent"] // 100
            if fixed:
                discount = min(discount, c["cap_paise"])   # SS-2: the buggy build never applies the cap
        free = subtotal >= FREE_DELIVERY_FROM if fixed else subtotal > FREE_DELIVERY_FROM   # SS-1
        delivery = 0 if (free or subtotal == 0) else DELIVERY_FEE
        return {"lines": lines, "subtotal_paise": subtotal, "discount_paise": discount,
                "delivery_paise": delivery, "total_paise": subtotal - discount + delivery,
                "coupon": cart["coupon"]}

    def add_item(user_id: int, pid: int, qty: int):
        if not isinstance(qty, int) or qty < 1:
            return "qty must be a whole number of at least 1"
        if fixed and qty > MAX_QTY:
            return f"at most {MAX_QTY} of each product"   # SS-6: the buggy API never checks the limit
        if not any(p["id"] == pid for p in PRODUCTS):
            return "no such product"
        cart = state["carts"].setdefault(user_id, {"items": {}, "coupon": None})
        cart["items"][pid] = qty
        return None

    def place_order(user_id: int, upi_id: str):
        t = totals(user_id)
        if not t["lines"]:
            return None, ("cart is empty", 409)
        if not UPI_RE.match(upi_id or ""):
            return None, ("invalid UPI ID", 422)
        if upi_id.endswith("@failbank"):
            return None, ("payment declined by the bank; no money was taken", 402)
        oid = state["next_order"]
        state["next_order"] += 1
        state["orders"][oid] = {"id": oid, "user_id": user_id, "status": "PLACED",
                                "total_paise": t["total_paise"], "lines": t["lines"],
                                "upi_ref": f"SS{oid}{secrets.randbelow(10**6):06d}"}
        state["carts"][user_id] = {"items": {}, "coupon": None}
        return state["orders"][oid], None

    # ---------- API ----------
    def api_user():
        auth = request.headers.get("Authorization", "")
        uid = state["tokens"].get(auth.removeprefix("Bearer ").strip())
        if uid is None:
            abort(401)
        return uid

    @app.errorhandler(401)
    def e401(_):
        return jsonify(error="authentication required"), 401

    @app.errorhandler(404)
    def e404(_):
        return jsonify(error="not found"), 404

    @app.post("/api/login")
    def api_login():
        body = request.get_json(silent=True) or {}
        u = USERS.get(body.get("email", ""))
        if not u or u["password"] != body.get("password"):
            return jsonify(error="invalid email or password"), 401
        token = secrets.token_hex(16)
        state["tokens"][token] = u["id"]
        return jsonify(token=token, user_id=u["id"])

    def public(p):
        return {"id": p["id"], "name": p["name"], "category": p["category"],
                "price_paise": p["price_paise"], "in_stock": p["stock"] > 0}

    @app.get("/api/products")
    def api_products():
        found = find_products(request.args.get("q", ""))
        return jsonify(items=[public(p) for p in found], count=len(found))

    @app.get("/api/products/<int:pid>")
    def api_product(pid):
        p = next((x for x in PRODUCTS if x["id"] == pid), None)
        if not p:
            abort(404)
        out = public(p)
        if not fixed:
            out["price_paise"] = str(out["price_paise"])   # SS-4: schema drift, a string here, a number in the list
        return jsonify(out)

    @app.get("/api/cart")
    def api_cart():
        return jsonify(totals(api_user()))

    @app.post("/api/cart/items")
    def api_cart_add():
        uid = api_user()
        body = request.get_json(silent=True) or {}
        err = add_item(uid, body.get("product_id"), body.get("qty"))
        if err:
            return jsonify(error=err), 422
        return jsonify(totals(uid)), 200

    @app.post("/api/cart/coupon")
    def api_coupon():
        uid = api_user()
        code = (request.get_json(silent=True) or {}).get("code", "")
        if code not in COUPONS:
            return jsonify(error="unknown coupon"), 422
        state["carts"].setdefault(uid, {"items": {}, "coupon": None})["coupon"] = code
        return jsonify(totals(uid))

    @app.post("/api/orders")
    def api_order():
        uid = api_user()
        order, err = place_order(uid, (request.get_json(silent=True) or {}).get("upi_id", ""))
        if err:
            return jsonify(error=err[0]), err[1]
        return jsonify(order), 201, {"Location": f"/api/orders/{order['id']}"}

    @app.get("/api/orders/<int:oid>")
    def api_order_get(oid):
        uid = api_user()
        order = state["orders"].get(oid)
        if not order or (fixed and order["user_id"] != uid):   # SS-3: the buggy build serves anyone's order
            abort(404)
        return jsonify(order)

    @app.post("/api/test/reset")
    def api_reset():
        reset()
        return jsonify(ok=True)

    # ---------- pages ----------
    def render(title, body):
        email = session.get("email")
        count = 0
        if email:
            count = sum(state["carts"].get(USERS[email]["id"], {"items": {}})["items"].values())
        return render_template_string(PAGE, title=title, body=body, user=email, count=count)

    @app.get("/")
    def home():
        return render("Home", '<h1>Festive picks</h1><form role="search" action="/search">'
                      '<label for="q">Search products</label> <input id="q" name="q">'
                      ' <button>Search</button></form>')

    @app.get("/search")
    def search_page():
        q = request.args.get("q", "")
        found = find_products(q)
        if not found:
            items = '<p role="status">No products match your search.</p>'
        else:
            items = '<p role="status">%d results</p><ul aria-label="Results">' % len(found) + "".join(
                f'<li><h2>{p["name"]}</h2><span data-testid="price">{rupees(p["price_paise"])}</span>'
                f'<form method="post" action="/cart/add"><input type="hidden" name="product_id" value="{p["id"]}">'
                f'<label>Quantity <select name="qty">' + "".join(f"<option>{n}</option>" for n in range(1, MAX_QTY + 1))
                + '</select></label> <button>Add to cart</button></form></li>' for p in found) + "</ul>"
        # The search text is escaped: an unplanned script injection here would be a tenth defect.
        return render("Search", f"<h1>Results for “{escape(q)}”</h1>{items}")

    @app.route("/login", methods=["GET", "POST"])
    def login_page():
        error = ""
        if request.method == "POST":
            u = USERS.get(request.form.get("email", ""))
            if u and u["password"] == request.form.get("password"):
                session["email"] = request.form["email"]
                return redirect(request.args.get("next") or "/")
            error = '<p role="alert">Invalid email or password</p>'
        return render("Sign in", f'<h1>Sign in</h1>{error}<form method="post">'
                      '<label for="email">Email</label> <input id="email" name="email" type="email"><br>'
                      '<label for="pw">Password</label> <input id="pw" name="password" type="password"><br>'
                      '<button>Sign in</button></form>')

    @app.post("/logout")
    def logout():
        session.clear()
        return redirect("/")

    def page_user():
        email = session.get("email")
        return USERS[email]["id"] if email else None

    @app.post("/cart/add")
    def cart_add():
        uid = page_user()
        if uid is None:
            return redirect(url_for("login_page", next=request.referrer or "/"))
        pid, qty = int(request.form["product_id"]), int(request.form["qty"])
        current = state["carts"].get(uid, {"items": {}})["items"].get(pid, 0)
        add_item(uid, pid, current + qty)
        return redirect("/cart")

    @app.get("/cart")
    def cart_page():
        uid = page_user()
        if uid is None:
            return redirect("/login?next=/cart")
        t = totals(uid)
        rows = "".join(f'<tr><td>{x["name"]}</td><td>{x["qty"]}</td><td>{rupees(x["line_paise"])}</td></tr>'
                       for x in t["lines"])
        return render("Cart", '<h1>Your cart</h1><table aria-label="Cart items"><tr><th>Item</th><th>Qty</th>'
                      f'<th>Amount</th></tr>{rows}</table>'
                      f'<p>Subtotal <span data-testid="subtotal">{rupees(t["subtotal_paise"])}</span></p>'
                      f'<p>Delivery <span data-testid="delivery">{rupees(t["delivery_paise"])}</span></p>'
                      f'<p>Total <span data-testid="total">{rupees(t["total_paise"])}</span></p>'
                      '<a href="/checkout">Checkout</a>')

    @app.route("/checkout", methods=["GET", "POST"])
    def checkout_page():
        uid = page_user()
        if uid is None:
            return redirect("/login?next=/checkout")
        msg = ""
        if request.method == "POST":
            order, err = place_order(uid, request.form.get("upi_id", ""))
            if order:
                return redirect(f"/orders/{order['id']}")
            msg = f'<p role="alert">{err[0]}</p>'
        t = totals(uid)
        # SS-7 (accessibility): the UPI field has a placeholder but no label in the buggy build.
        field = ('<label for="upi">UPI ID</label> <input id="upi" name="upi_id">' if fixed
                 else '<input name="upi_id" placeholder="yourname@bank">')
        return render("Checkout", f'<h1>Checkout</h1>{msg}<p>Pay <span data-testid="amount">'
                      f'{rupees(t["total_paise"])}</span></p><form method="post">{field} '
                      '<button>Pay now</button></form>')

    @app.get("/orders/<int:oid>")
    def order_page(oid):
        uid = page_user()
        order = state["orders"].get(oid)
        if uid is None or not order or order["user_id"] != uid:
            abort(404)
        return render("Order placed", f'<h1>Order placed</h1><p>Order <span data-testid="order-id">{oid}</span>,'
                      f' UPI reference <span data-testid="upi-ref">{order["upi_ref"]}</span>,'
                      f' paid {rupees(order["total_paise"])}</p>')

    return app


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=5055)
    ap.add_argument("--fixed", action="store_true")
    a = ap.parse_args()
    create_app(fixed=a.fixed).run(port=a.port, threaded=True)
