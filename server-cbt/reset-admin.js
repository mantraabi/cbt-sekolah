// reset-admin.js — Jalankan: node reset-admin.js
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const db = require('./config/database');

(async () => {
    try {
        await db.authenticate();
        console.log('✅ Database connected');

        const admin = await User.findOne({ where: { role: 'admin' } });
        if (!admin) {
            console.log('❌ Tidak ada user admin ditemukan');
            process.exit(1);
        }

        const newPw = 'admin123';
        const salt = await bcrypt.genSalt(10);
        admin.password = await bcrypt.hash(newPw, salt);
        await admin.save();

        console.log(`✅ Password admin "${admin.username}" di-reset ke: ${newPw}`);
        console.log('⚠️  Segera ganti password setelah login!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
})();
