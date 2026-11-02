// Google Apps Script — Web App backend untuk ChessDesk
// Cara guna:
// 1. Buka Google Sheet baharu.
// 2. Extensions -> Apps Script.
// 3. Tampal kod ini.
// 4. Tukar SECRET kepada token anda sendiri.
// 5. Deploy -> New deployment -> Web app:
//    Execute as: Me
//    Who has access: Anyone
// 6. Copy URL Web App dan masukkan dalam Tetapan ChessDesk.

const SHEET_NAME = 'State'
const SECRET = 'tukar-token-ini'

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = ss.getSheetByName(SHEET_NAME)
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME)
    sheet.getRange('A1').setValue('')
    sheet.getRange('B1').setValue(0)
  }
  return sheet
}

function readState_() {
  const sheet = getSheet_()
  const raw = sheet.getRange('A1').getValue()
  const version = Number(sheet.getRange('B1').getValue()) || 0
  let state = null
  if (raw) {
    try {
      state = JSON.parse(raw)
    } catch (error) {
      state = null
    }
  }
  return { state, version }
}

function writeState_(state) {
  const sheet = getSheet_()
  sheet.getRange('A1').setValue(JSON.stringify(state))
  const version = Date.now()
  sheet.getRange('B1').setValue(version)
  return version
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  )
}

function doGet(e) {
  const token = (e && e.parameter && e.parameter.token) || ''
  if (token !== SECRET) {
    return json_({ ok: false, error: 'unauthorized' })
  }
  const result = readState_()
  return json_({ ok: true, state: result.state, version: result.version })
}

function doPost(e) {
  let body = {}
  try {
    body = JSON.parse(e.postData.contents || '{}')
  } catch (error) {
    return json_({ ok: false, error: 'bad_json' })
  }
  if (body.token !== SECRET) {
    return json_({ ok: false, error: 'unauthorized' })
  }

  const current = readState_()
  if (body.version && Number(body.version) < current.version) {
    return json_({
      ok: false,
      conflict: true,
      state: current.state,
      version: current.version,
    })
  }

  const version = writeState_(body.state)
  return json_({ ok: true, version })
}
