// File: controllers/UserController.js
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const User = require('../models/User');

// Mengambil semua data pengguna
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'nama_lengkap', 'role'],
            where: {
                role: {
                    [Op.ne]: 'siswa' // <--- 2. FILTER: "Not Equal" (Tidak sama dengan) siswa
                }
            },
            order: [
                ['role', 'ASC'], // Opsional: Urutkan berdasarkan abjad role (admin -> guru -> pengawas)
                ['nama_lengkap', 'ASC']
            ]
        });
        res.status(200).json({ data: users });
    } catch (error) {
        // BUG #12 FIX: Jangan leak error detail
        res.status(500).json({ msg: "Gagal mengambil data pengguna." });
    }
};

// Membuat pengguna baru
exports.createUser = async (req, res) => {
    const { username, nama_lengkap, password, role } = req.body;
    try {
        // Cek apakah username sudah dipakai
        const existingUser = await User.findOne({ where: { username: username } });
        if (existingUser) return res.status(400).json({ msg: "Username sudah digunakan!" });

        // Enkripsi password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await User.create({
            username: username,
            nama_lengkap: nama_lengkap,
            password: hashedPassword,
            role: role || 'pengawas'
        });
        
        res.status(201).json({ msg: "Pengguna berhasil dibuat" });
    } catch (error) {
        // BUG #12 FIX: Jangan leak error detail
        res.status(500).json({ msg: "Gagal membuat pengguna." });
    }
};

// Mengubah data pengguna
exports.updateUser = async (req, res) => {
    const { nama_lengkap, password, role } = req.body;
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ msg: "Pengguna tidak ditemukan" });

        // Jika user mengetikkan password baru, maka enkripsi ulang. Jika tidak, pakai password lama.
        let hashedPassword = user.password;
        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            hashedPassword = await bcrypt.hash(password, salt);
        }

        await user.update({
            nama_lengkap: nama_lengkap || user.nama_lengkap,
            password: hashedPassword,
            role: role || user.role
        });

        res.status(200).json({ msg: "Pengguna berhasil diupdate" });
    } catch (error) {
        // BUG #12 FIX: Jangan leak error detail
        res.status(500).json({ msg: "Gagal mengupdate pengguna." });
    }
};

// Menghapus pengguna
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ msg: "Pengguna tidak ditemukan" });
        
        await user.destroy();
        res.status(200).json({ msg: "Pengguna berhasil dihapus" });
    } catch (error) {
        // BUG #12 FIX: Jangan leak error detail
        res.status(500).json({ msg: "Gagal menghapus pengguna." });
    }
};