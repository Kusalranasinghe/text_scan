const TOKEN_PROPERTY = 'APP_TOKEN';
const SPREADSHEET_ID_PROPERTY = 'SPREADSHEET_ID';
const SHEET_NAME = 'Applications';

const FIELD_COLUMNS = [
  ['centerName', 'Center Name'],
  ['centerCity', 'Center City'],
  ['fullName', 'Full Name (Q1)'],
  ['address', 'Address (Q2)'],
  ['school', 'School (Q3)'],
  ['dateOfBirth', 'Date of Birth (Q4)'],
  ['residentialCity', 'Residential City (Q5)'],
  ['residentialDistrict', 'Residential District (Q6)'],
  ['phoneNumber', 'Phone Number (Q7)'],
  ['whatsappNumber', 'WhatsApp Number (Q7)'],
  ['nationalId', 'National ID Number (Q8)'],
  ['loggingNumber', 'Chemistry with Charitha Logging Number (Q9)'],
  ['studySection', 'A/L Study Section (Q10)'],
  ['gender', 'Gender (Q11)'],
  ['digitalIdCard', 'Digital ID Card Created? (Q12)'],
  ['examAttempt', 'A/L Exam Attempt (Q13)'],
  ['additionalAnswer', 'Additional Written Response (Q14)'],
];

function setup() {
  const properties = PropertiesService.getScriptProperties();
  let token = properties.getProperty(TOKEN_PROPERTY);
  if (!token) {
    token = Utilities.getUuid() + Utilities.getUuid();
    properties.setProperty(TOKEN_PROPERTY, token);
  }

  let spreadsheetId = properties.getProperty(SPREADSHEET_ID_PROPERTY);
  let spreadsheet;
  if (spreadsheetId) {
    spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  } else {
    spreadsheet = SpreadsheetApp.create('Application Form Submissions');
    spreadsheetId = spreadsheet.getId();
    properties.setProperty(SPREADSHEET_ID_PROPERTY, spreadsheetId);
  }

  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.getSheets()[0];
    sheet.setName(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Submitted At'].concat(FIELD_COLUMNS.map(function (field) {
      return field[1];
    })));
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, FIELD_COLUMNS.length + 1).setFontWeight('bold');
  }

  Logger.log('APP_SCRIPT_TOKEN=' + token);
  Logger.log('SPREADSHEET_URL=' + spreadsheet.getUrl());
}

function rotateToken() {
  const token = Utilities.getUuid() + Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperty(TOKEN_PROPERTY, token);
  Logger.log('APP_SCRIPT_TOKEN=' + token);
}

function doGet(e) {
  const parameters = e && e.parameter ? e.parameter : {};
  const requestId = parameters.requestId || '';
  const callback = parameters.callback || '';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId) &&
      /^__chemscan_[0-9a-f]{32}$/i.test(callback)) {
    const cachedResponse = CacheService.getScriptCache().get('cs_' + requestId);
    const response = cachedResponse
      ? JSON.parse(cachedResponse)
      : { type: 'application-form-sheet-response', requestId: requestId, pending: true };
    const jsonp = callback + '(' + JSON.stringify(response).replace(/</g, '\\u003c') + ');';
    return ContentService.createTextOutput(jsonp)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return HtmlService.createHtmlOutput('Application form Google Sheets endpoint is ready.');
}

function doPost(e) {
  const payloadText = e && e.parameter && e.parameter.payload;
  if (!payloadText) {
    return respond_({ success: false, message: 'Missing form submission.' });
  }

  let request;
  try {
    request = JSON.parse(payloadText);
  } catch (error) {
    return respond_({ success: false, message: 'The submitted form data is invalid JSON.' });
  }
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    return respond_({ success: false, message: 'The submitted form data is invalid.' });
  }
  const requestId = typeof request.requestId === 'string' ? request.requestId : '';

  const properties = PropertiesService.getScriptProperties();
  const expectedToken = properties.getProperty(TOKEN_PROPERTY);
  if (!expectedToken || request.token !== expectedToken) {
    return respond_({ success: false, message: 'Invalid Apps Script token. Check Settings.' }, requestId);
  }

  const fields = request.fields;
  if (!fields || typeof fields !== 'object') {
    return respond_({ success: false, message: 'Application form fields are missing.' }, requestId);
  }

  const rowValues = [new Date().toISOString()];
  FIELD_COLUMNS.forEach(function (field) {
    const value = fields[field[0]];
    rowValues.push(typeof value === 'string' ? safeCell_(value) : '');
  });
  if (rowValues.slice(1).every(function (value) { return !value; })) {
    return respond_({ success: false, message: 'The application form is empty.' }, requestId);
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return respond_({ success: false, message: 'The sheet is busy. Please submit again shortly.' }, requestId);
  }

  try {
    const spreadsheetId = properties.getProperty(SPREADSHEET_ID_PROPERTY);
    if (!spreadsheetId) {
      return respond_({ success: false, message: 'Run setup() in Apps Script before submitting.' }, requestId);
    }

    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!sheet) {
      return respond_({ success: false, message: 'The Applications sheet tab is missing.' }, requestId);
    }

    const rowNumber = sheet.getLastRow() + 1;
    const range = sheet.getRange(rowNumber, 1, 1, rowValues.length);
    range.setNumberFormat('@');
    range.setValues([rowValues]);
    return respond_({ success: true, spreadsheetUrl: spreadsheet.getUrl() }, requestId);
  } catch (error) {
    const detail = error && error.message ? error.message : String(error);
    return respond_({ success: false, message: 'Google Sheets could not save this application: ' + detail }, requestId);
  } finally {
    lock.releaseLock();
  }
}

function safeCell_(value) {
  const text = value.trim();
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function respond_(result, requestId) {
  const heading = result.success ? 'Application saved successfully' : 'Could not save application';
  const message = escapeHtml_(result.message || (result.success ? 'The application has been added to the sheet.' : 'An unknown error occurred.'));
  const link = result.success && result.spreadsheetUrl
    ? '<p><a href="' + escapeHtml_(result.spreadsheetUrl) + '" target="_blank" rel="noopener">Open Google Sheet</a></p>'
    : '';
  const response = {
    type: 'application-form-sheet-response',
    requestId: requestId || '',
    success: Boolean(result.success),
    message: result.message || '',
    spreadsheetUrl: result.spreadsheetUrl || '',
  };
  if (requestId) {
    CacheService.getScriptCache().put('cs_' + requestId, JSON.stringify(response), 600);
  }
  const html = '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>' +
    '<body style="font:16px Arial,sans-serif;max-width:640px;margin:48px auto;padding:24px;color:#1f2937">' +
    '<h2>' + heading + '</h2><p>' + message + '</p>' + link + '</body></html>';
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function escapeHtml_(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
