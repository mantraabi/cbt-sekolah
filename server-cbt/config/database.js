const { Sequelize } = require('sequelize');
require('dotenv').config();

const db = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false, 
    timezone: '+07:00',
    // --- OPTIMASI SUPER CBT ---
    pool: {
        max: 40,        // Maksimal 40 koneksi per Core CPU
        min: 5,         // Sediakan 5 koneksi standby
        acquire: 60000, // Beri waktu toleransi antre hingga 60 detik agar tidak mudah error
        idle: 10000     // Putus koneksi yang nganggur 10 detik agar RAM 4GB kamu tetap lega
    }
});

module.exports = db;
