// controllers/SubjectController.js

const { Op } = require('sequelize'); // WAJIB: Untuk fitur pencarian teks
const MataPelajaran = require('../models/MataPelajaran');

// 1. Ambil Semua Mapel (SUDAH DI-UPGRADE DENGAN PAGINATION & FILTER)
const getAllSubjects = async (req, res) => {
    try {
        const { page = 1, limit = 10, kelas, search } = req.query;
        const offset = (page - 1) * limit;
        
        const whereClause = {};

        // Filter Kelas 
        if (kelas && kelas !== 'ALL') whereClause.kelas = kelas;
        
        // Filter Pencarian Teks (Nama Mapel atau Kode Mapel)
        if (search) {
            whereClause[Op.or] = [
                { nama_mapel: { [Op.like]: `%${search}%` } },
                { kode_mapel: { [Op.like]: `%${search}%` } }
            ];
        }

        // Ambil data dengan batas halaman
        const { count, rows } = await MataPelajaran.findAndCountAll({
            where: whereClause,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']] // Urutkan dari yang terbaru
        });

        // Kirim response format Pagination
        res.json({
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            data: rows
        });
    } catch (error) {
        console.error("[ERROR GET MAPEL]", error);
                // BUG #12 FIX: Jangan leak error detail
                res.status(500).json({ msg: "Gagal mengambil data mata pelajaran." });
    }
};

// 2. Tambah Mapel (SUDAH DIPERBAIKI: Menangkap kode_mapel & jurusan)
const createSubject = async (req, res) => {
    try {
        const { kode_mapel, nama_mapel, kelas, jurusan } = req.body;

        // Validasi Manual
        if(!kode_mapel || !nama_mapel || !kelas) {
            return res.status(400).json({ msg: "Kode, Nama, dan Kelas wajib diisi!" });
        }

        // Cek Duplikat Kode
        const existing = await MataPelajaran.findOne({ where: { kode_mapel: kode_mapel } });
        if(existing) {
            return res.status(400).json({ msg: "Kode Mapel sudah digunakan!" });
        }

        // Simpan ke Database
        const newSubject = await MataPelajaran.create({ 
            kode_mapel, 
            nama_mapel, 
            kelas, 
            jurusan: jurusan || 'Semua' 
        });

        res.status(201).json({ msg: "Mapel Berhasil Dibuat", data: newSubject });
    } catch (error) {
        console.error("Error Create Subject:", error);
                // BUG #12 FIX: Jangan leak error detail
                res.status(500).json({ msg: "Gagal membuat mata pelajaran." });
    }
};

// 3. Hapus Mapel
const deleteSubject = async (req, res) => {
    try {
        const mapel = await MataPelajaran.findOne({ where: { id: req.params.id } });
        if(!mapel) return res.status(404).json({ msg: "Mapel tidak ditemukan" });

        await mapel.destroy();
                res.json({ msg: "Mapel Dihapus" });
            } catch (error) {
                // BUG #12 FIX: Jangan leak error detail
                res.status(500).json({ msg: "Gagal menghapus mata pelajaran." });
            }
        };

// 4. Update Mapel
const updateSubject = async (req, res) => {
    try {
        const mapel = await MataPelajaran.findOne({ where: { id: req.params.id } });
        if(!mapel) return res.status(404).json({ msg: "Mapel tidak ditemukan" });

        const { kode_mapel, nama_mapel, kelas, jurusan } = req.body;
        await mapel.update({ kode_mapel, nama_mapel, kelas, jurusan });
        
                res.json({ msg: "Mapel Diupdate" });
            } catch (error) {
                // BUG #12 FIX: Jangan leak error detail
                res.status(500).json({ msg: "Gagal mengupdate mata pelajaran." });
    }
};

module.exports = { getAllSubjects, createSubject, deleteSubject, updateSubject };