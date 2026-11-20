# Rencana Implementasi: Pembatasan Batas Waktu Voting & Tampilan Voting Berakhir

## 1. Tujuan
Menambahkan mekanisme pembatasan waktu pemungutan suara pada sistem voting guru terbaik melalui konfigurasi batas tanggal dan jam penutupan, mengamankan proses submit di sisi server agar tidak menerima suara setelah tenggat waktu, serta menyajikan antarmuka visual khusus di halaman pemilihan (`index.html`) yang menginformasikan kepada pengguna bahwa periode voting telah resmi berakhir beserta tautan untuk melihat hasil perolehan suara akhir.

---

## 2. Keputusan yang Dikunci
1. **Penyimpanan Konfigurasi Batas Waktu**:
   * Konfigurasi batas waktu disimpan sebagai konstanta `BATAS_WAKTU_VOTING` di file [Kode.js](file:///home/tripng/Projects/appscript-voting/Kode.js) (format ISO 8601 string, contoh: `'2026-11-25T15:00:00+08:00'`). Jika nilainya string kosong `''`, voting dianggap dibuka tanpa batas waktu.
   * *Alasan*: Menghindari penambahan dependensi baru dan mematuhi batasan mutlak bahwa skema database spreadsheet tidak boleh diubah.
2. **Validasi Ganda (Client UI & Server Guard)**:
   * **Saat Render (`doGet`)**: Server memeriksa `isVotingDitutup()`. Jika sudah lewat batas, template me-render tampilan status penutupan di `index.html` dan menyembunyikan form input kelas/nama/password/guru.
   * **Saat Pengiriman (`submitVote`)**: Server wajib memeriksa ulang status waktu sebelum mengeksekusi `lock` dan `appendRow`. Jika request dikirim setelah deadline (misalnya tab browser dibuka sebelum deadline lalu disubmit belakangan), request langsung ditolak dengan pesan: `"Periode voting telah berakhir. Pilihan tidak dapat disimpan."`.
3. **Aksesibilitas Halaman Hasil (`hasil.html`)**:
   * Halaman hasil live (`?page=hasil`) **tetap dibuka** dan tidak dibatasi oleh batas waktu voting agar panitia dan siswa dapat terus memantau atau melihat perolehan suara akhir pemenang.
4. **Desain Tampilan Penutupan**:
   * Tampilan "Voting Berakhir" ditempatkan di dalam [index.html](file:///home/tripng/Projects/appscript-voting/index.html) menggunakan conditional rendering Apps Script scriptlet (`<? if (sudahBerakhir) { ... } else { ... } ?>`).
   * Menggunakan tema styling dan desain visual yang konsisten dengan aplikasi yang sudah ada (glassmorphism card, status badge penutupan, pesan apresiasi, info tanggal/jam ditutup, dan tombol navigasi CTA menuju halaman hasil `?page=hasil`).

---

## 3. File yang Boleh Diubah / Dibuat
* [plan.md](file:///home/tripng/Projects/appscript-voting/plan.md) (dibuat/diperbarui: dokumen rencana pelaksanaan tugas).
* [Kode.js](file:///home/tripng/Projects/appscript-voting/Kode.js) (diubah pada fase eksekusi: penambahan konstanta waktu, fungsi helper validasi batas waktu, passing data ke template `doGet`, serta guard di `submitVote`).
* [index.html](file:///home/tripng/Projects/appscript-voting/index.html) (diubah pada fase eksekusi: penambahan markup dan styling antarmuka saat voting berakhir).

---

## 4. File yang TIDAK Boleh Diubah
* [appsscript.json](file:///home/tripng/Projects/appscript-voting/appsscript.json) (konfigurasi runtime dan deployment web app tetap dipertahankan).
* [.clasp.json](file:///home/tripng/Projects/appscript-voting/.clasp.json) (konfigurasi sinkronisasi Clasp tetap).
* [hasil.html](file:///home/tripng/Projects/appscript-voting/hasil.html) (dashboard hasil perolehan suara tidak diubah fungsinya).
* **Skema Spreadsheet** (Sheet `Kelas`, `Siswa`, `Guru`, dan `Suara` tidak boleh ditambah kolom maupun sheet baru).

---

## 5. Tugas Atomik
Maksimal 5 tugas atomik (masing-masing 1 commit):

1. **Commit 1: Implementasi Helper & Guard Validasi Batas Waktu di Kode.js**
   * Tambahkan konstanta `BATAS_WAKTU_VOTING` di bagian atas [Kode.js](file:///home/tripng/Projects/appscript-voting/Kode.js).
   * Buat fungsi helper `isVotingDitutup()` dan `formatWaktuBatas()` di [Kode.js](file:///home/tripng/Projects/appscript-voting/Kode.js) untuk mengecek apakah `new Date() > new Date(BATAS_WAKTU_VOTING)`.
   * Tambahkan pengecekan `isVotingDitutup()` di awal fungsi `submitVote()` agar menolak suara jika deadline telah terlewati.

2. **Commit 2: Passing Status Penutupan Waktu ke Template doGet di Kode.js**
   * Di dalam fungsi `doGet(e)` pada [Kode.js](file:///home/tripng/Projects/appscript-voting/Kode.js), kirim variabel `sudahBerakhir` (boolean) dan `teksBatasWaktu` (string deskripsi tanggal dan jam penutupan) ke `template` untuk halaman index.

3. **Commit 3: Penambahan Elemen UI dan CSS "Voting Berakhir" di index.html**
   * Tambahkan styling CSS baru untuk kartu status penutupan voting (badge "Voting Ditutup", tipografi keterangan, box info waktu, dan tombol CTA menuju halaman hasil).
   * Buat struktur HTML antarmuka tertutup yang rapi dan responsif di dalam kartu utama `<main>`.

4. **Commit 4: Implementasi Logika Conditional Rendering di index.html**
   * Bungkus form pemilihan (badge, judul h1 aktif, steps, grup input, daftar guru, tombol kirim) dengan blok `<? if (!sudahBerakhir) { ?>`.
   * Tampilkan kartu tampilan tertutup jika `<? if (sudahBerakhir) { ?>`.
   * Sediakan tombol link CTA: `"Lihat Hasil Perolehan Suara"` yang mengarah ke `<?= url ?>?page=hasil`.

5. **Commit 5: Integrasi Pesan Feedback Graceful & Dokumentasi Penggunaan**
   * Pastikan skrip sisi klien di `index.html` tidak menjalankan `muatKelas()` dan `muatGuru()` jika `sudahBerakhir === true` guna menghemat kuota eksekusi server GAS.
   * Tambahkan petunjuk format pengisian tanggal dan jam pada komentar `Kode.js`.

---

## 6. Tugas Verifikasi
Jalankan perintah pengujian sintaksis, logika waktu, dan integritas template secara lokal:

1. **Uji Sintaksis JavaScript**:
   ```bash
   node --check /home/tripng/Projects/appscript-voting/Kode.js
   ```

2. **Uji Logika Penutupan Waktu (Node.js One-Liner)**:
   ```bash
   node -e '
     const batasLampau = "2020-01-01T00:00:00+08:00";
     const batasMendatang = "2099-01-01T00:00:00+08:00";
     const cek = (iso) => !iso ? false : new Date() >= new Date(iso);
     console.assert(cek(batasLampau) === true, "Harus bernilai true untuk waktu lampau");
     console.assert(cek(batasMendatang) === false, "Harus bernilai false untuk waktu mendatang");
     console.assert(cek("") === false, "Harus bernilai false jika batas kosong");
     console.log("Semua pengujian logika waktu lolos!");
   '
   ```

3. **Uji Validasi Penolakan submitVote Saat Waktu Lampau**:
   ```bash
   node -e '
     const fs = require("fs");
     const kode = fs.readFileSync("/home/tripng/Projects/appscript-voting/Kode.js", "utf8");
     if (!kode.includes("isVotingDitutup")) {
       console.error("Gagal: fungsi isVotingDitutup belum terpasang di Kode.js");
       process.exit(1);
     }
     console.log("Verifikasi Kode.js: Fungsi pengecekan batas waktu ditemukan.");
   '
   ```

4. **Uji Integritas Template dan Elemen UI di index.html**:
   ```bash
   node -e '
     const fs = require("fs");
     const html = fs.readFileSync("/home/tripng/Projects/appscript-voting/index.html", "utf8");
     const cekElemen = [
       "sudahBerakhir",
       "page=hasil",
       "Voting Ditutup"
     ];
     for (const item of cekElemen) {
       if (!html.includes(item)) {
         console.error(`Gagal: string "${item}" tidak ditemukan di index.html`);
         process.exit(1);
       }
     }
     console.log("Verifikasi index.html: Struktur penutupan voting valid.");
   '
   ```

---

## 7. Di Luar Cakupan
* Menghitung mundur (countdown timer) per detik secara visual di halaman voting ketika masih terbuka.
* Menyediakan antarmuka (UI/GUI) khusus admin untuk mengubah tanggal penutupan tanpa mengedit kode atau properti.
* Pembatasan waktu buka awal (*start date/time*).
* Menutup akses halaman hasil perolehan suara ([hasil.html](file:///home/tripng/Projects/appscript-voting/hasil.html)).

---

## 8. Pertanyaan Terbuka
1. **Preferensi Pengaturan Batas Waktu**: Apakah panitia lebih memilih pengaturan batas waktu ditulis langsung sebagai konstanta di dalam [Kode.js](file:///home/tripng/Projects/appscript-voting/Kode.js) (misal: `const BATAS_WAKTU_VOTING = '2026-11-25T15:00:00+08:00';`), atau menggunakan antarmuka pengaturan *Script Properties* / *Document Properties* bawaan Google Apps Script agar panitia tidak perlu mengedit kode saat ingin mengubah tanggal?
2. **Kebutuhan Waktu Buka Awal (*Start Time*)**: Apakah sistem saat ini hanya membutuhkan batas penutupan (*deadline*), atau di kemudian hari juga memerlukan fitur "Voting Belum Dibuka" (rentang waktu mulai s/d selesai)?
