// routes/dashboardRoutes.js

const express = require('express');
const { getDashboardStats } = require('../controllers/DashboardController');

// 1. TAMBAHKAN pengawasOrAdmin DI SINI
const { verifyToken, adminOnly, pengawasOrAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// 2. GANTI adminOnly MENJADI pengawasOrAdmin
router.get('/stats', verifyToken, pengawasOrAdmin, getDashboardStats);

module.exports = router;