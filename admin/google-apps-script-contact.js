/**
 * Скопируйте этот код в Google Apps Script (Расширения → Apps Script)
 * привяжите к Google Таблице, разверните как Web App:
 * - Execute as: Me
 * - Who has access: Anyone
 *
 * URL развёртывания вставьте в data/contact-config.json → submissionsApiUrl
 */
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);

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

function doGet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var rows = sheet.getDataRange().getValues();
  var headers = rows.shift();
  var submissions = rows.map(function (row, index) {
    return {
      id: index + 1,
      createdAt: row[0] ? new Date(row[0]).toISOString() : "",
      name: row[1] || "",
      email: row[2] || "",
      phone: row[3] || "",
      source: row[4] || ""
    };
  }).reverse();

  return ContentService
    .createTextOutput(JSON.stringify({ submissions: submissions }))
    .setMimeType(ContentService.MimeType.JSON);
}
