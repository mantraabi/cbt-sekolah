// models/MataPelajaran.js

const { DataTypes } = require('sequelize');
const db = require('../config/database');

const MataPelajaran = db.define('mata_pelajaran', {
    kode_mapel: {
        type: DataTypes.STRING,
        allowNull: false
    },
    nama_mapel: {
        type: DataTypes.STRING, // Misal: Matematika Wajib
        allowNull: false
    },
    kelas: { // Misal: 10, 11, 12
        type: DataTypes.STRING, // BUG #8 FIX: Ubah dari INTEGER ke STRING agar konsisten dengan User.kelas
        allowNull: false
    },
    jurusan: { // Misal: IPA, IPS, Semua
        type: DataTypes.STRING,
        defaultValue: 'Semua'
    }
}, { freezeTableName: true });

module.exports = MataPelajaran;