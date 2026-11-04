"""Assessment engine: turns raw source data into graded evidence, two scores, Devil's Advocate, unknowns and next actions.
Grades (Master Plan): A = observed from a dated source, B = calculated from inputs, C = modeled estimate, D = AI hypothesis.
Shared by the web app, the AI assistant and the benchmark, so every surface gives the same answer."""
import math, re, statistics, time

SOUTH = ("AU", "NZ", "ZA", "AR", "BR", "CL", "UY", "PY", "PE")
WEIGHTS = {"demand": .30, "price_room": .25, "orders": .20, "season": .15, "competition": .10}
GRADE_W = {"A": 1.0, "B": .8, "C": .5, "D": .25}
LANDED = 1.35   # assumption: supplier price + 35% for shipping, duty and fees (grade C input)


def peaks(idea, country):
    flip = country in SOUTH and idea.get("weather")
    return [((m + 5) % 12) + 1 if flip else m for m in idea["peak"]]


def season_state(idea, country, month=None):
    m = month or time.localtime().tm_mon
    p = peaks(idea, country)
    if m in p:
        return "now"
    if any(((m + k - 1) % 12) + 1 in p for k in (1, 2)):
        return "soon"
    return "off"


def match_idea(q, ideas):
    s = q.lower().strip()
    words = [w for w in s.split() if len(w) > 2]
    best, bs = None, 0
    for i in ideas:
        hay = (i["kw"] + " " + i["name"]).lower()
        sc = 10 if (s in hay or i["kw"] in s) else 0
        sc += sum(1 for w in words if w in hay)
        if sc > bs:
            best, bs = i, sc
    return best if bs >= 2 else None


def usd(v, cur, rates):
    if v is None:
        return None
    if cur == "USD":
        return float(v)
    if rates and rates.get(cur):
        return float(v) / rates[cur]
    return None


def clamp(v, a=0, b=100):
    return max(a, min(b, v))


