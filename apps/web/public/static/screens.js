/* Product Radar screens: Product Finder, 7-step research workspace, AI assistant, projects, report.
   Uses helpers from app.js ($, esc, api, money, icon, gtag, S, t, COUNTRIES ...). */

Object.assign(IP, {
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>', flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M7 15h10"/>',
  folder: '<path d="M3 6h6l2 2h10v11H3z"/>', chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>', users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6 6 0 0 1 3.5 5.5"/>',
  send: '<path d="M4 12l16-8-6 16-2-6z"/>', printer: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>'});

Object.assign(W.en, {home: "Home", discover: "Discover", research: "Research", projects: "Projects", ask: "Ask AI",
  achieve: "What would you like to achieve?", a1: "Discover products", a1d: "5 questions, products that fit your budget", a2: "Deep research", a2d: "Check any product in 7 steps",
  a3: "Analyze competitors", a3d: "Prices, offers and where they are weak", a4: "Ask the AI assistant", a4d: "Plain answers backed by live data", cont: "Continue research"});
Object.assign(W.bn, {home: "হোম", discover: "খুঁজুন", research: "রিসার্চ", projects: "প্রজেক্ট", ask: "AI-কে জিজ্ঞেস",
  achieve: "আপনি কী করতে চান?", a1: "প্রোডাক্ট খুঁজে দিন", a1d: "৫টা প্রশ্ন, আপনার বাজেটে মানানসই প্রোডাক্ট", a2: "গভীর রিসার্চ", a2d: "যেকোনো প্রোডাক্ট ৭ ধাপে যাচাই",
  a3: "প্রতিযোগী বিশ্লেষণ", a3d: "দাম, অফার আর কোথায় তারা দুর্বল", a4: "AI সহকারীকে জিজ্ঞেস করুন", a4d: "লাইভ ডেটা দিয়ে সহজ উত্তর", cont: "রিসার্চ চালিয়ে যান"});

/* ---------- navigation: 5 sections (Master Plan) ---------- */
NAV.length = 0;
NAV.push(["finder", "compass"], ["research", "flask"], ["projects", "folder"], ["ask", "chat"], ["pricing", "card"]);
const NAVNAME = {finder: "discover", research: "research", projects: "projects", ask: "ask", pricing: "pricing"};
const SECTION = {finder: "finder", trending: "finder", ideas: "finder", season: "finder", research: "research", analyze: "research", projects: "projects", saved: "projects", report: "projects", ask: "ask", pricing: "pricing"};
head = function(){
  const r = SECTION[route().name] || route().name;
  $("#nav").innerHTML = NAV.map(n => `<a href="/${n[0]}" class="${r === n[0] ? "on" : ""}">${t(NAVNAME[n[0]])}</a>`).join("");
  $("#mnav").innerHTML = [["", "home", "home"]].concat(NAV.filter(n => n[0] !== "pricing")).map(n => `<a href="/${n[0]}" class="${(r || "home") === (n[0] || "home") ? "on" : ""}">${icon(n[1], 20)}<br>${esc(t(NAVNAME[n[0]] || n[2]))}</a>`).join("");
  $("#cur").innerHTML = CURS.map(c => `<option ${c === S.cur ? "selected" : ""}>${c}</option>`).join("");
  $$("#lang button").forEach(b => b.classList.toggle("on", b.dataset.l === S.lang));
  document.documentElement.lang = S.lang;
  $("#acct").innerHTML = S.me ? `<span class="tag ${S.me.plan === "free" ? "" : "y"}">${esc(S.plans.plans[S.me.plan].name)}</span> <button class="btn sm w" id="lo">${t("logout")}</button>`
    : `<button class="btn sm w" id="li">${t("login")}</button> <button class="btn sm g" id="su">${t("start")}</button>`;
  if ($("#lo")) $("#lo").onclick = async () => { await api("/api/logout", {method: "POST"}); await loadMe(); render() };
  if ($("#li")) $("#li").onclick = () => auth("login");
  if ($("#su")) $("#su").onclick = () => auth("signup");
};
const discoverTabs = a => `<div class="tabs dtabs">${[["finder", "Find for me"], ["trending", "Trending"], ["ideas", "Ideas"], ["season", "Season calendar"]].map(x => `<a class="${a === x[0] ? "on" : ""}" href="/${x[0]}">${x[1]}</a>`).join("")}</div>`;
for (const [k, fn] of [["trending", VIEWS.trending], ["ideas", VIEWS.ideas], ["season", VIEWS.season]]) {
  VIEWS[k] = async r => { await fn(r); const w = $("#app .wrap"); if (w && !$("#app .dtabs")) w.insertAdjacentHTML("afterbegin", discoverTabs(k)) };
}

/* ---------- small helpers ---------- */
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|\s)_(.+?)_(?=\s|$)/g, "$1<i>$2</i>").replace(/\[(.+?)\]/g, '<span class="cite">$1</span>')
  .split(/\n{2,}/).map(p => { let html = "", list = [];
    const flush = () => { if (list.length){ html += `<ul>${list.map(l => `<li>${l}</li>`).join("")}</ul>`; list = [] } };
    p.split("\n").forEach(l => { if (/^\s*(-|\*|\d+\.)\s/.test(l)) list.push(l.replace(/^\s*(-|\*|\d+\.)\s/, "")); else { flush(); if (l.trim()) html += `<p>${l}</p>` } });
    flush(); return html }).join("");
const cname = c => esc((COUNTRIES.find(x => x[0] === c) || [0, c])[1]);
const VCOL = {"Go": "rgba(43,229,154,.18)", "Test small": "rgba(255,194,75,.18)", "Skip for now": "rgba(255,85,119,.18)"};

/* ---------- PRODUCT FINDER ---------- */
const FQ = [
  ["channel", "Where will you sell?", [["facebook", "Facebook page"], ["website", "My website"], ["marketplace", "Daraz / Amazon"], ["shop", "Physical shop"], ["dropship", "Dropshipping"]]],
  ["budget", "How much can you put into your first product?", [["Low", "Small (under ৳50,000 / $400)"], ["Medium", "Medium (up to ৳2 lakh / $1,600)"], ["High", "Large (more than that)"]]],
  ["category", "What kind of products do you like?", [["", "I don't know, show me all"]].concat(Object.keys(CAT).map(c => [c, c]))],
  ["audience", "Who will buy?", [["", "Anyone"], ["women", "Women"], ["men", "Men"], ["parents", "Parents"], ["students", "Students"], ["office workers", "Office workers"], ["young people", "Young people"], ["gift buyers", "Gift buyers"], ["families", "Families"]]],
  ["risk", "How much risk is OK?", [["safe", "Safe: steady products, fewer surprises"], ["growth", "Growth: rising fast, more risk"]]]];
