# Product Radar

Product research for online sellers: search any product and see live demand (Google Trends), marketplace prices, supplier cost, season and profit, then get a **Go / Test small / Skip** verdict with graded evidence. Free and paid plans, 11 currencies, English and বাংলা.

This repository is a **monorepo with two independently deployable apps**, each with its own Dockerfile, built for **Coolify**:

| App | Path | Tech | Production URL |
|---|---|---|---|
| **web** (frontend) | `apps/web` | Vanilla JS single-page app served by Nginx | `https://projectradar.maktechgroup.com` |
| **api** (backend) | `apps/api` | Python 3.12, Flask, Gunicorn, SQLite | `https://api-pradar.maktechgroup.com` |

---

## 1. Architecture

```
                         Browser
                            │
        ┌───────────────────┴────────────────────┐
        │ HTML/JS/CSS                             │ fetch(..., {credentials:"include"})
        ▼                                         ▼
┌──────────────────────────────┐      ┌──────────────────────────────────────┐
│ projectradar.maktechgroup.com│      │ api-pradar.maktechgroup.com          │
│ Coolify app "product-radar-  │      │ Coolify app "product-radar-api"      │
│ web"  (apps/web/Dockerfile)  │      │ (apps/api/Dockerfile)                │
│                              │      │                                      │
│ nginx:1.27-alpine            │      │ gunicorn (1 worker × 16 threads)     │
│  ├ index.html + /static/*    │      │  ├ Flask JSON API  /api/*            │
│  ├ /config.js  ← API_URL     │      │  ├ CORS allow-list + CSRF guard      │
│  │   (generated at start)    │      │  ├ session cookie (HttpOnly, Secure) │
│  └ CSP + security headers    │      │  ├ background auto-refresh thread    │
│                              │      │  └ /healthz                          │
└──────────────────────────────┘      │                                      │
                                      │ /data  (Coolify persistent volume)   │
                                      │  ├ app.db   SQLite (WAL)             │
                                      │  ├ watch.json, plans.json (optional) │
                                      │  └ benchmark/                        │
                                      └───────────────┬──────────────────────┘
                                                      │ outbound HTTPS
                     SerpApi (Google Trends/Shopping) · AliExpress · eBay · Daraz ·
                     YouTube · open.er-api.com (FX) · your AI provider (OpenAI-compatible)
```

Both containers sit behind Coolify's reverse proxy (Traefik), which terminates TLS and issues Let's Encrypt certificates.

### How the two apps talk

1. The browser loads the SPA from `projectradar.maktechgroup.com`.
2. `/config.js` (written by the web container at start from `API_URL`) tells the SPA where the API is.
3. Every API call is a cross-origin `fetch` to `api-pradar.maktechgroup.com` with `credentials: "include"`.
4. The API answers only allowed origins (`CORS_ORIGINS`) and sets a host-only session cookie on `api-pradar.maktechgroup.com`.
5. Both hosts share the registrable domain `maktechgroup.com`, so they are the **same site**. `SameSite=Lax` cookies are therefore sent on these requests, and browsers don't treat them as third-party cookies.

### Authentication (users and admins)

| | User dashboard | Admin console |
|---|---|---|
| URL | `https://projectradar.maktechgroup.com/#/login` → `#/dashboard` | `https://projectradar.maktechgroup.com/#/adminlogin` → `#/admin`, `#/apikeys` |
| Method | Email + password (sign up or log in) | Email + password, admin accounts only |
| First account | Self sign-up | **Seeded automatically** from `ADMIN_EMAIL` / `ADMIN_PASSWORD` |
| Session | Signed HttpOnly cookie `pr_session`, 30 days (`SESSION_DAYS`) | Same cookie, plus an admin check on every `/api/admin/*` call |

- **Admin seeding** (`apps/api/bootstrap.py`, run by the container entrypoint before Gunicorn starts):
  - No user with `ADMIN_EMAIL` → creates it as admin (Business plan).
  - User exists → makes sure it is admin.
  - `ADMIN_SYNC_PASSWORD=1` (default) → if `ADMIN_PASSWORD` changed, the stored password is updated and **every existing session of that account is logged out**. Env is the source of truth: to rotate the admin password, change the env var and redeploy.
  - The container **refuses to start** if `ADMIN_EMAIL` is missing or `ADMIN_PASSWORD` has fewer than 12 characters.
