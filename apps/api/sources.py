"""Live data sources. Each function returns a dict with "ok", "source" and data, or ok=False with a reason.
Every source is optional: add its key in .env and it switches on. Nothing here invents numbers."""
import base64, hashlib, hmac, os, re, statistics, time, json
import requests

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36"}
T = 25


def off(source, why):
    return {"ok": False, "source": source, "reason": why}


# ---------- Google Trends via SerpApi (paid, legit; free plan has a monthly allowance) ----------
def trends(q, geo):
    key = os.getenv("SERPAPI_KEY")
    if not key:
        return off("Google Trends", "Add SERPAPI_KEY in .env to show trend numbers. The live Google chart below still works.")
    base = {"engine": "google_trends", "q": q, "date": "today 5-y", "api_key": key}
    if geo and geo != "WW":
        base["geo"] = geo
    try:
        r = requests.get("https://serpapi.com/search.json", params=dict(base, data_type="TIMESERIES"), timeout=T)
        r.raise_for_status()
        tl = r.json().get("interest_over_time", {}).get("timeline_data", [])
        hist = [[int(p.get("timestamp") or 0), (p.get("values") or [{}])[0].get("extracted_value", 0)] for p in tl]
        series = [{"date": p.get("date"), "v": (p.get("values") or [{}])[0].get("extracted_value", 0)} for p in tl][-52:]
        rel = requests.get("https://serpapi.com/search.json", params=dict(base, data_type="RELATED_QUERIES"), timeout=T).json()
        rq = rel.get("related_queries", {})
        rising = [{"q": x.get("query"), "v": x.get("value")} for x in (rq.get("rising") or [])[:10]]
        top = [{"q": x.get("query"), "v": x.get("value")} for x in (rq.get("top") or [])[:10]]
        return {"ok": True, "source": "Google Trends (SerpApi)", "series": series, "hist": hist, "rising": rising, "top": top}
    except Exception as e:
        return off("Google Trends", f"SerpApi error: {str(e)[:120]}")


# ---------- eBay Browse API (free developer account) ----------
_ebay_token = {"t": None, "exp": 0}
EBAY_MARKET = {"US": "EBAY_US", "GB": "EBAY_GB", "DE": "EBAY_DE", "AU": "EBAY_AU", "CA": "EBAY_CA", "FR": "EBAY_FR", "IT": "EBAY_IT", "ES": "EBAY_ES"}


def _ebay_auth():
    cid, sec = os.getenv("EBAY_CLIENT_ID"), os.getenv("EBAY_CLIENT_SECRET")
    if not (cid and sec):
        return None
    if _ebay_token["t"] and time.time() < _ebay_token["exp"] - 60:
        return _ebay_token["t"]
    basic = base64.b64encode(f"{cid}:{sec}".encode()).decode()
    r = requests.post("https://api.ebay.com/identity/v1/oauth2/token", headers={"Authorization": "Basic " + basic, "Content-Type": "application/x-www-form-urlencoded"},
                      data={"grant_type": "client_credentials", "scope": "https://api.ebay.com/oauth/api_scope"}, timeout=T)
    r.raise_for_status()
    j = r.json()
    _ebay_token.update(t=j["access_token"], exp=time.time() + int(j.get("expires_in", 7200)))
    return _ebay_token["t"]


def ebay(q, country):
    try:
        tok = _ebay_auth()
        if not tok:
            return off("eBay", "Add EBAY_CLIENT_ID and EBAY_CLIENT_SECRET in .env (free at developer.ebay.com).")
        mk = EBAY_MARKET.get(country, "EBAY_US")
        r = requests.get("https://api.ebay.com/buy/browse/v1/item_summary/search", params={"q": q, "limit": 30},
                         headers={"Authorization": "Bearer " + tok, "X-EBAY-C-MARKETPLACE-ID": mk}, timeout=T)
        r.raise_for_status()
        items = []
        for it in r.json().get("itemSummaries", []):
            p = it.get("price") or {}
            items.append({"name": it.get("title"), "price": float(p.get("value") or 0), "cur": p.get("currency"),
                          "image": (it.get("image") or {}).get("imageUrl"), "url": it.get("itemWebUrl"), "seller": (it.get("seller") or {}).get("username")})
        return {"ok": True, "source": f"eBay ({mk.replace('EBAY_', '')})", "items": items, "total": r.json().get("total")}
    except Exception as e:
        return off("eBay", f"eBay error: {str(e)[:120]}")


