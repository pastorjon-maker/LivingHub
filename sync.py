#!/usr/bin/env python3
"""
Living Hub — Feed Sync
======================

Inspects the local "drop" folders (where Otter transcripts and other feeds
land) and folds any pending files into ``data.json``.

Design goals
------------
* Be importable from ``server.py`` so a "Sync Now" button can run it instantly.
* Be runnable standalone:  ``python3 sync.py``
* Never crash the server: every public function returns plain data / dicts.

Drop folder layout (created on demand)::

    sync-drops/
        otter-transcripts/      <- Otter .txt / .vtt exports
        claude-research/        <- pasted Claude markdown blocks
        misc/                   <- anything else

Counting vs. processing
-----------------------
``count_pending()`` only *looks* — it never deletes. It is safe to call on
every page load to drive the header warning badge.

``run_sync()`` actually processes the files: it appends a feed entry to the
matching spoke (Otter transcripts go to the SHEPHERDING spoke by default),
archives the raw file under ``sync-drops/_processed/`` and updates the
``pendingFeeds`` counters in ``data.json``.
"""

from __future__ import annotations

import json
import os
import shutil
from datetime import datetime, date
from pathlib import Path

# --------------------------------------------------------------------------
# Paths
# --------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / "data.json"
DROPS_DIR = ROOT / "sync-drops"
PROCESSED_DIR = DROPS_DIR / "_processed"

# folder name -> spoke id it feeds into
DROP_FOLDERS = {
    "otter-transcripts": "shepherding",
    "claude-research": "preaching-teaching",
    "misc": None,  # logged but not routed to a specific spoke
}

# files we ignore when counting (hidden files, READMEs, .gitkeep)
IGNORE = {".gitkeep", ".DS_Store"}


# --------------------------------------------------------------------------
# Filesystem helpers
# --------------------------------------------------------------------------
def ensure_dirs() -> None:
    """Create the drop-folder skeleton if it does not exist yet."""
    for name in DROP_FOLDERS:
        (DROPS_DIR / name).mkdir(parents=True, exist_ok=True)
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    # keep folders in git
    for name in DROP_FOLDERS:
        keep = DROPS_DIR / name / ".gitkeep"
        if not keep.exists():
            keep.write_text("")


def _is_feed_file(p: Path) -> bool:
    return p.is_file() and p.name not in IGNORE and not p.name.startswith(".")


def _pending_files() -> list[Path]:
    """All un-processed feed files across every drop folder."""
    ensure_dirs()
    files: list[Path] = []
    for name in DROP_FOLDERS:
        folder = DROPS_DIR / name
        if folder.exists():
            files.extend(sorted(p for p in folder.iterdir() if _is_feed_file(p)))
    return files


# --------------------------------------------------------------------------
# data.json helpers
# --------------------------------------------------------------------------
def load_data() -> dict:
    if DATA_FILE.exists():
        with DATA_FILE.open("r", encoding="utf-8") as fh:
            return json.load(fh)
    return {"user": "JONATHAN MARSHALL", "spokes": [], "pendingFeeds": 0}


