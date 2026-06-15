const express = require('express');
const { getSetting, updateSetting,getPublicSettings } = require('../controllers/SettingController');
const { verifyToken, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/public', getPublicSettings);

router.get('/', getSetting); // Public (biar login page bisa akses logo) atau Protected terserah
router.put('/', verifyToken, adminOnly, updateSetting);

module.exports = router;