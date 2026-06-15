const Ujian = require('../models/Ujian');
const MataPelajaran = require('../models/MataPelajaran');
const BankSoal = require('../models/BankSoal');
const Nilai = require('../models/Nilai');
const User = require('../models/User');
const { Op } = require('sequelize');
const crypto = require('crypto');
const xlsx = require('xlsx');

// +++ 1. FUNGSI BANTUAN KOREKSI ESAI OTOMATIS (KEYWORD) +++
const koreksiEsaiOtomatis = (jawabanSiswa, kunciJawabanGuru, bobotSoal = 10) => {
    if (!jawabanSiswa || !kunciJawabanGuru || kunciJawabanGuru === "-") return 0;
    
    // Ubah jawaban siswa ke huruf kecil semua
    const teksSiswa = String(jawabanSiswa).toLowerCase().trim();
    
    // Pecah kunci jawaban guru berdasarkan tanda koma, dan bersihkan spasi
    const keywords = String(kunciJawabanGuru)
        .toLowerCase()
        .split(',')
        .map(kata => kata.trim())
        .filter(kata => kata !== ""); // Buang yang kosong

    if (keywords.length === 0) return 0;

    let jumlahKetemu = 0;
    keywords.forEach(keyword => {
        // Jika kata kunci ada di dalam kalimat jawaban siswa
        if (teksSiswa.includes(keyword)) {
            jumlahKetemu++;
        }
    });

    // Hitung persentase dan kalikan dengan bobot soal
    let persentaseBenar = jumlahKetemu / keywords.length;
    return parseFloat((persentaseBenar * bobotSoal).toFixed(2));
};

/// FUNGSI BANTUAN: Generate Token Acak 6 Karakter
const generateToken = () => {
    return crypto.randomBytes(3).toString('hex').toUpperCase(); 
};

// 1. Ambil Semua Jadwal (Admin) - SUPPORT PAGINATION & FILTER
const getAllUjian = async (req, res) => {
    try {
        const { page = 1, limit = 10, mapel_id, kelas } = req.query;
        const offset = (page - 1) * limit;

        const whereClause = {};
        if (mapel_id && mapel_id !== 'ALL') whereClause.mapel_id = mapel_id;

        const includeMapel = {
            model: MataPelajaran,
            attributes: ['nama_mapel', 'kelas'],
            where: {}
        };

        if (kelas && kelas !== 'ALL') includeMapel.where.kelas = kelas;

        const { count, rows } = await Ujian.findAndCountAll({
            where: whereClause,
            include: [includeMapel],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['tgl_mulai', 'DESC']]
        });

        res.json({
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            data: rows
        });
    } catch (error) {
        // BUG #12 FIX: Jangan leak error detail
        res.status(500).json({ msg: "Gagal mengambil data ujian." });
    }
};

// 2. Buat Jadwal Baru
const createUjian = async (req, res) => {
    try {
        // TAMBAHKAN acak_soal DI SINI
        const { nama_ujian, jenis_ujian, tgl_mulai, tgl_selesai, durasi_menit, mapel_id, acak_soal } = req.body;
        const token = generateToken();

        await Ujian.create({
            nama_ujian, 
            jenis_ujian, 
            tgl_mulai, 
            tgl_selesai, 
            durasi_menit, 
            mapel_id, 
            token, 
            status: 'aktif',
            acak_soal
        });

        res.status(201).json({ msg: "Jadwal Ujian Berhasil Dibuat", token });
    } catch (error) {
        // BUG #12 FIX: Jangan leak error detail
        res.status(400).json({ msg: "Gagal membuat jadwal. Periksa data yang diinput." });
    }
};

// FUNGSI UPDATE JADWAL UJIAN
const updateUjian = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama_ujian, jenis_ujian, tgl_mulai, tgl_selesai, durasi_menit, acak_soal } = req.body;
        
        const ujian = await Ujian.findByPk(id);
        if (!ujian) return res.status(404).json({ msg: "Jadwal tidak ditemukan" });

        // Update data tanpa menyentuh mapel_id dan token
        await ujian.update({
            nama_ujian, jenis_ujian, tgl_mulai, tgl_selesai, durasi_menit, acak_soal
        });

        res.json({ msg: "Jadwal berhasil diperbarui!" });
    } catch (error) {
        // BUG #12 FIX: Jangan leak error detail
        res.status(500).json({ msg: "Gagal mengupdate jadwal." });
    }
};

// 3. Hapus Jadwal (SUDAH BENAR: PROTEKSI AKTIF)
const deleteUjian = async (req, res) => {
    try {
        const { id } = req.params;

        // CEK: Apakah sudah ada siswa yang mengerjakan?
        const nilaiCount = await Nilai.count({ where: { ujian_id: id } });

        if (nilaiCount > 0) {
            // Backend MENOLAK penghapusan
            return res.status(403).json({ 
                msg: "DITOLAK: Sudah ada siswa yang mengerjakan ujian ini. Hapus data nilai dulu jika ingin menghapus jadwal." 
            });
        }

        const deleted = await Ujian.destroy({ where: { id: id } });
        if (!deleted) return res.status(404).json({ msg: "Data tidak ditemukan" });

        res.json({ msg: "Jadwal ujian berhasil dihapus" });
    } catch (error) {
        // BUG #12 FIX: Jangan leak error detail
        res.status(500).json({ msg: "Gagal menghapus jadwal ujian." });
    }
};

// 4. Reset Token
const refreshToken = async (req, res) => {
    try {
        const ujian = await Ujian.findByPk(req.params.id);
        if(!ujian) return res.status(404).json({msg: "Data tidak ada"});

        const newToken = generateToken();
        ujian.token = newToken;
        await ujian.save();

        res.json({ msg: "Token diperbarui", token: newToken });
    } catch (error) {
        res.status(500).json({ msg: "Gagal refresh token" });
    }
};

