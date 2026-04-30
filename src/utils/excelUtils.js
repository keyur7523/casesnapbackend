const XLSX = require('xlsx');

function normalizeHeaderValue(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function validateExactHeaders(actualHeaders, expectedHeaders) {
  const actual = actualHeaders.map(normalizeHeaderValue);
  const expected = expectedHeaders.map(normalizeHeaderValue);

  if (actual.length !== expected.length) {
    return {
      ok: false,
      message: `Invalid template. Expected ${expected.length} columns but found ${actual.length}.`
    };
  }

  for (let i = 0; i < expected.length; i++) {
    if (actual[i] !== expected[i]) {
      return {
        ok: false,
        message: `Invalid template. Column ${i + 1} should be "${expectedHeaders[i]}" but found "${actualHeaders[i] ?? ''}".`
      };
    }
  }

  return { ok: true };
}

function isEmptyRow(values) {
  return values.every((v) => String(v ?? '').trim() === '');
}

function parseExcelFromBuffer(buffer, { sheetName, expectedHeaders, maxRows = 5000 } = {}) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetNames = wb.SheetNames || [];
  const effectiveSheetName = sheetName && sheetNames.includes(sheetName) ? sheetName : sheetNames[0];
  if (!effectiveSheetName) {
    return { ok: false, error: 'No sheet found in uploaded file.' };
  }

  const ws = wb.Sheets[effectiveSheetName];
  if (!ws) {
    return { ok: false, error: `Sheet "${effectiveSheetName}" not found.` };
  }

  const rows2d = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
  if (!rows2d || rows2d.length === 0) {
    return { ok: false, error: 'Excel sheet is empty.' };
  }

  const headers = (rows2d[0] || []).map((h) => String(h ?? '').trim());
  if (!headers.length) {
    return { ok: false, error: 'Header row is missing.' };
  }

  if (expectedHeaders) {
    const headerCheck = validateExactHeaders(headers, expectedHeaders);
    if (!headerCheck.ok) return { ok: false, error: headerCheck.message, headers };
  }

  const dataRows = rows2d.slice(1);
  if (dataRows.length > maxRows) {
    return { ok: false, error: `Too many rows. Max allowed is ${maxRows}.` };
  }

  const objects = [];
  for (let r = 0; r < dataRows.length; r++) {
    const row = dataRows[r] || [];
    const rowValues = headers.map((_, i) => row[i]);
    if (isEmptyRow(rowValues)) continue;

    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = row[c];
    }
    objects.push({ rowNumber: r + 2, data: obj }); // +2: header is row 1
  }

  return { ok: true, sheetName: effectiveSheetName, headers, rows: objects };
}

function writeExcelToBuffer({ sheetName, headers, rows }) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows.map((r) => headers.map((h) => r[h] ?? ''))]);
  XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Sheet1');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function toSafeString(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function toOptionalNumber(value) {
  if (value === null || value === undefined || String(value).trim() === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function toOptionalDate(value) {
  if (value === null || value === undefined || String(value).trim() === '') return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return NaN;
  return d;
}

function formatMongooseErrorForUser(err) {
  if (!err) return ['Unknown error'];

  // Mongoose ValidationError
  if (err.name === 'ValidationError' && err.errors && typeof err.errors === 'object') {
    const messages = [];
    for (const [path, e] of Object.entries(err.errors)) {
      if (!e) continue;
      if (e.kind === 'enum') {
        const allowed = e?.properties?.enumValues || e?.properties?.values || [];
        if (Array.isArray(allowed) && allowed.length > 0) {
          messages.push(`${path} must be one of: ${allowed.join(', ')}`);
        } else {
          messages.push(`${path} has an invalid value`);
        }
        continue;
      }
      messages.push(e.message || `${path} is invalid`);
    }
    return messages.length ? messages : [err.message || 'Validation failed'];
  }

  // Mongo duplicate key error
  if (err.code === 11000 && err.keyValue) {
    const field = Object.keys(err.keyValue)[0];
    return [`Duplicate value for ${field}`];
  }

  return [err.message || 'Operation failed'];
}

module.exports = {
  parseExcelFromBuffer,
  writeExcelToBuffer,
  toSafeString,
  toOptionalNumber,
  toOptionalDate,
  formatMongooseErrorForUser
};