def assess(d, ideas, country, rates=None, month=None):
    idea = match_idea(d["q"], ideas)
    sig, unknowns = {}, []
    checked = d.get("checked") or time.time()

    # 1. Search demand (A: Google Trends numbers)
    tr = d.get("trends") or {}
    series = [p["v"] for p in tr.get("series", [])] if tr.get("ok") else []
    mom = None
    if len(series) >= 16:
        rec, base = statistics.mean(series[-4:]), statistics.mean(series[-16:-4])
        mom = rec / base if base > 0 else 1.0
        sig["demand"] = dict(name="Search demand", score=round(clamp((rec + clamp(50 + (mom - 1) * 100)) / 2)), grade="A",
                             note=f"Interest {round(rec)}/100, {'up' if mom >= 1 else 'down'} {abs(round((mom - 1) * 100))}% vs the 12 weeks before",
                             source="Google Trends (SerpApi)")
    else:
        sig["demand"] = dict(name="Search demand", score=None, grade=None, note="No trend numbers (add SERPAPI_KEY)", source=None)
        unknowns.append("How search interest is moving (no Google Trends numbers)")

    # 2. Price room (B: calculated from market and supplier prices, with a C assumption for landed cost)
    mp, sp = d.get("market_price"), d.get("supplier_price")
    margin = None
    if mp and sp:
        m, s = usd(mp["median"], mp["cur"], rates), usd(sp["median"], sp["cur"], rates)
        if m and s:
            margin = (m - s * LANDED) / m
            sig["price_room"] = dict(name="Price room", score=round(clamp(margin / .5 * 100)), grade="B",
                                     note=f"Typical market price vs supplier price + {round((LANDED - 1) * 100)}% shipping and fees (assumption): about {round(margin * 100)}% gross margin",
                                     source=f"{mp.get('source', 'market')} + {sp.get('source', 'supplier')}")
    if "price_room" not in sig:
        sig["price_room"] = dict(name="Price room", score=None, grade=None, note="Needs both a market price and a supplier price", source=None)
        unknowns.append("Real margin (missing market or supplier price)")

    # 3. Proven orders (A: order or sold counts shown on listings)
    ords = sorted([i.get("orders") or 0 for k in ("ali", "daraz") if (d.get(k) or {}).get("ok") for i in d[k]["items"]], reverse=True)
    ords = [o for o in ords if o > 0]
    top = statistics.median(ords[:10]) if ords else None
    if top:
        sig["orders"] = dict(name="Proven orders", score=round(clamp(math.log10(top + 1) / 4 * 100)), grade="A",
                             note=f"Top listings show about {round(top):,} orders or sales each", source="AliExpress / Daraz listings")
    else:
        sig["orders"] = dict(name="Proven orders", score=None, grade=None, note="No order counts available", source=None)
        unknowns.append("Whether people already buy it (no order counts)")

    # 4. Season fit (C: editorial season guide)
    st = season_state(idea, country, month) if idea else None
    if idea:
        sig["season"] = dict(name="Season fit", score={"now": 90, "soon": 75, "off": 30}[st], grade="C",
                             note={"now": "In season now", "soon": "Season starts within 2 months", "off": "Off season right now"}[st] + " (our season guide)",
                             source="Product Radar season guide")
    else:
        sig["season"] = dict(name="Season fit", score=None, grade=None, note="Not in our season guide yet", source=None)
        unknowns.append("Best selling months (product not in the season guide)")

    # 5. Room to compete (C: modeled from the spread of market prices; narrow spread = price war)
    mk = [i["price"] for i in (d.get("market_items") or []) if i.get("price")]
    spread = None
    if len(mk) >= 5:
        mk.sort()
        lo, hi = mk[int(.1 * (len(mk) - 1))], mk[int(.9 * (len(mk) - 1))]
        spread = hi / lo if lo else None
    if spread:
        sc = 25 if spread < 1.4 else 50 if spread < 2 else 70
        sig["competition"] = dict(name="Room to compete", score=sc, grade="C",
                                  note=f"Top listings range {round(spread, 1)}x from low to high price" + (" (sellers compete on price)" if spread < 1.4 else ""),
                                  source="Market listings")
    else:
        sig["competition"] = dict(name="Room to compete", score=None, grade=None, note="Not enough market listings", source=None)
        unknowns.append("How crowded the market is (too few listings)")

    have = {k: v for k, v in sig.items() if v["score"] is not None}
    wsum = sum(WEIGHTS[k] for k in have)
    opportunity = round(sum(v["score"] * WEIGHTS[k] for k, v in have.items()) / wsum) if len(have) >= 2 else None
    confidence = round(sum(GRADE_W[v["grade"]] for v in have.values()) / len(WEIGHTS) * 100)
    conf_label = "High" if confidence >= 70 else "Medium" if confidence >= 40 else "Low"

    if opportunity is None:
        verdict, why = "Not enough data", "Fewer than 2 signals have real data. Connect more sources or enter your own prices."
    elif opportunity >= 70:
        verdict, why = "Go", "Strong signals. Start with a small first batch and one ad test."
    elif opportunity >= 50:
        verdict, why = "Test small", "Mixed signals. Test with pre-orders or a few units before you stock up."
    else:
        verdict, why = "Skip for now", "Weak signals right now. Save it and check again before its season."
    if verdict == "Go" and conf_label == "Low":
        verdict, why = "Test small", "The opportunity looks good, but the evidence is thin. Test before you buy stock."

    # Devil's Advocate: strongest arguments against, built only from the data above
    devil = ["Search interest is not sales. A rising chart means people are curious, not that they will pay your price."]
    if mom is not None and mom < 0.95:
        devil.append(f"Search interest is falling ({round((mom - 1) * 100)}% vs the 12 weeks before).")
    if st == "off":
        devil.append("It is off season now. Stock bought today may wait months.")
    if st == "now" and idea:
        p = peaks(idea, country)
        m = month or time.localtime().tm_mon
        left = 0
        while (((m + left) - 1) % 12) + 1 in p and left < 12:
            left += 1
        if left <= 1:
            devil.append("The season may end within a month. Imported stock could arrive too late.")
    if margin is not None and margin < .25:
        devil.append(f"Margin is thin (about {round(margin * 100)}% before ads, delivery and returns).")
    if spread and spread < 1.4:
        devil.append("Prices are bunched together, a sign of a price war. New sellers usually lose on price alone.")
    if top and top > 20000:
        devil.append("Very high order counts mean many sellers already source it. Expect copycats within weeks.")
    if idea and idea.get("fragile"):
        devil.append("Fragile item: breakage raises returns and delivery cost.")
    if idea and idea.get("risk"):
        devil.append(idea["risk"])
    if conf_label != "High":
        devil.append(f"Evidence confidence is {conf_label.lower()}: {len(have)} of 5 signals have real data.")

    nxt = []
    if "price_room" not in have:
        nxt.append("Get 2 supplier quotes and enter the real cost in the profit calculator.")
    nxt.append("Read 20 one- to three-star reviews of the top 3 competitor listings and note the repeated complaint.")
    nxt.append("Order 1 sample and check quality, packaging and real delivery time.")
    if verdict in ("Go", "Test small"):
        nxt.append("Run a 7-day test: one video, one ad set with a small budget, or pre-orders. Decide on orders, not likes.")
    if idea and idea.get("weather") or st in ("soon", "now"):
        nxt.append("Order early: count supplier lead time back from the start of the season.")
    if re.search(r"batter|power bank|charger|heater|tap|kettle", d["q"], re.I):
        nxt.append("Check safety certification and battery shipping rules before importing.")

    return dict(signals=[dict(key=k, **v) for k, v in sig.items()], opportunity=opportunity, confidence=confidence, confidence_label=conf_label,
                verdict=verdict, verdict_why=why, devil=devil[:6], unknowns=unknowns, next_actions=nxt[:6], idea=idea, season_state=st,
                checked=checked, signals_used=len(have))


