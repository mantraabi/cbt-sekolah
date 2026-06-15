// models/Nilai.js

const { DataTypes } = require('sequelize');
const db = require('../config/database');

const Nilai = db.define('nilai', {
    siswa_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    ujian_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    total_benar: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    total_salah: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    nilai_akhir: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    
    // UPDATE PENTING: Default harus NULL
    // Agar saat siswa baru 'Start', statusnya belum 'Selesai'
    tgl_selesai: {
        type: DataTypes.DATE,
        allowNull: true,   
        defaultValue: null 
    },
    
    // --- FITUR BARU: MONITORING PELANGGARAN ---
    jml_pelanggaran: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },

    detail_jawaban: {
        type: DataTypes.TEXT('long'),
        allowNull: true,
        get() {
            const rawValue = this.getDataValue('detail_jawaban');
            // Tambah validasi biar gak error syntax kalau datanya kosong/null
            if (!rawValue) return [];
            try {
                return JSON.parse(rawValue);
            } catch (error) {
                return [];
            }
        },
        set(value) {
            this.setDataValue('detail_jawaban', JSON.stringify(value));
        }
    }
}, {
    freezeTableName: true
});

// BUG #9 FIX: Hapus duplikat relasi — sudah didefinisikan di app.js
// (hasMany + belongsTo di app.js sudah cukup, di sini hanya export model)

module.exports = Nilai;