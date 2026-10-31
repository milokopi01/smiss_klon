/**
 * ============================================================================
 * SISTEM PENGURUSAN KEJOHANAN OLAHRAGA & PADANG (SMIS) - BACKEND (code.gs)
 * ============================================================================
 * Google Sheet ID : 1XCG6zYfavLWSsda_0EvxUXN9DdGAWi9idqxCsttbnE4
 * Google Drive Folder ID : 1M2BB2fcy3yl9-DDyBPJaDEJQch6UiOPU
 * Web App URL : https://script.google.com/macros/s/AKfycbwT0OR7KbSdGHhtZPHasV6sA7vQSNEjkrPeNk0BdGWBWsbQSOkPnyyAbL7_WJp7507z/exec
 *
 * VERSI 2 (LIVE GOOGLE SHEET):
 *  - Google Sheet adalah SATU-SATUNYA sumber data (tiada lagi data dalam index.html).
 *  - Setiap perubahan dihantar sebagai perubahan baris (tambah/kemaskini/padam) mengikut
 *    kunci unik, dengan LockService supaya ramai pengguna boleh kemaskini serentak
 *    tanpa menindih data pengguna lain.
 *  - Kebenaran disemak di pelayan:
 *      Admin    : MASTER ADMIN - kuasa penuh termasuk melantik / membuang Sub Admin
 *      SubAdmin : SUB ADMIN (dilantik Master Admin) - tambah, edit, padam SEMUA data
 *                 (tidak boleh mengubah akaun Master Admin / Sub Admin lain)
 *      Hakim    : kemasukan keputusan (Keputusan & jadual statistik)
 *      Pengurus : hanya data pasukan sendiri (Atlet, Pendaftaran, Keputusan/senarai mula
 *                 pasukan sendiri & baris Pasukan sendiri)
 *      Awam     : lihat sahaja (kata laluan tidak dihantar)
 */

const SPREADSHEET_ID = '1XCG6zYfavLWSsda_0EvxUXN9DdGAWi9idqxCsttbnE4';
const DRIVE_FOLDER_ID = '1M2BB2fcy3yl9-DDyBPJaDEJQch6UiOPU';

const SHEET_SCHEMAS = {
  'Tetapan': ['Kunci', 'Nilai'],
  'Pengguna': ['Username', 'Password', 'Peranan', 'KodPasukan', 'NamaPasukan', 'CatatanAkses'],
  'Pasukan': ['Bil', 'KodPasukan', 'NamaPasukan', 'PrefiksNoPeserta', 'JumlahAtlet', 'BDL12', 'BDL19', 'BLL12', 'BLL19', 'BPL12', 'BPL15', 'BPL19', 'BDP12', 'BDP19', 'BLP12', 'BLP19', 'BPP12', 'BPP15', 'BPP19', 'Pegawai_L', 'Pegawai_P', 'JumlahPegawai'],
  'Acara': ['NoAcara', 'Hari', 'Tarikh', 'Masa', 'NamaAcara', 'Kategori', 'Jenis', 'PeringkatAsal', 'NoAcaraAkhir', 'RekodKejohanan', 'InfoRekodKejohanan', 'InfoRekodMSSM', 'StatusDataBuku'],
  'Atlet': ['Bil', 'NoPeserta', 'NamaPeserta', 'TarikhLahir', 'KodPasukan', 'NamaPasukan', 'Kategori', 'JumlahAcaraDisertai', 'SenaraiAcaraDisertai'],
  'Pendaftaran': ['IDPendaftaran', 'NoAcara', 'NamaAcara', 'Kategori', 'Jenis', 'NoPeserta', 'NamaPeserta', 'KodPasukan', 'NamaPasukan', 'TarikhLahir'],
  'Keputusan': ['IDKeputusan', 'NoAcara', 'TarikhMasa', 'NamaAcara', 'Kategori', 'Jenis', 'PeringkatAsal', 'Peringkat', 'GiliranLorong', 'NoPeserta', 'NamaPeserta', 'KodPasukan', 'NamaPasukan', 'TarikhLahir', 'Catatan', 'Status', 'Kedudukan', 'CatatanRekod'],
  'Kedudukan_Pingat': ['Kedudukan', 'KodPasukan', 'NamaPasukan', 'EMAS', 'PERAK', 'GANGSA', 'KE-4', 'KE-5', 'KE-6', 'KE-7', 'KE-8', 'JumlahPingat(1-3)', 'JumlahMata(8-1)'],
  'Pasukan_Terbaik_Kategori': ['Kategori', 'NamaPasukan', 'EMAS', 'PERAK', 'GANGSA', 'KE-4', 'KE-5', 'KE-6', 'KE-7', 'KE-8', 'MATA_BUKU'],
  'Peserta_Terbaik': ['Kategori', 'NoPeserta', 'NamaPeserta', 'Pasukan', 'RingkasanPingat', 'SenaraiAcaraDanCatatan'],
  'Rekod_Baharu': ['Bil', 'NamaPeserta_Pasukan', 'Pasukan', 'Kategori', 'Acara', 'RekodBaharu', 'RekodTerdahulu', 'Catatan']
};

