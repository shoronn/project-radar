"""Product Radar API (Flask). JSON only; the web UI lives in apps/web and calls this API cross-origin.
Local run:  python app.py  ->  http://localhost:8000      Production: gunicorn -c gunicorn.conf.py app:app"""
import hashlib, json, os, sqlite3, time, datetime as dt, threading
from concurrent.futures import ThreadPoolExecutor
from functools import wraps
from flask import Flask, g, jsonify, request, session
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.security import check_password_hash, generate_password_hash

import config  # noqa: E402  (loads apps/api/.env for local runs, defines DATA_DIR / CONTENT_DIR)
from config import env_bool, env_list  # noqa: E402
config.init_schema()
import settings  # noqa: E402
settings.apply()          # keys saved in Admin > API keys win over .env
import sources  # noqa: E402  (after .env is loaded)
import trending  # noqa: E402
import research  # noqa: E402
import ai  # noqa: E402

ROOT = config.ROOT
IDEAS = json.load(open(config.content_path("ideas.json"), encoding="utf-8"))
PLANS = json.load(open(config.content_path("plans.json"), encoding="utf-8"))
APP_VERSION = os.getenv("APP_VERSION", "dev")
def cache_hours():
    try:
        return float(os.getenv("CACHE_HOURS", "12") or 12)
    except ValueError:
        return 12.0

app = Flask(__name__, static_folder=None)
app.secret_key = settings.secret_key()

# ---- deployment / security settings (see README "Environment variables") ----
COOKIE_SECURE = env_bool("COOKIE_SECURE", env_bool("HTTPS", False))   # HTTPS=1 kept for backwards compatibility
CORS_ORIGINS = [o.rstrip("/") for o in env_list("CORS_ORIGINS", "http://localhost:3000")]
PROXY_COUNT = int(os.getenv("PROXY_COUNT", "1") or 0)                 # reverse proxies in front (Coolify/Traefik = 1)
if PROXY_COUNT > 0:
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=PROXY_COUNT, x_proto=PROXY_COUNT, x_host=PROXY_COUNT)

app.config.update(
    SESSION_COOKIE_NAME=os.getenv("SESSION_COOKIE_NAME", "pr_session"),
    SESSION_COOKIE_HTTPONLY=True,
    # The web app (projectradar.maktechgroup.com) and the API (api-pradar.maktechgroup.com) are the SAME SITE
    # (same registrable domain), so Lax cookies are sent on credentialed fetches. Host-only cookie on the API domain.
    SESSION_COOKIE_SAMESITE=os.getenv("SESSION_COOKIE_SAMESITE", "Lax"),
    SESSION_COOKIE_SECURE=COOKIE_SECURE,
    SESSION_COOKIE_DOMAIN=os.getenv("SESSION_COOKIE_DOMAIN") or None,
    PERMANENT_SESSION_LIFETIME=dt.timedelta(days=int(os.getenv("SESSION_DAYS", "30") or 30)),
    MAX_CONTENT_LENGTH=1024 * 1024,           # 1 MB request bodies are plenty (projects are capped at 300 KB)
)


def db():
    if "db" not in g:
        g.db = config.connect()
        g.db.row_factory = sqlite3.Row
    return g.db


def client_ip():
    """Real visitor IP. ProxyFix has already applied the trusted X-Forwarded-For hops, so this can't be spoofed."""
    return request.remote_addr or "unknown"


# ---------------- CORS + CSRF guard + security headers ----------------
UNSAFE = ("POST", "PUT", "PATCH", "DELETE")


def origin_ok(origin):
    return bool(origin) and origin.rstrip("/") in CORS_ORIGINS


@app.before_request
def guard():
    origin = request.headers.get("Origin")
    if request.method == "OPTIONS":                       # CORS preflight
        resp = app.make_default_options_response()
        if origin_ok(origin):
            resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
            resp.headers["Access-Control-Max-Age"] = "600"
        return resp
    if request.method in UNSAFE:
        # CSRF: browsers always send Origin on cross-origin writes. Only the allowed web origins may write.
        if origin and not origin_ok(origin):
            return jsonify(error="origin", message="This origin is not allowed."), 403
        # JSON only: forces a CORS preflight, so a plain HTML form on another site can't post here.
        if request.content_length and not request.is_json:
            return jsonify(error="content-type", message="Send JSON (Content-Type: application/json)."), 415


@app.after_request
def headers(resp):
    origin = request.headers.get("Origin")
    if origin_ok(origin):
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Access-Control-Allow-Credentials"] = "true"
    resp.headers.add("Vary", "Origin")
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Referrer-Policy"] = "no-referrer"
    resp.headers["Cross-Origin-Resource-Policy"] = "same-site"
    resp.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
    resp.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"
    if COOKIE_SECURE:
        resp.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    if request.path.startswith("/api/"):
        resp.headers["Cache-Control"] = "no-store"
    return resp


# ---------------- login throttling (per IP + email, stored in SQLite so it survives restarts) ----------------
LOGIN_MAX = int(os.getenv("LOGIN_MAX_ATTEMPTS", "8") or 8)
LOGIN_WINDOW = int(os.getenv("LOGIN_WINDOW_MINUTES", "15") or 15) * 60


def throttled(key):
    d = db()
    d.execute("DELETE FROM login_fail WHERE t < ?", (time.time() - LOGIN_WINDOW,))
    return d.execute("SELECT COUNT(*) c FROM login_fail WHERE key=?", (key,)).fetchone()["c"] >= LOGIN_MAX


def login_failed(key):
    db().execute("INSERT INTO login_fail VALUES (?,?)", (key, time.time())); db().commit()


def too_many():
    return jsonify(error="throttled", message=f"Too many attempts. Try again in {LOGIN_WINDOW // 60} minutes."), 429


@app.teardown_appcontext
def close(_):
    d = g.pop("db", None)
    if d:
        d.close()


def pw_tag(h):
    """Short fingerprint of the password hash (never the hash itself) stored in the session cookie."""
    return hashlib.sha256((h or "").encode()).hexdigest()[:16]


