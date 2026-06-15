# Changelog - CBT Sekolah SuperAPP

Semua perubahan dan pembaruan penting pada aplikasi CBT ini akan didokumentasikan di file ini.
Format penulisan mengacu pada [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [v1.4.0] - 2026-03-10

### 🚀 Fitur Baru (Added)
- **Auto-Installer (SaaS-Ready):** Sistem kini dapat secara otomatis mendeteksi, membuat database, menyusun relasi tabel, dan membuat akun Admin *default* saat pertama kali di- *deploy* di VPS baru. Tidak perlu lagi *import/export* SQL manual!
- **Server-Side Pagination:** Menambahkan sistem *pagination* (pembagian halaman) langsung dari *database* pada menu **Jadwal Ujian**, **Rekap Nilai**, dan **Data Akademik**. Memuat puluhan ribu data kini terasa instan tanpa membebani *browser* klien.
- **Advanced Filtering:** Menambahkan *dropdown filter* dinamis untuk menyaring data berdasarkan **Mata Pelajaran** dan **Kelas** pada menu Jadwal Ujian, Rekap Nilai, dan Data Akademik.

### 🐛 Perbaikan Bug (Fixed)
- **Data Akademik:** Memperbaiki jalur *Routing API* Mapel yang sebelumnya menyebabkan fitur pencarian dan *filter* tidak terbaca oleh *server*.
- **Jadwal Ujian:** Mengembalikan tombol aksi "Akhiri Ujian" (Force Close) yang sempat hilang dari tabel daftar jadwal.

## [v1.3.0] - 2026-03-01

### 🚀 Fitur Baru (Added)
- **Analisis Butir Soal (Item Analysis):** Menambahkan fitur premium untuk menganalisis tingkat kesulitan tiap soal (Mudah/Sedang/Sulit) dan persentase siswa yang menjawab benar berdasarkan data ujian langsung.
- **Menu Info Update:** Menambahkan menu "Info Update" terdedikasi di Dashboard Admin agar guru dan panitia bisa melihat riwayat pembaruan aplikasi.

### 🎨 Peningkatan UI/UX (Changed)
- **Bank Soal:** Menambahkan kolom **Kunci Jawaban** di dalam tabel agar guru tidak perlu mengklik tombol "Edit" untuk mengecek kunci.
- **Bank Soal:** Mengoptimasi tampilan tabel agar soal yang panjang terpotong rapi (maksimal 1 baris) dengan dukungan *Hover Tooltip* untuk membaca teks lengkapnya.
- **Monitoring Ujian:** Menambahkan tombol "Kembali" (Panah Kiri) di sebelah judul halaman untuk mempermudah navigasi panitia.

### ⚙️ Optimasi Sistem (Optimized)
- **Database Indexing:** Menerapkan algoritma *Indexing* pada tabel MySQL (`nilai`, `users`, `bank_soal`, dan `ujian`). Pencarian data kini 10x lebih cepat dan *server* tetap dingin meski diakses ribuan siswa bersamaan.

## [v1.2.0] - 2026-02-28

### 🚀 Fitur Baru (Added)
- **Data Siswa:** Menambahkan kotak centang (*checkbox*) dan tombol **Hapus Massal (Bulk Delete)** untuk menghapus banyak siswa sekaligus dalam satu kali klik.
- **Bank Soal:** Menambahkan fitur **Hapus Massal** untuk soal ujian.
- **Bank Soal:** Menambahkan fitur **Export Excel** untuk mengunduh soal beserta kunci jawabannya ke format `.xlsx` (kompatibel penuh dengan template *Import*).
- **Monitoring Ujian:** Menambahkan tombol **Selesai (Force Submit)** pada kartu peserta ujian berstatus *Idle/Mengerjakan* untuk mengeksekusi nilai secara individu tanpa harus menutup jadwal ujian.

### 🐛 Perbaikan Bug (Fixed)
- **Ujian Siswa:** Memperbaiki sistem *Anti-Cheat* yang terlalu sensitif saat layar HP mati (Auto-Sleep). Sekarang siswa diberikan *Grace Period* (Toleransi Waktu) 15 detik untuk menyalakan layarnya kembali tanpa tercatat sebagai pelanggaran.
- **Ujian Siswa:** Memperbaiki *bug* siswa tiba-tiba "Selesai" atau tertendang (Logout) di tengah ujian akibat durasi Token JWT yang kedaluwarsa. Durasi kini diatur dinamis via file `.env` (`JWT_EXPIRES_IN=12h`).
- **Dashboard Siswa:** Memperbaiki *bug* di mana "Riwayat Ujian" lenyap dari halaman siswa setelah proktor menekan tombol "Akhiri Ujian" pada jadwal.
- **Monitoring Ujian:** Memperbaiki logika kalkulasi pada fitur "Paksa Selesai", sehingga sistem kini akurat menghitung nilai berdasarkan rekam jejak jawaban *Autosave* terakhir siswa.
- **Rekap Nilai:** Memperbaiki CSS Print untuk hasil cetak PDF agar tabel tidak terpotong, garis tepi (border) terlihat jelas, dan halaman bersambung dengan rapi.
- **Routing API:** Memperbaiki *Error 404* saat Export Bank Soal dengan menyesuaikan prioritas *routing* Express.js (Statis di atas Dinamis).

### ⚙️ Peningkatan Sistem (Changed / Optimized)
- **Performa Server:** Membuka gembok tombol "Selesai" pada HP siswa meskipun waktu ujian belum habis. Ini mendistribusikan beban *server* agar tidak terjadi lonjakan (*Thundering Herd Problem*) saat waktu ujian habis secara serentak.