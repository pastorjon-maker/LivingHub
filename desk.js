/* ═══════════════════════════════════════════════════════════════════════
   THE STEWARD'S DESK — desk.js  (v1)
   A faithfulness instrument, not a scoreboard.

   The Field-O-Scope reads RECENCY ("what's running low" = an invitation to
   go there next), never a self-graded score. The Disciples docket carries
   each man's RCP stage and the discipler's Four C's, pointed at the horizon:
   multiplying disciples.

   v1 is local-only — no integrations. State persists in localStorage; the
   seed below illustrates the gauge and the docket. Real names you add live
   only in this browser (never committed).
   ═══════════════════════════════════════════════════════════════════════ */

(() => {
  "use strict";

  const LS = { data: "stewardsDesk.data" };
  const SCHEMA_VERSION = 1;

  // ── Date helpers ─────────────────────────────────────────────────────
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const daysAgoISO = (n) =>
    new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

  function daysSince(dateStr) {
    if (!dateStr) return null;
    const then = new Date(dateStr + "T00:00:00");
    if (isNaN(then)) return null;
    return Math.floor((Date.now() - then) / 86400000);
  }

  // ── Section accents (how the glass colours each life-domain) ─────────
  const SECTION_ACCENT = {
    ministry: "#58ffb0", // phosphor green
    home:     "#ffcc66", // amber
    personal: "#7fc4d6", // aqua
  };

  // ── The seed desk (built fresh so recency looks alive on first open) ──
  function seedDesk() {
    return {
      version: SCHEMA_VERSION,
      steward: "JONATHAN MARSHALL",
      masthead: {
        verseRef: "1 CORINTHIANS 4:2",
        horizon: "Glorify Jesus Christ by multiplying disciples",
      },
      abide: {
        prompt: "The one thing — sit with Him before the desk fills.",
        lastAbided: daysAgoISO(1),
      },
      sections: [
        {
          id: "ministry", name: "MINISTRY",
          areas: [
            { id: "abide",      title: "ABIDE",              short: "ABIDE",      subtitle: "Walk with God — the source that feeds everything below.", cadence: 1,  lastTouched: daysAgoISO(1),  big4: "WORSHIP",      presentStep: "Practice His presence — one unhurried hour." },
            { id: "preaching",  title: "PREACHING & STUDY",  short: "PREACH",     subtitle: "Sermon series, word studies, theological work.",           cadence: 7,  lastTouched: daysAgoISO(3),  presentStep: "Draft Sunday's text by Thursday." },
            { id: "shepherding",title: "SHEPHERDING",        short: "SHEPHERD",   subtitle: "The daily care of the flock — visits, staff, counsel.",     cadence: 3,  lastTouched: daysAgoISO(2),  big4: "CHARITY",      presentStep: "Three intentional care contacts this week." },
            { id: "battles",    title: "BATTLES & STRATEGY", short: "BATTLES",    subtitle: "The few must-win fights, and the map that picks them.",     cadence: 7,  lastTouched: daysAgoISO(9),  presentStep: "Name the present step on each must-win battle." },
            { id: "disciples",  title: "DISCIPLES",          short: "DISCIPLES",  subtitle: "The docket — pouring into men who will train others.",     cadence: 7,  lastTouched: daysAgoISO(4),  big4: "DISCIPLESHIP", docket: true, presentStep: "Show up for whoever is most due a letter." },
            { id: "evangelism", title: "EVANGELISM & OUTREACH", short: "REACH",  subtitle: "Reaching the lost — street, campus, door to door.",        cadence: 7,  lastTouched: daysAgoISO(11), big4: "EVANGELISM",   presentStep: "Confirm this weekend's outreach roster." },
            { id: "prayer",     title: "PRAYER ROTATION",    short: "PRAYER",     subtitle: "Interceding through the rotation, by name.",                cadence: 2,  lastTouched: daysAgoISO(2),  presentStep: "Pray the next names on the rotation." },
          ],
        },
        {
          id: "home", name: "HOME",
          areas: [
            { id: "jess",        title: "JESS",        short: "JESS",   subtitle: "Marriage — covenant love, presence, her own spoke.", cadence: 2,  lastTouched: daysAgoISO(1),  presentStep: "Intentional time — phone in the drawer." },
            { id: "family",      title: "FAMILY",      short: "FAMILY", subtitle: "Kids, grandkids, parents, in-laws.",                 cadence: 3,  lastTouched: daysAgoISO(5),  presentStep: "One-on-one with each kid this week." },
            { id: "maintenance", title: "MAINTENANCE", short: "UPKEEP", subtitle: "Quarters & motor pool — house and vehicles.",         cadence: 30, lastTouched: daysAgoISO(18), presentStep: "Walk the house — note anything broken." },
          ],
        },
        {
          id: "personal", name: "PERSONAL",
          areas: [
            { id: "health",     title: "HEALTH & FITNESS", short: "HEALTH",  subtitle: "Exercise, sleep, the mental battle.",      cadence: 2,  lastTouched: daysAgoISO(3),  presentStep: "Three movement sessions; lights out by 10:30." },
            { id: "finances",   title: "FINANCES",         short: "FINANCE", subtitle: "Stewardship, debt freedom, generosity.",   cadence: 14, lastTouched: daysAgoISO(8),  presentStep: "Check the budget; give first." },
            { id: "reading",    title: "READING & MIND",   short: "READING", subtitle: "Books and growth beyond sermon prep.",     cadence: 3,  lastTouched: daysAgoISO(6),  presentStep: "30 min/day non-sermon reading." },
            { id: "hobbies",    title: "HOBBIES & CRAFT",  short: "CRAFT",   subtitle: "The woodshop — building things of value.", cadence: 14, lastTouched: daysAgoISO(20), presentStep: "One focused shop block." },
            { id: "friendships",title: "FRIENDSHIPS",      short: "FRIENDS", subtitle: "The men who tell you the truth.",          cadence: 14, lastTouched: daysAgoISO(13), presentStep: "Reach out to one brother." },
          ],
        },
      ],
      // Example disciples (Timothy/Titus archetypes — replace with your own).
      // RCP: R=reconciling, C=conforming, P=perfecting. Four C's are the
      // discipler's read on progress with the man.
      disciples: [
        { id: "d1", name: "Timothy (example)", rcp: "P", cadence: 7,  lastInvested: daysAgoISO(9),  presentStep: "Hand him a younger man to train.",        cs: { consistency: true,  change: true,  connection: true,  comprehension: true  } },
        { id: "d2", name: "Titus (example)",   rcp: "C", cadence: 7,  lastInvested: daysAgoISO(4),  presentStep: "Walk through the besetting sin honestly.", cs: { consistency: true,  change: true,  connection: true,  comprehension: false } },
        { id: "d3", name: "Onesimus (example)",rcp: "R", cadence: 5,  lastInvested: daysAgoISO(6),  presentStep: "Keep showing up — the gospel is landing.", cs: { consistency: false, change: false, connection: true,  comprehension: false } },
      ],
    };
  }

  // ── State ────────────────────────────────────────────────────────────
  const state = { data: null, activeAreaId: null };
  const $ = (id) => document.getElementById(id);
  const refreshIcons = () => { if (window.lucide) window.lucide.createIcons(); };

  // ── Load / persist (version-gated, mirrors the hub's pattern) ────────
  function loadData() {
    const raw = localStorage.getItem(LS.data);
    if (raw) {
      try {
        const local = JSON.parse(raw);
        if ((local.version || 0) >= SCHEMA_VERSION) return local;
      } catch (_) { /* corrupt — reseed */ }
    }
    return seedDesk();
  }
  function persist() {
    try { localStorage.setItem(LS.data, JSON.stringify(state.data)); } catch (_) {}
  }

  // ── Recency — the heart of the instrument ────────────────────────────
  // Full when you were just here; drains toward a faint glow as the days
  // pass. "Due" at one cadence; "running low" past two. Never zero — a
  // neglected area still glows softly; this is an invitation, not a verdict.
  function recency(lastTouched, cadence) {
    const d = daysSince(lastTouched);
    const cad = cadence || 7;
    if (d === null) return { signal: 5, days: null, due: false, low: false };
    const window = cad * 2;
    const frac = Math.max(0, 1 - d / window);
    const signal = Math.max(1, Math.round(frac * 10));
    return { signal, days: d, due: d >= cad, low: d >= window };
  }

  function recencyWord(r) {
    if (r.days === null) return "No record yet";
    if (r.low) return `Running low — ${r.days} days`;
    if (r.due) return `Due — ${r.days} days`;
    if (r.days === 0) return "Fresh — today";
    if (r.days === 1) return "Fresh — yesterday";
    return `Tended ${r.days} days ago`;
  }

  // Flatten all areas (with their section) for the wheel + index.
  function allAreas() {
    const out = [];
    (state.data.sections || []).forEach((sec) => {
      (sec.areas || []).forEach((a) => out.push({ area: a, section: sec }));
    });
    return out;
  }
  function findArea(id) {
    return allAreas().find((x) => x.area.id === id);
  }

  // ── The Field-O-Scope (recency radar) ────────────────────────────────
  const WHEEL = { cx: 160, cy: 160, R: 106, ns: "http://www.w3.org/2000/svg" };
  function wheelPt(i, r, n) {
    const ang = (-Math.PI / 2) + (i * 2 * Math.PI / n);
    return [WHEEL.cx + r * Math.cos(ang), WHEEL.cy + r * Math.sin(ang)];
  }

  function renderWheel() {
    const ringsG = $("grid-rings"), spokesG = $("spokes"),
          labelsG = $("labels"), dotsG = $("dots"), shape = $("scope-shape");
    if (!ringsG) return;
    const items = allAreas();
    const n = items.length;
    const NS = WHEEL.ns;

    [ringsG, spokesG, labelsG, dotsG].forEach((g) => (g.innerHTML = ""));
    if (!n) { shape.setAttribute("points", ""); return; }

    // grid rings
    [2, 4, 6, 8, 10].forEach((lvl) => {
      const poly = document.createElementNS(NS, "polygon");
      const pts = [];
      for (let i = 0; i < n; i++) {
        const p = wheelPt(i, WHEEL.R * lvl / 10, n);
        pts.push(p[0].toFixed(1) + "," + p[1].toFixed(1));
      }
      poly.setAttribute("points", pts.join(" "));
      ringsG.appendChild(poly);
    });

    const shapePts = [];
    let lowest = null;
    for (let i = 0; i < n; i++) {
      const { area, section } = items[i];
      const r = recency(area.lastTouched, area.cadence);
      const accent = SECTION_ACCENT[section.id] || "#58ffb0";
      const isActive = area.id === state.activeAreaId;
      const isBig4 = !!area.big4;
      if (!lowest || r.signal < lowest.sig) lowest = { sig: r.signal, title: area.title };

      // spoke line
      const edge = wheelPt(i, WHEEL.R, n);
      const line = document.createElementNS(NS, "line");
      line.setAttribute("x1", WHEEL.cx); line.setAttribute("y1", WHEEL.cy);
      line.setAttribute("x2", edge[0].toFixed(1)); line.setAttribute("y2", edge[1].toFixed(1));
      spokesG.appendChild(line);

      // label
      const lp = wheelPt(i, WHEEL.R + 18, n);
      const tx = document.createElementNS(NS, "text");
      tx.setAttribute("x", lp[0].toFixed(1));
      tx.setAttribute("y", lp[1].toFixed(1));
      tx.setAttribute("font-size", isBig4 ? "8.5" : "7");
      tx.setAttribute("font-weight", isBig4 ? "800" : "600");
      tx.setAttribute("text-anchor",
        lp[0] < WHEEL.cx - 5 ? "end" : (lp[0] > WHEEL.cx + 5 ? "start" : "middle"));
      tx.setAttribute("dominant-baseline", "middle");
      // inline style beats the stylesheet's `#labels text { fill }` rule
      tx.style.fill = accent;
      tx.style.cursor = "pointer";
      tx.style.opacity = isActive ? "1" : (isBig4 ? "0.95" : "0.72");
      tx.textContent = area.short || area.title;
      tx.addEventListener("click", () => openArea(area.id));
      labelsG.appendChild(tx);

      // data dot at the recency radius
      const dp = wheelPt(i, WHEEL.R * r.signal / 10, n);
      shapePts.push(dp[0].toFixed(1) + "," + dp[1].toFixed(1));
      const dot = document.createElementNS(NS, "circle");
      dot.setAttribute("cx", dp[0].toFixed(1));
      dot.setAttribute("cy", dp[1].toFixed(1));
      dot.setAttribute("r", isBig4 ? (isActive ? "5.4" : "4.6") : (isActive ? "4.2" : "3"));
      // inline style beats the stylesheet's `#dots circle { fill }` rule
      dot.style.fill = accent;
      dot.style.filter = `drop-shadow(0 0 ${isBig4 ? 5 : 3}px ${accent})`;
      dot.style.cursor = "pointer";
      const title = document.createElementNS(NS, "title");
      title.textContent = `${area.title} — ${recencyWord(r)}`;
      dot.appendChild(title);
      dot.addEventListener("click", () => openArea(area.id));
      dotsG.appendChild(dot);
    }

    shape.setAttribute("points", shapePts.join(" "));
    if (lowest) $("lowest-area").textContent = lowest.title;
  }

  // ── The Big Four headline meters ─────────────────────────────────────
  function renderBigFour() {
    const wrap = $("big-four-meters");
    wrap.innerHTML = "";
    const order = ["WORSHIP", "DISCIPLESHIP", "CHARITY", "EVANGELISM"];
    const byLabel = {};
    allAreas().forEach(({ area }) => { if (area.big4) byLabel[area.big4] = area; });

    order.forEach((label) => {
      const area = byLabel[label];
      const r = area ? recency(area.lastTouched, area.cadence) : { signal: 5, days: null };
      const row = document.createElement("button");
      row.className = "bf-row" + (r.low ? " bf-low" : r.due ? " bf-due" : "");
      row.innerHTML = `
        <span class="bf-name">${label}</span>
        <span class="bf-bar"><span class="bf-fill" style="width:${r.signal * 10}%"></span></span>
        <span class="bf-state">${r.days === null ? "—" : (r.low ? "LOW" : r.due ? "DUE" : "OK")}</span>`;
      if (area) row.addEventListener("click", () => openArea(area.id));
      wrap.appendChild(row);
    });
  }

  // ── Section legend ───────────────────────────────────────────────────
  function renderLegend() {
    const el = $("section-legend");
    el.innerHTML = "";
    (state.data.sections || []).forEach((sec) => {
      const chip = document.createElement("span");
      chip.className = "legend-chip";
      chip.innerHTML = `<span class="legend-swatch" style="background:${SECTION_ACCENT[sec.id]}"></span>${sec.name}`;
      el.appendChild(chip);
    });
  }

  // ── The sections index (area cards grouped by section) ───────────────
  function renderSections() {
    const root = $("sections-index");
    root.innerHTML = "";
    (state.data.sections || []).forEach((sec) => {
      const block = document.createElement("div");
      block.className = "section-block";
      const accent = SECTION_ACCENT[sec.id];
      block.innerHTML = `<div class="section-name" style="border-color:${accent}"><span class="section-swatch" style="background:${accent}"></span>${sec.name}</div>`;
      const grid = document.createElement("div");
      grid.className = "area-grid";

      (sec.areas || []).forEach((area) => {
        const r = recency(area.lastTouched, area.cadence);
        const card = document.createElement("button");
        card.className = "area-card"
          + (area.id === state.activeAreaId ? " active" : "")
          + (r.low ? " low" : r.due ? " due" : "");
        card.style.setProperty("--accent", accent);
        const badge = area.big4 ? `<span class="big4-tag">★ ${area.big4}</span>` : "";
        const docket = area.docket ? `<span class="docket-tag">DOCKET</span>` : "";
        card.innerHTML = `
          <span class="area-card-top">${badge}${docket}</span>
          <span class="area-card-title">${area.title}</span>
          <span class="area-card-recency"><span class="recency-dot" style="opacity:${0.25 + 0.075 * r.signal}"></span>${recencyWord(r)}</span>`;
        card.addEventListener("click", () => openArea(area.id));
        grid.appendChild(card);
      });
      block.appendChild(grid);
      root.appendChild(block);
    });
  }

  // ── Opening an area record (or the docket) ───────────────────────────
  function openArea(id) {
    const hit = findArea(id);
    if (!hit) return;
    state.activeAreaId = id;
    const area = hit.area;

    $("record-empty").classList.add("hidden");
    const isDocket = !!area.docket;
    $("record-area").classList.toggle("hidden", isDocket);
    $("record-docket").classList.toggle("hidden", !isDocket);

    if (isDocket) {
      renderDocket();
    } else {
      $("area-title").textContent = area.title;
      $("area-subtitle").textContent = area.subtitle || "";
      const r = recency(area.lastTouched, area.cadence);
      $("area-recency-note").textContent = recencyWord(r);
      const dot = $("area-recency-dot");
      dot.style.background = SECTION_ACCENT[hit.section.id];
      dot.style.opacity = String(0.25 + 0.075 * r.signal);
      $("area-present-step").value = area.presentStep || "";
    }

    renderSections();
    renderWheel();
    refreshIcons();
  }

  // ── "Showed up here" — refill the area's recency ─────────────────────
  function showUpHere() {
    const hit = findArea(state.activeAreaId);
    if (!hit) return;
    hit.area.presentStep = $("area-present-step").value.trim();
    hit.area.lastTouched = todayISO();
    persist();
    openArea(hit.area.id);
    renderBigFour();
    flashBtn($("area-showup-btn"), "✓ TENDED");
  }

  // ── The Disciples docket ─────────────────────────────────────────────
  const RCP_META = {
    R: { word: "RECONCILING", cls: "rcp-r" },
    C: { word: "CONFORMING",  cls: "rcp-c" },
    P: { word: "PERFECTING",  cls: "rcp-p" },
  };
  const CS_KEYS = [
    ["consistency", "Consistency"], ["change", "Change"],
    ["connection", "Connection"],   ["comprehension", "Comprehension"],
  ];

  function renderDocket() {
    const list = $("docket-list");
    list.innerHTML = "";
    const people = (state.data.disciples || []).slice().sort((a, b) => {
      // most overdue first — who's most due a letter
      const ra = recency(a.lastInvested, a.cadence).signal;
      const rb = recency(b.lastInvested, b.cadence).signal;
      return ra - rb;
    });

    if (!people.length) {
      list.innerHTML = `<li class="docket-empty">No one on the docket yet — add a name below.</li>`;
      return;
    }

    people.forEach((p) => {
      const r = recency(p.lastInvested, p.cadence);
      const meta = RCP_META[p.rcp] || RCP_META.C;
      const li = document.createElement("li");
      li.className = "docket-item" + (r.low ? " low" : r.due ? " due" : "");
      li.innerHTML = `
        <div class="docket-main">
          <div class="docket-name-row">
            <button class="rcp-badge ${meta.cls}" data-id="${p.id}" title="Stage — click to advance">${p.rcp}</button>
            <span class="docket-name">${escapeHtml(p.name)}</span>
            <span class="docket-due ${r.due ? "is-due" : ""}">${r.due ? "DUE A LETTER" : recencyWord(r)}</span>
          </div>
          <input class="present-input docket-step" data-id="${p.id}" value="${escapeAttr(p.presentStep || "")}" placeholder="Present step with ${escapeAttr(firstName(p.name))}…" />
          <div class="cs-row" data-id="${p.id}">
            ${CS_KEYS.map(([k, label]) =>
              `<button class="cs-pill ${p.cs && p.cs[k] ? "on" : ""}" data-cs="${k}" data-id="${p.id}" title="${label}">${label[0]}</button>`
            ).join("")}
            <span class="cs-legend">${meta.word}</span>
          </div>
        </div>
        <div class="docket-actions">
          <button class="dispatch-btn file-dispatch" data-id="${p.id}"><i data-lucide="send"></i><span>FILE DISPATCH</span></button>
          <button class="docket-remove" data-id="${p.id}" title="Remove from docket">✕</button>
        </div>`;
      list.appendChild(li);
    });
    refreshIcons();
  }

  function disciple(id) { return (state.data.disciples || []).find((d) => d.id === id); }

  function onDocketClick(e) {
    const fileBtn = e.target.closest(".file-dispatch");
    if (fileBtn) return fileDispatch(fileBtn.getAttribute("data-id"));

    const rcpBtn = e.target.closest(".rcp-badge");
    if (rcpBtn) return advanceRcp(rcpBtn.getAttribute("data-id"));

    const csBtn = e.target.closest(".cs-pill");
    if (csBtn) return toggleCs(csBtn.getAttribute("data-id"), csBtn.getAttribute("data-cs"));

    const rm = e.target.closest(".docket-remove");
    if (rm) return removeDisciple(rm.getAttribute("data-id"));
  }

  function onDocketInput(e) {
    const step = e.target.closest(".docket-step");
    if (!step) return;
    const d = disciple(step.getAttribute("data-id"));
    if (d) { d.presentStep = step.value; persist(); }
  }

  // Filing a dispatch = you showed up for this man. Resets his clock and
  // refills the Disciples spoke + the Discipleship Big-Four needle.
  function fileDispatch(id) {
    const d = disciple(id);
    if (!d) return;
    d.lastInvested = todayISO();
    const disc = findArea("disciples");
    if (disc) disc.area.lastTouched = todayISO();
    persist();
    renderDocket();
    renderWheel();
    renderBigFour();
    renderSections();
  }

  function advanceRcp(id) {
    const d = disciple(id);
    if (!d) return;
    d.rcp = d.rcp === "R" ? "C" : d.rcp === "C" ? "P" : "R";
    persist();
    renderDocket();
  }

  function toggleCs(id, key) {
    const d = disciple(id);
    if (!d) return;
    d.cs = d.cs || {};
    d.cs[key] = !d.cs[key];
    persist();
    renderDocket();
  }

  function removeDisciple(id) {
    state.data.disciples = (state.data.disciples || []).filter((d) => d.id !== id);
    persist();
    renderDocket();
    renderWheel();
  }

  function addDisciple() {
    const input = $("docket-name-input");
    const name = input.value.trim();
    if (!name) return;
    state.data.disciples = state.data.disciples || [];
    state.data.disciples.push({
      id: "d" + Date.now(), name, rcp: "R", cadence: 7,
      lastInvested: todayISO(), presentStep: "",
      cs: { consistency: false, change: false, connection: false, comprehension: false },
    });
    input.value = "";
    persist();
    renderDocket();
    renderWheel();
  }

  // ── Abide ────────────────────────────────────────────────────────────
  function renderAbide() {
    const a = state.data.abide || {};
    $("abide-prompt").textContent = a.prompt || "";
    const r = recency(a.lastAbided, 1);
    $("abide-note").textContent = a.lastAbided ? recencyWord(r) : "Not yet today";
    $("abide-strip").classList.toggle("abide-due", r.due || r.days === null);
  }
  function abideToday() {
    state.data.abide = state.data.abide || {};
    state.data.abide.lastAbided = todayISO();
    // Abide is the Worship needle's source.
    const abideArea = findArea("abide");
    if (abideArea) abideArea.area.lastTouched = todayISO();
    persist();
    renderAbide();
    renderWheel();
    renderBigFour();
    renderSections();
    flashBtn($("abide-btn"), "✓ ABIDED");
  }

  // ── Masthead ─────────────────────────────────────────────────────────
  function renderMasthead() {
    const m = state.data.masthead || {};
    if (m.verseRef) $("verse-ref").textContent = m.verseRef;
    if (m.horizon) $("horizon-text").textContent = m.horizon;
  }

  // ── Misc ─────────────────────────────────────────────────────────────
  function firstName(n) { return String(n).split(/\s+/)[0]; }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function escapeAttr(s) { return escapeHtml(s).replace(/"/g, "&quot;"); }

  function flashBtn(btn, msg) {
    if (!btn) return;
    const span = btn.querySelector("span");
    if (!span) return;
    const original = btn.dataset.label || span.textContent;
    btn.dataset.label = original;
    span.textContent = msg;
    clearTimeout(btn._flash);
    btn._flash = setTimeout(() => { span.textContent = btn.dataset.label; }, 1800);
  }

  function resetSeed() {
    if (!window.confirm("Reset to the seed desk? Anything you added in this browser will be cleared.")) return;
    localStorage.removeItem(LS.data);
    state.data = seedDesk();
    state.activeAreaId = null;
    boot();
  }

  // ── Boot / render-all ────────────────────────────────────────────────
  function renderAll() {
    renderMasthead();
    renderAbide();
    renderWheel();
    renderBigFour();
    renderLegend();
    renderSections();
  }

  function boot() {
    renderAll();
    // open the most-depleted area by default — the gauge points you there
    let lowest = null;
    allAreas().forEach(({ area }) => {
      const sig = recency(area.lastTouched, area.cadence).signal;
      if (!lowest || sig < lowest.sig) lowest = { sig, id: area.id };
    });
    if (lowest) openArea(lowest.id);
    refreshIcons();
  }

  function bindEvents() {
    $("abide-btn").addEventListener("click", abideToday);
    $("area-showup-btn").addEventListener("click", showUpHere);
    $("docket-add-btn").addEventListener("click", addDisciple);
    $("docket-name-input").addEventListener("keydown", (e) => { if (e.key === "Enter") addDisciple(); });
    $("docket-list").addEventListener("click", onDocketClick);
    $("docket-list").addEventListener("input", onDocketInput);
    $("reset-btn").addEventListener("click", resetSeed);
  }

  function init() {
    state.data = loadData();
    bindEvents();
    boot();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
