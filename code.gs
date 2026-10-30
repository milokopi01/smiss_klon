/**
 * SISTEM PENGURUSAN KEJOHANAN OLAHRAGA (SMIS-PRO)
 * Backend Google Apps Script (code.gs)
 */

function doGet(e) {
  setupDatabase(); // Pastikan tab asas wujud
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('SMIS-PRO | Sistem Pengurusan Kejohanan Olahraga')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
}

// 1. INISIALISASI PANGKALAN DATA AUTOMATIK
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const schema = {
    'Pengguna': [
      ['Username', 'Password', 'Peranan', 'KodPasukan', 'NamaPasukan'],
      ['admin', 'admin123', 'Admin', 'ALL', 'URUSETIA PUSAT'],
      ['hakim', 'hakim123', 'Hakim', 'ALL', 'PEGAWAI TEKNIKAL'],
      ['ks', 'ks123', 'Pengurus', 'KS', 'KOTA SETAR'],
      ['baling', 'baling123', 'Pengurus', 'B', 'BALING']
    ],
    'Acara': [
      ['NoAcara', 'Masa', 'NamaAcara', 'Kategori', 'Jenis', 'PeringkatAsal', 'RekodKejohanan', 'InfoRekod'],
      ['101', '8:30 am', 'REJAM LEMBING', 'BPP19', 'Padang', 'AKHIR', '21.09', 'KOPKMSSK: 21.09M (2024)']
    ],
    'Atlet': [
      ['NoPeserta', 'NamaPeserta', 'TarikhLahir', 'KodPasukan', 'NamaPasukan', 'Kategori']
    ],
    'Pendaftaran': [
      ['IDPendaftaran', 'NoAcara', 'NamaAcara', 'Kategori', 'NoPeserta', 'NamaPeserta', 'KodPasukan', 'NamaPasukan']
    ],
    'Keputusan': [
      ['IDKeputusan', 'NoAcara', 'NamaAcara', 'Kategori', 'Jenis', 'Peringkat', 'GiliranLorong', 'NoPeserta', 'NamaPeserta', 'KodPasukan', 'NamaPasukan', 'TarikhLahir', 'Catatan', 'Status', 'Kedudukan', 'CatatanRekod']
    ]
  };

  for (let sheetName in schema) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.getRange(1, 1, schema[sheetName].length, schema[sheetName][0].length).setValues(schema[sheetName]);
      sheet.getRange(1, 1, 1, schema[sheetName][0].length).setFontWeight('bold').setBackground('#1e3a8a').setFontColor('#ffffff');
    }
  }
}

// FUNGSI SORT & AUTO-HEATS SELEPAS DATA DIISI
function janaSaringanAuto(noAcara) {
    // Logik: Kira pendaftaran > 8 -> Pecah Separuh Akhir 1,2..
}

function simpanKeputusanPadang(data) {
   // Logik: Auto sort mengikut jauh / tinggi (Descending)
}

function simpanKeputusanBalapan(data) {
   // Logik: Auto sort mengikut kelajuan masa (Ascending)
}
