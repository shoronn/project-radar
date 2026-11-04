"""Settings the admin can change in the browser (Admin > API keys). Saved in the database and copied into
the running app, so nobody has to edit .env or code. A value saved here wins over the same name in .env."""
import os, time

import config

# key, label, group, secret?, help
FIELDS = [
    ("SERPAPI_KEY", "SerpApi API key", "serpapi", True, ""),
    ("ALI_APP_KEY", "App Key", "aliexpress", False, ""),
    ("ALI_APP_SECRET", "App Secret", "aliexpress", True, ""),
    ("ALI_TRACKING_ID", "Tracking ID", "aliexpress", False, ""),
    ("YOUTUBE_API_KEY", "YouTube Data API key", "youtube", True, ""),
    ("AI_BASE_URL", "API address (base URL)", "ai", False, ""),
    ("AI_API_KEY", "API key", "ai", True, ""),
    ("AI_MODEL", "Model name", "ai", False, ""),
    ("AI_PRICE_IN", "Price per 1M input tokens (USD, optional)", "ai", False, ""),
    ("AI_PRICE_OUT", "Price per 1M output tokens (USD, optional)", "ai", False, ""),
    ("EBAY_CLIENT_ID", "App ID (Client ID)", "ebay", False, ""),
    ("EBAY_CLIENT_SECRET", "Cert ID (Client Secret)", "ebay", True, ""),
    ("DARAZ_ENABLED", "Use Daraz for Bangladesh (1 = on, 0 = off)", "daraz", False, ""),
    ("TRENDING_COUNTRIES", "Countries for Trending (comma separated, e.g. BD,US)", "general", False, ""),
    ("REFRESH_HOURS", "Refresh live data every … hours", "general", False, ""),
    ("AUTO_REFRESH", "Automatic refresh (1 = on, 0 = off)", "general", False, ""),
    ("CACHE_HOURS", "Keep a product check for … hours before fetching again", "general", False, ""),
]
KEYS = {f[0] for f in FIELDS}


def conn():
    c = config.connect()
    c.execute("CREATE TABLE IF NOT EXISTS settings(k TEXT PRIMARY KEY, v TEXT, updated REAL)")
    return c


def all_saved():
    c = conn()
    rows = dict(c.execute("SELECT k, v FROM settings").fetchall())
    c.close()
    return rows


def apply():
    """Copy saved settings into the running app (call at start and after every save)."""
    for k, v in all_saved().items():
        if k in KEYS:
            if v:
                os.environ[k] = v
            else:
                os.environ.pop(k, None)


def save(values):
    c = conn()
    for k, v in values.items():
        if k not in KEYS:
            continue
        v = (v or "").strip()
        c.execute("REPLACE INTO settings VALUES (?,?,?)", (k, v, time.time()))
    c.commit()
    c.close()
    apply()


def secret_key():
    """A stable session key, so people stay logged in after a restart even without .env."""
    if os.getenv("SECRET_KEY") and os.getenv("SECRET_KEY") != "change-this-to-a-long-random-text":
        return os.getenv("SECRET_KEY")
    c = conn()
    r = c.execute("SELECT v FROM settings WHERE k='_secret_key'").fetchone()
    if not r:
        import secrets
        v = secrets.token_hex(32)
        c.execute("REPLACE INTO settings VALUES ('_secret_key',?,?)", (v, time.time()))
        c.commit()
        r = (v,)
    c.close()
    return r[0]


def mask(v):
    if not v:
        return ""
    return ("•" * 6) + v[-4:] if len(v) > 8 else "•" * len(v)


def describe():
    """What the admin page shows: never the full secret, only whether it is set and its last 4 characters."""
    out = []
    for k, label, group, secret, _ in FIELDS:
        v = os.getenv(k, "")
        out.append({"key": k, "label": label, "group": group, "secret": secret, "set": bool(v), "value": "" if secret else v, "masked": mask(v) if secret else ""})
    return out
