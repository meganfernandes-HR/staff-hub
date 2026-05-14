// ═══════════════════════════════════════════════════════
//  SUBKO STAFF HUB — Google Apps Script Backend
//  Paste this entire file into Apps Script, deploy as
//  Web App (Execute as: Me, Access: Anyone)
// ═══════════════════════════════════════════════════════

const SHEET_ID = '1ms3k-YOmZ7RhjLa0PvadykFD5EgLehaAEb6eR0BmJ1I';

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  let result;

  try {
    switch (data.action) {
      case 'getEmployees':     result = getEmployees();           break;
      case 'addEmployee':      result = addEmployee(data.employee); break;
      case 'updateEmployee':   result = updateEmployee(data.employee); break;
      case 'deleteEmployee':   result = deleteEmployee(data.employeeId); break;
      case 'getLeaveRecords':  result = getLeaveRecords();        break;
      case 'addLeaveRecord':   result = addLeaveRecord(data.record); break;
      case 'deleteLeaveRecord':result = deleteLeaveRecord(data.recordId); break;
      default: result = { ok: false, error: 'Unknown action' };
    }
  } catch(err) {
    result = { ok: false, error: err.toString() };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, message: 'Subko Staff Hub API running' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── EMPLOYEES ──────────────────────────────────────────

function getEmployees() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Employees');
  const rows  = sheet.getDataRange().getValues();
  if (rows.length <= 1) return { ok: true, data: [] };

  const headers = rows[0];
  const data = rows.slice(1).filter(r => r[0] || r[1]).map(r => rowToEmployee(headers, r));
  return { ok: true, data };
}

function addEmployee(emp) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Employees');
  sheet.appendRow(employeeToRow(emp));
  return { ok: true };
}

function updateEmployee(emp) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Employees');
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == emp.id) {
      sheet.getRange(i + 1, 1, 1, 12).setValues([employeeToRow(emp)]);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Employee not found' };
}

function deleteEmployee(employeeId) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Employees');
  const data  = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] == employeeId) {
      sheet.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Not found' };
}

function rowToEmployee(headers, row) {
  return {
    id:           String(row[0] || ''),
    name:         String(row[1] || ''),
    position:     String(row[2] || ''),
    startDate:    formatSheetDate(row[3]),
    probationEnd: formatSheetDate(row[4]),
    dob:          formatSheetDate(row[5]),
    email:        String(row[6] || ''),
    passportNo:   String(row[7] || ''),
    fileNo:       String(row[8] || ''),
    nationalId:   String(row[9] || ''),
    isManager:    String(row[10]).toLowerCase() === 'true' || row[10] === true,
    notes:        String(row[11] || '')
  };
}

function employeeToRow(emp) {
  return [
    emp.id, emp.name, emp.position,
    emp.startDate || '', emp.probationEnd || '', emp.dob || '',
    emp.email || '', emp.passportNo || '', emp.fileNo || '',
    emp.nationalId || '', emp.isManager ? 'true' : 'false', emp.notes || ''
  ];
}

// ── LEAVE RECORDS ──────────────────────────────────────

function getLeaveRecords() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Leave Records');
  const rows  = sheet.getDataRange().getValues();
  if (rows.length <= 1) return { ok: true, data: [] };

  const data = rows.slice(1).filter(r => r[0]).map(r => ({
    recordId:     String(r[0] || ''),
    employeeName: String(r[1] || ''),
    employeeId:   String(r[2] || ''),
    leaveType:    String(r[3] || ''),
    fromDate:     formatSheetDate(r[4]),
    toDate:       formatSheetDate(r[5]),
    workingDays:  Number(r[6] || 0),
    notes:        String(r[7] || ''),
    loggedBy:     String(r[8] || ''),
    loggedOn:     formatSheetDate(r[9])
  }));
  return { ok: true, data };
}

function addLeaveRecord(rec) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Leave Records');
  sheet.appendRow([
    rec.recordId, rec.employeeName, rec.employeeId,
    rec.leaveType, rec.fromDate, rec.toDate, rec.workingDays,
    rec.notes || '', rec.loggedBy || '', rec.loggedOn || ''
  ]);
  return { ok: true };
}

function deleteLeaveRecord(recordId) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Leave Records');
  const data  = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] == recordId) {
      sheet.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Record not found' };
}

// ── HELPERS ────────────────────────────────────────────

function formatSheetDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(val);
}