# ---------- AliExpress Affiliate API (supplier prices and order volume for dropshipping) ----------
def aliexpress(q, country):
    k, s = os.getenv("ALI_APP_KEY"), os.getenv("ALI_APP_SECRET")
    if not (k and s):
        return off("AliExpress", "Add ALI_APP_KEY and ALI_APP_SECRET in .env (AliExpress Open Platform, affiliate app).")
    p = {"app_key": k, "method": "aliexpress.affiliate.product.query", "sign_method": "sha256", "timestamp": str(int(time.time() * 1000)),
         "keywords": q, "page_size": "30", "sort": "LAST_VOLUME_DESC", "target_currency": "USD", "target_language": "EN",
         "ship_to_country": country if country and country != "WW" else "US"}
    if os.getenv("ALI_TRACKING_ID"):
        p["tracking_id"] = os.getenv("ALI_TRACKING_ID")
    p["sign"] = hmac.new(s.encode(), "".join(f"{a}{p[a]}" for a in sorted(p)).encode(), hashlib.sha256).hexdigest().upper()
    try:
        r = requests.post("https://api-sg.aliexpress.com/sync", data=p, timeout=T)
        r.raise_for_status()
        res = (r.json().get("aliexpress_affiliate_product_query_response") or {}).get("resp_result") or {}
        prods = ((res.get("result") or {}).get("products") or {}).get("product") or []
        items = [{"name": x.get("product_title"), "price": float(x.get("target_sale_price") or x.get("sale_price") or 0), "cur": "USD",
                  "image": x.get("product_main_image_url"), "url": x.get("promotion_link") or x.get("product_detail_url"),
                  "orders": int(x.get("lastest_volume") or 0), "rating": x.get("evaluate_rate")} for x in prods]
        if not items and res.get("resp_msg"):
            return off("AliExpress", "AliExpress: " + str(res.get("resp_msg"))[:120])
        return {"ok": True, "source": "AliExpress (supplier)", "items": items}
    except Exception as e:
        return off("AliExpress", f"AliExpress error: {str(e)[:120]}")


# ---------- Daraz (Bangladesh marketplace, public search results) ----------
def _num(v):
    m = re.search(r"([\d.,]+)\s*([kK]?)", str(v or ""))
    if not m:
        return None
    n = float(m.group(1).replace(",", ""))
    return int(n * 1000) if m.group(2) else n


def daraz(q, country):
    if country != "BD":
        return off("Daraz", "Daraz is shown for Bangladesh.")
    if os.getenv("DARAZ_ENABLED", "1") != "1":
        return off("Daraz", "Daraz reader is switched off in .env.")
    try:
        r = requests.get("https://www.daraz.com.bd/catalog/", params={"ajax": "true", "q": q, "sort": "popularity"}, headers=dict(UA, Accept="application/json"), timeout=T)
        r.raise_for_status()
        items = []
        for it in r.json().get("mods", {}).get("listItems", [])[:30]:
            img, url = str(it.get("image") or ""), str(it.get("itemUrl") or "")
            items.append({"name": it.get("name"), "price": _num(it.get("price")) or 0, "cur": "BDT", "image": "https:" + img if img.startswith("//") else img,
                          "url": "https:" + url if url.startswith("//") else url, "orders": _num(it.get("itemSoldCntShow")) or 0,
                          "rating": _num(it.get("ratingScore")), "brand": it.get("brandName")})
        return {"ok": True, "source": "Daraz (BD)", "items": items}
    except Exception as e:
        return off("Daraz", f"Daraz error: {str(e)[:120]}")


# ---------- YouTube Data API (review videos, embedded on the page) ----------
def youtube(q, country):
    key = os.getenv("YOUTUBE_API_KEY")
    if not key:
        return off("YouTube", "Add YOUTUBE_API_KEY in .env (Google Cloud, YouTube Data API v3, free daily quota).")
    try:
        prm = {"part": "snippet", "type": "video", "maxResults": 6, "q": q + " review", "key": key, "relevanceLanguage": "en"}
        if country and country != "WW":
            prm["regionCode"] = country
        r = requests.get("https://www.googleapis.com/youtube/v3/search", params=prm, timeout=T)
        r.raise_for_status()
        vids = [{"id": v["id"]["videoId"], "title": v["snippet"]["title"], "channel": v["snippet"]["channelTitle"]} for v in r.json().get("items", []) if v.get("id", {}).get("videoId")]
        return {"ok": True, "source": "YouTube", "videos": vids}
    except Exception as e:
        return off("YouTube", f"YouTube error: {str(e)[:120]}")


