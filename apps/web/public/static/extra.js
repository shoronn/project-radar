/* Product Radar: real product photos, season candle chart, user dashboard, admin dashboard. Loaded after screens.js. */
Object.assign(IP, {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.5L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.6 4.5L20 16"/><path d="M20 21v-5h-5"/>',
  candle: '<path d="M7 3v4M7 17v4M17 6v3M17 15v3"/><rect x="4.5" y="7" width="5" height="10" rx="1"/><rect x="14.5" y="9" width="5" height="6" rx="1"/>'
});
Object.assign(W.en, {dash: "Dashboard", admin: "Admin"});
Object.assign(W.bn, {dash: "ড্যাশবোর্ড", admin: "অ্যাডমিন"});
const MS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const nf = n => (+n || 0).toLocaleString("en-US");

/* ---------- account: admin flag, dashboard links, go to dashboard after sign up ---------- */
loadMe = async function(){ const j = await api("/api/me"); S.me = j.user; S.limits = j.limits; S.used = j.used; S.plans = j.plans; S.sources = j.sources; S.ai = j.ai; S.admin = !!j.admin; head() };
const headBase2 = head;
head = function(){
  headBase2();
  if (!S.me) return;
  const r = route().name;
  $("#acct").innerHTML = `${S.admin ? `<a class="btn sm ${r === "admin" ? "k" : "w"}" href="#/admin">${icon("shield", 16)}<span class="hide-s"> ${t("admin")}</span></a> ` : ""}<a class="btn sm ${r === "dashboard" ? "k" : "y"}" href="#/dashboard">${icon("grid", 16)}<span class="hide-s"> ${t("dash")}</span></a> <button class="btn sm w" id="lo">${t("logout")}</button>`;
  $("#lo").onclick = async () => { await api("/api/logout", {method: "POST"}); await loadMe(); location.hash = "#/" };
};
SECTION.dashboard = "dashboard"; SECTION.admin = "admin";
const toastBase = toast;                                // after creating an account, open the dashboard
toast = function(m){ toastBase(m); if (/^Account created/.test(m)) setTimeout(() => { location.hash = "#/dashboard" }, 200) };

/* ---------- real photos ---------- */
const photo = (p, alt) => p && p.image ? `<img loading="lazy" referrerpolicy="no-referrer" src="${esc(p.image)}" alt="${esc(alt || p.name || "")}" data-fb="noimg">` : noImg;
const photoCredit = p => p && p.image ? `<a class="credit" href="${esc(p.url || "#")}" target="_blank" rel="noopener noreferrer" title="${esc(p.name)}">Photo: ${esc((p.source || "listing").replace(/\s*\(.*\)/, ""))} listing ↗</a>` : "";
const ideaCardBase = ideaCard;
ideaCard = function(i, compact){
  const h = ideaCardBase(i, compact);
  return h.replace(/<span class="ic"[^>]*>[\s\S]*?<\/span><div>/, `<span class="ph">${photo(i.photo, i.name)}</span><div>`)
          .replace('<article class="card idea">', `<article class="card idea has-ph">`)
          .replace(/(<p class="why")/, `${photoCredit(i.photo)}$1`);
};
/* season calendar rows: thumbnail instead of icon */
const seasonBase = VIEWS.season;
VIEWS.season = async r => {
  await seasonBase(r);
  const fix = () => $$("#hm .nm").forEach(a => { const i = S.ideas.find(x => a.getAttribute("href").endsWith(encodeURIComponent(x.kw))); const m = a.querySelector(".mini"); if (i && i.photo && m) m.outerHTML = `<span class="tn">${photo(i.photo, i.name)}</span>` });
  fix(); const sel = $("#scat"); if (sel){ const o = sel.onchange; sel.onchange = e => { o(e); fix() } }
  const w = $("#app .wrap .sec-h"); if (w) w.insertAdjacentHTML("afterend", `<div class="card" id="scard" style="margin-bottom:20px"></div>`);
  seasonCard($("#scard"), S.ideas.map(i => i.kw), S.ideas[0] && S.ideas[0].kw);
};

