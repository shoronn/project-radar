"""Manage users from the command line.
  python admin.py users                         list users
  python admin.py plan EMAIL pro 2026-12-31      give a plan until a date (after you receive payment)
  python admin.py plan EMAIL free                move back to free"""
import sys
import config
config.init_schema()
db = config.connect()
a = sys.argv[1:]
if not a or a[0] == "users":
    for r in db.execute("SELECT email, plan, plan_until, created FROM users ORDER BY created DESC"):
        print(*r, sep="  |  ")
elif a[0] == "plan" and len(a) >= 3:
    if a[2] not in ("free", "pro", "business"): sys.exit("plan must be free, pro or business")
    n = db.execute("UPDATE users SET plan=?, plan_until=? WHERE email=?", (a[2], a[3] if len(a) > 3 else None, a[1].lower())).rowcount
    db.commit(); print("updated" if n else "no user with that email")
else:
    print(__doc__)