# ---------- Exchange rates (free, daily; attribution required) ----------
def fx():
    try:
        r = requests.get("https://open.er-api.com/v6/latest/USD", timeout=T)
        r.raise_for_status()
        j = r.json()
        if j.get("result") != "success":
            raise ValueError(j.get("error-type"))
        return {"ok": True, "base": "USD", "rates": j["rates"], "updated": j.get("time_last_update_utc")}
    except Exception as e:
        return {"ok": False, "reason": str(e)[:120]}


def price_stats(items):
    ps = [i["price"] for i in items if i.get("price")]
    if not ps:
        return None
    ps.sort()
    q = lambda f: ps[min(len(ps) - 1, int(f * (len(ps) - 1)))]
    return {"low": round(q(.1), 2), "median": round(statistics.median(ps), 2), "high": round(q(.9), 2), "n": len(ps), "cur": items[0].get("cur")}


# ---------- data hygiene: one listing = one card. Title, image and price are never mixed between listings ----------
STOP = {"the", "and", "for", "with", "pro", "new", "mini", "set"}


def _words(s):
    return [w for w in re.findall(r"[a-z0-9]+", str(s).lower()) if len(w) > 2 and w not in STOP]


def clean_items(items, q, need_image=True):
    """Keep only complete, relevant, sensibly priced listings. Each kept dict is the original record, untouched."""
    qw = _words(q)
    keep, seen = [], set()
    for it in items or []:
        name, img, price = (it.get("name") or "").strip(), str(it.get("image") or ""), it.get("price")
        if not name or not price or price <= 0:
            continue
        if need_image and not img.startswith("https://"):
            continue
        tw = set(_words(name))
        if qw and sum(w in tw or any(t.startswith(w[:5]) for t in tw) for w in qw) < max(1, (len(qw) + 1) // 2):
            continue                                   # title does not match the search: drop (avoids "phone case" under "phone")
        key = re.sub(r"[^a-z0-9]+", " ", name.lower()).strip()
        if key in seen:
            continue
        seen.add(key)
        keep.append(it)
    ps = sorted(i["price"] for i in keep)
    if len(ps) >= 5:                                   # drop price outliers (accessories, bulk lots, typos)
        m = statistics.median(ps)
        keep = [i for i in keep if m / 3 <= i["price"] <= m * 3]
    return keep


def image_ok(url, timeout=6):
    """True only when the image URL really returns an image."""
    try:
        r = requests.get(url, headers=dict(UA, Range="bytes=0-2047"), timeout=timeout, stream=True)
        ok = r.status_code in (200, 206) and r.headers.get("Content-Type", "").startswith("image/")
        r.close()
        return ok
    except Exception:
        return False


# ---------- Google Shopping via SerpApi (market prices outside Bangladesh; replaces eBay for pricing, see provider audit) ----------
CUR_BY_C = {"US": "USD", "GB": "GBP", "DE": "EUR", "FR": "EUR", "IT": "EUR", "ES": "EUR", "IN": "INR", "AU": "AUD", "CA": "CAD", "AE": "AED", "SA": "SAR", "MY": "MYR",
            "PK": "PKR", "ID": "IDR", "PH": "PHP", "NG": "NGN", "ZA": "ZAR", "BR": "BRL", "WW": "USD"}


def _cur(price_text, country):
    t = str(price_text or "")
    for sym, c in (("A$", "AUD"), ("C$", "CAD"), ("US$", "USD"), ("£", "GBP"), ("€", "EUR"), ("₹", "INR"), ("৳", "BDT"), ("R$", "BRL"), ("₱", "PHP"), ("₦", "NGN")):
        if sym in t:
            return c
    return CUR_BY_C.get(country, "USD")


def shopping(q, country):
    key = os.getenv("SERPAPI_KEY")
    if not key:
        return off("Google Shopping", "Add SERPAPI_KEY in .env to see market prices outside Bangladesh.")
    if country == "BD":
        return off("Google Shopping", "Bangladesh uses local marketplace data.")
    try:
        gl = "us" if country == "WW" else country.lower()
        r = requests.get("https://serpapi.com/search.json", params={"engine": "google_shopping", "q": q, "gl": gl, "hl": "en", "api_key": key}, timeout=T)
        r.raise_for_status()
        items = []
        for x in r.json().get("shopping_results", [])[:40]:
            items.append({"name": x.get("title"), "price": float(x.get("extracted_price") or 0), "cur": _cur(x.get("price"), country),
                          "image": x.get("thumbnail") or "", "url": x.get("product_link") or x.get("link"), "rating": x.get("rating"),
                          "reviews": x.get("reviews"), "seller": x.get("source")})
        return {"ok": True, "source": f"Google Shopping ({gl.upper()})", "items": items}
    except Exception as e:
        return off("Google Shopping", f"SerpApi error: {str(e)[:120]}")