function trendsMulti(qs, geo, time){
  const g = !geo || geo === "WW" ? "" : geo, tm = time || "today 12-m";
  const req = {comparisonItem: qs.map(q => ({keyword: q, geo: g, time: tm})), category: 0, property: ""};
  const eq = `q=${encodeURIComponent(qs.join(","))}&date=${tm}` + (g ? `&geo=${g}` : "");
  return `https://trends.google.com/trends/embed/explore/TIMESERIES?req=${encodeURIComponent(JSON.stringify(req))}&tz=-360&eq=${encodeURIComponent(eq)}`;
}
/* ---------- season chart: monthly candles (up / down) or line, plus the typical year ---------- */
function seasonSummary(d){
  const p = d.pattern || [], ok = p.filter(x => x != null);
  if (ok.length < 10) return "";
  const best = p.map((v, i) => [v, i]).filter(x => x[0] >= 75).map(x => MS[x[1]]);
  const up = [], down = [];
  for (let m = 0; m < 12; m++){ const a = p[(m + 11) % 12], b = p[m]; if (a == null || b == null) continue; if (b - a >= 8) up.push(MS[m]); if (a - b >= 8) down.push(MS[m]) }
  const C = d.candles || [], last = C.slice(-3), prev = C.slice(-6, -3);
  const ch = last.length && prev.length ? Math.round((avg(last.map(x => x.avg)) / Math.max(1, avg(prev.map(x => x.avg))) - 1) * 100) : null;
  return `<div class="ssum">${best.length ? `<span><b>Best months</b>${best.join(", ")}</span>` : ""}${up.length ? `<span><b>Starts rising in</b>${up.join(", ")}</span>` : ""}${down.length ? `<span><b>Starts falling in</b>${down.join(", ")}</span>` : ""}${ch != null ? `<span><b>Last 3 months</b><i class="${ch >= 0 ? "u" : "d"}">${ch >= 0 ? "▲" : "▼"} ${Math.abs(ch)}%</i> vs the 3 before</span>` : ""}</div>`;
}
function candleSVG(C, mode, W){
  W = Math.round(Math.max(320, Math.min(1000, W || 900))); const sm = W < 560, H = sm ? 240 : 280, L = 34, R = 10, T = 12, B = 34, n = C.length;
  const bw = (W - L - R) / n, X = i => L + bw * i + bw / 2, Y = v => T + (H - T - B) * (1 - v / 100);
  const grid = [0, 25, 50, 75, 100].map(v => `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#E6DFD2" stroke-width="1"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end" class="ax">${v}</text>`).join("");
  const labs = C.map((c, i) => { const [y, m] = c.m.split("-"); const firstOk = i === 0 && !C.slice(1, 4).some(x => x.m.endsWith("-01")); return (+m === 1 || firstOk) ? `<text x="${X(i)}" y="${H - 8}" text-anchor="middle" class="ax"><tspan font-weight="700">${MS[m - 1]}</tspan> ${y.slice(2)}</text>` : (+m % 3 === 1 && !sm ? `<text x="${X(i)}" y="${H - 8}" text-anchor="middle" class="ax">${MS[m - 1]}</text>` : "") }).join("");
  let marks = "";
  if (mode === "line"){
    const pts = C.map((c, i) => `${X(i).toFixed(1)},${Y(c.avg).toFixed(1)}`).join(" ");
    marks = `<polygon points="${X(0)},${Y(0)} ${pts} ${X(n - 1)},${Y(0)}" fill="#0B8A7A" opacity=".14"/><polyline points="${pts}" fill="none" stroke="#0B8A7A" stroke-width="2.5" stroke-linejoin="round"/>` +
      C.map((c, i) => `<circle cx="${X(i)}" cy="${Y(c.avg)}" r="${i === n - 1 ? 6 : 4}" fill="${i === n - 1 ? "#F5A524" : "#fff"}" stroke="#111" stroke-width="2"/>`).join("");
  } else {
    const w = Math.max(4, Math.min(22, bw * .62));
    marks = C.map((c, i) => { const up = c.c >= c.o, col = up ? "#1FB57A" : "#EF5A5F", top = Y(Math.max(c.o, c.c)), h = Math.max(2, Math.abs(Y(c.o) - Y(c.c)));
      return `<line x1="${X(i)}" x2="${X(i)}" y1="${Y(c.h)}" y2="${Y(c.l)}" stroke="#111" stroke-width="2"/><rect x="${X(i) - w / 2}" y="${top}" width="${w}" height="${h}" rx="2" fill="${col}" stroke="#111" stroke-width="2"/>` }).join("");
  }
  const hits = C.map((c, i) => `<rect class="hit" data-i="${i}" x="${L + bw * i}" y="${T}" width="${bw}" height="${H - T - B}" fill="transparent"/>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" class="cs" role="img" aria-label="Monthly Google search interest, ${mode === "line" ? "line" : "candles"}">${grid}${labs}${marks}<line class="xh" x1="0" x2="0" y1="${T}" y2="${H - B}" stroke="#111" stroke-dasharray="3 3" opacity="0"/>${hits}</svg>`;
}
function patternSVG(p, W){
  W = Math.round(Math.max(320, Math.min(1000, W || 900))); const m = new Date().getMonth(), sm = W < 560, H = 110, B = 22, bw = W / 12;
  return `<svg viewBox="0 0 ${W} ${H}" class="cs" role="img" aria-label="Typical year">${p.map((v, i) => { const h = (H - B - 8) * (v || 0) / 100, col = v >= 75 ? "#1FB57A" : v >= 50 ? "#F5A524" : "#fff";
    return `<rect x="${bw * i + bw * .14}" y="${H - B - h}" width="${bw * .72}" height="${Math.max(h, 2)}" rx="3" fill="${col}" stroke="#111" stroke-width="2"${i === m ? ' stroke-dasharray="5 3"' : ""}><title>${MS[i]}: ${v == null ? "no data" : v + " of 100"}</title></rect><text x="${bw * i + bw / 2}" y="${H - 6}" text-anchor="middle" class="ax"${i === m ? ' font-weight="800"' : ""}>${sm ? MS[i][0] : MS[i]}</text>` }).join("")}</svg>`;
}
function bindCandles(box, C){
  const svg = box.querySelector("svg.cs"), tip = box.querySelector(".ctip"), xh = svg && svg.querySelector(".xh");
  if (!svg) return;
  svg.querySelectorAll(".hit").forEach(r => {
    const show = () => { const c = C[+r.dataset.i], [y, mm] = c.m.split("-"), d = c.c - c.o, x = +r.getAttribute("x") + +r.getAttribute("width") / 2;
      xh.setAttribute("x1", x); xh.setAttribute("x2", x); xh.setAttribute("opacity", ".5");
      tip.innerHTML = `<b>${MS[mm - 1]} ${y}</b><span class="${d >= 0 ? "u" : "d"}">${d >= 0 ? "▲ Up" : "▼ Down"} ${Math.abs(d)}</span><br>Start ${c.o} · End ${c.c}<br>High ${c.h} · Low ${c.l} · Avg ${c.avg}`;
      const bx = svg.getBoundingClientRect(), px = x / svg.viewBox.baseVal.width * bx.width; tip.style.display = "block"; tip.style.left = Math.min(bx.width - 170, Math.max(0, px - 80)) + "px" };
    r.addEventListener("mouseenter", show); r.addEventListener("click", show);
  });
  svg.addEventListener("mouseleave", () => { tip.style.display = "none"; xh.setAttribute("opacity", "0") });
}
async function seasonCard(el, kws, first, opt = {}){
  if (!el) return;
  kws = [...new Set(kws.filter(Boolean))];
  let kw = first || kws[0], mode = ls.get("cmode", "candle");
  const draw = async () => {
    el.innerHTML = `<div class="row" style="justify-content:space-between;gap:10px"><h3>${icon("candle", 20)} ${opt.title || "Season chart: when it goes up and down"}</h3>
      <div class="row" style="gap:8px">${kws.length > 1 ? `<select class="sel" id="sck">${kws.map(k => `<option ${k === kw ? "selected" : ""}>${esc(k)}</option>`).join("")}</select>` : ""}
      <div class="tg" id="scm"><button data-m="candle" class="${mode === "candle" ? "on" : ""}">Candles</button><button data-m="line" class="${mode === "line" ? "on" : ""}">Line</button></div></div></div><div class="skel" style="margin-top:14px"></div>`;
    let d; try { d = await api(`/api/season?kw=${encodeURIComponent(kw)}&country=${opt.country || S.country}`) } catch(e){ d = {candles: []} }
    const C = d.candles || [], cw = el.clientWidth - 46;
    el.querySelector(".skel").outerHTML = C.length < 3 ? `<div class="embed" style="margin-top:14px"><iframe loading="lazy" title="Google Trends, 5 years" src="${trendsMulti([kw], opt.country || S.country, "today 5-y")}"></iframe></div><p class="mut" style="margin:8px 0 0">Live chart straight from Google Trends (5 years). Add SERPAPI_KEY to get the monthly up and down candles and the season summary. <a href="#/setup">Setup guide</a></p>` :
      `${seasonSummary(d)}<div class="cwrap">${candleSVG(C, mode, cw)}<div class="ctip"></div></div>
       <div class="leg">${mode === "line" ? `<span><i style="background:#0B8A7A"></i>Average search interest per month</span>` : `<span><i style="background:#1FB57A"></i>Up month: ended higher than it started</span><span><i style="background:#EF5A5F"></i>Down month: ended lower</span><span><i class="wk"></i>Thin line: highest and lowest week</span>`}</div>
       <h4 style="margin:16px 0 4px">Typical year (all ${Math.round(C.length / 12) >= 2 ? "years" : "data"} averaged)</h4>${patternSVG(d.pattern, cw)}
       <p class="mut" style="margin:6px 0 0">${gtag("A")} ${esc(d.source || "Google Trends")} · 100 = the busiest week for this product · updated ${ago(d.updated)} · search interest is not sales.</p>`;
    bindCandles(el, C);
    const s = el.querySelector("#sck"); if (s) s.onchange = e => { kw = e.target.value; draw() };
    el.querySelectorAll("#scm button").forEach(b => b.onclick = () => { mode = b.dataset.m; ls.set("cmode", mode); draw() });
  };
  draw();
}

/* ---------- Trending: season chart for the tracked products ---------- */
const trendingBase = VIEWS.trending;
VIEWS.trending = async r => {
  await trendingBase(r);
  const rows = $$("#tv [href*='research?q=']").map(a => decodeURIComponent((a.getAttribute("href").split("q=")[1] || "").split("&")[0])).filter(Boolean);
  const c = r.q.get("c") || S.country, first = $("#tv .card");
  if (first) first.insertAdjacentHTML("afterend", `<div class="card" id="tcard" style="margin-bottom:22px"></div>`);
  seasonCard($("#tcard"), rows.length ? rows : S.ideas.map(i => i.kw), rows[0], {country: c});
};

/* ---------- Home: coming into season, with real photos ---------- */
const homeBase2 = VIEWS.home;
VIEWS.home = async r => {
  await homeBase2(r);
  const soon = S.ideas.filter(i => seasonState(i) !== "off").slice(0, 8);
  const list = soon.length >= 4 ? soon : S.ideas.slice(0, 8);
  const pk = i => peaks(i, S.country), m = new Date().getMonth();
  const html = `<section class="sec" id="soon" style="padding:34px 0 10px"><div class="wrap"><div class="row" style="justify-content:space-between;margin-bottom:14px"><h2>${S.lang === "bn" ? "সামনে যেগুলোর মৌসুম" : "Coming into season"}</h2><a class="btn sm w" href="#/season">Season calendar →</a></div>
    <div class="soon">${list.map(i => { const st = seasonState(i);
      return `<a class="card sn" href="#/research?q=${encodeURIComponent(i.kw)}"><span class="ph">${photo(i.photo, i.name)}<span class="tag ${st === "now" ? "g" : st === "soon" ? "y" : ""}">${st === "now" ? "In season" : st === "soon" ? "Soon" : "Off season"}</span></span>
        <b>${esc(S.lang === "bn" ? i.bn : i.name)}</b><span class="mut">${esc(i.why)}</span>
        <span class="mm">${MS.map((x, k) => `<i class="${pk(i).includes(k + 1) ? "on" : ""} ${k === m ? "now" : ""}" title="${x}"></i>`).join("")}</span>
        ${i.photo && i.photo.price ? `<span class="pr">from ${money(i.photo.price, i.photo.cur)} <span class="mut">· ${esc((i.photo.source || "").replace(/\s*\(.*\)/, ""))}</span></span>` : ""}</a>` }).join("")}</div></div></section>`;
  const hero = $(".hero");
  if (hero) hero.insertAdjacentHTML("afterend", html);
};

/* ---------- Research workspace: photo in header, season chart in Timing ---------- */
const bestPhoto = d => { if (!d) return null; const pool = [].concat(d.market_items || [], (d.ali && d.ali.items) || [], (d.shop && d.shop.items) || []); const x = pool.find(p => p.image); if (x) return x; const i = d.assessment && d.assessment.idea && S.ideas.find(k => k.id === d.assessment.idea.id); return i && i.photo };
const showStepBase = showStep;
showStep = function(i){
  showStepBase(i);
  if (!WS.d) return;
  const ph = bestPhoto(WS.d);
  if (!$("#wsph") && $("#wsq")) $("#wsq").parentNode.insertAdjacentHTML("beforebegin", `<span class="wsph" id="wsph">${photo(ph, WS.q)}</span>`);
  if (i === 2){ $("#wsm").insertAdjacentHTML("afterbegin", `<div class="card" id="wscard" style="margin-bottom:18px"></div>`); seasonCard($("#wscard"), [WS.d.q], WS.d.q, {title: "Up and down by month", country: WS.d.country}) }
};

/* ---------- Report: photo + season chart fill the header ---------- */
const reportBase = VIEWS.report;
VIEWS.report = async r => {
  await reportBase(r);
  const rep = $(".rep"); if (!rep) return;
  const q = $(".rep h1") ? $(".rep h1").textContent : "", d = WS.d && WS.d.q === q ? WS.d : S.last && S.last.q === q ? S.last : null;
  let dd = d; if (!dd) try { dd = await api(`/api/analyze?q=${encodeURIComponent(q)}&country=${S.country}`) } catch(e){}
  const ph = bestPhoto(dd), A = dd && dd.assessment;
  const head = [...rep.children].slice(0, 3);
  const box = document.createElement("div"); box.className = "rep-top";
  box.innerHTML = `<div class="rep-l"></div><figure class="rep-ph">${photo(ph, q)}<figcaption>${ph ? `${esc(ph.name || "")} · ${ph.price ? money(ph.price, ph.cur) + " · " : ""}<a href="${esc(ph.url || "#")}" target="_blank" rel="noopener">${esc(ph.source || "listing")}</a>` : "No listing photo found"}</figcaption></figure>
    ${A ? `<div class="rep-kpi"><div style="background:${VCOL[A.verdict] || "var(--cell)"}"><b>${A.opportunity == null ? "?" : A.opportunity}</b><span>Opportunity</span></div><div><b>${esc(A.verdict)}</b><span>Verdict</span></div><div><b>${A.confidence_label}</b><span>Evidence</span></div></div>` : ""}`;
  rep.insertBefore(box, head[0]); head.forEach(n => box.querySelector(".rep-l").appendChild(n));
  const s2 = [...$$(".rsec")].find(s => /Demand and timing/.test(s.textContent));
  if (s2) { s2.insertAdjacentHTML("beforeend", `<div class="card flat" id="repcard" style="margin-top:14px"></div>`); seasonCard($("#repcard"), [q], q, {title: "Up and down by month", country: dd && dd.country}) }
};

/* ---------- small chart for dashboards (one series, bars) ---------- */
function barsSVG(rows, key, col, label){
  const sm = innerWidth < 680, W = sm ? 420 : 600, H = 170, L = 30, B = 24, T = 10, n = rows.length, mx = Math.max(1, ...rows.map(r => r[key])), bw = (W - L) / n;
  const Y = v => T + (H - T - B) * (1 - v / mx), step = mx <= 4 ? 1 : Math.ceil(mx / 4);
  let g = ""; for (let v = 0; v <= mx; v += step) g += `<line x1="${L}" x2="${W}" y1="${Y(v)}" y2="${Y(v)}" stroke="#E6DFD2"/><text x="${L - 5}" y="${Y(v) + 4}" text-anchor="end" class="ax">${v}</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" class="cs" role="img" aria-label="${esc(label)}">${g}${rows.map((r, i) => { const h = (H - T - B) * r[key] / mx; return `<rect x="${L + bw * i + bw * .15}" y="${Y(r[key])}" width="${bw * .7}" height="${Math.max(h, r[key] ? 2 : 0)}" rx="3" fill="${col}" stroke="#111" stroke-width="${r[key] ? 2 : 0}"><title>${r.day}: ${r[key]} ${label}</title></rect>` +
    ((i % (n > 14 ? 7 : 2) === 0 || (i === n - 1 && i % (n > 14 ? 7 : 2) >= (n > 14 ? 4 : 2))) ? `<text x="${L + bw * i + bw / 2}" y="${H - 6}" text-anchor="middle" class="ax">${r.day.slice(5).replace("-", "/")}</text>` : "") }).join("")}</svg>`;
}
const meter = (u, l) => { const p = l ? Math.min(100, u / l * 100) : 0; return `<u class="meter"><i style="width:${p}%;background:${p >= 90 ? "var(--red)" : p >= 60 ? "var(--yellow)" : "var(--green)"}"></i></u>` };
const kpi = (ic, bg, label, val, sub, extra = "") => `<div class="card kpi"><span class="ic" style="background:${bg}">${icon(ic, 20)}</span><span class="mut">${label}</span><b>${val}</b>${extra}<span class="mut">${sub}</span></div>`;

/* ---------- USER DASHBOARD ---------- */
async function dashboardView(){
  if (!S.me){ $("#app").innerHTML = `<section class="sec"><div class="wrap"><div class="card empty"><div>${icon("grid", 44)}</div><h3>Your dashboard lives in your account</h3><p class="mut">See your checks, AI credits, projects and the products you follow.</p><button class="btn g" id="dsu">Create free account</button> <button class="btn w" id="dli">Log in</button></div></div></section>`; $("#dsu").onclick = () => auth("signup"); $("#dli").onclick = () => auth("login"); return }
  $("#app").innerHTML = `<section class="sec"><div class="wrap"><div class="card"><div class="skel"></div><div class="skel" style="width:60%"></div></div></div></section>`;
  let d, tr = null;
  try { d = await api("/api/dashboard") } catch(e){ $("#app").innerHTML = `<section class="sec"><div class="wrap"><div class="card empty">${esc(e.message)}</div></div></section>`; return }
  try { tr = await api("/api/trending?country=" + S.country) } catch(e){}
  const U = d.user, free = U.plan === "free", nm = U.name || U.email.split("@")[0];
  const hot = tr ? tr.rows.filter(x => x.products && x.products.length).slice(0, 4) : [];
  $("#app").innerHTML = `<section class="sec dash" style="padding-top:28px"><div class="wrap">
    <div class="row" style="justify-content:space-between;gap:12px;margin-bottom:18px"><div><div class="mut">${t("dash")}</div><h2>Hi ${esc(nm)}</h2></div>
      <div class="row"><span class="tag ${free ? "" : "y"}">${esc(U.plan_name)} plan${U.until ? " · until " + esc(U.until) : ""}</span>${free ? `<a class="btn g sm" href="#/pricing">Upgrade</a>` : ""}<a class="btn sm" href="#/research">${icon("flask", 16)} New research</a></div></div>
    <div class="grid g4">
      ${kpi("search", "var(--mint)", "Product checks today", `${d.checks.used} <small>of ${d.checks.limit}</small>`, `${Math.max(0, d.checks.limit - d.checks.used)} left · resets at midnight`, meter(d.checks.used, d.checks.limit))}
      ${kpi("chat", "var(--pink)", "AI answers this month", `${d.ai.used} <small>of ${d.ai.limit}</small>`, d.ai.on ? `${Math.max(0, d.ai.limit - d.ai.used)} left` : "AI not connected yet", meter(d.ai.used, d.ai.limit))}
      ${kpi("folder", "rgba(143,123,255,.2)", "Research projects", `${d.projects.n} <small>of ${d.projects.limit}</small>`, "Saved research with notes and tasks", meter(d.projects.n, d.projects.limit))}
      ${kpi("bookmark", "var(--yellow)", "Shortlist", `${d.saved.n} <small>of ${d.saved.limit}</small>`, "Products you saved", meter(d.saved.n, d.saved.limit))}
    </div>
    <div class="grid dash2" style="margin-top:20px">
      <div class="card"><div class="row" style="justify-content:space-between"><h3>Your checks, last 14 days</h3><span class="tag">${nf(d.checks.week.reduce((a, b) => a + b.n, 0))} total</span></div>${barsSVG(d.checks.week, "n", "#1FB57A", "checks")}</div>
      <div class="card"><h3>Recently checked</h3>${d.recent.length ? `<div class="chips" style="margin-top:10px">${d.recent.map(x => `<a class="chip" href="#/research?q=${encodeURIComponent(x.q)}">${esc(x.q)} <span class="mut">${esc(x.country)}</span></a>`).join("")}</div>` : `<p class="mut">Nothing yet. <a href="#/research">Check your first product →</a></p>`}
        ${d.saved.items.length ? `<h3 style="margin-top:18px">Shortlist</h3><div class="chips" style="margin-top:10px">${d.saved.items.map(x => `<a class="chip" href="#/research?q=${encodeURIComponent(x)}">${icon("bookmark", 14)} ${esc(x)}</a>`).join("")}</div>` : ""}</div>
    </div>
    <div class="row" style="justify-content:space-between;margin:28px 0 12px"><h3>${t("cont")}</h3><a class="btn sm w" href="#/projects">All projects →</a></div>
    ${d.projects.items.length ? `<div class="grid g3">${d.projects.items.slice(0, 3).map(projCard).join("")}</div>` : `<div class="card empty"><b>No projects yet</b>Open any product in Research and press “Save as project”.</div>`}
    ${hot.length ? `<div class="row" style="justify-content:space-between;margin:28px 0 12px"><h3>Rising now in ${esc(cname(tr.country))}</h3><a class="btn sm w" href="#/trending">See all →</a></div>
      <div class="soon">${hot.map(x => { const p = x.products[0]; return `<a class="card sn" href="#/research?q=${encodeURIComponent(x.kw)}"><span class="ph">${photo(p, p.name)}${x.mom ? `<span class="tag ${x.mom >= 1 ? "g" : "r"}">${x.mom >= 1 ? "▲" : "▼"} ${Math.abs(Math.round((x.mom - 1) * 100))}%</span>` : ""}</span><b>${esc(x.idea ? x.idea.name : x.kw)}</b><span class="pr">${money(p.price, p.cur)} <span class="mut">· ${esc(p.source)}</span></span></a>` }).join("")}</div>` : ""}
    <div class="card" id="dcard" style="margin-top:24px"></div>
  </div></section>`;
  const follow = [].concat(d.recent.map(x => x.q), hot.map(x => x.kw), S.ideas.slice(0, 6).map(i => i.kw));
  seasonCard($("#dcard"), follow, follow[0], {title: "Season chart for your products"});
}

/* ---------- ADMIN DASHBOARD ---------- */
async function adminView(){
  if (!S.admin){ $("#app").innerHTML = `<section class="sec"><div class="wrap"><div class="card empty"><div>${icon("shield", 44)}</div><h3>Admins only</h3><p class="mut">Add your email to ADMIN_EMAILS in .env, restart the app and log in.</p></div></div></section>`; return }
  $("#app").innerHTML = `<section class="sec"><div class="wrap"><div class="card"><div class="skel"></div></div></div></section>`;
  let o; try { o = await api("/api/admin/overview") } catch(e){ $("#app").innerHTML = `<section class="sec"><div class="wrap"><div class="card empty">${esc(e.message)}</div></div></section>`; return }
  const paid = Object.entries(o.by_plan).filter(x => x[0] !== "free").reduce((a, b) => a + b[1], 0), D = o.data;
  const rev = Object.entries(o.revenue_estimate).filter(x => x[1]).map(x => `${x[0]} ${nf(x[1])}`).join(" or ") || "0";
  $("#app").innerHTML = `<section class="sec dash" style="padding-top:28px"><div class="wrap">
    <div class="row" style="justify-content:space-between;margin-bottom:18px"><div><div class="mut">${icon("shield", 14)} Admin</div><h2>Control room</h2></div><span class="mut">Live from your database · ${new Date().toLocaleString("en-GB")}</span></div>
    <div class="grid g4">
      ${kpi("users", "var(--mint)", "Users", nf(o.users), `${paid} paid · ${o.today.signups} new today`)}
      ${kpi("search", "var(--yellow)", "Checks today", nf(o.today.checks), `${o.today.active} active people today`)}
      ${kpi("chat", "var(--pink)", "AI answers this month", nf(o.ai.answers), o.ai.cost_usd != null ? `≈ $${o.ai.cost_usd} (${nf(o.ai.tokens_in + o.ai.tokens_out)} tokens)` : `${nf(o.ai.tokens_in + o.ai.tokens_out)} tokens · set AI_PRICE_IN/OUT for cost`)}
      ${kpi("card", "rgba(143,123,255,.2)", "Monthly revenue (estimate)", rev, "Paid plans × list price. Payments not connected yet.")}
    </div>
    <div class="grid dash2" style="margin-top:20px">
      <div class="card"><h3>Product checks per day (30 days)</h3>${barsSVG(o.series, "checks", "#1FB57A", "checks")}</div>
      <div class="card"><h3>New accounts per day (30 days)</h3>${barsSVG(o.series, "signups", "#0B8A7A", "sign-ups")}</div>
    </div>
    <div class="grid dash2" style="margin-top:20px">
      <div class="card"><div class="row" style="justify-content:space-between"><h3>${icon("refresh", 18)} Data freshness</h3><span class="tag ${D.auto ? "g" : "r"}">${D.auto ? `Auto every ${D.refresh_hours} h` : "Auto refresh off"}</span></div>
        <table class="bt" style="margin-top:10px"><tr><th>Country</th><th>Updated</th><th>Products tracked</th><th>Photos</th><th></th></tr>${D.countries.map(c => { const f = D.fresh.find(x => x.country === c);
          return `<tr><td><b>${esc(cname(c))}</b></td><td>${f ? ago(f.updated) : "never"}${f && f.note ? `<div class="mut" style="white-space:normal">${esc(f.note)}</div>` : ""}</td><td>${D.tracked[c] || 0}</td><td>${D.photos[c] || 0} of ${D.ideas}</td><td style="white-space:nowrap"><button class="btn sm" data-rf="${c}">Refresh</button> <button class="btn sm w" data-ri="${c}">Photos</button></td></tr>` }).join("")}</table>
        ${D.running ? `<p class="mut">${icon("refresh", 14)} A refresh is running now.</p>` : ""}
        <h4 style="margin:16px 0 6px">Recent jobs</h4><table class="bt">${D.jobs.map(j => `<tr><td>${new Date(j.t * 1000).toLocaleString("en-GB")}</td><td>${esc(j.job)} ${esc(j.country)}</td><td><span class="tag ${j.ok ? "g" : "r"}">${j.ok ? "OK" : "Error"}</span></td><td style="white-space:normal">${esc(j.note || "")}</td></tr>`).join("") || `<tr><td class="mut">No jobs yet</td></tr>`}</table></div>
      <div class="card"><h3>Top searches (30 days)</h3><table class="bt" style="margin-top:10px"><tr><th>Product</th><th>Country</th><th>People</th></tr>${o.top_searches.map(x => `<tr><td><a href="#/research?q=${encodeURIComponent(x.q)}">${esc(x.q)}</a></td><td>${esc(x.country)}</td><td>${x.n}</td></tr>`).join("") || `<tr><td class="mut">No searches yet</td></tr>`}</table>
        <h4 style="margin:16px 0 6px">Data sources</h4><div class="chips">${Object.entries(o.sources).map(([k, v]) => `<span class="chip"><span class="tag ${v ? "g" : "r"}">${v ? "On" : "Off"}</span> ${esc(k)}</span>`).join("")}<span class="chip"><span class="tag ${o.ai.on ? "g" : "r"}">${o.ai.on ? "On" : "Off"}</span> AI ${esc(o.ai.provider || "")}</span></div>
        <h4 style="margin:16px 0 6px">Users by plan</h4><div class="chips">${Object.entries(o.by_plan).map(([k, v]) => `<span class="chip">${esc(k)} <b>${v}</b></span>`).join("")}</div></div>
    </div>
    <div class="card" style="margin-top:20px"><div class="row" style="justify-content:space-between"><h3>Users</h3><input class="in" id="aq" placeholder="Search email or name" style="max-width:280px"></div><div class="scroll" id="aul" style="margin-top:12px"></div></div>
  </div></section>`;
  $$("[data-rf]").forEach(b => b.onclick = async () => { const j = await api("/api/admin/refresh", {method: "POST", body: JSON.stringify({country: b.dataset.rf})}); toast(j.message || "Started") });
  $$("[data-ri]").forEach(b => b.onclick = async () => { const j = await api("/api/admin/refresh", {method: "POST", body: JSON.stringify({country: b.dataset.ri, what: "images"})}); toast(j.message || "Started") });
  const users = async q => {
    const L = await api("/api/admin/users?q=" + encodeURIComponent(q || ""));
    $("#aul").innerHTML = `<table class="bt"><tr><th>Email</th><th>Joined</th><th>Last active</th><th>Checks (all / today)</th><th>AI this month</th><th>Projects</th><th>Plan</th><th>Paid until</th><th></th></tr>${L.map(u => `<tr><td><b>${esc(u.email)}</b>${u.name ? `<div class="mut">${esc(u.name)}</div>` : ""}</td><td>${esc((u.created || "").slice(0, 10))}</td><td>${esc(u.last || "–")}</td><td>${u.checks} / ${u.today || 0}</td><td>${u.ai || 0}</td><td>${u.projects}</td>
      <td><select class="sel" data-pl="${u.id}">${o.plans.filter(p => p !== "guest").map(p => `<option ${p === u.plan ? "selected" : ""}>${p}</option>`).join("")}</select></td><td><input class="in" type="date" data-un="${u.id}" value="${esc(u.plan_until || "")}"></td><td><button class="btn sm" data-sv="${u.id}">Save</button></td></tr>`).join("")}</table>`;
    $$("[data-sv]").forEach(b => b.onclick = async () => { const id = b.dataset.sv; try { await api("/api/admin/plan", {method: "POST", body: JSON.stringify({id, plan: $(`[data-pl="${id}"]`).value, until: $(`[data-un="${id}"]`).value})}); toast("Plan saved.") } catch(e){ toast(e.message) } });
  };
  let at; $("#aq").oninput = e => { clearTimeout(at); at = setTimeout(() => users(e.target.value), 300) };
  users("");
}
Object.assign(VIEWS, {dashboard: dashboardView, admin: adminView});
