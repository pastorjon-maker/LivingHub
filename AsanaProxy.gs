/**
 * ─────────────────────────────────────────────────────────────────────────
 *  LIVING HUB — ASANA PROXY  (phone-friendly, Asana only)
 * ─────────────────────────────────────────────────────────────────────────
 *  SETUP (you only edit ONE line — the token below):
 *   1. Paste your Asana token between the quotes on the ASANA_PAT line.
 *   2. Deploy ▸ New deployment ▸ type "Web app"
 *        Execute as: Me      Who has access: Anyone
 *   3. Copy the "/exec" URL, paste it into the hub's settings
 *      ("APPS SCRIPT WEB APP URL").
 * ─────────────────────────────────────────────────────────────────────────
 */

// ▼▼▼  PASTE YOUR ASANA TOKEN BETWEEN THE QUOTES  ▼▼▼
var ASANA_PAT = '';
// ▲▲▲  that is the only line you must edit  ▲▲▲


function doPost(e) {
  try {
    var body = (e && e.postData && e.postData.contents)
      ? JSON.parse(e.postData.contents) : {};
    return handleAsana(body);
  } catch (err) {
    return _json({ ok: false, error: err.toString() });
  }
}

function handleAsana(body) {
  if (!ASANA_PAT) {
    return _json({ ok: false, error: 'ASANA_PAT is not set in the Apps Script.' });
  }
  var base = 'https://app.asana.com/api/1.0';
  var headers = { Authorization: 'Bearer ' + ASANA_PAT };
  var project = (body.project || '').toString();
  var title = (body.spokeTitle || '').toString();

  try {
    if (body.action === 'asanaList') {
      if (!project) return _json({ ok: false, error: 'No Asana project GID configured.' });
      var sgid = _asanaSection(base, headers, project, title, false);
      if (!sgid) return _json({ ok: true, tasks: [] }); // section not created yet
      var lr = UrlFetchApp.fetch(
        base + '/sections/' + sgid + '/tasks?opt_fields=name,completed&limit=100',
        { headers: headers, muteHttpExceptions: true });
      var ld = JSON.parse(lr.getContentText());
      if (!ld.data) return _json({ ok: false, error: _asanaErr(ld, 'list failed') });
      var tasks = ld.data.filter(function (t) { return !t.completed; })
                         .map(function (t) { return { gid: t.gid, name: t.name }; });
      return _json({ ok: true, tasks: tasks });
    }

    if (body.action === 'asanaAdd') {
      if (!project) return _json({ ok: false, error: 'No Asana project GID configured.' });
      var sg = _asanaSection(base, headers, project, title, true); // create if missing
      var addRes = UrlFetchApp.fetch(base + '/tasks', {
        method: 'post', contentType: 'application/json', headers: headers,
        muteHttpExceptions: true,
        payload: JSON.stringify({ data: {
          name: (body.name || '').toString(),
          notes: title ? 'Living Hub · ' + title : 'Living Hub',
          projects: [project]
        } })
      });
      var ad = JSON.parse(addRes.getContentText());
      if (!ad.data || !ad.data.gid) return _json({ ok: false, error: _asanaErr(ad, 'add failed') });
      if (sg) {
        UrlFetchApp.fetch(base + '/sections/' + sg + '/addTask', {
          method: 'post', contentType: 'application/json', headers: headers,
          muteHttpExceptions: true,
          payload: JSON.stringify({ data: { task: ad.data.gid } })
        });
      }
      return _json({ ok: true, gid: ad.data.gid });
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

function _asanaSection(base, headers, project, name, createIfMissing) {
  if (!name) return '';
  var sr = UrlFetchApp.fetch(
    base + '/projects/' + project + '/sections?opt_fields=name&limit=100',
    { headers: headers, muteHttpExceptions: true });
  var sd = JSON.parse(sr.getContentText());
  var want = name.trim().toLowerCase();
  if (sd.data) {
    for (var i = 0; i < sd.data.length; i++) {
      if ((sd.data[i].name || '').trim().toLowerCase() === want) return sd.data[i].gid;
    }
  }
  if (!createIfMissing) return '';
  var cr = UrlFetchApp.fetch(base + '/projects/' + project + '/sections', {
    method: 'post', contentType: 'application/json', headers: headers,
    muteHttpExceptions: true,
    payload: JSON.stringify({ data: { name: name } })
  });
  var cd = JSON.parse(cr.getContentText());
  return (cd.data && cd.data.gid) || '';
}

function _asanaErr(data, fallback) {
  return (data && data.errors && data.errors[0] && data.errors[0].message) || fallback;
}

// Open the /exec URL in a browser to confirm it's alive.
function doGet() {
  return _json({ ok: true, service: 'Living Hub Asana Proxy', alive: true });
}

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
