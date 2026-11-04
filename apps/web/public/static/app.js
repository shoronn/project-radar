/* Product Radar front end. Plain JS, no build step. */
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ls = {get(k, d){try{const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v)}catch(e){return d}}, set(k, v){try{localStorage.setItem(k, JSON.stringify(v))}catch(e){}}};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const med = a => {const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0};
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_BN = ["জানু","ফেব্রু","মার্চ","এপ্রি","মে","জুন","জুলা","আগ","সেপ্ট","অক্টো","নভে","ডিসে"];
const SOUTH = ["AU","NZ","ZA","AR","BR","CL","UY","PY","PE"];
const COUNTRIES = [["WW","Worldwide"],["BD","Bangladesh"],["IN","India"],["PK","Pakistan"],["US","USA"],["GB","UK"],["CA","Canada"],["AU","Australia"],["DE","Germany"],["FR","France"],["AE","UAE"],["SA","Saudi Arabia"],["MY","Malaysia"],["ID","Indonesia"],["PH","Philippines"],["NG","Nigeria"],["ZA","South Africa"],["BR","Brazil"]];
const CURS = ["BDT","USD","EUR","GBP","INR","PKR","AED","SAR","MYR","CAD","AUD"];

/* ---------- line icons (no emoji anywhere) ---------- */
const IP = {
 home:'<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>', flame:'<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3-1-3 0-6 1-9z"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', bulb:'<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
 cal:'<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>', card:'<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
 bookmark:'<path d="M7 3h10v18l-5-4-5 4z"/>', pot:'<path d="M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M2 10h20M9 6c0-1 1-2 3-2s3 1 3 2"/>',
 lamp:'<path d="M8 3h8l3 8H5z"/><path d="M12 11v7M8 21h8"/>', plug:'<path d="M9 2v5M15 2v5"/><rect x="6" y="7" width="12" height="6" rx="2"/><path d="M12 13v4a3 3 0 0 0 3 3"/>',
 watch:'<rect x="7" y="6" width="10" height="12" rx="3"/><path d="M9 6l1-4h4l1 4M9 18l1 4h4l1-4"/>', battery:'<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 11v2M7 10v4M11 10v4"/>',
 umbrella:'<path d="M3 12a9 9 0 0 1 18 0z"/><path d="M12 12v7a2 2 0 0 1-4 0"/>', car:'<path d="M5 16V11l2-5h10l2 5v5"/><path d="M3 16h18v3H3z"/><circle cx="7.5" cy="13.5" r="1"/><circle cx="16.5" cy="13.5" r="1"/>',
 mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>', house:'<path d="M3 11l9-7 9 7v9H3z"/><path d="M10 20v-6h4v6"/>',
 sparkle:'<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>', dumbbell:'<path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/>', bottle:'<path d="M10 2h4v3l2 3v12a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V8l2-3z"/><path d="M8 12h8"/>',
 paw:'<circle cx="7" cy="9" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="17" cy="9" r="2"/><path d="M8 17c0-3 2-5 4-5s4 2 4 5c0 2-2 3-4 3s-4-1-4-3z"/>', laptop:'<rect x="5" y="5" width="14" height="10" rx="1"/><path d="M2 19h20"/>',
 gift:'<rect x="3" y="9" width="18" height="12" rx="1"/><path d="M3 13h18M12 9v12M12 9c-2-4-6-4-6-1s6 1 6 1 6 2 6-1-4-3-6 1"/>', snow:'<path d="M12 2v20M3 7l18 10M21 7L3 17"/>',
 box:'<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>', down:'<path d="M3 7l6 6 4-4 8 8"/><path d="M21 11v6h-6"/>', tag:'<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
 wallet:'<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M16 13h2M3 10h18"/>', lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
 undo:'<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>', image:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 16l5-5 4 4 3-3 6 6"/><circle cx="16" cy="9" r="1.5"/>',
 alert:'<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>', check:'<path d="M4 12l5 5L20 6"/>', help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 17v.5"/>'};
const icon = (n, s) => `<svg class="ico" width="${s || 20}" height="${s || 20}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IP[n] || IP.box}</svg>`;
const noImg = `<span class="noimg">${icon("image", 28)}<span>Image unavailable</span></span>`;

const CAT = {"Home & Kitchen":["pot","rgba(255,194,75,.16)"],"Lighting & Decor":["lamp","rgba(255,122,217,.16)"],"Electric Appliance":["plug","rgba(143,123,255,.2)"],"Gadgets":["watch","rgba(43,229,154,.16)"],"Phone Accessories":["battery","rgba(255,194,75,.16)"],"Fashion & Accessories":["umbrella","rgba(255,122,217,.16)"],"Auto Accessories":["car","rgba(143,123,255,.2)"],"Creator Gear":["mic","rgba(255,122,217,.16)"],"Smart Home":["house","rgba(43,229,154,.16)"],"Personal Care":["sparkle","rgba(255,122,217,.16)"],"Health & Fitness":["dumbbell","rgba(255,194,75,.16)"],"Baby":["bottle","rgba(43,229,154,.16)"],"Pet":["paw","rgba(255,194,75,.16)"],"Office & Study":["laptop","rgba(143,123,255,.2)"],"Gifts":["gift","rgba(255,122,217,.16)"],"Seasonal":["snow","rgba(43,229,154,.16)"]};
const catIcon = c => { const x = CAT[c] || ["box","rgba(130,160,255,.1)"]; return [icon(x[0], 22), x[1]] };

const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || "");
const guessC = /Dhaka/.test(tz) ? "BD" : /Kolkata|Calcutta/.test(tz) ? "IN" : /Karachi/.test(tz) ? "PK" : /London/.test(tz) ? "GB" : /Dubai/.test(tz) ? "AE" : /Riyadh/.test(tz) ? "SA" : /America\//.test(tz) ? "US" : /Australia/.test(tz) ? "AU" : "WW";
const S = {me: null, limits: null, used: 0, plans: null, sources: {}, rates: null, fxOk: false, ideas: [], ideasNote: "", locked: 0,
  cur: ls.get("cur", {BD:"BDT",IN:"INR",PK:"PKR",GB:"GBP",AE:"AED",SA:"SAR",AU:"AUD"}[guessC] || "USD"), lang: ls.get("lang", guessC === "BD" ? "bn" : "en"), country: ls.get("country", guessC), last: null};

/* ---------- words (EN / বাংলা) ---------- */
const W = {
  en: {trending:"Trending", analyze:"Analyze", ideas:"Ideas", season:"Season", pricing:"Pricing", saved:"Shortlist", login:"Log in", start:"Start free", logout:"Log out",
    h1a:"Which product will", h1b:"sell next month?", lead:"Check any product in 30 seconds: live demand, real marketplace prices, supplier cost, season and profit. Know before you spend a single taka or dollar.",
    check:"Check it", try:"Try:", noSignup:"2 free checks a day, no sign-up. 5 a day with a free account.",
    inSeason:"Heading into season", painT:"Guessing is the most expensive way to start a business", painP:"Most new sellers pick a product because a friend sells it or a video said so. Then the money sits in a box.",
    coiT:"What does one wrong product cost you?", stepsT:"From idea to a clear yes or no", stepsP:"Three steps. No spreadsheets, no tech skills.",
    baT:"Stop guessing. Start knowing.", ideasT:"Product ideas for right now", ideasP:"Hand-picked ideas with the buyer's real reason to buy, a hook for your ad and the risk to watch. Every idea links to live data.",
    priceT:"Start free. Upgrade when it pays.", priceP:"One good product decision pays for a year. Cancel any time.", faqT:"Questions people ask before they start",
    ctaT:"Your next winning product is one search away.", ctaB:"Check a product now"},
  bn: {trending:"ট্রেন্ডিং", analyze:"যাচাই", ideas:"আইডিয়া", season:"মৌসুম", pricing:"প্যাকেজ", saved:"তালিকা", login:"লগইন", start:"ফ্রি শুরু করুন", logout:"লগআউট",
    h1a:"পরের মাসে কোন প্রোডাক্ট", h1b:"বেশি বিক্রি হবে?", lead:"যেকোনো প্রোডাক্ট ৩০ সেকেন্ডে যাচাই করুন: লাইভ চাহিদা, মার্কেটের আসল দাম, সাপ্লায়ার খরচ, মৌসুম আর লাভ। এক টাকা খরচের আগেই জেনে নিন।",
    check:"যাচাই করুন", try:"চেষ্টা করুন:", noSignup:"সাইন-আপ ছাড়া দিনে ২টা ফ্রি যাচাই। ফ্রি অ্যাকাউন্টে দিনে ৫টা।",
    inSeason:"সামনে যেগুলোর মৌসুম", painT:"আন্দাজে ব্যবসা শুরু করাই সবচেয়ে দামি ভুল", painP:"বেশিরভাগ নতুন বিক্রেতা প্রোডাক্ট বাছেন বন্ধু বিক্রি করছে বা একটা ভিডিও দেখে। তারপর টাকা আটকে থাকে বাক্সে।",
    coiT:"একটা ভুল প্রোডাক্টে আপনার কত খরচ?", stepsT:"আইডিয়া থেকে পরিষ্কার হ্যাঁ বা না", stepsP:"মাত্র তিন ধাপ। স্প্রেডশিট বা টেকনিক্যাল জ্ঞান লাগবে না।",
    baT:"আন্দাজ বন্ধ। জেনে শুনে শুরু।", ideasT:"এখনকার জন্য প্রোডাক্ট আইডিয়া", ideasP:"বাছাই করা আইডিয়া: ক্রেতা কেন কিনবে, বিজ্ঞাপনের হুক আর কোন ঝুঁকি দেখতে হবে। প্রতিটা আইডিয়া লাইভ ডেটার সাথে যুক্ত।",
    priceT:"ফ্রি শুরু করুন। লাভ হলে আপগ্রেড।", priceP:"একটা ভালো প্রোডাক্টের সিদ্ধান্তেই সারা বছরের খরচ উঠে আসে। যেকোনো সময় বাতিল করা যায়।", faqT:"শুরুর আগে মানুষ যা জানতে চায়",
    ctaT:"আপনার পরের সফল প্রোডাক্ট মাত্র এক সার্চ দূরে।", ctaB:"এখনই যাচাই করুন"}};
