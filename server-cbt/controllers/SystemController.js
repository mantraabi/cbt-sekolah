const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
const db = require('../config/database');

// Import Semua Model
const User = require('../models/User');
const MataPelajaran = require('../models/MataPelajaran'); 
const BankSoal = require('../models/BankSoal');
const Ujian = require('../models/Ujian');
const Nilai = require('../models/Nilai');
const Setting = require('../models/Setting');

// 1. BACKUP DATABASE (DOWNLOAD JSON)
const backupDatabase = async (req, res) => {
    try {
        const data = {
            timestamp: new Date(),
            // BUG #7 FIX: Exclude password hash dari backup
            users: await User.findAll({ raw: true, attributes: { exclude: ['password'] } }),
            mata_pelajaran: await MataPelajaran.findAll({ raw: true }),
            bank_soal: await BankSoal.findAll({ raw: true }),
            ujian: await Ujian.findAll({ raw: true }),
            nilai: await Nilai.findAll({ raw: true }),
            setting: await Setting.findOne({ raw: true })
        };

        const fileName = `backup_cbt_${Date.now()}.json`;
        const tempDir = path.join(process.cwd(), 'public', 'temp');
        const filePath = path.join(tempDir, fileName);
        
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

        // BUG #10 FIX: Kirim file via stream, cleanup setelah selesai
        res.download(filePath, fileName, (err) => {
            // Cleanup: hapus file temp setelah download selesai (atau gagal)
            try {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            } catch (unlinkErr) {
                console.error("[BACKUP CLEANUP ERROR]", unlinkErr);
            }
            if (err && !res.headersSent) {
                console.error("Error Download:", err);
            }
        });

    } catch (error) {
        console.error("[BACKUP ERROR]", error);
        res.status(500).json({ msg: "Gagal membuat backup database" });
    }
};

// 2. RESTORE DATABASE (UPLOAD JSON)
const restoreDatabase = async (req, res) => {
    try {
        // FIX 1: Auto-detect file apapun nama key yang dikirim dari Frontend
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({ msg: "File backup tidak ditemukan!" });
        }

        const fileKey = Object.keys(req.files)[0]; // Mengambil file pertama yang terdeteksi
        const file = req.files[fileKey];

        // FIX 2: Hapus karakter gaib (BOM) sebelum di-parse agar tidak error
        let rawData = file.data.toString('utf8').trim();
        rawData = rawData.replace(/^\uFEFF/, ''); 
        
        let jsonData;
        try {
            jsonData = JSON.parse(rawData);
        } catch (e) {
            console.error("[JSON PARSE ERROR]", e.message);
            return res.status(400).json({ msg: "Format file rusak! Pastikan isi file benar-benar JSON." });
        }

        // PROSES RESTORE (TRANSACTION & FOREIGN KEY DISABLE)
        await db.transaction(async (t) => {
            // 1. Matikan satpam MySQL sementara
            await db.query('SET FOREIGN_KEY_CHECKS = 0', { transaction: t });
            
            // 2. Kosongkan semua data lama
            await Nilai.destroy({ where: {}, transaction: t });
            await Ujian.destroy({ where: {}, transaction: t });
            await BankSoal.destroy({ where: {}, transaction: t });
            await MataPelajaran.destroy({ where: {}, transaction: t });
            await User.destroy({ where: {}, transaction: t });
            await Setting.destroy({ where: {}, transaction: t });

            // FIX 3: Tambahkan opsi validate:false & logging:false agar proses bulkCreate sangat cepat
            const bulkOpt = { transaction: t, validate: false, logging: false };

            // 3. Masukkan data baru dari file JSON
            if (jsonData.setting) await Setting.create(jsonData.setting, { transaction: t });
            // BUG #7 FIX: Restore users — set default password jika backup tidak ada password hash
            if (jsonData.users && jsonData.users.length > 0) {
                const bcrypt = require('bcryptjs');
                const defaultSalt = await bcrypt.genSalt(10);
                const defaultHash = await bcrypt.hash('123456', defaultSalt);
                const usersWithPassword = jsonData.users.map(u => ({
                    ...u,
                    password: u.password || defaultHash
                }));
                await User.bulkCreate(usersWithPassword, bulkOpt);
            }
            if (jsonData.mata_pelajaran && jsonData.mata_pelajaran.length > 0) await MataPelajaran.bulkCreate(jsonData.mata_pelajaran, bulkOpt);
            if (jsonData.bank_soal && jsonData.bank_soal.length > 0) await BankSoal.bulkCreate(jsonData.bank_soal, bulkOpt);
            if (jsonData.ujian && jsonData.ujian.length > 0) await Ujian.bulkCreate(jsonData.ujian, bulkOpt);
            if (jsonData.nilai && jsonData.nilai.length > 0) await Nilai.bulkCreate(jsonData.nilai, bulkOpt);

            // 4. Hidupkan kembali satpam MySQL
            await db.query('SET FOREIGN_KEY_CHECKS = 1', { transaction: t });
        });

        res.json({ msg: "Database berhasil dipulihkan! Silakan login ulang untuk keamanan." });

    } catch (error) {
        console.error("[RESTORE ERROR]", error);
        
        try { await db.query('SET FOREIGN_KEY_CHECKS = 1'); } catch(e) {}

        // FIX 4: Kirimkan pesan error ASLI ke frontend agar tidak meraba-raba jika gagal
        // BUG #12 FIX: Jangan leak error detail
        res.status(500).json({ msg: "Gagal restore database. Periksa format file backup." });
    }
};

module.exports = { backupDatabase, restoreDatabase };