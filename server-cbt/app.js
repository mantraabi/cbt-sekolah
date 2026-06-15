// File: app.js (VERSI OPTIMASI V2 UNTUK CLUSTER MODE + WEBSOCKETS)
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fileUpload = require('express-fileupload'); 
const path = require('path');

// --- IMPORT SOCKET.IO & HTTP ---
const http = require('http');
const { Server } = require('socket.io');

// --- IMPORT SECURITY PACKAGES ---
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

// --- 1. KONFIGURASI ---
dotenv.config();

// BUG #3 FIX: Validasi JWT_SECRET wajib ada sebelum server jalan
if (!process.env.JWT_SECRET) {
    console.error('❌ FATAL: JWT_SECRET tidak ditemukan di .env! Server tidak bisa jalan.');
    process.exit(1);
}

const app = express();

// =========================================================
// CORS ORIGINS (harus di atas Socket.IO & Express middleware)
// =========================================================
const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:5173']; // Default: Vite dev server

// =========================================================
// OPTIMASI 1: MEMBACA IP ASLI DARI NGINX
// =========================================================
app.set('trust proxy', 1);

// =========================================================
// SETUP WEBSOCKETS (SOCKET.IO)
// =========================================================
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }
});

// Simpan io ke dalam app agar bisa dipanggil dari Controller mana pun
app.set('io', io);

io.on('connection', (socket) => {
    // BUG #18 FIX: Verifikasi token saat connect Socket.IO
    const token = socket.handshake.auth?.token;
    if (!token) {
        console.log('[SOCKET] Connection rejected: no token');
        socket.disconnect();
        return;
    }
    try {
        const jwt = require('jsonwebtoken');
        jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        console.log('[SOCKET] Connection rejected: invalid token');
        socket.disconnect();
        return;
    }

    // Saat Admin membuka halaman monitoring, mereka akan dimasukkan ke "Kamar" (Room) ujian tersebut
    socket.on('join_monitoring', (ujian_id) => {
        socket.join(`monitor_${ujian_id}`);
    });

    // Saat Admin pindah halaman, keluarkan dari Kamar
    socket.on('leave_monitoring', (ujian_id) => {
        socket.leave(`monitor_${ujian_id}`);
    });
});

// --- IMPORT DATABASE ---
const db = require('./config/database');

// --- 2. IMPORT MODELS ---
const User = require('./models/User');
const MataPelajaran = require('./models/MataPelajaran');
const BankSoal = require('./models/BankSoal');
const Ujian = require('./models/Ujian');
const Nilai = require('./models/Nilai');
const Setting = require('./models/Setting'); 

// --- 3. IMPORT ROUTES ---
const authRoutes = require('./routes/authRoutes');
const examRoutes = require('./routes/examRoutes');
const studentRoutes = require('./routes/studentRoutes');
const bankSoalRoutes = require('./routes/bankSoalRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const settingRoutes = require('./routes/settingRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const userRoutes = require('./routes/userRoutes');

// =========================================================
// 4. SECURITY & MIDDLEWARE
// =========================================================

// #6 Compression — gzip response untuk transfer lebih cepat
app.use(compression({
    threshold: 1024, // Hanya compress response > 1KB
    level: 6         // Balance antara speed dan compression ratio
}));

app.use(cors({
    origin: function (origin, callback) {
        // Izinkan request tanpa origin (Postman, server-to-server, curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('CORS not allowed: ' + origin));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(helmet({ crossOriginResourcePolicy: false }));

app.use(fileUpload({
    createParentPath: false, // BUG #11 FIX: Matikan untuk cegah path traversal
    limits: { fileSize: 10 * 1024 * 1024 }, 
    abortOnLimit: true
}));

app.use(express.json());

// =========================================================
// OPTIMASI 2: PELONGGARAN RATE LIMIT UNTUK UJIAN MASSAL
// =========================================================
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 3000, 
    standardHeaders: true,
    legacyHeaders: false,
    message: "Terlalu banyak request, silakan coba lagi nanti."
});
app.use(limiter);

app.use(express.static(path.join(process.cwd(), 'public')));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// =========================================================
// 5. DEFINISI RELASI DATABASE
// =========================================================
MataPelajaran.hasMany(BankSoal, { foreignKey: 'mapel_id' });
BankSoal.belongsTo(MataPelajaran, { foreignKey: 'mapel_id' });

MataPelajaran.hasMany(Ujian, { foreignKey: 'mapel_id' });
Ujian.belongsTo(MataPelajaran, { foreignKey: 'mapel_id' });

User.hasMany(Nilai, { foreignKey: 'siswa_id' });
Nilai.belongsTo(User, { foreignKey: 'siswa_id' });

Ujian.hasMany(Nilai, { foreignKey: 'ujian_id' });
Nilai.belongsTo(Ujian, { foreignKey: 'ujian_id' });

// =========================================================
// 6. ROUTES
// =========================================================
app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/bank-soal', bankSoalRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/users', userRoutes);

app.use('/api/system', require('./routes/systemRoutes'));
app.use('/api/license', require('./routes/licenseRoutes'));

// Public: status lisensi (tanpa auth, untuk halaman login & monitoring)
const { getPublicLicenseStatus } = require('./middleware/license');
app.get('/api/license/public', getPublicLicenseStatus);

app.get('/', (req, res) => {
    res.send('Server CBT Berjalan...');
});

// --- 14. ERROR TRACKING ---
const { errorHandler, getErrorStats } = require('./middleware/errorTracker');

// Health check endpoint (untuk monitoring uptime)
app.get('/api/health', async (req, res) => {
    try {
        await db.authenticate();
        const errorStats = getErrorStats();
        res.json({ 
            status: 'ok', 
            database: 'connected',
            uptime: Math.floor(process.uptime()),
            timestamp: new Date().toISOString(),
            errors: {
                total: errorStats.total,
                lastError: errorStats.lastError,
                lastErrorTime: errorStats.lastErrorTime,
            }
        });
    } catch (err) {
        res.status(503).json({ 
            status: 'error', 
            database: 'disconnected',
            msg: err.message 
        });
    }
});

// #14 Error handler — structured logging ke file
app.use(errorHandler);

// =========================================================
// 7. SERVER START
// =========================================================
// Production: sync() tanpa alter (jalankan node migrate.js untuk update tabel)
// Development: sync() tanpa alter juga (alter:true bisa buat index >64 di MySQL)
// Jalankan `node migrate.js` manual jika ada perubahan schema
db.sync() 
    .then(() => {
        console.log('✅ Database Connected & Synced!');
        const PORT = process.env.PORT || 5000;
        server.listen(PORT, () => {
            console.log(`🚀 Server V2 running at http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('❌ Gagal koneksi database:', err);
    });

// =========================================================
// 8. GRACEFUL SHUTDOWN
// =========================================================
const gracefulShutdown = async (signal) => {
    console.log(`\n⚠️  ${signal} diterima. Shutting down gracefully...`);
    
    // 1. Tutup Socket.IO connections
    io.close(() => {
        console.log('🔌 Socket.IO connections closed');
    });
    
    // 2. Tutup HTTP server
    server.close(async () => {
        console.log('🛑 HTTP server closed');
        
        // 3. Tutup database connection
        try {
            await db.close();
            console.log('🗄️  Database connection closed');
        } catch (e) {
            console.error('Error closing DB:', e.message);
        }
        
        process.exit(0);
    });
    
    // Force exit setelah 10 detik kalau belum selesai
    setTimeout(() => {
        console.error('⚠️  Force exit after timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled Rejection:', reason);
});