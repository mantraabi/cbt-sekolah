// routes/subjectRoutes.js

const express = require('express');
const { getAllSubjects, createSubject, deleteSubject } = require('../controllers/SubjectController');

// 1. TAMBAHKAN pengawasOrAdmin DI SINI
const { verifyToken, adminOnly, pengawasOrAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(verifyToken);

// 2. GET boleh diakses Pengawas (untuk dropdown Jadwal Ujian)
router.get('/', pengawasOrAdmin, getAllSubjects);

// 3. Sisanya (Tambah & Hapus) tetap Kunci Rapat untuk Admin
router.post('/', adminOnly, createSubject);
router.delete('/:id', adminOnly, deleteSubject);

module.exports = router;