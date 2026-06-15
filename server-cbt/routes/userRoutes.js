// File: routes/userRoutes.js
const express = require('express');
const { 
    getAllUsers, 
    createUser, 
    updateUser, 
    deleteUser 
} = require('../controllers/UserController');

// Ambil gembok keamanan dari middleware
const { verifyToken, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// Pasang gembok: Harus login & Harus berstatus Admin
router.use(verifyToken, adminOnly);

// Rute CRUD
router.get('/', getAllUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;