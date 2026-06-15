// File: controllers/AuthController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. REGISTER
const register = async (req, res) => {
    const { username, password, nama_lengkap, role } = req.body;

    if (!username || !password || !nama_lengkap) {
        return res.status(400).json({ msg: "Semua field harus diisi!" });
    }

    try {
        const userExists = await User.findOne({ where: { username } });
        if (userExists) return res.status(400).json({ msg: "Username sudah digunakan" });

        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);

        // BUG #1 FIX: Hardcode role ke 'siswa' — tidak boleh dari user input
        // Hanya admin yang bisa buat user role lain via /api/users
        await User.create({
            username,
            password: hashPassword,
            nama_lengkap,
            role: 'siswa'
        });

        res.status(201).json({ msg: "Registrasi Berhasil" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Terjadi kesalahan server." });
    }
};

// 2. LOGIN
const login = async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ where: { username } });
        if (!user) return res.status(404).json({ msg: "User tidak ditemukan" });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ msg: "Password salah" });

        const userId = user.id;
        const userRole = user.role;
        
        // PERBAIKAN: Ambil dari .env, kalau di .env kosong/lupa, pakai default 12 jam
        const accessToken = jwt.sign({ userId, role: userRole }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '12h'
        });

        res.json({
            msg: "Login Berhasil",
            accessToken,
            user: {
                id: userId,
                nama: user.nama_lengkap,
                role: userRole,
                kelas: user.kelas // Opsional: kirim kelas saat login
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Terjadi kesalahan server." });
    }
};

// 3. CEK USER (GET ME)
const getMe = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.userId, {
            attributes: ['id', 'nama_lengkap', 'username', 'role', 'kelas'] 
        });
        
        if (!user) return res.status(404).json({ msg: "User tidak ditemukan" });
        
        res.json(user);
    } catch (error) {
        res.status(500).json({ msg: "Terjadi kesalahan" });
    }
};

// 4. GANTI PASSWORD (VERSI BULLETPROOF)
const changePassword = async (req, res) => {
    try {
        // 1. Tangkap inputan dengan cerdas (jaga-jaga kalau frontend pakai nama variabel lain)
        const currentPassword = req.body.currentPassword || req.body.password_lama || req.body.oldPassword;
        const newPassword = req.body.newPassword || req.body.password_baru;
        const userId = req.user.userId;

        // 2. Cegah Bcrypt Crash: Validasi input tidak boleh kosong!
        if (!currentPassword) {
            return res.status(400).json({ msg: "Password lama tidak boleh kosong!" });
        }
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ msg: "Password baru minimal 6 karakter!" });
        }

        // 3. Paksa Sequelize untuk membaca kolom 'password' 
        // (Pakai raw: true atau scope(null) untuk mengatasi hidden column)
        const user = await User.findByPk(userId, { 
            attributes: { include: ['password'] } 
        });

        if (!user) return res.status(404).json({ msg: "User tidak ditemukan" });
        
        // Proteksi ganda untuk memastikan database benar-benar mengembalikan password
        if (!user.password) {
            return res.status(500).json({ msg: "Sistem gagal membaca password dari database." });
        }

        // 4. Proses Komparasi (Sekarang dijamin AMAN dari undefined)
        const match = await bcrypt.compare(currentPassword, user.password);
        if (!match) return res.status(400).json({ msg: "Password lama salah!" });

        // 5. Hash Password Baru & Simpan
        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashPassword;
        await user.save();

        res.json({ msg: "Password berhasil diganti! Silakan login ulang." });

    } catch (error) {
        console.error("[ERROR CHANGE PASSWORD]", error);
        // BUG #12 FIX: Jangan leak error detail ke client
        res.status(500).json({ msg: "Gagal mengganti password. Silakan coba lagi." });
    }
};

module.exports = { register, login, getMe, changePassword };