def start_session(u):
    session.clear()
    session.permanent = True
    session["uid"] = u["id"]
    session["pv"] = pw_tag(u["pw"])


def me():
    uid = session.get("uid")
    if not uid:
        return None
    u = db().execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    if not u or session.get("pv") != pw_tag(u["pw"]):   # password changed (e.g. admin re-seeded) -> old sessions end
        session.clear()
        return None
    if u["plan"] != "free" and u["plan_until"] and u["plan_until"] < dt.date.today().isoformat():
        db().execute("UPDATE users SET plan='free' WHERE id=?", (uid,)); db().commit()
        u = db().execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    return u


def plan_of(u):
    return PLANS["plans"].get(u["plan"] if u else "guest") or PLANS["plans"]["free"]


def need_login(f):
    @wraps(f)
    def w(*a, **k):
        if not me():
            return jsonify(error="login", message="Create a free account to use this."), 401
        return f(*a, **k)
    return w


def cached(key, fn):
    row = db().execute("SELECT t, v FROM cache WHERE k=?", (key,)).fetchone()
    if row and time.time() - row["t"] < cache_hours() * 3600:
        return json.loads(row["v"])
    v = fn()
    if v and (v.get("ok") or isinstance(v, dict) and "sources" in v):
        db().execute("REPLACE INTO cache VALUES (?,?,?)", (key, time.time(), json.dumps(v))); db().commit()
    return v


# ---------------- service ----------------
@app.get("/")
def index():
    return jsonify(name="Product Radar API", version=APP_VERSION, health="/healthz")


@app.get("/healthz")
def healthz():
    """Liveness + database check, used by the Docker/Coolify health check."""
    try:
        db().execute("SELECT 1").fetchone()
    except Exception as e:                                 # pragma: no cover
        return jsonify(ok=False, error=str(e)[:200]), 503
    return jsonify(ok=True, version=APP_VERSION)


# ---------------- auth ----------------
@app.post("/api/signup")
def signup():
    j = request.get_json(force=True)
    email, pw = (j.get("email") or "").strip().lower(), j.get("password") or ""
    tkey = "signup|" + client_ip()
    if throttled(tkey):
        return too_many()
    if "@" not in email or len(pw) < 8 or len(email) > 254:
        return jsonify(error="Use a real email and a password of at least 8 characters."), 400
    login_failed(tkey)                         # counts sign-ups per IP too (LOGIN_MAX_ATTEMPTS per window)
    try:
        cur = db().execute("INSERT INTO users(email,pw,name,created) VALUES (?,?,?,?)", (email, generate_password_hash(pw), (j.get("name") or "")[:60], dt.datetime.now(dt.timezone.utc).replace(tzinfo=None).isoformat()))
        db().commit()
    except sqlite3.IntegrityError:
        return jsonify(error="This email already has an account. Log in instead."), 400
    start_session(db().execute("SELECT * FROM users WHERE id=?", (cur.lastrowid,)).fetchone())
    return jsonify(ok=True)


@app.post("/api/login")
def login():
    j = request.get_json(force=True)
    email = (j.get("email") or "").strip().lower()
    tkey = f"login|{client_ip()}|{email}"
    if throttled(tkey):
        return too_many()
    u = db().execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    if not u or not check_password_hash(u["pw"], j.get("password") or ""):
        login_failed(tkey)
        return jsonify(error="Email or password is wrong."), 400
    start_session(u)
    return jsonify(ok=True)


@app.post("/api/logout")
def logout():
    session.clear()
    return jsonify(ok=True)


@app.get("/api/me")
def whoami():
    u = me()
    p = plan_of(u)
    key = f"u{u['id']}" if u else "ip" + (client_ip())
    used = db().execute("SELECT n FROM usage WHERE key=? AND day=?", (key, dt.date.today().isoformat())).fetchone()
    return jsonify(user={"email": u["email"], "name": u["name"], "plan": u["plan"], "until": u["plan_until"]} if u else None,
                   limits=p, used=used["n"] if used else 0, plans=PLANS, sources=configured(), ai={"on": ai.configured(), "limit": plan_of(u).get("ai_per_month", 0)},
                   admin=is_admin(u))


def configured():
    e = os.getenv
    return {"Google Trends numbers (SerpApi)": bool(e("SERPAPI_KEY")), "eBay": bool(e("EBAY_CLIENT_ID")), "AliExpress": bool(e("ALI_APP_KEY")),
            "YouTube": bool(e("YOUTUBE_API_KEY")), "Daraz": e("DARAZ_ENABLED", "1") == "1"}


# ---------------- data ----------------
@app.get("/api/fx")
def fx():
    return jsonify(cached("fx", sources.fx))


@app.get("/api/ideas")
def ideas():
    p = plan_of(me())
    lim = p.get("ideas", 8)
    month = max(1, min(12, int(request.args.get("month") or dt.date.today().month)))
    south = (request.args.get("country") or "").upper() in ("AU", "NZ", "ZA", "AR", "BR", "CL", "UY", "PY", "PE")

    def gap(i):  # months until the next peak; ideas in season come first (lead magnet: show what matters now)
        pk = [((m + 5) % 12) + 1 if south and i.get("weather") else m for m in i["peak"]]
        return min((m - month) % 12 for m in pk)
    items = sorted(IDEAS["ideas"], key=gap)
    country = (request.args.get("country") or "BD").upper()[:2]
    imgs = trending.idea_images(country if country in trending.COUNTRIES else trending.COUNTRIES[0])
    out = [dict(i, photo=imgs.get(i["kw"].strip().lower())) for i in items[:lim]]
    return jsonify(note=IDEAS["note"], total=len(items), locked=max(0, len(items) - lim), ideas=out)


