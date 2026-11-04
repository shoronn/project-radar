/* Product Radar: clean light layer (home hero stage + new Product Finder). Loaded last. */
Object.assign(IP, {
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
  store: '<path d="M4 9l1.5-5h13L20 9"/><path d="M4 9h16v2a3 3 0 0 1-5.3 1.9A3 3 0 0 1 12 14a3 3 0 0 1-2.7-1.1A3 3 0 0 1 4 11z"/><path d="M5 13.5V20h14v-6.5"/>',
  truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/>',
  bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  rocket: '<path d="M12 3c3 2 5 5.5 5 9.5L15 15H9l-2-2.5C7 8.5 9 5 12 3z"/><circle cx="12" cy="9.5" r="1.6"/><path d="M9 15l-2 4 3-1M15 15l2 4-3-1"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  coin: '<ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7"/><path d="M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>',
  shield2: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/>',
  seed: '<path d="M12 21v-8"/><path d="M12 13c0-4 3-7 8-7 0 4-3 7-8 7zM12 13c0-3-2.5-5.5-7-5.5 0 3.2 2.5 5.5 7 5.5z"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'
});

/* ---------- HOME: centred hero, product orb stage, then the four actions ---------- */
const homeBase3 = VIEWS.home;
VIEWS.home = async r => {
  await homeBase3(r);
  const hero = $(".hero"); if (!hero) return;
  const left = hero.querySelector(".wrap > div:first-child"), acts = hero.querySelector(".acts");
  if (!left) return;
  hero.classList.add("hero-c");
  const pics = S.ideas.filter(i => i.photo && i.photo.image).slice(0, 5), pk = pics.length ? pics : S.ideas.slice(0, 5);
  const card = (i, cls) => `<a class="fl ${cls}" href="#/research?q=${encodeURIComponent(i.kw)}"><span class="fl-ph">${photo(i.photo, i.name)}</span><span><b>${esc(S.lang === "bn" ? i.bn : i.name)}</b><span class="tag ${seasonState(i) === "now" ? "g" : seasonState(i) === "soon" ? "y" : ""}">${seasonState(i) === "now" ? "In season" : seasonState(i) === "soon" ? "Season soon" : "Off season"}</span></span></a>`;
  const wave = (d) => `<svg class="wave ${d}" viewBox="0 0 220 60" aria-hidden="true"><path d="M0 30 C 20 30, 25 8, 45 8 S 70 52, 90 52 S 115 12, 135 12 S 160 44, 180 40 S 205 30, 220 30" fill="none" stroke="url(#wg${d})" stroke-width="2.4" stroke-linecap="round"/><defs><linearGradient id="wg${d}" x1="0" x2="1"><stop offset="0" stop-color="#0B8A7A" stop-opacity="${d === "l" ? .15 : 1}"/><stop offset="1" stop-color="#0B8A7A" stop-opacity="${d === "l" ? 1 : .15}"/></linearGradient></defs></svg>`;
  const stage = `<div class="stage" aria-label="Products the radar is watching">
      <div class="fl-col l">${pk.slice(0, 3).map((i, k) => card(i, "f" + k)).join("")}</div>${wave("l")}
      <div class="orb"><span>${icon("search", 30)}</span><b>${S.ideasTotal || 40}+</b><small>products watched</small></div>${wave("r")}
      <div class="fl-col r"><div class="fl mini-chart"><div class="row" style="justify-content:space-between"><b>Search interest</b><span class="tag g">▲ live</span></div>
        <svg viewBox="0 0 160 54" class="mc" aria-hidden="true"><polyline points="0,44 16,40 32,42 48,34 64,36 80,26 96,28 112,18 128,20 144,10 160,8" fill="none" stroke="#0B8A7A" stroke-width="2.4" stroke-linejoin="round"/></svg><span class="mut">Google Trends, 12 months</span></div>
        ${pk.slice(3, 5).map((i, k) => card(i, "f" + (k + 3))).join("")}</div>
    </div>`;
  left.insertAdjacentHTML("afterend", stage);
  if (acts){ hero.querySelector(".stage").insertAdjacentElement("afterend", acts); acts.classList.add("acts4") }
};

/* ---------- PRODUCT FINDER: 8 questions, multi-select, live match count ---------- */
const FQ2 = [
  {k: "channel", multi: true, q: "Where will you sell?", hint: "Pick all that apply.", o: [
    ["facebook", "Facebook / Instagram page", "users"], ["website", "My own website", "globe"], ["marketplace", "Daraz", "bag"], ["abroad", "Amazon, eBay or Etsy", "send"],
    ["tiktok", "TikTok or live selling", "video"], ["shop", "Physical shop", "store"], ["dropship", "Dropshipping, no stock", "truck"], ["wholesale", "Wholesale to shops", "box"]]},
  {k: "experience", q: "How much selling have you done?", hint: "We avoid risky products for beginners.", o: [
    ["new", "First time selling", "seed", "Start simple and light"], ["some", "I have sold a little", "layers", "A few orders done"], ["pro", "I run a shop already", "store", "Looking for the next winner"]]},
  {k: "budget", q: "How much can you put into your first stock?", hint: "Products above your budget are hidden.", o: [
    ["Tiny", "Under ৳20,000", "coin", "About $160"], ["Low", "৳20,000 to ৳50,000", "coin", "About $160 to $400"], ["Medium", "Up to ৳2 lakh", "coin", "About $1,600"], ["High", "More than ৳2 lakh", "coin", "Bigger orders"]]},
  {k: "category", multi: true, q: "Which kinds of products interest you?", hint: "Leave empty to see every category.", cats: true},
  {k: "audience", multi: true, q: "Who will buy from you?", hint: "Pick one or more.", o: [
    ["women", "Women", "users"], ["men", "Men", "users"], ["students", "Students", "laptop"], ["office workers", "Office workers", "laptop"], ["parents", "Parents", "bottle"],
    ["families", "Families", "house"], ["young people", "Young people", "sparkle"], ["gift buyers", "Gift buyers", "gift"], ["drivers", "Drivers", "car"], ["creators", "Creators", "mic"], ["pet owners", "Pet owners", "paw"], ["shop owners", "Shop owners", "store"]]},
  {k: "price", q: "What price do you want to sell at?", hint: "Uses real listing prices when we have them.", o: [
    ["impulse", "Under ৳500", "tag", "Quick impulse buy"], ["mid", "৳500 to ৳2,000", "tag", "Most social commerce sales"], ["upper", "৳2,000 to ৳5,000", "tag", "Needs more trust"], ["premium", "Above ৳5,000", "tag", "Premium buyers"], ["", "Not sure yet", "search", "Show all prices"]]},
  {k: "timing", q: "When do you want to start selling?", hint: "Season decides most of the result.", o: [
    ["now", "Right now", "flame", "In-season products first"], ["soon", "In 1 to 2 months", "cal", "Prepare stock before the season"], ["any", "All year", "sun", "Products that sell every month"]]},
  {k: "risk", q: "How much risk is OK?", hint: "Growth gives Google Trends momentum more weight.", o: [
    ["safe", "Safe", "shield2", "Steady sellers, no fragile items"], ["balanced", "Balanced", "layers", "A bit of both"], ["growth", "Growth", "rocket", "Rising fast, more risk"]]}
];
const fAns = () => ls.get("finder2", {});
const fLabel = (q, v) => q.cats ? v : ((q.o || []).find(o => o[0] === v) || [, v])[1];
let fT;
async function fCount(A){
  clearTimeout(fT);
  fT = setTimeout(async () => { try { const j = await api("/api/finder", {method: "POST", body: JSON.stringify(Object.assign({country: S.country, count_only: true}, A))}); const el = $("#fcount"); if (el) el.textContent = j.matches } catch(e){} }, 150);
}
function fSide(A, step){
  return `<aside class="card fside"><h3>Your answers</h3><div class="fans">${FQ2.map((q, i) => { const v = A[q.k], has = Array.isArray(v) ? v.length : (v !== undefined && v !== "");
      return `<a href="#/finder?s=${i}" class="${i === step ? "on" : ""}"><span class="n ${has ? "done" : ""}">${has ? icon("check", 12) : i + 1}</span><span><small>${esc(q.q)}</small><b>${has ? esc((Array.isArray(v) ? v : [v]).map(x => fLabel(q, x)).join(", ")) : "Not answered"}</b></span></a>` }).join("")}</div>
    <div class="fmatch"><b id="fcount">…</b><span>products match so far</span></div>
    <a class="btn g" style="width:100%" href="#/finder?s=${FQ2.length}">See my products</a>
    <button class="btn w sm" id="freset" style="width:100%;margin-top:8px">Start over</button></aside>`;
}
async function finderView2(){
  const A = fAns(), step = Math.min(+(route().q.get("s") || 0), FQ2.length);
  if (step < FQ2.length){
    const q = FQ2[step], opts = q.cats ? Object.keys(CAT).map(c => [c, c, null]) : q.o, cur = A[q.k];
    const isOn = v => q.multi ? (cur || []).includes(v) : cur === v;
    $("#app").innerHTML = `<section class="sec fsec"><div class="wrap">${discoverTabs("finder")}
      <div class="fhead"><h1>Find products that fit you</h1><p class="mut">Answer a few questions. We rank products by season, live search demand and your budget.</p></div>
      <div class="fx"><div class="card finder2">
        <div class="fsteps">${FQ2.map((_, i) => `<a href="#/finder?s=${i}" class="${i < step ? "done" : i === step ? "on" : ""}" aria-label="Question ${i + 1}"></a>`).join("")}</div>
        <div class="mut" style="margin-top:14px">Question ${step + 1} of ${FQ2.length}</div>
        <h2>${esc(q.q)}</h2><p class="mut" style="margin:6px 0 20px">${esc(q.hint)}</p>
        <div class="opts2 ${opts.length > 6 ? "many" : ""}">${opts.map(o => `<button class="opt2 ${isOn(o[0]) ? "on" : ""}" data-v="${esc(o[0])}" aria-pressed="${isOn(o[0])}">
          <span class="oi">${q.cats ? catIcon(o[0])[0] : icon(o[2] || "box", 20)}</span><span class="ot"><b>${esc(o[1])}</b>${o[3] ? `<small>${esc(o[3])}</small>` : ""}</span>${q.multi ? `<span class="ck">${icon("check", 14)}</span>` : ""}</button>`).join("")}</div>
        <div class="row fnav">${step ? `<a class="btn w" href="#/finder?s=${step - 1}">Back</a>` : "<span></span>"}
          <div class="row"><a class="skip" href="#/finder?s=${step + 1}">Skip</a>${q.multi ? `<a class="btn g" href="#/finder?s=${step + 1}">Continue</a>` : ""}</div></div>
      </div>${fSide(A, step)}</div></div></section>`;
    $$(".opt2").forEach(b => b.onclick = () => {
      const v = b.dataset.v;
      if (q.multi){ const s = new Set(A[q.k] || []); s.has(v) ? s.delete(v) : s.add(v); A[q.k] = [...s]; ls.set("finder2", A); b.classList.toggle("on"); b.setAttribute("aria-pressed", s.has(v)); $(".fside").outerHTML = fSide(A, step); bindSide(); fCount(A) }
      else { A[q.k] = v; ls.set("finder2", A); location.hash = "#/finder?s=" + (step + 1) }
    });
    const bindSide = () => { const r = $("#freset"); if (r) r.onclick = () => { ls.set("finder2", {}); location.hash = "#/finder?s=0" } };
    bindSide(); fCount(A);
    return;
  }
  $("#app").innerHTML = `<section class="sec fsec"><div class="wrap">${discoverTabs("finder")}<div id="fr"><div class="card"><div class="skel"></div><div class="skel" style="width:60%"></div></div></div></div></section>`;
  let d; try { d = await api("/api/finder", {method: "POST", body: JSON.stringify(Object.assign({country: S.country}, A))}) } catch(e){ $("#fr").innerHTML = `<div class="card empty">${esc(e.message)}</div>`; return }
  const chips = FQ2.map(q => A[q.k] && (Array.isArray(A[q.k]) ? A[q.k].length : true) ? (Array.isArray(A[q.k]) ? A[q.k] : [A[q.k]]).map(x => fLabel(q, x)).join(", ") : null).filter(Boolean);
  $("#fr").innerHTML = `<div class="fhead row" style="justify-content:space-between;align-items:end"><div><h1>Products that fit you</h1><p class="mut">${d.matches} matches in ${esc(cname(S.country))}. Showing the best ${d.results.length}.</p><div class="chips" style="margin-top:10px">${chips.map(c => `<span class="chip">${esc(c)}</span>`).join("")}</div></div><a class="btn w" href="#/finder?s=0">Change answers</a></div>
    ${d.results.length ? `<div class="fgrid">${d.results.map((r, i) => { const it = r.idea, L = r.listing; return `<article class="card fcard">
      <div class="fc-ph">${L && L.image ? `<img src="${esc(L.image)}" alt="${esc(L.name || it.name)}" referrerpolicy="no-referrer" data-fb="noimg">` : noImg}<span class="rank sm">${i + 1}</span></div>
      <div class="fc-b"><h3>${esc(S.lang === "bn" ? it.bn : it.name)}</h3>
        <div class="row" style="gap:6px;margin:8px 0 10px">${r.season === "now" ? `<span class="tag g">In season</span>` : r.season === "soon" ? `<span class="tag y">Season soon</span>` : `<span class="tag">Off season</span>`}<span class="tag b">Budget: ${esc(it.budget)}</span>${it.dropship ? `<span class="tag p">Dropship OK</span>` : ""}${it.fragile ? `<span class="tag r">Fragile</span>` : ""}</div>
        <ul class="why2">${r.reasons.map(x => `<li>${icon("check", 14)}<span>${esc(x)}</span></li>`).join("")}</ul>
        <p class="mut" style="margin:8px 0 0"><b style="color:var(--text)">Why people buy:</b> ${esc(it.why)}</p>
        ${L ? `<p class="mut" style="margin:6px 0 0">From ${money(L.price, L.cur)} on ${esc(L.source)}</p>` : ""}
        <div class="row" style="margin-top:14px"><a class="btn sm g" href="#/research?q=${encodeURIComponent(it.kw)}">Deep research</a><a class="btn sm w" href="#/ask?q=${encodeURIComponent("Is " + it.name + " a good product to start with in " + cname(S.country) + "?")}">Ask AI</a></div></div></article>` }).join("")}</div>`
      : `<div class="card empty"><b>No product fits all your answers</b>Try a bigger budget, fewer categories or “Skip” on buyers.</div>`}
    ${d.locked ? `<div class="card row upsell" style="justify-content:space-between;margin-top:18px"><b>${d.locked} more matches are in Pro.</b><a class="btn g sm" href="#/pricing">Unlock all 10</a></div>` : ""}
    <p class="mut" style="margin-top:16px">Ranked by season (our guide), Google Trends momentum when connected, and your answers. Always run Deep research before you buy stock.</p>`;
}
VIEWS.finder = finderView2;