- The old public "create the first admin" endpoint was removed, so no one can claim the admin account on a fresh deploy.
- More admins: the person signs up as a normal user, then an admin promotes them in **Admin overview → Users** (or list their email in `ADMIN_EMAILS`).
- Passwords are hashed with Werkzeug (scrypt). Any password change ends the old sessions, because each session cookie carries a fingerprint of the password hash.

### Security built in

| Layer | What it does |
|---|---|
| **CSP (web)** | `script-src 'self'` (no inline scripts or inline event handlers; `boot.js` replaces them), `connect-src 'self' <API origin>`, `frame-src` only Google Trends and youtube-nocookie, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`. `style-src` allows `'unsafe-inline'` because the UI renders style attributes; `img-src https:` because product photos come from many marketplace CDNs. |
| **CSP (api)** | `default-src 'none'; frame-ancestors 'none'` (it only serves JSON). |
| **Other headers** | HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy` (web), `Cross-Origin-Resource-Policy: same-site` and `Cache-Control: no-store` (API). |
| **CORS** | Exact-match allow-list (`CORS_ORIGINS`) with credentials. No wildcard. |
| **CSRF** | Writes (`POST/PUT/DELETE`) from a non-allowed `Origin` get 403. Write bodies must be `application/json` (415 otherwise), which forces a CORS preflight, so a plain HTML form on another site can't post. |
| **Brute force** | Login, admin login and sign-up are limited per IP + email (`LOGIN_MAX_ATTEMPTS` per `LOGIN_WINDOW_MINUTES`), stored in SQLite. |
| **Real client IP** | `ProxyFix` trusts exactly `PROXY_COUNT` proxy hops, so guest limits and throttling can't be bypassed by forging `X-Forwarded-For`. |
| **Containers** | API runs as an unprivileged `app` user (uid 10001), and its code is read-only to that user. Request bodies are capped at 1 MB. API keys saved in the admin console are never returned, only the last 4 characters. |

---

## 2. Repository layout

```
product-radar/
├── apps/
│   ├── api/                          # backend (Coolify app #1)
│   │   ├── Dockerfile
│   │   ├── docker-entrypoint.sh      # checks /data is writable, runs bootstrap.py, starts gunicorn
│   │   ├── gunicorn.conf.py
│   │   ├── .env.example              # copy-paste env for Coolify / local
│   │   ├── app.py                    # Flask routes (JSON API only)
│   │   ├── config.py                 # paths (DATA_DIR / CONTENT_DIR), env helpers, DB schema
│   │   ├── bootstrap.py              # schema migration + admin seeding
│   │   ├── settings.py               # API keys editable from the admin console
│   │   ├── sources.py                # SerpApi, eBay, AliExpress, Daraz, YouTube, FX
│   │   ├── trending.py               # trend ranking + background auto-refresh
│   │   ├── research.py               # scoring, evidence grades, Devil's Advocate
│   │   ├── ai.py                     # OpenAI-compatible assistant
│   │   ├── admin.py                  # CLI: list users, set plans
│   │   ├── benchmark.py              # CLI: AI quality benchmark
│   │   └── content/                  # bundled, read-only: ideas.json, plans.json, benchmark_products.json
│   └── web/                          # frontend (Coolify app #2)
│       ├── Dockerfile
│       ├── nginx/default.conf.template           # server config + CSP/security headers
│       ├── docker-entrypoint.d/40-product-radar-config.sh   # writes config.js + nginx conf from env
│       ├── .env.example
│       └── public/
│           ├── index.html
│           └── static/  boot.js app.js screens.js extra.js ui.js style.css brand/
├── docker-compose.yml                # local test of both containers together
├── .env.example                      # used only by docker-compose
└── README.md
```

---

## 3. Environment variables

**Short version:** nothing is required at build time. Every required variable is **runtime**. The only build-time variable is the optional `APP_VERSION`, which is used at both build and runtime.

In Coolify, leave the **build variable** option (labelled "Build Variable?" or "Available at Buildtime", depending on your Coolify version) **off** for everything except `APP_VERSION`. Runtime variables only need a **restart** to change. Build variables need a **redeploy**.

### 3.1 API (`apps/api`): paste into the Coolify app "product-radar-api"