const t = k => (W[S.lang] && W[S.lang][k]) || W.en[k] || k;
const mon = () => S.lang === "bn" ? MONTHS_BN : MONTHS;

/* ---------- money ---------- */
function money(v, from, opt){
  if (v == null || isNaN(v)) return "–";
  let cur = from || "USD", amt = +v;
  if (S.rates && S.rates[cur] && S.rates[S.cur]) { amt = amt / S.rates[cur] * S.rates[S.cur]; cur = S.cur; }
  const big = Math.abs(amt) >= 100;
  try { return new Intl.NumberFormat(cur === "BDT" ? "en-IN" : "en-US", {style:"currency", currency:cur, maximumFractionDigits: big || (opt && opt.int) ? 0 : 2}).format(amt).replace("BDT", "৳").replace("BDT ", "৳") }
  catch(e) { return cur + " " + Math.round(amt) }
}
const toUSD = (v, from) => S.rates && S.rates[from] ? v / S.rates[from] : (from === "USD" ? v : null);
const fromUSD = v => S.rates && S.rates[S.cur] ? v * S.rates[S.cur] : v;

/* ---------- api ---------- */
const API_BASE = ((window.PR_CONFIG && window.PR_CONFIG.apiUrl) || "").replace(/\/+$/, "");
async function api(path, opt){
  opt = opt || {};
  const init = Object.assign({credentials: "include"}, opt);
  if (opt.body != null) init.headers = Object.assign({"Content-Type": "application/json"}, opt.headers || {});
  const r = await fetch(API_BASE + path, init);
  let j = {}; try { j = await r.json() } catch(e) {}
  if (!r.ok) { const e = new Error(j.message || j.error || "Something went wrong"); e.code = r.status; e.body = j; throw e }
  return j;
}
function toast(m){ const d = document.createElement("div"); d.className = "toast"; d.textContent = m; document.body.appendChild(d); setTimeout(() => d.remove(), 3200) }
async function loadMe(){ const j = await api("/api/me"); S.me = j.user; S.limits = j.limits; S.used = j.used; S.plans = j.plans; S.sources = j.sources; S.ai = j.ai; head() }

/* ---------- season helpers ---------- */
function peaks(idea, country){
  const flip = SOUTH.includes(country || S.country) && idea.weather;
  return idea.peak.map(m => flip ? ((m + 5) % 12) + 1 : m);
}
function seasonState(idea){
  const m = new Date().getMonth() + 1, p = peaks(idea), nx = [m % 12 + 1, (m + 1) % 12 + 1];
  return p.includes(m) ? "now" : nx.some(x => p.includes(x)) ? "soon" : "off";
}
function matchIdea(q){
  const s = q.toLowerCase().trim(), words = s.split(/\s+/).filter(w => w.length > 2);
  let best = null, bs = 0;
  S.ideas.forEach(i => { const hay = (i.kw + " " + i.name).toLowerCase(); let sc = hay.includes(s) || s.includes(i.kw) ? 10 : 0; words.forEach(w => { if (hay.includes(w)) sc++ }); if (sc > bs){ bs = sc; best = i } });
  return bs >= 2 ? best : null;
}

/* ---------- header ---------- */
const NAV = [["trending","flame"],["analyze","search"],["ideas","bulb"],["season","cal"],["pricing","card"],["saved","bookmark"]];
function head(){
  const r = route().name;
  $("#nav").innerHTML = NAV.map(n => `<a href="/${n[0]}" class="${r === n[0] ? "on" : ""}">${t(n[0])}</a>`).join("");
  $("#mnav").innerHTML = [["", "home", "Home"]].concat(NAV.filter(n => n[0] !== "pricing").map(n => [n[0], n[1], t(n[0])])).map(n => `<a href="/${n[0]}" class="${r === (n[0] || "home") ? "on" : ""}">${icon(n[1], 20)}<br>${esc(n[2])}</a>`).join("");
  $("#cur").innerHTML = CURS.map(c => `<option ${c === S.cur ? "selected" : ""}>${c}</option>`).join("");
  $$("#lang button").forEach(b => b.classList.toggle("on", b.dataset.l === S.lang));
  document.documentElement.lang = S.lang;
  $("#acct").innerHTML = S.me ? `<span class="tag ${S.me.plan === "free" ? "" : "y"}">${esc(S.plans.plans[S.me.plan].name)}</span> <button class="btn sm w" id="lo">${t("logout")}</button>`
    : `<button class="btn sm w" id="li">${t("login")}</button> <button class="btn sm g" id="su">${t("start")}</button>`;
  if ($("#lo")) $("#lo").onclick = async () => { await api("/api/logout", {method:"POST"}); await loadMe(); render() };
  if ($("#li")) $("#li").onclick = () => auth("login");
  if ($("#su")) $("#su").onclick = () => auth("signup");
}
$("#cur").onchange = e => { S.cur = e.target.value; ls.set("cur", S.cur); render() };
$$("#lang button").forEach(b => b.onclick = () => { S.lang = b.dataset.l; ls.set("lang", S.lang); head(); render() });

/* ---------- auth modal ---------- */
function auth(mode, why){
  const sign = mode === "signup";
  $("#modal").innerHTML = `<div class="modal" id="mb"><form class="card" id="af">
    <div class="row" style="justify-content:space-between"><h2 style="font-size:26px">${sign ? "Create your free account" : "Welcome back"}</h2><button type="button" class="btn sm w" id="mx" aria-label="Close">✕</button></div>
    ${why ? `<p class="mut" style="margin:8px 0 0">${esc(why)}</p>` : ""}
    <div class="grid" style="gap:12px;margin-top:16px">
      ${sign ? `<label class="field">Name<input name="name" autocomplete="name"></label>` : ""}
      <label class="field">Email<input name="email" type="email" required autocomplete="email"></label>
      <label class="field">Password<input name="password" type="password" required minlength="8" autocomplete="${sign ? "new-password" : "current-password"}"></label>
      <p class="mut hide" id="ae" style="color:#c0261b;margin:0;font-weight:600"></p>
      <button class="btn g" type="submit">${sign ? "Create free account" : "Log in"}</button>
      <p class="mut" style="margin:0">${sign ? "Already have an account?" : "New here?"} <a href="#" id="sw">${sign ? "Log in" : "Create a free account"}</a></p>
    </div></form></div>`;
  const close = () => $("#modal").innerHTML = "";
  $("#mx").onclick = close; $("#mb").onclick = e => { if (e.target.id === "mb") close() };
  $("#sw").onclick = e => { e.preventDefault(); auth(sign ? "login" : "signup", why) };
  $("#af").onsubmit = async e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    try { await api(sign ? "/api/signup" : "/api/login", {method:"POST", body: JSON.stringify(f)}); close(); await loadMe(); await loadIdeas(); toast(sign ? "Account created. You now get 5 checks a day." : "Logged in."); render() }
    catch(err){ $("#ae").textContent = err.message; $("#ae").classList.remove("hide") } };
  setTimeout(() => { const i = $("#af input"); i && i.focus() }, 30);
}
function upgrade(msg){
  $("#modal").innerHTML = `<div class="modal" id="mb"><div class="card"><h2 style="font-size:26px">Keep going</h2><p>${esc(msg)}</p>
    <div class="row"><a class="btn g" href="/pricing" id="ug">See plans</a>${S.me ? "" : `<button class="btn w" id="ua">Create free account</button>`}<button class="btn w" id="mx">Later</button></div></div></div>`;
  const close = () => $("#modal").innerHTML = "";
  $("#mx").onclick = close; $("#ug").onclick = close; if ($("#ua")) $("#ua").onclick = () => auth("signup");
}

