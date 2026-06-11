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
// Optional shared secret. If set (non-empty), the request must include the same
// value in the "token" field of the JSON body, or it will be rejected.
var SECRET_TOKEN = '';
// ====================

/**
 * Handle the POST from the Living Hub journal.
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
 * Simple health check so you can verify the deployment in a browser.
 */
function doGet() {
  return _json({ ok: true, service: 'Living Hub Journal Endpoint', alive: true });
}

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
