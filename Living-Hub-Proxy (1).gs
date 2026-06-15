function breezeGet_(path) {
  var p = PropertiesService.getScriptProperties();
  var url = 'https://' + p.getProperty('BREEZE_SUBDOMAIN') + '.breezechms.com/api' + path;
  var res = UrlFetchApp.fetch(url, { headers: { 'Api-Key': p.getProperty('BREEZE_API_KEY') }, muteHttpExceptions: true });
  return JSON.parse(res.getContentText());
}

var STATUS_FIELD = '1458812706';
var AGE_FIELD    = '659196916';
var MEMBER_STATUSES = { 'Active Member': true };   // add 'Regular Attender': true, etc. if you want

// ===== Asana: "Living Hub" project =====
var HUB_PROJECT = '1215650794807262';
var HUB_SECTIONS = {
  'WALK WITH GOD':1,'HEALTH & FITNESS':1,'READING & MIND':1,'FINANCES':1,
  'HOBBIES & CRAFT':1,'FRIENDSHIPS':1,'MAINTENANCE':1,'JESS':1,'FAMILY':1,
  'PREACHING & STUDY':1,'THE WORK':1
};
var IDEAS_SECTION = '1215650794807281';
var HUB_SECTION_GIDS = {
  'WALK WITH GOD':'1215650729929835','HEALTH & FITNESS':'1215650794715049','READING & MIND':'1215650794714825',
  'FINANCES':'1215650729932784','HOBBIES & CRAFT':'1215650638367186','FRIENDSHIPS':'1215650650890456',
  'MAINTENANCE':'1215653527362595','JESS':'1215650729918609','FAMILY':'1215650638429496',
  'PREACHING & STUDY':'1215650839592963','THE WORK':'1215650794781667','IDEAS':'1215650794807281'
};
function asanaGet_(path) {
  var token = PropertiesService.getScriptProperties().getProperty('ASANA_PAT');
  var res = UrlFetchApp.fetch('https://app.asana.com/api/1.0' + path, {
    headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true
  });
  return JSON.parse(res.getContentText());
}
function livingHubData_() {
  var r = asanaGet_('/projects/' + HUB_PROJECT + '/tasks?opt_fields=name,completed,due_on,memberships.section.name&limit=100');
  var tasks = r && r.data;
  if (!Array.isArray(tasks)) return {};
  var out = {};
  tasks.forEach(function (t) {
    if (t.completed) return;
    var sec = null, ms = t.memberships || [];
    for (var i = 0; i < ms.length; i++) {
      var nm = ms[i].section && ms[i].section.name;
      if (nm && HUB_SECTIONS[nm]) { sec = nm; break; }
    }
    if (!sec) return;
    (out[sec] = out[sec] || []).push({ name: t.name, due: t.due_on || '', gid: t.gid });
  });
  return out;
}
function completeTask_(gid) {
  if (!gid) return { ok:false, error:'no task id' };
  var token = PropertiesService.getScriptProperties().getProperty('ASANA_PAT');
  var res = UrlFetchApp.fetch('https://app.asana.com/api/1.0/tasks/' + gid, {
    method:'put', contentType:'application/json',
    headers:{ Authorization:'Bearer ' + token }, muteHttpExceptions:true,
    payload: JSON.stringify({ data:{ completed:true } })
  });
  var d; try { d = JSON.parse(res.getContentText()); } catch(e){ d = {}; }
  return (d.data && d.data.completed) ? { ok:true } : { ok:false, error:(d.errors && d.errors[0] && d.errors[0].message) || 'failed' };
}

function famName_(last) {
  var base = String(last || '').trim();
  if (!base) return 'The Family';
  var suffix = '';
  var m = base.match(/^(.*?)[\s,]+(Jr\.?|Sr\.?|II|III|IV)$/i);
  if (m) { base = m[1].trim(); suffix = ' ' + m[2].replace(/\.?$/, '.').replace(/II\.|III\.|IV\./i, function (s) { return s.slice(0, -1); }); }
  var lower = base.toLowerCase();
  var plural;
  if (/(s|x|z|ch|sh)$/.test(lower)) plural = base + 'es';
  else if (/[^aeiou]y$/.test(lower)) plural = base.slice(0, -1) + 'ies';
  else plural = base + 's';
  return 'The ' + plural + suffix;
}
function nameOf_(person) {
  var d = (person && person.details) ? person.details : {};
  return { first: (person && person.first_name) || d.first_name || '', last: (person && person.last_name) || d.last_name || '' };
}
function statusName_(person) {
  var d = person && person.details, s = d && d[STATUS_FIELD];
  return (s && s.name) ? s.name : '';
}
function ageOf_(person) {
  var d = person && person.details, raw = d && d[AGE_FIELD];
  if (!raw) return null;
  var y, mo = 1, day = 1, m;
  if (typeof raw === 'object') {
    if (raw.year) { y = +raw.year; mo = +(raw.month || 1); day = +(raw.day || 1); }
    else raw = raw.value || raw.name || raw.date || '';
  }
  if (typeof raw === 'string') {
    if ((m = raw.match(/(\d{4})-(\d{1,2})-(\d{1,2})/))) { y = +m[1]; mo = +m[2]; day = +m[3]; }
    else if ((m = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/))) { mo = +m[1]; day = +m[2]; y = +m[3]; }
  }
  if (!y || y < 1900) return null;
  var now = new Date(), age = now.getFullYear() - y;
  if ((now.getMonth() + 1) < mo || ((now.getMonth() + 1) === mo && now.getDate() < day)) age--;
  return (age < 0 || age > 120) ? null : age;
}

