/**
 * Скопируйте этот код в Google Apps Script (Расширения → Apps Script)
 * привяжите к Google Таблице, разверните как Web App:
 * - Execute as: Me
 * - Who has access: Anyone
 *
 * После изменения кода: Развернуть → Управление развертываниями →
 * карандаш → Новая версия → Развернуть
 *
 * URL развёртывания → data/contact-config.json → submissionsApiUrl
 */
function parsePostData(e) {
  if (e.parameter && (e.parameter.name || e.parameter.email || e.parameter.phone)) {
    return e.parameter;
  }
  if (e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (err) {
      return e.parameter || {};
    }
  }
  return e.parameter || {};
}

function getSubmissions() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var rows = sheet.getDataRange().getValues();
  if (rows.length) rows.shift();

  return rows.map(function (row, index) {
    return {
      id: index + 1,
      createdAt: row[0] ? new Date(row[0]).toISOString() : "",
      name: row[1] || "",
      email: row[2] || "",
      phone: row[3] || "",
      source: row[4] || ""
    };
  }).reverse();
}

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = parsePostData(e);

  sheet.appendRow([
    new Date(),
    data.name || "",
    data.email || "",
    data.phone || "",
    data.source || "portfolio"
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var result = { submissions: getSubmissions() };
  var callback = e && e.parameter && e.parameter.callback;

  if (callback && /^[a-zA-Z_$][\w$]*$/.test(callback)) {
    return ContentService
      .createTextOutput(callback + "(" + JSON.stringify(result) + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doOptions() {
  return ContentService
    .createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}
