const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

// 1. Ambil Semua Siswa (Dengan Pagination & Filter Kelas)
const getStudents = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20; // Default 20 per page
        const offset = (page - 1) * limit;
        const kelasFilter = req.query.kelas; 
        
        // Buat kondisi Where
        let whereCondition = { role: 'siswa' };
        
        // Jika ada filter kelas (dan bukan 'ALL')
        if (kelasFilter && kelasFilter !== 'ALL') {
            whereCondition.kelas = kelasFilter;
        }

        const { count, rows } = await User.findAndCountAll({
                    where: whereCondition,
                    attributes: ['id', 'nama_lengkap', 'username', 'kelas', 'createdAt'],
                    order: [['kelas', 'ASC'], ['nama_lengkap', 'ASC']],
                    limit: limit,
                    offset: offset
                });

                res.json({
                    result: rows, // Data array siswa ada di sini
                    page: page,
                    limit: limit,
                    totalRows: count,
                    totalPages: Math.ceil(count / limit)
                });
            } catch (error) {
                console.error(error);
                // BUG #12 FIX: Jangan leak error detail
                res.status(500).json({ msg: "Gagal mengambil data siswa." });
    }
};

// 2. Tambah Siswa (Simpan Kelas)
const createStudent = async (req, res) => {
    try {
        let { nama_lengkap, username, password, kelas } = req.body;
        
        // Validasi Input
        if (!nama_lengkap || !username) {
            return res.status(400).json({ msg: "Nama dan NIS wajib diisi" });
        }

        // Default Password jika kosong
        if (!password || password.trim() === "") {
            password = "123456";
        }

        // --- PERBAIKAN: CEK APAKAH USER SUDAH ADA ---
        const userExists = await User.findOne({ where: { username } });
        if (userExists) {
            return res.status(400).json({ msg: "NIS / Username sudah digunakan" });
        }
        // ---------------------------------------------

        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);

        await User.create({
            nama_lengkap,
            username,
            password: hashPassword,
            kelas: kelas || 'Umum', // Default jika tidak diisi
            role: 'siswa'
        });
        
        res.status(201).json({ msg: "Siswa Berhasil Ditambahkan" });

            } catch (error) {
                console.error(error);
                // BUG #12 FIX: Jangan leak error detail
                res.status(400).json({ msg: "Gagal menambahkan siswa. Periksa data yang diinput." });
    }
};

// 3. Update Siswa (Bisa edit kelas)
const updateStudent = async (req, res) => {
    try {
        const student = await User.findOne({ 
            where: { id: req.params.id, role: 'siswa' } 
        });
        
        if(!student) return res.status(404).json({msg: "Siswa tidak ditemukan"});

        const { nama_lengkap, username, password, kelas } = req.body;

        student.nama_lengkap = nama_lengkap;
        student.username = username;
        student.kelas = kelas;

        if(password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            student.password = await bcrypt.hash(password, salt);
        }

        await student.save();
        res.json({ msg: "Data Siswa Diupdate" });

            } catch (error) {
                console.error(error);
                // BUG #12 FIX: Jangan leak error detail
                res.status(400).json({ msg: "Gagal mengupdate data siswa." });
    }
};

// 4. Hapus Siswa
const deleteStudent = async (req, res) => {
    try {
        const deleted = await User.destroy({
            where: { 
                id: req.params.id,
                role: 'siswa'
            }
        });
        if(!deleted) return res.status(404).json({msg: "Gagal hapus / Siswa tidak ditemukan"});
        
        res.json({ msg: "Siswa Berhasil Dihapus" });
    } catch (error) {
        console.error(error);
        // BUG #12 FIX: Jangan leak error detail
        res.status(500).json({ msg: "Gagal menghapus siswa." });
    }
};

// 5. IMPORT SISWA
const importStudents = async (req, res) => {
    const { students } = req.body; 

    if (!Array.isArray(students) || students.length === 0) {
        return res.status(400).json({ msg: "Data kosong" });
    }

    let successCount = 0;
    let failCount = 0;
    
    // Hash password sekali saja di luar loop untuk performa
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash("123456", salt);

    try {
        for (const s of students) {
            // Cek duplikat
            const exist = await User.findOne({ where: { username: s.username } });
            
            // Pastikan Nama & Username ada
            if (!exist && s.username && s.nama_lengkap) {
                await User.create({
                    nama_lengkap: s.nama_lengkap,
                    username: s.username,
                    kelas: s.kelas || 'Umum', 
                    password: hashPassword,
                    role: 'siswa'
                });
                successCount++;
            } else {
                failCount++;
            }
        }
        res.json({ 
            msg: `Import Selesai. Sukses: ${successCount}, Gagal/Duplikat: ${failCount}`,
            summary: { success: successCount, failed: failCount }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Gagal import data" });
    }
};

// 6. AMBIL DAFTAR KELAS UNIK (Untuk Filter Frontend)
const getStudentClasses = async (req, res) => {
    try {
        const classes = await User.findAll({
            where: { 
                role: 'siswa',
                kelas: { [Op.ne]: null } // Ambil yang kelasnya tidak null
            },
            attributes: ['kelas'],
            group: ['kelas'], // Group by kelas (agar unik/distinct)
            order: [['kelas', 'ASC']]
        });

        // Hasilnya array object: [{kelas: 'X RPL 1'}, {kelas: 'X RPL 2'}]
        // Kita ubah jadi array string simpel: ['X RPL 1', 'X RPL 2']
        const classList = classes.map(item => item.kelas).filter(c => c !== '');
        
        res.json(classList);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Gagal memuat daftar kelas" });
    }
};

// 7. HAPUS MASSAL SISWA (BULK DELETE)
const bulkDeleteStudents = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ msg: "Tidak ada siswa yang dipilih" });
        }

        await User.destroy({
            where: {
                id: { [Op.in]: ids },
                role: 'siswa'
            }
        });

        res.json({ msg: `${ids.length} data siswa berhasil dihapus` });
    } catch (error) {
        console.error(error);
        // BUG #12 FIX: Jangan leak error detail
        res.status(500).json({ msg: "Gagal menghapus data secara massal." });
    }
};

module.exports = { getStudents, createStudent, updateStudent, deleteStudent, importStudents, getStudentClasses, bulkDeleteStudents };