// middleware/validation.js
// Input validation dengan Joi — cegah data sampah masuk DB

const Joi = require('joi');

// Helper: wrap Joi validation sebagai Express middleware
const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        const data = req[source];
        const { error, value } = schema.validate(data, { 
            abortEarly: false,     // Kumpulkan semua error sekaligus
            stripUnknown: true,    // Hapus field yang tidak dikenal
        });
        
        if (error) {
            const messages = error.details.map(d => d.message).join(', ');
            return res.status(400).json({ msg: `Validasi gagal: ${messages}` });
        }
        
        req[source] = value; // Ganti dengan data yang sudah di-sanitize
        next();
    };
};

// ============================================
// SCHEMA DEFINITIONS
// ============================================

const schemas = {
    // AUTH
    login: Joi.object({
        username: Joi.string().min(3).max(50).required(),
        password: Joi.string().min(1).max(100).required(),
    }),

    register: Joi.object({
        username: Joi.string().min(3).max(50).alphanum().required(),
        password: Joi.string().min(6).max(100).required(),
        nama_lengkap: Joi.string().min(2).max(100).required(),
    }),

    changePassword: Joi.object({
        currentPassword: Joi.string().min(1).required(),
        newPassword: Joi.string().min(6).max(100).required(),
    }),

    // EXAM
    createUjian: Joi.object({
        nama_ujian: Joi.string().min(3).max(200).required(),
        jenis_ujian: Joi.string().valid('UH', 'UTS', 'UAS', 'TO').default('UH'),
        tgl_mulai: Joi.date().iso().required(),
        tgl_selesai: Joi.date().iso().greater(Joi.ref('tgl_mulai')).required(),
        durasi_menit: Joi.number().integer().min(1).max(600).required(),
        mapel_id: Joi.number().integer().positive().required(),
        acak_soal: Joi.boolean().default(true),
    }),

    submitExam: Joi.object({
        ujian_id: Joi.number().integer().positive().required(),
        jawaban_siswa: Joi.array().items(
            Joi.object({
                soal_id: Joi.number().integer().positive().required(),
                jawab: Joi.any().required(),
            })
        ).required(),
    }),

    // STUDENT
    createStudent: Joi.object({
        nama_lengkap: Joi.string().min(2).max(100).required(),
        username: Joi.string().min(3).max(50).required(),
        password: Joi.string().min(6).max(100).optional().allow(''),
        kelas: Joi.string().max(50).optional().allow(''),
    }),

    // BANK SOAL
    createBankSoal: Joi.object({
        pertanyaan: Joi.string().min(5).required(),
        tipe_soal: Joi.string().valid('pg', 'esai', 'menjodohkan', 'pg_kompleks').required(),
        mapel_id: Joi.number().integer().positive().required(),
        bobot: Joi.number().integer().min(1).max(100).default(1),
    }),
};

module.exports = { validate, schemas };