@app.get("/api/analyze")
def analyze():
    q = (request.args.get("q") or "").strip()[:80]
    country = (request.args.get("country") or "US").upper()[:2]
    if len(q) < 2:
        return jsonify(error="Type a product name."), 400
    u = me()
    p = plan_of(u)
    key = f"u{u['id']}" if u else "ip" + (client_ip())
    day = dt.date.today().isoformat()
    row = db().execute("SELECT n FROM usage WHERE key=? AND day=?", (key, day)).fetchone()
    used = row["n"] if row else 0
    again = db().execute("SELECT 1 FROM seen WHERE key=? AND day=? AND q=?", (key, day, f"{q.lower()}|{country}")).fetchone()
    if used >= p["searches_per_day"] and not again:
        return jsonify(error="limit", plan=u["plan"] if u else "guest", message=p.get("limit_msg", "Daily limit reached.")), 402

    def run():
        return collect(q, country)

    res = cached(f"a|{q.lower()}|{country}", run)
    if not again:                             # the same product again today is free (reopening a project, switching steps)
        db().execute("INSERT INTO usage VALUES (?,?,1) ON CONFLICT(key,day) DO UPDATE SET n=n+1", (key, day))
        db().execute("INSERT OR IGNORE INTO seen VALUES (?,?,?)", (key, day, f"{q.lower()}|{country}")); db().commit()
    if not p.get("videos", True):
        res = dict(res, youtube={"ok": False, "source": "YouTube", "reason": "pro"})
    res["q"], res["country"] = q, country
    rates = (cached("fx", sources.fx) or {}).get("rates")
    res["assessment"] = research.assess(res, IDEAS["ideas"], country, rates)
    res["season"] = season_for(q, country, res)
    return jsonify(res)


def season_for(q, country, res=None):
    """Monthly candles + season pattern: from this product's own 5-year Trends history, else the tracked keyword."""
    h = ((res or {}).get("trends") or {}).get("hist") if (res or {}).get("trends", {}).get("ok") else None
    if h and len(h) > 20:
        return {"kw": q, "candles": trending.candles(h), "pattern": trending.pattern(h), "updated": (res or {}).get("checked"), "source": "Google Trends (SerpApi), weekly, 5 years"}
    tc = country if country in trending.COUNTRIES else trending.COUNTRIES[0]
    return trending.season_chart(tc, q) or (trending.season_chart(tc, research.match_idea(q, IDEAS["ideas"])["kw"]) if research.match_idea(q, IDEAS["ideas"]) else None)


_photo_lock = threading.Lock()


@app.get("/api/photo")
def photo_api():
    """Real listing photo for one product keyword, fetched once and saved. Used to fill cards that have no photo yet."""
    kw = (request.args.get("kw") or "").strip().lower()[:80]
    country = (request.args.get("country") or "BD").upper()[:2]
    if len(kw) < 2:
        return jsonify(error="kw"), 400
    with _photo_lock:                                         # one marketplace call at a time
        hit = trending.photo_for(kw, country if country in trending.COUNTRIES else trending.COUNTRIES[0])
    return jsonify(photo=hit)


@app.get("/api/setup")
def setup_api():
    """Which live sources are switched on. Never returns key values."""
    e = os.getenv
    c = trending.conn()
    meta = {r[0]: {"updated": r[1], "note": r[2]} for r in c.execute("SELECT country, updated, note FROM trend_meta")}
    photos = {r[0]: r[1] for r in c.execute("SELECT country, COUNT(*) FROM idea_img WHERE image IS NOT NULL GROUP BY country")}
    c.close()
    items = [
        {"key": "SERPAPI_KEY", "on": bool(e("SERPAPI_KEY")), "name": "Google Trends + Google Shopping (SerpApi)", "unlocks": "Live trend numbers, candle and season charts, Trending ranking, prices outside Bangladesh", "where": "serpapi.com, Dashboard, API key"},
        {"key": "ALI_APP_KEY", "on": bool(e("ALI_APP_KEY") and e("ALI_APP_SECRET")), "name": "AliExpress Affiliate API", "unlocks": "Supplier prices, order counts and most product photos", "where": "portals.aliexpress.com (needs approval)"},
        {"key": "DARAZ_ENABLED", "on": e("DARAZ_ENABLED", "1") == "1", "name": "Daraz (Bangladesh)", "unlocks": "Bangladesh market prices and photos. No key, experimental", "where": "Already on. Set 0 to switch off"},
        {"key": "YOUTUBE_API_KEY", "on": bool(e("YOUTUBE_API_KEY")), "name": "YouTube Data API", "unlocks": "Review videos on the research page", "where": "console.cloud.google.com, YouTube Data API v3"},
        {"key": "AI_API_KEY", "on": ai.configured(), "name": "AI assistant", "unlocks": "Written answers in Ask AI and review analysis", "where": "aistudio.google.com or platform.openai.com"},
        {"key": "EBAY_CLIENT_ID", "on": bool(e("EBAY_CLIENT_ID")), "name": "eBay (optional)", "unlocks": "eBay listings, display only", "where": "developer.ebay.com"}]
    return jsonify(items=items, countries=trending.COUNTRIES, data=meta, photos=photos, ideas=len(IDEAS["ideas"]))


@app.get("/api/season")
def season_api():
    """Free (no daily check used): reads stored history only."""
    q = (request.args.get("kw") or "").strip().lower()[:80]
    country = (request.args.get("country") or "BD").upper()[:2]
    if not q:
        return jsonify(error="kw"), 400
    row = db().execute("SELECT v FROM cache WHERE k=?", (f"a|{q}|{country}",)).fetchone()
    res = json.loads(row["v"]) if row else None
    out = season_for(q, country, res)
    return jsonify(out or {"kw": q, "candles": [], "pattern": [], "note": "No search history yet. It appears after the next automatic refresh or after a deep research run with SERPAPI_KEY."})


