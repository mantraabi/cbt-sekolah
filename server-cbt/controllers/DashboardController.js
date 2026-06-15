const User = require('../models/User');
const MataPelajaran = require('../models/MataPelajaran');
const BankSoal = require('../models/BankSoal');
const Ujian = require('../models/Ujian');
const { Op } = require('sequelize');

const getDashboardStats = async (req, res) => {
    try {
        // 1. Hitung Total Siswa
        const totalSiswa = await User.count({
            where: { role: 'siswa' }
        });

        // 2. Hitung Total Mapel
        const totalMapel = await MataPelajaran.count();

        // 3. Hitung Total Soal
        const totalSoal = await BankSoal.count();

        // 4. Hitung Ujian Aktif (Yang statusnya aktif ATAU tanggalnya belum lewat)
        const totalUjian = await Ujian.count({
            where: {
                status: 'aktif',
                tgl_selesai: {
                    [Op.gte]: new Date() // Tanggal selesai >= Sekarang
                }
            }
        });

        res.json({
            siswa: totalSiswa,
            mapel: totalMapel,
            soal: totalSoal,
            ujian: totalUjian
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Gagal memuat statistik dashboard" });
    }
};

module.exports = { getDashboardStats };