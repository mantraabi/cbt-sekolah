const { DataTypes } = require('sequelize');
const db = require('../config/database');

const Setting = db.define('settings', {
    
    nama_sekolah: { type: DataTypes.STRING },
    alamat_sekolah: { type: DataTypes.TEXT },
    website: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING },
    logo: { type: DataTypes.STRING },
    kepala_sekolah: { type: DataTypes.STRING },
    nip: { type: DataTypes.STRING },
    list_pelanggaran: {
        type: DataTypes.TEXT,
        defaultValue: 'Buka Tab Baru,Keluar Fullscreen,Kamera Tertutup' // Nilai default
    },
    max_pelanggaran: {
        type: DataTypes.INTEGER,
        defaultValue: 5 // Defaultnya 5 kali pelanggaran
    },
    // --- LICENSE SYSTEM ---
    license_key: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null
    },
    license_status: {
        type: DataTypes.STRING, // 'active', 'expired', 'invalid', 'none'
        defaultValue: 'none'
    },
    license_expires_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    license_sekolah: {
        type: DataTypes.STRING,
        allowNull: true
    },
    license_max_siswa: {
        type: DataTypes.INTEGER,
        defaultValue: 200
    },
    license_fitur: {
        type: DataTypes.STRING, // 'standard', 'premium', 'trial'
        defaultValue: 'standard'
    }

}, { freezeTableName: true });

module.exports = Setting;