/* ---------- THEME: light / dark (follows the phone or computer until the person picks one) ---------- */
Object.assign(IP, {moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'});
const THEME = {get: () => { try { return localStorage.getItem("theme") || "" } catch(e){ return "" } },
  set: v => { try { v ? localStorage.setItem("theme", v) : localStorage.removeItem("theme") } catch(e){} }};
function applyTheme(){ const v = THEME.get(); if (v) document.documentElement.dataset.theme = v; else delete document.documentElement.dataset.theme }
const isDark = () => (THEME.get() || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")) === "dark";
applyTheme();
const headBase4 = head;
head = function(){
  headBase4();
  const tools = $(".tools");
  if (tools && !$("#thm")) tools.insertAdjacentHTML("afterbegin", `<button class="thm" id="thm" aria-label="Switch light or dark mode" title="Light / dark">${icon(isDark() ? "sun" : "moon", 18)}</button>`);
  const b = $("#thm"); if (b){ b.innerHTML = icon(isDark() ? "sun" : "moon", 18); b.onclick = () => { THEME.set(isDark() ? "light" : "dark"); applyTheme(); b.innerHTML = icon(isDark() ? "sun" : "moon", 18) } }
};

/* ---------- DOODLES: hand-drawn product sketches floating in the background ---------- */
const DOOD = {
  bag: '<path d="M8 20h32l-3 22H11z"/><path d="M17 20v-4a7 7 0 0 1 14 0v4"/>',
  tag: '<path d="M6 24L24 6h16v16L22 40z"/><circle cx="32" cy="14" r="3"/>',
  box: '<path d="M6 16l18-9 18 9-18 9z"/><path d="M6 16v18l18 9 18-9V16"/><path d="M24 25v18"/>',
  chart: '<path d="M5 38l10-12 8 6 10-16 10 8"/><path d="M36 16h7v7"/>',
  star: '<path d="M24 6l3.5 12.5L40 22l-12.5 3.5L24 38l-3.5-12.5L8 22l12.5-3.5z"/>',
  squig: '<path d="M4 30c6-14 10 10 16-4s10 10 16-4 8 6 8 6"/>',
  ring: '<circle cx="24" cy="24" r="15"/><circle cx="24" cy="24" r="6"/>',
  plus: '<path d="M24 10v28M10 24h28"/>',
  bulb: '<path d="M17 30c-4-3-6-7-6-11a13 13 0 0 1 26 0c0 4-2 8-6 11v5H17z"/><path d="M19 40h10"/>',
  truck: '<path d="M4 14h24v18H4zM28 20h8l6 6v6H28"/><circle cx="12" cy="35" r="3.5"/><circle cx="34" cy="35" r="3.5"/>'
};
function doodles(list){
  return `<div class="doodles" aria-hidden="true">${list.map(([n, x, y, s, c, r, d]) => `<svg class="dd ${c}" viewBox="0 0 48 48" style="left:${x};top:${y};width:${s}px;height:${s}px;--r:${r || 0}deg;animation-delay:${d || 0}s"><g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${DOOD[n]}</g></svg>`).join("")}</div>`;
}
const homeBase4 = VIEWS.home;
VIEWS.home = async r => {
  await homeBase4(r);
  const hero = $(".hero");
  if (hero) hero.insertAdjacentHTML("afterbegin", doodles([["bag", "6%", "14%", 54, "c1", -12], ["tag", "88%", "10%", 46, "c2", 14, 1], ["chart", "4%", "48%", 58, "c3", 0, 2], ["star", "92%", "40%", 30, "c2", 0, .5],
    ["squig", "14%", "70%", 60, "c1", 8, 1.5], ["box", "85%", "66%", 52, "c3", -8, 2.5], ["plus", "26%", "8%", 22, "c3", 0, 3], ["ring", "72%", "4%", 30, "c1", 0, 1]]));
  const secs = [...$$("#app > section.sec")].filter(s => !s.classList.contains("hero"));
  secs.forEach((s, i) => { if (i % 2 === 1) s.classList.add("band") });
  const soon = $("#soon"); if (soon){ soon.classList.add("band-soft"); soon.insertAdjacentHTML("afterbegin", doodles([["truck", "92%", "6%", 44, "c3", -6], ["star", "2%", "10%", 24, "c2", 0, 1]])) }
  const cta = $(".cta"); if (cta) cta.insertAdjacentHTML("afterbegin", doodles([["star", "8%", "18%", 30, "c2", 0], ["squig", "80%", "60%", 70, "c1", -10, 1], ["bulb", "86%", "12%", 40, "c3", 8, 2], ["tag", "6%", "62%", 40, "c1", -14, 1.5]]));
};

/* ---------- PHOTOS: fill any product card that has no photo yet, one request at a time ---------- */
const PHQ = [], PHC = {};
let phBusy = 0;
function fillPhotos(){
  $$("#app .sn .ph .noimg, #app .fl-ph .noimg, #app .idea .ph .noimg, #app .fc-ph .noimg, #app .tn .noimg").forEach(n => {
    const box = n.parentNode, a = box.closest('a[href*="research?q="]') || (box.closest(".card") || document).querySelector('a[href*="research?q="]');
    if (!a || box.dataset.ph) return;
    const kw = decodeURIComponent((a.getAttribute("href").split("q=")[1] || "").split("&")[0]).toLowerCase();
    if (!kw) return;
    box.dataset.ph = "1"; box.classList.add("ph-loading"); PHQ.push([kw, box]);
  });
  pump();
}
async function pump(){
  while (phBusy < 2 && PHQ.length){
    const [kw, box] = PHQ.shift(); phBusy++;
    (async () => {
      try {
        const p = kw in PHC ? PHC[kw] : (PHC[kw] = (await api(`/api/photo?kw=${encodeURIComponent(kw)}&country=${S.country}`)).photo);
        if (p && p.image){ box.innerHTML = photo(p, p.name); const i = S.ideas.find(x => x.kw.toLowerCase() === kw); if (i && !i.photo) i.photo = p }
      } catch(e){}
      box.classList.remove("ph-loading"); phBusy--; pump();
    })();
  }
}
new MutationObserver(() => { clearTimeout(fillPhotos.t); fillPhotos.t = setTimeout(fillPhotos, 250) }).observe(document.getElementById("app"), {childList: true, subtree: true});

/* ---------- TRENDING without SerpApi: live Google chart comparing the top products ---------- */
const trendingBase3 = VIEWS.trending;
VIEWS.trending = async r => {
  await trendingBase3(r);
  if ($("#tcard .embed") || $("#tv svg.cs")) return;
  const kws = [...new Set($$("#tv [href*='research?q=']").map(a => decodeURIComponent((a.getAttribute("href").split("q=")[1] || "").split("&")[0])))].slice(0, 5);
  const first = $("#tv > .row"); if (!kws.length || !first) return;
  if (!$("#tv .card svg")) first.insertAdjacentHTML("afterend", `<div class="card" style="margin-bottom:22px"><div class="row" style="justify-content:space-between"><h3>Google searches, last 12 months</h3><span class="tag">Live from Google Trends</span></div>
    <div class="embed" style="margin-top:12px;height:400px"><iframe loading="lazy" title="Google Trends comparison" src="${trendsMulti(kws, r.q.get("c") || S.country)}"></iframe></div>
    <p class="mut" style="margin:8px 0 0">Comparing the top ${kws.length} products. Add SERPAPI_KEY to rank all products by live demand. <a href="#/setup">Setup guide</a></p></div>`);
};

/* ---------- SETUP page: which data sources are on, and what each one unlocks ---------- */
async function setupView(){
  $("#app").innerHTML = `<section class="sec"><div class="wrap"><div class="card"><div class="skel"></div></div></div></section>`;
  let d; try { d = await api("/api/setup") } catch(e){ $("#app").innerHTML = `<section class="sec"><div class="wrap"><div class="card empty">${esc(e.message)}</div></div></section>`; return }
  const on = d.items.filter(x => x.on).length;
  $("#app").innerHTML = `<section class="sec"><div class="wrap" style="max-width:880px">
    <h1 style="font-size:clamp(28px,4vw,42px)">Live data setup</h1><p class="mut" style="font-size:16px;margin:10px 0 22px">${on} of ${d.items.length} sources are on. Add keys in the <b>.env</b> file in the app folder, then restart the app. Keys are never shown here.</p>
    <div class="setup">${d.items.map(x => `<div class="card su ${x.on ? "on" : ""}"><span class="st">${x.on ? icon("check", 16) : "!"}</span><div><div class="row" style="justify-content:space-between"><h3>${esc(x.name)}</h3><span class="tag ${x.on ? "g" : "r"}">${x.on ? "On" : "Off"}</span></div>
      <p style="margin:6px 0 4px">${esc(x.unlocks)}</p><p class="mut" style="margin:0"><code>${esc(x.key)}</code> · ${esc(x.where)}</p></div></div>`).join("")}</div>
    <div class="card" style="margin-top:18px"><h3>Data status</h3><table class="bt" style="margin-top:8px"><tr><th>Country</th><th>Last update</th><th>Photos saved</th><th>Note</th></tr>${d.countries.map(c => `<tr><td>${esc(cname(c))}</td><td>${d.data[c] ? ago(d.data[c].updated) : "never"}</td><td>${d.photos[c] || 0} of ${d.ideas}</td><td style="white-space:normal">${esc((d.data[c] || {}).note || "")}</td></tr>`).join("")}</table>
    <p class="mut" style="margin:10px 0 0">Without keys the app still works: Bangladesh prices and photos come from Daraz, charts come straight from Google Trends, and the season guide ranks products.</p></div></div></section>`;
}
VIEWS.setup = setupView;
SECTION.setup = "setup";

/* ---------- RADAR SCOPE: replaces the orb. Real products sit on rings by season: inner = in season now ---------- */
const homeBase5 = VIEWS.home;
let radarT;
VIEWS.home = async r => {
  await homeBase5(r);
  const st = $(".stage"); if (!st) return;
  const pool0 = S.ideas.filter(i => i.photo && i.photo.image), pool = pool0.length >= 6 ? pool0 : S.ideas;
  const by = st => pool.filter(i => seasonState(i) === st);
  let list = [...by("now").slice(0, 4), ...by("soon").slice(0, 3), ...by("off").slice(0, 3)];
  if (list.length < 8) list = list.concat(pool.filter(i => !list.includes(i)).slice(0, 8 - list.length));
  const slots = [[18, 3, -1.57], [32, 5, -1.1], [44, 6, -.4]];          // radius %, how many fit, start angle
  const pos = []; let k0 = 0;
  slots.forEach(([rr, n, a0]) => { const m = Math.min(n, list.length - k0); for (let j = 0; j < m; j++) pos.push([rr, a0 + j / m * Math.PI * 2]); k0 += m });
  const blips = list.slice(0, pos.length).map((i, k) => { const [rr, a] = pos[k];
    return `<button class="blip ${seasonState(i)}" data-k="${k}" style="left:${50 + Math.cos(a) * rr}%;top:${50 + Math.sin(a) * rr}%;animation-delay:${(k * .37).toFixed(2)}s" aria-label="${esc(i.name)}">${photo(i.photo, i.name)}</button>` }).join("");
  st.className = "stage radar-stage";
  st.innerHTML = `<div class="scope-wrap"><div class="scope" aria-label="Products on the radar">
      <span class="ring r1"></span><span class="ring r2"></span><span class="ring r3"></span><span class="cross"></span><span class="sweep"></span>
      
      <span class="core">${icon("search", 20)}</span>${blips}</div>
      <div class="scope-leg"><span><i class="now"></i>In season</span><span><i class="soon"></i>Within 2 months</span><span><i class="off"></i>Later</span></div></div>
    <div class="pick card" id="pick" aria-live="polite"></div>`;
  let cur = 0;
  const show = k => {
    cur = k; const i = list[k]; if (!i || !$("#pick")) return;
    $$(".blip").forEach(b => b.classList.toggle("on", +b.dataset.k === k));
    const s = seasonState(i), pk = peaks(i, S.country), m = new Date().getMonth();
    $("#pick").innerHTML = `<div class="pk-top"><span class="pk-ph">${photo(i.photo, i.name)}</span><div><span class="tag ${s === "now" ? "g" : s === "soon" ? "y" : ""}">${s === "now" ? "In season now" : s === "soon" ? "Season in 2 months" : "Later this year"}</span>
        <h3>${esc(S.lang === "bn" ? i.bn : i.name)}</h3><span class="mut">${esc(i.cat)}</span></div></div>
      <p class="pk-why">${esc(i.why)}</p>
      <div class="pk-m">${MS.map((x, k2) => `<span class="${pk.includes(k2 + 1) ? "on" : ""} ${k2 === m ? "now" : ""}"><i></i>${x[0]}</span>`).join("")}</div>
      <div class="row pk-f">${i.photo && i.photo.price ? `<div><small class="mut">From</small><b>${money(i.photo.price, i.photo.cur)}</b></div>` : "<span></span>"}<a class="btn g sm" href="#/research?q=${encodeURIComponent(i.kw)}">Check this product</a></div>`;
  };
  $$(".blip").forEach(b => { b.onmouseenter = () => { clearInterval(radarT); show(+b.dataset.k) }; b.onclick = () => { clearInterval(radarT); show(+b.dataset.k) } });
  show(0); clearInterval(radarT);
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) radarT = setInterval(() => { if (!$("#pick")) return clearInterval(radarT); show((cur + 1) % list.length) }, 3200);
  const hero = $(".hero"); if (hero && !hero.querySelector(".glow-b")) hero.insertAdjacentHTML("beforeend", `<span class="glow-b" aria-hidden="true"></span>`);
};

/* ---------- glows at the bottom of the closing section and above the footer ---------- */
const renderBase = render;
render = function(){ renderBase(); document.body.classList.toggle("auth-page", route().name === "login"); document.body.classList.toggle("page-home", route().name === "home");
  const c = $(".cta"); if (c && !c.querySelector(".glow-b")) c.insertAdjacentHTML("beforeend", `<span class="glow-b" aria-hidden="true"></span>`) };

/* ---------- LOGIN / SIGN UP: full page, split screen ---------- */
auth = function(mode, why){
  try { sessionStorage.setItem("authWhy", why || ""); if (route().name !== "login") sessionStorage.setItem("authNext", location.hash || "#/") } catch(e){}
  location.hash = "#/login?m=" + (mode === "signup" ? "signup" : "login");
};
function loginView(r){
  const sign = r.q.get("m") === "signup";
  let why = "", next = "#/dashboard"; try { why = sessionStorage.getItem("authWhy") || ""; next = sessionStorage.getItem("authNext") || "#/dashboard" } catch(e){}
  if (S.me){ location.hash = "#/dashboard"; return }
  const pick = (S.ideas.find(i => i.photo && i.photo.image) || S.ideas[0] || {name: "Moon lamp", why: "", kw: "moon lamp"});
  $("#app").innerHTML = `<section class="auth">
    <div class="auth-l">${doodles([["star", "84%", "14%", 26, "c2", 0, 1], ["chart", "80%", "54%", 54, "c3", 0, 2], ["tag", "70%", "30%", 36, "c1", 12, 1]])}<span class="glow-b"></span>
      <a class="logo light" href="#/"><i>${document.querySelector(".logo i").innerHTML}</i><span>Product Radar</span></a>
      <div class="auth-copy"><h1>Know what sells <span>before you buy stock.</span></h1><p>Live demand, real marketplace prices, supplier cost and season in one place. Free to start.</p></div>
      <div class="auth-demo"><div class="ad-top"><span class="pk-ph">${photo(pick.photo, pick.name)}</span><div><b>${esc(pick.name)}</b><span>Research · ${esc(cname(S.country))}</span></div><span class="ad-v">Go</span></div>
        <div class="ad-row"><div><small>Opportunity</small><b>83</b></div><div><small>Evidence</small><b>High</b></div><div><small>Season</small><b>${seasonState(pick) === "now" ? "Now" : "Soon"}</b></div></div>
        <svg viewBox="0 0 300 70" class="ad-ch" aria-hidden="true"><defs><linearGradient id="adg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#5BE3CB" stop-opacity=".45"/><stop offset="1" stop-color="#5BE3CB" stop-opacity="0"/></linearGradient></defs><path d="M0 58 L25 52 L50 55 L75 44 L100 47 L125 36 L150 39 L175 26 L200 30 L225 18 L250 21 L275 10 L300 8 L300 70 L0 70Z" fill="url(#adg)"/><polyline points="0,58 25,52 50,55 75,44 100,47 125,36 150,39 175,26 200,30 225,18 250,21 275,10 300,8" fill="none" stroke="#5BE3CB" stroke-width="2.5"/></svg>
        <small class="ad-s">Example research card. Every number in the app shows its source.</small></div>
    </div>
    <div class="auth-r"><a class="back" href="${esc(next.includes("login") ? "#/" : next)}">${icon("arrow", 14)} Back</a>
      <form class="auth-f" id="af" novalidate>
        <h2>${sign ? "Create your account" : "Welcome back"}<span class="dot">.</span></h2>
        <p class="mut">${esc(why || (sign ? "Free plan: 5 product checks a day, saved projects and AI answers." : "Log in to your account."))}</p>
        <div class="seg"><a class="${sign ? "" : "on"}" href="#/login?m=login">Log in</a><a class="${sign ? "on" : ""}" href="#/login?m=signup">Sign up</a></div>
        ${sign ? `<label class="field">Your name<input name="name" autocomplete="name" placeholder="Tareen"></label>` : ""}
        <label class="field">Email<input name="email" type="email" required autocomplete="email" placeholder="you@example.com"></label>
        <label class="field">Password<span class="pw"><input name="password" type="password" required minlength="8" autocomplete="${sign ? "new-password" : "current-password"}" placeholder="${sign ? "At least 8 characters" : "Enter your password"}"><button type="button" id="pwt" aria-label="Show password">Show</button></span></label>
        <p class="err hide" id="ae" role="alert"></p>
        <button class="btn g big" type="submit">${sign ? "Create free account" : "Log in"}</button>
        <p class="mut sw">${sign ? "Already have an account?" : "Don't have an account?"} <a href="#/login?m=${sign ? "login" : "signup"}">${sign ? "Log in" : "Sign up free"}</a></p>
        ${sign ? `<p class="mut fine">No card needed. You can delete your account any time.</p>` : ""}
      </form></div></section>`;
  $("#pwt").onclick = () => { const i = $("#af input[name=password]"), s = i.type === "password"; i.type = s ? "text" : "password"; $("#pwt").textContent = s ? "Hide" : "Show" };
  $("#af").onsubmit = async e => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)), err = $("#ae"), btn = e.target.querySelector("button[type=submit]");
    if (!/^\S+@\S+\.\S+$/.test(f.email || "")) { err.textContent = "Type a real email address."; return err.classList.remove("hide") }
    if ((f.password || "").length < 8) { err.textContent = "The password needs at least 8 characters."; return err.classList.remove("hide") }
    btn.disabled = true; btn.textContent = sign ? "Creating your account…" : "Logging in…";
    try { await api(sign ? "/api/signup" : "/api/login", {method: "POST", body: JSON.stringify(f)}); await loadMe(); await loadIdeas();
      try { sessionStorage.removeItem("authWhy"); sessionStorage.removeItem("authNext") } catch(x){}
      location.hash = sign ? "#/dashboard" : (next && !next.includes("login") && next !== "#/" ? next : "#/dashboard");
      toastBase(sign ? "Account created. You now get 5 checks a day." : "Logged in.") }
    catch(x){ err.textContent = x.message; err.classList.remove("hide"); btn.disabled = false; btn.textContent = sign ? "Create free account" : "Log in" }
  };
  setTimeout(() => { const i = $("#af input"); i && i.focus() }, 50);
}
VIEWS.login = loginView;
Object.assign(IP, {arrow: '<path d="M19 12H5M11 6l-6 6 6 6"/>'});

