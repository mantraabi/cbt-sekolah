// File: routes/authRoutes.js
const express = require('express');
const { register, login, getMe, changePassword } = require('../controllers/AuthController.js');
const { verifyToken } = require('../middleware/authMiddleware.js'); // Import Satpam
const rateLimit = require('express-rate-limit');
const { validate, schemas } = require('../middleware/validation.js');

const router = express.Router();

// BUG #5 FIX: Rate limit khusus auth — max 10 attempt per 15 menit per IP
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { msg: "Terlalu banyak percobaan login. Coba lagi dalam 15 menit." }
});

router.post('/register', authLimiter, validate(schemas.register), register);
router.post('/login', authLimiter, validate(schemas.login), login);

router.get('/me', verifyToken, getMe); 
router.post('/change-password', verifyToken, validate(schemas.changePassword), changePassword);

module.exports = router;