/* ---------- router ---------- */
/* Clean URLs with the History API: /research?q=moon%20lamp, /dashboard, /admin …
   Keep ROUTES in sync with the route list in apps/web/nginx/default.conf.template (unknown paths get HTTP 404). */
const ROUTES = ["home", "trending", "analyze", "ideas", "season", "pricing", "saved", "dashboard", "admin", "report", "finder",
                "setup", "login", "research", "projects", "ask", "adminlogin", "apikeys"];
const TITLES = {home: "Find products that sell", trending: "Trending products", analyze: "Analyze a product", ideas: "Product ideas", season: "Season calendar",
                pricing: "Pricing", saved: "Shortlist", dashboard: "Dashboard", admin: "Admin", report: "Report", finder: "Product Finder", setup: "Data setup",
                login: "Log in", research: "Deep research", projects: "Projects", ask: "Ask AI", adminlogin: "Admin log in", apikeys: "API keys", notfound: "Page not found"};
function route(){
  const p = location.pathname.replace(/^\/+|\/+$/g, "");
  const name = p === "" || p === "index.html" ? "home" : ROUTES.includes(p) ? p : "notfound";
  return {name, path: p, q: new URLSearchParams(location.search)};
}
let _lastLoc = location.pathname + location.search;
/* go("/research?q=x") navigates without a page load. Accepts legacy "#/x" too. */
function go(to, opt){
  to = String(to || "/").replace(/^#\/?/, "/");
  if (!to.startsWith("/") || to.startsWith("//")) to = "/" + to.replace(/^\/+/, "");
  const cur = location.pathname + location.search + location.hash;
  if (to !== cur) history[(opt && opt.replace) ? "replaceState" : "pushState"](null, "", to);
  _lastLoc = location.pathname + location.search;
  render();
  if (location.hash.length > 1){ const t = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (t) { t.scrollIntoView(); return } }
  scrollTo(0, 0);
}
window.addEventListener("popstate", () => {
  const now = location.pathname + location.search;
  if (now === _lastLoc) return;            // only the #fragment changed (in-page anchor): don't re-render
  _lastLoc = now; render();
});
/* Same-origin <a href="/..."> clicks are handled by the router; new tabs, downloads, external and #anchor links behave normally. */
document.addEventListener("click", e => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest && e.target.closest("a[href]");
  if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
  const href = a.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(href)) return;
  const u = new URL(href, location.href);
  if (u.origin !== location.origin) return;
  e.preventDefault();
  const same = u.pathname + u.search === location.pathname + location.search;
  if (same && u.hash) { history.pushState(null, "", u.hash); const t = document.getElementById(decodeURIComponent(u.hash.slice(1))); if (t) t.scrollIntoView(); return }
  go(u.pathname + u.search + u.hash);
});
function render(){
  head(); const r = route();
  document.title = r.name === "home" ? "Product Radar: find products that sell" : (TITLES[r.name] || "Product Radar") + " | Product Radar";
  (VIEWS[r.name] || VIEWS.notfound)(r);
}

/* ---------- shared bits ---------- */
function searchBox(q, big){
  return `<form class="search" id="sf" ${big ? "" : 'style="max-width:none"'}><input id="sq" placeholder="Any product: moon lamp, hot water tap, neck fan..." value="${esc(q || "")}" aria-label="Product">
    <select id="sc" aria-label="Country">${COUNTRIES.map(c => `<option value="${c[0]}" ${c[0] === S.country ? "selected" : ""}>${c[1]}</option>`).join("")}</select>
    <button class="btn g" type="submit">${t("check")} →</button></form>`;
}
function bindSearch(){ const f = $("#sf"); if (!f) return; f.onsubmit = e => { e.preventDefault(); const q = $("#sq").value.trim(); S.country = $("#sc").value; ls.set("country", S.country); if (q) go("/research?q=" + encodeURIComponent(q)) } }
function ideaCard(i, compact){
  const [em, bg] = catIcon(i.cat), st = seasonState(i);
  return `<article class="card idea"><div class="top"><span class="ic" style="background:${bg}">${em}</span><div><h3>${esc(S.lang === "bn" ? i.bn : i.name)}</h3><span class="mut">${esc(i.cat)}</span></div></div>
    <div class="row" style="gap:6px">${st === "now" ? `<span class="tag g">In season now</span>` : st === "soon" ? `<span class="tag y">Season starts soon</span>` : `<span class="tag">Off season</span>`}
      <span class="tag b">Budget: ${esc(i.budget)}</span>${i.dropship ? `<span class="tag p">Dropship OK</span>` : ""}${i.fragile ? `<span class="tag r">Fragile</span>` : ""}</div>
    <p class="why" style="margin:0"><b>Why they buy:</b> ${esc(i.why)}</p>
    ${compact ? "" : `<p class="hook" style="margin:0">“${esc(i.hook)}”</p><p class="mut" style="margin:0"><b>Sell with:</b> ${esc(i.cross)} · <b>Watch out:</b> ${esc(i.risk)}</p>`}
    <div class="act"><a class="btn sm" href="/research?q=${encodeURIComponent(i.kw)}">Check live data →</a>${S.me ? `<button class="btn sm w" data-save="${esc(i.name)}">${icon("bookmark", 16)} Save</button>` : ""}</div></article>`;
}
function bindSave(){ $$("[data-save]").forEach(b => b.onclick = () => saveItem(b.dataset.save)) }
async function saveItem(name){
  if (!S.me) return auth("signup", "Create a free account to save products to your shortlist.");
  try { await api("/api/saved", {method:"POST", body: JSON.stringify({item: name})}); toast("Saved to your shortlist.") }
  catch(e){ e.code === 402 ? upgrade(e.message) : toast(e.message) }
}
async function loadIdeas(){ try { const j = await api("/api/ideas?country=" + S.country + "&month=" + (new Date().getMonth() + 1)); S.ideas = j.ideas; S.ideasNote = j.note; S.locked = j.locked; S.ideasTotal = j.total } catch(e){} }

