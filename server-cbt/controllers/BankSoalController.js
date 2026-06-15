const { Op } = require('sequelize');
const BankSoal = require('../models/BankSoal');
const MataPelajaran = require('../models/MataPelajaran');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// 1. TAMBAH SOAL BARU
const createBankSoal = async (req, res) => {
    try {
        const { pertanyaan, tipe_soal, mapel_id, bobot } = req.body;
        let { opsi_jawaban, menjodohkan_kiri, menjodohkan_kanan, kunci_pg, kunci_esai, kunci_pg_kompleks } = req.body;

        const tryParse = (data) => { try { return (typeof data === 'string') ? JSON.parse(data) : data; } catch (e) { return null; } };

        let db_opsi = tryParse(opsi_jawaban);
        let db_kiri = tryParse(menjodohkan_kiri);
        let db_kanan = tryParse(menjodohkan_kanan);
        let db_kunci_kompleks = tryParse(kunci_pg_kompleks);

        if (tipe_soal === 'pg') { db_kunci_kompleks = null; kunci_esai = null; } 
        else if (tipe_soal === 'pg_kompleks') { kunci_pg = null; kunci_esai = null; } 
        else if (tipe_soal === 'esai') { kunci_pg = null; db_kunci_kompleks = null; }

        let namaGambar = null;
        if (req.files && req.files.gambar) {
             const file = req.files.gambar;
             const ext = path.extname(file.name);
             const fileName = file.md5 + ext;
             // FIX: Gunakan process.cwd()
             const uploadPath = path.join(process.cwd(), 'public', 'uploads', fileName);
             await file.mv(uploadPath);
             namaGambar = fileName;
        }

        const newSoal = await BankSoal.create({
            pertanyaan, tipe_soal, mapel_id, bobot: bobot || 1, gambar: namaGambar,
            opsi_jawaban: db_opsi, menjodohkan_kiri: db_kiri, menjodohkan_kanan: db_kanan,
            kunci_pg, kunci_pg_kompleks: db_kunci_kompleks, kunci_esai
        });

        res.status(201).json({ msg: "Soal berhasil dibuat", data: newSoal });
    } catch (error) {
        // BUG #12 FIX: Jangan leak error detail
        res.status(500).json({ msg: "Gagal menyimpan soal." });
    }
};

// 2. AMBIL SEMUA SOAL
const getAllBankSoal = async (req, res) => {
    try {
        const { page = 1, limit = 10, mapel_id, tipe_soal, kelas } = req.query;
        const offset = (page - 1) * limit;

        const whereClause = {};
        if (mapel_id && mapel_id !== 'ALL') whereClause.mapel_id = mapel_id;
        if (tipe_soal && tipe_soal !== 'ALL') whereClause.tipe_soal = tipe_soal;

        const includeMapel = { model: MataPelajaran, attributes: ['nama_mapel', 'kelas'], where: {} };
        if (kelas && kelas !== 'ALL') includeMapel.where.kelas = kelas;

        const { count, rows } = await BankSoal.findAndCountAll({
            where: whereClause, include: [includeMapel],
            limit: parseInt(limit), offset: parseInt(offset),
            order: [['createdAt', 'DESC']]
        });

        res.json({ totalItems: count, totalPages: Math.ceil(count / limit), currentPage: parseInt(page), data: rows });
    } catch (error) {
        res.status(500).json({ msg: "Gagal mengambil data soal." });
    }
};

// 3. AMBIL DETAIL SOAL
const getBankSoalById = async (req, res) => {
    try {
        const soal = await BankSoal.findOne({ where: { id: req.params.id }, include: [{ model: MataPelajaran, attributes: ['nama_mapel', 'kelas'] }] });
        if (!soal) return res.status(404).json({ msg: "Soal tidak ditemukan" });
        res.json(soal);
    } catch (error) {
        // BUG #12 FIX: Jangan leak error detail
        res.status(500).json({ msg: "Gagal mengambil data soal." });
    }
};

