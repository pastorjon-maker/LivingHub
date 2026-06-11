#!/usr/bin/env python3
"""
Living Hub — Custom Static + API Server
=======================================

A tiny zero-dependency server (standard library only) that:

  * serves the static front-end (index.html, style.css, app.js, data.json …)
  * exposes ``GET  /api/status``  -> pending drop-file counts
  * exposes ``POST /api/sync``    -> runs the feed sync and returns data.json
  * exposes ``POST /api/save``    -> persists an edited data.json from the UI
  * exposes ``POST /api/asana``   -> optional server-side Asana proxy

Run it::

    python3 server.py            # http://localhost:8000
    PORT=9000 python3 server.py  # custom port

This replaces ``python3 -m http.server`` so the UI's "SYNC FEEDS" button and
pending-feed badge work end to end.
"""

from __future__ import annotations

import json
import os
import urllib.request
import urllib.error
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import sync  # local module — importable sync logic

ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / "data.json"
PORT = int(os.environ.get("PORT", "8000"))


class HubHandler(SimpleHTTPRequestHandler):
    """Static file handler plus a small JSON API."""

    # ---- helpers ---------------------------------------------------------
    def _send_json(self, payload: dict, status: int = 200) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self) -> dict:
        length = int(self.headers.get("Content-Length", 0) or 0)
        if length <= 0:
            return {}
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return {}

    # ---- routing ---------------------------------------------------------
    def do_OPTIONS(self) -> None:  # noqa: N802 (stdlib naming)
        self._send_json({"ok": True})

    def do_GET(self) -> None:  # noqa: N802
        if self.path.split("?")[0] == "/api/status":
            try:
                self._send_json({"ok": True, **sync.refresh_status()})
            except Exception as exc:  # pragma: no cover - defensive
                self._send_json({"ok": False, "error": str(exc)}, status=500)
            return
        # fall back to static file serving
        super().do_GET()

    def do_POST(self) -> None:  # noqa: N802
        route = self.path.split("?")[0]
        if route == "/api/sync":
            return self._handle_sync()
        if route == "/api/save":
            return self._handle_save()
        if route == "/api/asana":
            return self._handle_asana()
        self._send_json({"ok": False, "error": f"Unknown route {route}"}, status=404)

    # ---- handlers --------------------------------------------------------
    def _handle_sync(self) -> None:
        try:
            data = sync.run_sync()
            self._send_json({"ok": True, "data": data})
        except Exception as exc:
            self._send_json({"ok": False, "error": str(exc)}, status=500)

    def _handle_save(self) -> None:
        body = self._read_json_body()
        data = body.get("data", body)
        if not isinstance(data, dict) or "spokes" not in data:
            self._send_json({"ok": False, "error": "Invalid data payload"}, status=400)
            return
        try:
            with DATA_FILE.open("w", encoding="utf-8") as fh:
                json.dump(data, fh, indent=2, ensure_ascii=False)
                fh.write("\n")
            self._send_json({"ok": True, "saved": True})
        except Exception as exc:
            self._send_json({"ok": False, "error": str(exc)}, status=500)

    def _handle_asana(self) -> None:
        """Optional server-side proxy for Asana task creation.

        The browser can call Asana directly; this proxy exists for cases where
        CORS or token handling is easier server-side. Expects::
            { "pat": "...", "project": "gid", "name": "Task name", "notes": "" }
        """
        body = self._read_json_body()
        pat = body.get("pat")
        project = body.get("project")
        name = body.get("name")
        if not (pat and project and name):
            self._send_json(
                {"ok": False, "error": "pat, project and name are required"},
                status=400,
            )
            return

        req = urllib.request.Request(
            "https://app.asana.com/api/1.0/tasks",
            data=json.dumps({
                "data": {
                    "name": name,
                    "notes": body.get("notes", ""),
                    "projects": [project],
                }
            }).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {pat}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
            self._send_json({"ok": True, "task": payload.get("data", {})})
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", "replace")
            self._send_json({"ok": False, "error": detail}, status=exc.code)
        except Exception as exc:
            self._send_json({"ok": False, "error": str(exc)}, status=502)

    # quieter, prefixed logging
    def log_message(self, fmt: str, *args) -> None:  # noqa: A002
        print(f"[hub] {self.address_string()} - {fmt % args}")


def main() -> None:
    sync.ensure_dirs()
    handler = partial(HubHandler, directory=str(ROOT))
    server = ThreadingHTTPServer(("", PORT), handler)
    print(f"╔══════════════════════════════════════════════╗")
    print(f"║  LIVING HUB server running                     ")
    print(f"║  → http://localhost:{PORT}")
    print(f"║  API: GET /api/status · POST /api/sync /save /asana")
    print(f"╚══════════════════════════════════════════════╝")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[hub] shutting down.")
        server.shutdown()


if __name__ == "__main__":
    main()
