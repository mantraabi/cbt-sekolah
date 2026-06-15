// migrate.js — Jalankan: node migrate.js
// Untuk production: buat/update tabel tanpa alter:true di startup
// Lebih cepat dan aman daripada db.sync({ alter: true })

const db = require('./config/database');

// Import semua model (mendaftarkan ke Sequelize)
require('./models/User');
require('./models/MataPelajaran');
require('./models/BankSoal');
require('./models/Ujian');
require('./models/Nilai');
require('./models/Setting');

(async () => {
    try {
        console.log('🔄 Menjalankan migrasi database...');
        
        // sync({ alter: true }) — buat tabel yang belum ada + update kolom
        // Hanya dijalankan manual, BUKAN setiap startup
        await db.sync({ alter: true });
        
        console.log('✅ Migrasi selesai!');
        console.log('   Tabel yang sudah di-sync:');
        const [tables] = await db.query("SHOW TABLES");
        tables.forEach(t => {
            const tableName = Object.values(t)[0];
            console.log(`   - ${tableName}`);
        });
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Migrasi gagal:', err.message);
        process.exit(1);
    }
})();
