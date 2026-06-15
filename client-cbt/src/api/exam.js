import api from '@/api/axios'

export default {
  // --- ADMIN: KELOLA JADWAL ---
  
  // Ambil semua jadwal (Admin) dengan Pagination & Filter
  getAll(params) {
    return api.get('/exams', { params })
  },

  // Buat jadwal baru
  create(data) {
    return api.post('/exams', data)
  },

  // Update/Edit jadwal (INI YANG BARU DITAMBAHKAN)
  update(id, data) {
    return api.put(`/exams/${id}`, data)
  },

  // Hapus jadwal
  delete(id) {
    return api.delete(`/exams/${id}`)
  },

  // Ganti token (Refresh)
  refreshToken(id) {
    return api.put(`/exams/${id}/refresh-token`)
  },

  // Export Nilai ke Excel
  exportGrades(examId) {
    return api.get(`/exams/${examId}/export`, {
      responseType: 'blob' // PENTING: Agar respon dianggap sebagai file
    })
  },

  // Reset Ujian Siswa
  resetExamStudent(nilaiId) {
    return api.delete(`/exams/reset/${nilaiId}`)
  },

  // Paksa Submit / Akhiri ujian untuk 1 siswa
  forceSubmitStudent(nilaiId) {
    return api.post(`/exams/force-submit/${nilaiId}`)
  },

  // Monitoring Ujian (Status & Pelanggaran)
  getMonitoring(id) {
    return api.get(`/exams/${id}/monitoring`)
  },

  // Laporkan Pelanggaran Ujian
  reportViolation(ujian_id) {
    return api.post('/exams/violation', { ujian_id })
  },

  // Force Close Ujian (Admin)
  forceClose(id) {
    return api.post(`/exams/${id}/force-close`)
  },

  // --- ADMIN: KOREKSI ESAI ---

  // Ambil Daftar Siswa yang Perlu Dikoreksi (Esai) 
  getCandidates(ujian_id) {
    return api.get(`/exams/${ujian_id}/candidates`)
  },
  // Ambil Detail Jawaban Esai Siswa untuk Dikoreksi
  getStudentEssays(nilai_id) {
    return api.get(`/exams/correction/${nilai_id}`)
  },
  // Simpan Skor Esai & Hitung Ulang Nilai Total
  saveEssayScore(data) {
    return api.post('/exams/correction/save', data)
  },


  // --- SISWA: UJIAN ---

  // Ambil Daftar Ujian di Dashboard Siswa
  getStudentExams() {
    return api.get('/exams/student')
  },

  // Mulai Ujian (Validasi Token)
  // Payload: { token: "ABCDEF" }
  startExam(id, token) { 
    return api.post(`/exams/${id}/start`, { token: token }) 
  },
  
  // Kirim Jawaban (Finish)
  // UPDATE PENTING DI SINI:
  // Endpoint backend adalah '/exams/submit', bukan '/exams/:id/finish'
  // Data yang dikirim harus object: { ujian_id, jawaban_siswa }
  submitExam(data) {
    return api.post('/exams/submit', data)
  },


  // --- ADMIN: HASIL & KOREKSI ---

  // Ambil Riwayat Ujian (List untuk menu Hasil)
  getHistory(params) {
    return api.get('/exams/history', { params })
  },

  // Ambil Rekap Nilai per Ujian (Tabel Nilai Siswa)
  getResults(examId) {
    return api.get(`/exams/${examId}/results`)
  },

  // Ambil Detail Jawaban Satu Siswa (Untuk dikoreksi)
  getStudentResult(nilaiId) {
    return api.get(`/exams/koreksi/${nilaiId}`)
  },
  
  // Simpan Koreksi Manual (Esai)
  saveCorrection(nilaiId, correctionData) {
    return api.post(`/exams/koreksi/${nilaiId}`, { koreksi: correctionData })
  }
}