// 5. SISWA MULAI UJIAN (FINAL FIX: URUTAN LOGIKA DIPERBAIKI)
const startUjian = async (req, res) => {
    try {
        const { id } = req.params; 
        const { token } = req.body;
        const siswa_id = req.user ? req.user.userId : null;

        console.log(`[DEBUG] Siswa ${siswa_id} mencoba start ujian ID: ${id}`);

        // 1. Cek Data Ujian
        const ujian = await Ujian.findByPk(id);
        if (!ujian) {
            return res.status(404).json({ msg: "Ujian tidak ditemukan" });
        }

        console.log(`[DEBUG] Data Ujian: ${ujian.nama_ujian}, Mapel ID: ${ujian.mapel_id}`);

        // BUG #6 FIX: Cek status ujian harus 'aktif'
        if (ujian.status !== 'aktif') {
            return res.status(403).json({ msg: "Ujian tidak aktif!" });
        }

        // 2. Validasi Token
        if (String(ujian.token).trim().toUpperCase() !== String(token).trim().toUpperCase()) {
            return res.status(401).json({ msg: "Token Salah!" });
        }

        // 3. Cek Waktu
        const now = new Date();
        if (now < new Date(ujian.tgl_mulai)) return res.status(403).json({ msg: "Ujian belum dimulai!" });
        if (now > new Date(ujian.tgl_selesai)) return res.status(403).json({ msg: "Waktu ujian sudah habis!" });

        // 4. LOGIKA ABSEN / MONITORING (Create/Update Record Nilai)
        let nilaiRecord = await Nilai.findOne({
            where: { ujian_id: id, siswa_id: siswa_id }
        });

        if (nilaiRecord) {
            if (nilaiRecord.tgl_selesai) {
                return res.status(403).json({ msg: "Anda sudah menyelesaikan ujian ini!" });
            }
            // Refresh: Update last active
            await nilaiRecord.changed('updatedAt', true);
            await nilaiRecord.save();
        } else {
            // Baru Masuk: Buat Record
            await Nilai.create({
                ujian_id: id,
                siswa_id: siswa_id,
                total_benar: 0,
                total_salah: 0,
                nilai_akhir: 0,
                detail_jawaban: [], 
                tgl_selesai: null,
                jml_pelanggaran: 0
            });
        }

        // 5. AMBIL SOAL DARI DATABASE (Definisikan soalList di sini!)
        console.log(`[DEBUG] Mengambil soal dari Mapel ID: ${ujian.mapel_id}`);
        
        // PENTING: Gunakan 'let' agar bisa diubah (diacak)
        let soalList = await BankSoal.findAll({ 
            where: { mapel_id: ujian.mapel_id } 
        });

        console.log(`[DEBUG] Ditemukan ${soalList.length} soal.`);

        // Cek jika kosong
        if (soalList.length === 0) {
            console.log("[WARNING] Soal Kosong!");
            return res.json({
                msg: "Soal Kosong",
                ujian: {
                    nama_ujian: ujian.nama_ujian,
                    sisa_waktu: 0
                },
                soal: [] 
            });
        }

        // 6. SANITASI DATA (JSON Parse & Hapus Kunci)
        // Lakukan sanitasi terlebih dahulu sebelum diacak
        const amanSoalList = soalList.map(soal => {
            const s = soal.toJSON(); 
            
            // Parse Opsi
            try { 
                if (typeof s.opsi_jawaban === 'string') s.opsi_jawaban = JSON.parse(s.opsi_jawaban);
            } catch(e) { s.opsi_jawaban = []; }

            // Parse Menjodohkan
            try {
                if (s.tipe_soal === 'menjodohkan') {
                     if (typeof s.menjodohkan_kiri === 'string') s.menjodohkan_kiri = JSON.parse(s.menjodohkan_kiri);
                     if (typeof s.menjodohkan_kanan === 'string') s.menjodohkan_kanan = JSON.parse(s.menjodohkan_kanan);
                     
                     // Acak Kanan (Diperbarui dengan Fisher-Yates agar lebih stabil)
                     if (Array.isArray(s.menjodohkan_kanan)) {
                         for (let i = s.menjodohkan_kanan.length - 1; i > 0; i--) {
                             const j = Math.floor(Math.random() * (i + 1));
                             [s.menjodohkan_kanan[i], s.menjodohkan_kanan[j]] = [s.menjodohkan_kanan[j], s.menjodohkan_kanan[i]];
                         }
                     }
                }
            } catch (e) {}
            
            // SECURITY: HAPUS KUNCI JAWABAN
            delete s.kunci_pg;
            delete s.kunci_esai;
            delete s.kunci_pg_kompleks; 
            
            return s;
        });

        // 7. ACAK URUTAN SOAL (FISHER-YATES SHUFFLE)
        // Pengacakan dilakukan setelah data dibersihkan agar Node.js tidak error
        if (ujian.acak_soal !== false && amanSoalList.length > 0) {
            for (let i = amanSoalList.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                // Tukar posisi elemen secara acak
                [amanSoalList[i], amanSoalList[j]] = [amanSoalList[j], amanSoalList[i]];
            }
        }

        // 8. KIRIM RESPON KE FRONTEND
        res.json({
            msg: "Berhasil Masuk Ujian",
            ujian: {
                nama_ujian: ujian.nama_ujian,
                durasi: ujian.durasi_menit,
                sisa_waktu: new Date(ujian.tgl_selesai) - now
            },
            soal: amanSoalList 
        });

        // +++ TAMBAHAN WEBSOCKET: Beritahu Admin ada siswa baru login +++
        const io = req.app.get('io');
        if (io) {
            io.to(`monitor_${id}`).emit('refresh_monitoring');
        }

    } catch (error) {
        console.error("[ERROR SERVER START UJIAN]", error);
        // BUG #12 FIX: Jangan leak error detail
        res.status(500).json({ msg: "Terjadi kesalahan server." });
    }
};

// 6. SISWA: AMBIL DAFTAR UJIAN (FIX: TAMPILKAN RIWAYAT)
const getExamsForStudent = async (req, res) => {
    try {
        const userId = req.user.userId;
        const siswa = await User.findByPk(userId);
        if (!siswa) return res.status(404).json({ msg: "Siswa tidak ditemukan" });

        // Ambil SEMUA ujian untuk kelas siswa ini (tanpa filter status dulu)
        const exams = await Ujian.findAll({
            include: [
                {
                    model: MataPelajaran,
                    attributes: ['nama_mapel', 'kelas'],
                    where: { kelas: siswa.kelas } 
                },
                {
                    model: Nilai,
                    required: false, 
                    where: { siswa_id: userId },
                    attributes: ['id', 'nilai_akhir', 'createdAt']
                }
            ],
            attributes: { exclude: ['token'] },
            order: [['tgl_mulai', 'DESC']]
        });
        
        // FILTER JAVASCRIPT: 
        // Hanya tampilkan jika status 'aktif' ATAU siswa sudah punya riwayat nilai di ujian tersebut
        const filteredExams = exams.filter(ex => ex.status === 'aktif' || ex.nilais.length > 0);

        res.json(filteredExams);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Gagal memuat daftar ujian" });
    }
};

