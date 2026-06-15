# Tutorial Instalasi CBT Sekolah

Sistem Computer Based Test (CBT) untuk sekolah. Install sekali jalan, langsung pakai.

## Spesifikasi Minimum

| Komponen | Minimum | Rekomendasi |
|----------|---------|-------------|
| OS | Ubuntu 20.04 / Debian 11 | Ubuntu 22.04 LTS |
| CPU | 1 Core | 2 Core |
| RAM | 1 GB | 2 GB |
| Storage | 10 GB | 20 GB |
| Port | 80, 5000 | 80, 443 |

## Instalasi Satu Command

Login ke VPS via SSH, jalankan perintah berikut:

```bash
curl -sL https://raw.githubusercontent.com/mantraabi/cbt-sekolah/main/install.sh | sudo bash
```

Tunggu proses instalasi selesai (±3-5 menit tergantung koneksi internet). Setelah selesai, akan muncul informasi login.

## Yang Dilakukan Installer

Proses instalasi berjalan otomatis melalui 8 tahap:

1. **System Dependencies** - Menginstall paket sistem yang dibutuhkan (curl, git, build-essential)
2. **Node.js 20** - Menginstall runtime JavaScript untuk menjalankan server
3. **MySQL** - Menginstall dan mengkonfigurasi database
4. **Database** - Membuat database, user, dan password secara otomatis
5. **Download** - Mengunduh source code CBT dari repository
6. **Setup** - Menginstall dependencies, membangun frontend, mengkonfigurasi environment
7. **Nginx** - Menginstall dan mengkonfigurasi reverse proxy (akses via port 80)
8. **PM2** - Menjalankan server dengan process manager (auto-restart saat crash)

## Setelah Instalasi

### 1. Login Pertama

Buka browser, akses `http://IP-VPS` (ganti dengan IP VPS Anda).

| Field | Isi |
|-------|-----|
| Username | `admin` |
| Password | `admin123` |

**Penting:** Segera ganti password setelah login pertama melalui menu Pengaturan > Keamanan Akun.

### 2. Aktifkan Lisensi

Sistem CBT memerlukan lisensi untuk dapat digunakan. Masukkan license key yang Anda dapatkan dari penyedia sistem melalui menu **Pengaturan > Lisensi Sistem**.

Tersedia tiga paket lisensi:

| Paket | Kelebihan |
|-------|-----------|
| **Trial** | Ujian pilihan ganda, max 50 siswa, 30 hari |
| **Standard** | Semua tipe soal, semua fitur, sesuai durasi |
| **Premium** | Semua fitur Standard + max siswa unlimited |

### 3. Konfigurasi Sekolah

Di menu **Pengaturan**, lengkapi informasi sekolah:
- Nama sekolah
- Alamat lengkap
- Logo sekolah
- Nama kepala sekolah dan NIP (untuk cetak kartu ujian)
- Aturan pelanggaran ujian

### 4. Tambah Data

Urutan pengisian data yang disarankan:

1. **Data Akademik** - Tambah mata pelajaran beserta kelas
2. **Data Siswa** - Tambah siswa satu per satu atau import dari Excel
3. **Bank Soal** - Buat soal untuk setiap mata pelajaran
4. **Jadwal Ujian** - Buat jadwal ujian dan dapatkan token

### 5. Pelaksanaan Ujian

1. Bagikan token ujian kepada siswa
2. Siswa login, masukkan token, mulai mengerjakan
3. Pantau siswa secara real-time di menu Monitoring
4. Setelah ujian selesai, nilai otomatis terhitung (kecuali esai perlu koreksi manual)

## Mengelola Server

Perintah yang berguna untuk mengelola server via SSH:

```bash
# Status server
pm2 status

# Lihat log server
pm2 logs cbt-server

# Restart server
pm2 restart cbt-server

# Stop server
pm2 stop cbt-server

# Edit konfigurasi
nano /opt/cbt-sekolah/.env

# Backup database manual
/usr/local/bin/cbt-backup.sh

# Info instalasi lengkap
cat /opt/cbt-sekolah/INSTALL_INFO.txt
```

