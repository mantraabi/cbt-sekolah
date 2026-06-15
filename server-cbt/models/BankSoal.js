const { DataTypes } = require('sequelize');
const db = require('../config/database');

const BankSoal = db.define('bank_soal', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    pertanyaan: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    tipe_soal: {
        type: DataTypes.ENUM('pg', 'esai', 'menjodohkan', 'pg_kompleks'),
        allowNull: false
    },
    mapel_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    bobot: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    gambar: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // --- OPSI & KUNCI JAWABAN (LENGKAP) ---
    opsi_jawaban: {
        type: DataTypes.JSON, // Untuk PG & PG Kompleks
        allowNull: true
    },
    kunci_pg: {
        type: DataTypes.STRING, // Kunci PG Biasa (A, B, C...)
        allowNull: true
    },
    kunci_pg_kompleks: {
        type: DataTypes.JSON, // Array kunci (['A', 'C'])
        allowNull: true
    },
    kunci_esai: {
        type: DataTypes.TEXT, // Kunci Esai
        allowNull: true
    },
    menjodohkan_kiri: {
        type: DataTypes.JSON, // Array Premis Kiri
        allowNull: true
    },
    menjodohkan_kanan: {
        type: DataTypes.JSON, // Array Jawaban Kanan
        allowNull: true
    }
}, {
    freezeTableName: true
});

module.exports = BankSoal;