```env
# ---- Core / security (required) ----
SECRET_KEY=PASTE_OUTPUT_OF__openssl_rand_-hex_32
CORS_ORIGINS=https://projectradar.maktechgroup.com
COOKIE_SECURE=1
PROXY_COUNT=1

# ---- Seeded dashboard admin (required) ----
ADMIN_EMAIL=admin@maktechgroup.com
ADMIN_PASSWORD=PASTE_A_STRONG_PASSWORD_MIN_12_CHARS
ADMIN_NAME=MAKTech Admin
ADMIN_SYNC_PASSWORD=1
ADMIN_EMAILS=

# ---- Live data sources (optional; can also be set later in Admin > API keys) ----
SERPAPI_KEY=
EBAY_CLIENT_ID=
EBAY_CLIENT_SECRET=
ALI_APP_KEY=
ALI_APP_SECRET=
ALI_TRACKING_ID=
YOUTUBE_API_KEY=
DARAZ_ENABLED=1

# ---- AI assistant (optional; any OpenAI-compatible API) ----
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=
AI_MODEL=
AI_PRICE_IN=0
AI_PRICE_OUT=0

# ---- Data refresh & caching ----
TRENDING_COUNTRIES=BD
TRENDING_TOP=12
AUTO_REFRESH=1
REFRESH_HOURS=24
IMAGE_REFRESH_LIMIT=60
CACHE_HOURS=12

# ---- Server tuning (optional) ----
GUNICORN_THREADS=16
GUNICORN_TIMEOUT=120
LOGIN_MAX_ATTEMPTS=8
LOGIN_WINDOW_MINUTES=15
SESSION_DAYS=30
LOG_LEVEL=info

# ---- Build-time (optional; mark as build variable) ----
APP_VERSION=1.0.0
```

| Variable | When | Required | Default | Description |
|---|---|---|---|---|
| `SECRET_KEY` | Runtime | **Yes** | random, stored in DB | Signs session cookies. Use `openssl rand -hex 32`. Changing it logs everyone out. |
| `CORS_ORIGINS` | Runtime | **Yes** | `http://localhost:3000` | Comma-separated origins allowed to call the API with cookies. Exact match, no trailing slash. |
| `COOKIE_SECURE` | Runtime | **Yes** (prod) | `0` | `1` = cookie only over HTTPS + HSTS header. `HTTPS=1` still works as an alias. |
| `PROXY_COUNT` | Runtime | **Yes** (prod) | `1` | Reverse proxies in front of the API. Coolify/Traefik = `1`. Cloudflare (orange cloud) + Coolify = `2`. Local without proxy = `0`. |
| `ADMIN_EMAIL` | Runtime | **Yes** | – | Admin account seeded at every container start. |
| `ADMIN_PASSWORD` | Runtime | **Yes** | – | At least 12 characters. |
| `ADMIN_NAME` | Runtime | No | `Admin` | Display name used when the admin is created. |
| `ADMIN_SYNC_PASSWORD` | Runtime | No | `1` | `1` = reset the admin password to `ADMIN_PASSWORD` on start if it differs. `0` = only create once. |
| `ADMIN_EMAILS` | Runtime | No | – | Extra admin emails (comma separated). Those accounts must already exist. |
| `SERPAPI_KEY` | Runtime | No | – | Google Trends numbers, season charts, Trending ranking, Google Shopping prices. |
| `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET` | Runtime | No | – | eBay listings (display only, by licence). |
| `ALI_APP_KEY` / `ALI_APP_SECRET` / `ALI_TRACKING_ID` | Runtime | No | – | AliExpress supplier prices, order counts, photos, affiliate links. |
| `YOUTUBE_API_KEY` | Runtime | No | – | Review videos on the research page. |
| `DARAZ_ENABLED` | Runtime | No | `1` | Bangladesh prices/photos from Daraz's public search (experimental). |
| `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL` | Runtime | No | OpenAI URL | AI assistant and review analysis. Gemini: `https://generativelanguage.googleapis.com/v1beta/openai`, Groq: `https://api.groq.com/openai/v1`, OpenRouter: `https://openrouter.ai/api/v1`. |
| `AI_PRICE_IN` / `AI_PRICE_OUT` | Runtime | No | `0` | USD per 1M tokens, for the admin cost estimate. |
| `TRENDING_COUNTRIES` | Runtime | No | `BD,US` | Countries for the Trending page. Each one uses about 8 SerpApi searches per refresh. |
| `TRENDING_TOP` | Runtime | No | `12` | Products shown per country. |
| `AUTO_REFRESH` | Runtime | No | `1` | Background refresh thread inside the API. |
| `REFRESH_HOURS` | Runtime | No | `24` | Refresh interval. |
| `IMAGE_REFRESH_LIMIT` | Runtime | No | `60` | Photos re-checked per run. |
| `CACHE_HOURS` | Runtime | No | `12` | How long a product check is cached. |
| `GUNICORN_THREADS` / `GUNICORN_TIMEOUT` | Runtime | No | `16` / `120` | Concurrency and request timeout. The worker count is fixed at 1 (SQLite + scheduler). |
| `LOGIN_MAX_ATTEMPTS` / `LOGIN_WINDOW_MINUTES` | Runtime | No | `8` / `15` | Throttle for login, admin login and sign-up. |
| `SESSION_DAYS` | Runtime | No | `30` | Session lifetime. |
| `SESSION_COOKIE_SAMESITE` | Runtime | No | `Lax` | Only change to `None` if the frontend ever moves to a **different** registrable domain (needs `COOKIE_SECURE=1`). |
| `LOG_LEVEL` | Runtime | No | `info` | Gunicorn log level. |
| `DATA_DIR` | Runtime | No | `/data` (set in image) | Writable data directory. Mount the persistent volume here. |
| `CONTENT_DIR` | Runtime | No | `/app/content` (set in image) | Bundled read-only content. |
| `PORT` | Runtime | No | `8000` (set in image) | Listen port. |
| `APP_VERSION` | **Both** | No | `dev` | Build arg baked into the image, reported by `GET /` and `/healthz`. |

