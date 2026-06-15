// File: middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

// 1. Cek apakah user membawa Token yang valid
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    if (!token) {
        return res.status(401).json({ msg: "Akses ditolak! Token tidak ditemukan." });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ msg: "Token tidak valid atau kedaluwarsa." });
        }
        req.user = decoded; 
        next(); 
    });
};

// 2. Cek apakah user adalah Admin / Guru
const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'guru') {
        return res.status(403).json({ msg: "Akses terlarang! Khusus Admin/Guru." });
    }
    next();
};

// 3. BARU: Bisa diakses Admin, Guru, ATAU Pengawas
const pengawasOrAdmin = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'guru' && req.user.role !== 'pengawas') {
        return res.status(403).json({ msg: "Akses terlarang! Khusus Panitia Ujian." });
    }
    next();
};

module.exports = { verifyToken, adminOnly, pengawasOrAdmin };