function flockData_() {
  var people = breezeGet_('/people?details=1&limit=2000');
  if (!Array.isArray(people)) return [];
  var byId = {};
  people.forEach(function (p) { byId[String(p.id)] = p; });

  function label(e, withLast) {
    var nm = withLast ? (e.first + ' ' + e.last).trim() : e.first;
    return (e.kid && e.age != null) ? (nm + ' (' + e.age + ')') : nm;
  }

  var seen = {}, out = [];
  people.forEach(function (p) {
    var fam = p.family;
    if (Array.isArray(fam) && fam.length > 0) {
      var fid = fam[0].family_id;
      if (seen[fid]) return; seen[fid] = true;

      var head = null, spouse = null, others = [], qualifies = false;
      fam.forEach(function (m) {
        var person = byId[String(m.person_id)] || m;
        if (MEMBER_STATUSES[statusName_(person)]) qualifies = true;
        var n = nameOf_(person), role = String(m.role_name || '').toLowerCase();
        var e = { first: n.first, last: n.last, age: ageOf_(person), kid: false };
        if (role.indexOf('head') > -1) head = e;
        else if (role.indexOf('spouse') > -1 || role.indexOf('wife') > -1 || role.indexOf('husband') > -1) spouse = e;
        else { e.kid = true; others.push(e); }
      });
      if (!qualifies) return;

      var ordered = []; if (head) ordered.push(head); if (spouse) ordered.push(spouse); ordered = ordered.concat(others);
      if (!ordered.length) return;
      var last = (head && head.last) || ordered[0].last || '';
      out.push({
        who: famName_(last),
        sub: ordered.map(function (e) { return label(e, false); }).join(', '),
        members: ordered.map(function (e) { return label(e, true); }),
        rcp: ''
      });
    } else {
      if (!MEMBER_STATUSES[statusName_(p)]) return;
      var n = nameOf_(p); if (!n.first && !n.last) return;
      out.push({ who: (n.first + ' ' + n.last).trim(), sub: '', members: [(n.first + ' ' + n.last).trim()], rcp: '' });
    }
  });
  return out;
}

function agecheck_() {
  var people = breezeGet_('/people?details=1&limit=2000'), out = [];
  for (var i = 0; i < people.length && out.length < 6; i++) {
    var d = people[i].details, raw = d && d[AGE_FIELD];
    if (raw != null && raw !== '') out.push(raw);
  }
  return { age_field: AGE_FIELD, samples: out };
}

function inboxData_() {
  var out = { gmail: null, drive: null, ideas: [] };
  try { out.gmail = GmailApp.getInboxThreads(0, 100).length; } catch (e) {}
  try {
    var fname = PropertiesService.getScriptProperties().getProperty('DRIVE_INBOX_FOLDER');
    if (fname) {
      var it = DriveApp.getFoldersByName(fname);
      if (it.hasNext()) {
        var files = it.next().getFiles(), n = 0;
        while (files.hasNext()) { files.next(); n++; }
        out.drive = n;
      }
    }
  } catch (e) {}
  try {
    var token = PropertiesService.getScriptProperties().getProperty('ASANA_PAT');
    var r = UrlFetchApp.fetch('https://app.asana.com/api/1.0/sections/' + IDEAS_SECTION + '/tasks?opt_fields=name,completed&limit=50', { headers:{ Authorization:'Bearer ' + token }, muteHttpExceptions:true });
    var d = JSON.parse(r.getContentText());
    if (d && d.data) d.data.forEach(function (t) { if (!t.completed) out.ideas.push({ name:t.name, gid:t.gid }); });
  } catch (e) {}
  return out;
}

function addTask_(section, name) {
  if (!name) return { ok:false, error:'no task name' };
  var token = PropertiesService.getScriptProperties().getProperty('ASANA_PAT');
  var hdr = { Authorization: 'Bearer ' + token };
  var res = UrlFetchApp.fetch('https://app.asana.com/api/1.0/tasks', {
    method:'post', contentType:'application/json', headers:hdr, muteHttpExceptions:true,
    payload: JSON.stringify({ data:{ name:name, projects:[HUB_PROJECT] } })
  });
  var d; try { d = JSON.parse(res.getContentText()); } catch(e){ d = {}; }
  if (!d.data || !d.data.gid) return { ok:false, error:(d.errors && d.errors[0] && d.errors[0].message) || 'add failed' };
  var sgid = HUB_SECTION_GIDS[(section || '').toUpperCase()];
  if (sgid) {
    UrlFetchApp.fetch('https://app.asana.com/api/1.0/sections/' + sgid + '/addTask', {
      method:'post', contentType:'application/json', headers:hdr, muteHttpExceptions:true,
      payload: JSON.stringify({ data:{ task: d.data.gid } })
    });
  }
  return { ok:true, gid:d.data.gid };
}

function doGet(e) {
  var prm = (e && e.parameter) || {};
  if (prm.token !== PropertiesService.getScriptProperties().getProperty('PROXY_TOKEN')) return _out({ error: 'unauthorized' }, prm.callback);
  var data;
  if (prm.action === 'flock') data = flockData_();
  else if (prm.action === 'livinghub') data = livingHubData_();
  else if (prm.action === 'complete') data = completeTask_(prm.task);
  else if (prm.action === 'inbox') data = inboxData_();
  else if (prm.action === 'addtask') data = addTask_(prm.section, prm.name);
  else if (prm.action === 'agecheck') data = agecheck_();
  else data = { error: 'unknown action' };
  return _out(data, prm.callback);
}

function _out(obj, callback) {
  var json = JSON.stringify(obj);
  if (callback) return ContentService.createTextOutput(callback + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