@app.get("/api/trending")
def trending_api():
    country = (request.args.get("country") or "").upper()
    if country not in trending.COUNTRIES:
        country = trending.COUNTRIES[0]
    if trending.stale(country):
        trending.refresh_in_background(country)
    c = trending.conn()
    meta = c.execute("SELECT updated, note FROM trend_meta WHERE country=?", (country,)).fetchone()
    kws = c.execute("SELECT kw, series, level, mom FROM trend_kw WHERE country=? ORDER BY (mom * 0.7 + level / 100 * 0.6) DESC", (country,)).fetchall()
    live = bool(kws)
    order = [r[0] for r in kws] if live else trending.keywords(country)
    info = {k: {"series": json.loads(s), "level": round(lv, 1), "mom": round(mo, 3)} for k, s, lv, mo in kws}
    prods = {}
    for r in c.execute("SELECT kw, rank, source, name, image, price, cur, url, orders, rating, fetched FROM trend_products WHERE country=? ORDER BY kw, rank", (country,)):
        prods.setdefault(r[0], []).append(dict(zip(("kw", "rank", "source", "name", "image", "price", "cur", "url", "orders", "rating", "fetched"), r)))
    c.close()
    byk = {i["kw"]: i for i in IDEAS["ideas"]}
    rows = [dict(kw=k, idea=byk.get(k), products=prods.get(k, []), **info.get(k, {})) for k in order]
    rows = [r for r in rows if r["products"] or not prods][:trending.TOP_N]     # show products that have real listings first
    lim = 5 if plan_of(me())["name"] in ("Guest", "Free") else len(rows)
    return jsonify(country=country, countries=trending.COUNTRIES, live=live, updated=meta[0] if meta else None, note=meta[1] if meta else "Collecting data for the first time. This takes a few minutes.",
                   refreshing=trending._lock.locked(), rows=rows[:lim], locked=max(0, len(rows) - lim))


def collect(q, country):
    """Fetch every source for one product, clean listings, and pick market and supplier prices."""
    jobs = {"trends": lambda: sources.trends(q, country), "ebay": lambda: sources.ebay(q, country), "ali": lambda: sources.aliexpress(q, country),
            "daraz": lambda: sources.daraz(q, country), "shop": lambda: sources.shopping(q, country), "youtube": lambda: sources.youtube(q, country)}
    with ThreadPoolExecutor(6) as ex:
        fut = {k: ex.submit(f) for k, f in jobs.items()}
        res = {k: f.result() for k, f in fut.items()}
    for k in ("ebay", "ali", "daraz", "shop"):    # one listing = one card; drop incomplete, unrelated and outlier listings
        if res[k].get("ok"):
            res[k]["items"] = sources.clean_items(res[k]["items"], q)
    # Market price: Daraz in Bangladesh, Google Shopping elsewhere. eBay is display-only (its licence forbids price modelling).
    mk = "daraz" if res["daraz"].get("ok") and res["daraz"]["items"] else ("shop" if res["shop"].get("ok") and res["shop"]["items"] else None)
    res["market_items"] = res[mk]["items"] if mk else []
    res["market_price"] = dict(sources.price_stats(res[mk]["items"]) or {}, source=res[mk]["source"]) if mk and sources.price_stats(res[mk]["items"]) else None
    sp = sources.price_stats(res["ali"]["items"]) if res["ali"].get("ok") else None
    res["supplier_price"] = dict(sp, source="AliExpress") if sp else None
    res["sources"] = {k: {"ok": res[k].get("ok"), "source": res[k].get("source"), "reason": res[k].get("reason")} for k in ("trends", "daraz", "shop", "ali", "ebay", "youtube")}
    res["checked"] = time.time()
    return res


# ---------------- shortlist ----------------
@app.get("/api/saved")
@need_login
def saved():
    rows = db().execute("SELECT item, stage, note FROM saved WHERE uid=? ORDER BY t DESC", (me()["id"],)).fetchall()
    return jsonify([dict(r) for r in rows])


@app.post("/api/saved")
@need_login
def save():
    j, u = request.get_json(force=True), me()
    item = (j.get("item") or "").strip()[:80]
    if not item:
        return jsonify(error="empty"), 400
    if j.get("delete"):
        db().execute("DELETE FROM saved WHERE uid=? AND item=?", (u["id"], item))
    else:
        n = db().execute("SELECT COUNT(*) c FROM saved WHERE uid=?", (u["id"],)).fetchone()["c"]
        exists = db().execute("SELECT 1 FROM saved WHERE uid=? AND item=?", (u["id"], item)).fetchone()
        if not exists and n >= plan_of(u)["saved"]:
            return jsonify(error="limit", message="Your plan's shortlist is full. Upgrade to save more."), 402
        db().execute("INSERT INTO saved(uid,item,stage,note,t) VALUES (?,?,?,?,?) ON CONFLICT(uid,item) DO UPDATE SET stage=excluded.stage, note=COALESCE(excluded.note, note)",
                     (u["id"], item, int(j.get("stage") or 0), j.get("note"), time.time()))
    db().commit()
    return jsonify(ok=True)



# ---------------- helpers for the AI tools ----------------
def ukey():
    u = me()
    return (f"u{u['id']}" if u else "ip" + (client_ip())), u


def rates():
    return (cached("fx", sources.fx) or {}).get("rates") or {}


def convert(v, cur, to):
    r = rates()
    if v is None or not r.get(cur) or not r.get(to):
        return None
    return round(float(v) / r[cur] * r[to], 2)


def research_full(q, country):
    res = cached(f"a|{q.lower()}|{country}", lambda: collect(q, country))
    res = dict(res, q=q, country=country)
    res["assessment"] = research.assess(res, IDEAS["ideas"], country, rates())
    return res


def research_compact(q, country, currency):
    d = research_full(q, country)
    A = d["assessment"]
    mp, sp = d.get("market_price"), d.get("supplier_price")
    fmt = lambda p: p and {"low": p["low"], "typical": p["median"], "high": p["high"], "currency": p["cur"], "listings": p["n"], "source": p.get("source"),
                           f"typical_in_{currency}": convert(p["median"], p["cur"], currency)}
    top = [{"name": i["name"], "price": i["price"], "currency": i.get("cur"), "orders": i.get("orders"), "url": i.get("url")} for i in (d.get("market_items") or [])[:5]]
    sup = [{"name": i["name"], "price": i["price"], "currency": i.get("cur"), "orders": i.get("orders")} for i in ((d.get("ali") or {}).get("items") or [])[:3]]
    out = {"product": q, "country": country, "checked": time.strftime("%Y-%m-%d %H:%M", time.localtime(d.get("checked") or time.time())),
           "verdict": A["verdict"], "opportunity_score": A["opportunity"], "evidence_confidence": f"{A['confidence_label']} ({A['confidence']}%)",
           "signals": [{k: s[k] for k in ("name", "score", "grade", "note", "source")} for s in A["signals"]],
           "market_price": fmt(mp), "supplier_price": fmt(sp), "top_market_listings": top, "top_supplier_listings": sup,
           "devils_advocate": A["devil"], "unknowns": A["unknowns"], "next_actions": A["next_actions"],
           "buyer_why": A["idea"]["why"] if A["idea"] else None, "season_state": A["season_state"],
           "grades": "A observed, B calculated, C estimate, D AI hypothesis",
           "_summary": f"{q}: {A['verdict']} (opportunity {A['opportunity']}, confidence {A['confidence_label']})"}
    return out


