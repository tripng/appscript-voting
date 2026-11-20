/**
 * VOTING GURU TERBAIK - Google Apps Script
 *
 * Sheet yang dibutuhkan di dalam Google Spreadsheet:
 *  - "Kelas" : A = Nama kelas (baris 1 = header "Kelas")
 *  - "Siswa" : A = ID siswa (mis. NIS), B = Nama, C = Kelas (sama persis dengan sheet Kelas), D = Password
 *  - "Guru"  : A = ID, B = Nama, C = Link foto (opsional)
 *  - "Suara" : A = Waktu, B = ID siswa, C = Nama siswa, D = Kelas, E = ID guru
 */

const SHEET_GURU = 'Guru';
const SHEET_SUARA = 'Suara';
const SHEET_KELAS = 'Kelas';
const SHEET_SISWA = 'Siswa';
const ZONA_WAKTU = 'Asia/Makassar'; // sesuaikan: WIB = Asia/Jakarta, WIT = Asia/Jayapura
const FOOTER_IMG_URL = ''; // link langsung ke tri.png, kosongkan jika tidak dipakai

// Halaman voting: URL biasa
// Halaman hasil live: URL + ?page=hasil
function doGet(e) {
  const isHasil = !!(e && e.parameter && e.parameter.page === 'hasil');
  const template = HtmlService.createTemplateFromFile(isHasil ? 'hasil' : 'index');
  template.url = ScriptApp.getService().getUrl();
  template.footerImg = FOOTER_IMG_URL;

  return template
    .evaluate()
    .setTitle(isHasil ? 'Hasil Voting Live' : 'Voting Guru Terbaik')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// Dipanggil dari halaman voting: ambil daftar guru
function getDaftarGuru() {
  return getSheet(SHEET_GURU)
    .getDataRange()
    .getValues()
    .slice(1)
    .filter(r => String(r[0]).trim() !== '')
    .map(r => ({
      id: String(r[0]).trim(),
      nama: String(r[1]).trim(),
      foto: String(r[2]).trim()
    }));
}

// Dipanggil dari halaman voting: daftar kelas untuk pilihan pertama
function getDaftarKelas() {
  const daftar = getSheet(SHEET_KELAS)
    .getDataRange()
    .getValues()
    .slice(1)
    .map(r => String(r[0]).trim())
    .filter(k => k !== '');
  return [...new Set(daftar)];
}

// Dipanggil dari halaman voting: daftar siswa di satu kelas
// (Password sengaja TIDAK dikirim ke browser agar tetap rahasia)
function getDaftarSiswa(kelas) {
  const kelasDicari = String(kelas || '').trim().toLowerCase();
  return getSheet(SHEET_SISWA)
    .getDataRange()
    .getValues()
    .slice(1)
    .filter(r =>
      String(r[0]).trim() !== '' &&
      String(r[2]).trim().toLowerCase() === kelasDicari
    )
    .map(r => ({ id: String(r[0]).trim(), nama: String(r[1]).trim() }))
    .sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
}

// Mencari data siswa berdasarkan ID beserta password di kolom D (indeks 3)
function cariSiswa(id) {
  const baris = getSheet(SHEET_SISWA)
    .getDataRange()
    .getValues()
    .slice(1)
    .find(r => String(r[0]).trim() === id);

  return baris
    ? {
        id: id,
        nama: String(baris[1]).trim(),
        kelas: String(baris[2]).trim(),
        password: String(baris[3] || '').trim()
      }
    : null;
}

// Dipanggil dari halaman voting: simpan satu suara dengan validasi password
function submitVote(idSiswa, idGuru, passwordInput) {
  const siswaId = String(idSiswa || '').trim();
  const guruId = String(idGuru || '').trim();
  const pwInput = String(passwordInput || '').trim();

  if (!siswaId || !guruId) {
    return { ok: false, pesan: 'Pilih nama dan satu guru terlebih dahulu.' };
  }

  if (!pwInput) {
    return { ok: false, fokusPassword: true, pesan: 'Masukkan password terlebih dahulu.' };
  }

  const siswa = cariSiswa(siswaId);
  if (!siswa) {
    return { ok: false, pesan: 'Data siswa tidak ditemukan. Muat ulang halaman.' };
  }

  // Cek apakah password siswa sudah diatur di kolom D
  if (!siswa.password) {
    return { ok: false, fokusPassword: true, pesan: 'Password untuk ' + siswa.nama + ' belum diatur oleh panitia.' };
  }

  // Validasi kecocokan password (case-sensitive)
  if (pwInput !== siswa.password) {
    return { ok: false, fokusPassword: true, pesan: 'Password salah. Periksa kembali passwordmu.' };
  }

  const guru = getDaftarGuru().find(g => g.id === guruId);
  if (!guru) {
    return { ok: false, pesan: 'Guru tidak ditemukan. Muat ulang halaman.' };
  }

  // Kunci agar dua suara yang masuk bersamaan tidak saling menimpa
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const suara = getSheet(SHEET_SUARA);
    const sudahMemilih = suara
      .getDataRange()
      .getValues()
      .slice(1)
      .some(r => String(r[1]).trim() === siswa.id);

    if (sudahMemilih) {
      return { ok: false, pesan: siswa.nama + ' sudah pernah memilih.' };
    }

    suara.appendRow([new Date(), siswa.id, siswa.nama, siswa.kelas, guru.id]);
    return { ok: true, pesan: 'Terima kasih, ' + siswa.nama + '. Pilihanmu sudah tersimpan.' };
  } finally {
    lock.releaseLock();
  }
}

// Dipanggil dari halaman hasil: hitung suara setiap guru
function getHasil() {
  const guru = getDaftarGuru();
  const jumlah = {};
  guru.forEach(g => (jumlah[g.id] = 0));

  getSheet(SHEET_SUARA)
    .getDataRange()
    .getValues()
    .slice(1)
    .forEach(r => {
      const id = String(r[4]).trim();
      if (Object.prototype.hasOwnProperty.call(jumlah, id)) jumlah[id]++;
    });

  const total = Object.values(jumlah).reduce((a, b) => a + b, 0);

  const hasil = guru
    .map(g => ({
      nama: g.nama,
      foto: g.foto,
      suara: jumlah[g.id],
      persen: total ? Math.round((jumlah[g.id] / total) * 1000) / 10 : 0
    }))
    .sort((a, b) => b.suara - a.suara);

  return {
    total: total,
    hasil: hasil,
    waktu: Utilities.formatDate(new Date(), ZONA_WAKTU, 'HH:mm:ss')
  };
}

function getSheet(nama) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nama);
  if (!sheet) throw new Error('Sheet "' + nama + '" tidak ditemukan.');
  return sheet;
}