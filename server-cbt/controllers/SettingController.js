// controllers/SettingController.js
const Setting = require('../models/Setting');
const fs = require('fs');
const path = require('path');

// 1. Ambil Setting
const getSetting = async (req, res) => {
    try {
        let setting = await Setting.findOne();
        if (!setting) {
            // Default jika kosong
            setting = await Setting.create({
                nama_sekolah: "SMP N 1 SHINOBI",
                alamat_sekolah: "Jl. Ninja No. 123, Konoha",
                kepala_sekolah: "Drs. Kakashi Hatake",
                nip: "19650415 199003 1 001",
                list_pelanggaran: "Buka Tab Baru,Keluar Fullscreen,Kamera Tertutup",
                max_pelanggaran: 5
            });
        }
        res.json(setting);
            } catch (error) {
                // BUG #12 FIX: Jangan leak error detail
                res.status(500).json({ msg: "Gagal mengambil pengaturan." });
            }
        };

// 2. Update Setting
const updateSetting = async (req, res) => {
    try {
        if (!req.body) return res.status(400).json({ msg: "Tidak ada data" });

        let setting = await Setting.findOne();
        if (!setting) setting = new Setting();
        
        // Ambil data lengkap termasuk list_pelanggaran
        const { 
            nama_sekolah, 
            alamat_sekolah, 
            website, 
            email,
            kepala_sekolah,
            nip,
            list_pelanggaran, // <--- Data pelanggaran masuk sini
            max_pelanggaran
        } = req.body;
        
        // Update Fields
        if(nama_sekolah) setting.nama_sekolah = nama_sekolah;
        if(alamat_sekolah) setting.alamat_sekolah = alamat_sekolah;
        
        setting.website = website || '';
        setting.email = email || '';
        setting.kepala_sekolah = kepala_sekolah || '';
        setting.nip = nip || '';
        setting.list_pelanggaran = list_pelanggaran || setting.list_pelanggaran; // Update jika ada, kalau tidak biarkan seperti semula
        setting.max_pelanggaran = req.body.max_pelanggaran || setting.max_pelanggaran;
        
        // Update list pelanggaran ke database
        if(list_pelanggaran) setting.list_pelanggaran = list_pelanggaran;

        if(max_pelanggaran) setting.max_pelanggaran = max_pelanggaran;

        // LOGIC UPLOAD GAMBAR (Typo jhh sudah dihapus)
        if (req.files && req.files.logo) {
            const file = req.files.logo;
            const ext = path.extname(file.name);
            const fileName = "logo_sekolah" + ext; 
            
            const uploadDir = './public/uploads';
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

            const uploadPath = path.join(uploadDir, fileName);

            await new Promise((resolve, reject) => {
                file.mv(uploadPath, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            
            setting.logo = fileName;
        }

        await setting.save();
        res.json({ msg: "Pengaturan disimpan" });

    } catch (error) {
        console.error("Error Update Setting:", error);
                // BUG #12 FIX: Jangan leak error detail
                res.status(500).json({ msg: "Gagal menyimpan pengaturan." });
    }
};

// 3. GET Setting untuk Publik (Halaman Login / Ujian Siswa)
const getPublicSettings = async (req, res) => {
    try {
        const setting = await Setting.findOne();
        
        // Gabungkan dalam SATU respon JSON yang rapi
        res.json({
            nama_sekolah: setting ? setting.nama_sekolah : 'CBT Sekolah',
            alamat: setting ? setting.alamat_sekolah : '',
            logo: setting ? setting.logo : null,
            // Jika ada data di DB, ubah teks koma menjadi Array
            pelanggaran: setting && setting.list_pelanggaran 
                         ? setting.list_pelanggaran.split(',') 
                         : ['Buka Tab Baru', 'Keluar Fullscreen', 'Membuka Catatan'],
             max_pelanggaran: setting ? setting.max_pelanggaran : 5
                     });
                 } catch (error) {
                     // BUG #12 FIX: Jangan leak error detail
                     res.status(500).json({ msg: "Gagal mengambil pengaturan." });
    }
}

module.exports = { getSetting, updateSetting, getPublicSettings };