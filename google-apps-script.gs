const SPREADSHEET_ID = '1OlFPkgrIDzwPYBF2EyusMq0mAQ7AQzmVv-P-38UtgCs';
const SHEET_NAME = 'Website Leads';

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const expectedSecret = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');

    if (!expectedSecret || data.secret !== expectedSecret) {
      return jsonResponse({ ok: false, error: 'Unauthorized' });
    }

    const email = String(data.email || '').trim().toLowerCase();
    if (!isValidEmail(email)) {
      return jsonResponse({ ok: false, error: 'Invalid email' });
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Date', 'Time (IST)', 'Email', 'Country']);
      sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    // Prevent duplicate emails (case-insensitive) in the Email column.
    const lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      const emails = sheet.getRange(2, 3, lastRow - 1, 1).getDisplayValues();
      const alreadyJoined = emails.some(row => String(row[0] || '').trim().toLowerCase() === email);
      if (alreadyJoined) {
        return jsonResponse({ ok: true, alreadyJoined: true });
      }
    }

    const submittedAt = data.submittedAt ? new Date(data.submittedAt) : new Date();
    const safeDate = isNaN(submittedAt.getTime()) ? new Date() : submittedAt;
    const date = Utilities.formatDate(safeDate, 'Asia/Kolkata', 'dd-MMM-yyyy');
    const time = Utilities.formatDate(safeDate, 'Asia/Kolkata', 'HH:mm:ss');
    const country = String(data.country || 'Unknown').slice(0, 100);

    sheet.appendRow([date, time, email, country]);

    return jsonResponse({ ok: true, alreadyJoined: false });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: 'Server error' });
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