def save_data(data: dict) -> None:
    with DATA_FILE.open("w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)
        fh.write("\n")


def _find_spoke(data: dict, spoke_id: str | None) -> dict | None:
    if not spoke_id:
        return None
    for spoke in data.get("spokes", []):
        if spoke.get("id") == spoke_id:
            return spoke
    return None


# --------------------------------------------------------------------------
# Public API
# --------------------------------------------------------------------------
def count_pending() -> dict:
    """Return pending-feed metadata WITHOUT touching any files.

    Shape::
        {"pendingFeeds": 2, "pendingFeedNames": ["a.txt", "b.vtt"]}
    """
    files = _pending_files()
    return {
        "pendingFeeds": len(files),
        "pendingFeedNames": [p.name for p in files],
    }


def _reset_recurring_checklists(data: dict) -> bool:
    """Reset weekly/monthly checkboxes if the period has rolled over.

    Returns True if anything was reset (so the caller can persist).
    """
    today = date.today()
    last_raw = data.get("lastRefreshed")
    changed = False

    last = None
    if last_raw:
        try:
            last = datetime.strptime(last_raw, "%Y-%m-%d").date()
        except ValueError:
            last = None

    if last is None:
        data["lastRefreshed"] = today.isoformat()
        return False

    # ISO week comparison for weekly, (year, month) for monthly
    new_week = today.isocalendar()[:2] != last.isocalendar()[:2]
    new_month = (today.year, today.month) != (last.year, last.month)

    if new_week or new_month:
        for spoke in data.get("spokes", []):
            lists = spoke.get("checklists", {})
            if new_week:
                for item in lists.get("weekly", []):
                    if item.get("completed"):
                        item["completed"] = False
                        changed = True
            if new_month:
                for item in lists.get("monthly", []):
                    if item.get("completed"):
                        item["completed"] = False
                        changed = True
        data["lastRefreshed"] = today.isoformat()
        changed = True

    return changed


def run_sync() -> dict:
    """Process every pending drop file and fold it into data.json.

    Returns the freshly-updated data dict.
    """
    ensure_dirs()
    data = load_data()
    files = _pending_files()
    processed = 0

    for path in files:
        folder_name = path.parent.name
        spoke_id = DROP_FOLDERS.get(folder_name)
        spoke = _find_spoke(data, spoke_id)

        # Read a short preview of the transcript for the feed entry.
        try:
            preview = path.read_text(encoding="utf-8", errors="replace").strip()
        except Exception:
            preview = ""
        snippet = (preview[:240] + "…") if len(preview) > 240 else preview
        stamp = datetime.now().strftime("%a, %H%M HRS")

        if spoke is not None:
            spoke.setdefault("extraFeed", [])
            label = "OTTER TRANSCRIPT" if folder_name == "otter-transcripts" else "FEED"
            spoke["extraFeed"].insert(0, {
                "label": f"{label} · {path.name}",
                "text": snippet or f"Imported {path.name} ({stamp}).",
            })
            spoke["lastTouched"] = date.today().isoformat()

        # Archive the raw file so it is not re-counted.
        dest = PROCESSED_DIR / f"{datetime.now():%Y%m%d-%H%M%S}-{path.name}"
        try:
            shutil.move(str(path), str(dest))
        except Exception:
            # if we cannot move it, at least remove it so it is not stuck pending
            try:
                path.unlink()
            except Exception:
                pass
        processed += 1

    # roll over recurring checklists if needed
    _reset_recurring_checklists(data)

    # refresh pending counters (should be zero after a full sync)
    remaining = count_pending()
    data["pendingFeeds"] = remaining["pendingFeeds"]
    data["pendingFeedNames"] = remaining["pendingFeedNames"]
    data["lastSync"] = datetime.now().isoformat(timespec="seconds")
    data["_lastSyncProcessed"] = processed

    save_data(data)
    return data


def refresh_status() -> dict:
    """Update pendingFeeds in data.json and return the status dict.

    Lightweight: used by the GET /api/status endpoint on page load.
    """
    data = load_data()
    status = count_pending()
    # persist the counts (and roll over checklists) so the file reflects reality
    rolled = _reset_recurring_checklists(data)
    if (
        data.get("pendingFeeds") != status["pendingFeeds"]
        or data.get("pendingFeedNames") != status["pendingFeedNames"]
        or rolled
    ):
        data["pendingFeeds"] = status["pendingFeeds"]
        data["pendingFeedNames"] = status["pendingFeedNames"]
        save_data(data)
    return {
        "pendingFeeds": status["pendingFeeds"],
        "pendingFeedNames": status["pendingFeedNames"],
        "lastSync": data.get("lastSync"),
    }


# --------------------------------------------------------------------------
# CLI entry point
# --------------------------------------------------------------------------
def main() -> None:
    before = count_pending()
    print(f"[sync] {before['pendingFeeds']} pending feed(s): "
          f"{', '.join(before['pendingFeedNames']) or '(none)'}")
    data = run_sync()
    print(f"[sync] processed {data.get('_lastSyncProcessed', 0)} file(s). "
          f"{data.get('pendingFeeds', 0)} now pending.")
    print(f"[sync] data.json updated at {data.get('lastSync')}")


if __name__ == "__main__":
    main()