## Backup Database

Backup dilakukan otomatis setiap jam 02:00 dini hari dan disimpan di `/opt/cbt-backups/`. Backup tersimpan selama 30 hari.

Untuk backup manual:
```bash
/usr/local/bin/cbt-backup.sh
```

Untuk restore dari backup:
```bash
bash /opt/cbt-sekolah/scripts/db-restore.sh /opt/cbt-backups/nama_file.sql.gz
```

## Update Sistem

Ketika ada versi baru, jalankan via SSH:

```bash
cd /opt/cbt-sekolah
git pull
cd client-cbt && npm install && npm run build && cd ..
cp -r client-cbt/dist/* public/
npm install --production
pm2 restart cbt-server
```

## Konfigurasi Domain

Jika ingin menggunakan domain (contoh: `cbt.sekolah.sch.id`):

1. Point DNS A record ke IP VPS
2. Edit konfigurasi Nginx:
```bash
sudo nano /etc/nginx/sites-available/cbt
```
3. Ganti `server_name _;` dengan `server_name cbt.sekolah.sch.id;`
4. Restart Nginx:
```bash
sudo systemctl restart nginx
```

### SSL/HTTPS (Opsional)

Untuk mengaktifkan HTTPS dengan Let's Encrypt (gratis):

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d cbt.sekolah.sch.id
```

## Uninstall

Untuk menghapus seluruh sistem CBT dari VPS:

```bash
curl -sL https://raw.githubusercontent.com/mantraabi/cbt-sekolah/main/uninstall.sh | sudo bash
```

## Troubleshooting

### Server tidak bisa diakses
```bash
# Cek status server
pm2 status

# Cek log error
pm2 logs cbt-server --lines 50

# Cek Nginx
sudo systemctl status nginx
sudo nginx -t
```

### Database error
```bash
# Cek MySQL berjalan
sudo systemctl status mysql

# Cek koneksi database
mysql -u user_cbt -p -e "USE db_cbt_sekolah; SHOW TABLES;"
```

### Lupa password admin
```bash
cd /opt/cbt-sekolah
node -e "
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const db = require('./config/database');
(async () => {
    await db.authenticate();
    const admin = await User.findOne({ where: { role: 'admin' } });
    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash('admin123', salt);
    await admin.save();
    console.log('Password di-reset ke: admin123');
    process.exit(0);
})();
"
```

### Port 80 sudah dipakai
```bash
# Cek siapa yang pakai port 80
sudo lsof -i :80

# Hentikan Apache (jika ada)
sudo systemctl stop apache2
sudo systemctl disable apache2

# Restart Nginx
sudo systemctl restart nginx
```

## Fitur Lengkap

- Soal Pilihan Ganda (PG)
- Soal Esai dengan koreksi otomatis (keyword)
- Soal PG Kompleks (jawaban ganda)
- Soal Menjodohkan
- Import/Export soal dari Excel
- Import/Export data siswa dari Excel
- Export nilai ke Excel
- Monitoring ujian real-time
- Anti-cheat (fullscreen, deteksi pindah tab, pelanggaran)
- Acak urutan soal dan opsi
- Autosave jawaban (tahan putus internet)
- Koreksi manual esai oleh guru
- Analisis butir soal
- Cetak kartu ujian
- Multi-role (Admin, Guru, Pengawas, Siswa)
- Sistem lisensi (Trial/Standard/Premium)
- Backup dan restore database
- Responsive (bisa dipakai di tablet)

## Link

- Repository: [github.com/mantraabi/cbt-sekolah](https://github.com/mantraabi/cbt-sekolah)
- Pengembang: [abimantra.my.id](https://abimantra.my.id)

---

Dikembangkan oleh **Abi Creative** - Solusi digital untuk sekolah modern.