/* ---------- PRELOADER: radar sweep while the app loads, then fades out ---------- */
(function(){
  const t0 = performance.now(), msgs = ["Scanning products…", "Checking the season…", "Reading live prices…", "Almost ready…"];
  let k = 0; const iv = setInterval(() => { const m = document.getElementById("premsg"); if (m) m.textContent = msgs[++k % msgs.length] }, 900);
  const hide = () => { const p = document.getElementById("pre"); if (!p || p.classList.contains("done")) return; clearInterval(iv);
    setTimeout(() => { p.classList.add("done"); setTimeout(() => p.remove(), 500) }, Math.max(0, 900 - (performance.now() - t0))) };
  const renderBase2 = render;
  render = function(){ renderBase2(); hide() };
  setTimeout(hide, 8000);                                     // never block the page if something is slow
})();

/* ---------- MARQUEE: two strips crossing like an X, on the same background as the sections around it ---------- */
const homeBase6 = VIEWS.home;
VIEWS.home = async r => {
  await homeBase6(r);
  const tk = $(".ticker"); if (!tk || tk.parentNode.classList.contains("tkx")) return;
  const wrap = document.createElement("div"); wrap.className = "tkx"; wrap.setAttribute("aria-hidden", "true");
  tk.parentNode.insertBefore(wrap, tk); wrap.appendChild(tk);
  const b = tk.cloneNode(true); b.classList.add("alt"); wrap.insertBefore(b, tk);
};

