/* ═══════════════════════════════════════════════════════════════════════
   LIVING HUB — app.js
   Front-end controller for the tactile field-notes dashboard.

   Responsibilities
   ----------------
   • Load data.json (and merge any locally-saved overrides).
   • Render the Table of Contents, Truth Anchors, and the active spoke record.
   • Recurring weekly/monthly checklists with persistent + auto-reset state.
   • Integrations: Google Doc journal append, Asana task push, Claude paste
     parser, and the 1-click feed sync (talks to server.py /api endpoints).
   ═══════════════════════════════════════════════════════════════════════ */

(() => {
  "use strict";

  // ── Local storage keys ───────────────────────────────────────────────
  const LS = {
    data:        "livingHub.data",
    asanaPat:    "livingHub.asana.pat",
    asanaProj:   "livingHub.asana.project",
    gdocUrl:     "livingHub.gdoc.url",
    anchorIdx:   "livingHub.anchorIdx",
  };

  // ── App state ────────────────────────────────────────────────────────
  const state = {
    data: null,
    activeSpokeId: null,
    anchorIdx: 0,
    apiAvailable: false,
  };

  // ── Tiny DOM helpers ─────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const refreshIcons = () => { if (window.lucide) window.lucide.createIcons(); };

  function showFeedback(el, message, kind = "info") {
    if (!el) return;
    el.textContent = message;
    el.className = "asana-feedback feedback-" + kind;
    if (el.id === "parse-feedback") el.className = "parse-feedback feedback-" + kind;
    el.classList.remove("hidden");
  }

  // ── Data loading / persistence ───────────────────────────────────────
  async function loadData() {
    // Fetch the shipped data.json (source of truth for schema/version).
    let fileData = null;
    try {
      const res = await fetch("data.json", { cache: "no-store" });
      if (res.ok) fileData = await res.json();
    } catch (_) { /* offline / file:// */ }

    // A locally-saved copy preserves the user's edits across reloads —
    // BUT if the shipped file is a newer schema version, it wins (so adding
    // categories / bumping `version` overrides stale browser data).
    const localRaw = localStorage.getItem(LS.data);
    if (localRaw) {
      try {
        const local = JSON.parse(localRaw);
        if (fileData && (fileData.version || 0) > (local.version || 0)) {
          localStorage.removeItem(LS.data);
          return normalizeData(fileData);
        }
        return normalizeData(local);
      } catch (_) { /* corrupt local — fall through to file */ }
    }

    if (fileData) return normalizeData(fileData);
    return { user: "JONATHAN MARSHALL", truthAnchors: [], spokes: [] };
  }

  // Bring any data (shipped, saved, or imported) up to the current shape:
  // unify the old "open research items" strings into checkable task objects.
  function normalizeData(data) {
    (data.spokes || []).forEach((s, si) => {
      s.bulletList = s.bulletList || { title: "OPEN ITEMS", items: [] };
      s.bulletList.items = (s.bulletList.items || []).map((it, idx) =>
        typeof it === "string"
          ? { id: "i" + si + "_" + idx, task: it, completed: false }
          : it
      );
      s.checklists = s.checklists || { weekly: [], monthly: [] };
      s.checklists.weekly = s.checklists.weekly || [];
      s.checklists.monthly = s.checklists.monthly || [];
    });
    return data;
  }

  function persist() {
    try { localStorage.setItem(LS.data, JSON.stringify(state.data)); } catch (_) {}
  }

  // ── Recurring checklist reset (client mirror of sync.py logic) ────────
  function isoWeekKey(d) {
    // Returns "YYYY-Www" so weeks are comparable.
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - dayNum + 3);
    const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
    const week = 1 + Math.round(
      ((date - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7
    );
    return `${date.getUTCFullYear()}-W${week}`;
  }

  function maybeResetChecklists() {
    if (!state.data) return;
    const today = new Date();
    const last = state.data.lastRefreshed ? new Date(state.data.lastRefreshed + "T00:00:00") : null;
    if (!last || isNaN(last)) {
      state.data.lastRefreshed = today.toISOString().slice(0, 10);
      return;
    }
    const newWeek  = isoWeekKey(today) !== isoWeekKey(last);
    const newMonth = today.getFullYear() !== last.getFullYear()
                  || today.getMonth() !== last.getMonth();
    if (!newWeek && !newMonth) return;

    (state.data.spokes || []).forEach((s) => {
      const c = s.checklists || {};
      if (newWeek)  (c.weekly  || []).forEach((i) => (i.completed = false));
      if (newMonth) (c.monthly || []).forEach((i) => (i.completed = false));
    });
    state.data.lastRefreshed = today.toISOString().slice(0, 10);
    persist();
  }

  // ── Truth anchors ────────────────────────────────────────────────────
  function renderAnchor() {
    const anchors = state.data.truthAnchors || [];
    if (!anchors.length) return;
    state.anchorIdx = ((state.anchorIdx % anchors.length) + anchors.length) % anchors.length;
    $("truth-quote").textContent = anchors[state.anchorIdx];
    localStorage.setItem(LS.anchorIdx, String(state.anchorIdx));
  }

  function cycleAnchor() {
    state.anchorIdx += 1;
    renderAnchor();
  }

  // ── Table of contents ────────────────────────────────────────────────
  function renderTOC() {
    const list = $("toc-list");
    list.innerHTML = "";
    (state.data.spokes || []).forEach((spoke) => {
      const item = document.createElement("button");
      item.className = "toc-item" + (spoke.id === state.activeSpokeId ? " active" : "");
      item.setAttribute("data-spoke", spoke.id);
      item.innerHTML = `
        <span class="toc-num">${spoke.num}</span>
        <span class="toc-text"><span class="toc-title">${escapeHtml(spoke.title)}</span></span>
        <span class="toc-state-dot state-${spoke.state || "ABIDING"}"></span>`;
      item.addEventListener("click", () => selectSpoke(spoke.id));
      list.appendChild(item);
    });
  }

  // ── Oscilloscope Wheel of Life radar ────────────────────────────────
  const WHEEL = { cx: 160, cy: 160, R: 106, ns: "http://www.w3.org/2000/svg" };

  function clampRating(r) {
    r = parseInt(r, 10);
    if (isNaN(r)) r = 5;
    return Math.max(1, Math.min(10, r));
  }

  function wheelPt(i, r, n) {
    const ang = (-Math.PI / 2) + (i * 2 * Math.PI / n);
    return [WHEEL.cx + r * Math.cos(ang), WHEEL.cy + r * Math.sin(ang)];
  }

  function renderWheel() {
    const ringsG = $("grid-rings");
    if (!ringsG) return; // wheel not in DOM
    const spokesG = $("spokes"), labelsG = $("labels"),
          dotsG = $("dots"), shape = $("scope-shape");
    const spokes = state.data.spokes || [];
    const n = spokes.length;
    const NS = WHEEL.ns;

    ringsG.innerHTML = ""; spokesG.innerHTML = "";
    labelsG.innerHTML = ""; dotsG.innerHTML = "";
    if (!n) { shape.setAttribute("points", ""); $("wheel-avg").textContent = "—"; return; }

    // concentric grid rings (2,4,6,8,10)
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
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const sp = spokes[i];
      const isActive = sp.id === state.activeSpokeId;
      const rating = clampRating(sp.rating);
      sum += rating;

      // radial spoke line
      const edge = wheelPt(i, WHEEL.R, n);
      const line = document.createElementNS(NS, "line");
      line.setAttribute("x1", WHEEL.cx); line.setAttribute("y1", WHEEL.cy);
      line.setAttribute("x2", edge[0].toFixed(1)); line.setAttribute("y2", edge[1].toFixed(1));
      spokesG.appendChild(line);

      // label (channel name)
      const lp = wheelPt(i, WHEEL.R + 17, n);
      const tx = document.createElementNS(NS, "text");
      tx.setAttribute("x", lp[0].toFixed(1));
      tx.setAttribute("y", lp[1].toFixed(1));
      tx.setAttribute("font-size", "7.5");
      tx.setAttribute("text-anchor",
        lp[0] < WHEEL.cx - 5 ? "end" : (lp[0] > WHEEL.cx + 5 ? "start" : "middle"));
      tx.setAttribute("dominant-baseline", "middle");
      tx.textContent = sp.short || sp.num;
      if (isActive) tx.classList.add("active");
      tx.addEventListener("click", () => selectSpoke(sp.id));
      labelsG.appendChild(tx);

      // data dot at the rating radius
      const dp = wheelPt(i, WHEEL.R * rating / 10, n);
      shapePts.push(dp[0].toFixed(1) + "," + dp[1].toFixed(1));
      const dot = document.createElementNS(NS, "circle");
      dot.setAttribute("cx", dp[0].toFixed(1));
      dot.setAttribute("cy", dp[1].toFixed(1));
      dot.setAttribute("r", isActive ? "4.2" : "3");
      if (isActive) dot.classList.add("active");
      const title = document.createElementNS(NS, "title");
      title.textContent = sp.title + " — " + rating + "/10";
      dot.appendChild(title);
      dot.addEventListener("click", () => selectSpoke(sp.id));
      dotsG.appendChild(dot);
    }

    shape.setAttribute("points", shapePts.join(" "));
    $("wheel-avg").textContent = (sum / n).toFixed(1);
  }

  // ── Days-since-touched metric ────────────────────────────────────────
  function daysSince(dateStr) {
    if (!dateStr) return null;
    const then = new Date(dateStr + "T00:00:00");
    if (isNaN(then)) return null;
    return Math.floor((Date.now() - then) / 86400000);
  }

  function touchedNote(spoke) {
    const d = daysSince(spoke.lastTouched);
    if (d === null) return "No record yet";
    if (d === 0) return "Touched today";
    if (d === 1) return "Touched yesterday";
    if (d <= 30) return `Touched ${d} days ago`;
    return `Last touched ${d} days ago`;
  }

  function markTouched(spoke) {
    spoke.lastTouched = new Date().toISOString().slice(0, 10);
    $("touched-note").textContent = touchedNote(spoke);
  }

  // ── Render the active spoke record ───────────────────────────────────
  function selectSpoke(spokeId) {
    const spoke = (state.data.spokes || []).find((s) => s.id === spokeId);
    if (!spoke) return;
    state.activeSpokeId = spokeId;

    $("panel-empty-state").classList.add("hidden");
    $("panel-content").classList.remove("hidden");

    $("active-spoke-num").textContent = "RECORD: " + spoke.num;
    $("spoke-num-badge").textContent = spoke.num;
    $("spoke-title").textContent = spoke.title;
    $("spoke-subtitle").textContent = spoke.subtitle || "";

    renderStatusPills(spoke);
    $("touched-note").textContent = touchedNote(spoke);

    const rating = clampRating(spoke.rating);
    $("rating-slider").value = rating;
    $("rating-val").textContent = rating;

    const thread = spoke.thread || {};
    $("thread-timestamp").textContent = thread.timestamp || "—";
    $("thread-title").textContent = thread.title || "—";
    $("thread-summary").textContent = thread.summary || "";

    renderExtraFeed(spoke);

    // refresh active TOC highlight
    document.querySelectorAll(".toc-item").forEach((el) => {
      el.classList.toggle("active", el.getAttribute("data-spoke") === spokeId);
    });

    renderWheel(); // refresh the radar's active-spoke highlight
    refreshIcons();
    loadAsanaTasks(spoke); // pull live Asana tasks for this category
  }

  function renderStatusPills(spoke) {
    const cur = spoke.state || "ABIDING";
    document.querySelectorAll("#state-pills .state-pill").forEach((btn) => {
      const s = btn.getAttribute("data-state");
      btn.classList.add("pill-" + s);
      btn.classList.toggle("active", s === cur);
    });
  }

  function renderExtraFeed(spoke) {
    const wrap = $("extra-feed-wrap");
    const feed = spoke.extraFeed || [];
    if (!feed.length) { wrap.classList.add("hidden"); wrap.innerHTML = ""; return; }
    wrap.classList.remove("hidden");
    wrap.innerHTML = '<h4>RECENT — FROM MEETINGS</h4>';
    feed.forEach((entry) => {
      const div = document.createElement("div");
      div.className = "extra-feed-item";
      div.innerHTML = `
        <span class="feed-label">${escapeHtml(entry.label || "FEED")}</span>
        <span class="feed-text">${escapeHtml(entry.text || "")}</span>`;
      wrap.appendChild(div);
    });
  }

  // ── State pills (replaces the clunky dropdown) ───────────────────────
  function onStatePillClick(e) {
    const btn = e.target.closest(".state-pill");
    if (!btn) return;
    const spoke = activeSpoke();
    if (!spoke) return;
    spoke.state = btn.getAttribute("data-state");
    markTouched(spoke);
    renderStatusPills(spoke);
    renderTOC();
    persist();
  }

  function onRatingChange(e) {
    const spoke = activeSpoke();
    if (!spoke) return;
    const v = clampRating(e.target.value);
    spoke.rating = v;
    $("rating-val").textContent = v;
    markTouched(spoke);
    renderWheel();
    persist();
  }

  function activeSpoke() {
    return (state.data.spokes || []).find((s) => s.id === state.activeSpokeId);
  }

  // ── Google Doc journal append ────────────────────────────────────────
  async function appendToDoc() {
    const text = $("journal-input").value.trim();
    const spoke = activeSpoke();
    const url = localStorage.getItem(LS.gdocUrl);
    if (!text) { flashBtn($("doc-append-btn"), "WRITE SOMETHING FIRST"); return; }
    if (!url) {
      flashBtn($("doc-append-btn"), "SET DOC URL IN SETTINGS");
      openSettings();
      return;
    }
    const btn = $("doc-append-btn");
    flashBtn(btn, "APPENDING…");
    try {
      // Apps Script web apps don't return CORS headers; no-cors fire-and-forget.
      await fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spoke: spoke ? spoke.title : "GENERAL",
          text,
          timestamp: new Date().toISOString(),
        }),
      });
      flashBtn(btn, "✓ APPENDED");
      $("journal-input").value = "";
    } catch (err) {
      flashBtn(btn, "FAILED — CHECK URL");
    }
  }

  function flashBtn(btn, msg) {
    if (!btn) return;
    const span = btn.querySelector("span");
    if (!span) return;
    const original = btn.dataset.label || span.textContent;
    btn.dataset.label = original;
    span.textContent = msg;
    clearTimeout(btn._flash);
    btn._flash = setTimeout(() => { span.textContent = btn.dataset.label; }, 2200);
  }

  // ── Feed to Claude (copies a structured prompt to clipboard) ─────────
  async function feedToClaude() {
    const spoke = activeSpoke();
    const journal = $("journal-input").value.trim();
    const topic = spoke ? spoke.title : "LIFE";
    const prompt = [
      `You are helping Jonathan Marshall reflect on his "${topic}" category.`,
      spoke && spoke.subtitle ? `Context: ${spoke.subtitle}.` : "",
      spoke && spoke.thread ? `Latest record: ${spoke.thread.title} — ${spoke.thread.summary}` : "",
      journal ? `\nMy current journal note / question:\n${journal}` : "",
      "",
      "Please reply ONLY in this exact format so my Living Hub can parse it:",
      "",
      `### CLAUDE RESEARCH: ${topic}`,
      "SUMMARY: [1-2 sentence synthesis]",
      "NEXT STEP: [one concrete action item]",
    ].filter(Boolean).join("\n");

    try {
      await navigator.clipboard.writeText(prompt);
      flashBtn($("feed-to-claude-btn"), "✓ COPIED PROMPT");
    } catch (_) {
      // clipboard blocked (e.g. file://) — drop it into the paste box instead
      $("claude-paste-input").value = prompt;
      flashBtn($("feed-to-claude-btn"), "PROMPT IN PASTE BOX");
    }
  }

  // ── Asana (via the Google Apps Script proxy) ─────────────────────────
  // Asana's REST API can't be called directly from a browser (no CORS),
  // so we route through the same Apps Script web app used for journaling.
  // The PAT lives server-side in that script — never in the browser.
  function asanaProxyUrl() { return localStorage.getItem(LS.gdocUrl) || ""; }

  async function proxyAsana(payload) {
    const url = asanaProxyUrl();
    if (!url) throw new Error("no-proxy");
    const res = await fetch(url, {
      method: "POST",
      // text/plain keeps this a "simple" request so the browser skips the
      // CORS preflight that Apps Script web apps can't answer.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  function asanaHint(msg) { return `<li class="asana-hint">${escapeHtml(msg)}</li>`; }

  async function loadAsanaTasks(spoke) {
    const listEl = $("asana-task-list");
    if (!listEl) return;
    const url = asanaProxyUrl();
    const project = localStorage.getItem(LS.asanaProj) || "";
    if (!url) {
      listEl.innerHTML = asanaHint("Connect Asana in settings to see & add your tasks here.");
      return;
    }
    listEl.innerHTML = asanaHint("Loading tasks…");
    try {
      const json = await proxyAsana({ action: "asanaList", spokeId: spoke.id, spokeTitle: spoke.title, project });
      if (!json.ok) { listEl.innerHTML = asanaHint("Asana: " + (json.error || "error")); return; }
      renderAsanaTasks(spoke, json.tasks || []);
    } catch (err) {
      listEl.innerHTML = asanaHint("Couldn't reach the Asana proxy — check the URL in settings.");
    }
  }

  function renderAsanaTasks(spoke, tasks) {
    const listEl = $("asana-task-list");
    listEl.innerHTML = "";
    if (!tasks.length) { listEl.innerHTML = asanaHint("No open tasks for this category."); return; }
    tasks.forEach((t) => {
      const li = document.createElement("li");
      li.className = "asana-task-item";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      const label = document.createElement("span");
      label.className = "asana-task-label";
      label.textContent = t.name;
      li.append(cb, label);
      cb.addEventListener("change", async () => {
        cb.disabled = true;
        li.classList.add("completing");
        try {
          const json = await proxyAsana({ action: "asanaComplete", taskGid: t.gid });
          if (json.ok) { li.remove(); if (!listEl.children.length) listEl.innerHTML = asanaHint("No open tasks for this category."); }
          else { cb.disabled = false; li.classList.remove("completing"); }
        } catch (_) { cb.disabled = false; li.classList.remove("completing"); }
      });
      listEl.appendChild(li);
    });
  }

  async function pushAsanaTask() {
    const input = $("asana-task-input");
    const fb = $("asana-feedback");
    const name = input.value.trim();
    const spoke = activeSpoke();
    if (!name) { showFeedback(fb, "Enter a task first.", "error"); return; }
    if (!asanaProxyUrl()) {
      showFeedback(fb, "Connect Asana in settings first (deploy the Apps Script).", "error");
      openSettings();
      return;
    }
    showFeedback(fb, "Pushing to Asana…", "info");
    const project = localStorage.getItem(LS.asanaProj) || "";
    try {
      const json = await proxyAsana({
        action: "asanaAdd",
        spokeId: spoke.id,
        spokeTitle: spoke.title,
        project,
        name,
      });
      if (json.ok) {
        showFeedback(fb, "✓ Task created in Asana.", "ok");
        input.value = "";
        loadAsanaTasks(spoke);
      } else {
        showFeedback(fb, "Asana: " + (json.error || "error"), "error");
      }
    } catch (err) {
      showFeedback(fb, "Couldn't reach the Asana proxy.", "error");
    }
  }

  // ── Claude research paste parser ─────────────────────────────────────
  function parseClaudeResponse() {
    const raw = $("claude-paste-input").value;
    const fb = $("parse-feedback");
    const spoke = activeSpoke();
    if (!spoke) { showFeedback(fb, "Open a category first.", "error"); return; }
    if (!raw.trim()) { showFeedback(fb, "Paste Claude's reply first.", "error"); return; }

    const topicMatch  = raw.match(/###\s*CLAUDE RESEARCH:\s*(.+)/i);
    const summaryMatch = raw.match(/SUMMARY:\s*([\s\S]*?)(?:\n\s*NEXT STEP:|$)/i);
    const nextMatch    = raw.match(/NEXT STEP:\s*([\s\S]*?)$/i);

    const topic   = topicMatch  ? topicMatch[1].trim()  : null;
    const summary = summaryMatch ? summaryMatch[1].trim() : null;
    const next    = nextMatch    ? nextMatch[1].trim()    : null;

    if (!summary && !next) {
      showFeedback(fb, "Couldn't find SUMMARY:/NEXT STEP: headers.", "error");
      return;
    }

    const now = new Date();
    const stamp = "TODAY, " + String(now.getHours()).padStart(2, "0")
                + String(now.getMinutes()).padStart(2, "0") + " HRS";
    spoke.source = "CLAUDE";
    spoke.lastTouched = now.toISOString().slice(0, 10);
    spoke.thread = spoke.thread || {};
    spoke.thread.timestamp = stamp;
    if (topic)   spoke.thread.title = "CLAUDE RESEARCH: " + topic.toUpperCase();
    if (summary) spoke.thread.summary = summary;

    if (next) {
      spoke.bulletList = spoke.bulletList || { title: "OPEN RESEARCH ITEMS", items: [] };
      spoke.bulletList.items = spoke.bulletList.items || [];
      spoke.bulletList.items.unshift({ id: "i" + Date.now(), task: next, completed: false });
    }

    persist();
    selectSpoke(spoke.id);
    $("claude-paste-input").value = "";
    showFeedback(fb, "✓ Spoke updated from Claude's reply.", "ok");
  }

  // ── 1-click feed sync (server.py) ────────────────────────────────────
  async function checkStatus() {
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      if (!res.ok) throw new Error("no api");
      const json = await res.json();
      state.apiAvailable = true;
      updatePendingBadge(json.pendingFeeds || 0, json.pendingFeedNames || []);
    } catch (_) {
      // server.py not running — hide sync affordances gracefully
      state.apiAvailable = false;
      $("sync-status").textContent = "FEEDS: STATIC MODE";
    }
  }

  function updatePendingBadge(count, names) {
    const badge = $("pending-badge");
    const status = $("sync-status");
    const dot = document.querySelector(".sync-ledger-badge .dot-indicator");
    if (count > 0) {
      badge.classList.remove("hidden");
      $("pending-badge-text").textContent =
        `${count} UNPROCESSED FEED${count === 1 ? "" : "S"}`;
      badge.title = names.join(", ");
      status.textContent = "FEEDS: PENDING";
      if (dot) dot.className = "dot-indicator amber-dot";
    } else {
      badge.classList.add("hidden");
      status.textContent = "FEEDS: SYNCED";
      if (dot) dot.className = "dot-indicator green-dot";
    }
    refreshIcons();
  }

  async function syncFeeds() {
    if (!state.apiAvailable) {
      $("sync-status").textContent = "FEEDS: RUN server.py";
      return;
    }
    const btn = $("sync-now-btn");
    const label = $("sync-btn-label");
    btn.classList.add("spinning");
    label.textContent = "SYNCING…";
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const json = await res.json();
      if (json.ok && json.data) {
        // merge server data into state but keep any unsaved local checklist
        // edits by re-reading from the freshly-synced server payload.
        state.data = json.data;
        localStorage.removeItem(LS.data); // server is now source of truth
        maybeResetChecklists();
        renderTOC();
        renderAnchor();
        renderWheel();
        if (state.activeSpokeId) selectSpoke(state.activeSpokeId);
        updatePendingBadge(json.data.pendingFeeds || 0, json.data.pendingFeedNames || []);
        label.textContent = "✓ SYNCED";
      } else {
        label.textContent = "SYNC FAILED";
      }
    } catch (err) {
      label.textContent = "SYNC ERROR";
    } finally {
      btn.classList.remove("spinning");
      setTimeout(() => { label.textContent = "SYNC FEEDS"; }, 2200);
    }
  }

  // ── Settings drawer + config persistence ─────────────────────────────
  function openSettings() {
    $("settings-drawer").classList.remove("hidden");
    $("settings-drawer").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function toggleSettings() {
    $("settings-drawer").classList.toggle("hidden");
  }

  function loadConfigInputs() {
    $("asana-pat-input").value = localStorage.getItem(LS.asanaPat) || "";
    $("asana-project-input").value = localStorage.getItem(LS.asanaProj) || "";
    $("gdoc-url-input").value = localStorage.getItem(LS.gdocUrl) || "";
  }

  function saveAsanaConfig() {
    localStorage.setItem(LS.asanaPat, $("asana-pat-input").value.trim());
    localStorage.setItem(LS.asanaProj, $("asana-project-input").value.trim());
    flashBtn($("save-asana-config-btn"), "SAVED");
  }
  function saveGdocConfig() {
    localStorage.setItem(LS.gdocUrl, $("gdoc-url-input").value.trim());
    flashBtn($("save-gdoc-config-btn"), "SAVED");
  }

  // ── Import / export ──────────────────────────────────────────────────
  function exportData() {
    const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "living_hub_data.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData() {
    const raw = $("import-json-area").value.trim();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.spokes) throw new Error("missing spokes");
      state.data = normalizeData(parsed);
      persist();
      maybeResetChecklists();
      renderTOC();
      renderAnchor();
      renderWheel();
      state.activeSpokeId = parsed.spokes[0] ? parsed.spokes[0].id : null;
      if (state.activeSpokeId) selectSpoke(state.activeSpokeId);
      $("import-json-area").value = "";
      flashBtn($("import-btn"), "✓ SCHEMA LOADED");
    } catch (err) {
      flashBtn($("import-btn"), "INVALID JSON");
    }
  }

  // ── Misc ─────────────────────────────────────────────────────────────
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  // ── Wire up events ───────────────────────────────────────────────────
  function bindEvents() {
    $("next-quote").addEventListener("click", cycleAnchor);
    $("state-pills").addEventListener("click", onStatePillClick);
    $("rating-slider").addEventListener("input", onRatingChange);
    $("doc-append-btn").addEventListener("click", appendToDoc);
    $("feed-to-claude-btn").addEventListener("click", feedToClaude);
    $("asana-submit-btn").addEventListener("click", pushAsanaTask);
    $("asana-task-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") pushAsanaTask();
    });
    $("claude-parse-btn").addEventListener("click", parseClaudeResponse);
    $("sync-now-btn").addEventListener("click", syncFeeds);
    $("settings-toggle").addEventListener("click", toggleSettings);
    $("save-asana-config-btn").addEventListener("click", saveAsanaConfig);
    $("save-gdoc-config-btn").addEventListener("click", saveGdocConfig);
    $("export-btn").addEventListener("click", exportData);
    $("import-btn").addEventListener("click", importData);
  }

  // ── Boot ─────────────────────────────────────────────────────────────
  async function init() {
    state.anchorIdx = parseInt(localStorage.getItem(LS.anchorIdx) || "0", 10) || 0;
    state.data = await loadData();
    maybeResetChecklists();

    renderAnchor();
    renderTOC();
    renderWheel();
    loadConfigInputs();
    bindEvents();

    // open the first spoke by default
    if (state.data.spokes && state.data.spokes.length) {
      selectSpoke(state.data.spokes[0].id);
    }

    refreshIcons();
    checkStatus();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