def trend_rows(country):
    c = trending.conn()
    rows = {}
    for kw, mom, lv in c.execute("SELECT kw, mom, level FROM trend_kw WHERE country=?", (country,)):
        rows[kw] = {"mom": mom, "level": lv}
    for kw, img, name, price, cur, src, url in c.execute("SELECT kw, image, name, price, cur, source, url FROM trend_products WHERE country=? AND rank=1", (country,)):
        rows.setdefault(kw, {}).update(image=img, name=name, price=price, cur=cur, source=src, url=url)
    c.close()
    for kw, ph in trending.idea_images(country).items():   # every idea gets a real photo, even when it is not in today's top list
        if not rows.get(kw, {}).get("image"):
            rows.setdefault(kw, {}).update(image=ph["image"], name=ph["name"], price=ph["price"], cur=ph["cur"], source=ph["source"], url=ph["url"])
    return rows


def ai_quota(u):
    p = plan_of(u)
    key = f"u{u['id']}" if u else None
    month = dt.date.today().strftime("%Y-%m")
    used = db().execute("SELECT n FROM ai_usage WHERE key=? AND month=?", (key, month)).fetchone() if key else None
    return p.get("ai_per_month", 0), (used["n"] if used else 0), key, month


def ai_count(key, month, usage):
    db().execute("INSERT INTO ai_usage VALUES (?,?,1,?,?) ON CONFLICT(key,month) DO UPDATE SET n=n+1, tin=tin+excluded.tin, tout=tout+excluded.tout",
                 (key, month, int(usage.get("prompt_tokens") or 0), int(usage.get("completion_tokens") or 0)))
    db().commit()


# ---------------- Product Finder ----------------
@app.post("/api/finder")
def finder_api():
    j = request.get_json(force=True)
    country = (j.get("country") or "BD").upper()[:2]
    res = research.finder(IDEAS["ideas"], j, country, trend_rows(country), rates=rates())
    if j.get("count_only"):
        return jsonify(matches=len(res))
    lim = plan_of(me()).get("finder", 3)
    return jsonify(results=res[:lim], total=min(len(res), 10), locked=max(0, min(len(res), 10) - lim), matches=len(res))


# ---------------- AI assistant ----------------
@app.post("/api/assistant")
def assistant():
    j = request.get_json(force=True)
    u = me()
    if not u:
        return jsonify(error="login", message="Create a free account to ask the AI assistant. Free accounts get AI reports every month."), 401
    limit, used, key, month = ai_quota(u)
    if used >= limit:
        return jsonify(error="limit", message=f"You used all {limit} AI answers this month. Upgrade for more."), 402
    msgs = [m for m in (j.get("messages") or []) if m.get("role") in ("user", "assistant") and m.get("content")][-12:]
    if not msgs or msgs[-1]["role"] != "user":
        return jsonify(error="Ask a question first."), 400
    country, currency = (j.get("country") or "BD").upper()[:2], (j.get("currency") or "BDT").upper()[:3]
    ctx = {"country": country, "currency": currency, "product": (j.get("product") or "")[:80]}
    tools = {"research_product": lambda a: research_compact((a.get("product") or ctx["product"] or "").strip()[:80], (a.get("country") or country).upper()[:2], currency),
             "find_products": lambda a: {"results": [{"product": r["idea"]["name"], "search_term": r["idea"]["kw"], "category": r["idea"]["cat"], "season": r["season"],
                                                       "reasons": r["reasons"], "buyer_why": r["idea"]["why"], "risk": r["idea"]["risk"]} for r in research.finder(IDEAS["ideas"], a, country, trend_rows(country))[:8]],
                                         "note": "Ranked by season (C, our guide) and Google Trends momentum (A) where available.", "_summary": "product suggestions"},
             "trending_now": lambda a: {"rising": [{"product": k, "change_4_weeks_percent": round((v.get("mom", 1) - 1) * 100), "level": v.get("level")} for k, v in
                                                    sorted(trend_rows((a.get("country") or country).upper()[:2]).items(), key=lambda x: -(x[1].get("mom") or 0))[:10] if v.get("mom")],
                                        "source": "Google Trends via SerpApi", "_summary": "trending list"},
             "profit_calc": lambda a: dict(ai.profit_calc(a), _summary="profit calculation")}
    if not ai.configured():
        q = ctx["product"] or research.match_idea(msgs[-1]["content"], IDEAS["ideas"]) and research.match_idea(msgs[-1]["content"], IDEAS["ideas"])["kw"]
        if not q:
            return jsonify(reply="The AI is not connected yet (add AI_API_KEY and AI_MODEL in .env). Meanwhile, type a product name in Deep research to get the full evidence report.", calls=[], offline=True)
        r = research_compact(q, country, currency)
        mpv = r["market_price"]
        txt = (f"**{r['verdict']}** for {q} (opportunity {r['opportunity_score']}, evidence {r['evidence_confidence']}).\n\n"
               + (f"Typical market price: {mpv['typical']} {mpv['currency']} [{mpv['source']}].\n\n" if mpv else "")
               + "**Devil's Advocate**\n" + "\n".join("- " + x for x in r["devils_advocate"][:3])
               + "\n\n**Next steps**\n" + "\n".join("- " + x for x in r["next_actions"][:3])
               + "\n\n_The AI is not connected, so this is the research engine's own summary. Add AI_API_KEY to get written answers._")
        return jsonify(reply=txt, calls=[{"name": "research_product", "args": {"product": q}, "ok": True, "summary": r["_summary"]}], offline=True)
    try:
        out = ai.run(msgs, ctx, tools)
    except Exception as e:
        return jsonify(error="ai", message=f"The AI service did not answer: {str(e)[:160]}"), 502
    ai_count(key, month, out["usage"])
    return jsonify(reply=out["reply"], calls=out["calls"], credits_left=max(0, limit - used - 1))


