// routes/examRoutes.js

const express = require('express');
const rateLimit = require('express-rate-limit');
const { 
    getAllUjian, createUjian, deleteUjian, refreshToken, getExamsForStudent,
    startUjian, submitUjian, getExamResults, getExamHistory, getStudentResultDetail,
    saveKoreksi, exportNilai, resetUjianSiswa, getExamStatus, logViolation,
    getEssayCandidates, getStudentEssays, saveEssayScore, forceAkhiriUjian,
    updateProgress, updateUjian, forceSubmitSiswa, getItemAnalysis
} = require('../controllers/UjianController');

// IMPORT MIDDLEWARE BARU: pengawasOrAdmin
const { verifyToken, adminOnly, pengawasOrAdmin } = require('../middleware/authMiddleware');
const { validate, schemas } = require('../middleware/validation');
const auditLog = require('../middleware/auditLog');
const { requireLicense } = require('../middleware/license');
const { checkFitur } = require('../middleware/licenseFeatures');

const router = express.Router();

router.use(verifyToken);

// #11 FIX: Rate limit khusus exam submit — max 5 per menit per user
const submitLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    // Gunakan userId sebagai key (bukan IP) — lebih akurat untuk CBT
    validate: { keyGeneratorIpFallback: false },
    keyGenerator: (req) => `user_${req.user?.userId || 'anon'}`,
    message: { msg: "Terlalu banyak percobaan submit. Tunggu 1 menit." }
});

// Rate limit untuk start exam — cegah brute force token
const startExamLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    validate: { keyGeneratorIpFallback: false },
    keyGenerator: (req) => `user_${req.user?.userId || 'anon'}`,
    message: { msg: "Terlalu banyak percobaan. Tunggu 1 menit." }
});

// --- 1. ROUTE STATIS & SPESIFIK ---
router.get('/:id/candidates', adminOnly, requireLicense, checkFitur('koreksi_esai'), getEssayCandidates); 
router.get('/correction/:nilai_id', adminOnly, requireLicense, checkFitur('koreksi_esai'), getStudentEssays); 
router.post('/correction/save', adminOnly, requireLicense, checkFitur('koreksi_esai'), saveEssayScore); 

// a. List Ujian Siswa
router.get('/student', getExamsForStudent); 

// PENGAWAS BISA RESET SISWA:
router.delete('/reset/:nilaiId', pengawasOrAdmin, resetUjianSiswa); 

// b. Action Siswa Saat Ujian
router.post('/submit', requireLicense, submitLimiter, validate(schemas.submitExam), submitUjian);
router.post('/update-progress', updateProgress); 
router.post('/violation', logViolation);

// PENGAWAS BISA PAKSA SELESAI:
router.post('/force-submit/:nilaiId', pengawasOrAdmin, forceSubmitSiswa);

// c. History & Admin (Root)
router.get('/history', adminOnly, getExamHistory); 

// PENGAWAS BISA MELIHAT JADWAL UJIAN:
router.get('/', pengawasOrAdmin, getAllUjian); 
router.post('/', adminOnly, createUjian); // Buat jadwal tetap adminOnly

// --- 2. ROUTE DINAMIS / PARAMS ---
router.post('/:id/start', requireLicense, startExamLimiter, startUjian);
router.delete('/:id', adminOnly, auditLog('DELETE_EXAM'), deleteUjian);
router.put('/:id/refresh-token', adminOnly, auditLog('REFRESH_TOKEN'), refreshToken);
router.put('/:id', adminOnly, updateUjian);
router.get('/:id/results', adminOnly, getExamResults);
router.post('/:id/force-close', adminOnly, forceAkhiriUjian); 
router.get('/:id/export', adminOnly, requireLicense, checkFitur('export_excel'), exportNilai);
router.get('/koreksi/:nilaiId', adminOnly, getStudentResultDetail);
router.post('/koreksi/:nilaiId', adminOnly, saveKoreksi);

// PENGAWAS BISA MEMBUKA HALAMAN MONITORING:
router.get('/:id/monitoring', pengawasOrAdmin, requireLicense, checkFitur('monitoring'), getExamStatus);
router.get('/:id/analysis', adminOnly, requireLicense, checkFitur('item_analysis'), getItemAnalysis);

module.exports = router;