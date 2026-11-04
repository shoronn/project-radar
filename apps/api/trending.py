"""Trending engine.  python trending.py   (run once a day; the app also refreshes by itself when data is older than 24 h)
1. Google Trends (SerpApi) for every product keyword, 5 per request, last 5 years (weekly). The last 52 weeks drive the
   ranking; the full history feeds the monthly candle chart and the season pattern.
2. Momentum = average of the last 4 weeks / average of the 12 weeks before.
3. For the top products, real listings from marketplaces. Each card keeps title, image, price and link from ONE listing.
   Listings without a working image, with an unrelated title or an outlier price are dropped."""
import json, os, time, statistics, threading
import requests

import config  # loads apps/api/.env for local runs
import sources  # noqa: E402

COUNTRIES = [c.strip().upper() for c in os.getenv("TRENDING_COUNTRIES", "BD,US").split(",") if c.strip()]
TOP_N = int(os.getenv("TRENDING_TOP", "12"))
_lock = threading.Lock()


def conn():
    c = config.connect()
    c.executescript("""CREATE TABLE IF NOT EXISTS trend_kw(country TEXT, kw TEXT, series TEXT, level REAL, mom REAL, updated REAL, PRIMARY KEY(country, kw));
    CREATE TABLE IF NOT EXISTS trend_products(country TEXT, kw TEXT, rank INTEGER, source TEXT, name TEXT, image TEXT, price REAL, cur TEXT, url TEXT, orders INTEGER, rating REAL, fetched REAL);
    CREATE TABLE IF NOT EXISTS trend_meta(country TEXT PRIMARY KEY, updated REAL, note TEXT);
    CREATE TABLE IF NOT EXISTS idea_img(country TEXT, kw TEXT, source TEXT, name TEXT, image TEXT, price REAL, cur TEXT, url TEXT, fetched REAL, PRIMARY KEY(country, kw));
    CREATE TABLE IF NOT EXISTS job_log(t REAL, job TEXT, country TEXT, ok INTEGER, note TEXT);""")
    cols = [r[1] for r in c.execute("PRAGMA table_info(trend_kw)")]
    if "hist" not in cols:
        c.execute("ALTER TABLE trend_kw ADD COLUMN hist TEXT")
    return c


SOUTH = ("AU", "NZ", "ZA", "AR", "BR", "CL", "UY", "PY", "PE")


def keywords(country="WW"):
    """All tracked keywords, the ones closest to their selling season first."""
    ideas = json.load(open(config.content_path("ideas.json"), encoding="utf-8"))["ideas"]
    m = time.localtime().tm_mon

    def gap(i):
        pk = [((p + 5) % 12) + 1 if country in SOUTH and i.get("weather") else p for p in i["peak"]]
        return min((p - m) % 12 for p in pk)
    extra = os.path.join(config.DATA_DIR, "watch.json")
    kws = [i["kw"] for i in sorted(ideas, key=gap)] + (json.load(open(extra, encoding="utf-8")) if os.path.exists(extra) else [])
    return list(dict.fromkeys(k.strip().lower() for k in kws if k.strip()))


def trends_batch(kws, geo):
    """One SerpApi call for up to 5 keywords. Returns {kw: [[unix_time, value], ...]} weekly, 5 years."""
    p = {"engine": "google_trends", "q": ",".join(kws), "data_type": "TIMESERIES", "date": "today 5-y", "api_key": os.getenv("SERPAPI_KEY")}
    if geo != "WW":
        p["geo"] = geo
    r = requests.get("https://serpapi.com/search.json", params=p, timeout=40)
    r.raise_for_status()
    out = {k: [] for k in kws}
    for pt in r.json().get("interest_over_time", {}).get("timeline_data", []):
        for v in pt.get("values", []):
            k = (v.get("query") or "").lower()
            if k in out:
                out[k].append([int(pt.get("timestamp") or 0), v.get("extracted_value", 0)])
    return out


def market(kw, country):
    if country == "BD":
        res = sources.daraz(kw, country)
    else:
        res = sources.shopping(kw, country)          # not eBay: its licence limits use outside eBay-only display
    if not res.get("ok"):
        res = sources.aliexpress(kw, country)
    return res