@app.post("/api/reviews")
def reviews_api():
    j = request.get_json(force=True)
    text, q = (j.get("text") or "").strip(), (j.get("product") or "")[:80]
    if len(text) < 20:
        return jsonify(error="Paste at least a few reviews, one per line."), 400
    u = me()
    if u and ai.configured():
        limit, used, key, month = ai_quota(u)
        if used < limit:
            try:
                out = ai.reviews(text, q, "Bangla" if j.get("lang") == "bn" else "English")
                ai_count(key, month, out.pop("usage", {}))
                return jsonify(out)
            except Exception:
                pass
    return jsonify(ai.reviews_fallback(text))


# ---------------- projects (saved research) ----------------
@app.get("/api/projects")
@need_login
def projects():
    rows = db().execute("SELECT id, name, q, country, updated, data FROM projects WHERE uid=? ORDER BY updated DESC", (me()["id"],)).fetchall()
    out = []
    for r in rows:
        d = json.loads(r["data"] or "{}")
        out.append({"id": r["id"], "name": r["name"], "q": r["q"], "country": r["country"], "updated": r["updated"], "verdict": (d.get("snapshot") or {}).get("verdict"),
                    "step": d.get("step", 0), "tasks_done": sum(1 for t in d.get("tasks", []) if t.get("done")), "tasks": len(d.get("tasks", []))})
    return jsonify(out)


@app.post("/api/projects")
@need_login
def project_new():
    j, u = request.get_json(force=True), me()
    q = (j.get("q") or "").strip()[:80]
    if not q:
        return jsonify(error="empty"), 400
    n = db().execute("SELECT COUNT(*) c FROM projects WHERE uid=?", (u["id"],)).fetchone()["c"]
    if n >= plan_of(u).get("projects", 3):
        return jsonify(error="limit", message="Your plan's project limit is reached. Upgrade or delete an old project."), 402
    old = db().execute("SELECT id FROM projects WHERE uid=? AND lower(q)=lower(?) AND country=?", (u["id"], q, j.get("country", "BD"))).fetchone()
    if old:
        return jsonify(id=old["id"])
    cur = db().execute("INSERT INTO projects(uid,name,q,country,data,created,updated) VALUES (?,?,?,?,?,?,?)",
                       (u["id"], (j.get("name") or q)[:80], q, (j.get("country") or "BD")[:2], json.dumps(j.get("data") or {}), time.time(), time.time()))
    db().commit()
    return jsonify(id=cur.lastrowid)


@app.route("/api/projects/<int:pid>", methods=["GET", "PUT", "DELETE"])
@need_login
def project(pid):
    u = me()
    r = db().execute("SELECT * FROM projects WHERE id=? AND uid=?", (pid, u["id"])).fetchone()
    if not r:
        return jsonify(error="not found"), 404
    if request.method == "GET":
        return jsonify(id=r["id"], name=r["name"], q=r["q"], country=r["country"], data=json.loads(r["data"] or "{}"), updated=r["updated"])
    if request.method == "DELETE":
        db().execute("DELETE FROM projects WHERE id=?", (pid,)); db().commit()
        return jsonify(ok=True)
    d = json.loads(r["data"] or "{}")
    patch = request.get_json(force=True).get("data") or {}
    for k in ("notes", "competitors", "quotes", "tasks", "step", "snapshot", "reviews", "decision"):
        if k in patch:
            d[k] = patch[k]
    raw = json.dumps(d)
    if len(raw) > 300_000:
        return jsonify(error="Project is too large."), 400
    db().execute("UPDATE projects SET data=?, updated=? WHERE id=?", (raw, time.time(), pid)); db().commit()
    return jsonify(ok=True)



# ---------------- user dashboard ----------------
def is_admin(u):
    if not u:
        return False
    admins = [e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()]
    return bool(("is_admin" in u.keys() and u["is_admin"]) or u["email"].lower() in admins)


def need_admin(f):
    @wraps(f)
    def w(*a, **k):
        if not is_admin(me()):
            return jsonify(error="admin", message="Admins only."), 403
        return f(*a, **k)
    return w


@app.get("/api/dashboard")
@need_login
def dashboard():
    u = me()
    p = plan_of(u)
    key = f"u{u['id']}"
    today, month = dt.date.today(), dt.date.today().strftime("%Y-%m")
    used = db().execute("SELECT n FROM usage WHERE key=? AND day=?", (key, today.isoformat())).fetchone()
    week = []
    for i in range(13, -1, -1):
        d = (today - dt.timedelta(days=i)).isoformat()
        r = db().execute("SELECT n FROM usage WHERE key=? AND day=?", (key, d)).fetchone()
        week.append({"day": d, "n": r["n"] if r else 0})
    ai_used = db().execute("SELECT n FROM ai_usage WHERE key=? AND month=?", (key, month)).fetchone()
    recent = [{"q": r["q"].split("|")[0], "country": r["q"].split("|")[1] if "|" in r["q"] else "", "day": r["day"]}
              for r in db().execute("SELECT q, day FROM seen WHERE key=? ORDER BY day DESC LIMIT 12", (key,))]
    projs = db().execute("SELECT id, name, q, country, updated, data FROM projects WHERE uid=? ORDER BY updated DESC LIMIT 6", (u["id"],)).fetchall()
    pj = []
    for r in projs:
        d = json.loads(r["data"] or "{}")
        pj.append({"id": r["id"], "name": r["name"], "q": r["q"], "country": r["country"], "updated": r["updated"], "verdict": (d.get("snapshot") or {}).get("verdict"),
                   "score": (d.get("snapshot") or {}).get("opportunity"), "tasks_done": sum(1 for t in d.get("tasks", []) if t.get("done")), "tasks": len(d.get("tasks", []))})
    nproj = db().execute("SELECT COUNT(*) c FROM projects WHERE uid=?", (u["id"],)).fetchone()["c"]
    nsaved = db().execute("SELECT COUNT(*) c FROM saved WHERE uid=?", (u["id"],)).fetchone()["c"]
    saved_items = [r["item"] for r in db().execute("SELECT item FROM saved WHERE uid=? ORDER BY t DESC LIMIT 8", (u["id"],))]
    return jsonify(user={"email": u["email"], "name": u["name"], "plan": u["plan"], "plan_name": p["name"], "until": u["plan_until"], "since": u["created"]},
                   checks={"used": used["n"] if used else 0, "limit": p["searches_per_day"], "week": week},
                   ai={"used": ai_used["n"] if ai_used else 0, "limit": p.get("ai_per_month", 0), "on": ai.configured()},
                   projects={"n": nproj, "limit": p.get("projects", 0), "items": pj}, saved={"n": nsaved, "limit": p["saved"], "items": saved_items},
                   recent=recent)


