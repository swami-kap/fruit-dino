// Fruit Dino scoreboard backend. Paste into a Google Sheet's Apps Script project
// (Extensions > Apps Script) and deploy as a web app. See README.md, "Shared scoreboard".
//
// GET  -> { ok: true, records: [...] }
// POST -> body is one JSON record (sent as text/plain to avoid a CORS preflight)
//         { name, difficulty, attempts, maxAttempts, won, at }
//
// Both accept ?tab=bug to use the 'Scores-bug' tab instead of 'Scores'. Only the tabs
// listed in TABS are allowed, so callers cannot make the script create arbitrary tabs.

var TABS = { '': 'Scores', bug: 'Scores-bug' };
var HEADERS = ['at', 'name', 'difficulty', 'attempts', 'maxAttempts', 'won'];
var DIFFICULTIES = ['easy', 'medium', 'hard'];
var MAX_NAME_LENGTH = 20;
var MAX_ATTEMPT_LIMIT = 20;

// Sheet name for the ?tab= value, or null when the value is not allowed.
function tabName_(e) {
  var key = e && e.parameter && e.parameter.tab ? String(e.parameter.tab) : '';
  return Object.prototype.hasOwnProperty.call(TABS, key) ? TABS[key] : null;
}

function getSheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    // Keep time, name and mode as plain text so Sheets does not turn them into dates or numbers.
    sheet.getRange('A:C').setNumberFormat('@');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function validate_(r) {
  if (!r || typeof r !== 'object') return 'record must be an object';
  if (typeof r.name !== 'string') return 'name must be text';
  var name = r.name.trim().replace(/\s+/g, ' ');
  if (name.length < 1 || name.length > MAX_NAME_LENGTH) return 'name must be 1 to ' + MAX_NAME_LENGTH + ' characters';
  if (DIFFICULTIES.indexOf(r.difficulty) === -1) return 'unknown difficulty';
  if (!Number.isInteger(r.attempts) || r.attempts < 1 || r.attempts > 1000) return 'attempts must be a whole number';
  var limitOk =
    r.maxAttempts === null ||
    (Number.isInteger(r.maxAttempts) && r.maxAttempts >= 1 && r.maxAttempts <= MAX_ATTEMPT_LIMIT);
  if (!limitOk) return 'maxAttempts must be null or 1 to ' + MAX_ATTEMPT_LIMIT;
  if (typeof r.won !== 'boolean') return 'won must be true or false';
  if (typeof r.at !== 'string' || isNaN(Date.parse(r.at))) return 'at must be an ISO time';
  return null;
}

function doGet(e) {
  var name = tabName_(e);
  if (name === null) return json_({ ok: false, error: 'unknown tab' });
  var sheet = getSheet_(name);
  var last = sheet.getLastRow();
  if (last < 2) return json_({ ok: true, records: [] });
  var rows = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  var records = rows.map(function (r) {
    return {
      at: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
      name: String(r[1]),
      difficulty: String(r[2]),
      attempts: Number(r[3]),
      maxAttempts: r[4] === '' ? null : Number(r[4]),
      won: r[5] === true || String(r[5]).toLowerCase() === 'true',
    };
  });
  return json_({ ok: true, records: records });
}

function doPost(e) {
  var name = tabName_(e);
  if (name === null) return json_({ ok: false, error: 'unknown tab' });
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'body is not valid JSON' });
  }
  var problem = validate_(body);
  if (problem) return json_({ ok: false, error: problem });

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    getSheet_(name).appendRow([
      body.at,
      body.name.trim().replace(/\s+/g, ' '),
      body.difficulty,
      body.attempts,
      body.maxAttempts === null ? '' : body.maxAttempts,
      body.won,
    ]);
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}
