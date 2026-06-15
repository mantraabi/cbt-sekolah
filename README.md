# 🏫 CBT Sekolah

Computer Based Test (CBT) untuk sekolah. Sistem ujian online yang aman, cepat, dan mudah digunakan.

## ⚡ Install Sekali Jalan

```bash
curl -sL https://raw.githubusercontent.com/mantraabi/cbt-sekolah/main/install.sh | sudo bash
```

Atau:

```bash
wget -qO- https://raw.githubusercontent.com/mantraabi/cbt-sekolah/main/install.sh | sudo bash
```

**Selesai!** Server berjalan di `http://IP-VPS:5000`

### Default Login
| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |

⚠️ **Segera ganti password setelah login pertama!**

📖 **Tutorial lengkap:** [docs/instalasi.md](docs/instalasi.md)

## 📋 Fitur

- ✅ Soal Pilihan Ganda, Esai, PG Kompleks, Menjodohkan
- ✅ Monitoring ujian real-time
- ✅ Koreksi otomatis + manual esai
- ✅ Import/Export soal & nilai (Excel)
- ✅ Acak soal & opsi
- ✅ Anti-cheat (fullscreen, deteksi pindah tab)
- ✅ Sistem lisensi (Trial/Standard/Premium)
- ✅ Backup & restore database
- ✅ Export kartu ujian
- ✅ Analisis butir soal
- ✅ Multi-role (Admin, Guru, Pengawas, Siswa)

## 🔑 Sistem Lisensi

Aplikasi memerlukan lisensi untuk digunakan. Hubungi penyedia sistem untuk mendapatkan lisensi.

| Paket | Durasi | Max Siswa | Fitur |
|-------|--------|-----------|-------|
| Trial | 30 hari | 50 | PG only, basic |
| Standard | Fleksibel | Sesuai | Semua fitur |
| Premium | Fleksibel | Unlimited | Semua fitur + prioritas |

## 🛠️ Manage Server

```bash
# Status
pm2 status

# Log
pm2 logs cbt-server

# Restart
pm2 restart cbt-server

# Stop
pm2 stop cbt-server

# Edit config
nano /opt/cbt-sekolah/.env

# Backup manual
/usr/local/bin/cbt-backup.sh

# Info install
cat /opt/cbt-sekolah/INSTALL_INFO.txt
```

## 🔄 Update

```bash
cd /opt/cbt-sekolah
git pull
npm install --production
pm2 restart cbt-server
```

## 🗑️ Uninstall

```bash
curl -sL https://raw.githubusercontent.com/mantraabi/cbt-sekolah/main/uninstall.sh | sudo bash
```

## 📁 Struktur

```
server-cbt/
├── app.js                  ← Entry point
├── config/database.js      ← Koneksi MySQL
├── controllers/            ← Business logic
├── middleware/              ← Auth, license, validation
├── models/                 ← Sequelize models
├── routes/                 ← API routes
├── public/uploads/         ← File upload
├── scripts/                ← DB scripts
├── .env                    ← Config (auto-generated)
└── package.json
```

## 🔧 Requirements

- OS: Ubuntu 20.04+ / Debian 11+ / CentOS 7+
- RAM: 1GB minimum, 2GB recommended
- Storage: 10GB minimum
- Port: 5000 (configurable di .env)

## 📞 Support

Dikembangkan oleh [abimantra.my.id](https://abimantra.my.id)

## 📄 License

Proprietary. Lisensi diperlukan untuk penggunaan.