/* ---------- HOME (landing, funnel) ---------- */
function home(){
  const soon = S.ideas.filter(i => seasonState(i) !== "off").sort((a, b) => (seasonState(a) === "soon") - (seasonState(b) === "soon")).slice(0, 4);
  const p = S.plans ? S.plans.prices : {};
  $("#app").innerHTML = `
  <section class="hero"><div class="wrap">
    <div>
      <span class="tag y" style="font-size:13px">For new sellers, dropshippers and online shops · Worldwide</span>
      <h1 style="margin-top:16px">${t("h1a")} <span class="hl">${t("h1b")}</span></h1>
      <p class="lead">${t("lead")}</p>
      ${searchBox("", true)}
      <div class="row try"><span class="mut"><b>${t("try")}</b></span>${["moon lamp","instant water heater tap","neck fan","led strip lights"].map(x => `<a class="chip" href="/research?q=${encodeURIComponent(x)}">${x}</a>`).join("")}</div>
      ${S.me ? "" : `<p class="mut" style="margin-top:12px">${icon("check", 16)} ${t("noSignup")}</p>`}
    </div>
    <div class="card season-card" style="position:relative">
      <span class="sticker">${mon()[new Date().getMonth()]}</span>
      <h3>${t("inSeason")}</h3><p class="mut" style="margin:4px 0 10px">${S.country === "WW" ? "Northern hemisphere" : esc((COUNTRIES.find(c => c[0] === S.country) || [0, ""])[1])} · from our idea guide</p>
      ${soon.map(i => { const [em, bg] = catIcon(i.cat), st = seasonState(i); return `<a class="it" style="text-decoration:none" href="/research?q=${encodeURIComponent(i.kw)}"><span class="ic" style="background:${bg}">${em}</span><div style="flex:1"><b>${esc(S.lang === "bn" ? i.bn : i.name)}</b><div class="mut">${esc(i.why)}</div></div><span class="tag ${st === "now" ? "g" : "y"}">${st === "now" ? "Now" : "Soon"}</span></a>` }).join("") || `<p class="mut">Loading ideas…</p>`}
      <a class="btn w sm" style="margin-top:10px;width:100%" href="/season">See the full season calendar</a>
    </div>
  </div></section>

  <div class="ticker" aria-hidden="true"><div>${Array(2).fill(["Google Trends","Google Shopping prices","AliExpress supplier cost","Daraz (Bangladesh)","YouTube reviews","Profit calculator","Season calendar","Dropshipping ideas","Ad hooks","11 currencies"].map(x => `<span>★ ${x}</span>`).join("")).join("")}</div></div>

  <section class="sec" style="padding-bottom:20px"><div class="wrap"><div class="row" style="justify-content:space-between;align-items:end;margin-bottom:22px"><div class="sec-h" style="margin:0"><h2>Trending right now</h2><p>Products people are searching for more and more. Real listings with photo and price under each one.</p></div><a class="btn k" href="/trending">See all trending →</a></div><div id="hometrend"><div class="card"><div class="skel"></div><div class="skel" style="width:60%"></div></div></div></div></section>

  <section class="sec pain"><div class="wrap">
    <div class="sec-h"><h2>${t("painT")}</h2><p>${t("painP")}</p></div>
    <div class="grid g3">
      <div class="card"><span class="ic" style="background:rgba(255,85,119,.16)">${icon("box", 22)}</span><h3>Dead stock in your room</h3><p class="mut" style="margin:0">The product had no demand this season. Your cash is now cardboard.</p></div>
      <div class="card"><span class="ic" style="background:var(--yellow)">${icon("down", 22)}</span><h3>Ads that bring no orders</h3><p class="mut" style="margin:0">You boosted posts for a product people were not searching for.</p></div>
      <div class="card"><span class="ic" style="background:rgba(143,123,255,.2)">${icon("tag", 22)}</span><h3>Someone sells it cheaper</h3><p class="mut" style="margin:0">You found out the market price after you bought at the wrong cost.</p></div>
    </div>
    <div class="card coi">
      <div><h3 style="font-size:24px">${t("coiT")}</h3><p style="margin:8px 0 14px">Type what you plan to spend. This is the money at risk if the product does not sell.</p>
        <div class="grid g3" style="gap:10px"><label class="field">Stock<input id="c1" type="number" min="0" value="${Math.round(fromUSD(400))}"></label><label class="field">Ads<input id="c2" type="number" min="0" value="${Math.round(fromUSD(100))}"></label><label class="field">Your hours<input id="c3" type="number" min="0" value="60"></label></div></div>
      <div style="text-align:center"><div class="mut" >Money at risk (${esc(S.cur)})</div><div class="big" id="co"></div><p style="margin:10px 0 0" id="co2"></p></div>
    </div>
  </div></section>

  <section class="sec" style="background:var(--white);border-top:var(--b);border-bottom:var(--b)"><div class="wrap">
    <div class="sec-h"><h2>${t("stepsT")}</h2><p>${t("stepsP")}</p></div>
    <div class="grid g3" style="gap:34px 20px">
      <div class="card step"><b class="n">1</b><h3>Search any product</h3><p class="mut" style="margin:6px 0 0">Any category, any country. Electronics, home, beauty, gifts, seasonal items.</p></div>
      <div class="card step"><b class="n">2</b><h3>See the live evidence</h3><p class="mut" style="margin:6px 0 0">Google search trend, marketplace prices, supplier cost and orders, review videos. On one page, without leaving.</p></div>
      <div class="card step"><b class="n">3</b><h3>Get Go, Test or Skip</h3><p class="mut" style="margin:6px 0 0">A clear verdict, your profit per order, the buyer's reason to buy and a ready ad hook.</p></div>
    </div>
  </div></section>

  <section class="sec"><div class="wrap">
    <div class="sec-h"><h2>${t("baT")}</h2></div>
    <div class="ba"><div><h3>Without Product Radar</h3><ul><li>“My friend sells it, so I will too.”</li><li>Buy 200 pieces, hope for the best.</li><li>Find the real price after you buy.</li><li>Miss the season by a month.</li></ul></div>
      <div><h3>With Product Radar</h3><ul><li>See if people are searching for it right now.</li><li>Know the market price and your margin first.</li><li>Order before the season, not after.</li><li>Start with a small test, scale what works.</li></ul></div></div>
  </div></section>

  <section class="sec" style="padding-top:0"><div class="wrap">
    <div class="sec-h"><h2>${t("ideasT")}</h2><p>${t("ideasP")}</p></div>
    <div class="grid g3">${(l => l.slice(0, l.length >= 6 ? 6 : 3))(S.ideas.filter(i => seasonState(i) !== "off").concat(S.ideas.filter(i => seasonState(i) === "off"))).map(i => ideaCard(i, true)).join("")}</div>
    <div style="margin-top:24px"><a class="btn" href="/ideas">Browse all ideas →</a></div>
  </div></section>

  <section class="sec" style="background:var(--white);border-top:var(--b);border-bottom:var(--b)"><div class="wrap">
    <div class="sec-h"><h2>${t("priceT")}</h2><p>${t("priceP")}</p></div>${plansHTML()}
  </div></section>

  <section class="sec faq"><div class="wrap" style="max-width:820px">
    <div class="sec-h"><h2>${t("faqT")}</h2></div>${FAQ.map(f => `<details><summary>${esc(f[0])}</summary><p>${esc(f[1])}</p></details>`).join("")}
  </div></section>

  <section class="sec cta" style="border-top:var(--b)"><div class="wrap"><h2>${t("ctaT")}</h2><p style="font-size:18px;margin:12px 0 24px">Free to start. No card needed.</p><a class="btn" href="/analyze">${t("ctaB")} →</a></div></section>`;
  bindSearch(); bindPlans(); loadTrend(S.country).then(d => { const el = $("#hometrend"); if (el && d) el.innerHTML = d.rows.length ? d.rows.slice(0, 3).map((r, i) => trendRow(r, i, d)).join("") : `<div class="card empty">${esc(d.note || "Trending data is being collected.")}</div>` }).catch(() => { const el = $("#hometrend"); if (el) el.innerHTML = "" });
  const coi = () => { const a = +$("#c1").value || 0, b = +$("#c2").value || 0, h = +$("#c3").value || 0; $("#co").textContent = money(a + b, S.cur, {int: 1}); $("#co2").textContent = `plus ${h} hours of your time. A 30-second check costs nothing.` };
  ["#c1","#c2","#c3"].forEach(s => $(s).oninput = coi); coi();
}
const FAQ = [
  ["Is the data real?", "Yes. Trends come from Google, prices from live marketplace listings (eBay, Daraz) and supplier costs and order counts from AliExpress. Every block shows its source and says clearly when a source is not available. The idea guide and season calendar are our own editorial guide, and they are labelled that way."],
  ["Will this guarantee my product sells?", "No tool can promise sales. Product Radar lowers your risk: you see demand, price and margin before you buy, and we tell you to start with a small test."],
  ["Do I need technical skills?", "No. Type a product name, pick your country and read the verdict. Everything else is optional."],
  ["Does it work outside Bangladesh?", "Yes. Pick any country and any of 11 currencies. Some sources are country-specific, for example Daraz is shown for Bangladesh."],
  ["Is it good for dropshipping?", "Yes. Ideas are marked ‘Dropship OK’ when they are light and not fragile, and the analysis shows supplier cost and order volume next to the selling price."],
  ["Can I cancel?", "Yes, any time. You keep your plan until the end of the period you paid for."]];

/* ---------- PRICING ---------- */
function planPrice(k){
  const p = S.plans.prices[k]; if (!p) return "";
  if (!p.USD) return S.cur === "BDT" ? "৳0" : money(0, "USD", {int: 1});
  return S.cur === "BDT" ? "৳" + p.BDT.toLocaleString("en-IN") : (S.cur === "USD" ? "$" + p.USD : "≈ " + money(p.USD, "USD"));
}
function plansHTML(){
  if (!S.plans) return "";
  const L = S.plans.plans, cur = S.me ? S.me.plan : null, offer = S.plans.launch_offer;
  const box = (k, best, feats, cta) => `<div class="card plan ${best ? "best" : ""}">${best ? `<span class="sticker">Best for new sellers</span>` : ""}
    <h3 style="font-size:22px">${esc(L[k].name)}</h3><div><span class="p">${planPrice(k)}</span>${S.plans.prices[k].USD ? `<span class="mut"> / month</span>` : ""}</div>
    ${S.plans.prices[k].USD && S.cur !== "USD" && S.cur !== "BDT" ? `<span class="mut">Billed as $${S.plans.prices[k].USD} USD</span>` : ""}
    <ul>${feats.map(f => `<li>${f}</li>`).join("")}</ul>
    ${cur === k ? `<span class="btn w" style="cursor:default">Your plan</span>` : `<button class="btn ${best ? "k" : k === "free" ? "w" : "g"}" data-plan="${k}">${cta}</button>`}</div>`;
  return `${offer && offer.on ? `<div class="card" style="background:var(--red);color:#fff;margin-bottom:22px;box-shadow:var(--sh-sm)"><b>${esc(offer.text)}</b> · ends ${esc(offer.ends)}</div>` : ""}
  <div class="grid g3" style="align-items:stretch">
    ${box("free", false, [`${L.free.searches_per_day} product checks a day`, `${L.free.ideas} product ideas`, `Shortlist up to ${L.free.saved} products`, "Full analysis: trend, prices, supplier cost", "Profit calculator and ad copy"], S.me ? "Current" : "Start free")}
    ${box("pro", true, [`${L.pro.searches_per_day} product checks a day`, `All ${S.ideasTotal || 40}+ product ideas`, "Full season calendar", `Shortlist up to ${L.pro.saved} products`, "Everything in Free"], "Get Pro")}
    ${box("business", false, [`${L.business.searches_per_day} product checks a day`, `Shortlist up to ${L.business.saved} products`, "Priority email support", "For agencies and teams", "Everything in Pro"], "Get Business")}
  </div>`;
}
function bindPlans(){ $$("[data-plan]").forEach(b => b.onclick = async () => {
  const k = b.dataset.plan;
  if (k === "free") return S.me ? null : auth("signup");
  if (!S.me) return auth("signup", "Create your free account first, then upgrade in one click.");
  try { const j = await api(`/api/checkout?plan=${k}&currency=${S.cur === "BDT" ? "BDT" : "USD"}`); location.href = j.url }
  catch(e){ toast(e.message + (e.body && e.body.contact ? " " + e.body.contact : "")) }
}) }
function pricing(){
  $("#app").innerHTML = `<section class="sec"><div class="wrap"><div class="sec-h"><h2>${t("priceT")}</h2><p>${t("priceP")}</p></div>${plansHTML()}
    <div class="grid g3" style="margin-top:34px">
      <div class="card"><h3 class="row" style="gap:8px">${icon("wallet")} Pays for itself</h3><p class="mut" style="margin:6px 0 0">Avoiding one box of dead stock saves more than a year of Pro.</p></div>
      <div class="card"><h3 class="row" style="gap:8px">${icon("lock")} Secure payment</h3><p class="mut" style="margin:6px 0 0">Payments are handled by the payment provider. We never see your card.</p></div>
      <div class="card"><h3 class="row" style="gap:8px">${icon("undo")} Cancel any time</h3><p class="mut" style="margin:6px 0 0">No contract. Your plan runs to the end of the paid month.</p></div>
    </div></div></section>
    <section class="sec faq" style="padding-top:0"><div class="wrap" style="max-width:820px">${FAQ.map(f => `<details><summary>${esc(f[0])}</summary><p>${esc(f[1])}</p></details>`).join("")}</div></section>`;
  bindPlans();
}