// 4. HAPUS SOAL
const deleteBankSoal = async (req, res) => {
    try {
        const soal = await BankSoal.findByPk(req.params.id);
        if (!soal) return res.status(404).json({ msg: "Soal tidak ditemukan" });

        if (soal.gambar) {
            // FIX: Gunakan process.cwd()
            const filePath = path.join(process.cwd(), 'public', 'uploads', soal.gambar);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        await soal.destroy();
        res.json({ msg: "Soal berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ msg: "Gagal menghapus soal" });
    }
};

// 5. IMPORT SOAL DARI EXCEL/CSV
const importSoal = async (req, res) => {
    try {
        if (!req.files || !req.files.file) return res.status(400).json({ msg: "File tidak ditemukan" });
        const { mapel_id } = req.body;
        if (!mapel_id) return res.status(400).json({ msg: "Mapel ID wajib!" });

        const file = req.files.file;
        const workbook = xlsx.read(file.data, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

        if (data.length < 2) return res.status(400).json({ msg: "File kosong atau format salah" });

        const soalToInsert = [];

        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row[0] || !row[1]) continue;

            const tipe = row[0].toLowerCase().trim();
            const pertanyaan = row[1];
            const rawOpsi = row[2] ? row[2].toString().split('|') : []; 
            const rawKunci = row[3] ? row[3].toString().trim() : '';
            const bobot = row[4] || 1;

            let newItem = {
                mapel_id, pertanyaan, tipe_soal: tipe, bobot,
                opsi_jawaban: null, kunci_pg: null, kunci_pg_kompleks: null,
                kunci_esai: null, menjodohkan_kiri: null, menjodohkan_kanan: null
            };

            if (tipe === 'pg') {
                const abjad = ['A','B','C','D','E'];
                newItem.opsi_jawaban = rawOpsi.map((txt, idx) => ({ kode: abjad[idx] || '?', teks: txt.trim() }));
                newItem.kunci_pg = rawKunci.toUpperCase();
            } else if (tipe === 'pg_kompleks') {
                const abjad = ['A','B','C','D','E'];
                newItem.opsi_jawaban = rawOpsi.map((txt, idx) => ({ kode: abjad[idx] || '?', teks: txt.trim() }));
                newItem.kunci_pg_kompleks = rawKunci.split(',').map(k => k.trim().toUpperCase());
            } else if (tipe === 'esai') {
                newItem.kunci_esai = rawKunci;
            } else if (tipe === 'menjodohkan') {
                const pairs = rawKunci.split('|');
                const kiriArr = []; const kananArr = [];
                pairs.forEach(pair => {
                    const [k, p] = pair.split('=');
                    if (k && p) { kiriArr.push({ teks: k.trim() }); kananArr.push({ teks: p.trim() }); }
                });
                newItem.menjodohkan_kiri = kiriArr;
                newItem.menjodohkan_kanan = kananArr;
            }
            soalToInsert.push(newItem);
        }

        if (soalToInsert.length === 0) return res.status(400).json({ msg: "Tidak ada data valid untuk diimport" });
        await BankSoal.bulkCreate(soalToInsert);
        res.json({ msg: `Berhasil import ${soalToInsert.length} soal!` });
    } catch (error) {
        // BUG #12 FIX: Jangan leak error detail
        res.status(500).json({ msg: "Gagal import soal. Periksa format file." });
    }
};

// 6. UPDATE SOAL
const updateBankSoal = async (req, res) => {
    try {
        const { id } = req.params;
        const soal = await BankSoal.findByPk(id);
        if (!soal) return res.status(404).json({ msg: "Soal tidak ditemukan" });

        let { pertanyaan, tipe_soal, mapel_id, bobot, opsi_jawaban, menjodohkan_kiri, menjodohkan_kanan, kunci_pg, kunci_esai, kunci_pg_kompleks } = req.body;
        const tryParse = (data) => { try { return (typeof data === 'string') ? JSON.parse(data) : data; } catch (e) { return null; } };

        let namaGambar = soal.gambar;
        
        if (req.files && req.files.gambar) {
            const file = req.files.gambar;
            const fileName = file.md5 + path.extname(file.name);
            const uploadPath = path.join(process.cwd(), 'public', 'uploads', fileName);
            await file.mv(uploadPath);
            namaGambar = fileName;
        }

        await soal.update({
            pertanyaan, tipe_soal, mapel_id, bobot, gambar: namaGambar,
            opsi_jawaban: tryParse(opsi_jawaban), menjodohkan_kiri: tryParse(menjodohkan_kiri), menjodohkan_kanan: tryParse(menjodohkan_kanan),
            kunci_pg: (tipe_soal === 'pg') ? kunci_pg : null,
            kunci_pg_kompleks: (tipe_soal === 'pg_kompleks') ? tryParse(kunci_pg_kompleks) : null,
            kunci_esai: (tipe_soal === 'esai') ? kunci_esai : null
        });
        res.json({ msg: "Soal berhasil diupdate" });
    } catch (error) {
        res.status(500).json({ msg: "Gagal update soal" });
    }
};

// 7. BULK DELETE
const bulkDeleteBankSoal = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ msg: "Tidak ada soal yang dipilih" });

        const soals = await BankSoal.findAll({ where: { id: { [Op.in]: ids } } });
        soals.forEach(soal => {
            if (soal.gambar) {
                // FIX: Gunakan process.cwd()
                const filePath = path.join(process.cwd(), 'public', 'uploads', soal.gambar);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
        });

        await BankSoal.destroy({ where: { id: { [Op.in]: ids } } });
        res.json({ msg: `${ids.length} soal berhasil dihapus massal` });
    } catch (error) {
        res.status(500).json({ msg: "Gagal menghapus data massal" });
    }
};

