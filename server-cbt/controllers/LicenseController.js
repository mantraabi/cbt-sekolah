// controllers/LicenseController.js
const Setting = require("../models/Setting");
const { createLicense, verifyShortKey, getLicenseStatus, clearLicenseCache } = require("../middleware/shortLicense");
const { getPackageInfo } = require("../middleware/licenseFeatures");

// 1. Aktifkan lisensi (user input short key)
const activateLicense = async (req, res) => {
    try {
        const { license_key } = req.body;
        if (!license_key || license_key.trim() === "") {
            return res.status(400).json({ msg: "License key tidak boleh kosong!" });
        }

        const key = license_key.trim().toUpperCase();
        const result = await verifyShortKey(key);

        if (!result.valid) {
            return res.status(400).json({ msg: result.message });
        }

        res.json({
            msg: "Lisensi berhasil diaktifkan!",
            license: {
                sekolah: result.sekolah,
                fitur: result.fitur,
                max_siswa: result.max_siswa,
                expires_at: result.expires_at,
                days_left: result.days_left
            }
        });
    } catch (error) {
        console.error("[LICENSE ERROR]", error);
        res.status(500).json({ msg: "Gagal mengaktifkan lisensi." });
    }
};

// 2. Cek status lisensi
const getLicenseInfo = async (req, res) => {
    try {
        const license = await getLicenseStatus();
        res.json(license);
    } catch (error) {
        res.status(500).json({ msg: "Gagal cek lisensi." });
    }
};

// 3. Hapus lisensi
const deactivateLicense = async (req, res) => {
    try {
        const setting = await Setting.findOne();
        if (!setting) return res.status(404).json({ msg: "Setting tidak ditemukan" });
        await setting.update({
            license_key: null, license_status: "none", license_expires_at: null,
            license_sekolah: null, license_max_siswa: 200, license_fitur: "standard"
        });
        clearLicenseCache();
        res.json({ msg: "Lisensi dihapus." });
    } catch (error) {
        res.status(500).json({ msg: "Gagal menghapus lisensi." });
    }
};

// 4. Info paket
const getPackageFeatures = async (req, res) => {
    try {
        const setting = await Setting.findOne();
        const fitur = (setting && setting.license_fitur) ? setting.license_fitur : "standard";
        const info = getPackageInfo(fitur);
        res.json(info);
    } catch (error) {
        res.status(500).json({ msg: "Gagal ambil info paket." });
    }
};

module.exports = { activateLicense, getLicenseInfo, deactivateLicense, getPackageFeatures };