/* ---------- RADAR extras: faint signal dots, degree ticks and live stat chips so the scope feels alive ---------- */
const homeBase7 = VIEWS.home;
VIEWS.home = async r => {
  await homeBase7(r);
  const sc = $(".scope"); if (!sc || sc.querySelector(".nd")) return;
  let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  let dots = "";
  for (let k = 0; k < 26; k++){ const a = rnd() * Math.PI * 2, rr = 8 + rnd() * 40;
    dots += `<span class="nd ${k % 7 === 0 ? "hot" : ""}" style="left:${50 + Math.cos(a) * rr}%;top:${50 + Math.sin(a) * rr}%;animation-delay:${(rnd() * 5).toFixed(2)}s"></span>` }
  sc.insertAdjacentHTML("afterbegin", `<span class="ticks"></span><span class="ring-o"></span>${dots}`);
  const L = S.ideas, now = L.filter(i => seasonState(i) === "now").length, soon = L.filter(i => seasonState(i) === "soon").length;
  const prices = L.filter(i => i.photo && i.photo.price).map(i => [i.photo.price, i.photo.cur]);
  const low = prices.sort((a, b) => a[0] - b[0])[0];
  const cats = new Set(L.map(i => i.cat)).size;
  sc.parentNode.insertAdjacentHTML("afterbegin", `<div class="sc-chips">
    <span class="scc c1">${icon("flame", 14)} <b>${now}</b> in season now</span>
    <span class="scc c2">${soon ? `${icon("cal", 14)} <b>${soon}</b> coming in 2 months` : `${icon("refresh", 14)} prices updated <b>daily</b>`}</span>
    ${low ? `<span class="scc c3">${icon("tag", 14)} from <b>${money(low[0], low[1])}</b></span>` : ""}
    <span class="scc c4">${icon("grid", 14)} <b>${cats}</b> categories</span></div>`);
};


