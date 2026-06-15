const express = require('express');
const { backupDatabase, restoreDatabase } = require('../controllers/SystemController');
const { verifyToken, adminOnly } = require('../middleware/authMiddleware');
const auditLog = require('../middleware/auditLog');
const { requireLicense } = require('../middleware/license');
const { checkFitur } = require('../middleware/licenseFeatures');

const router = express.Router();

router.get('/backup', verifyToken, adminOnly, requireLicense, checkFitur('backup_restore'), auditLog('BACKUP_DB'), backupDatabase);
router.post('/restore', verifyToken, adminOnly, requireLicense, checkFitur('backup_restore'), auditLog('RESTORE_DB'), restoreDatabase);

module.exports = router;