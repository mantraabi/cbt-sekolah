// controllers/MapelController.js

// 1. SESUAIKAN IMPORT KE FILE YANG BENAR
const MataPelajaran = require('../models/MataPelajaran'); 
const { Op } = require('sequelize'); // <--- WAJIB DITAMBAHKAN UNTUK FITUR PENCARIAN

// 2. TAMBAH MAPEL
const createMapel = async (req, res) => {
    console.log("📥 REQUEST MASUK:");
    console.log("Body:", req.body);

    try {
        const { kode_mapel, nama_mapel, kelas, jurusan } = req.body;

        if(!kode_mapel || !nama_mapel || !kelas) {
            return res.status(400).json({ 
                msg: "Kode, Nama Mapel, dan Kelas wajib diisi!" 
            });
        }

        const existing = await MataPelajaran.findOne({ 
            where: { kode_mapel: kode_mapel } 
        });
        if(existing) {
            return res.status(400).json({ msg: "Kode Mapel sudah digunakan!" });
        }

        await MataPelajaran.create({
            kode_mapel: kode_mapel,
            nama_mapel: nama_mapel,
            kelas: kelas, 
            jurusan: jurusan || 'Semua' 
        });

        res.status(201).json({ msg: "Mata Pelajaran Berhasil Ditambahkan" });

    } catch (error) {
        console.error("Error Create Mapel:", error);
                // BUG #12 FIX: Jangan leak error detail
                res.status(500).json({ msg: "Gagal membuat mata pelajaran." });
    }
}

// 3. UPDATE MAPEL
const updateMapel = async (req, res) => {
    try {
        const mapel = await MataPelajaran.findOne({
            where: { id: req.params.id }
        });
        if(!mapel) return res.status(404).json({msg: "Data tidak ditemukan"});

        const { kode_mapel, nama_mapel, kelas, jurusan } = req.body;
        
        await MataPelajaran.update({ 
            kode_mapel, nama_mapel, kelas, jurusan 
        }, {
            where: { id: req.params.id }
        });
        res.json({msg: "Data Berhasil Diupdate"});
            } catch (error) {
                // BUG #12 FIX: Jangan leak error detail
                res.status(500).json({msg: "Gagal mengupdate data."});
    }
}

// 4. GET ALL MAPEL (UPGRADE: SUPPORT PAGINATION, FILTER KELAS & SEARCH MAPEL)
const getMapel = async (req, res) => {
    try {
        // Tangkap parameter dari Frontend (jurusan dihilangkan)
        const { page = 1, limit = 10, kelas, search } = req.query;
        const offset = (page - 1) * limit;
        
        const whereClause = {};

        // Filter Kelas 
        if (kelas && kelas !== 'ALL') whereClause.kelas = kelas;
        
        // Filter Pencarian Teks (Bisa cari berdasarkan Nama atau Kode)
        if (search) {
            whereClause[Op.or] = [
                { nama_mapel: { [Op.like]: `%${search}%` } },
                { kode_mapel: { [Op.like]: `%${search}%` } }
            ];
        }

        // Ambil data dengan batas halaman (findAndCountAll)
        const { count, rows } = await MataPelajaran.findAndCountAll({
            where: whereClause,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']] // Urutkan dari data yang terbaru dibuat
        });

        // Kirim response lengkap untuk Pagination Vue.js
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
}

// 5. DELETE MAPEL
const deleteMapel = async (req, res) => {
    try {
        const mapel = await MataPelajaran.findOne({
             where: { id: req.params.id }
        });
        if(!mapel) return res.status(404).json({msg: "Data tidak ditemukan"});
        await mapel.destroy();
                res.json({msg: "Berhasil Dihapus"});
            } catch (error) {
                // BUG #12 FIX: Jangan leak error detail
                res.status(500).json({msg: "Gagal menghapus data."});
    }
}

module.exports = {
    getMapel,
    createMapel,
    updateMapel,
    deleteMapel
}