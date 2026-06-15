// routes/bankSoalRoutes.js

const express = require('express');
const { 
    createBankSoal, 
    getAllBankSoal, 
    getBankSoalById, 
    deleteBankSoal,
    importSoal,
    updateBankSoal,
    bulkDeleteBankSoal,
    exportSoal
} = require('../controllers/BankSoalController'); 
const { verifyToken, adminOnly } = require('../middleware/authMiddleware');
const { requireLicense } = require('../middleware/license');
const { checkFitur, checkTipeSoal } = require('../middleware/licenseFeatures');

const router = express.Router();

// Middleware: Semua route bank soal butuh Login & Admin
router.use(verifyToken);
router.use(adminOnly);

// ==========================================
// 1. RUTE STATIS (WAJIB DI ATAS)
// ==========================================
router.get('/', getAllBankSoal);                 // Ambil Semua
router.post('/', requireLicense, checkTipeSoal, createBankSoal);                // Tambah Baru
router.post('/import', requireLicense, checkFitur('import_soal'), importSoal);              // Import Excel
router.post('/bulk-delete', bulkDeleteBankSoal); // Hapus Massal
router.get('/export', requireLicense, checkFitur('export_excel'), exportSoal);               // Export Excel

// ==========================================
// 2. RUTE DINAMIS (WAJIB DI BAWAH)
// ==========================================
router.get('/:id', getBankSoalById);             // Ambil Satu (Detail)
router.put('/:id', requireLicense, checkTipeSoal, updateBankSoal);              // Edit Soal
router.delete('/:id', deleteBankSoal);           // Hapus Soal

module.exports = router;