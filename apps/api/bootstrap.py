"""Run once at container start (docker-entrypoint.sh), before gunicorn:
  1. create / migrate the SQLite schema in DATA_DIR
  2. seed the dashboard admin from ADMIN_EMAIL / ADMIN_PASSWORD

Seeding rules
  - no user with ADMIN_EMAIL      -> create it as admin with ADMIN_PASSWORD
  - user exists                   -> make sure it is admin
  - ADMIN_SYNC_PASSWORD=1 (default) and the stored password differs from ADMIN_PASSWORD
                                  -> update it (env is the source of truth; old sessions are logged out)
Exit code 1 when ADMIN_EMAIL / ADMIN_PASSWORD are missing or too weak, so a misconfigured deploy fails loudly.
Local use:  python bootstrap.py
"""
import datetime as dt
import os
import sys

from werkzeug.security import check_password_hash, generate_password_hash

import config

MIN_ADMIN_PW = 12


def seed_admin():
    email = (os.getenv("ADMIN_EMAIL") or "").strip().lower()
    pw = os.getenv("ADMIN_PASSWORD") or ""
    name = (os.getenv("ADMIN_NAME") or "Admin").strip()[:60]
    if not email or "@" not in email:
        print("[bootstrap] ERROR: ADMIN_EMAIL is missing or invalid.", file=sys.stderr)
        return False
    if len(pw) < MIN_ADMIN_PW:
        print(f"[bootstrap] ERROR: ADMIN_PASSWORD must be at least {MIN_ADMIN_PW} characters.", file=sys.stderr)
        return False
    c = config.connect()
    row = c.execute("SELECT id, pw, is_admin FROM users WHERE email=?", (email,)).fetchone()
    if not row:
        c.execute("INSERT INTO users(email, pw, name, plan, created, is_admin) VALUES (?,?,?,?,?,1)",
                  (email, generate_password_hash(pw), name, "business", dt.datetime.now(dt.timezone.utc).replace(tzinfo=None).isoformat()))
        print(f"[bootstrap] admin {email} created")
    else:
        uid, stored, flag = row
        if not flag:
            c.execute("UPDATE users SET is_admin=1 WHERE id=?", (uid,))
            print(f"[bootstrap] {email} promoted to admin")
        if config.env_bool("ADMIN_SYNC_PASSWORD", True) and not check_password_hash(stored or "", pw):
            c.execute("UPDATE users SET pw=? WHERE id=?", (generate_password_hash(pw), uid))
            print(f"[bootstrap] admin {email} password updated from ADMIN_PASSWORD")
        else:
            print(f"[bootstrap] admin {email} ok")
    c.commit()
    c.close()
    return True


def check_secret():
    sk = os.getenv("SECRET_KEY") or ""
    if not sk or sk == "change-this-to-a-long-random-text":
        print("[bootstrap] WARNING: SECRET_KEY is not set; a random key stored in the database will be used.", file=sys.stderr)
    elif len(sk) < 32:
        print("[bootstrap] WARNING: SECRET_KEY is shorter than 32 characters.", file=sys.stderr)


if __name__ == "__main__":
    print(f"[bootstrap] data dir: {config.DATA_DIR}  database: {config.DB_PATH}")
    config.init_schema()
    check_secret()
    if not seed_admin():
        sys.exit(1)
