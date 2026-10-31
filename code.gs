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
  'Acara': ['NoAcara', 'Hari', 'Tarikh', 'Masa', 'NamaAcara', 'Kategori', 'Jenis', 'PeringkatAsal', 'NoAcaraAkhir', 'RekodKejohanan', 'InfoRekodKejohanan', 'InfoRekodMSSM', 'StatusDataBuku', 'HadPesertaPasukan', 'SusunanJadual'],
  'Atlet': ['Bil', 'NoPeserta', 'NamaPeserta', 'TarikhLahir', 'KodPasukan', 'NamaPasukan', 'Kategori', 'JumlahAcaraDisertai', 'SenaraiAcaraDisertai', 'GambarURL', 'GambarFileId', 'DokumenURL', 'DokumenFileId', 'TarikhMuatNaik'],
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
      const result = applyChanges(ss, user, [], Object.keys(db).filter(name => SHEET_SCHEMAS[name] && Array.isArray(db[name])).map(sheet => ({ sheet, rows: db[sheet] })));
      if (result.rejected.length) return jsonResponse({ status: 'error', message: result.rejected.map(r => r.reason).join(' '), rejected: result.rejected });
      return jsonResponse({ status: 'success', message: 'Semua data berjaya diselaraskan ke Google Sheet.' });
    }

    if (action === 'saveSheet') {
      const sheetName = payload.sheetName;
      if (!user || !(isRole(user, 'Admin') || (isManager(user) && sheetName !== 'Pengguna'))) return jsonResponse({ status: 'error', message: 'Hanya Master Admin / Sub Admin dibenarkan.' });
      const rows = payload.rows || [];
      const result = applyChanges(ss, user, [], [{ sheet: sheetName, rows }]);
      if (result.rejected.length) return jsonResponse({ status: 'error', message: result.rejected.map(r => r.reason).join(' '), rejected: result.rejected });
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

    // Muat naik gambar / dokumen PDF peserta (tempoh berasingan: docCloseAt)
    if (action === 'uploadAthleteFile') {
      if (!user) return jsonResponse({ status: 'error', message: 'Sila log masuk untuk memuat naik.' });
      return jsonResponse(uploadAthleteFile(ss, user, payload));
    }

    return jsonResponse({ status: 'error', message: 'Action tidak dikenali: ' + action });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

// ============================================================================
// MUAT NAIK GAMBAR & DOKUMEN PESERTA
// ============================================================================
// docCloseAt (ISO) = tarikh & masa akhir muat naik (boleh lebih lewat dari regCloseAt)
function docClosedReason(ss) {
  const rows = readSheetObjects(ss, 'Tetapan').rows;
  const r = rows.find(t => t.Kunci === 'docCloseAt');
  const close = r ? String(r.Nilai || '').trim() : '';
  if (!close || close === '-') return '';
  const d = new Date(close);
  if (!isNaN(d.getTime()) && Date.now() >= d.getTime()) return 'Tempoh muat naik gambar & dokumen telah tamat.';
  return '';
}
function getSubFolder(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
function uploadAthleteFile(ss, user, p) {
  const bib = String(p.noPeserta || '').trim();
  const kind = p.kind === 'gambar' ? 'gambar' : (p.kind === 'dokumen' ? 'dokumen' : '');
  if (!bib || !kind || !p.base64) return { status: 'error', message: 'Maklumat muat naik tidak lengkap.' };
  const mime = String(p.mimeType || '');
  if (kind === 'dokumen' && mime !== 'application/pdf') return { status: 'error', message: 'Dokumen mesti satu fail PDF (gabungan KP, Kad OKU, R01/M01, Akuan Kesihatan dll).' };
  if (kind === 'gambar' && !/^image\/(jpeg|png|webp)$/.test(mime)) return { status: 'error', message: 'Gambar mesti JPG, PNG atau WEBP.' };
  const bytes = Utilities.base64Decode(p.base64);
  const maxMb = kind === 'gambar' ? 5 : 20;
  if (bytes.length > maxMb * 1024 * 1024) return { status: 'error', message: 'Saiz fail melebihi ' + maxMb + 'MB.' };
  let out = null;
  withLock(function () {
    const data = readSheetObjects(ss, 'Atlet');
    const row = data.rows.find(r => String(r.NoPeserta).toUpperCase() === bib.toUpperCase());
    if (!row) { out = { status: 'error', message: 'Peserta ' + bib + ' tidak dijumpai.' }; return; }
    const team = String(row.KodPasukan || '').trim();
    const admin = isRole(user, 'Admin') || isRole(user, 'SubAdmin');
    if (!admin) {
      if (!isRole(user, 'Pengurus') || String(user.KodPasukan || '').trim() !== team) { out = { status: 'error', message: 'Anda hanya boleh memuat naik untuk peserta pasukan sendiri.' }; return; }
      const reason = docClosedReason(ss);
      if (reason) { out = { status: 'error', message: reason }; return; }
    }
    const root = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const folder = getSubFolder(getSubFolder(root, 'Dokumen_Peserta'), team || 'TIADA_PASUKAN');
    const ext = kind === 'dokumen' ? 'pdf' : (mime.split('/')[1] === 'jpeg' ? 'jpg' : mime.split('/')[1]);
    const name = bib + '_' + (kind === 'dokumen' ? 'DOKUMEN' : 'GAMBAR') + '.' + ext;
    const file = folder.createFile(Utilities.newBlob(bytes, mime, name));
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    const idKey = kind === 'dokumen' ? 'DokumenFileId' : 'GambarFileId';
    const urlKey = kind === 'dokumen' ? 'DokumenURL' : 'GambarURL';
    if (row[idKey]) { try { DriveApp.getFileById(row[idKey]).setTrashed(true); } catch (e) {} }
    row[idKey] = file.getId();
    row[urlKey] = kind === 'gambar' ? 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w400' : file.getUrl();
    row.TarikhMuatNaik = new Date().toISOString();
    writeSheetData(ss, 'Atlet', data.headers, data.rows);
    out = { status: 'success', message: (kind === 'dokumen' ? 'Dokumen' : 'Gambar') + ' berjaya dimuat naik.', url: row[urlKey] };
  });
  return out || { status: 'error', message: 'Muat naik gagal.' };
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
    return sheetName !== 'Pengguna' || (!isAdminRow(oldRow) && !isAdminRow(newRow));
  }
  if (isRole(user, 'Hakim')) {
    // Hakim hanya mengubah keputusan, bukan identiti/pendaftaran peserta.
    if (sheetName !== 'Keputusan' || !oldRow || !newRow) return false;
    const fields = ['Catatan', 'Status', 'Kedudukan', 'CatatanRekod', 'Peringkat', 'GiliranLorong'];
    return Object.keys(newRow).every(k => fields.indexOf(k) !== -1 || String(newRow[k] || '') === String(oldRow[k] || ''));
  }
  if (isRole(user, 'Pengurus')) {
    const team = String(user.KodPasukan || '').trim();
    // Pengurus boleh tambah, ubah & padam atlet/pendaftaran pasukan sendiri semasa pendaftaran dibuka
    // (tempoh pendaftaran disemak dalam applyChanges). Keputusan yang sudah diisi hakim tidak boleh disentuh.
    if (!team || team === 'ALL' || ['Atlet', 'Pendaftaran', 'Keputusan'].indexOf(sheetName) === -1) return false;
    if (oldRow && String(oldRow.KodPasukan || '').trim() !== team) return false;
    if (newRow && String(newRow.KodPasukan || '').trim() !== team) return false;
    if (sheetName === 'Keputusan') {
      if (oldRow && (oldRow.Catatan || oldRow.Kedudukan || oldRow.CatatanRekod)) return false;
      if (newRow && (newRow.Catatan || newRow.Kedudukan || newRow.CatatanRekod)) return false;
    }
    return true;
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
// Kosong / UNLIMITED = tanpa had. 0 juga sah untuk menutup pendaftaran.
function participantLimit(value) {
  const text = String(value === undefined || value === null ? '' : value).trim();
  if (!text || text.toUpperCase() === 'UNLIMITED') return null;
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(Number(text))) throw new Error('Had peserta mesti nombor bulat tidak negatif atau UNLIMITED.');
  return Number(text);
}
function participantSets(db, eventNo, team) {
  const out = {};
  ['Pendaftaran', 'Keputusan'].forEach(sheet => (db[sheet] || []).forEach(r => {
    if (String(r.NoAcara) === String(eventNo) && String(r.KodPasukan) === String(team)) out[String(r.NoPeserta).toUpperCase()] = true;
  }));
  return Object.keys(out);
}
// Tempoh pendaftaran: regCloseAt (ISO), regAllowedTeams ('ALL' / senarai), regExtensions (JSON {pasukan: ISO})
function registrationClosedReason(db, team) {
  const get = k => { const r = (db.Tetapan || []).find(t => t.Kunci === k); return r ? String(r.Nilai || '').trim() : ''; };
  const allowed = get('regAllowedTeams');
  if (allowed && allowed !== 'ALL' && allowed.split(',').map(x => x.trim()).indexOf(team) === -1) return 'Pendaftaran bagi pasukan ' + team + ' tidak dibenarkan.';
  let ext = {}; try { ext = JSON.parse(get('regExtensions') || '{}') || {}; } catch (e) {}
  let close = ext[team] || get('regCloseAt');
  if (close === '-') close = '';
  if (close) { const d = new Date(close); if (!isNaN(d.getTime()) && Date.now() >= d.getTime()) return 'Tempoh pendaftaran pasukan ' + team + ' telah tamat.'; }
  return '';
}
function validateParticipantChanges(before, after) {
  const setting = (after.Tetapan || []).find(t => t.Kunci === 'maxParticipantsPerTeam');
  const maxTeam = participantLimit(setting ? setting.Nilai : 'UNLIMITED');
  const bibs = {};
  (after.Atlet || []).forEach(a => {
    const bib = String(a.NoPeserta || '').trim().toUpperCase();
    if (!bib || !a.NamaPeserta || !a.KodPasukan) throw new Error('Maklumat atlet tidak lengkap.');
    if (bibs[bib]) throw new Error('No. Peserta sudah wujud: ' + bib);
    bibs[bib] = a;
  });
  (after.Pasukan || []).forEach(team => {
    const count = db => (db.Atlet || []).filter(a => String(a.KodPasukan) === String(team.KodPasukan)).length;
    if (maxTeam !== null && count(after) > maxTeam && count(after) > count(before)) throw new Error('Pasukan ' + team.KodPasukan + ' telah mencapai had keseluruhan ' + maxTeam + ' peserta.');
  });
  (after.Acara || []).forEach(ev => {
    const limit = participantLimit(ev.HadPesertaPasukan);
    const teams = {};
    ['Pendaftaran', 'Keputusan'].forEach(sheet => (after[sheet] || []).forEach(r => { if (String(r.NoAcara) === String(ev.NoAcara)) teams[String(r.KodPasukan)] = true; }));
    Object.keys(teams).forEach(team => {
      const count = participantSets(after, ev.NoAcara, team).length;
      const oldCount = participantSets(before, ev.NoAcara, team).length;
      if (limit !== null && count > limit && count > oldCount) throw new Error('Acara #' + ev.NoAcara + ': pasukan ' + team + ' terhad kepada ' + limit + ' peserta. Baki tempat: ' + Math.max(0, limit - oldCount) + '.');
    });
  });
  ['Pendaftaran', 'Keputusan'].forEach(sheet => {
    const key = SHEET_KEYS[sheet];
    const old = {}; (before[sheet] || []).forEach(r => { old[String(r[key])] = r; });
    (after[sheet] || []).forEach(r => {
      const previous = old[String(r[key])];
      if (previous && ['NoPeserta','KodPasukan','NoAcara'].every(k => String(previous[k]) === String(r[k]))) return;
      const ev = (after.Acara || []).find(e => String(e.NoAcara) === String(r.NoAcara));
      if (!ev) throw new Error('Acara tidak dijumpai.');
      const athlete = bibs[String(r.NoPeserta || '').toUpperCase()];
      const team = (after.Pasukan || []).find(t => String(t.KodPasukan) === String(r.KodPasukan));
      if (!team || (!athlete && !(r.Jenis === 'Berpasukan' && String(r.NoPeserta).toUpperCase() === String(team.KodPasukan).toUpperCase()))) throw new Error('Peserta mesti didaftarkan dengan pasukan yang sah dahulu.');
      if (athlete && (String(athlete.KodPasukan) !== String(r.KodPasukan) || String(athlete.Kategori) !== String(ev.Kategori))) throw new Error('Pasukan/kategori peserta tidak sepadan dengan acara.');
      if ((after[sheet] || []).some(other => other !== r && String(other.NoAcara) === String(r.NoAcara) && String(other.NoPeserta).toUpperCase() === String(r.NoPeserta).toUpperCase())) throw new Error('Peserta sudah berdaftar dalam acara ini.');
    });
  });
}
function applyChanges(ss, user, changes, replace) {
  const applied = [], rejected = [];
  withLock(function () {
    const before = {}, after = {}, headers = {}, dirty = {};
    Object.keys(SHEET_SCHEMAS).forEach(sheet => {
      const data = readSheetObjects(ss, sheet);
      before[sheet] = data.rows;
      after[sheet] = data.rows.map(r => Object.assign({}, r));
      headers[sheet] = data.headers;
    });
    changes.forEach(ch => {
      const sheet = ch.sheet, key = SHEET_KEYS[sheet];
      if (!key) { rejected.push({ sheet, reason: 'Jadual tidak dikenali' }); return; }
      (ch.deletes || []).forEach(k => {
        const i = after[sheet].findIndex(r => String(r[key]) === String(k));
        if (i < 0) return;
        if (!canWriteRow(user, sheet, after[sheet][i], null)) { rejected.push({ sheet, key: k, reason: 'Hanya Master Admin / Sub Admin boleh memadam maklumat berdaftar.' }); return; }
        after[sheet].splice(i, 1); dirty[sheet] = true; applied.push({ sheet, key: k, op: 'delete' });
      });
      (ch.upserts || []).forEach(row => {
        const k = String(row[key] === undefined ? '' : row[key]);
        if (!k) { rejected.push({ sheet, reason: 'Kunci rekod diperlukan.' }); return; }
        const i = after[sheet].findIndex(r => String(r[key]) === k);
        const old = i < 0 ? null : after[sheet][i];
        const merged = Object.assign({}, old || {}, row);
        if (!canWriteRow(user, sheet, old, merged)) { rejected.push({ sheet, key: k, reason: 'Tiada kebenaran mengubah maklumat berdaftar.' }); return; }
        if (sheet === 'Pengguna' && old && !row.Password) merged.Password = old.Password;
        Object.keys(merged).forEach(h => { if (headers[sheet].indexOf(h) === -1) headers[sheet].push(h); });
        if (i < 0) after[sheet].push(merged); else after[sheet][i] = merged;
        dirty[sheet] = true; applied.push({ sheet, key: k, op: old ? 'update' : 'insert' });
      });
    });
    replace.forEach(rp => {
      if (!SHEET_SCHEMAS[rp.sheet] || !canReplaceSheet(user, rp.sheet)) { rejected.push({ sheet: rp.sheet, reason: 'Tiada kebenaran' }); return; }
      after[rp.sheet] = rp.rows || []; headers[rp.sheet] = getHeaders(ss, rp.sheet, after[rp.sheet]); dirty[rp.sheet] = true;
      applied.push({ sheet: rp.sheet, op: 'replace' });
    });
    if (isRole(user, 'Pengurus') && applied.length) {
      const reason = registrationClosedReason(before, String(user.KodPasukan || '').trim());
      if (reason) rejected.push({ reason: reason });
    }
    // Semua semakan dibuat di dalam lock; pendaftaran separa tidak disimpan.
    if (rejected.length) { applied.length = 0; return; }
    try { validateParticipantChanges(before, after); }
    catch (err) { rejected.push({ reason: err.message }); applied.length = 0; return; }
    Object.keys(dirty).forEach(sheet => writeSheetData(ss, sheet, headers[sheet], after[sheet]));
  });
  return { applied, rejected };
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
