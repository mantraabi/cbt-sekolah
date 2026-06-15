// src/api/subject.js

import api from '@/api/axios'

export default {
  // Ubah fungsi getAll() menjadi seperti ini:
  getAll(params) {
    return api.get('/subjects', { params })
  },
  
  // Tambah mapel baru (Opsional, untuk menu Data Akademik nanti)
  create(data) { 
    return api.post('/subjects', data) 
  },
  
  // Hapus mapel
  delete(id) { 
    return api.delete(`/subjects/${id}`) 
  }
}