// 7. SISWA: SUBMIT UJIAN (FINAL: UPDATE RECORD EXISTING & KOREKSI DETAIL)
const submitUjian = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { ujian_id, jawaban_siswa } = req.body; 

        // 1. Ambil Record Nilai yang sudah dibuat saat Start
        let nilaiRecord = await Nilai.findOne({
            where: { ujian_id: ujian_id, siswa_id: userId }
        });

        if (!nilaiRecord) {
            return res.status(404).json({ msg: "Data sesi ujian tidak ditemukan. Silakan refresh." });
        }
        
        // Cek double submit
        if (nilaiRecord.tgl_selesai) {
             return res.status(400).json({ msg: "Anda sudah submit sebelumnya!" });
        }

        // 2. Ambil Soal dari DB untuk Koreksi
        const allSoal = await BankSoal.findAll({ 
            where: { mapel_id: (await Ujian.findByPk(ujian_id)).mapel_id } 
        });

        let totalSkorDidapat = 0;
        let totalBobotMaksimal = 0; 
        const detailHasil = []; // Array untuk menyimpan detail jawaban & koreksi

        // --- LOOP KOREKSI (Logic Kamu yang Bagus) ---
        for (let soalDB of allSoal) {
            const inputSiswa = jawaban_siswa.find(j => j.soal_id === soalDB.id);
            const bobotSoal = soalDB.bobot || 1; 
            totalBobotMaksimal += bobotSoal;

            let isCorrect = false;
            let skorSoal = 0;
            // BUG #2 FIX: Cek field dari body (jawab) DAN dari autosave (jawaban_siswa)
            let jawabanText = inputSiswa ? (inputSiswa.jawab || inputSiswa.jawaban_siswa || null) : null;

            // A. MENYUSUN KUNCI REFERENSI (Agar Guru Bisa Lihat Nanti)
            let referensiKunci = "-";
            
            if (soalDB.tipe_soal === 'pg') {
                referensiKunci = soalDB.kunci_pg;
            } 
            else if (soalDB.tipe_soal === 'esai') {
                referensiKunci = soalDB.kunci_esai;
            }
            else if (soalDB.tipe_soal === 'pg_kompleks') {
                if (soalDB.kunci_pg_kompleks) {
                    // Pastikan format string JSON
                    referensiKunci = (typeof soalDB.kunci_pg_kompleks === 'string') 
                        ? soalDB.kunci_pg_kompleks 
                        : JSON.stringify(soalDB.kunci_pg_kompleks);
                }
            }
            else if (soalDB.tipe_soal === 'menjodohkan') {
                try {
                    const parseIt = (v) => (typeof v === 'string' ? JSON.parse(v) : v);
                    const kiri = parseIt(soalDB.menjodohkan_kiri);
                    const kanan = parseIt(soalDB.menjodohkan_kanan);

                    if (Array.isArray(kiri) && Array.isArray(kanan)) {
                        // Pasangkan Kiri=Kanan (Kunci Benar)
                        const pairs = kiri.map((k, idx) => ({ 
                            k: k.teks || k, 
                            p: kanan[idx]?.teks || kanan[idx] 
                        }));
                        referensiKunci = JSON.stringify(pairs);
                    }
                } catch (e) {
                    referensiKunci = "Error Data Database";
                }
            }

            // B. LOGIKA KOREKSI OTOMATIS
            if (inputSiswa && jawabanText) {
                // 1. Pilihan Ganda
                if (soalDB.tipe_soal === 'pg') {
                    if (jawabanText === soalDB.kunci_pg) {
                        isCorrect = true;
                        skorSoal = bobotSoal;
                    }
                } 
                // 2. PG Kompleks (Harus sama persis semua pilihannya)
                else if (soalDB.tipe_soal === 'pg_kompleks') {
                    try {
                        // Urutkan array agar ["A","B"] dianggap sama dengan ["B","A"]
                        const kunciArr = JSON.parse(referensiKunci).sort();
                        const jawabArr = (Array.isArray(jawabanText) ? jawabanText : JSON.parse(jawabanText)).sort();
                        
                        if (JSON.stringify(kunciArr) === JSON.stringify(jawabArr)) {
                            isCorrect = true;
                            skorSoal = bobotSoal;
                        }
                    } catch(e) {}
                }
                // 3. Menjodohkan (Logika Sederhana: Benar Semua = Poin Penuh)
                else if (soalDB.tipe_soal === 'menjodohkan') {
                    // (Bisa dikembangkan nanti untuk poin parsial)
                }
                // +++ 4. ESAI DENGAN KOREKSI MESIN OTOMATIS +++
                else if (soalDB.tipe_soal === 'esai') {
                    // Jika guru mengisi kunci jawaban, pakai koreksi mesin
                    if (referensiKunci && referensiKunci !== "-") {
                        skorSoal = koreksiEsaiOtomatis(jawabanText, referensiKunci, bobotSoal);
                        isCorrect = skorSoal > 0; // Dianggap benar/sebagian benar jika dapat skor > 0
                    } else {
                        // Jika guru KOSONGKAN kunci jawaban, statusnya menunggu dinilai manual
                        isCorrect = false; 
                        skorSoal = 0; 
                    }
                }
            }
            
            totalSkorDidapat += skorSoal;

            // Simpan Detail untuk Halaman Koreksi Guru
            detailHasil.push({
                soal_id: soalDB.id,
                pertanyaan: soalDB.pertanyaan,
                tipe_soal: soalDB.tipe_soal,
                jawaban_siswa: jawabanText,
                kunci_jawaban: referensiKunci, 
                is_benar: isCorrect, 
                skor: skorSoal,      
                max_skor: bobotSoal, 
                // +++ PERBAIKAN STATUS KOREKSI ESAI +++
                status_koreksi: (soalDB.tipe_soal === 'esai' && (!referensiKunci || referensiKunci === "-")) ? 'menunggu' : 'selesai'
            });
        }

        // C. HITUNG NILAI AKHIR (Skor Sementara sebelum Esai dikoreksi)
        // Rumus: (Total Skor Didapat / Total Bobot Maksimal) * 100
        // Hati-hati pembagian nol
        const nilaiAkhir = totalBobotMaksimal > 0 
            ? (totalSkorDidapat / totalBobotMaksimal) * 100 
            : 0;

        // D. UPDATE RECORD (BUKAN CREATE)
        await nilaiRecord.update({
            total_benar: detailHasil.filter(d => d.is_benar).length,
            total_salah: detailHasil.filter(d => !d.is_benar).length,
            nilai_akhir: parseFloat(nilaiAkhir.toFixed(2)),
            detail_jawaban: detailHasil, // Simpan Array Detail Lengkap ke JSON Column
            tgl_selesai: new Date()      // Tandai Selesai
        });

        const jamSelesai = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        
        res.json({ 
            msg: "Ujian berhasil disubmit.", 
            waktu_selesai: jamSelesai // Kirim jam saja
        });

        // +++ TAMBAHAN WEBSOCKET: Beritahu Admin bahwa siswa ini selesai +++
        const io = req.app.get('io');
        if (io) {
            io.to(`monitor_${ujian_id}`).emit('update_siswa', {
                nilai_id: nilaiRecord.id,
                status: 'selesai',
                last_active: new Date()
            });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Gagal submit ujian" });
    }
};

