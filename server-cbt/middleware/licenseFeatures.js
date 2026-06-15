// middleware/licenseFeatures.js
// Definisi fitur per paket lisensi + middleware pengecekan

const FEATURES = {
    trial: {
        label: 'Trial',
        max_siswa: 50,
        allowed_tipe_soal: ['pg'],              // Hanya PG, tidak bisa esai/menjodohkan/pg_kompleks
        fitur: {
            export_excel: false,                 // Tidak bisa export nilai ke Excel
            import_soal: false,                  // Tidak bisa import soal dari Excel
            backup_restore: false,               // Tidak bisa backup/restore database
            monitoring: false,                   // Tidak bisa monitoring real-time
            item_analysis: false,                // Tidak bisa analisis butir soal
            koreksi_esai: false,                 // Tidak bisa koreksi manual esai
            cetak_kartu: false,                  // Tidak bisa cetak kartu ujian
            bank_soal_unlimited: false,          // Max 50 soal per mapel
            max_soal_per_mapel: 50,
            rekap_nilai: true,                   // Bisa lihat rekap
            manajemen_pengguna: false,           // Tidak bisa kelola user
        }
    },
    standard: {
        label: 'Standard',
        max_siswa: null,                        // Sesuai license
        allowed_tipe_soal: ['pg', 'esai', 'pg_kompleks', 'menjodohkan'], // Semua tipe
        fitur: {
            export_excel: true,
            import_soal: true,
            backup_restore: true,
            monitoring: true,
            item_analysis: true,
            koreksi_esai: true,
            cetak_kartu: true,
            bank_soal_unlimited: true,
            max_soal_per_mapel: null,            // Unlimited
            rekap_nilai: true,
            manajemen_pengguna: true,
        }
    },
    premium: {
        label: 'Premium',
        max_siswa: null,                        // Unlimited
        allowed_tipe_soal: ['pg', 'esai', 'pg_kompleks', 'menjodohkan'],
        fitur: {
            export_excel: true,
            import_soal: true,
            backup_restore: true,
            monitoring: true,
            item_analysis: true,
            koreksi_esai: true,
            cetak_kartu: true,
            bank_soal_unlimited: true,
            max_soal_per_mapel: null,
            rekap_nilai: true,
            manajemen_pengguna: true,
        }
    }
};

// Ambil fitur berdasarkan paket lisensi
const getFeatures = (fiturName) => {
    return FEATURES[fiturName] || FEATURES.standard;
};

// Middleware: cek apakah fitur tertentu diizinkan
const checkFitur = (fiturKey) => {
    return (req, res, next) => {
        const license = req.license; // Sudah di-set oleh requireLicense
        if (!license) {
            return res.status(403).json({ msg: 'Lisensi tidak aktif.' });
        }

        const features = getFeatures(license.fitur);
        if (!features.fitur[fiturKey]) {
            return res.status(403).json({
                msg: 'Fitur "' + fiturKey + '" tidak tersedia di paket ' + features.label + '.',
                upgrade_info: 'Upgrade ke Standard atau Premium untuk mengakses fitur ini.',
                current_plan: features.label
            });
        }
        next();
    };
};

// Middleware: cek tipe soal yang diizinkan
const checkTipeSoal = (req, res, next) => {
    const license = req.license;
    if (!license) return res.status(403).json({ msg: 'Lisensi tidak aktif.' });

    const features = getFeatures(license.fitur);
    const tipe = req.body.tipe_soal;
    
    if (tipe && !features.allowed_tipe_soal.includes(tipe)) {
        return res.status(403).json({
            msg: 'Tipe soal "' + tipe + '" tidak tersedia di paket ' + features.label + '.',
            allowed: features.allowed_tipe_soal,
            current_plan: features.label
        });
    }
    next();
};

// Helper: info paket untuk response
const getPackageInfo = (fiturName) => {
    const features = getFeatures(fiturName);
    return {
        plan: features.label,
        max_siswa: features.max_siswa,
        allowed_tipe_soal: features.allowed_tipe_soal,
        features: features.fitur
    };
};

module.exports = { FEATURES, getFeatures, checkFitur, checkTipeSoal, getPackageInfo };