> Variables marked "Admin > API keys" (data source keys, AI settings, refresh settings) can also be saved in the admin console. A value saved there **wins over the env value** and works without a restart.

### 3.2 Web (`apps/web`): paste into the Coolify app "product-radar-web"

```env
# ---- Runtime (required) ----
API_URL=https://api-pradar.maktechgroup.com

# ---- Runtime (optional) ----
CSP_EXTRA_CONNECT_SRC=

# ---- Build-time (optional; mark as build variable) ----
APP_VERSION=1.0.0
```

| Variable | When | Required | Default | Description |
|---|---|---|---|---|
| `API_URL` | Runtime | **Yes** | `http://localhost:8000` | Public API URL. Written into `/config.js` and added to CSP `connect-src` at container start. No rebuild needed to change it. |
| `CSP_EXTRA_CONNECT_SRC` | Runtime | No | empty | Extra space-separated origins the browser may `fetch`, for example an analytics endpoint. |
| `APP_VERSION` | **Both** | No | `dev` | Build: stamped into asset URLs (`?v=`) for cache busting. Runtime: exposed as `PR_CONFIG.version`. |

### 3.3 Which variables must match between the two apps

```
web  API_URL       = https://api-pradar.maktechgroup.com       (API's public URL)
api  CORS_ORIGINS  = https://projectradar.maktechgroup.com     (web's public URL)
```

If these two don't match, the browser blocks every API call (CORS) or the API rejects writes with `403 origin`.

---

## 4. Deploying on Coolify (step by step)

### 4.0 Prerequisites