/* ---------- RESEARCH start page: not empty any more ---------- */
const researchBase = VIEWS.research;
VIEWS.research = async r => {
  if ((r.q.get("q") || "").trim() || r.q.get("pid")) return researchBase(r);
  let recent = []; if (S.me) try { recent = await api("/api/projects") } catch(e){}
  const pop = S.ideas.slice(0, 8);
  const STEPS7 = [["trend", "Demand", "Is anyone searching for it, and is it rising?"], ["cal", "Timing", "Which months it sells, when to order stock"], ["users", "Competitors", "Who sells it, at what price, with what offer"],
    ["chat", "Customer voice", "What buyers love and hate in reviews"], ["coin", "Sourcing & cost", "Supplier price, shipping and your real margin"], ["check", "Decision", "Go, Test small or Skip, with the reasons"], ["printer", "Report", "A clean report to save or share"]];
  $("#app").innerHTML = `<section class="hero hero-c rs-hero">${doodles([["chart", "8%", "22%", 56, "c1", 0], ["tag", "88%", "18%", 44, "c2", 12, 1], ["box", "84%", "62%", 50, "c3", -8, 2], ["star", "12%", "70%", 26, "c2", 0, 1.5]])}<span class="glow-b"></span>
      <div class="wrap"><div><span class="tag">${icon("flask", 14)} Deep research</span>
        <h1>Check any product <span class="hl">in 7 steps</span></h1>
        <p class="lead">Live demand, timing, competitors, customer voice and your real profit. Then a clear Go, Test small or Skip.</p>
        ${searchBox("", true)}
        <div class="row try"><span class="mut"><b>Popular:</b></span>${pop.slice(0, 5).map(i => `<a class="chip" href="#/research?q=${encodeURIComponent(i.kw)}">${esc(i.kw)}</a>`).join("")}</div></div></div></section>
    ${recent.length ? `<section class="sec" style="padding:20px 0 40px"><div class="wrap"><div class="row" style="justify-content:space-between;margin-bottom:14px"><h2 style="font-size:24px">${t("cont")}</h2><a class="btn w sm" href="#/projects">All projects</a></div><div class="grid g3">${recent.slice(0, 3).map(projCard).join("")}</div></div></section>` : ""}
    <section class="sec band" style="padding:72px 0"><div class="wrap"><div class="sec-h"><h2>What the research covers</h2><p>Every number shows where it comes from: observed, calculated, estimated or an AI idea.</p></div>
      <div class="s7">${STEPS7.map((x, i) => `<div class="card s7c"><span class="s7n">${i + 1}</span><span class="ic">${icon(x[0], 20)}</span><b>${x[1]}</b><span class="mut">${x[2]}</span></div>`).join("")}
        <div class="card s7c s7cta"><b>Try it now</b><span>2 free checks a day, no sign-up.</span><a class="btn g sm" href="#/research?q=${encodeURIComponent(pop[0] ? pop[0].kw : "moon lamp")}">Run a sample</a></div></div></div></section>
    <section class="sec" style="padding:72px 0"><div class="wrap"><div class="row" style="justify-content:space-between;margin-bottom:18px"><div class="sec-h" style="margin:0"><h2>Start with a product people want now</h2><p>In season or coming soon in ${esc(cname(S.country))}. Tap one to research it.</p></div><a class="btn w sm" href="#/ideas">All ideas</a></div>
      <div class="soon">${pop.map(i => { const st = seasonState(i); return `<a class="card sn" href="#/research?q=${encodeURIComponent(i.kw)}"><span class="ph">${photo(i.photo, i.name)}<span class="tag ${st === "now" ? "g" : st === "soon" ? "y" : ""}">${st === "now" ? "In season" : st === "soon" ? "Soon" : "Off season"}</span></span><b>${esc(S.lang === "bn" ? i.bn : i.name)}</b><span class="mut">${esc(i.why)}</span>${i.photo && i.photo.price ? `<span class="pr">from ${money(i.photo.price, i.photo.cur)}</span>` : ""}</a>` }).join("")}</div></div></section>`;
  bindSearch();
};
VIEWS.analyze = VIEWS.research;
Object.assign(IP, {trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'});

/* ---------- PROJECTS: a full intro page with a sample project, when there is nothing saved yet ---------- */
const projectsBase = VIEWS.projects;
VIEWS.projects = async r => {
  let ps = [];
  if (S.me){ try { ps = await api("/api/projects") } catch(e){} if (ps.length) return projectsBase(r) }
  const ex = S.ideas.slice(0, 3), i0 = ex[0] || {name: "Moon lamp", kw: "moon lamp"};
  const tasks = [["Check Google searches for the last 12 months", 1], ["Compare 5 Daraz listings and their offers", 1], ["Ask 2 suppliers for price and MOQ", 0], ["Order 20 pieces as a small test", 0]];
  $("#app").innerHTML = `<section class="hero hero-c rs-hero">${doodles([["box", "8%", "24%", 52, "c1", -8], ["star", "88%", "20%", 28, "c2", 0, 1], ["truck", "84%", "64%", 50, "c3", 4, 2], ["tag", "12%", "68%", 40, "c2", 10, 1.5]])}<span class="glow-b"></span>
      <div class="wrap"><div><span class="tag">${icon("folder", 14)} Projects</span>
        <h1>Keep every product idea <span class="hl">in one place</span></h1>
        <p class="lead">Save a research, add competitors, supplier quotes, notes and tasks. Your project saves by itself, so you can come back any time.</p>
        <div class="row" style="justify-content:center">${S.me ? `<a class="btn g big" href="#/research">${icon("flask", 18)} Start your first research</a>` : `<button class="btn g big" id="pj-su">Create free account</button><a class="btn w big" href="#/research">Try a research first</a>`}</div>
        ${S.me ? "" : `<p class="mut" style="margin-top:12px">${icon("check", 14)} Free plan saves 3 projects. No card needed.</p>`}</div></div></section>
    <section class="sec band" style="padding:72px 0"><div class="wrap"><div class="sec-h"><h2>What a project looks like</h2><p>An example. Yours fills in from your own research.</p></div>
      <div class="pj-demo">
        <div class="card pj-main"><div class="pk-top"><span class="pk-ph">${photo(i0.photo, i0.name)}</span><div><span class="tag g">Go</span><h3>${esc(i0.name)}</h3><span class="mut">Research · ${esc(cname(S.country))} · step 4 of 7</span></div><div class="pj-score"><b>83</b><small>Opportunity</small></div></div>
          <div class="pj-steps">${["Overview", "Demand", "Timing", "Competitors", "Customer voice", "Sourcing", "Decision"].map((s, k) => `<span class="${k < 3 ? "done" : k === 3 ? "on" : ""}">${k < 3 ? icon("check", 12) : k + 1}<em>${s}</em></span>`).join("")}</div>
          <h4 style="margin:18px 0 8px">Tasks</h4>${tasks.map(x => `<div class="pj-t ${x[1] ? "ok" : ""}"><span>${x[1] ? icon("check", 12) : ""}</span>${esc(x[0])}</div>`).join("")}</div>
        <div class="pj-side">
          <div class="card"><h4>Competitors</h4>${[["Shop A", "৳1,350", "Free delivery Dhaka"], ["Shop B", "৳1,190", "Cash on delivery"], ["Shop C", "৳1,620", "Gift box"]].map(c => `<div class="pj-c"><b>${c[0]}</b><span>${c[1]}</span><small>${c[2]}</small></div>`).join("")}</div>
          <div class="card"><h4>Supplier quotes</h4><div class="pj-c"><b>Supplier 1</b><span>$3.20</span><small>MOQ 50 · 14 days</small></div><div class="pj-c"><b>Supplier 2</b><span>$2.85</span><small>MOQ 100 · 21 days</small></div></div>
          <div class="card pj-note"><h4>Notes</h4><p class="mut">Buyers complain the stand breaks. Offer a stronger stand and say it in the ad.</p></div>
        </div></div></div></section>
    <section class="sec" style="padding:72px 0"><div class="wrap"><div class="grid g3">
      ${[["save", "Saves by itself", "Every note, quote and task is saved the moment you type it."], ["printer", "One-click report", "Print or save a clean report with sources for partners or investors."], ["chat", "Ask AI inside", "The AI sees your project and answers with its numbers."]].map(x => `<div class="card s7c"><span class="ic">${icon(x[0], 20)}</span><b>${x[1]}</b><span class="mut">${x[2]}</span></div>`).join("")}
    </div></div></section>`;
  const b = $("#pj-su"); if (b) b.onclick = () => auth("signup", "Create a free account to save research as projects.");
};
Object.assign(IP, {save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/>'});

/* ---------- ASK AI: full chat app (history sidebar, clean thread, composer at the bottom) ---------- */
const CH = {
  all(){ let a = ls.get("chats2", null); if (!a){ const old = ls.get("chat", []); a = old.length ? [{id: "c" + Date.now(), title: (old.find(m => m.role === "user") || {}).content || "Chat", t: Date.now(), m: old}] : []; ls.set("chats2", a) } return a },
  save(a){ ls.set("chats2", a.slice(0, 40)) },
  cur: null
};
const chatTitle = s => (s || "New chat").replace(/\s+/g, " ").slice(0, 48);
function askView2(r){
  const L = S.lang === "bn";
  let chats = CH.all(); if (!CH.cur || !chats.find(c => c.id === CH.cur)) CH.cur = null;
  const conv = () => chats.find(c => c.id === CH.cur);
  const SUG = L ? [["flame", "এখন কী trending?", "এখন কোন প্রোডাক্ট trending?"], ["coin", "৫০ হাজার টাকায় শুরু", "৫০ হাজার টাকায় শীতে কী বিক্রি করব?"], ["lamp", "Moon lamp কি চলবে?", "Moon lamp কি এখন ভালো চলবে?"], ["tag", "লাভ হিসাব", "৳৪৫০ কেনা, ৳৯৯০ বিক্রি, ডেলিভারি ৳৮০ হলে লাভ কত?"]]
    : [["flame", "What is trending now?", "What products are trending right now?"], ["coin", "Start with ৳50,000", "What should I sell this winter with ৳50,000?"], ["lamp", "Is a moon lamp worth it?", "Is a moon lamp worth selling now?"], ["tag", "Work out my profit", "I buy at ৳450 and sell at ৳990, delivery ৳80. What is my profit?"]];
  $("#app").innerHTML = `<section class="cx">
    <aside class="cx-side" id="cxs"><button class="btn g cx-new" id="cxn">${icon("plus", 16)} ${L ? "নতুন চ্যাট" : "New chat"}</button>
      <div class="cx-list" id="cxl"></div>
      <div class="cx-foot"><div class="cx-cred">${S.me ? `${icon("sparkle", 14)} ${L ? "AI উত্তর এই মাসে" : "AI answers this month"}: <b>${S.ai ? S.ai.limit : 0}</b>` : `<a href="#" id="cxl-in">${L ? "লগইন করুন" : "Log in"}</a> ${L ? "চ্যাট সেভ করতে" : "to ask the AI"}`}</div></div></aside>
    <div class="cx-main"><div class="cx-top"><button class="cx-burger" id="cxb" aria-label="Chats">${icon("grid", 18)}</button><b id="cxt"></b><span class="tag ${S.ai && S.ai.on ? "g" : "y"}">${S.ai && S.ai.on ? "AI connected" : "Research engine"}</span></div>
      <div class="cx-scroll" id="cxm"></div>
      <form class="cx-comp" id="cxf"><div class="cx-box"><textarea id="cxi" rows="1" placeholder="${L ? "প্রোডাক্ট, দাম বা প্ল্যান নিয়ে প্রশ্ন করুন…" : "Ask about products, prices or your plan…"}"></textarea>
        <button class="cx-send" aria-label="Send">${icon("send", 18)}</button></div>
        <p class="cx-note">${S.ai && S.ai.on ? "" : (L ? "AI এখনো যুক্ত নয়: উত্তর আসছে রিসার্চ ইঞ্জিন থেকে। " : "AI not connected yet: answers come from the research engine. ")}${L ? "সংখ্যা শুধু লাইভ ডেটা থেকে।" : "Numbers only come from live data, with sources."}</p></form></div></section>`;
  const list = () => {
    const today = new Date().toDateString();
    const groups = [[L ? "আজ" : "Today", chats.filter(c => new Date(c.t).toDateString() === today)], [L ? "আগের" : "Earlier", chats.filter(c => new Date(c.t).toDateString() !== today)]];
    $("#cxl").innerHTML = chats.length ? groups.filter(g => g[1].length).map(g => `<div class="cx-g">${g[0]}</div>` + g[1].map(c => `<div class="cx-item ${c.id === CH.cur ? "on" : ""}" data-id="${c.id}"><span>${esc(chatTitle(c.title))}</span><button data-del="${c.id}" aria-label="Delete chat">${icon("trash", 14)}</button></div>`).join("")).join("")
      : `<p class="mut cx-empty">${L ? "আপনার চ্যাটগুলো এখানে থাকবে।" : "Your chats will show here."}</p>`;
    $$("#cxl .cx-item").forEach(el => el.onclick = e => { if (e.target.closest("[data-del]")) return; CH.cur = el.dataset.id; $("#cxs").classList.remove("open"); draw(); list() });
    $$("#cxl [data-del]").forEach(b => b.onclick = () => { chats = chats.filter(c => c.id !== b.dataset.del); CH.save(chats); if (CH.cur === b.dataset.del) CH.cur = null; draw(); list() });
  };
  const calls = m => m.calls && m.calls.length ? `<div class="cx-tools">${m.calls.map(c => `<span>${icon("check", 12)} ${esc(c.name.replace(/_/g, " "))}${c.args && c.args.product ? ": " + esc(c.args.product) : ""}</span>`).join("")}${m.calls.filter(c => c.name === "research_product" && c.args && c.args.product).slice(0, 1).map(c => `<a href="#/research?q=${encodeURIComponent(c.args.product)}">${L ? "রিসার্চ খুলুন" : "Open research"} →</a>`).join("")}</div>` : "";
  const draw = (typing) => {
    const c = conv(); $("#cxt").textContent = c ? chatTitle(c.title) : (L ? "AI-কে জিজ্ঞেস" : "Ask AI");
    if (!c || !c.m.length){
      $("#cxm").innerHTML = `<div class="cx-hello">${doodles([["star", "12%", "18%", 24, "c2", 0], ["chart", "82%", "22%", 46, "c1", 0, 1], ["bag", "78%", "70%", 40, "c3", -8, 2]])}
        <img src="/static/brand/icon-96.png" alt="" width="56" height="56"><h1>${L ? "আজ কী নিয়ে রিসার্চ করবেন?" : "What do you want to research today?"}</h1>
        <p class="mut">${L ? "উত্তর দেওয়ার আগে লাইভ ডেটা চেক করে, কোন টুল ব্যবহার করেছে দেখায়, আর যা জানে না তা বলে দেয়।" : "It checks live data before it answers, shows which tools it used, and says what it does not know."}</p>
        <div class="cx-sug">${SUG.map(s => `<button class="cx-card" data-q="${esc(s[2])}"><span class="ic">${icon(s[0], 18)}</span><b>${esc(s[1])}</b><small>${esc(s[2])}</small></button>`).join("")}</div></div>`;
      $$(".cx-card").forEach(b => b.onclick = () => send(b.dataset.q));
    } else {
      $("#cxm").innerHTML = `<div class="cx-thread">${c.m.map(m => m.role === "user" ? `<div class="cx-u"><div>${esc(m.content)}</div></div>`
        : `<div class="cx-a"><span class="cx-av"><img src="/static/brand/icon-64.png" alt="" width="28" height="28"></span><div class="cx-body">${md(m.content)}${calls(m)}<div class="cx-act"><button data-copy="${esc(m.content)}" title="Copy">${icon("copy", 14)} ${L ? "কপি" : "Copy"}</button></div></div></div>`).join("")}
        ${typing ? `<div class="cx-a"><span class="cx-av"><img src="/static/brand/icon-64.png" alt="" width="28" height="28"></span><div class="cx-body"><div class="cx-think"><span></span><span></span><span></span> ${L ? "লাইভ ডেটা চেক করছি…" : "Checking live data…"}</div></div></div>` : ""}</div>`;
      $$("[data-copy]").forEach(b => b.onclick = () => { try { navigator.clipboard.writeText(b.dataset.copy); toastBase(L ? "কপি হয়েছে" : "Copied") } catch(e){} });
    }
    const sc = $("#cxm"); sc.scrollTop = sc.scrollHeight;
  };
  const ta = $("#cxi");
  const grow = () => { ta.style.height = "auto"; ta.style.height = Math.min(200, ta.scrollHeight) + "px" };
  const send = async text => {
    text = (text || ta.value).trim(); if (!text) return;
    if (!S.me) return auth("signup", L ? "AI-কে প্রশ্ন করতে ফ্রি অ্যাকাউন্ট খুলুন।" : "Create a free account to ask the AI. Free accounts get AI answers every month.");
    let c = conv(); if (!c){ c = {id: "c" + Date.now(), title: text, t: Date.now(), m: []}; chats.unshift(c); CH.cur = c.id }
    c.m.push({role: "user", content: text}); c.t = Date.now(); ta.value = ""; grow(); CH.save(chats); list(); draw(true);
    try {
      const r2 = await api("/api/assistant", {method: "POST", body: JSON.stringify({messages: c.m.map(m => ({role: m.role, content: m.content})).slice(-12), country: S.country, currency: S.cur, lang: S.lang})});
      c.m.push({role: "assistant", content: r2.reply, calls: r2.calls});
    } catch(e){ c.m.pop(); ta.value = text; if (!c.m.length){ chats = chats.filter(x => x !== c); CH.cur = null }
      if (e.code === 401) auth("signup", e.message); else if (e.code === 402) upgrade(e.message); else toastBase(e.message) }
    CH.save(chats); list(); draw();
  };
  $("#cxf").onsubmit = e => { e.preventDefault(); send() };
  ta.oninput = grow; ta.onkeydown = e => { if (e.key === "Enter" && !e.shiftKey){ e.preventDefault(); send() } };
  $("#cxn").onclick = () => { CH.cur = null; $("#cxs").classList.remove("open"); draw(); list(); ta.focus() };
  $("#cxb").onclick = () => $("#cxs").classList.toggle("open");
  const li = $("#cxl-in"); if (li) li.onclick = e => { e.preventDefault(); auth("login") };
  list(); draw();
  const q = r.q.get("q"); if (q){ history.replaceState(null, "", "#/ask"); send(q) }
}
VIEWS.ask = askView2;
Object.assign(IP, {copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>'});
const renderBase3 = render;
render = function(){ renderBase3(); document.body.classList.toggle("ask-page", route().name === "ask") };

/* ---------- PRICING: cleaner plan cards (button first, then what you get), comparison table, FAQ ---------- */
const PLAN_SUB = {free: "To try it and check a few products", pro: "For new and growing online sellers", business: "For agencies, teams and big catalogues"};
plansHTML = function(){
  if (!S.plans) return "";
  const P = S.plans.plans, cur = S.me ? S.me.plan : null;
  const feats = {free: [`${P.free.searches_per_day} product checks a day`, `${P.free.ideas} product ideas`, `${P.free.ai_per_month || 0} AI answers a month`, `${P.free.projects || 0} saved research projects`, "Full analysis: trend, prices, supplier cost", "Profit calculator and ad copy"],
    pro: [`${P.pro.searches_per_day} product checks a day`, `All ${S.ideasTotal || 40}+ product ideas`, `${P.pro.ai_per_month} AI answers a month`, `${P.pro.projects} research projects`, "Full season calendar", "Everything in Free"],
    business: [`${P.business.searches_per_day} product checks a day`, `${P.business.ai_per_month} AI answers a month`, `${P.business.projects} research projects`, `Shortlist up to ${P.business.saved} products`, "Priority email support", "Everything in Pro"]};
  const card = (k, best) => `<div class="pl ${best ? "pl-best" : ""}">${best ? `<span class="pl-badge">${icon("star", 12)} Most popular</span>` : ""}
      <div class="pl-h"><span class="pl-ic">${icon(k === "free" ? "seed" : k === "pro" ? "rocket" : "users", 20)}</span><div><h3>${esc(P[k].name)}</h3><p>${PLAN_SUB[k]}</p></div></div>
      <div class="pl-p"><b>${planPrice(k)}</b>${S.plans.prices[k].USD ? `<span>/ month</span>` : `<span>forever</span>`}</div>
      ${cur === k ? `<span class="btn pl-btn" style="cursor:default">Your current plan</span>` : `<button class="btn pl-btn ${best ? "g" : "w"}" data-plan="${k}">${k === "free" ? (S.me ? "Included" : "Start free") : "Get " + esc(P[k].name)}</button>`}
      <div class="pl-sep"><span>What you get</span></div>
      <ul>${feats[k].map(f => `<li>${icon("check", 14)}<span>${f}</span></li>`).join("")}</ul></div>`;
  return `<div class="pls">${card("free")}${card("pro", true)}${card("business")}</div>`;
};
function pricing2(){
  const P = S.plans ? S.plans.plans : null;
  const row = (label, key, fmt) => `<tr><td>${label}</td>${["free", "pro", "business"].map(k => `<td>${fmt ? fmt(P[k][key], k) : esc(P[k][key])}</td>`).join("")}</tr>`;
  const yes = v => v ? `<span class="ok">${icon("check", 14)}</span>` : `<span class="no">–</span>`;
  $("#app").innerHTML = `<section class="hero hero-c rs-hero">${doodles([["coin", "8%", "26%", 0, "c1"], ["tag", "86%", "18%", 44, "c2", 12, 1], ["star", "14%", "70%", 26, "c2", 0, 1.5], ["chart", "82%", "64%", 52, "c1", 0, 2]].filter(x => DOOD[x[0]]))}<span class="glow-b"></span>
      <div class="wrap"><div><span class="tag">${icon("card", 14)} Pricing</span><h1>Start free. <span class="hl">Upgrade when it pays.</span></h1>
        <p class="lead">One good product decision pays for a whole year. No contract, cancel any time.</p>
        <div class="cur-sw" role="group" aria-label="Currency">${["BDT", "USD"].map(c => `<button data-cur="${c}" class="${(S.cur === c || (c === "USD" && S.cur !== "BDT")) ? "on" : ""}">${c === "BDT" ? "৳ Taka" : "$ Dollar"}</button>`).join("")}</div></div></div></section>
    <section class="sec" style="padding:20px 0 72px"><div class="wrap">${plansHTML()}
      <div class="trust3">${[["wallet", "Pays for itself", "Avoiding one box of dead stock saves more than a year of Pro."], ["lock", "Secure payment", "The payment provider handles your card. We never see it."], ["undo", "Cancel any time", "No contract. Your plan runs to the end of the paid month."]].map(x => `<div><span class="ic">${icon(x[0], 18)}</span><div><b>${x[1]}</b><p class="mut">${x[2]}</p></div></div>`).join("")}</div></div></section>
    ${P ? `<section class="sec band" style="padding:72px 0"><div class="wrap"><div class="sec-h"><h2>Compare the plans</h2><p>Every plan has the full analysis. Bigger plans check more products and keep more research.</p></div>
      <div class="card cmp-wrap"><table class="cmp"><thead><tr><th></th><th>Free</th><th class="hot">Pro</th><th>Business</th></tr></thead><tbody>
        ${row("Product checks a day", "searches_per_day")}${row("Product ideas", "ideas", v => v >= 999 ? "All" : v)}${row("AI answers a month", "ai_per_month")}${row("Research projects", "projects")}
        ${row("Shortlist", "saved")}${row("Product Finder results", "finder")}${row("Review videos", "videos", yes)}
        <tr><td>Season calendar</td><td>Partly</td><td>${yes(1)}</td><td>${yes(1)}</td></tr><tr><td>Printable reports</td><td>${yes(1)}</td><td>${yes(1)}</td><td>${yes(1)}</td></tr>
        <tr><td>Priority support</td><td>${yes(0)}</td><td>${yes(0)}</td><td>${yes(1)}</td></tr></tbody></table></div></div></section>` : ""}
    <section class="sec" style="padding:72px 0"><div class="wrap"><div class="faq2"><div><h2>Questions before you start</h2><p class="mut" style="font-size:16px;margin-top:10px">Still unsure? Start free, it takes a minute and needs no card.</p><a class="btn g" style="margin-top:18px" href="#/login?m=signup">Create free account</a></div>
      <div class="faq">${FAQ.map(f => `<details><summary>${esc(f[0])}</summary><p>${esc(f[1])}</p></details>`).join("")}</div></div></div></section>`;
  bindPlans();
  $$("[data-cur]").forEach(b => b.onclick = () => { S.cur = b.dataset.cur; ls.set("cur", S.cur); pricing2(); head() });
}
VIEWS.pricing = pricing2;

/* ---------- DASHBOARD + ADMIN: app layout with a side menu ---------- */
function shellNav(active){
  const L = [["dashboard", "grid", t("dash")], ["research", "flask", "Research"], ["projects", "folder", "Projects"], ["saved", "bookmark", "Shortlist"], ["ask", "chat", "Ask AI"], ["trending", "trend", "Trending"], ["finder", "compass", "Find products"]];
  const B = [["pricing", "card", "Plans"], ["setup", "refresh", "Data setup"]].concat(S.admin ? [["admin", "shield", t("admin")]] : []);
  const a = x => `<a href="#/${x[0]}" class="${active === x[0] ? "on" : ""}">${icon(x[1], 18)}<span>${x[2]}</span></a>`;
  return `<aside class="sh-nav"><div class="sh-me"><span class="sh-av">${esc(((S.me && (S.me.name || S.me.email)) || "?")[0].toUpperCase())}</span><div><b>${esc(S.me ? (S.me.name || S.me.email.split("@")[0]) : "")}</b><small>${esc(S.me && S.plans ? S.plans.plans[S.me.plan].name + " plan" : "")}</small></div></div>
    <nav>${L.map(a).join("")}</nav><nav class="sh-b">${B.map(a).join("")}</nav>
    ${S.me && S.me.plan === "free" && !S.admin ? `<div class="sh-up"><b>Upgrade to Pro</b><span>60 checks a day and every idea.</span><a class="btn sm g" href="#/pricing">See plans</a></div>` : ""}</aside>`;
}
for (const k of ["dashboard", "admin"]){
  const base = VIEWS[k];
  VIEWS[k] = async r => {
    await base(r);
    const sec = $("#app > section.dash"); if (!sec || !S.me) return;
    const inner = sec.querySelector(".wrap");
    sec.outerHTML = `<section class="sh">${shellNav(k)}<div class="sh-main" id="shm"></div></section>`;
    $("#shm").appendChild(inner); inner.classList.add("sh-wrap");
    const s = $("#shm .dash, #shm"); if (s) s.querySelectorAll(".grid.g4 .kpi").forEach((c, i) => c.classList.add("k" + (i % 4)));
  };
}
const renderBase4 = render;
render = function(){ renderBase4(); document.body.classList.toggle("shell-page", ["dashboard", "admin"].includes(route().name) && !!S.me) };
Object.assign(IP, {wallet: IP.wallet || '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M16 12h2M3 9h18"/>', lock: IP.lock || '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', undo: IP.undo || '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>'});

/* ================= ADMIN: separate login, first-admin setup, API keys page ================= */
async function adminLoginView(r){
  let st = {has_admin: true}; try { st = await api("/api/admin/status") } catch(e){}
  if (st.is_admin){ location.hash = "#/admin"; return }
  const setup = false;   // the admin account is seeded from ADMIN_EMAIL / ADMIN_PASSWORD on the API
  $("#app").innerHTML = `<section class="auth adm">
    <div class="auth-l adm-l">${doodles([["chart", "80%", "16%", 50, "c1", 0], ["box", "10%", "64%", 44, "c3", -8, 1], ["star", "84%", "60%", 24, "c2", 0, 2]])}<span class="glow-b"></span>
      <a class="logo light" href="#/"><i><img src="/static/brand/icon-96.png" alt="" width="34" height="34"></i><span>Product <em>Radar</em></span></a>
      <div class="auth-copy"><span class="adm-tag">${icon("shield", 14)} Admin console</span><h1>Run the whole app <span>from one place.</span></h1>
        <p>Users and plans, API keys, live data, usage and AI cost. No code and no .env editing.</p>
        <ul class="adm-list">${["Add and test every API key in the browser", "Refresh live data with one click", "Change any user's plan or make them admin", "See checks, sign-ups, AI usage and top searches"].map(x => `<li>${icon("check", 14)}${x}</li>`).join("")}</ul></div></div>
    <div class="auth-r"><a class="back" href="#/">${icon("arrow", 14)} Back to the site</a>
      <form class="auth-f" id="admf" novalidate>
        <span class="adm-ic">${icon("shield", 22)}</span>
        <h2>${setup ? "Create the admin account" : "Admin log in"}<span class="dot">.</span></h2>
        <p class="mut">${setup ? "No admin exists yet. The account you create here controls the app. You can add more admins later." : "Only admin accounts can open the console."}</p>
        ${setup ? `<label class="field">Your name<input name="name" autocomplete="name" placeholder="Tareen"></label>` : ""}
        <label class="field">Email<input name="email" type="email" required autocomplete="email" placeholder="admin@yourdomain.com"></label>
        <label class="field">Password<span class="pw"><input name="password" type="password" required minlength="8" autocomplete="${setup ? "new-password" : "current-password"}" placeholder="${setup ? "At least 8 characters" : "Your password"}"><button type="button" id="pwt2">Show</button></span></label>
        <p class="err hide" id="ae2" role="alert"></p>
        <button class="btn g big" type="submit">${setup ? "Create admin account" : "Log in to the console"}</button>
        <p class="mut sw">Not an admin? <a href="#/login?m=login">Normal log in</a></p></form></div></section>`;
  $("#pwt2").onclick = () => { const i = $("#admf input[name=password]"), s = i.type === "password"; i.type = s ? "text" : "password"; $("#pwt2").textContent = s ? "Hide" : "Show" };
  $("#admf").onsubmit = async e => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)), err = $("#ae2"), b = e.target.querySelector("button[type=submit]");
    if (!/^\S+@\S+\.\S+$/.test(f.email || "") || (f.password || "").length < 8){ err.textContent = "Type a real email and a password of at least 8 characters."; return err.classList.remove("hide") }
    b.disabled = true; b.textContent = "Please wait…";
    try { await api(setup ? "/api/admin/setup" : "/api/admin/login", {method: "POST", body: JSON.stringify(f)}); await loadMe(); location.hash = setup ? "#/apikeys" : "#/admin"; toastBase(setup ? "Admin account created. Add your API keys next." : "Welcome back.") }
    catch(x){ err.textContent = x.message; err.classList.remove("hide"); b.disabled = false; b.textContent = setup ? "Create admin account" : "Log in to the console" }
  };
}
VIEWS.adminlogin = adminLoginView;

/* gate: admin pages send non-admins to the admin log in */
for (const k of ["admin"]){
  const base = VIEWS[k];
  VIEWS[k] = async r => { if (!S.admin){ location.hash = "#/adminlogin"; return } return base(r) };
}

const KEYGROUPS = [
  {g: "serpapi", icon: "trend", name: "Google Trends + Google Shopping", by: "SerpApi", need: "Most important",
   unlocks: "Live trend numbers, the candle and season charts, the Trending ranking and prices outside Bangladesh.",
   steps: ["Go to serpapi.com and create a free account (250 searches a month free).", "Open your dashboard and copy your Private API Key.", "Paste it below, press Save, then press Test."], link: ["https://serpapi.com/manage-api-key", "Open SerpApi"], test: true},
  {g: "aliexpress", icon: "bag", name: "AliExpress supplier prices and photos", by: "AliExpress Affiliate API", need: "Recommended",
   unlocks: "Supplier prices, order counts and most product photos. You also earn affiliate commission.",
   steps: ["Go to portals.aliexpress.com and join the affiliate program.", "Apply for API access. Approval can take a few days.", "In the app console copy the App Key and App Secret.", "Copy your Tracking ID from the tracking ID page.", "Paste all three below, press Save, then press Test."], link: ["https://portals.aliexpress.com", "Open AliExpress Portals"], test: true},
  {g: "ai", icon: "chat", name: "AI assistant", by: "Any OpenAI-compatible provider", need: "Recommended",
   unlocks: "Written answers in Ask AI and review analysis. Without it, the research engine still answers with its own summary.",
   steps: ["Pick a provider below. Gemini has a free tier; OpenAI is pay as you go.", "Create an API key on the provider's site and paste it below.", "Type the model name exactly as the provider's documentation shows it.", "Press Save, then press Test."], link: ["https://aistudio.google.com/apikey", "Get a Gemini key"], link2: ["https://platform.openai.com/api-keys", "Get an OpenAI key"], test: true, presets: true},
  {g: "youtube", icon: "video", name: "YouTube review videos", by: "YouTube Data API v3", need: "Optional",
   unlocks: "Review videos on the research page. Free daily quota.",
   steps: ["Open console.cloud.google.com and create a project.", "Go to APIs & Services, Library, search YouTube Data API v3 and press Enable.", "Go to Credentials, Create credentials, API key, and copy it.", "Paste it below, press Save, then press Test."], link: ["https://console.cloud.google.com/apis/library/youtube.googleapis.com", "Open Google Cloud"], test: true},
  {g: "daraz", icon: "store", name: "Daraz (Bangladesh)", by: "No key needed", need: "On by default",
   unlocks: "Bangladesh market prices and photos. Experimental: Daraz has no official data API, so you can switch it off.",
   steps: ["Nothing to sign up for. Turn it on or off with the switch."], test: true},
  {g: "ebay", icon: "globe", name: "eBay listings", by: "eBay Browse API", need: "Optional",
   unlocks: "Shows eBay listings for comparison. eBay's rules don't allow using its prices in calculations.",
   steps: ["Go to developer.ebay.com and create an account.", "Open Application Keys and create a Production keyset.", "Copy the App ID and the Cert ID, paste them below, press Save, then Test."], link: ["https://developer.ebay.com/my/keys", "Open eBay Developers"], test: true},
  {g: "general", icon: "refresh", name: "Live data settings", by: "How often the app updates", need: "",
   unlocks: "Which countries the Trending page follows and how often data refreshes. One Bangladesh refresh uses about 8 SerpApi searches.", steps: []}
];
const AI_PRESETS = [["Google Gemini", "https://generativelanguage.googleapis.com/v1beta/openai"], ["OpenAI", "https://api.openai.com/v1"], ["Groq", "https://api.groq.com/openai/v1"], ["OpenRouter", "https://openrouter.ai/api/v1"]];
async function apiKeysView(){
  if (!S.admin){ location.hash = "#/adminlogin"; return }
  $("#app").innerHTML = `<section class="sh">${shellNav("apikeys")}<div class="sh-main"><div class="wrap sh-wrap"><div class="card"><div class="skel"></div></div></div></div></section>`;
  let F; try { F = (await api("/api/admin/settings")).fields } catch(e){ $(".sh-wrap").innerHTML = `<div class="card empty">${esc(e.message)}</div>`; return }
  const by = k => F.find(f => f.key === k);
  const grpOn = g => g === "daraz" ? by("DARAZ_ENABLED").value !== "0" : g === "aliexpress" ? by("ALI_APP_KEY").set && by("ALI_APP_SECRET").set : g === "ai" ? by("AI_API_KEY").set && by("AI_MODEL").set : g === "ebay" ? by("EBAY_CLIENT_ID").set && by("EBAY_CLIENT_SECRET").set : g === "general" ? null : F.filter(f => f.group === g).every(f => f.set);
  const main = KEYGROUPS.filter(x => x.g !== "general"), on = main.filter(x => grpOn(x.g)).length;
  const field = f => {
    if (["DARAZ_ENABLED", "AUTO_REFRESH"].includes(f.key)) return `<label class="sw-row"><span>${esc(f.label.replace(/ \(1 = on, 0 = off\)/, ""))}</span><input type="checkbox" class="tgl" data-k="${f.key}" ${f.value !== "0" ? "checked" : ""}></label>`;
    return `<label class="field kf">${esc(f.label)}<span class="pw"><input data-k="${f.key}" ${f.secret ? 'type="password" autocomplete="off"' : 'type="text"'} value="${f.secret ? "" : esc(f.value)}" placeholder="${f.secret ? (f.set ? f.masked + "  (saved — type to replace)" : "Paste here") : (f.key === "TRENDING_COUNTRIES" ? "BD" : f.key === "REFRESH_HOURS" ? "24" : f.key === "CACHE_HOURS" ? "12" : f.key === "AI_MODEL" ? "model name from your provider" : "")}">${f.secret ? `<button type="button" class="eye" aria-label="Show">Show</button>` : ""}</span>${f.secret && f.set ? `<button type="button" class="clr" data-clear="${f.key}">Remove saved key</button>` : ""}</label>`;
  };
  $(".sh-wrap").innerHTML = `<div class="ak-head"><div><div class="mut">${icon("shield", 14)} Admin</div><h2>API keys and live data</h2><p class="mut">Paste each key, press Save, then Test. Keys are stored in your app's database and work at once. No restart and no code.</p></div>
      <div class="ak-prog"><b>${on}<small> of ${main.length}</small></b><span>sources connected</span><u><i style="width:${on / main.length * 100}%"></i></u></div></div>
    <div class="ak-order">${icon("bulb", 16)} <span><b>Best order:</b> 1. SerpApi (charts and trends) · 2. AliExpress (photos and supplier prices, apply today because approval takes days) · 3. AI · 4. YouTube. eBay is optional.</span></div>
    ${KEYGROUPS.map(G => { const st = grpOn(G.g); return `<div class="card ak" data-g="${G.g}">
      <div class="ak-top"><span class="ic">${icon(G.icon, 20)}</span><div class="ak-t"><h3>${G.name}</h3><span class="mut">${G.by}${G.need ? ` · ${G.need}` : ""}</span></div>
        ${st === null ? "" : `<span class="tag ${st ? "g" : G.need === "Optional" ? "" : "r"}">${st ? "Connected" : "Not set"}</span>`}</div>
      <p class="ak-u">${G.unlocks}</p>
      ${G.steps.length ? `<details class="ak-how" ${st ? "" : "open"}><summary>How to get it</summary><ol>${G.steps.map(s => `<li>${s}</li>`).join("")}</ol>${G.link ? `<div class="row">${[G.link, G.link2].filter(Boolean).map(l => `<a class="btn sm w" href="${l[0]}" target="_blank" rel="noopener">${l[1]} ↗</a>`).join("")}</div>` : ""}</details>` : ""}
      ${G.presets ? `<div class="ak-pre"><span>Provider:</span>${AI_PRESETS.map(p => `<button type="button" class="chip ${by("AI_BASE_URL").value === p[1] ? "on" : ""}" data-pre="${p[1]}">${p[0]}</button>`).join("")}</div>` : ""}
      <div class="ak-f">${F.filter(f => f.group === G.g).map(field).join("")}</div>
      <div class="ak-b"><button class="btn g sm" data-save="${G.g}">${icon("check", 14)} Save</button>${G.test ? `<button class="btn w sm" data-test="${G.g}">Test connection</button>` : ""}<span class="ak-res" id="res-${G.g}"></span></div></div>` }).join("")}`;
  $$(".eye").forEach(b => b.onclick = () => { const i = b.previousElementSibling, s = i.type === "password"; i.type = s ? "text" : "password"; b.textContent = s ? "Hide" : "Show" });
  $$("[data-pre]").forEach(b => b.onclick = () => { $('.ak[data-g=ai] input[data-k=AI_BASE_URL]').value = b.dataset.pre; $$("[data-pre]").forEach(x => x.classList.toggle("on", x === b)) });
  const res = (g, ok, m) => { const el = $("#res-" + g); el.className = "ak-res " + (ok ? "ok" : "bad"); el.innerHTML = `${ok ? icon("check", 14) : "!"} ${esc(m)}` };
  $$("[data-save]").forEach(b => b.onclick = async () => {
    const g = b.dataset.save, body = {};
    $$(`.ak[data-g=${g}] [data-k]`).forEach(i => { const k = i.dataset.k, f = by(k);
      if (i.type === "checkbox") body[k] = i.checked ? "1" : "0";
      else if (f.secret){ if (i.value.trim()) body[k] = i.value.trim() }
      else body[k] = i.value.trim() });
    try { await api("/api/admin/settings", {method: "POST", body: JSON.stringify(body)}); res(g, true, "Saved. It works now, no restart needed."); setTimeout(apiKeysView, 900) } catch(e){ res(g, false, e.message) }
  });
  $$("[data-clear]").forEach(b => b.onclick = async () => { if (!confirm("Remove this saved key?")) return; await api("/api/admin/settings", {method: "POST", body: JSON.stringify({[b.dataset.clear]: ""})}); apiKeysView() });
  $$("[data-test]").forEach(b => b.onclick = async () => { const g = b.dataset.test; res(g, true, "Testing…"); try { const j = await api("/api/admin/test", {method: "POST", body: JSON.stringify({source: g === "aliexpress" ? "aliexpress" : g})}); res(g, j.ok, j.message || (j.ok ? "Works." : "Did not work.")) } catch(e){ res(g, false, e.message) } });
}
VIEWS.apikeys = apiKeysView;
SECTION.apikeys = "admin"; SECTION.adminlogin = "admin";

/* side menu gets the admin pages; admins land on the console */
const shellNavBase = shellNav;
shellNav = function(active){
  let h = shellNavBase(active);
  if (S.admin) h = h.replace(/<a href="#\/admin"[^>]*>[\s\S]*?<\/a>/, `<a href="#/admin" class="${active === "admin" ? "on" : ""}">${icon("shield", 18)}<span>Admin overview</span></a><a href="#/apikeys" class="${active === "apikeys" ? "on" : ""}">${icon("key", 18)}<span>API keys</span></a>`);
  return h;
};
Object.assign(IP, {key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M14 9l2 2"/>', bulb: IP.bulb || '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/>'});
const renderBase5 = render;
render = function(){ renderBase5(); const n = route().name; document.body.classList.toggle("shell-page", (["dashboard", "admin", "apikeys"].includes(n)) && !!S.me); document.body.classList.toggle("auth-page", n === "login" || n === "adminlogin") };

/* admin overview: one clear button to the API keys page */
const adminBase2 = VIEWS.admin;
VIEWS.admin = async r => { await adminBase2(r); const h = $(".sh-wrap > .row"); if (h && !$("#gokeys")) h.insertAdjacentHTML("beforeend", `<a class="btn g sm" id="gokeys" href="#/apikeys">${icon("key", 15)} Manage API keys</a>`) };