async function finderView(){
  const A = ls.get("finder", {}), step = Math.min(+(route().q.get("s") || 0), FQ.length);
  if (step < FQ.length){
    const [k, q, opts] = FQ[step];
    $("#app").innerHTML = `<section class="sec" style="padding-top:28px"><div class="wrap">${discoverTabs("finder")}
      <div class="card finder"><div class="mut">Question ${step + 1} of ${FQ.length}</div><div class="prog"><i style="width:${(step) / FQ.length * 100}%"></i></div>
      <h2 style="margin:14px 0 18px">${q}</h2><div class="opts ${opts.length > 6 ? "many" : ""}">${opts.map(o => `<button class="opt ${A[k] === o[0] ? "on" : ""}" data-v="${esc(o[0])}">${k === "category" && o[0] ? `<span class="mini">${catIcon(o[0])[0]}</span>` : ""}${esc(o[1])}</button>`).join("")}</div>
      <div class="row" style="margin-top:18px;justify-content:space-between">${step ? `<a class="btn w sm" href="/finder?s=${step - 1}">Back</a>` : "<span></span>"}<span class="mut">Country: ${cname(S.country)} · change it in Research</span></div></div></div></section>`;
    $$(".opt").forEach(b => b.onclick = () => { A[k] = b.dataset.v; ls.set("finder", A); go("/finder?s=" + (step + 1)) });
    return;
  }
  $("#app").innerHTML = `<section class="sec" style="padding-top:28px"><div class="wrap">${discoverTabs("finder")}<div id="fr"><div class="card"><div class="skel"></div><div class="skel" style="width:60%"></div></div></div></div></section>`;
  let d; try { d = await api("/api/finder", {method: "POST", body: JSON.stringify(Object.assign({country: S.country}, A))}) } catch(e){ $("#fr").innerHTML = `<div class="card empty">${esc(e.message)}</div>`; return }
  $("#fr").innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:16px"><div><h2>Products that fit you</h2><p class="mut" style="margin:4px 0 0">${esc([A.channel, A.budget && A.budget + " budget", A.category, A.audience, A.risk].filter(Boolean).join(" · "))} · ${cname(S.country)}</p></div><a class="btn w sm" href="/finder?s=0">Change answers</a></div>
    ${d.results.length ? d.results.map((r, i) => { const it = r.idea, L = r.listing; return `<article class="card fres">
      <div class="fimg">${L && L.image ? `<img src="${esc(L.image)}" alt="${esc(L.name || it.name)}" referrerpolicy="no-referrer" data-fb="noimg">` : noImg}</div>
      <div class="fbody"><div class="row" style="gap:8px"><span class="rank sm">${i + 1}</span><h3>${esc(S.lang === "bn" ? it.bn : it.name)}</h3></div>
        <div class="row" style="gap:6px;margin:8px 0">${r.season === "now" ? `<span class="tag g">In season</span>` : r.season === "soon" ? `<span class="tag y">Season soon</span>` : `<span class="tag">Off season</span>`}<span class="tag b">Budget: ${esc(it.budget)}</span>${it.dropship ? `<span class="tag p">Dropship OK</span>` : ""}${it.fragile ? `<span class="tag r">Fragile</span>` : ""}</div>
        <p style="margin:0 0 6px"><b>Why it fits you:</b></p><ul class="dl">${r.reasons.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
        <p style="margin:8px 0 0"><b>Why people buy:</b> ${esc(it.why)} ${gtag("C")}</p>
        ${L ? `<p class="mut" style="margin:6px 0 0">Example listing: ${esc(L.name)} · ${money(L.price, L.cur)} · ${esc(L.source)}</p>` : ""}
        <div class="row" style="margin-top:12px"><a class="btn sm g" href="/research?q=${encodeURIComponent(it.kw)}">Deep research</a><a class="btn sm w" href="/ask?q=${encodeURIComponent("Is " + it.name + " a good product to start with in " + cname(S.country) + "?")}">Ask AI</a></div></div></article>` }).join("")
      : `<div class="card empty"><b>No product fits all your answers</b>Try a larger budget or "Anyone" as buyer.</div>`}
    ${d.locked ? `<div class="card row" style="background:var(--yellow);justify-content:space-between"><b>${d.locked} more matches are in Pro.</b><a class="btn k sm" href="/pricing">Unlock all 10</a></div>` : ""}
    <p class="mut">Ranked by season (C, our guide) and Google Trends momentum (A) when connected. Always run Deep research before you buy stock.</p>`;
}

/* ---------- AI CHAT (shared by the panel and the full page) ---------- */
const CHAT = ls.get("chat", []);
function chatBox(el, opt){
  const ctxQ = opt.product || "";
  const hist = opt.product ? (S.wsChat = S.wsChat && S.wsChat.q === ctxQ ? S.wsChat : {q: ctxQ, m: []}).m : CHAT;
  const draw = () => {
    el.querySelector(".msgs").innerHTML = (hist.length ? hist : [{role: "assistant", content: opt.hello}]).map(m => `<div class="msg ${m.role}">${m.role === "assistant" ? md(m.content) : esc(m.content)}${m.calls && m.calls.length ? `<div class="calls">${m.calls.map(c => `<span class="tag ${c.ok ? "g" : "r"}">${icon("check", 12)} ${esc(c.name.replace(/_/g, " "))}${c.args && c.args.product ? ": " + esc(c.args.product) : ""}</span>`).join("")}${m.calls.filter(c => c.name === "research_product" && c.args && c.args.product).slice(0, 1).map(c => `<a class="tag b" href="/research?q=${encodeURIComponent(c.args.product)}">Open research</a>`).join("")}</div>` : ""}</div>`).join("");
    el.querySelector(".msgs").scrollTop = 1e9;
  };
  el.innerHTML = `<div class="msgs"></div><div class="chips">${opt.suggest.map(s => `<button class="chip">${esc(s)}</button>`).join("")}</div>
    <form class="ask"><textarea rows="2" placeholder="${S.lang === "bn" ? "প্রশ্ন লিখুন..." : "Ask anything about products, prices or your plan..."}"></textarea><button class="btn g" aria-label="Send">${icon("send", 18)}</button></form>
    <p class="mut small">${S.ai && S.ai.on ? "" : "AI not connected: answers come from the research engine. "}Numbers come only from live tools; AI ideas are marked as hypotheses.</p>`;
  const ta = el.querySelector("textarea"), send = async text => {
    text = (text || ta.value).trim(); if (!text) return;
    if (!S.me) return auth("signup", "Create a free account to ask the AI. Free accounts get 3 AI answers a month.");
    hist.push({role: "user", content: text}); ta.value = ""; draw();
    el.querySelector(".msgs").insertAdjacentHTML("beforeend", `<div class="msg assistant typing"><span></span><span></span><span></span> Checking live data…</div>`); el.querySelector(".msgs").scrollTop = 1e9;
    try {
      const r = await api("/api/assistant", {method: "POST", body: JSON.stringify({messages: hist.map(m => ({role: m.role, content: m.content})), product: ctxQ, country: S.country, currency: S.cur, lang: S.lang})});
      hist.push({role: "assistant", content: r.reply, calls: r.calls});
    } catch(e){
      hist.pop(); ta.value = text;
      if (e.code === 401) auth("signup", e.message); else if (e.code === 402) upgrade(e.message); else toast(e.message);
    }
    if (!opt.product) ls.set("chat", hist.slice(-20));
    draw();
  };
  el.querySelector(".ask").onsubmit = e => { e.preventDefault(); send() };
  ta.onkeydown = e => { if (e.key === "Enter" && !e.shiftKey){ e.preventDefault(); send() } };
  el.querySelectorAll(".chips .chip").forEach(b => b.onclick = () => send(b.textContent));
  draw();
  if (opt.ask) send(opt.ask);
}
function askView(r){
  $("#app").innerHTML = `<section class="sec" style="padding-top:28px"><div class="wrap" style="max-width:900px"><div class="row" style="justify-content:space-between"><h2>${icon("chat", 28)} ${t("ask")}</h2>${CHAT.length ? `<button class="btn sm w" id="clr">New chat</button>` : ""}</div>
    <p class="mut" style="margin:6px 0 16px">It researches live data before it answers, shows which tools it used, and tells you what it does not know.</p><div class="card chat big" id="cb"></div></div></section>`;
  if ($("#clr")) $("#clr").onclick = () => { CHAT.length = 0; ls.set("chat", []); askView(route()) };
  chatBox($("#cb"), {hello: S.lang === "bn" ? "আসসালামু আলাইকুম! কী বিক্রি করবেন, কোন প্রোডাক্ট কেমন চলবে, লাভ কত — যেকোনো প্রশ্ন করুন।" : "Hi! Ask me what to sell, whether a product is worth it, or how much profit you can make. I check live data first.",
    suggest: S.lang === "bn" ? ["৫০ হাজার টাকায় শীতে কী বিক্রি করব?", "Moon lamp কি এখন ভালো চলবে?", "এখন কোন প্রোডাক্ট trending?"] : ["What should I sell this winter with ৳50,000?", "Is a moon lamp worth selling now?", "What is trending right now?"],
    ask: r.q.get("q") || ""});
  if (r.q.get("q")) history.replaceState(null, "", "/ask");
}

/* ---------- RESEARCH WORKSPACE (7 steps, 3 zones) ---------- */
const STEPS = [["overview", "Overview"], ["demand", "Demand"], ["timing", "Timing"], ["competitors", "Competitors"], ["voice", "Customer voice"], ["cost", "Sourcing & cost"], ["decision", "Decision"]];
const WS = {};
async function researchView(r){
  const q = (r.q.get("q") || "").trim(), pid = r.q.get("pid");
  if (!q && !pid){
    let recent = [];
    if (S.me) try { recent = await api("/api/projects") } catch(e){}
    $("#app").innerHTML = `<section class="sec" style="padding-top:28px"><div class="wrap"><h2>${t("a2")}</h2><p class="mut" style="margin:6px 0 16px">${t("a2d")}: demand, timing, competitors, customer voice, cost and a clear decision.</p>${searchBox("")}
      ${recent.length ? `<h3 style="margin:28px 0 12px">${t("cont")}</h3><div class="grid g3">${recent.slice(0, 6).map(projCard).join("")}</div>` : ""}</div></section>`;
    bindSearch(); return;
  }
  Object.assign(WS, {q, pid: pid ? +pid : null, step: +(r.q.get("step") || 0), d: null, proj: {competitors: [], quotes: [], tasks: [], notes: {}, reviews: null}});
  if (WS.pid){ try { const p = await api("/api/projects/" + WS.pid); WS.q = p.q; S.country = p.country; Object.assign(WS.proj, p.data); if (!r.q.get("step")) WS.step = p.data.step || 0 } catch(e){ toast("Project not found"); WS.pid = null } }
  $("#app").innerHTML = `<section class="ws"><div class="ws-head wrap"><div class="row" style="justify-content:space-between;gap:12px">
      <div><div class="mut">Research · ${cname(S.country)}</div><h2 id="wsq">${esc(WS.q)}</h2></div>
      <div class="row"><span id="wsv"></span><button class="btn sm" id="wsave">${icon("folder", 16)} ${WS.pid ? "Saved" : "Save as project"}</button><button class="btn sm w" id="wrep">${icon("printer", 16)} Report</button></div></div></div>
    <div class="ws-grid wrap"><nav class="steps" id="wst"></nav><div class="ws-main" id="wsm"><div class="card"><div class="skel"></div><div class="skel" style="width:70%"></div><p class="mut">Checking Google Trends, marketplaces and suppliers…</p></div></div>
      <aside class="ws-ai" id="wsai"><div class="row" style="justify-content:space-between"><h3>${icon("chat", 18)} Ask AI</h3><button class="btn sm w aiclose" aria-label="Close">✕</button></div><div class="chat" id="wsc"></div></aside></div>
    <button class="btn k aifab" id="aifab">${icon("chat", 18)} Ask AI</button></section>`;
  $("#aifab").onclick = () => $("#wsai").classList.add("open"); $(".aiclose").onclick = () => $("#wsai").classList.remove("open");
  $("#wsave").onclick = saveProject; $("#wrep").onclick = () => { go(WS.pid ? "/report?pid=" + WS.pid : "/report?q=" + encodeURIComponent(WS.q)) };
  stepsNav();
  try { WS.d = await api(`/api/analyze?q=${encodeURIComponent(WS.q)}&country=${S.country}`); S.last = WS.d }
  catch(e){
    $("#wsm").innerHTML = e.code === 402 ? `<div class="card empty"><b>Daily limit reached</b>${esc(e.body.message)}<br><br><a class="btn g" href="/pricing">See plans</a></div>` : `<div class="card empty"><b>Could not check this product</b>${esc(e.message)}</div>`;
    return;
  }
  if (!WS.proj.tasks.length) WS.proj.tasks = WS.d.assessment.next_actions.map(x => ({text: x, done: false}));
  const A = WS.d.assessment;
  $("#wsv").innerHTML = `<span class="tag" style="background:${VCOL[A.verdict] || "var(--cell)"}">${esc(A.verdict)}</span> <span class="tag ${{High: "g", Medium: "y", Low: "r"}[A.confidence_label]}">Evidence: ${A.confidence_label}</span>`;
  chatBox($("#wsc"), {product: WS.q, hello: `Ask me anything about ${WS.q}. I can see this research.`,
    suggest: ["Why this verdict?", "What could go wrong?", "Write a Facebook post in Bangla", "Suggest a cheaper alternative"]});
  showStep(WS.step);
}
function stepsNav(){
  $("#wst").innerHTML = STEPS.map((s, i) => `<button data-st="${i}" class="${WS.step === i ? "on" : ""}"><b>${i + 1}</b><span>${s[1]}</span></button>`).join("");
  $$("[data-st]").forEach(b => b.onclick = () => showStep(+b.dataset.st));
}
let saveT;
function persist(patch){
  Object.assign(WS.proj, patch || {});
  if (!WS.pid) return;
  clearTimeout(saveT); saveT = setTimeout(() => api("/api/projects/" + WS.pid, {method: "PUT", body: JSON.stringify({data: Object.assign({}, WS.proj, {step: WS.step, snapshot: snap()})})}).catch(() => toast("Could not save")), 600);
}
const snap = () => WS.d && {verdict: WS.d.assessment.verdict, opportunity: WS.d.assessment.opportunity, confidence: WS.d.assessment.confidence_label, checked: WS.d.checked};
async function saveProject(){
  if (!S.me) return auth("signup", "Create a free account to save research as a project.");
  if (WS.pid) return toast("Already saved. Changes save by themselves.");
  try { const j = await api("/api/projects", {method: "POST", body: JSON.stringify({q: WS.q, country: S.country, data: Object.assign({}, WS.proj, {step: WS.step, snapshot: snap()})})}); WS.pid = j.id;
    $("#wsave").innerHTML = `${icon("folder", 16)} Saved`; history.replaceState(null, "", `/research?pid=${j.id}`); persist(); toast("Saved. Your notes, quotes and tasks now save by themselves.") }
  catch(e){ e.code === 402 ? upgrade(e.message) : toast(e.message) }
}
function showStep(i){
  WS.step = i; stepsNav(); persist();
  if (!WS.d) return;
  const d = WS.d, A = d.assessment, geo = d.country, idea = A.idea, mp = d.market_price, sp = d.supplier_price;
  const nav = `<div class="row stepnav">${i ? `<button class="btn w sm" data-go-st="${i - 1}">← ${STEPS[i - 1][1]}</button>` : "<span></span>"}${i < 6 ? `<button class="btn sm" data-go-st="${i + 1}">Next: ${STEPS[i + 1][1]} →</button>` : ""}</div>`;
  const sigRow = s => `<div class="sig ${s.score == null ? "na" : ""}"><span>${esc(s.name)}</span><u><i style="width:${s.score || 0}%;background:${s.score >= 70 ? "var(--green)" : s.score >= 50 ? "var(--yellow)" : "var(--red)"}"></i></u><span>${s.score == null ? "–" : s.score}</span></div><div class="mut sigx">${gtag(s.grade)} ${esc(s.note)}${s.source ? ` · ${esc(s.source)}` : ""}</div>`;
  const sig = k => A.signals.find(s => s.key === k);
  let h = "";
  if (i === 0){
    h = `<div class="card"><div class="verdict"><div class="score" style="background:${VCOL[A.verdict] || "var(--cell)"}">${A.opportunity == null ? "<b>?</b>" : `<div><b>${A.opportunity}</b>Opportunity</div>`}</div>
      <div><div class="vword">${esc(A.verdict)}</div><div class="row" style="margin-top:8px"><span class="tag ${{High: "g", Medium: "y", Low: "r"}[A.confidence_label]}">Evidence confidence: ${A.confidence_label} (${A.confidence}%)</span><span class="mut">${A.signals_used} of 5 signals with real data · checked ${ago(d.checked)}</span></div><p style="margin:8px 0 0">${esc(A.verdict_why)}</p></div></div>
      <div style="margin-top:16px">${A.signals.map(sigRow).join("")}</div>
      <details class="help"><summary>What do A, B, C and D mean?</summary><p><b>A Observed:</b> seen on a dated source. <b>B Calculated:</b> worked out with a formula. <b>C Estimate:</b> assumptions or our guide. <b>D AI hypothesis:</b> needs testing.</p></details></div>
      <div class="grid g3" style="margin-top:18px"><div class="card"><div class="mut">Typical market price</div><div class="big">${mp ? money(mp.median, mp.cur) : "–"}</div><div class="mut">${mp ? gtag("A") + esc(mp.source) : "No market source"}</div></div>
      <div class="card"><div class="mut">Typical supplier price</div><div class="big">${sp ? money(sp.median, sp.cur) : "–"}</div><div class="mut">${sp ? gtag("A") + "AliExpress" : "No supplier source"}</div></div>
      <div class="card"><div class="mut">Season</div><div class="big">${A.season_state ? {now: "In season", soon: "Starts soon", off: "Off season"}[A.season_state] : "–"}</div><div class="mut">${idea ? gtag("C") + "Season guide" : "Not in our guide"}</div></div></div>`;
  } else if (i === 1){
    h = `<div class="card"><h3>Is anyone looking for it?</h3>${sig("demand") ? sigRow(sig("demand")) : ""}<div class="embed" style="margin-top:12px"><iframe loading="lazy" title="Google Trends interest over time" src="${trendsURL("TIMESERIES", d.q, geo)}"></iframe></div>
      <p class="mut">Search interest is not sales. It shows curiosity; sales need a good price, trust and timing.</p></div>
      <div class="card" style="margin-top:18px"><h3>What people search with it</h3>${d.trends && d.trends.ok && d.trends.rising.length ? d.trends.rising.slice(0, 10).map(x => `<div class="row" style="justify-content:space-between;border-top:2px dashed var(--line);padding:7px 0"><a href="/research?q=${encodeURIComponent(x.q)}" style="font-weight:600">${esc(x.q)}</a><span class="tag ${/breakout/i.test(x.v) ? "r" : "y"}">${esc(x.v)}</span></div>`).join("") + `<p class="mut">${gtag("A")} Google Trends (SerpApi)</p>`
        : `<div class="embed" style="margin-top:12px"><iframe loading="lazy" title="Google Trends related queries" src="${trendsURL("RELATED_QUERIES", d.q, geo)}"></iframe></div>`}</div>`;
  } else if (i === 2){
    const pk = idea ? peaks(idea, geo) : [], m = new Date().getMonth();
    h = `<div class="card"><h3>When does it sell?</h3>${idea ? `<p>${gtag("C")} Peak months in ${cname(geo)}: <b>${pk.map(x => mon()[x - 1]).join(", ")}</b></p>
      <div class="row" style="gap:5px;flex-wrap:nowrap;margin-top:10px">${MONTHS.map((_, k) => `<div style="flex:1;text-align:center"><div style="height:38px;border:1px solid var(--line);border-radius:7px;background:${pk.includes(k + 1) ? "var(--green)" : "var(--cell)"};${k === m ? "outline:3px solid var(--blue);outline-offset:2px" : ""}"></div><span class="mut">${mon()[k]}</span></div>`).join("")}</div>
      <p style="margin-top:14px"><b>Order by:</b> ${A.season_state === "off" ? "No rush. Plan stock 6 weeks before the first green month." : "Count your supplier's lead time back from the first green month. Imports often take 3 to 6 weeks."}</p>`
      : `<p>This product is not in our season guide yet. Use the 12-month search chart in Demand to see when interest rises.</p>`}${SOUTH.includes(geo) ? `<p class="mut">Weather items are flipped for the southern hemisphere.</p>` : ""}</div>`;
  } else if (i === 3){
    const items = d.market_items || [], medp = mp ? mp.median : null;
    h = `<div class="card"><h3>Who sells it now</h3><p class="mut" style="margin:4px 0 12px">${mp ? `${gtag("A")} ${esc(mp.source)} · photo, title and price from the same listing · checked ${ago(d.checked)}` : "No market listings for this country yet."}</p>
      ${items.length ? `<div class="wrap0 scroll"><table class="bt"><tr><th></th><th>Listing</th><th>Price</th><th>Position</th><th>Sold / rating</th></tr>${items.slice(0, 10).map(x => `<tr><td><span class="th40">${x.image ? `<img src="${esc(x.image)}" alt="" referrerpolicy="no-referrer" data-fb="noimg">` : noImg}</span></td><td style="white-space:normal;min-width:220px"><a href="${esc(x.url || "#")}" target="_blank" rel="noopener noreferrer">${esc(x.name)}</a></td><td><b>${money(x.price, x.cur)}</b></td><td>${medp ? (x.price < medp * .85 ? `<span class="tag g">Cheaper</span>` : x.price > medp * 1.15 ? `<span class="tag p">Premium</span>` : `<span class="tag">Typical</span>`) : ""}</td><td>${x.orders ? (+x.orders).toLocaleString() + " sold" : ""}${x.rating ? ` · ★ ${esc(x.rating)}` : ""}</td></tr>`).join("")}</table></div>` : ""}
      ${d.ebay && d.ebay.ok && d.ebay.items.length ? `<details class="help"><summary>eBay listings (display only)</summary><div class="list" style="margin-top:10px">${d.ebay.items.slice(0, 6).map(x => `<a class="pc" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer"><div class="im"><img src="${esc(x.image)}" alt="" referrerpolicy="no-referrer" data-fb="noimg"></div><div class="tx"><b>${esc(x.name)}</b><span class="pr">${money(x.price, x.cur)}</span></div></a>`).join("")}</div><p class="mut">eBay content is shown as is and not used in any price or score (eBay licence).</p></details>` : ""}</div>
      <div class="card" style="margin-top:18px"><h3>Your competitor board</h3><p class="mut" style="margin:4px 0 12px">Add Facebook pages, shops or websites you compete with. Their offer and weak spot shape your angle.</p>
      <div class="wrap0 scroll"><table class="bt" id="cbt"><tr><th>Competitor</th><th>Price</th><th>Offer (delivery, warranty, bundle)</th><th>Weak spot</th><th></th></tr>${WS.proj.competitors.map((c, k) => `<tr><td>${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${esc(c.name || c.url)}</a>` : esc(c.name)}</td><td>${esc(c.price)}</td><td style="white-space:normal">${esc(c.offer)}</td><td style="white-space:normal">${esc(c.weak)}</td><td><button class="xb" data-dc="${k}" aria-label="Delete">${icon("trash", 16)}</button></td></tr>`).join("")}</table></div>
      <form class="grid g4 addrow" id="cf"><input name="name" placeholder="Name or page" required><input name="url" placeholder="Link (optional)"><input name="price" placeholder="Price"><input name="offer" placeholder="Their offer"><input name="weak" placeholder="Weak spot (from reviews)" style="grid-column:span 3"><button class="btn sm">${icon("plus", 16)} Add</button></form></div>`;
  } else if (i === 4){
    const R = WS.proj.reviews;
    h = `<div class="card"><h3>What buyers complain about</h3><p class="mut" style="margin:4px 0 12px">Paste 20 to 60 reviews of competitor products (Daraz, Facebook comments, YouTube), one per line. Complaints show where you can win.</p>
      <textarea id="rvt" rows="7" class="ta" placeholder="Battery died after 2 weeks&#10;Good light but the stand broke&#10;Delivery was late...">${esc((R && R.text) || "")}</textarea>
      <div class="row" style="margin-top:10px"><button class="btn g" id="rvg">Analyze reviews</button><span class="mut">${S.ai && S.ai.on ? "AI groups the themes (uses 1 AI answer)." : "Keyword grouping (connect AI for deeper analysis)."}</span></div><div id="rvo">${R && R.result ? reviewsHTML(R.result) : ""}</div></div>
      <div class="card" style="margin-top:18px"><h3>Who buys and why</h3><p>${esc(idea ? idea.why : "Not in our guide. Write the main pain your buyer has.")} ${gtag(idea ? "C" : "D")}</p>
      ${d.youtube && d.youtube.ok && d.youtube.videos.length ? `<div class="vids" style="grid-template-columns:1fr 1fr;margin-top:12px">${d.youtube.videos.slice(0, 4).map(v => `<div class="vid"><iframe loading="lazy" title="${esc(v.title)}" src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.id)}" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`).join("")}</div>` : `<p class="mut">${esc((d.youtube && d.youtube.reason) || "")}</p>`}</div>`;
  } else if (i === 5){
    const ali = (d.ali && d.ali.ok) ? d.ali.items : [];
    h = `<div class="card"><h3>Supplier listings</h3><p class="mut" style="margin:4px 0 12px">${ali.length ? `${gtag("A")} AliExpress · shown unmodified with its own link` : "Connect AliExpress to see supplier prices."}</p>${ali.length ? `<div class="list">${ali.slice(0, 6).map(x => `<a class="pc" href="${esc(x.url || "#")}" target="_blank" rel="noopener noreferrer"><div class="im"><img src="${esc(x.image)}" alt="" referrerpolicy="no-referrer" data-fb="noimg"></div><div class="tx"><b>${esc(x.name)}</b><span class="pr">${money(x.price, x.cur)}</span>${x.orders ? `<span class="mut">${(+x.orders).toLocaleString()} orders</span>` : ""}</div></a>`).join("")}</div>` : ""}</div>
      <div class="card" style="margin-top:18px"><h3>Your supplier quotes</h3><p class="mut" style="margin:4px 0 12px">Add real quotes (local wholesale, Alibaba, WhatsApp). Price per unit in ${esc(S.cur)}.</p>
      <div class="wrap0 scroll"><table class="bt"><tr><th>Supplier</th><th>Price / unit</th><th>MOQ</th><th>Lead time</th><th>Notes</th><th></th></tr>${WS.proj.quotes.map((x, k) => `<tr><td>${esc(x.name)}</td><td><b>${esc(x.price)}</b> ${esc(x.cur || "")}</td><td>${esc(x.moq)}</td><td>${esc(x.lead)}</td><td style="white-space:normal">${esc(x.notes)}</td><td><button class="xb" data-use="${k}">Use</button> <button class="xb" data-dq="${k}" aria-label="Delete">${icon("trash", 16)}</button></td></tr>`).join("")}</table></div>
      <form class="grid g4 addrow" id="qf"><input name="name" placeholder="Supplier" required><input name="price" type="number" step="0.01" placeholder="Price per unit" required><input name="moq" placeholder="MOQ (min order)"><input name="lead" placeholder="Lead time (days)"><input name="notes" placeholder="Notes: sample, warranty, payment" style="grid-column:span 3"><button class="btn sm">${icon("plus", 16)} Add</button></form></div>
      <div class="card" style="margin-top:18px" id="pc"><h3>Profit per order</h3><p class="mut" style="margin:4px 0 14px">${gtag("B")} Amounts in ${esc(S.cur)}. Shipping, delivery and ad cost start as estimates: change them.</p>
      <div class="calc">${[["sell", "Selling price", mp ? Math.round(fromUSD(toUSD(mp.median, mp.cur) || 0)) : ""], ["cost", "Product cost", WS.proj.cost != null ? WS.proj.cost : sp ? Math.round(fromUSD(toUSD(sp.median, sp.cur) || 0)) : ""], ["ship", "Shipping to you, per unit", sp ? Math.round(fromUSD((toUSD(sp.median, sp.cur) || 0) * .25)) : ""], ["del", "Delivery to customer", Math.round(fromUSD(1.2))], ["ad", "Ad cost per order", Math.round(fromUSD(1.5))], ["ret", "Returns and failed COD %", 8]].map(f => `<label class="field">${f[1]}<input id="p_${f[0]}" type="number" min="0" value="${f[2]}"></label>`).join("")}</div><div class="out" id="po"></div></div>`;
  } else {
    h = `<div class="grid g2 top-row"><div class="card devil"><h3 class="row" style="gap:8px">${icon("alert")} Devil's Advocate</h3><ul class="dl">${A.devil.map(x => `<li>${esc(x)}</li>`).join("")}</ul>${A.unknowns.length ? `<h3 style="margin-top:12px;font-size:15px">Still unknown</h3><ul class="dl">${A.unknowns.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}</div>
      <div class="card"><h3>Your decision</h3><p class="mut" style="margin:4px 0 12px">Our verdict: <b>${esc(A.verdict)}</b> · evidence ${A.confidence_label}. What do you decide?</p><div class="opts">${["Go", "Test more", "Improve the product", "Avoid"].map(x => `<button class="opt ${WS.proj.decision === x ? "on" : ""}" data-dec="${x}">${x}</button>`).join("")}</div></div></div>
      <div class="card" style="margin-top:18px"><h3>Validation tasks</h3><p class="mut" style="margin:4px 0 10px">Ranked by impact. Ticks save to your project.</p><div id="tl">${WS.proj.tasks.map((x, k) => `<label class="todo"><input type="checkbox" data-tk="${k}" ${x.done ? "checked" : ""}> <span>${k + 1}. ${esc(x.text)}</span></label>`).join("")}</div>
      <form class="row" id="tf" style="margin-top:10px"><input class="sel" style="flex:1;min-width:200px;background:var(--cell)" name="t" placeholder="Add your own task"><button class="btn sm">${icon("plus", 16)} Add</button></form></div>
      <div class="card row" style="margin-top:18px;justify-content:space-between"><b>Ready to share or print?</b><button class="btn k" id="rep2">${icon("printer", 16)} Open the report</button></div>`;
  }
  $("#wsm").innerHTML = h + nav;
  $$("[data-go-st]").forEach(b => b.onclick = () => { showStep(+b.dataset.goSt); scrollTo(0, 0) });
  const addForm = (sel, key, map) => { const f = $(sel); if (f) f.onsubmit = e => { e.preventDefault(); const o = Object.fromEntries(new FormData(f)); WS.proj[key] = WS.proj[key].concat([map ? map(o) : o]); persist(); showStep(i) } };
  addForm("#cf", "competitors"); addForm("#qf", "quotes", o => Object.assign(o, {cur: S.cur}));
  $$("[data-dc]").forEach(b => b.onclick = () => { WS.proj.competitors.splice(+b.dataset.dc, 1); persist(); showStep(i) });
  $$("[data-dq]").forEach(b => b.onclick = () => { WS.proj.quotes.splice(+b.dataset.dq, 1); persist(); showStep(i) });
  $$("[data-use]").forEach(b => b.onclick = () => { $("#p_cost").value = WS.proj.quotes[+b.dataset.use].price; WS.proj.cost = +$("#p_cost").value; persist(); calcProfit() });
  $$("[data-dec]").forEach(b => b.onclick = () => { persist({decision: b.dataset.dec}); showStep(i) });
  $$("[data-tk]").forEach(c => c.onchange = () => { WS.proj.tasks[+c.dataset.tk].done = c.checked; persist() });
  if ($("#tf")) $("#tf").onsubmit = e => { e.preventDefault(); const v = e.target.t.value.trim(); if (v){ WS.proj.tasks.push({text: v, done: false}); persist(); showStep(i) } };
  if ($("#rep2")) $("#rep2").onclick = () => $("#wrep").click();
  if ($("#pc")){ $$("#pc input").forEach(x => x.oninput = () => { if (x.id === "p_cost") WS.proj.cost = +x.value; calcProfit() }); calcProfit() }
  if ($("#rvg")) $("#rvg").onclick = async () => {
    const text = $("#rvt").value.trim(); if (text.length < 20) return toast("Paste a few reviews first.");
    $("#rvg").disabled = true; $("#rvo").innerHTML = `<div class="skel"></div>`;
    try { const res = await api("/api/reviews", {method: "POST", body: JSON.stringify({text, product: WS.q, lang: S.lang})}); persist({reviews: {text: text.slice(0, 20000), result: res}}); $("#rvo").innerHTML = reviewsHTML(res) }
    catch(e){ $("#rvo").innerHTML = `<p class="mut">${esc(e.message)}</p>` }
    $("#rvg").disabled = false;
  };
}
function calcProfit(){
  const g = k => +$("#p_" + k).value || 0, r = clamp(g("ret"), 0, 100) / 100, sell = g("sell"), unit = g("cost") + g("ship");
  const profit = (1 - r) * (sell - unit) - g("del") - g("ad") - r * g("del"), mg = sell ? profit / sell * 100 : 0, maxAd = (1 - r) * (sell - unit) - g("del") - r * g("del");
  WS.profit = {sell, cost: g("cost"), ship: g("ship"), del: g("del"), ad: g("ad"), ret: g("ret"), profit, mg};
  $("#po").innerHTML = `<div class="${profit < 0 ? "bad" : ""}"><span class="mut">Profit per order</span><b>${money(profit, S.cur)}</b></div><div class="${mg < 15 ? "bad" : ""}"><span class="mut">Net margin</span><b>${sell ? mg.toFixed(1) + "%" : "–"}</b></div><div><span class="mut">Max ad cost per order</span><b>${money(Math.max(0, maxAd), S.cur)}</b></div>`;
}
function reviewsHTML(R){
  const max = Math.max(1, ...(R.complaints || []).map(c => c.count || 0));
  return `<div style="margin-top:16px"><p class="mut">${gtag(R.engine === "ai" ? "D" : "C")} ${R.sample_size || 0} reviews · ${R.engine === "ai" ? "grouped by AI: check the examples" : "grouped by keywords"}</p>
    ${(R.complaints || []).length ? (R.complaints || []).map(c => `<div class="cbar"><div class="row" style="justify-content:space-between"><b>${esc(c.theme)}</b><span>${c.count} of ${R.sample_size}</span></div><u><i style="width:${c.count / max * 100}%"></i></u>${c.example ? `<p class="mut" style="margin:4px 0 0">“${esc(c.example)}”</p>` : ""}</div>`).join("") : `<p class="mut">No repeated complaint found.</p>`}
    ${(R.praise || []).length ? `<p style="margin-top:12px"><b>What they like:</b> ${R.praise.map(p => `${esc(p.theme)} (${p.count})`).join(", ")}</p>` : ""}
    ${(R.improvements || []).length ? `<h3 style="margin-top:14px;font-size:15px">Where you can win ${gtag("D")}</h3><ul class="dl">${R.improvements.map(x => `<li><b>${esc(x.idea)}</b>: ${esc(x.why)}</li>`).join("")}</ul>` : ""}
    ${R.contrary_evidence ? `<p class="mut">Contrary evidence: ${esc(R.contrary_evidence)}</p>` : ""}</div>`;
}

/* ---------- PROJECTS ---------- */
const projCard = p => `<a class="card proj" href="/research?pid=${p.id}"><div class="row" style="justify-content:space-between"><h3>${esc(p.name)}</h3>${p.verdict ? `<span class="tag" style="background:${VCOL[p.verdict] || "var(--cell)"}">${esc(p.verdict)}</span>` : ""}</div>
  <p class="mut" style="margin:6px 0">${cname(p.country)} · step ${(p.step || 0) + 1} of 7 · ${p.tasks ? `${p.tasks_done}/${p.tasks} tasks done` : "no tasks yet"}</p><span class="mut">Updated ${ago(p.updated)}</span></a>`;
async function projectsView(){
  if (!S.me){ $("#app").innerHTML = `<section class="sec"><div class="wrap"><div class="card empty"><div>${icon("folder", 44)}</div><h3>Projects keep your research</h3><p class="mut">Save a product, add competitors, supplier quotes and tasks, and come back any time.</p><button class="btn g" id="sl">Create free account</button></div></div></section>`; $("#sl").onclick = () => auth("signup"); return }
  let ps = []; try { ps = await api("/api/projects") } catch(e){}
  $("#app").innerHTML = `<section class="sec" style="padding-top:28px"><div class="wrap"><div class="row" style="justify-content:space-between"><h2>${t("projects")}</h2><div class="row"><a class="btn sm w" href="/saved">Shortlist board</a><a class="btn sm g" href="/research">${icon("plus", 16)} New research</a></div></div>
    <div class="grid g3" style="margin-top:18px">${ps.map(projCard).join("") || `<div class="card empty" style="grid-column:1/-1"><b>No projects yet</b>Run a Deep research and press “Save as project”.</div>`}</div></div></section>`;
}

/* ---------- REPORT (printable, Master Plan report layout) ---------- */
async function reportView(r){
  const pid = r.q.get("pid"); let p = null, q = r.q.get("q") || "";
  $("#app").innerHTML = `<section class="sec"><div class="wrap"><div class="card"><div class="skel"></div></div></div></section>`;
  if (pid) try { p = await api("/api/projects/" + pid); q = p.q; S.country = p.country } catch(e){}
  let d; try { d = WS.d && WS.d.q === q ? WS.d : await api(`/api/analyze?q=${encodeURIComponent(q)}&country=${S.country}`) } catch(e){ $("#app").innerHTML = `<section class="sec"><div class="wrap"><div class="card empty">${esc(e.message)}</div></div></section>`; return }
  const A = d.assessment, P = (p && p.data) || WS.proj || {}, mp = d.market_price, sp = d.supplier_price, now = new Date().toLocaleString("en-GB");
  const sec = (n, title, body) => `<section class="rsec"><h2><span>${n}</span> ${title}</h2>${body}</section>`;
  $("#app").innerHTML = `<div class="wrap report"><div class="row noprint" style="justify-content:space-between;margin:20px 0"><a class="btn w sm" href="/research?${pid ? "pid=" + pid : "q=" + encodeURIComponent(q)}">← Back to research</a><button class="btn k" data-act="print">${icon("printer", 16)} Print or save as PDF</button></div>
    <div class="card rep"><div class="mut">Product Radar research report · ${now}</div><h1 style="font-size:40px;margin:6px 0">${esc(q)}</h1><p class="mut">${cname(d.country)} · prices in source currency and ${esc(S.cur)}</p>
    ${sec(1, "Opportunity summary", `<p><b style="font-size:22px">${esc(A.verdict)}</b> · Opportunity ${A.opportunity == null ? "–" : A.opportunity}/100 · Evidence confidence ${A.confidence_label} (${A.confidence}%)${P.decision ? ` · Your decision: <b>${esc(P.decision)}</b>` : ""}</p><p>${esc(A.verdict_why)}</p>${A.idea ? `<p><b>Target buyer and why:</b> ${esc(A.idea.why)} ${gtag("C")}</p>` : ""}`)}
    ${sec(2, "Demand and timing", `<table class="bt">${A.signals.map(s => `<tr><td><b>${esc(s.name)}</b></td><td>${s.score == null ? "–" : s.score}</td><td>${gtag(s.grade)}</td><td style="white-space:normal">${esc(s.note)}</td></tr>`).join("")}</table>`)}
    ${sec(3, "Competitor landscape", `${mp ? `<p>Market price: low ${money(mp.low, mp.cur)}, typical ${money(mp.median, mp.cur)}, high ${money(mp.high, mp.cur)} (${mp.n} listings, ${esc(mp.source)}) ${gtag("A")}</p>` : "<p>No market price source.</p>"}
      ${(P.competitors || []).length ? `<table class="bt"><tr><th>Competitor</th><th>Price</th><th>Offer</th><th>Weak spot</th></tr>${P.competitors.map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.price)}</td><td style="white-space:normal">${esc(c.offer)}</td><td style="white-space:normal">${esc(c.weak)}</td></tr>`).join("")}</table>` : ""}`)}
    ${sec(4, "Customer voice", P.reviews && P.reviews.result ? reviewsHTML(P.reviews.result) : "<p class=mut>No reviews analysed yet.</p>")}
    ${sec(5, "Cost model", `${sp ? `<p>Supplier price: typical ${money(sp.median, sp.cur)} (${sp.n} AliExpress listings) ${gtag("A")}</p>` : ""}${(P.quotes || []).length ? `<table class="bt"><tr><th>Supplier</th><th>Price / unit</th><th>MOQ</th><th>Lead time</th></tr>${P.quotes.map(x => `<tr><td>${esc(x.name)}</td><td>${esc(x.price)} ${esc(x.cur || "")}</td><td>${esc(x.moq)}</td><td>${esc(x.lead)}</td></tr>`).join("")}</table>` : ""}
      ${WS.profit && WS.d && WS.d.q === q ? `<p>${gtag("B")} Profit per order ${money(WS.profit.profit, S.cur)} (${WS.profit.mg.toFixed(1)}% margin) at price ${money(WS.profit.sell, S.cur)}, cost ${money(WS.profit.cost, S.cur)}, shipping ${money(WS.profit.ship, S.cur)}, delivery ${money(WS.profit.del, S.cur)}, ads ${money(WS.profit.ad, S.cur)}, returns ${WS.profit.ret}%.</p>` : "<p class=mut>Open Sourcing & cost in the research to include your profit calculation.</p>"}`)}
    ${sec(6, "Risk register", `<ul class="dl">${A.devil.map(x => `<li>${esc(x)}</li>`).join("")}${A.unknowns.map(x => `<li>Unknown: ${esc(x)}</li>`).join("")}</ul>`)}
    ${sec(7, "Action plan", `<ol>${(P.tasks && P.tasks.length ? P.tasks : A.next_actions.map(x => ({text: x}))).map(x => `<li>${x.done ? "<s>" : ""}${esc(x.text)}${x.done ? "</s> (done)" : ""}</li>`).join("")}</ol>`)}
    ${sec(8, "Sources", `<table class="bt"><tr><th>Source</th><th>Status</th><th>Retrieved</th></tr>${Object.values(d.sources).map(s => `<tr><td>${esc(s.source)}</td><td>${s.ok ? "Used" : esc(s.reason || "Not available")}</td><td>${s.ok ? new Date(d.checked * 1000).toLocaleString("en-GB") : "–"}</td></tr>`).join("")}</table><p class="mut">Grades: A observed on a dated source, B calculated, C estimate or our guide, D AI hypothesis. Search interest is not sales. Not financial advice.</p>`)}
    </div></div>`;
}

/* ---------- HOME: 4 actions + continue research (Master Plan home concept) ---------- */
const homeBase = VIEWS.home;
VIEWS.home = async function(r){
  homeBase(r);
  const hero = $(".hero .season-card");
  if (hero) hero.outerHTML = `<div class="acts">${[["finder", "compass", "a1", "a1d", "var(--yellow)"], ["research", "flask", "a2", "a2d", "var(--mint)"], ["research?step=3", "users", "a3", "a3d", "rgba(143,123,255,.2)"], ["ask", "chat", "a4", "a4d", "var(--pink)"]]
    .map(a => `<a class="card act" href="/${a[0]}"><span class="ic" style="background:${a[4]}">${icon(a[1], 24)}</span><b>${t(a[2])}</b><span class="mut">${t(a[3])}</span></a>`).join("")}</div>`;
  const h1 = $(".hero h1"); if (h1 && S.me) h1.innerHTML = `${t("achieve")}`;
  if (S.me){ try { const ps = await api("/api/projects"); if (ps.length && $(".hero")) $(".hero").insertAdjacentHTML("afterend", `<section class="sec" style="padding:10px 0 30px"><div class="wrap"><h3 style="margin-bottom:12px">${t("cont")}</h3><div class="grid g3">${ps.slice(0, 3).map(projCard).join("")}</div></div></section>`) } catch(e){} }
};
/* research box on Analyze competitors: open step 4 directly */
const bindSearchBase = bindSearch;
bindSearch = function(){ const f = $("#sf"); if (!f) return; f.onsubmit = e => { e.preventDefault(); const q = $("#sq").value.trim(); S.country = $("#sc").value; ls.set("country", S.country); if (q) go("/research?q=" + encodeURIComponent(q) + (route().q.get("step") ? "&step=" + route().q.get("step") : "")) } };

Object.assign(VIEWS, {finder: finderView, research: researchView, analyze: researchView, ask: askView, projects: projectsView, report: reportView});