# ---------------- Product Finder ----------------
AUDIENCE = {"Home & Kitchen": ["families", "women", "students"], "Lighting & Decor": ["young people", "gift buyers", "families"],
            "Electric Appliance": ["families", "shop owners"], "Gadgets": ["young people", "students", "office workers"],
            "Phone Accessories": ["young people", "students", "office workers"], "Fashion & Accessories": ["women", "men", "students"],
            "Auto Accessories": ["drivers", "men"], "Creator Gear": ["creators", "online sellers", "teachers"], "Smart Home": ["families", "shop owners"],
            "Personal Care": ["women", "men", "gift buyers"], "Health & Fitness": ["office workers", "men", "women"], "Baby": ["parents"],
            "Pet": ["pet owners"], "Office & Study": ["students", "office workers"], "Gifts": ["gift buyers"], "Seasonal": ["families", "gift buyers"]}
BUDGET_RANK = {"Tiny": 0, "Low": 0, "Medium": 1, "High": 2}
PRICE_BANDS = {"impulse": (0, 5), "mid": (4, 18), "upper": (15, 45), "premium": (40, 10_000)}   # USD, typical selling price


def _lst(v):
    return [x for x in (v if isinstance(v, list) else [v]) if x]


def finder(ideas, a, country, trend_rows=None, month=None, rates=None):
    """a: channel[], budget, experience, category[], audience[], price, timing, risk.
    trend_rows: {kw: {"mom":..,"level":..,"image":..,"price":..,"cur":..,"source":..}}. Every reason says where it comes from."""
    budget = BUDGET_RANK.get(a.get("budget") or "Medium", 1)
    chans, cats, auds = _lst(a.get("channel")), _lst(a.get("category")), [x.lower() for x in _lst(a.get("audience"))]
    exp, price, timing, risk = a.get("experience") or "", a.get("price") or "", a.get("timing") or "", a.get("risk") or "balanced"
    trend_rows = trend_rows or {}
    out = []
    for i in ideas:
        ib = BUDGET_RANK.get(i["budget"], 1)
        if ib > budget:
            continue
        if chans == ["dropship"] and (not i.get("dropship") or i.get("fragile")):
            continue
        if cats and i["cat"] not in cats:
            continue
        ia = AUDIENCE.get(i["cat"], [])
        if auds and not set(auds) & set(ia):
            continue
        st = season_state(i, country, month)
        t = trend_rows.get(i["kw"], {})
        mom = t.get("mom")
        reasons = []
        score = {"now": 40, "soon": 34, "off": 10}[st]
        if timing == "now":
            score += {"now": 15, "soon": 0, "off": -20}[st]
        elif timing == "soon":
            score += {"now": 0, "soon": 15, "off": -10}[st]
        elif timing == "any":
            score = 30 + (12 if len(i.get("peak", [])) >= 6 else 0)          # evergreen: season matters less
            if len(i.get("peak", [])) >= 6:
                reasons.append("Sells most of the year (season guide)")
        reasons.insert(0, {"now": "In season now", "soon": "Season starts within 2 months", "off": "Off season now: plan for later"}[st])
        if mom is not None:
            w = {"safe": .6, "balanced": 1, "growth": 1.5}.get(risk, 1)
            score += max(-15, min(30, (mom - 1) * 60)) * w
            reasons.append(f"Google searches {'up' if mom >= 1 else 'down'} {abs(round((mom - 1) * 100))}% in 4 weeks [Google Trends]")
        if risk == "safe":
            score -= (12 if i.get("fragile") else 0) + (6 if i["budget"] == "High" else 0)
        if exp == "new":
            score -= (10 if i.get("fragile") else 0) + (8 if ib == 2 else 0)
            score += 5 if i.get("dropship") else 0
        if a.get("budget") == "Tiny" and ib == 0 and not i.get("fragile"):
            score += 5
        if set(chans) & {"facebook", "tiktok"} and ib == 0:
            score += 5
            reasons.append("Low-cost impulse buy suits social selling (our guide)")
        if "dropship" in chans and i.get("dropship") and not i.get("fragile"):
            score += 6
        if "wholesale" in chans and i["cat"] in ("Electric Appliance", "Home & Kitchen", "Seasonal"):
            score += 4
        if price in PRICE_BANDS and t.get("price") is not None:
            v = usd(t.get("price"), t.get("cur"), rates)
            if v is not None:
                lo, hi = PRICE_BANDS[price]
                if lo <= v <= hi:
                    score += 8
                    reasons.append("Typical listing price fits the price you want to sell at")
                else:
                    score -= 6
        reasons.append(f"Fits a {i['budget'].lower()} budget")
        if i.get("dropship"):
            reasons.append("Light and easy to ship")
        out.append({"idea": i, "score": round(score), "season": st, "mom": mom, "reasons": reasons[:5], "audience": ia,
                    "listing": {k: t.get(k) for k in ("image", "name", "price", "cur", "source", "url")} if t.get("image") else None})
    out.sort(key=lambda x: -x["score"])
    return out