// Kunci unik bagi jadual yang dikemaskini baris demi baris
const SHEET_KEYS = {
  'Tetapan': 'Kunci',
  'Pengguna': 'Username',
  'Pasukan': 'KodPasukan',
  'Acara': 'NoAcara',
  'Atlet': 'NoPeserta',
  'Pendaftaran': 'IDPendaftaran',
  'Keputusan': 'IDKeputusan'
};

// Jadual statistik terbitan (dikira semula oleh aplikasi) - ganti penuh
const DERIVED_SHEETS = ['Kedudukan_Pingat', 'Pasukan_Terbaik_Kategori', 'Peserta_Terbaik', 'Rekod_Baharu'];

// ============================================================================
// ENTRY POINTS
// ============================================================================
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'getAllData';
  try {
    if (action === 'ping') {
      return jsonResponse({ status: 'success', message: 'SMIS API Connected', spreadsheetId: SPREADSHEET_ID, folderId: DRIVE_FOLDER_ID });
    }
    // Paparan awam: kata laluan tidak didedahkan
    return jsonResponse({ status: 'success', data: getAllDataFromSheets(''), serverTime: new Date().getTime() });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

function doPost(e) {
  try {
    let payload = {};
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      payload = e.parameter;
    }

    const action = payload.action || 'getAllData';
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const user = authenticate(ss, payload.auth);

    if (action === 'login') {
      if (!user) return jsonResponse({ status: 'error', message: 'Username atau Password tidak sah!' });
      return jsonResponse({ status: 'success', user: publicUser(user) });
    }

    if (action === 'getAllData') {
      const level = !user ? '' : (isRole(user, 'Admin') ? 'master' : (isRole(user, 'SubAdmin') ? 'sub' : ''));
      return jsonResponse({ status: 'success', data: getAllDataFromSheets(level), user: user ? publicUser(user) : null, serverTime: new Date().getTime() });
    }

    if (action === 'applyChanges') {
      if (!user) return jsonResponse({ status: 'error', message: 'Sila log masuk untuk membuat perubahan.' });
      const result = applyChanges(ss, user, payload.changes || [], payload.replace || []);
      return jsonResponse({ status: 'success', message: 'Perubahan disimpan ke Google Sheet.', applied: result.applied, rejected: result.rejected });
    }

    // Tindakan lama: tulis ganti penuh - kini HANYA untuk Admin
    if (action === 'syncAll' || action === 'seedDefaultData') {
      if (!user || !isRole(user, 'Admin')) return jsonResponse({ status: 'error', message: 'Hanya Master Admin dibenarkan menulis semula keseluruhan Google Sheet.' });
      const db = payload.data || {};
      withLock(function () {
        Object.keys(SHEET_SCHEMAS).forEach(sheetName => {
          if (db[sheetName] && Array.isArray(db[sheetName])) {
            writeSheetData(ss, sheetName, getHeaders(ss, sheetName), db[sheetName]);
          }
        });
      });
      return jsonResponse({ status: 'success', message: 'Semua data berjaya diselaraskan ke Google Sheet.' });
    }

    if (action === 'saveSheet') {
      const sheetName = payload.sheetName;
      if (!user || !(isRole(user, 'Admin') || (isManager(user) && sheetName !== 'Pengguna'))) return jsonResponse({ status: 'error', message: 'Hanya Master Admin / Sub Admin dibenarkan.' });
      const rows = payload.rows || [];
      withLock(function () {
        writeSheetData(ss, sheetName, getHeaders(ss, sheetName, rows), rows);
      });
      return jsonResponse({ status: 'success', message: 'Sheet ' + sheetName + ' dikemaskini.' });
    }

    if (action === 'saveBackupToDrive') {
      if (!user || !isManager(user)) return jsonResponse({ status: 'error', message: 'Hanya Master Admin / Sub Admin dibenarkan menyimpan ke Google Drive.' });
      const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      const fileName = payload.fileName || ('SMIS_Backup_' + Utilities.formatDate(new Date(), 'GMT+8', 'yyyyMMdd_HHmmss') + '.html');
      const content = payload.content || JSON.stringify(payload.data || {}, null, 2);
      const mimeType = payload.mimeType || MimeType.HTML;
      const file = folder.createFile(fileName, content, mimeType);
      return jsonResponse({
        status: 'success',
        message: 'Fail berjaya disimpan ke Google Drive!',
        fileUrl: file.getUrl(),
        fileId: file.getId(),
        fileName: file.getName()
      });
    }

    return jsonResponse({ status: 'error', message: 'Action tidak dikenali: ' + action });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

// ============================================================================
// PENGESAHAN & KEBENARAN
// ============================================================================
function authenticate(ss, auth) {
  if (!auth || !auth.username) return null;
  const rows = readSheetObjects(ss, 'Pengguna').rows;
  const uname = String(auth.username).trim().toLowerCase();
  const pass = String(auth.password || '');
  return rows.find(u => String(u.Username).trim().toLowerCase() === uname && String(u.Password) === pass) || null;
}

function isRole(user, role) {
  return String(user.Peranan || '').trim().toLowerCase() === role.toLowerCase();
}

// Master Admin atau Sub Admin
function isManager(user) {
  return !!user && (isRole(user, 'Admin') || isRole(user, 'SubAdmin'));
}

function isAdminRow(r) {
  if (!r) return false;
  const p = String(r.Peranan || '').trim().toLowerCase();
  return p === 'admin' || p === 'subadmin';
}

function publicUser(u) {
  return { Username: u.Username, Peranan: u.Peranan, KodPasukan: u.KodPasukan, NamaPasukan: u.NamaPasukan, CatatanAkses: u.CatatanAkses };
}

// Semak sama ada pengguna boleh menulis baris ini (oldRow = sedia ada, newRow = baharu / null jika padam)
function canWriteRow(user, sheetName, oldRow, newRow) {
  if (isRole(user, 'Admin')) return true;
  if (isRole(user, 'SubAdmin')) {
    // Sub Admin boleh urus semua data, kecuali akaun Master Admin / Sub Admin
    if (sheetName === 'Pengguna') return !isAdminRow(oldRow) && !isAdminRow(newRow);
    return true;
  }
  if (isRole(user, 'Hakim')) return sheetName === 'Keputusan';
  if (isRole(user, 'Pengurus')) {
    const team = String(user.KodPasukan || '').trim();
    if (!team || team === 'ALL') return false;
    const own = r => !r || String(r.KodPasukan || '').trim() === team;
    if (sheetName === 'Pasukan') {
      // Hanya kemaskini baris pasukan sendiri (tidak boleh tambah/padam)
      return !!oldRow && !!newRow && own(oldRow) && own(newRow);
    }
    if (sheetName === 'Atlet' || sheetName === 'Pendaftaran' || sheetName === 'Keputusan') {
      return own(oldRow) && own(newRow);
    }
  }
  return false;
}

function canReplaceSheet(user, sheetName) {
  if (DERIVED_SHEETS.indexOf(sheetName) === -1) return isRole(user, 'Admin') || (isRole(user, 'SubAdmin') && sheetName !== 'Pengguna');
  return isManager(user) || isRole(user, 'Hakim');
}

// ============================================================================
// PERUBAHAN BARIS (UPSERT / DELETE) SECARA SELAMAT
// ============================================================================
function applyChanges(ss, user, changes, replace) {
  const applied = [];
  const rejected = [];

  withLock(function () {
    changes.forEach(ch => {
      const sheetName = ch.sheet;
      const key = SHEET_KEYS[sheetName];
      if (!key) { rejected.push({ sheet: sheetName, reason: 'Jadual tidak dikenali' }); return; }

      const data = readSheetObjects(ss, sheetName);
      let headers = data.headers;
      const rows = data.rows;
      const index = {};
      rows.forEach((r, i) => { index[String(r[key])] = i; });
      let changed = false;

      (ch.deletes || []).forEach(k => {
        const i = index[String(k)];
        if (i === undefined) return;
        if (!canWriteRow(user, sheetName, rows[i], null)) { rejected.push({ sheet: sheetName, key: k, reason: 'Tiada kebenaran padam' }); return; }
        rows[i] = null;
        delete index[String(k)];
        changed = true;
        applied.push({ sheet: sheetName, key: k, op: 'delete' });
      });

      (ch.upserts || []).forEach(newRow => {
        const k = String(newRow[key] === undefined ? '' : newRow[key]);
        if (!k) return;
        const i = index[k];
        const oldRow = i === undefined ? null : rows[i];
        if (!canWriteRow(user, sheetName, oldRow, newRow)) { rejected.push({ sheet: sheetName, key: k, reason: 'Tiada kebenaran' }); return; }
        // Pengguna bukan Admin tidak boleh menukar kata laluan / peranan sesiapa
        Object.keys(newRow).forEach(h => { if (headers.indexOf(h) === -1) headers.push(h); });
        if (oldRow) {
          const merged = Object.assign({}, oldRow, newRow);
          if (sheetName === 'Pengguna' && (newRow.Password === undefined || newRow.Password === '')) merged.Password = oldRow.Password;
          rows[i] = merged;
        } else {
          rows.push(newRow);
          index[k] = rows.length - 1;
        }
        changed = true;
        applied.push({ sheet: sheetName, key: k, op: oldRow ? 'update' : 'insert' });
      });

      if (changed) writeSheetData(ss, sheetName, headers, rows.filter(r => r !== null));
    });

    replace.forEach(rp => {
      if (!SHEET_SCHEMAS[rp.sheet]) { rejected.push({ sheet: rp.sheet, reason: 'Jadual tidak dikenali' }); return; }
      if (!canReplaceSheet(user, rp.sheet)) { rejected.push({ sheet: rp.sheet, reason: 'Tiada kebenaran' }); return; }
      writeSheetData(ss, rp.sheet, getHeaders(ss, rp.sheet, rp.rows || []), rp.rows || []);
      applied.push({ sheet: rp.sheet, op: 'replace' });
    });
  });

  return { applied: applied, rejected: rejected };
}

function withLock(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    fn();
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// BACA / TULIS SHEET
// ============================================================================
function getSheet(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    const headers = SHEET_SCHEMAS[sheetName] || [];
    if (headers.length) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sheet;
}

// Tajuk lajur: guna tajuk dalam Sheet, tambah lajur skema yang tiada
function getHeaders(ss, sheetName, rows) {
  const sheet = getSheet(ss, sheetName);
  let headers = [];
  if (sheet.getLastRow() >= 1 && sheet.getLastColumn() >= 1) {
    headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].filter(h => h !== '');
  }
  (SHEET_SCHEMAS[sheetName] || []).forEach(h => { if (headers.indexOf(h) === -1) headers.push(h); });
  (rows || []).forEach(r => Object.keys(r || {}).forEach(h => { if (headers.indexOf(h) === -1) headers.push(h); }));
  return headers;
}

function readSheetObjects(ss, sheetName) {
  const sheet = getSheet(ss, sheetName);
  const values = sheet.getDataRange().getDisplayValues();
  let headers = values.length ? values[0].filter(h => h !== '') : [];
  (SHEET_SCHEMAS[sheetName] || []).forEach(h => { if (headers.indexOf(h) === -1) headers.push(h); });
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (row.every(c => c === '')) continue;
    const obj = {};
    for (let j = 0; j < headers.length; j++) obj[headers[j]] = row[j] !== undefined ? row[j] : '';
    rows.push(obj);
  }
  return { headers: headers, rows: rows };
}

// level: 'master' = semua kata laluan, 'sub' = kecuali kata laluan Master/Sub Admin, '' = tiada
function getAllDataFromSheets(level) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const result = {};
  Object.keys(SHEET_SCHEMAS).forEach(sheetName => {
    result[sheetName] = readSheetObjects(ss, sheetName).rows;
  });
  if (level === 'sub') {
    result['Pengguna'] = result['Pengguna'].map(u => isAdminRow(u) ? Object.assign({}, u, { Password: '' }) : u);
  } else if (level !== 'master') {
    result['Pengguna'] = result['Pengguna'].map(u => Object.assign({}, u, { Password: '' }));
  }
  return result;
}

function writeSheetData(ss, sheetName, headers, rows) {
  const sheet = getSheet(ss, sheetName);
  sheet.clearContents();
  if (!headers || headers.length === 0) return;

  const matrix = [headers];
  rows.forEach(r => {
    matrix.push(headers.map(h => (r[h] !== undefined && r[h] !== null) ? String(r[h]) : ''));
  });

  const range = sheet.getRange(1, 1, matrix.length, headers.length);
  range.setNumberFormat('@'); // simpan sebagai teks supaya tarikh/masa tidak bertukar format
  range.setValues(matrix);
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
