/**
 * DSEL Registration Form -> Google Sheet
 *
 * SETUP STEPS (do these once, ~5 minutes):
 *
 * 1. Create a new Google Sheet at https://sheets.new
 *    Name it: "DSEL Registrations"
 *
 * 2. In the Sheet, go to: Extensions -> Apps Script
 *
 * 3. Delete the default code, paste THIS ENTIRE FILE, then click Save (disk icon)
 *
 * 4. At the top, click "Deploy" -> "New deployment"
 *      - Click the gear icon next to "Select type" -> choose "Web app"
 *      - Description: "DSEL form receiver"
 *      - Execute as: Me
 *      - Who has access: Anyone
 *      - Click "Deploy"
 *
 * 5. Authorize: click "Authorize access" -> select your Google account ->
 *    "Advanced" -> "Go to (project name) (unsafe)" -> "Allow"
 *
 * 6. Copy the "Web app URL" that appears (looks like:
 *    https://script.google.com/macros/s/AKfycb.../exec)
 *
 * 7. Paste that URL into js/main.js -> SHEET_WEBHOOK_URL constant
 *
 * 8. Redeploy the website. Done.
 *
 * Every registration will now auto-append a row to your Sheet.
 */

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);

    // First-time setup: add header row if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Timestamp', 'Name', 'Email', 'Mobile', 'Profession',
        'Institution', 'City', 'Course', 'Source'
      ]);
      sheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#0b5fff').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      new Date(),
      data.name || '',
      data.email || '',
      data.mobile || '',
      data.profession || '',
      data.institution || '',
      data.city || '',
      data.course || '',
      data.source || 'register'
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput('DSEL registration receiver is live.')
    .setMimeType(ContentService.MimeType.TEXT);
}
