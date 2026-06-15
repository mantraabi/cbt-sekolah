const express = require('express');
const { getStudents, createStudent, updateStudent, deleteStudent, importStudents, getStudentClasses, bulkDeleteStudents } = require('../controllers/StudentController');
const { verifyToken, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// Semua route di sini butuh Login & Admin
router.use(verifyToken);
router.use(adminOnly);

router.get('/', getStudents);
router.get('/classes', getStudentClasses);
router.post('/', createStudent);
router.put('/:id', updateStudent);
router.post('/bulk-delete', bulkDeleteStudents);
router.delete('/:id', deleteStudent);
router.post('/import', importStudents);

module.exports = router;