// 8. ADMIN: LIHAT HASIL UJIAN
const getExamResults = async (req, res) => {
    try {
        const { id } = req.params;
        const ujian = await Ujian.findByPk(id, {
            include: [{ model: MataPelajaran, attributes: ['nama_mapel', 'kelas'] }]
        });
        if(!ujian) return res.status(404).json({msg: "Ujian tidak ditemukan"});

        const results = await Nilai.findAll({
            where: { ujian_id: id },
            include: [{ model: User, attributes: ['username', 'nama_lengkap', 'kelas'] }],
            order: [['nilai_akhir', 'DESC']]
        });

        res.json({ ujian, peserta: results });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Gagal memuat hasil ujian" });
    }
};

// 9. ADMIN: AMBIL DAFTAR RIWAYAT UJIAN (SUPPORT PAGINATION & FILTER)
const getExamHistory = async (req, res) => {
    try {
        const { page = 1, limit = 10, mapel_id, kelas } = req.query;
        const offset = (page - 1) * limit;

        const whereClause = {};
        if (mapel_id && mapel_id !== 'ALL') whereClause.mapel_id = mapel_id;

        const includeMapel = { 
            model: MataPelajaran, 
            attributes: ['nama_mapel', 'kelas'],
            where: {} 
        };
        
        if (kelas && kelas !== 'ALL') includeMapel.where.kelas = kelas;

        // Gunakan findAndCountAll, tambah distinct: true agar hitungan count tidak dobel karena join tabel Nilai
        const { count, rows } = await Ujian.findAndCountAll({
            where: whereClause,
            include: [
                includeMapel,
                { model: Nilai, attributes: ['id'] }
            ],
            limit: parseInt(limit),
            offset: parseInt(offset),
            distinct: true, 
            order: [['tgl_mulai', 'DESC']]
        });

        const history = rows.map(exam => {
            return {
                id: exam.id,
                nama_ujian: exam.nama_ujian,
                jenis_ujian: exam.jenis_ujian,
                mapel: exam.mata_pelajaran?.nama_mapel,
                kelas: exam.mata_pelajaran?.kelas,
                tgl_selesai: exam.tgl_selesai,
                jumlah_peserta: exam.nilais.length
            };
        });

        res.json({
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            data: history
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Gagal memuat riwayat" });
    }
};

// 10. ADMIN: AMBIL DETAIL JAWABAN
const getStudentResultDetail = async (req, res) => {
    try {
        const { nilaiId } = req.params;
        const result = await Nilai.findOne({
            where: { id: nilaiId },
            include: [
                { model: User, attributes: ['nama_lengkap', 'username', 'kelas'] },
                { model: Ujian, attributes: ['nama_ujian', 'jenis_ujian'] }
            ]
        });
        if(!result) return res.status(404).json({msg: "Data nilai tidak ditemukan"});
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Gagal memuat detail jawaban" });
    }
};

// 11. ADMIN: SIMPAN KOREKSI MANUAL (FIX TOTAL BENAR/SALAH)
const saveKoreksi = async (req, res) => {
    try {
        const { nilaiId } = req.params;
        const { koreksi } = req.body; 
        
        const nilaiDB = await Nilai.findByPk(nilaiId);
        if(!nilaiDB) return res.status(404).json({msg: "Data tidak ditemukan"});

        let detailJawaban = typeof nilaiDB.detail_jawaban === 'string' 
            ? JSON.parse(nilaiDB.detail_jawaban) 
            : nilaiDB.detail_jawaban;
        
        let totalSkorBaru = 0;
        let totalBobotMaksimal = 0;
        
        // RESET COUNTER
        let totalBenar = 0;
        let totalSalah = 0;

        // Loop dan Update
        detailJawaban = detailJawaban.map(item => {
            const updateItem = koreksi.find(k => k.soal_id === item.soal_id);
            
            if (updateItem) {
                // Update skor & status dari input Admin
                item.skor = parseFloat(updateItem.skor_baru);
                // Logika: Jika skor > 0, dianggap Benar. Jika 0, Salah.
                item.is_benar = item.skor > 0; 
                item.status_koreksi = 'selesai'; 
            }

            // Hitung Total Skor
            totalSkorBaru += item.skor;
            totalBobotMaksimal += (item.max_skor || 1); 

            // --- HITUNG ULANG JUMLAH BENAR & SALAH ---
            if (item.is_benar) {
                totalBenar++;
            } else {
                totalSalah++;
            }

            return item;
        });

        // Hitung Ulang Nilai Akhir
        const nilaiAkhirBaru = totalBobotMaksimal > 0 
            ? (totalSkorBaru / totalBobotMaksimal) * 100 
            : 0;

        // --- UPDATE DATABASE (MASUKKAN TOTAL BENAR & SALAH) ---
        await Nilai.update({
            detail_jawaban: detailJawaban,
            nilai_akhir: parseFloat(nilaiAkhirBaru.toFixed(2)),
            total_benar: totalBenar, // <--- INI YANG SEBELUMNYA KURANG
            total_salah: totalSalah  // <--- INI JUGA
        }, { where: { id: nilaiId }});

        res.json({ 
            msg: "Koreksi disimpan!", 
            nilai_akhir: nilaiAkhirBaru.toFixed(2),
            total_benar: totalBenar,
            total_salah: totalSalah
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Gagal menyimpan koreksi" });
    }
};

// 12. ADMIN: EXPORT NILAI KE EXCEL (FIXED: HAPUS NIS)
const exportNilai = async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`[EXPORT] Memulai export untuk Ujian ID: ${id}`);

        // 1. Ambil Data Ujian
        const ujian = await Ujian.findByPk(id, {
            include: [{ model: MataPelajaran, attributes: ['nama_mapel', 'kelas'] }]
        });
        
        if (!ujian) return res.status(404).json({ msg: "Ujian tidak ditemukan" });

        // 2. Ambil Data Nilai
        const nilaiList = await Nilai.findAll({
            where: { ujian_id: id },
            include: [{ 
                model: User, 
                // PERBAIKAN DISINI: HAPUS 'nis' DARI ARRAY DI BAWAH
                attributes: ['nama_lengkap', 'username', 'kelas'] 
            }],
            order: [['nilai_akhir', 'DESC']]
        });

        if (nilaiList.length === 0) {
            return res.status(400).json({ msg: "Belum ada data nilai" });
        }

        // 3. Mapping Data
        const dataExcel = nilaiList.map((item, index) => {
            const user = item.user || {}; // Antisipasi user null (terhapus)

            return {
                "No": index + 1,
                "Username": user.username || '-', // Pakai username sebagai pengganti NIS
                "Nama Lengkap": user.nama_lengkap || '(Siswa Terhapus)',
                "Kelas": user.kelas || '-',
                "Benar": item.total_benar || 0,
                "Salah": item.total_salah || 0,
                "Nilai Akhir": parseFloat(item.nilai_akhir || 0),
                "Waktu Submit": item.createdAt ? new Date(item.createdAt).toLocaleString('id-ID') : '-',
            };
        });

        // 4. Buat File Excel
        const worksheet = xlsx.utils.json_to_sheet(dataExcel);
        
        // Atur Lebar Kolom
        worksheet['!cols'] = [
            {wch: 5},  {wch: 15}, {wch: 30}, {wch: 10}, 
            {wch: 8},  {wch: 8},  {wch: 10}, {wch: 20}
        ];

        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "Rekap Nilai");

        const excelBuffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });

        // 5. Kirim Response
        const cleanName = ujian.nama_ujian.replace(/[^a-zA-Z0-9]/g, '_');
        const namaFile = `Nilai_${cleanName}.xlsx`;

        res.setHeader('Content-Disposition', `attachment; filename=${namaFile}`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Length', excelBuffer.length);

        res.send(excelBuffer);

    } catch (error) {
        console.error("[EXPORT ERROR]:", error);
        res.status(500).json({ msg: "Gagal export excel" });
    }
};