def refresh(country):
    with _lock:
        c = conn()
        now, kws, note = time.time(), keywords(country), ""
        if os.getenv("SERPAPI_KEY"):
            for i in range(0, len(kws), 5):
                part = kws[i:i + 5]
                try:
                    data = trends_batch(part, country)
                except Exception as e:
                    note = f"Google Trends error: {str(e)[:100]}"
                    continue
                for k, h in data.items():
                    s = [v for _, v in h][-52:]
                    if len(s) < 16:
                        continue
                    rec, base = statistics.mean(s[-4:]), statistics.mean(s[-16:-4])
                    mom = rec / base if base > 0 else (2.0 if rec > 0 else 1.0)
                    c.execute("REPLACE INTO trend_kw(country,kw,series,level,mom,updated,hist) VALUES (?,?,?,?,?,?,?)", (country, k, json.dumps(s), rec, mom, now, json.dumps(h)))
                c.commit()
        else:
            note = "No SERPAPI_KEY: ranking uses the season guide instead of live search data."
        rows = c.execute("SELECT kw FROM trend_kw WHERE country=? ORDER BY (mom * 0.7 + level / 100 * 0.6) DESC LIMIT ?", (country, TOP_N)).fetchall()
        top = [r[0] for r in rows] or kws[:TOP_N]
        c.execute("DELETE FROM trend_products WHERE country=?", (country,))
        for k in top:
            res = market(k, country)
            if not res.get("ok"):
                continue
            items = sources.clean_items(res["items"], k)
            items.sort(key=lambda x: -(x.get("orders") or 0))
            n = 0
            for it in items:
                if n >= 4:
                    break
                if not sources.image_ok(it["image"]):
                    continue                               # every card must have a working image
                n += 1
                c.execute("INSERT INTO trend_products VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", (country, k, n, res["source"], it["name"], it["image"], it["price"], it.get("cur"),
                                                                                         it.get("url"), it.get("orders") or 0, it.get("rating"), now))
        c.execute("REPLACE INTO trend_meta VALUES (?,?,?)", (country, now, note))
        c.execute("INSERT INTO job_log VALUES (?,?,?,?,?)", (now, "trending", country, 0 if note.startswith("Google Trends error") else 1, note or f"{len(top)} products"))
        c.commit()
        c.close()
    refresh_images(country)


# ---------- real product photo for every idea ----------
def idea_keywords():
    ideas = json.load(open(config.content_path("ideas.json"), encoding="utf-8"))["ideas"]
    return [i["kw"].strip().lower() for i in ideas]


def find_image(kw, country, c):
    """One real listing (title, image, price, link from the SAME record) whose image loads.
    Order: this run's trending listing, then AliExpress (affiliate API allows display of unmodified images),
    then the local marketplace."""
    r = c.execute("SELECT source,name,image,price,cur,url FROM trend_products WHERE country=? AND kw=? ORDER BY rank LIMIT 1", (country, kw)).fetchone()
    if r:
        return dict(zip(("source", "name", "image", "price", "cur", "url"), r))
    for fn in (lambda: sources.aliexpress(kw, country), lambda: market(kw, country)):
        try:
            res = fn()
        except Exception:
            continue
        if not res.get("ok"):
            continue
        items = sources.clean_items(res.get("items") or [], kw)
        items.sort(key=lambda x: -(x.get("orders") or 0))
        for it in items[:6]:
            if sources.image_ok(it["image"]):
                return {"source": res["source"], "name": it["name"], "image": it["image"], "price": it["price"], "cur": it.get("cur"), "url": it.get("url")}
    return None


def refresh_images(country, max_age_days=7, limit=None):
    """Keeps one verified photo per idea. Old photos are re-checked weekly; dead links are replaced."""
    c = conn()
    now, done, miss = time.time(), 0, 0
    limit = limit or int(os.getenv("IMAGE_REFRESH_LIMIT", "60"))
    have = {k: (t, img) for k, t, img in c.execute("SELECT kw, fetched, image FROM idea_img WHERE country=?", (country,))}
    for k, img in c.execute("SELECT kw, image FROM trend_products WHERE country=? AND rank=1", (country,)):
        have.setdefault(k, (now, img))
    for kw in idea_keywords():
        if done >= limit:
            break
        t, img = have.get(kw, (0, None))
        fresh = now - t < max_age_days * 86400
        in_trend = c.execute("SELECT 1 FROM trend_products WHERE country=? AND kw=? LIMIT 1", (country, kw)).fetchone()
        if fresh and img and not in_trend:
            continue
        done += 1
        if done > 1:
            time.sleep(float(os.getenv("PHOTO_DELAY", "1.5")))     # be gentle with marketplaces
        hit = find_image(kw, country, c)
        if hit:
            c.execute("REPLACE INTO idea_img VALUES (?,?,?,?,?,?,?,?,?)", (country, kw, hit["source"], hit["name"], hit["image"], hit["price"], hit.get("cur"), hit.get("url"), now))
        else:
            miss += 1
            if img and not sources.image_ok(img):
                c.execute("DELETE FROM idea_img WHERE country=? AND kw=?", (country, kw))
        c.commit()
    c.execute("INSERT INTO job_log VALUES (?,?,?,?,?)", (now, "images", country, 1, f"{done - miss} photos updated, {miss} not found"))
    c.commit()
    c.close()


