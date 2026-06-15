// middleware/license.js

const jwt = require('jsonwebtoken');
const Setting = require('../models/Setting');

const dotenv = require('dotenv');
dotenv.config();
const LIC_KEY = process.env['LICENSE_SECRET'] || 'cWcW[1=%8v]zygTmC';

let licenseCache = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 1000;

const getLicenseStatus = async () => {
    const now = Date.now();
    if (licenseCache && (now - cacheTime) < CACHE_TTL) return licenseCache;
    try {
        const setting = await Setting.findOne();
        if (!setting || !setting.license_key || setting.license_key === '') {
            licenseCache = { valid: false, status: 'none', message: 'Belum ada lisensi' };
            cacheTime = now;
            return licenseCache;
        }
        const decoded = jwt.verify(setting.license_key, LIC_KEY);
        const expiresAt = new Date(decoded.exp * 1000);
        const isExpired = expiresAt < new Date();
        if (isExpired) {
            await setting.update({ license_status: 'expired' });
            licenseCache = { valid: false, status: 'expired', message: 'Lisensi expired', sekolah: decoded.sekolah };
        } else {
            await setting.update({
                license_status: 'active', license_expires_at: expiresAt,
                license_sekolah: decoded.sekolah, license_max_siswa: decoded.max_siswa,
                license_fitur: decoded.fitur
            });
            licenseCache = {
                valid: true, status: 'active', sekolah: decoded.sekolah,
                max_siswa: decoded.max_siswa, fitur: decoded.fitur,
                expires_at: expiresAt,
                days_left: Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24))
            };
        }
        cacheTime = now;
        return licenseCache;
    } catch (err) {
        const setting = await Setting.findOne();
        const newStatus = err.name === 'TokenExpiredError' ? 'expired' : 'invalid';
        if (setting) await setting.update({ license_status: newStatus });
        licenseCache = { valid: false, status: newStatus, message: 'Lisensi tidak valid' };
        cacheTime = now;
        return licenseCache;
    }
};

const requireLicense = async (req, res, next) => {
    const license = await getLicenseStatus();
    if (!license.valid) {
        return res.status(403).json({ msg: 'Lisensi tidak aktif. Masukkan lisensi di Pengaturan.', license_status: license.status });
    }
    req.license = license;
    next();
};

const requirePremium = async (req, res, next) => {
    const license = await getLicenseStatus();
    if (!license.valid) return res.status(403).json({ msg: 'Lisensi tidak aktif.' });
    if (license.fitur !== 'premium') return res.status(403).json({ msg: 'Fitur khusus lisensi Premium.' });
    req.license = license;
    next();
};

const clearLicenseCache = () => { licenseCache = null; cacheTime = 0; };

const getPublicLicenseStatus = async (req, res) => {
    try {
        const license = await getLicenseStatus();
        res.json({
            valid: license.valid, status: license.status,
            sekolah: license.sekolah || '-', fitur: license.fitur || '-',
            expires_at: license.expires_at, days_left: license.days_left || 0,
            max_siswa: license.max_siswa || 0, message: license.message
        });
    } catch (err) {
        res.status(500).json({ msg: 'Gagal cek lisensi' });
    }
};

module.exports = { requireLicense, requirePremium, clearLicenseCache, getLicenseStatus, getPublicLicenseStatus };