// 13. ADMIN: RESET UJIAN SISWA (Hapus Nilai agar bisa login ulang)
const resetUjianSiswa = async (req, res) => {
    try {
        const { nilaiId } = req.params;
        
        const nilai = await Nilai.findByPk(nilaiId);
        if(!nilai) return res.status(404).json({ msg: "Data peserta tidak ditemukan" });

        // Hapus Data Nilai
        await nilai.destroy();

        res.json({ msg: "Status ujian siswa di-reset. Siswa bisa login kembali." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Gagal mereset ujian" });
    }
};

// 14. MONITORING STATUS PESERTA (REALTIME) DENGAN STATISTIK
const getExamStatus = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Cari info ujian & kelasnya
        const ujian = await Ujian.findByPk(id, {
            include: [{ model: MataPelajaran, attributes: ['kelas'] }]
        });
        if (!ujian) return res.status(404).json({ msg: "Ujian tidak ditemukan" });

        const targetKelas = ujian.mata_pelajaran ? ujian.mata_pelajaran.kelas : '';

        // 2. Hitung total siswa (Gunakan Op.like agar '9' merangkul '9A', '9B', dst)
        let totalSiswa = await User.count({
            where: { 
                role: 'siswa', 
                kelas: { [Op.like]: `${targetKelas}%` } 
            }
        });

        // 3. Ambil data peserta yang sudah login (punya record Nilai)
        const monitor = await Nilai.findAll({
            where: { ujian_id: id },
            include: [{ model: User, attributes: ['nama_lengkap', 'username', 'kelas'] }],
            order: [[User, 'nama_lengkap', 'ASC']]
        });

        // --- PENGAMAN (FAIL-SAFE) ANTI MINUS ---
        // Jika karena suatu alasan total siswa terdeteksi lebih sedikit dari yang sudah login,
        // kita paksa total siswa menyesuaikan agar logikanya tetap masuk akal.
        if (totalSiswa < monitor.length) {
            totalSiswa = monitor.length; 
        }

        const now = new Date();
        let countMengerjakan = 0;
        let countSelesai = 0;
        let countIdle = 0;

        const results = monitor.map(m => {
            const lastUpdate = new Date(m.updatedAt);
            const diffMinutes = (now - lastUpdate) / 1000 / 60;
            
            let status = 'offline';
            if (m.tgl_selesai) { status = 'selesai'; countSelesai++; }
            else if (diffMinutes < 2) { status = 'mengerjakan'; countMengerjakan++; }
            else { status = 'idle'; countIdle++; }

            return {
                id: m.id,
                nama: m.user ? m.user.nama_lengkap : 'Terhapus',
                username: m.user ? m.user.username : '-',
                kelas: m.user ? m.user.kelas : '-',
                pelanggaran: m.jml_pelanggaran || 0, 
                status: status,
                last_active: lastUpdate
            };
        });

        // 4. Kirim Data + Statistik
        res.json({
            statistik: {
                total_peserta: totalSiswa,
                sudah_login: monitor.length,
                belum_login: totalSiswa - monitor.length,
                mengerjakan: countMengerjakan,
                selesai: countSelesai,
                idle: countIdle
            },
            data: results
        });
    } catch (error) {
        console.error("[ERROR MONITORING]", error);
        res.status(500).json({ msg: "Gagal monitoring" });
    }
};

