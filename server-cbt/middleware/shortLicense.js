// middleware/shortLicense.js
// Sistem lisensi dengan short key (CBT-XXXX-XXXX-XXXX)
// Key disimpan di database, verifikasi via lookup

const crypto = require("crypto");
const Setting = require("../models/Setting");
const { getFeatures } = require("./licenseFeatures");

// Generate short license key
function generateShortKey() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I,O,0,1 (confusing)
    const segments = [];
    for (let s = 0; s < 3; s++) {
        let seg = "";
        for (let i = 0; i < 4; i++) {
            seg += chars[crypto.randomBytes(1)[0] % chars.length];
        }
        segments.push(seg);
    }
    return "CBT-" + segments.join("-");
}

// Create license with short key
async function createLicense({ sekolah, durasi, maxSiswa, fitur }) {
    const key = generateShortKey();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (durasi * 86400000));

    // Store in settings (or separate license table)
    const setting = await Setting.findOne();
    if (!setting) throw new Error("Setting not found");

    await setting.update({
        license_key: key,
        license_status: "active",
        license_expires_at: expiresAt,
        license_sekolah: sekolah,
        license_max_siswa: maxSiswa,
        license_fitur: fitur
    });

    return {
        key,
        sekolah,
        fitur,
        max_siswa: maxSiswa,
        expires_at: expiresAt,
        days_left: Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24))
    };
}

// Verify short license key
async function verifyShortKey(key) {
    const setting = await Setting.findOne();
    if (!setting || setting.license_key !== key) {
        return { valid: false, status: "invalid", message: "Key tidak ditemukan" };
    }

    const now = new Date();
    const expiresAt = setting.license_expires_at ? new Date(setting.license_expires_at) : null;

    if (expiresAt && expiresAt < now) {
        await setting.update({ license_status: "expired" });
        return { valid: false, status: "expired", message: "Lisensi expired" };
    }

    return {
        valid: true,
        status: "active",
        sekolah: setting.license_sekolah,
        fitur: setting.license_fitur,
        max_siswa: setting.license_max_siswa,
        expires_at: expiresAt,
        days_left: expiresAt ? Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)) : 0
    };
}

// Get current license status (for middleware)
async function getLicenseStatus() {
    const setting = await Setting.findOne();
    if (!setting || !setting.license_key || setting.license_key === "") {
        return { valid: false, status: "none", message: "Belum ada lisensi" };
    }

    const now = new Date();
    const expiresAt = setting.license_expires_at ? new Date(setting.license_expires_at) : null;

    if (expiresAt && expiresAt < now) {
        return { valid: false, status: "expired", message: "Lisensi expired", sekolah: setting.license_sekolah };
    }

    return {
        valid: true,
        status: "active",
        sekolah: setting.license_sekolah,
        fitur: setting.license_fitur,
        max_siswa: setting.license_max_siswa,
        expires_at: expiresAt,
        days_left: expiresAt ? Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)) : 0
    };
}

// Middleware: require active license
const requireLicense = async (req, res, next) => {
    const license = await getLicenseStatus();
    if (!license.valid) {
        return res.status(403).json({ msg: "Lisensi tidak aktif.", license_status: license.status });
    }
    req.license = license;
    next();
};

// Middleware: require specific feature
const requirePremium = async (req, res, next) => {
    const license = await getLicenseStatus();
    if (!license.valid) return res.status(403).json({ msg: "Lisensi tidak aktif." });
    if (license.fitur !== "premium") return res.status(403).json({ msg: "Fitur khusus Premium." });
    req.license = license;
    next();
};

const clearLicenseCache = () => {}; // No cache needed, always DB lookup

const getPublicLicenseStatus = async (req, res) => {
    try {
        const license = await getLicenseStatus();
        res.json({
            valid: license.valid, status: license.status,
            sekolah: license.sekolah || "-",
            fitur: license.fitur || "-",
            expires_at: license.expires_at,
            days_left: license.days_left || 0,
            max_siswa: license.max_siswa || 0,
            message: license.message
        });
    } catch (err) {
        res.status(500).json({ msg: "Gagal cek lisensi" });
    }
};

module.exports = { createLicense, verifyShortKey, getLicenseStatus, requireLicense, requirePremium, clearLicenseCache, getPublicLicenseStatus, generateShortKey };
