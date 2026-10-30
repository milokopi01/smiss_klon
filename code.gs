/**
 * ============================================================================
 * SISTEM PENGURUSAN KEJOHANAN OLAHRAGA & PADANG (SMIS) - BACKEND (code.gs)
 * ============================================================================
 * Google Sheet ID : 1XCG6zYfavLWSsda_0EvxUXN9DdGAWi9idqxCsttbnE4
 * Google Drive Folder ID : 1M2BB2fcy3yl9-DDyBPJaDEJQch6UiOPU
 * Web App URL : https://script.google.com/macros/s/AKfycbxJJZ5k7PxFsSEhtLCjckIPvMlFOH0R1Nq-dgjd22RxVuXigw_k5Iwo95wXQhUFIuzp/exec
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

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'getAllData';
  try {
    if (action === 'getAllData') {
      return jsonResponse({ status: 'success', data: getAllDataFromSheets() });
    } else if (action === 'ping') {
      return jsonResponse({ status: 'success', message: 'SMIS API Connected', spreadsheetId: SPREADSHEET_ID, folderId: DRIVE_FOLDER_ID });
    }
    return jsonResponse({ status: 'success', data: getAllDataFromSheets() });
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

    const action = payload.action || 'syncAll';
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (action === 'syncAll' || action === 'seedDefaultData') {
      const db = payload.data || {};
      Object.keys(SHEET_SCHEMAS).forEach(sheetName => {
        if (db[sheetName] && Array.isArray(db[sheetName])) {
          writeSheetData(ss, sheetName, SHEET_SCHEMAS[sheetName], db[sheetName]);
        }
      });
      return jsonResponse({ status: 'success', message: 'Semua data berjaya diselaraskan ke Google Sheet.' });
    }

    if (action === 'saveSheet') {
      const sheetName = payload.sheetName;
      const rows = payload.rows || [];
      const headers = SHEET_SCHEMAS[sheetName] || (rows.length > 0 ? Object.keys(rows[0]) : []);
      writeSheetData(ss, sheetName, headers, rows);
      return jsonResponse({ status: 'success', message: 'Sheet ' + sheetName + ' dikemaskini.' });
    }

    if (action === 'saveBackupToDrive') {
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

function getAllDataFromSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const result = {};
  Object.keys(SHEET_SCHEMAS).forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(SHEET_SCHEMAS[sheetName]);
      result[sheetName] = [];
    } else {
      const values = sheet.getDataRange().getDisplayValues();
      if (values.length <= 1) {
        result[sheetName] = [];
      } else {
        const headers = values[0];
        const rows = [];
        for (let i = 1; i < values.length; i++) {
          const obj = {};
          for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = values[i][j];
          }
          rows.push(obj);
        }
        result[sheetName] = rows;
      }
    }
  });
  return result;
}

function writeSheetData(ss, sheetName, headers, rows) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  sheet.clearContents();
  if (!headers || headers.length === 0) return;

  const matrix = [headers];
  rows.forEach(r => {
    const rowArr = headers.map(h => (r[h] !== undefined && r[h] !== null) ? r[h] : '');
    matrix.push(rowArr);
  });

  sheet.getRange(1, 1, matrix.length, headers.length).setValues(matrix);
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