// 15. LOG PELANGGARAN SISWA
const logViolation = async (req, res) => {
    try {
        const { ujian_id } = req.body;
        const siswa_id = req.user.userId;

        const nilaiRecord = await Nilai.findOne({ where: { ujian_id, siswa_id } });
        if (nilaiRecord) {
            // Increment jumlah pelanggaran
            await nilaiRecord.increment('jml_pelanggaran');
            res.json({ msg: "Pelanggaran dicatat" });
        } else {
            res.status(404).json({ msg: "Sesi tidak ditemukan" });
        }
    } catch (error) {
        res.status(500).json({ msg: "Error log" });
    }
};

// 16. KOREKSI: AMBIL DAFTAR SISWA & STATUS KOREKSI
const getEssayCandidates = async (req, res) => {
    try {
        const { id } = req.params; 

        // 1. Ambil data Nilai + Join ke User
        const candidates = await Nilai.findAll({
            where: { ujian_id: id },
            include: [{
                model: User,
                attributes: ['nama_lengkap', 'username', 'kelas'],
                required: false // Agar kalau user dihapus, data nilai tetap muncul (tidak error SQL)
            }],
            order: [['nilai_akhir', 'DESC']] // Urutkan dari nilai tertinggi (opsional)
        });

        // 2. Format Data (Dengan Pengecekan Null)
        const result = candidates.map(c => {
            // Ambil Detail Jawaban (Array)
            // Handle jika detail_jawaban masih string (belum ter-parse otomatis) atau null
            let details = [];
            if (Array.isArray(c.detail_jawaban)) {
                details = c.detail_jawaban;
            } else if (typeof c.detail_jawaban === 'string') {
                try { details = JSON.parse(c.detail_jawaban); } catch(e) {}
            }

            // Hitung status esai
            const pendingEssay = details.filter(d => d.tipe_soal === 'esai' && d.status_koreksi === 'menunggu').length;
            const totalEssay = details.filter(d => d.tipe_soal === 'esai').length;

            return {
                nilai_id: c.id,
                // SAFETY CHECK: Gunakan Fallback jika user sudah dihapus
                siswa_nama: c.user ? c.user.nama_lengkap : 'Siswa Terhapus/Keluar',
                siswa_kelas: c.user ? c.user.kelas : '-',
                nilai_sementara: c.nilai_akhir || 0,
                pending: pendingEssay, 
                total_esai: totalEssay,
                status: pendingEssay > 0 ? 'menunggu' : 'selesai'
            };
        });

        res.json(result);

    } catch (error) {
        console.error("[ERROR KOREKSI]", error); // Cek terminal jika masih error
        // BUG #12 FIX: Jangan leak error detail
        res.status(500).json({ msg: "Gagal mengambil data koreksi." });
    }
};

// 17. KOREKSI: AMBIL DETAIL JAWABAN SISWA (KHUSUS ESAI)
const getStudentEssays = async (req, res) => {
    try {
        const { nilai_id } = req.params;
        const nilai = await Nilai.findByPk(nilai_id);
        
        if(!nilai) return res.status(404).json({ msg: "Data tidak ditemukan" });

        const details = nilai.detail_jawaban || [];
        // Filter hanya soal ESAI
        const essays = details.filter(d => d.tipe_soal === 'esai');

        res.json({
            siswa_id: nilai.siswa_id, // Buat info
            essays: essays
        });
    } catch (error) {
        res.status(500).json({ msg: "Error server" });
    }
};