/* ---------- ANALYZE ---------- */
function trendsURL(type, q, geo){
  const g = geo === "WW" ? "" : geo, req = {comparisonItem:[{keyword:q, geo:g, time:"today 12-m"}], category:0, property:""};
  const eq = `q=${encodeURIComponent(q)}&date=today 12-m` + (g ? `&geo=${g}` : "");
  return `https://trends.google.com/trends/embed/explore/${type}?req=${encodeURIComponent(JSON.stringify(req))}&tz=-360&eq=${encodeURIComponent(eq)}`;
}
async function analyzeView(r){
  const q = (r.q.get("q") || "").trim();
  $("#app").innerHTML = `<section class="sec" style="padding-top:34px"><div class="wrap">
    <h2 style="margin-bottom:16px">${t("analyze")} ${q ? "" : "any product"}</h2>${searchBox(q)}
    <p class="mut" id="left" style="margin-top:10px">${S.limits ? `${Math.max(0, S.limits.searches_per_day - S.used)} of ${S.limits.searches_per_day} checks left today` : ""}${S.me ? "" : ` · <a href="#" id="mk">Create a free account</a> for more`}</p>
    <div id="res" style="margin-top:26px"></div></div></section>`;
  bindSearch(); if ($("#mk")) $("#mk").onclick = e => { e.preventDefault(); auth("signup") };
  if (!q){ $("#res").innerHTML = `<div class="card empty"><div>${icon("search", 44)}</div><h3>Type any product above</h3><p class="mut">Or start from an idea that is heading into season.</p><a class="btn" href="/ideas">Browse ideas</a></div>`; return }
  $("#res").innerHTML = `<div class="card"><div class="skel" style="width:40%"></div><div class="skel"></div><div class="skel" style="width:70%"></div><p class="mut">Checking Google Trends, marketplaces and suppliers…</p></div>`;
  let d;
  try { d = await api(`/api/analyze?q=${encodeURIComponent(q)}&country=${S.country}`); S.used++; if (S.limits && $("#left")) $("#left").firstChild.textContent = `${Math.max(0, S.limits.searches_per_day - S.used)} of ${S.limits.searches_per_day} checks left today` + (S.me ? "" : " · ") }
  catch(e){
    if (e.code === 402) { $("#res").innerHTML = `<div class="card empty"><h3>Daily limit reached</h3><p>${esc(e.body.message)}</p><a class="btn g" href="/pricing">See plans</a></div>`; return upgrade(e.body.message) }
    $("#res").innerHTML = `<div class="card empty"><h3>Could not check this product</h3><p class="mut">${esc(e.message)}</p></div>`; return }
  S.last = d; drawResult(d);
}
const GRADE = {A: ["Observed", "g"], B: ["Calculated", "b"], C: ["Estimate", "y"], D: ["AI hypothesis", "p"]};
const gtag = g => g ? `<span class="tag ${GRADE[g][1]} gr" title="${GRADE[g][0]}">${g} · ${GRADE[g][0]}</span>` : `<span class="tag">No data</span>`;
function drawResult(d){
  const A = d.assessment, idea = A.idea, score = A.opportunity;
  const vcol = {"Go": "var(--green)", "Test small": "var(--yellow)", "Skip for now": "var(--red)"}[A.verdict] || "var(--cell)";
  const ccol = {"High": "g", "Medium": "y", "Low": "r"}[A.confidence_label];
  const mp = d.market_price, sp = d.supplier_price, geo = d.country;
  const listing = (i, k) => `<a class="pc" href="${esc(i.url || "#")}" target="_blank" rel="noopener noreferrer"><div class="im">${i.image ? `<img loading="lazy" referrerpolicy="no-referrer" src="${esc(i.image)}" alt="" data-fb="noimg">` : noImg}</div>
    <div class="tx"><b>${esc(i.name)}</b><span class="pr">${money(i.price, i.cur)}</span>${i.orders ? `<span class="mut">${(+i.orders).toLocaleString()} ${k === "ali" ? "orders" : "sold"}</span>` : ""}${i.rating ? `<span class="mut">★ ${esc(i.rating)}</span>` : ""}</div></a>`;
  const tabs = [["daraz","Daraz"],["shop","Google Shopping"],["ali","AliExpress supplier"],["ebay","eBay (display only)"]].filter(x => d[x[0]] && d[x[0]].ok && d[x[0]].items.length);
  const why = idea ? idea.why : `Write the main problem your buyer has without the ${d.q}.`;
  const hook = idea ? idea.hook : `The easiest way to [benefit] with ${d.q}.`;
  const copy = `${hook}\n\nP: ${why}\nA: Every day without a fix costs comfort, time or money. [Add one real situation your buyer knows.]\nS: Meet the ${d.q}. [Main benefit in one line.]\nT: [Show the after: what changes in their day.] Show a real customer video or photo when you have one.\nA: Order now: [your offer, e.g. free delivery this week]. [Your payment options.]${idea ? `\n\nAdd-on to raise order value: ${idea.cross}` : ""}`;
  $("#res").innerHTML = `
  <div class="grid g2 top-row main-split">
    <div class="card"><div class="verdict"><div class="score" style="background:${vcol}">${score == null ? "<b>?</b>" : `<div><b>${score}</b>Opportunity</div>`}</div>
      <div><div class="mut">Verdict for “${esc(d.q)}” · ${esc((COUNTRIES.find(c => c[0] === geo) || [0, geo])[1])}</div><div class="vword">${esc(A.verdict)}</div>
      <div class="row" style="margin-top:8px"><span class="tag ${ccol}">Evidence confidence: ${esc(A.confidence_label)} (${A.confidence}%)</span><span class="mut">${A.signals_used} of 5 signals with real data</span></div>
      <p style="margin:8px 0 0">${esc(A.verdict_why)}</p>
      <div class="row" style="margin-top:12px"><button class="btn sm" id="sv">${icon("bookmark", 16)} Save to shortlist</button><a class="btn sm w" href="#pc">Profit calculator</a></div></div></div>
      <div style="margin-top:18px">${A.signals.map(s => `<div class="sig ${s.score == null ? "na" : ""}"><span>${esc(s.name)}</span><u><i style="width:${s.score || 0}%;background:${s.score >= 70 ? "var(--green)" : s.score >= 50 ? "var(--yellow)" : "var(--red)"}"></i></u><span>${s.score == null ? "–" : s.score}</span></div><div class="mut sigx">${gtag(s.grade)} ${esc(s.note)}${s.source ? ` · ${esc(s.source)}` : ""}</div>`).join("")}
      <details class="help"><summary>What do A, B, C and D mean?</summary><p><b>A Observed:</b> seen on a dated source. <b>B Calculated:</b> worked out from inputs with a formula. <b>C Estimate:</b> based on assumptions or our guide. <b>D AI hypothesis:</b> an idea that needs testing. Opportunity says how good it looks; evidence confidence says how much real data stands behind it.</p></details></div></div>
    <div class="card devil"><h3 class="row" style="gap:8px">${icon("alert")} Devil's Advocate</h3><p class="mut" style="margin:4px 0 10px">The strongest reasons this could fail.</p>
      <ul class="dl">${A.devil.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
      ${A.unknowns.length ? `<h3 style="margin-top:14px;font-size:15px">Still unknown</h3><ul class="dl">${A.unknowns.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}</div>
  </div>

  <div class="grid g2" style="margin-top:20px">
    <div class="card"><h3>What to do next</h3><p class="mut" style="margin:4px 0 10px">Ranked by impact. Tick as you go.</p>${A.next_actions.map((x, i) => `<label class="todo"><input type="checkbox"> <span>${i + 1}. ${esc(x)}</span></label>`).join("")}</div>
    <div class="card" style="background:var(--mint)"><h3>Who buys it and why</h3>
      <p style="margin:10px 0"><b>Their why:</b> ${esc(why)} ${idea ? gtag("C") : gtag("D")}</p>
      ${idea ? `<p style="margin:0 0 10px"><b>When:</b> peaks in ${peaks(idea, geo).map(m => mon()[m - 1]).join(", ")}</p><p style="margin:0 0 10px"><b>Sell with:</b> ${esc(idea.cross)}</p><p style="margin:0"><b>Watch out:</b> ${esc(idea.risk)}</p>` :
        `<p class="mut">Not in our idea guide yet. Answer these before you buy:</p><ul style="margin:0;padding-left:20px"><li>What pain does it remove?</li><li>What event makes them buy now?</li><li>What stops them (price, trust, quality)?</li><li>Where do they hang out online?</li></ul>`}
    </div>
  </div>

  <div class="grid g2" style="margin-top:20px">
    <div class="card"><div class="row" style="justify-content:space-between"><h3>Search interest, last 12 months</h3><span class="tag">Live from Google</span></div>
      <div class="embed" style="margin-top:12px"><iframe loading="lazy" title="Google Trends interest over time" src="${trendsURL("TIMESERIES", d.q, geo)}"></iframe></div>${d.trends && d.trends.ok ? `<p class="mut" style="margin:8px 0 0">Average interest in the last 4 weeks: <b>${Math.round(avg(d.trends.series.slice(-4).map(x => x.v)))}</b> out of 100.</p>` : ""}</div>
    <div class="card"><div class="row" style="justify-content:space-between"><h3>What people search with it</h3><span class="tag">Live from Google</span></div>
      ${d.trends && d.trends.ok && d.trends.rising.length ? `<div style="margin-top:12px">${d.trends.rising.slice(0, 8).map(x => `<div class="row" style="justify-content:space-between;border-top:2px dashed var(--line);padding:7px 0"><a href="/research?q=${encodeURIComponent(x.q)}" style="font-weight:600">${esc(x.q)}</a><span class="tag ${/breakout/i.test(x.v) ? "r" : "y"}">${esc(x.v)}</span></div>`).join("")}</div>`
        : `<div class="embed" style="margin-top:12px"><iframe loading="lazy" title="Google Trends related queries" src="${trendsURL("RELATED_QUERIES", d.q, geo)}"></iframe></div>`}</div>
  </div>

  <div class="grid g2" style="margin-top:20px">
    <div class="card"><h3>Market selling price</h3><p class="mut" style="margin:4px 0 12px">${mp ? `${gtag("A")} ${mp.n} live listings · ${esc(mp.source)} · checked ${ago(d.checked)}` : "No market price yet: Daraz for Bangladesh, Google Shopping elsewhere (needs SERPAPI_KEY)."}</p>
      ${mp ? `<div class="price3"><div><span class="mut">Low</span><b>${money(mp.low, mp.cur)}</b></div><div><span class="mut">Typical</span><b>${money(mp.median, mp.cur)}</b></div><div><span class="mut">High</span><b>${money(mp.high, mp.cur)}</b></div></div>` : ""}</div>
    <div class="card"><h3>Supplier cost (dropshipping / sourcing)</h3><p class="mut" style="margin:4px 0 12px">${sp ? `${gtag("A")} ${sp.n} supplier listings · AliExpress · checked ${ago(d.checked)}` : "Connect AliExpress to see supplier prices"}</p>
      ${sp ? `<div class="price3"><div><span class="mut">Low</span><b>${money(sp.low, sp.cur)}</b></div><div><span class="mut">Typical</span><b>${money(sp.median, sp.cur)}</b></div><div><span class="mut">High</span><b>${money(sp.high, sp.cur)}</b></div></div>` : ""}</div>
  </div>

  ${tabs.length ? `<div class="card" style="margin-top:20px"><div class="row" style="justify-content:space-between"><h3>Live listings</h3><span class="mut">Sorted by popularity</span></div>
    <div class="tabs" style="margin-top:12px">${tabs.map((x, i) => `<button data-tab="${x[0]}" class="${i ? "" : "on"}">${x[1]}</button>`).join("")}</div><div class="list" id="ls"></div></div>` : ""}

  <div class="card" style="margin-top:20px" id="pc"><h3>Profit per order</h3><p class="mut" style="margin:4px 0 14px">${gtag("B")} Filled from live prices where we have them. Shipping (25% of cost), delivery and ad cost start as estimates. Change any number. Amounts in ${esc(S.cur)}.</p>
    <div class="calc">${[["sell","Selling price", mp ? Math.round(fromUSD(toUSD(mp.median, mp.cur) || 0)) : ""],["cost","Product cost", sp ? Math.round(fromUSD(toUSD(sp.median, sp.cur) || 0)) : ""],["ship","Shipping to you, per unit", sp ? Math.round(fromUSD((toUSD(sp.median, sp.cur) || 0) * .25)) : ""],["del","Delivery to customer", Math.round(fromUSD(1.2))],["ad","Ad cost per order", Math.round(fromUSD(1.5))],["ret","Returns and failed orders %", 8]].map(f => `<label class="field">${f[1]}<input id="p_${f[0]}" type="number" min="0" value="${f[2]}"></label>`).join("")}</div>
    <div class="out" id="po"></div></div>

  <div class="grid g2" style="margin-top:20px">
    <div class="card"><div class="row" style="justify-content:space-between"><h3>Ready ad copy (PASTA)</h3><button class="btn sm w" id="cp">Copy</button></div><p class="mut" style="margin:4px 0 10px">Problem, Agitate, Solution, Transformation, Action. Fill the [brackets] with your own facts.</p><div class="copy" id="cx">${esc(copy)}</div></div>
    <div class="card"><h3>Review videos</h3><p class="mut" style="margin:4px 0 12px">Watch what buyers praise and complain about.</p>
      ${d.youtube && d.youtube.ok && d.youtube.videos.length ? `<div class="vids" style="grid-template-columns:1fr 1fr">${d.youtube.videos.slice(0, 4).map(v => `<div class="vid"><iframe loading="lazy" title="${esc(v.title)}" src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.id)}" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`).join("")}</div>`
        : `<p class="mut">${esc(d.youtube && d.youtube.reason || "Connect YouTube to show videos here.")}</p>`}</div>
  </div>

  <div class="card" style="margin-top:20px;box-shadow:var(--sh-sm)"><h3>Data sources for this check</h3><div class="src" style="margin-top:10px">${Object.values(d.sources).map(s => `<span class="tag ${s.ok ? "g" : ""}" title="${esc(s.reason || "")}">${s.ok ? "✓" : "–"} ${esc(s.source)}</span>`).join("")}<span class="tag g">✓ Google Trends chart</span></div>
    ${Object.values(d.sources).filter(s => !s.ok && s.reason && !/shown for Bangladesh/.test(s.reason)).map(s => `<p class="mut" style="margin:6px 0 0">• ${esc(s.reason)}</p>`).join("")}</div>`;

  const showTab = k => { $$("[data-tab]").forEach(b => b.classList.toggle("on", b.dataset.tab === k)); $("#ls").innerHTML = d[k].items.slice(0, 12).map(i => listing(i, k)).join("") };
  if (tabs.length){ $$("[data-tab]").forEach(b => b.onclick = () => showTab(b.dataset.tab)); showTab(tabs[0][0]) }
  const calc = () => { const g = k => +$("#p_" + k).value || 0, r = clamp(g("ret"), 0, 100) / 100;
    const sell = g("sell"), unit = g("cost") + g("ship"), profit = (1 - r) * (sell - unit) - g("del") - g("ad") - r * g("del");
    const mg = sell ? profit / sell * 100 : 0, maxAd = (1 - r) * (sell - unit) - g("del") - r * g("del");
    $("#po").innerHTML = `<div class="${profit < 0 ? "bad" : ""}"><span class="mut">Profit per order</span><b>${money(profit, S.cur)}</b></div><div class="${mg < 15 ? "bad" : ""}"><span class="mut">Net margin</span><b>${sell ? mg.toFixed(1) + "%" : "–"}</b></div><div><span class="mut">Max ad cost per order</span><b>${money(Math.max(0, maxAd), S.cur)}</b></div>` };
  $$("#pc input").forEach(i => i.oninput = calc); calc();
  $("#sv").onclick = () => saveItem(d.q);
  $("#cp").onclick = () => { navigator.clipboard && navigator.clipboard.writeText(copy).then(() => toast("Copied.")) };
}

/* ---------- IDEAS ---------- */
function ideasView(){
  const f = Object.assign({cat:"", when:"", budget:"", ds:false}, ls.get("ideaf", {}));
  const cats = [...new Set(S.ideas.map(i => i.cat))].sort();
  const draw = () => {
    ls.set("ideaf", f);
    const list = S.ideas.filter(i => (!f.cat || i.cat === f.cat) && (!f.budget || i.budget === f.budget) && (!f.ds || i.dropship) && (!f.when || (f.when === "now" ? seasonState(i) === "now" : seasonState(i) !== "off")));
    $("#il").innerHTML = list.map(i => ideaCard(i)).join("") + (S.locked ? `<div class="card locked"><div><div>${icon("lock", 40)}</div><h3>${S.locked} more ideas</h3><p>Full guide with all seasons and categories.</p><a class="btn k" href="/pricing">Unlock with Pro</a></div></div>` : "") || `<div class="card empty">No ideas match. Clear a filter.</div>`;
    bindSave();
  };
  $("#app").innerHTML = `<section class="sec" style="padding-top:34px"><div class="wrap"><div class="sec-h"><h2>${t("ideasT")}</h2><p>${t("ideasP")}</p></div>
    <div class="filters">
      <select class="sel" id="fc"><option value="">All categories</option>${cats.map(c => `<option ${c === f.cat ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>
      <select class="sel" id="fw"><option value="">Any season</option><option value="now" ${f.when === "now" ? "selected" : ""}>In season now</option><option value="soon" ${f.when === "soon" ? "selected" : ""}>Now or next 2 months</option></select>
      <select class="sel" id="fb"><option value="">Any budget</option>${["Low","Medium","High"].map(b => `<option ${b === f.budget ? "selected" : ""}>${b}</option>`).join("")}</select>
      <label class="chip" style="cursor:pointer"><input type="checkbox" id="fd" ${f.ds ? "checked" : ""}> Dropship OK only</label>
    </div>
    <div class="grid g3" id="il"></div><p class="mut" style="margin-top:20px">${esc(S.ideasNote)}</p></div></section>`;
  $("#fc").onchange = e => { f.cat = e.target.value; draw() }; $("#fw").onchange = e => { f.when = e.target.value; draw() };
  $("#fb").onchange = e => { f.budget = e.target.value; draw() }; $("#fd").onchange = e => { f.ds = e.target.checked; draw() };
  draw();
}

/* ---------- SEASON ---------- */
function seasonView(){
  const m = new Date().getMonth(), c = ls.get("seasonc", "");
  const cats = [...new Set(S.ideas.map(i => i.cat))].sort();
  const draw = cat => { ls.set("seasonc", cat);
    const list = S.ideas.filter(i => !cat || i.cat === cat);
    $("#hm").innerHTML = `<span></span>${mon().map((x, i) => `<span class="h ${i === m ? "now" : ""}">${x}</span>`).join("")}` +
      list.map(i => { const p = peaks(i), [, bg] = catIcon(i.cat); return `<a class="nm" href="/research?q=${encodeURIComponent(i.kw)}" title="${esc(i.name)}"><span class="mini">${catIcon(i.cat)[0]}</span> ${esc(S.lang === "bn" ? i.bn : i.name)}</a>` + MONTHS.map((_, k) => `<i style="background:${p.includes(k + 1) ? bg : "var(--cell)"}"></i>`).join("") }).join("");
  };
  $("#app").innerHTML = `<section class="sec" style="padding-top:34px"><div class="wrap"><div class="sec-h"><h2>Season calendar</h2><p>Coloured months are peak selling months. Order stock 4 to 6 weeks before the colour starts. ${SOUTH.includes(S.country) ? "Weather items are flipped for the southern hemisphere." : ""}</p></div>
    <div class="filters"><select class="sel" id="scat"><option value="">All categories</option>${cats.map(x => `<option ${x === c ? "selected" : ""}>${esc(x)}</option>`).join("")}</select>
    <select class="sel" id="scc">${COUNTRIES.map(x => `<option value="${x[0]}" ${x[0] === S.country ? "selected" : ""}>${x[1]}</option>`).join("")}</select></div>
    <div class="card scroll"><div class="hm" id="hm"></div></div>${S.locked ? `<div class="card row" style="margin-top:18px;background:var(--yellow);justify-content:space-between"><b>Showing ${S.ideas.length} of ${S.ideasTotal} products. The rest of the calendar is in Pro.</b><a class="btn k sm" href="/pricing">Unlock all</a></div>` : ""}<p class="mut" style="margin-top:16px">${esc(S.ideasNote)} Festival dates such as Eid move each year.</p></div></section>`;
  $("#scat").onchange = e => draw(e.target.value);
  $("#scc").onchange = e => { S.country = e.target.value; ls.set("country", S.country); seasonView() };
  draw(c);
}

/* ---------- SHORTLIST ---------- */
async function savedView(){
  if (!S.me){ $("#app").innerHTML = `<section class="sec"><div class="wrap"><div class="card empty"><div>${icon("bookmark", 44)}</div><h3>Your shortlist lives in your account</h3><p class="mut">Save products, move them from idea to scale, and come back any time.</p><button class="btn g" id="sl">Create free account</button></div></div></section>`; $("#sl").onclick = () => auth("signup"); return }
  const COLS = ["Idea","Validate","Test","Scale","Drop"];
  let rows = [];
  try { rows = await api("/api/saved") } catch(e){}
  const draw = () => {
    $("#app").innerHTML = `<section class="sec" style="padding-top:34px"><div class="wrap"><div class="sec-h"><h2>Your shortlist</h2><p>Idea → Validate (check data) → Test (10 units or pre-orders) → Scale. Drop what fails, without guilt.</p></div>
      <form class="row" id="nf" style="margin-bottom:18px"><input id="ni" class="sel" style="flex:1;min-width:200px;background:var(--cell)" placeholder="Add a product name"><button class="btn">Add</button></form>
      <div class="kan">${COLS.map((c, ci) => `<div class="col"><h3>${c}<span class="tag">${rows.filter(r => r.stage === ci).length}</span></h3>${rows.filter(r => r.stage === ci).map(r => `<div class="kc"><a href="/research?q=${encodeURIComponent(r.item)}">${esc(r.item)}</a><div class="row">
        <span>${ci > 0 ? `<button data-mv="${esc(r.item)}|${ci - 1}" aria-label="Move left">←</button>` : ""} ${ci < 4 ? `<button data-mv="${esc(r.item)}|${ci + 1}" aria-label="Move right">→</button>` : ""}</span><button data-del="${esc(r.item)}" aria-label="Delete">✕</button></div></div>`).join("")}</div>`).join("")}</div></div></section>`;
    $("#nf").onsubmit = async e => { e.preventDefault(); const v = $("#ni").value.trim(); if (!v) return; try { await api("/api/saved", {method:"POST", body: JSON.stringify({item: v})}); rows.unshift({item: v, stage: 0}); draw() } catch(err){ err.code === 402 ? upgrade(err.message) : toast(err.message) } };
    $$("[data-mv]").forEach(b => b.onclick = async () => { const [it, st] = b.dataset.mv.split("|"); await api("/api/saved", {method:"POST", body: JSON.stringify({item: it, stage: +st})}); rows.find(r => r.item === it).stage = +st; draw() });
    $$("[data-del]").forEach(b => b.onclick = async () => { await api("/api/saved", {method:"POST", body: JSON.stringify({item: b.dataset.del, delete: true})}); rows = rows.filter(r => r.item !== b.dataset.del); draw() });
  };
  draw();
}

/* ---------- TRENDING ---------- */
const TC = ["#1FB57A", "#EF5A5F", "#0B8A7A", "#F5A524", "#E05BB5"];
function ago(ts){ if (!ts) return "not yet"; const m = Math.round((Date.now() / 1000 - ts) / 60); return m < 60 ? `${Math.max(1, m)} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago` }
async function loadTrend(c){ return api("/api/trending?country=" + encodeURIComponent(c || S.country)) }
function nameOf(r){ return r.idea ? (S.lang === "bn" ? r.idea.bn : r.idea.name) : r.kw.replace(/\b\w/g, x => x.toUpperCase()) }
function momTag(r){
  if (r.mom == null) return `<span class="tag y">Season pick</span>`;
  const p = Math.round((r.mom - 1) * 100);
  return p >= 25 ? `<span class="tag g">▲ ${p}% in 4 weeks</span>` : p >= 5 ? `<span class="tag g">▲ ${p}%</span>` : p > -5 ? `<span class="tag">Steady</span>` : `<span class="tag r">▼ ${Math.abs(p)}%</span>`;
}
function bestPick(r){ const st = r.idea ? seasonState(r.idea) : "off"; return r.mom != null ? r.mom >= 1.2 && r.level >= 20 && st !== "off" : st === "now" }
function spark(v, col){ if (!v || v.length < 2) return ""; const w = 120, h = 36, mx = Math.max(...v, 1); return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline fill="none" stroke="${col}" stroke-width="3" stroke-linejoin="round" points="${v.map((y, i) => (i / (v.length - 1) * (w - 4) + 2).toFixed(1) + "," + (h - 3 - y / mx * (h - 6)).toFixed(1)).join(" ")}"/></svg>` }
function prodCard(p){
  return `<a class="pc" href="${esc(p.url || "#")}" target="_blank" rel="noopener noreferrer" title="${esc(p.name)}"><div class="im"><img loading="lazy" referrerpolicy="no-referrer" src="${esc(p.image)}" alt="${esc(p.name)}" data-fb="rmpc"></div>
    <div class="tx"><b>${esc(p.name)}</b><span class="pr">${money(p.price, p.cur)}</span><span class="mut">${p.orders ? (+p.orders).toLocaleString() + " sold · " : ""}${esc(p.source)}</span></div></a>`;
}
function trendRow(r, i, d){
  const col = TC[i % 5], idea = r.idea, best = i < 3 && bestPick(r);
  return `<article class="card trow" style="margin-bottom:18px">
    <div class="trow-h"><span class="rank" style="background:${col}">${i + 1}</span>
      <div style="flex:1;min-width:0"><h3>${esc(nameOf(r))}</h3><div class="row" style="gap:6px;margin-top:6px">${momTag(r)}${idea ? (s => s === "now" ? `<span class="tag g">In season</span>` : s === "soon" ? `<span class="tag y">Season soon</span>` : "")(seasonState(idea)) : ""}${best ? `<span class="tag p">★ Best to sell now</span>` : ""}${idea && idea.dropship ? `<span class="tag b">Dropship OK</span>` : ""}</div></div>
      <div class="hide-s">${spark(r.series, col)}</div>
      <a class="btn sm" href="/research?q=${encodeURIComponent(r.kw)}">Full check →</a></div>
    ${idea ? `<p style="margin:12px 0 0"><b>Why people buy it:</b> ${esc(idea.why)}</p>` : ""}
    ${r.products.length ? `<div class="list" style="margin-top:14px">${r.products.map(prodCard).join("")}</div><p class="mut" style="margin:8px 0 0">Real listings, checked ${ago(r.products[0].fetched)}. Photo, title and price come from the same listing. Click to see it on the seller's site.</p>`
      : `<p class="mut" style="margin:12px 0 0">No listing with a working photo yet. ${S.sources["eBay"] || S.sources["Daraz"] ? "Try a full check." : "Connect a marketplace source to show products."}</p>`}
  </article>`;
}
function bigChart(rows){
  const sel = rows.filter(r => r.series && r.series.length > 8).slice(0, 5);
  if (!sel.length) return "";
  const sm = innerWidth < 680, W = sm ? 420 : 900, H = sm ? 330 : 300, L = 36, B = 28, n = Math.max(...sel.map(r => r.series.length));
  const X = i => L + i / (n - 1) * (W - L - 10), Y = v => H - B - v / 100 * (H - B - 12);
  const now = new Date(), lab = [0, .25, .5, .75, 1].map(f => { const d = new Date(now); d.setDate(d.getDate() - Math.round((1 - f) * 364)); return [f, mon()[d.getMonth()]] });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Google search interest of the top products, last 12 months">
    ${[0, 50, 100].map(v => `<line x1="${L}" x2="${W - 10}" y1="${Y(v)}" y2="${Y(v)}" stroke="#ddd" stroke-width="2" ${v ? 'stroke-dasharray="6 6"' : ""}/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end" font-size="12" font-weight="600">${v}</text>`).join("")}
    ${lab.map(([f, m]) => `<text x="${L + f * (W - L - 10)}" y="${H - 6}" text-anchor="middle" font-size="12" font-weight="600">${m}</text>`).join("")}
    ${sel.map((r, i) => `<polyline fill="none" stroke="${TC[i]}" stroke-width="${i ? 3 : 4.5}" stroke-linejoin="round" stroke-linecap="round" points="${r.series.map((v, k) => X(k).toFixed(1) + "," + Y(v).toFixed(1)).join(" ")}"/><circle cx="${X(r.series.length - 1)}" cy="${Y(r.series[r.series.length - 1])}" r="6" fill="${TC[i]}" stroke="#111" stroke-width="2.5"/>`).join("")}
  </svg><div class="leg">${sel.map((r, i) => `<span class="lg"><i style="background:${TC[i]}"></i>${esc(nameOf(r))}</span>`).join("")}</div>`;
}
async function trendingView(r){
  const c = r.q.get("c") || S.country;
  $("#app").innerHTML = `<section class="sec" style="padding-top:34px"><div class="wrap">
    <div class="sec-h"><h2>What's selling right now</h2><p>We check Google searches for ${S.ideasTotal || 40}+ products every day and show the ones that are rising. Under each product you see real listings with photo and price.</p></div>
    <div class="how grid g3"><div><b>1</b><span><b>The line goes up</b> when more people search Google for that product.</span></div><div><b>2</b><span><b>Rising and in season</b> means buyers are looking now. That is your chance.</span></div><div><b>3</b><span><b>Tap “Full check”</b> to see price, supplier cost and your profit before you buy.</span></div></div>
    <div id="tv" style="margin-top:24px"><div class="card"><div class="skel"></div><div class="skel" style="width:60%"></div></div></div></div></section>`;
  let d;
  try { d = await loadTrend(c) } catch(e){ $("#tv").innerHTML = `<div class="card empty">${esc(e.message)}</div>`; return }
  $("#tv").innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:16px">
      <div class="tabs" style="margin:0">${d.countries.map(x => `<button data-tc="${x}" class="${x === d.country ? "on" : ""}">${esc((COUNTRIES.find(k => k[0] === x) || [0, x])[1])}</button>`).join("")}</div>
      <span class="mut">${d.live ? `<span class="tag g">● Live Google data</span>` : `<span class="tag y">Season guide</span>`} Updated ${ago(d.updated)}${d.refreshing ? " · refreshing now" : ""}</span></div>
    ${d.note ? `<p class="mut" style="margin:-6px 0 14px">${esc(d.note)}</p>` : ""}
    ${d.live ? `<div class="card" style="margin-bottom:22px"><div class="row" style="justify-content:space-between"><h3>Google searches, last 12 months</h3><span class="tag">0 to 100 scale</span></div>${bigChart(d.rows)}
      <details class="help"><summary>What does this chart mean?</summary><p>Each line is one product. 100 is the week when that product was searched the most. A line climbing at the right end means more people are looking for it now. The numbers compare weeks for the same product, not how big one product is versus another.</p></details></div>` : ""}
    ${d.rows.map((x, i) => trendRow(x, i, d)).join("") || `<div class="card empty">${esc(d.note || "No data yet.")}</div>`}
    ${d.locked ? `<div class="card row" style="background:var(--yellow);justify-content:space-between"><b>${d.locked} more trending products with listings are in Pro.</b><a class="btn k sm" href="/pricing">Unlock all</a></div>` : ""}`;
  $$("[data-tc]").forEach(b => b.onclick = () => { go("/trending?c=" + b.dataset.tc) });
}

const VIEWS = {home, trending: trendingView, analyze: analyzeView, ideas: ideasView, season: seasonView, pricing, saved: savedView};
VIEWS.notfound = () => {
  $("#app").innerHTML = `<section class="sec"><div class="wrap" style="max-width:640px;text-align:center">
    <div class="card" style="padding:48px 28px"><p class="mut" style="font-weight:600;letter-spacing:.08em">404</p>
    <h1 style="margin:6px 0 10px">This page doesn't exist</h1>
    <p class="mut">The link may be old or mistyped. Try the home page or search for a product.</p>
    <div class="row" style="justify-content:center;gap:10px;margin-top:18px"><a class="btn g" href="/">Go to home</a><a class="btn w" href="/research">Deep research</a></div></div></div></section>`;
};

/* ---------- start ---------- */
window.addEventListener("DOMContentLoaded", async () => {
  $("#app").innerHTML = `<div class="wrap" style="padding:60px 20px"><div class="skel" style="width:50%;height:40px"></div><div class="skel"></div><div class="skel" style="width:70%"></div></div>`;
  try { await loadMe() } catch(e){ head() }
  await loadIdeas();
  try { const f = await api("/api/fx"); if (f.ok){ S.rates = f.rates; S.fxOk = true } } catch(e){}
  if (!S.rates && S.cur !== "USD") { toast("Live exchange rates are not available right now. Prices show in their original currency.") }
  render();
});