# ---------------- admin dashboard (ADMIN_EMAILS in .env) ----------------
@app.get("/api/admin/overview")
@need_admin
def admin_overview():
    d = db()
    today, month = dt.date.today(), dt.date.today().strftime("%Y-%m")
    users = d.execute("SELECT COUNT(*) c FROM users").fetchone()["c"]
    by_plan = {r["plan"]: r["c"] for r in d.execute("SELECT plan, COUNT(*) c FROM users GROUP BY plan")}
    days = [(today - dt.timedelta(days=i)).isoformat() for i in range(29, -1, -1)]
    signups = {r["d"]: r["c"] for r in d.execute("SELECT substr(created,1,10) d, COUNT(*) c FROM users WHERE created >= ? GROUP BY d", (days[0],))}
    checks = {r["day"]: r["c"] for r in d.execute("SELECT day, SUM(n) c FROM usage WHERE day >= ? GROUP BY day", (days[0],))}
    active = {r["day"]: r["c"] for r in d.execute("SELECT day, COUNT(DISTINCT key) c FROM usage WHERE day >= ? GROUP BY day", (days[0],))}
    series = [{"day": x, "signups": signups.get(x, 0), "checks": checks.get(x, 0), "active": active.get(x, 0)} for x in days]
    a = d.execute("SELECT COALESCE(SUM(n),0) n, COALESCE(SUM(tin),0) tin, COALESCE(SUM(tout),0) tout FROM ai_usage WHERE month=?", (month,)).fetchone()
    pin, pout = float(os.getenv("AI_PRICE_IN", "0") or 0), float(os.getenv("AI_PRICE_OUT", "0") or 0)
    cost = round(a["tin"] / 1e6 * pin + a["tout"] / 1e6 * pout, 2) if (pin or pout) else None
    top = [{"q": r["q"].split("|")[0], "country": r["q"].split("|")[-1], "n": r["c"]} for r in
           d.execute("SELECT q, COUNT(*) c FROM seen WHERE day >= ? GROUP BY q ORDER BY c DESC LIMIT 15", (days[0],))]
    mrr = {}
    for k, n in by_plan.items():
        price = (PLANS.get("prices") or {}).get(k) or {}
        for cur, v in price.items():
            if v:
                mrr[cur] = mrr.get(cur, 0) + v * n
    c = trending.conn()
    fresh = [{"country": r[0], "updated": r[1], "note": r[2]} for r in c.execute("SELECT country, updated, note FROM trend_meta")]
    jobs = [{"t": r[0], "job": r[1], "country": r[2], "ok": bool(r[3]), "note": r[4]} for r in c.execute("SELECT t, job, country, ok, note FROM job_log ORDER BY t DESC LIMIT 15")]
    nideas = len(IDEAS["ideas"])
    photos = {r[0]: r[1] for r in c.execute("SELECT country, COUNT(*) FROM idea_img GROUP BY country")}
    tracked = {r[0]: r[1] for r in c.execute("SELECT country, COUNT(*) FROM trend_kw GROUP BY country")}
    c.close()
    return jsonify(users=users, by_plan=by_plan, series=series, today={"checks": checks.get(today.isoformat(), 0), "active": active.get(today.isoformat(), 0), "signups": signups.get(today.isoformat(), 0)},
                   ai={"answers": a["n"], "tokens_in": a["tin"], "tokens_out": a["tout"], "cost_usd": cost, "on": ai.configured(), "provider": ai.provider() if ai.configured() else None},
                   top_searches=top, revenue_estimate=mrr, data={"countries": trending.COUNTRIES, "fresh": fresh, "jobs": jobs, "photos": photos, "tracked": tracked, "ideas": nideas,
                   "refresh_hours": float(os.getenv("REFRESH_HOURS", "24")), "auto": os.getenv("AUTO_REFRESH", "1") != "0", "running": trending._lock.locked()},
                   sources=configured(), plans=list(PLANS["plans"].keys()))


@app.get("/api/admin/users")
@need_admin
def admin_users():
    q = "%" + (request.args.get("q") or "").strip().lower() + "%"
    month, today = dt.date.today().strftime("%Y-%m"), dt.date.today().isoformat()
    rows = db().execute("""SELECT u.id, u.email, u.name, u.plan, u.plan_until, u.created, u.is_admin,
        (SELECT COALESCE(SUM(n),0) FROM usage WHERE key='u'||u.id) checks,
        (SELECT COALESCE(n,0) FROM usage WHERE key='u'||u.id AND day=?) today,
        (SELECT COALESCE(n,0) FROM ai_usage WHERE key='u'||u.id AND month=?) ai,
        (SELECT COUNT(*) FROM projects WHERE uid=u.id) projects,
        (SELECT MAX(day) FROM usage WHERE key='u'||u.id) last
        FROM users u WHERE lower(u.email) LIKE ? OR lower(COALESCE(u.name,'')) LIKE ? ORDER BY u.id DESC LIMIT 200""", (today, month, q, q)).fetchall()
    return jsonify([dict(r) for r in rows])