// 18. KOREKSI: SIMPAN NILAI ESAI & HITUNG ULANG
const saveEssayScore = async (req, res) => {
    try {
        const { nilai_id, soal_id, skor_guru } = req.body; // skor_guru adalah nilai inputan (misal 0 - 10)

        const nilai = await Nilai.findByPk(nilai_id);
        if(!nilai) return res.status(404).json({ msg: "Data nilai hilang" });

        // 1. Update Detail Jawaban
        let details = nilai.detail_jawaban; // Array object
        const index = details.findIndex(d => d.soal_id === soal_id);
        
        if (index === -1) return res.status(404).json({ msg: "Soal tidak ditemukan di lembar jawaban siswa" });

        // Validasi Skor tidak boleh melebihi Bobot Maksimal
        const maxSkor = details[index].max_skor || 10; // Default 10 kalau data lama gak ada
        if (skor_guru > maxSkor) {
            return res.status(400).json({ msg: `Skor tidak boleh melebihi bobot maksimal (${maxSkor})` });
        }

        // Update Data
        details[index].skor = parseFloat(skor_guru);
        details[index].status_koreksi = 'selesai';
        // Logic: Jika skor > 0 dianggap benar/sebagian benar
        details[index].is_benar = parseFloat(skor_guru) > 0; 

        // 2. HITUNG ULANG NILAI AKHIR (RECALCULATE)
        let totalSkorDidapat = 0;
        let totalBobotMaksimal = 0;

        details.forEach(d => {
            totalSkorDidapat += (d.skor || 0);
            totalBobotMaksimal += (d.max_skor || 0);
        });

        // Rumus Nilai Akhir
        const nilaiBaru = totalBobotMaksimal > 0 
            ? (totalSkorDidapat / totalBobotMaksimal) * 100 
            : 0;

        // 3. Simpan ke DB
        nilai.detail_jawaban = details; // Setter di Model akan stringify otomatis
        nilai.nilai_akhir = parseFloat(nilaiBaru.toFixed(2));
        
        // Update total benar/salah juga biar sinkron
        nilai.total_benar = details.filter(d => d.is_benar).length;
        
        await nilai.save();

        res.json({ 
            msg: "Nilai tersimpan", 
            nilai_akhir_baru: nilai.nilai_akhir 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Gagal menyimpan koreksi" });
    }
};

// 19. FUNGSI AKHIRI UJIAN LEBIH AWAL
const forceAkhiriUjian = async (req, res) => {
    try {
        const ujian = await Ujian.findOne({ where: { id: req.params.id } });
        
        if (!ujian) return res.status(404).json({ msg: "Jadwal Ujian tidak ditemukan" });

        // PERBAIKAN 1: Gunakan nama kolom yang benar (tgl_selesai)
        ujian.tgl_selesai = new Date();
        
        // PERBAIKAN 2: Ubah status menjadi 'selesai'
        // Ini akan otomatis membuat siswa tidak bisa melihat ujian ini di dashboard
        ujian.status = 'selesai'; 

        await ujian.save();

        res.json({ msg: "Ujian berhasil diakhiri secara paksa!" });
            } catch (error) {
                // BUG #12 FIX: Jangan leak error detail
                res.status(500).json({ msg: "Gagal mengakhiri ujian." });
    }
};

// 20. ADMIN: PAKSA SELESAI SISWA NYANGKUT
const forceSubmitSiswa = async (req, res) => {
    try {
        const { nilaiId } = req.params;

        let nilaiRecord = await Nilai.findByPk(nilaiId);
        if (!nilaiRecord) return res.status(404).json({ msg: "Data sesi ujian tidak ditemukan." });
        if (nilaiRecord.tgl_selesai) return res.status(400).json({ msg: "Siswa ini sudah selesai / disubmit." });

        // 1. Ambil data Ujian & Soal
        const ujian = await Ujian.findByPk(nilaiRecord.ujian_id);
        const allSoal = await BankSoal.findAll({ where: { mapel_id: ujian.mapel_id } });

        // 2. Ambil Jawaban Autosave dari DB
        let currentDetails = Array.isArray(nilaiRecord.detail_jawaban) 
            ? nilaiRecord.detail_jawaban 
            : JSON.parse(nilaiRecord.detail_jawaban || "[]");

        let totalSkorDidapat = 0;
        let totalBobotMaksimal = 0; 
        const detailHasil = [];

        // 3. Looping Kalkulasi (Sama persis seperti Submit normal)
        for (let soalDB of allSoal) {
            const inputSiswa = currentDetails.find(j => j.soal_id === soalDB.id);
            const bobotSoal = soalDB.bobot || 1; 
            totalBobotMaksimal += bobotSoal;

            let isCorrect = false;
            let skorSoal = 0;
            let jawabanText = inputSiswa ? inputSiswa.jawaban_siswa : null; 

            // Susun Kunci Referensi
            let referensiKunci = "-";
            if (soalDB.tipe_soal === 'pg') referensiKunci = soalDB.kunci_pg;
            else if (soalDB.tipe_soal === 'esai') referensiKunci = soalDB.kunci_esai;
            else if (soalDB.tipe_soal === 'pg_kompleks') {
                if (soalDB.kunci_pg_kompleks) referensiKunci = (typeof soalDB.kunci_pg_kompleks === 'string') ? soalDB.kunci_pg_kompleks : JSON.stringify(soalDB.kunci_pg_kompleks);
            }
            else if (soalDB.tipe_soal === 'menjodohkan') {
                try {
                    const parseIt = (v) => (typeof v === 'string' ? JSON.parse(v) : v);
                    const kiri = parseIt(soalDB.menjodohkan_kiri);
                    const kanan = parseIt(soalDB.menjodohkan_kanan);
                    if (Array.isArray(kiri) && Array.isArray(kanan)) {
                        const pairs = kiri.map((k, idx) => ({ k: k.teks || k, p: kanan[idx]?.teks || kanan[idx] }));
                        referensiKunci = JSON.stringify(pairs);
                    }
                } catch (e) { referensiKunci = "Error Data"; }
            }

            // Hitung Benar/Salah
            if (inputSiswa && jawabanText) {
                if (soalDB.tipe_soal === 'pg') {
                    if (jawabanText === soalDB.kunci_pg) { isCorrect = true; skorSoal = bobotSoal; }
                } 
                else if (soalDB.tipe_soal === 'pg_kompleks') {
                    try {
                        const kunciArr = JSON.parse(referensiKunci).sort();
                        const jawabArr = (Array.isArray(jawabanText) ? jawabanText : JSON.parse(jawabanText)).sort();
                        if (JSON.stringify(kunciArr) === JSON.stringify(jawabArr)) { isCorrect = true; skorSoal = bobotSoal; }
                    } catch(e) {}
                }
                // +++ ESAI DENGAN KOREKSI MESIN OTOMATIS (FORCE SUBMIT) +++
                else if (soalDB.tipe_soal === 'esai') { 
                    if (referensiKunci && referensiKunci !== "-") {
                        skorSoal = koreksiEsaiOtomatis(jawabanText, referensiKunci, bobotSoal);
                        isCorrect = skorSoal > 0;
                    } else {
                        isCorrect = false; 
                        skorSoal = 0; 
                    }
                }
            }
            
            totalSkorDidapat += skorSoal;

            detailHasil.push({
                soal_id: soalDB.id,
                pertanyaan: soalDB.pertanyaan,
                tipe_soal: soalDB.tipe_soal,
                jawaban_siswa: jawabanText,
                kunci_jawaban: referensiKunci, 
                is_benar: isCorrect, 
                skor: skorSoal,      
                max_skor: bobotSoal, 
                // +++ PERBAIKAN STATUS KOREKSI ESAI +++
                status_koreksi: (soalDB.tipe_soal === 'esai' && (!referensiKunci || referensiKunci === "-")) ? 'menunggu' : 'selesai'
            });
        }

        const nilaiAkhir = totalBobotMaksimal > 0 ? (totalSkorDidapat / totalBobotMaksimal) * 100 : 0;

        await nilaiRecord.update({
            total_benar: detailHasil.filter(d => d.is_benar).length,
            total_salah: detailHasil.filter(d => !d.is_benar).length,
            nilai_akhir: parseFloat(nilaiAkhir.toFixed(2)),
            detail_jawaban: detailHasil,
            tgl_selesai: new Date()
        });

        res.json({ msg: "Sesi ditutup paksa dan nilai berhasil dikalkulasi!", nilai_akhir: nilaiAkhir });

        // +++ TAMBAHAN WEBSOCKET: Beritahu layar Admin bahwa status sudah berubah +++
        const io = req.app.get('io');
        if (io) {
            io.to(`monitor_${nilaiRecord.ujian_id}`).emit('update_siswa', {
                nilai_id: nilaiRecord.id,
                status: 'selesai',
                last_active: new Date()
            });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Gagal menutup paksa sesi siswa" });
    }
};

// 21. SISWA: AUTOSAVE PROGRESS JAWABAN
const updateProgress = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { ujian_id, soal_id, jawab } = req.body;

        // 1. Cari record nilai yang sedang berjalan
        let nilaiRecord = await Nilai.findOne({
            where: { ujian_id: ujian_id, siswa_id: userId }
        });

        if (!nilaiRecord) {
            return res.status(404).json({ msg: "Sesi ujian tidak ditemukan." });
        }

        if (nilaiRecord.tgl_selesai) {
            return res.status(400).json({ msg: "Ujian sudah selesai, tidak bisa simpan jawaban." });
        }

        // 2. Ambil detail_jawaban yang ada (parse jika string)
        let currentDetails = Array.isArray(nilaiRecord.detail_jawaban) 
            ? nilaiRecord.detail_jawaban 
            : JSON.parse(nilaiRecord.detail_jawaban || "[]");

        // 3. Update atau Tambah jawaban baru untuk soal_id ini
        const index = currentDetails.findIndex(d => d.soal_id === soal_id);
        
        if (index !== -1) {
            // Update jawaban yang sudah ada
            currentDetails[index].jawaban_siswa = jawab;
        } else {
            // Tambahkan baris baru (status belum dikoreksi/menunggu)
            currentDetails.push({
                soal_id: soal_id,
                jawaban_siswa: jawab,
                skor: 0,
                is_benar: false,
                status_koreksi: 'menunggu'
            });
        }

        // 4. Simpan kembali ke database (FIX SEQUELIZE JSON BUG)
        nilaiRecord.detail_jawaban = currentDetails;
        
        // VVV BARIS INI ADALAH KUNCI RAHASIANYA VVV
     nilaiRecord.changed('detail_jawaban', true); 
        
        await nilaiRecord.save();

        res.json({ msg: "Progres tersimpan otomatis" });

        // +++ TAMBAHAN WEBSOCKET: Kirim data spesifik 1 siswa agar Admin tidak perlu refresh semua +++
        const io = req.app.get('io');
        if (io) {
            io.to(`monitor_${ujian_id}`).emit('update_siswa', {
                nilai_id: nilaiRecord.id,
                status: 'mengerjakan',
                last_active: new Date()
            });
        }

    } catch (error) {
        console.error("[AUTOSAVE ERROR]", error);
        res.status(500).json({ msg: "Gagal menyimpan progres sementara" });
    }
};

// 22. ADMIN: ANALISIS BUTIR SOAL (ITEM ANALYSIS)
const getItemAnalysis = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Ambil data Ujian dan Soalnya
        const ujian = await Ujian.findByPk(id);
        if (!ujian) return res.status(404).json({ msg: "Ujian tidak ditemukan" });

        const allSoal = await BankSoal.findAll({ 
            where: { mapel_id: ujian.mapel_id },
            attributes: ['id', 'pertanyaan', 'tipe_soal']
        });

        // 2. Ambil semua jawaban siswa dari tabel Nilai
        const semuaNilai = await Nilai.findAll({
            where: { ujian_id: id }
        });

        if (semuaNilai.length === 0) {
            return res.status(400).json({ msg: "Belum ada siswa yang mengerjakan ujian ini." });
        }

        // 3. Siapkan keranjang untuk menghitung statistik per soal
        let analisisMap = {};
        allSoal.forEach(s => {
            analisisMap[s.id] = {
                soal_id: s.id,
                pertanyaan: s.pertanyaan,
                tipe_soal: s.tipe_soal,
                dijawab_benar: 0,
                dijawab_salah: 0,
                tidak_dijawab: 0
            };
        });

        const totalSiswa = semuaNilai.length;

        // 4. Looping untuk menghitung (Tally)
        semuaNilai.forEach(record => {
            let detail = [];
            if (Array.isArray(record.detail_jawaban)) detail = record.detail_jawaban;
            else if (typeof record.detail_jawaban === 'string') {
                try { detail = JSON.parse(record.detail_jawaban); } catch(e) {}
            }

            // Hitung jawaban tiap siswa
            detail.forEach(ans => {
                if (analisisMap[ans.soal_id]) {
                    // Jika soal esai belum dikoreksi, kita anggap 'tidak_dijawab' / abu-abu dulu
                    if (ans.tipe_soal === 'esai' && ans.status_koreksi === 'menunggu') {
                        analisisMap[ans.soal_id].tidak_dijawab++;
                    } else {
                        if (ans.is_benar) {
                            analisisMap[ans.soal_id].dijawab_benar++;
                        } else {
                            analisisMap[ans.soal_id].dijawab_salah++;
                        }
                    }
                }
            });
        });

        // 5. Format hasil akhir (Ubah Map jadi Array + Hitung Persentase)
        const hasilAnalisis = Object.values(analisisMap).map(item => {
            // Hitung persentase tingkat kesulitan
            const totalDijawab = item.dijawab_benar + item.dijawab_salah;
            let tingkatKesulitan = "Sedang";
            let persentaseBenar = 0;

            if (totalDijawab > 0) {
                persentaseBenar = (item.dijawab_benar / totalSiswa) * 100;
                
                // Kategori Umum Evaluasi Soal
                if (persentaseBenar > 70) tingkatKesulitan = "Mudah";
                else if (persentaseBenar < 30) tingkatKesulitan = "Sulit";
            } else {
                tingkatKesulitan = "Belum Ada Data";
            }

            return {
                ...item,
                persentase_benar: persentaseBenar.toFixed(1),
                tingkat_kesulitan: tingkatKesulitan
            };
        });

        res.json({
            ujian: { nama_ujian: ujian.nama_ujian, total_peserta: totalSiswa },
            analisis: hasilAnalisis
        });

    } catch (error) {
        console.error("[ERROR ITEM ANALYSIS]", error);
        res.status(500).json({ msg: "Gagal memuat analisis soal" });
    }
};

module.exports = {
    getAllUjian,
    createUjian,
    deleteUjian,
    refreshToken,
    startUjian,
    getExamsForStudent,
    submitUjian,
    getExamResults,
    getExamHistory,
    getStudentResultDetail,
    saveKoreksi,
    exportNilai,
    resetUjianSiswa,
    getExamStatus,
    logViolation,
    getEssayCandidates,
    getStudentEssays,
    saveEssayScore,
    forceAkhiriUjian,
    forceSubmitSiswa,
    updateProgress,
    updateUjian,
    getItemAnalysis
};