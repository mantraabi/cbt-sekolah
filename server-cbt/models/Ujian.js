const { DataTypes } = require('sequelize');
const db = require('../config/database');

const Ujian = db.define('ujian', {
    nama_ujian: {
        type: DataTypes.STRING,
        allowNull: false 
    },
    jenis_ujian: {
        type: DataTypes.ENUM('UH', 'UTS', 'UAS', 'TO'),
        defaultValue: 'UH'
    },
    tgl_mulai: {
        type: DataTypes.DATE, 
        allowNull: false
    },
    tgl_selesai: {
        type: DataTypes.DATE, 
        allowNull: false
    },
    durasi_menit: {
        type: DataTypes.INTEGER,
        allowNull: false 
    },
    token: {
        type: DataTypes.STRING(6), 
        allowNull: false,
        unique: true
    },
    status: {
        type: DataTypes.ENUM('draft', 'aktif', 'selesai'),
        defaultValue: 'draft'
    },
    acak_soal: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    mapel_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, { freezeTableName: true });

module.exports = Ujian;