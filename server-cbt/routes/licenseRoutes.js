// routes/licenseRoutes.js
const express = require('express');
const { activateLicense, getLicenseInfo, deactivateLicense, getPackageFeatures } = require('../controllers/LicenseController');
const { verifyToken, adminOnly } = require('../middleware/authMiddleware');
const auditLog = require('../middleware/auditLog');

const router = express.Router();

// Admin: aktivasi, cek, hapus lisensi
router.post('/activate', verifyToken, adminOnly, auditLog('ACTIVATE_LICENSE'), activateLicense);
router.get('/status', verifyToken, adminOnly, getLicenseInfo);
router.get('/features', verifyToken, adminOnly, getPackageFeatures);
router.delete('/deactivate', verifyToken, adminOnly, auditLog('DEACTIVATE_LICENSE'), deactivateLicense);

module.exports = router;