def idea_images(country):
    """Photo per keyword: saved idea photos first, then today's top trending listing for that keyword."""
    c = conn()
    keys = ("kw", "source", "name", "image", "price", "cur", "url", "fetched")
    out = {}
    for r in c.execute("SELECT kw,source,name,image,price,cur,url,fetched FROM trend_products WHERE country=? AND rank=1", (country,)):
        out[r[0]] = dict(zip(keys, r))
    for r in c.execute("SELECT kw,source,name,image,price,cur,url,fetched FROM idea_img WHERE country=? AND image IS NOT NULL", (country,)):
        out[r[0]] = dict(zip(keys, r))
    c.close()
    return out


def photo_for(kw, country, retry_hours=24):
    """On-demand photo for one keyword (used when a card has no photo yet). Misses are remembered for a day."""
    kw = kw.strip().lower()
    c = conn()
    r = c.execute("SELECT source,name,image,price,cur,url,fetched FROM idea_img WHERE country=? AND kw=?", (country, kw)).fetchone()
    if r and (r[2] or time.time() - r[6] < retry_hours * 3600):
        c.close()
        return dict(zip(("source", "name", "image", "price", "cur", "url", "fetched"), r)) if r[2] else None
    hit = find_image(kw, country, c)
    c.execute("REPLACE INTO idea_img VALUES (?,?,?,?,?,?,?,?,?)", (country, kw, (hit or {}).get("source"), (hit or {}).get("name"), (hit or {}).get("image"),
                                                                   (hit or {}).get("price"), (hit or {}).get("cur"), (hit or {}).get("url"), time.time()))
    c.commit()
    c.close()
    return hit


# ---------- monthly candles and season pattern ----------
def candles(hist, months=24):
    """Weekly [[t, v]] -> monthly candles: open = first week, close = last week, high/low = max/min of the month."""
    by = {}
    for t, v in hist:
        if not t:
            continue
        m = time.strftime("%Y-%m", time.gmtime(t))
        by.setdefault(m, []).append(v)
    out = [{"m": m, "o": vs[0], "c": vs[-1], "h": max(vs), "l": min(vs), "avg": round(statistics.mean(vs), 1)} for m, vs in sorted(by.items())]
    return out[-months:]


def pattern(hist):
    """Average interest for each calendar month across all years, 0-100 scaled to its own peak."""
    by = {m: [] for m in range(1, 13)}
    for t, v in hist:
        if t:
            by[time.gmtime(t).tm_mon].append(v)
    avgm = [statistics.mean(by[m]) if by[m] else None for m in range(1, 13)]
    top = max([a for a in avgm if a is not None] or [0])
    return [round(a / top * 100) if (a is not None and top) else None for a in avgm]


def season_chart(country, kw):
    c = conn()
    r = c.execute("SELECT hist, updated FROM trend_kw WHERE country=? AND kw=?", (country, kw.lower())).fetchone()
    c.close()
    if not r or not r[0]:
        return None
    h = json.loads(r[0])
    return {"kw": kw, "candles": candles(h), "pattern": pattern(h), "updated": r[1], "source": "Google Trends (SerpApi), weekly, 5 years"}


# ---------- automatic schedule ----------
def jobs_due(hours):
    return [cc for cc in COUNTRIES if stale(cc, hours)]


def start_scheduler(every_hours=None):
    """Background loop inside the web app. Checks every 10 minutes; refreshes any country older than REFRESH_HOURS.
    Safe with several workers: only one refresh runs at a time per process and trend_meta stops repeats."""
    fixed = every_hours

    def loop():
        time.sleep(5)
        while True:
            if os.getenv("AUTO_REFRESH", "1") != "0":                      # read every round, so Admin changes apply at once
                try:
                    hours = float(fixed or os.getenv("REFRESH_HOURS", "24") or 24)
                except ValueError:
                    hours = 24.0
                for cc in jobs_due(hours):
                    try:
                        refresh(cc)
                    except Exception as e:
                        try:
                            c = conn(); c.execute("INSERT INTO job_log VALUES (?,?,?,?,?)", (time.time(), "trending", cc, 0, str(e)[:200])); c.commit(); c.close()
                        except Exception:
                            pass
            time.sleep(600)
    threading.Thread(target=loop, daemon=True, name="auto-refresh").start()
    return True


def stale(country, hours=24):
    c = conn()
    r = c.execute("SELECT updated FROM trend_meta WHERE country=?", (country,)).fetchone()
    c.close()
    return not r or time.time() - r[0] > hours * 3600


def refresh_in_background(country):
    if not _lock.locked():
        threading.Thread(target=refresh, args=(country,), daemon=True).start()


if __name__ == "__main__":
    for cc in COUNTRIES:
        print("refreshing", cc)
        refresh(cc)
    print("done")