1. Push this repository to GitHub, GitLab or another Git provider Coolify can reach (private repos: connect Coolify's GitHub App or a deploy key).
2. DNS: create **A records** (or CNAMEs) pointing both hosts at your Coolify server:
   - `projectradar.maktechgroup.com` → server IP
   - `api-pradar.maktechgroup.com` → server IP

   If you use Cloudflare's proxy (orange cloud), set SSL mode to **Full (strict)** and set `PROXY_COUNT=2` on the API.

### 4.1 API app (deploy this first)

1. **Project → + New → Application →** your Git repository and branch.
2. **Build Pack:** `Dockerfile`
3. **Base Directory:** `/apps/api`  **Dockerfile Location:** `/Dockerfile`
4. **Ports Exposes:** `8000`
5. **Domains:** `https://api-pradar.maktechgroup.com`
6. **Persistent Storage → + Add → Volume Mount**
   - Name: `product-radar-data`  **Destination Path:** `/data`

   *(Without this, all users and data are lost on every redeploy.)*
7. **Environment Variables → Developer view:** paste block **3.1** and fill in `SECRET_KEY` and `ADMIN_PASSWORD`. Only `APP_VERSION` is a build variable.
8. **Health check** (optional, the image already has one): path `/healthz`, port `8000`.
9. **Deploy.** The logs should show:
   ```
   [bootstrap] admin admin@maktechgroup.com created
   [INFO] Listening at: http://0.0.0.0:8000
   ```
10. Check: `https://api-pradar.maktechgroup.com/healthz` → `{"ok":true,...}`

> Keep **one replica**. SQLite and the background refresh thread run inside a single container. Don't scale this app horizontally.

### 4.2 Web app

1. **+ New → Application →** same repository and branch.
2. **Build Pack:** `Dockerfile`
3. **Base Directory:** `/apps/web`  **Dockerfile Location:** `/Dockerfile`
4. **Ports Exposes:** `80`
5. **Domains:** `https://projectradar.maktechgroup.com`
6. **Environment Variables:** paste block **3.2**.
7. **Health check** (optional): path `/healthz`, port `80`.
8. **Deploy**, then open `https://projectradar.maktechgroup.com`.

### 4.3 After the first deploy

1. Open `https://projectradar.maktechgroup.com/#/adminlogin` and log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
2. **API keys** in the side menu: add SerpApi, AliExpress, AI and so on, then press **Test** for each.
3. Optional: in Coolify enable **Auto Deploy** on push for both apps. Use **Watch Paths** `apps/api/**` and `apps/web/**` so a frontend-only change doesn't redeploy the API.

### 4.4 Updating and rollback

- Push to the branch, then Coolify rebuilds that app. Data in `/data` survives.
- Changing a runtime env var needs only a **Restart**. Changing `APP_VERSION` needs a **Redeploy**.
- Rollback: Coolify → Deployments → pick an earlier deployment → Redeploy. The schema migrations in `config.py` only add tables and columns, so older images still work.

---

## 5. Operations

### Backups

Everything lives in the API volume (`/data/app.db`, SQLite in WAL mode). Take a consistent copy from the API container's terminal (Coolify → API app → Terminal):

```sh
python -c "import sqlite3; s=sqlite3.connect('/data/app.db'); d=sqlite3.connect('/data/backup.db'); s.backup(d); d.close()"
```

Then download `/data/backup.db`, or add a Coolify **Scheduled Task** that runs this command daily and copies the file to off-site storage.

### Useful commands (API container terminal)

```sh
python admin.py users                              # list users
python admin.py plan buyer@email.com pro 2026-12-31   # give a plan after payment
python admin.py plan buyer@email.com free          # back to free
python trending.py                                 # force a trends refresh now
python benchmark.py BD                             # AI benchmark -> /data/benchmark/
python bootstrap.py                                # re-run migrations + admin seeding
```

### Editing content without a rebuild

The image ships `content/ideas.json`, `content/plans.json` and `content/benchmark_products.json`. To override one on the server, put a file with the same name in `/data/` (for example `/data/plans.json`) and restart the API. `/data/watch.json` (a JSON list such as `["air purifier","baby monitor"]`) adds extra keywords to track.

- Plans, prices, limits and checkout links: `plans.json` (`checkout` URLs may contain `{email}`).
- Product ideas: `ideas.json`.
- UI text (EN and বাংলা): `apps/web/public/static/app.js` (the `W` object). Styles: `static/style.css`. These need a web redeploy.

---

## 6. Local development

### With Docker (both apps, like production)

```sh
cp .env.example .env          # local admin creds, AUTO_REFRESH=0
docker compose up --build
# Web  http://localhost:3000      Admin  http://localhost:3000/#/adminlogin
# API  http://localhost:8000/healthz
```

To use real API keys locally, also create `apps/api/.env` from `apps/api/.env.example`. Compose loads it, and the local values in `docker-compose.yml` (CORS, cookies, proxy) override the production ones.

### Without Docker

```sh
# API
cd apps/api
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # then set: CORS_ORIGINS=http://localhost:3000, COOKIE_SECURE=0, PROXY_COUNT=0, DATA_DIR=./data
python bootstrap.py && python app.py            # http://localhost:8000

# Web (any static server; config.js points at the API)
cd apps/web/public
printf 'window.PR_CONFIG={apiUrl:"http://localhost:8000"};\n' > config.js
python3 -m http.server 3000                      # http://localhost:3000
```

(The plain static server doesn't send the CSP headers. Use Docker to test those.)

---

## 7. What the app does

- **Home:** Discover products, Deep research, Analyze competitors, Ask AI, Continue research.
- **Discover:** Product Finder (channel, budget, category, buyer, risk), Trending, Ideas, Season calendar.
- **Research:** a 7-step workspace (Overview, Demand, Timing, Competitors, Customer voice, Sourcing & cost, Decision) with an Ask AI panel.
- **Projects and Report:** saved research and a printable 8-part report.
- **User dashboard** (`#/dashboard`): checks left today, AI answers left, projects, shortlist, recent checks, rising products, season chart.
- **Admin console** (`#/admin`, `#/apikeys`): users and plans, sign-ups and checks per day, AI usage and cost, revenue estimate, top searches, data freshness with Refresh/Photos buttons, job log, and API keys with Test buttons.

### Evidence and scoring

- Two scores: **Opportunity** and **Evidence confidence**. A "Go" with low confidence is lowered to "Test small".
- Evidence grades: **A** observed on a dated source, **B** calculated, **C** estimate or guide, **D** AI hypothesis.
- **Devil's Advocate**, **Still unknown** and **What to do next** sections come with every verdict. The logic is in `apps/api/research.py`, shared by the website, the AI assistant and the benchmark.

### Data sources and provider rules

| Source | Adds | Get a key | Notes |
|---|---|---|---|
| SerpApi | Trend numbers, momentum, season charts, Google Shopping prices | serpapi.com | About 8 searches per country per refresh |
| AliExpress Affiliate API | Supplier prices, orders, photos, affiliate links | AliExpress Open Platform | Shown unmodified with links |
| eBay Browse API | Listings (display only) | developer.ebay.com | Its licence forbids price modelling, so it is never used in scores |
| Daraz | Bangladesh prices and photos | none | Public search page, experimental. `DARAZ_ENABLED=0` to turn off |
| YouTube Data API v3 | Review videos | Google Cloud console | Embedded via youtube-nocookie |
| open.er-api.com | 11 currencies | none | Attribution in the footer |
| AI (OpenAI-compatible) | Ask AI, review analysis | your provider | Numbers only from tools, own ideas marked as hypotheses |

Without any key the app still works: embedded Google Trends charts, idea guide, season calendar, profit calculator, accounts, plans and currencies.

### Plans and payments

Limits are in `plans.json` (guest 2 checks/day, free 5, pro 60, business 300; AI answers per month: free 3, pro 40, business 200). Checkout links go in `plans.json → checkout`. Until a payment gateway webhook is connected (SSLCommerz, bKash, Paddle…), assign plans in the admin console or with `admin.py`.

---

## 8. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Browser console: *blocked by CORS policy* | `CORS_ORIGINS` on the API must be exactly `https://projectradar.maktechgroup.com` (scheme, no trailing slash). |
| API returns `403 {"error":"origin"}` | Same as above: the request came from an origin not in `CORS_ORIGINS`. |
| Log in works but you're logged out on the next page | `COOKIE_SECURE=1` while the site is served over plain `http`, or the web and API are on different registrable domains. |
| Console: *Refused to connect … Content Security Policy* | `API_URL` on the web app is wrong or missing. Fix it and restart the web app. |
| API container exits at start with `ADMIN_PASSWORD must be at least 12 characters` | Set a longer `ADMIN_PASSWORD`. |
| Admin password forgotten | Change `ADMIN_PASSWORD` in Coolify and restart the API (with `ADMIN_SYNC_PASSWORD=1`). |
| API exits with `/data is not writable` | You used a bind mount owned by root. Use a Coolify **Volume Mount**, or `chown -R 10001:10001` the host folder. |
| Users and data disappear after a redeploy | No persistent volume at `/data` on the API app (step 4.1.6). |
| `database is locked` errors | More than one API replica or worker. Keep one replica; scale with `GUNICORN_THREADS`. |
| Everyone gets "daily limit reached" together | `PROXY_COUNT` is too low or too high, so all visitors share one IP. Coolify only: `1`. Cloudflare + Coolify: `2`. |
| Trending page says "Collecting data…" for a long time | Needs `SERPAPI_KEY`. Check Admin → Data freshness and the job log. |

## Honest limits

- No source gives exact sales numbers for every shop. The score uses up to 5 signals and says how many it used. With fewer than 2 it says "Not enough data".
- The idea guide and season calendar are editorial and labelled that way.
- Daraz is read from its public search page. Keep it on for light use only and check Daraz's terms.
- Live provider calls follow each provider's documented format. Test each key once with the **Test** button after adding it.