@app.post("/api/admin/plan")
@need_admin
def admin_plan():
    j = request.get_json(force=True)
    plan = j.get("plan")
    if plan not in PLANS["plans"] or plan == "guest":
        return jsonify(error="Unknown plan."), 400
    until = (j.get("until") or None) if plan != "free" else None
    n = db().execute("UPDATE users SET plan=?, plan_until=? WHERE id=?", (plan, until, int(j.get("id") or 0))).rowcount
    db().commit()
    return jsonify(ok=bool(n))


@app.post("/api/admin/refresh")
@need_admin
def admin_refresh():
    j = request.get_json(force=True)
    cc = (j.get("country") or trending.COUNTRIES[0]).upper()
    if cc not in trending.COUNTRIES:
        return jsonify(error="Country is not in TRENDING_COUNTRIES."), 400
    if trending._lock.locked():
        return jsonify(ok=False, message="A refresh is already running.")
    if j.get("what") == "images":
        threading.Thread(target=trending.refresh_images, args=(cc, 0), daemon=True).start()
    else:
        trending.refresh_in_background(cc)
    return jsonify(ok=True, message=f"Refresh started for {cc}. It takes a few minutes.")

# ---------------- admin login, API keys ----------------
# The first admin is seeded from ADMIN_EMAIL / ADMIN_PASSWORD by bootstrap.py at container start,
# so there is no "create the first admin" endpoint on the public internet.
def admin_exists():
    return bool(db().execute("SELECT 1 FROM users WHERE is_admin=1 LIMIT 1").fetchone())


@app.get("/api/admin/status")
def admin_status():
    u = me()
    return jsonify(has_admin=admin_exists(), is_admin=is_admin(u), logged_in=bool(u))


@app.post("/api/admin/login")
def admin_login():
    j = request.get_json(force=True)
    email = (j.get("email") or "").strip().lower()
    tkey = f"admin|{client_ip()}|{email}"
    if throttled(tkey):
        return too_many()
    u = db().execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    if not u or not check_password_hash(u["pw"], j.get("password") or ""):
        login_failed(tkey)
        return jsonify(error="Email or password is wrong."), 400
    if not is_admin(u):
        login_failed(tkey)
        return jsonify(error="This account is not an admin. Use the normal log in page."), 403
    start_session(u)
    return jsonify(ok=True)


@app.get("/api/admin/settings")
@need_admin
def admin_settings():
    return jsonify(fields=settings.describe())


@app.post("/api/admin/settings")
@need_admin
def admin_settings_save():
    j = request.get_json(force=True) or {}
    vals = {k: v for k, v in j.items() if k in settings.KEYS and v != "__keep__"}
    settings.save(vals)
    trending.COUNTRIES[:] = [c.strip().upper() for c in os.getenv("TRENDING_COUNTRIES", "BD,US").split(",") if c.strip()] or ["BD"]
    return jsonify(ok=True, fields=settings.describe())


@app.post("/api/admin/test")
@need_admin
def admin_test():
    """Try one small live request with the saved key and say plainly whether it works."""
    src = (request.get_json(force=True) or {}).get("source")
    try:
        if src == "serpapi":
            r = sources.trends("phone case", "BD")
            return jsonify(ok=bool(r.get("ok")), message="Google Trends answered." if r.get("ok") else r.get("reason"))
        if src == "aliexpress":
            r = sources.aliexpress("phone case", "BD")
            return jsonify(ok=bool(r.get("ok")), message=f"AliExpress sent {len(r.get('items') or [])} products." if r.get("ok") else r.get("reason"))
        if src == "youtube":
            r = sources.youtube("phone case review", "BD")
            return jsonify(ok=bool(r.get("ok")), message="YouTube answered." if r.get("ok") else r.get("reason"))
        if src == "ebay":
            r = sources.ebay("phone case", "US")
            return jsonify(ok=bool(r.get("ok")), message="eBay answered." if r.get("ok") else r.get("reason"))
        if src == "daraz":
            r = sources.daraz("phone case", "BD")
            return jsonify(ok=bool(r.get("ok")), message=f"Daraz sent {len(r.get('items') or [])} products." if r.get("ok") else r.get("reason"))
        if src == "ai":
            if not ai.configured():
                return jsonify(ok=False, message="Add the API key and the model name first.")
            msg, _ = ai.chat([{"role": "user", "content": "Reply with the single word OK."}], max_tokens=10)
            return jsonify(ok=True, message="The AI answered: " + str(msg.get("content") or "OK")[:40])
    except Exception as e:
        return jsonify(ok=False, message=str(e)[:200])
    return jsonify(ok=False, message="Unknown source."), 400


@app.post("/api/admin/role")
@need_admin
def admin_role():
    j = request.get_json(force=True)
    uid, flag = int(j.get("id") or 0), 1 if j.get("admin") else 0
    if uid == me()["id"] and not flag:
        return jsonify(error="You can't remove your own admin access."), 400
    db().execute("UPDATE users SET is_admin=? WHERE id=?", (flag, uid)); db().commit()
    return jsonify(ok=True)


# ---------------- checkout (connect your payment gateway) ----------------
@app.get("/api/checkout")
@need_login
def checkout():
    plan, cur = request.args.get("plan", "pro"), request.args.get("currency", "USD").upper()
    link = (PLANS["checkout"].get(plan) or {}).get("BDT" if cur == "BDT" else "USD")
    if not link:
        return jsonify(error="Payments are not connected yet. Contact us to upgrade.", contact=PLANS.get("contact")), 503
    return jsonify(url=link.replace("{email}", me()["email"]))


# automatic refresh: trends + products every REFRESH_HOURS (default 6), photos weekly. Works under gunicorn too.
trending.start_scheduler()

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    print(f"Product Radar API running at http://localhost:{port}  (Ctrl+C to stop)")
    app.run(host=os.getenv("HOST", "127.0.0.1"), port=port, debug=False)
