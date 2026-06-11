/**
 * ─────────────────────────────────────────────────────────────────────────
 *  LIVING HUB — GOOGLE DOC JOURNAL ENDPOINT
 * ─────────────────────────────────────────────────────────────────────────
 *
 *  This Apps Script receives journal entries POSTed from the Living Hub web UI
 *  ("APPEND TO DOC" button) and appends them to a Google Doc, newest entry at
 *  the top of the body so the most recent reflection is always first.
 *
 *  ── DEPLOY INSTRUCTIONS ──────────────────────────────────────────────────
 *  1. Create a Google Doc to act as your journal. Copy its ID from the URL:
 *        https://docs.google.com/document/d/<THIS_IS_THE_DOC_ID>/edit
 *  2. Go to https://script.google.com  ->  New Project.
 *  3. Paste this entire file in as Code.gs.
 *  4. Set JOURNAL_DOC_ID below to your Doc ID.
 *  5. Deploy -> New deployment -> type "Web app".
 *        - Execute as:  Me
 *        - Who has access:  Anyone  (the POST carries no secrets; or use
 *          "Anyone with Google account" + a shared SECRET_TOKEN check below)
 *  6. Copy the "/exec" Web App URL and paste it into the Living Hub settings
 *     drawer ("GOOGLE DOC JOURNAL ENDPOINT").
 *
 *  ── PAYLOAD ──────────────────────────────────────────────────────────────
 *  The web UI sends a JSON body shaped like:
 *      {
 *        "spoke":  "PREACHING & TEACHING",
 *        "text":   "Pour out... the journal note body.",
 *        "timestamp": "2026-06-11T13:45:00.000Z"
 *      }
 * ─────────────────────────────────────────────────────────────────────────
 */

// ====== CONFIG ======
var JOURNAL_DOC_ID = 'PASTE_YOUR_GOOGLE_DOC_ID_HERE';

// Asana — paste your Personal Access Token here. Keeping it in the Apps Script
// (server side) means it never lives in the browser. Create one at:
//   Asana -> Settings -> Apps -> Developer Console -> Personal Access Tokens
var ASANA_PAT = '';
// Optional default Asana project GID (the long number in a project's URL).
// Can also be supplied per-request from the Living Hub settings drawer.
var ASANA_DEFAULT_PROJECT = '';

// Optional shared secret. If set (non-empty), the request must include the same
// value in the "token" field of the JSON body, or it will be rejected.
var SECRET_TOKEN = '';
// ====================

/**
 * Handle every POST from the Living Hub UI. If the body carries an "action"
 * field it is an Asana proxy call; otherwise it is a journal append.
 */
function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    if (SECRET_TOKEN && body.token !== SECRET_TOKEN) {
      return _json({ ok: false, error: 'Unauthorized' });
    }

    // ── Asana proxy actions ──────────────────────────────────────────────
    if (body.action) {
      return handleAsana(body);
    }

    var text = (body.text || '').toString().trim();
    if (!text) {
      return _json({ ok: false, error: 'Empty journal text' });
    }

    var spoke = (body.spoke || 'GENERAL').toString();
    var when = body.timestamp ? new Date(body.timestamp) : new Date();
    var stamp = Utilities.formatDate(
      when, Session.getScriptTimeZone(), "EEE, MMM d yyyy — h:mm a"
    );

    var doc = DocumentApp.openById(JOURNAL_DOC_ID);
    var docBody = doc.getBody();

    // Insert newest entry at the very top so the journal reads most-recent-first.
    // We build from the bottom up at index 0 so the final order is header -> meta -> text -> rule.
    docBody.insertHorizontalRule(0);
    docBody.insertParagraph(0, text).setSpacing(1.15);
    var meta = docBody.insertParagraph(0, stamp + '   ·   ' + spoke);
    meta.setForegroundColor('#8a6d3b').setItalic(true).setFontSize(9);
    var header = docBody.insertParagraph(0, 'LIVING HUB JOURNAL ENTRY');
    header.setHeading(DocumentApp.ParagraphHeading.HEADING3);

    doc.saveAndClose();

    return _json({ ok: true, appended: true, stamp: stamp, spoke: spoke });
  } catch (err) {
    return _json({ ok: false, error: err.toString() });
  }
}

/**
 * Asana proxy. Runs server-side (UrlFetchApp) so the browser never needs the
 * token and never hits Asana's CORS wall. Tasks created from the hub are tagged
 * in their notes with [LH:<spokeId>] so each category can list only its own.
 */
function handleAsana(body) {
  if (!ASANA_PAT) {
    return _json({ ok: false, error: 'ASANA_PAT is not set in the Apps Script.' });
  }
  var base = 'https://app.asana.com/api/1.0';
  var headers = { Authorization: 'Bearer ' + ASANA_PAT };
  var project = (body.project || ASANA_DEFAULT_PROJECT || '').toString();
  var marker = body.spokeId ? '[LH:' + body.spokeId + ']' : '';

  try {
    if (body.action === 'asanaList') {
      if (!project) return _json({ ok: false, error: 'No Asana project GID configured.' });
      var listUrl = base + '/tasks?project=' + encodeURIComponent(project) +
                    '&opt_fields=name,completed,notes&limit=100';
      var lr = UrlFetchApp.fetch(listUrl, { headers: headers, muteHttpExceptions: true });
      var ld = JSON.parse(lr.getContentText());
      if (!ld.data) return _json({ ok: false, error: _asanaErr(ld, 'list failed') });
      var tasks = ld.data.filter(function (t) {
        if (t.completed) return false;
        return marker ? (t.notes || '').indexOf(marker) !== -1 : true;
      }).map(function (t) { return { gid: t.gid, name: t.name }; });
      return _json({ ok: true, tasks: tasks });
    }

    if (body.action === 'asanaAdd') {
      if (!project) return _json({ ok: false, error: 'No Asana project GID configured.' });
      var notes = (body.spokeTitle ? 'Living Hub · ' + body.spokeTitle + '\n' : '') + marker;
      var addRes = UrlFetchApp.fetch(base + '/tasks', {
        method: 'post', contentType: 'application/json', headers: headers,
        muteHttpExceptions: true,
        payload: JSON.stringify({ data: { name: (body.name || '').toString(), notes: notes, projects: [project] } })
      });
      var ad = JSON.parse(addRes.getContentText());
      if (ad.data && ad.data.gid) return _json({ ok: true, gid: ad.data.gid });
      return _json({ ok: false, error: _asanaErr(ad, 'add failed') });
    }

    if (body.action === 'asanaComplete') {
      var gid = (body.taskGid || '').toString();
      if (!gid) return _json({ ok: false, error: 'No taskGid.' });
      var cRes = UrlFetchApp.fetch(base + '/tasks/' + gid, {
        method: 'put', contentType: 'application/json', headers: headers,
        muteHttpExceptions: true,
        payload: JSON.stringify({ data: { completed: true } })
      });
      var cd = JSON.parse(cRes.getContentText());
      if (cd.data) return _json({ ok: true });
      return _json({ ok: false, error: _asanaErr(cd, 'complete failed') });
    }

    return _json({ ok: false, error: 'Unknown action: ' + body.action });
  } catch (err) {
    return _json({ ok: false, error: err.toString() });
  }
}

function _asanaErr(data, fallback) {
  return (data && data.errors && data.errors[0] && data.errors[0].message) || fallback;
}

/**
 * Simple health check so you can verify the deployment in a browser.
 */
function doGet() {
  return _json({ ok: true, service: 'Living Hub Endpoint (journal + Asana)', alive: true });
}

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