// ==========================================
// FITUR BARU: 8. EXPORT SOAL
// ==========================================
const exportSoal = async (req, res) => {
    try {
        const { mapel_id, tipe_soal, kelas } = req.query;
        const whereClause = {};
        if (mapel_id && mapel_id !== 'ALL') whereClause.mapel_id = mapel_id;
        if (tipe_soal && tipe_soal !== 'ALL') whereClause.tipe_soal = tipe_soal;

        const includeMapel = { model: MataPelajaran, attributes: ['nama_mapel', 'kelas'], where: {} };
        if (kelas && kelas !== 'ALL') includeMapel.where.kelas = kelas;

        const soals = await BankSoal.findAll({ where: whereClause, include: [includeMapel] });

        // Siapkan data untuk jadi Excel (Format disamakan dengan Template Import)
        const dataExcel = soals.map(s => {
            let opsi = '', kunci = '';
            const parseData = (d) => typeof d === 'string' ? JSON.parse(d) : d;

            if (s.tipe_soal === 'pg' || s.tipe_soal === 'pg_kompleks') {
                if(s.opsi_jawaban) opsi = parseData(s.opsi_jawaban).map(o => o.teks).join('|');
            }

            if (s.tipe_soal === 'pg') kunci = s.kunci_pg || '';
            else if (s.tipe_soal === 'pg_kompleks') {
                 if(s.kunci_pg_kompleks) kunci = parseData(s.kunci_pg_kompleks).join(',');
            }
            else if (s.tipe_soal === 'esai') kunci = s.kunci_esai || '';
            else if (s.tipe_soal === 'menjodohkan') {
                if(s.menjodohkan_kiri && s.menjodohkan_kanan) {
                    const kiri = parseData(s.menjodohkan_kiri);
                    const kanan = parseData(s.menjodohkan_kanan);
                    const pairs = [];
                    kiri.forEach((k, i) => { if(k.teks && kanan[i] && kanan[i].teks) pairs.push(`${k.teks}=${kanan[i].teks}`); });
                    kunci = pairs.join('|');
                }
            }

            return {
                "Tipe Soal": s.tipe_soal,
                "Pertanyaan": s.pertanyaan,
                "Opsi (Pisahkan dengan |)": opsi,
                "Kunci Jawaban": kunci,
                "Bobot": s.bobot,
                "Mata Pelajaran": s.mata_pelajaran ? `${s.mata_pelajaran.nama_mapel} (${s.mata_pelajaran.kelas})` : ''
            };
        });

        const ws = xlsx.utils.json_to_sheet(dataExcel);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Bank_Soal");
        const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', 'attachment; filename=Export_Bank_Soal.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);

    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Gagal export soal" });
    }
};

module.exports = { 
    createBankSoal, getAllBankSoal, getBankSoalById, deleteBankSoal, updateBankSoal, importSoal,
    bulkDeleteBankSoal, exportSoal
};