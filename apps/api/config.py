"""Central configuration: paths, env helpers and the database schema.

Every module imports paths from here so the app behaves the same on a laptop and in a container.
  CONTENT_DIR  read-only content shipped in the image (ideas.json, plans.json, benchmark_products.json)
  DATA_DIR     writable, persistent data (SQLite database, watch.json, benchmark reports). Mount a volume here.
A file with the same name in DATA_DIR overrides the bundled one in CONTENT_DIR, so you can edit plans.json or
ideas.json on the server without rebuilding the image.
"""
import os
import sqlite3

ROOT = os.path.dirname(os.path.abspath(__file__))

# Local development: read apps/api/.env if it exists. Real environment variables always win.
_envfile = os.path.join(ROOT, ".env")
if os.path.exists(_envfile):
    for _line in open(_envfile, encoding="utf-8"):
        if "=" in _line and not _line.lstrip().startswith("#"):
            _k, _v = _line.strip().split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip().strip('"').strip("'"))

CONTENT_DIR = os.getenv("CONTENT_DIR", os.path.join(ROOT, "content"))
DATA_DIR = os.getenv("DATA_DIR", os.path.join(ROOT, "data"))
os.makedirs(DATA_DIR, exist_ok=True)
DB_PATH = os.getenv("DB_PATH", os.path.join(DATA_DIR, "app.db"))


def env_bool(name, default=False):
    v = os.getenv(name)
    if v is None or v == "":
        return default
    return v.strip().lower() in ("1", "true", "yes", "on")


def env_list(name, default=""):
    return [x.strip() for x in (os.getenv(name) or default).split(",") if x.strip()]


def content_path(name):
    """DATA_DIR/<name> if the operator dropped an override there, else the bundled file."""
    override = os.path.join(DATA_DIR, name)
    return override if os.path.exists(override) else os.path.join(CONTENT_DIR, name)


def connect(timeout=30):
    """SQLite connection with a busy timeout, so the background refresh and web requests don't trip over each other."""
    c = sqlite3.connect(DB_PATH, timeout=timeout)
    c.execute("PRAGMA busy_timeout=30000")
    return c


SCHEMA = """
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, email TEXT UNIQUE, pw TEXT, name TEXT, plan TEXT DEFAULT 'free', plan_until TEXT, created TEXT);
CREATE TABLE IF NOT EXISTS usage(key TEXT, day TEXT, n INTEGER, PRIMARY KEY(key, day));
CREATE TABLE IF NOT EXISTS cache(k TEXT PRIMARY KEY, t REAL, v TEXT);
CREATE TABLE IF NOT EXISTS saved(uid INTEGER, item TEXT, stage INTEGER DEFAULT 0, note TEXT, t REAL, PRIMARY KEY(uid, item));
CREATE TABLE IF NOT EXISTS projects(id INTEGER PRIMARY KEY, uid INTEGER, name TEXT, q TEXT, country TEXT, data TEXT, created REAL, updated REAL);
CREATE TABLE IF NOT EXISTS seen(key TEXT, day TEXT, q TEXT, PRIMARY KEY(key, day, q));
CREATE TABLE IF NOT EXISTS ai_usage(key TEXT, month TEXT, n INTEGER, tin INTEGER, tout INTEGER, PRIMARY KEY(key, month));
CREATE TABLE IF NOT EXISTS login_fail(key TEXT, t REAL);
CREATE INDEX IF NOT EXISTS login_fail_key ON login_fail(key, t);
"""


def init_schema():
    """Create tables and run small migrations. Safe to call many times."""
    c = connect()
    c.execute("PRAGMA journal_mode=WAL")       # readers don't block the writer; persists in the db file
    c.executescript(SCHEMA)
    if "is_admin" not in [r[1] for r in c.execute("PRAGMA table_info(users)")]:
        c.execute("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0")
    c.commit()
    c.close()
