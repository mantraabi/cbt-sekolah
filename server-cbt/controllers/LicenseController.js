// controllers/LicenseController.js
const jwt = require('jsonwebtoken');
const Setting = require('../models/Setting');
const { clearLicenseCache } = require('../middleware/license');

const dotenv = require('dotenv');
dotenv.config();
const LIC_KEY = process.env['LICENSE_SECRET'] || 'cWcW[1=%8v]zygTmC';

const activateLicense = async (req, res) => {
    try {
        const { license_key } = req.body;
        if (!license_key || license_key.trim() === '') {
            return res.status(400).json({ msg: 'License key tidak boleh kosong!' });
        }
        let decoded;
        try {
            decoded = jwt.verify(license_key.trim(), LIC_KEY);
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(400).json({ msg: 'License key sudah expired!' });
            }
            return res.status(400).json({ msg: 'License key tidak valid!' });
        }
        let setting = await Setting.findOne();
        if (!setting) setting = await Setting.create({});
        const expiresAt = new Date(decoded.exp * 1000);
        await setting.update({
            license_key: license_key.trim(),
            license_status: 'active',
            license_expires_at: expiresAt,
            license_sekolah: decoded.sekolah,
            license_max_siswa: decoded.max_siswa,
            license_fitur: decoded.fitur
        });
        clearLicenseCache();
        res.json({
            msg: 'Lisensi berhasil diaktifkan!',
            license: {
                sekolah: decoded.sekolah, fitur: decoded.fitur, max_siswa: decoded.max_siswa,
                expires_at: expiresAt,
                days_left: Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24))
            }
        });
    } catch (error) {
        console.error('[LICENSE ERROR]', error);
        res.status(500).json({ msg: 'Gagal mengaktifkan lisensi.' });
    }
};

const getLicenseInfo = async (req, res) => {
    try {
        const setting = await Setting.findOne();
        if (!setting || !setting.license_key) {
            return res.json({ status: 'none', message: 'Belum ada lisensi.' });
        }
        try {
            const decoded = jwt.verify(setting.license_key, LIC_KEY);
            const expiresAt = new Date(decoded.exp * 1000);
            const isExpired = expiresAt < new Date();
            const daysLeft = Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24));
            res.json({
                status: isExpired ? 'expired' : 'active',
                sekolah: decoded.sekolah, fitur: decoded.fitur, max_siswa: decoded.max_siswa,
                activated_at: new Date(decoded.iat * 1000), expires_at: expiresAt,
                days_left: isExpired ? 0 : daysLeft,
                message: isExpired ? 'Expired' : 'Aktif - ' + daysLeft + ' hari tersisa'
            });
        } catch (err) {
            res.json({ status: 'invalid', message: 'License key tidak valid.' });
        }
    } catch (error) {
        res.status(500).json({ msg: 'Gagal cek lisensi.' });
    }
};

const deactivateLicense = async (req, res) => {
    try {
        const setting = await Setting.findOne();
        if (!setting) return res.status(404).json({ msg: 'Setting tidak ditemukan' });
        await setting.update({
            license_key: null, license_status: 'none', license_expires_at: null,
            license_sekolah: null, license_max_siswa: 200, license_fitur: 'standard'
        });
        clearLicenseCache();
        res.json({ msg: 'Lisensi dihapus.' });
    } catch (error) {
        res.status(500).json({ msg: 'Gagal menghapus lisensi.' });
    }
};

const { getPackageInfo } = require('../middleware/licenseFeatures');

const getPackageFeatures = async (req, res) => {
    try {
        const setting = await Setting.findOne();
        const fitur = (setting && setting.license_fitur) ? setting.license_fitur : 'standard';
        const info = getPackageInfo(fitur);
        res.json(info);
    } catch (error) {
        res.status(500).json({ msg: 'Gagal ambil info paket.' });
    }
};

module.exports = { activateLicense, getLicenseInfo, deactivateLicense, getPackageFeatures };
