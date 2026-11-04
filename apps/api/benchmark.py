"""AI benchmark: runs the full research on a fixed product list and writes a report a person can check fast.
   python benchmark.py            (Bangladesh)      python benchmark.py US
The AI does the research. A person only marks each row right or wrong, so the AI is never graded by itself alone.
Results: data/benchmark/benchmark_<country>_<date>.html and .csv"""
import csv, datetime as dt, html, json, os, sys, time
os.environ.setdefault("AUTO_REFRESH", "0")   # the benchmark must not start the background refresh
import app, config, research, sources  # noqa: E402

def main(country="BD"):
    prods = json.load(open(config.content_path("benchmark_products.json"), encoding="utf-8"))
    rates = (sources.fx() or {}).get("rates")
    rows = []
    for i, q in enumerate(prods, 1):
        t0 = time.time()
        d = app.collect(q, country)
        d.update(q=q, country=country)
        a = research.assess(d, app.IDEAS["ideas"], country, rates)
        mk = (d.get("market_items") or [])[:3]
        rows.append(dict(product=q, verdict=a["verdict"], opportunity=a["opportunity"], confidence=f'{a["confidence_label"]} ({a["confidence"]}%)',
                         signals=a["signals_used"], market=d.get("market_price"), supplier=d.get("supplier_price"), listings=mk,
                         devil=a["devil"][:3], unknowns=a["unknowns"], sources={k: v["ok"] for k, v in d["sources"].items()}, seconds=round(time.time() - t0, 1)))
        print(f"{i:2}/{len(prods)} {q:28} {a['verdict']:15} opp={a['opportunity']} conf={a['confidence_label']}", flush=True)
    stamp = dt.datetime.now().strftime("%Y-%m-%d_%H%M")
    out = os.path.join(config.DATA_DIR, "benchmark", f"benchmark_{country}_{stamp}")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out + ".csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["product", "verdict", "opportunity", "confidence", "signals_with_data", "market_median", "market_cur", "supplier_median_usd", "listing_1", "listing_1_price", "listing_1_url", "correct_Y_N", "note"])
        for r in rows:
            m, s, l1 = r["market"] or {}, r["supplier"] or {}, (r["listings"] or [{}])[0]
            w.writerow([r["product"], r["verdict"], r["opportunity"], r["confidence"], r["signals"], m.get("median"), m.get("cur"), s.get("median"), l1.get("name"), l1.get("price"), l1.get("url"), "", ""])
    e = html.escape
    cards = "".join(f"""<tr><td><b>{e(r['product'])}</b><br><small>{r['seconds']} s</small></td><td><b>{e(r['verdict'])}</b><br>Opportunity {r['opportunity'] if r['opportunity'] is not None else '–'}<br>{e(r['confidence'])}</td>
      <td>{''.join(f'<div class="l"><img src="{e(x.get("image") or "")}" alt=""><a href="{e(x.get("url") or "#")}" target="_blank">{e(x.get("name") or "")}</a><br>{e(str(x.get("price")))} {e(x.get("cur") or "")}</div>' for x in r['listings']) or 'No listings'}</td>
      <td><ul>{''.join(f'<li>{e(x)}</li>' for x in r['devil'])}</ul>{('<small>Unknown: ' + e('; '.join(r['unknowns'])) + '</small>') if r['unknowns'] else ''}</td>
      <td>{' '.join(('&#10003; ' if ok else '&#8211; ') + e(k) for k, ok in r['sources'].items())}</td><td><label><input type=radio name="c{i}">Right</label><br><label><input type=radio name="c{i}">Wrong</label><br><input placeholder="note"></td></tr>"""
                    for i, r in enumerate(rows))
    page = f"""<!doctype html><meta charset=utf-8><title>Benchmark {country} {stamp}</title><style>body{{font:14px/1.5 system-ui;margin:24px}}table{{border-collapse:collapse;width:100%}}td,th{{border:1px solid #ccc;padding:8px;vertical-align:top}}th{{background:#111;color:#fff;text-align:left}}.l{{display:flex;gap:8px;align-items:flex-start;margin-bottom:8px}}.l img{{width:56px;height:56px;object-fit:contain;border:1px solid #ddd}}ul{{margin:0;padding-left:18px}}</style>
<h1>AI benchmark: {country}, {stamp}</h1><p>Check each row in 2 to 3 minutes: open the listings, compare with what you see in the market, then mark Right or Wrong. Print or save this page as PDF to keep your marks.</p>
<table><tr><th>Product</th><th>AI verdict</th><th>Top market listings (photo, title and price from one listing)</th><th>Devil's Advocate</th><th>Sources</th><th>Your check</th></tr>{cards}</table>"""
    open(out + ".html", "w", encoding="utf-8").write(page)
    print("Report:", out + ".html")
    return out

if __name__ == "__main__":
    main((sys.argv[1] if len(sys.argv) > 1 else "BD").upper())
