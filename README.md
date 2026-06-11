# Living Hub v5 — Field Notes

A tactile, kraft-cover "field notes" dashboard for life, ministry, and craft.
Grace, not guilt. One spiral notebook for every spoke of life — with direct
integrations into **Google Docs**, **Asana**, and **Claude**, plus a 1-click
feed sync for Otter transcripts.

```
┌────────────────────────────────────────────────────────────────┐
│                       LIVING HUB WEB UI                        │
│  Recurring checklists · Google Doc journal · Asana push        │
│  Claude research loop · pending-feed badge · 1-click sync      │
└─────────────────────────────┬──────────────────────────────────┘
                              │  HTTP (GET /api/status, POST /api/sync …)
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                  CUSTOM PYTHON SERVER (server.py)              │
│  Serves static files + sync API. Imports sync.py logic.        │
└────────────────────────────────────────────────────────────────┘
```

## Quick start

```bash
python3 server.py            # → http://localhost:8000
# PORT=9000 python3 server.py # custom port
```

Then open <http://localhost:8000>. Pick a category on the left to open its
record on the ruled page.

> Static-only mode: you can also just open `index.html` directly (or
> `python3 -m http.server`). The UI degrades gracefully — the sync button
> shows `FEEDS: STATIC MODE` and everything else (checklists, journal, Asana,
> Claude parser) still works from the browser.

## Files

| File | Purpose |
|------|---------|
| `index.html` | The notebook UI markup. |
| `style.css` | Tactile kraft/spiral/ruled-paper styling. |
| `app.js` | Front-end controller (rendering, integrations, persistence). |
| `data.json` | The data schema — spokes, checklists, truth anchors. |
| `server.py` | Zero-dependency static server + JSON API. |
| `sync.py` | Drop-folder inspection + feed processing (importable + CLI). |
| `GoogleAppsScript.js` | Apps Script template for the Google Doc journal endpoint. |
| `sync-drops/` | Where Otter transcripts / Claude research / misc feeds land. |

## Features

### 1. Recurring checklists
Each spoke carries `weekly` and `monthly` checklists. Checked states persist in
the browser and auto-reset when the ISO week / calendar month rolls over
(mirrored server-side in `sync.py` so it resets even while the tab is closed).

### 2. Google Doc journal
Write in **POUR OUT & ASK**, hit **APPEND TO DOC**. The note is POSTed to your
Apps Script web app and prepended to a Google Doc (newest first). Deploy
`GoogleAppsScript.js` — instructions are in its header — and paste the `/exec`
URL into the settings drawer.

### 3. Asana task push
Store your Personal Access Token + default Project GID in the settings drawer
(kept in `localStorage`, never committed). The **ADD TO ASANA** box creates a
task directly via the Asana API. If the browser blocks it with CORS and
`server.py` is running, it transparently falls back to the `/api/asana` proxy.

### 4. Claude research loop
**FEED TO CLAUDE** copies a structured prompt to your clipboard that asks Claude
to reply in a fixed format:

```
### CLAUDE RESEARCH: [TOPIC]
SUMMARY: [1-2 sentences]
NEXT STEP: [Action item]
```

Paste the reply into **PASTE CLAUDE RESPONSE** and the hub extracts the title,
summary, and next step and folds them into the spoke automatically.

### 5. Otter feed alerts + 1-click sync
Drop Otter exports into `sync-drops/otter-transcripts/`. The header shows
`⚠️ N UNPROCESSED FEEDS`; **SYNC FEEDS** calls `POST /api/sync`, which folds the
transcripts into the matching spoke's feed log, archives the raw files under
`sync-drops/_processed/`, and clears the badge.

## Verify

```bash
# Backend
python3 server.py &
curl -s localhost:8000/api/status            # pending feed counts
echo "test transcript" > sync-drops/otter-transcripts/demo.txt
curl -s localhost:8000/api/status            # → pendingFeeds: 1
curl -s -X POST localhost:8000/api/sync      # processes it
curl -s localhost:8000/api/status            # → pendingFeeds: 0

# Or run the sync directly
python3 sync.py
```
