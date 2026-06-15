// client-cbt/src/api/bankSoal.js

import api from '@/api/axios'

export default {
  // REVISI: Tambahkan parameter 'params' disini
  getAll(params) {
    // Axios mengirim query string via properti 'params'
    // Contoh hasil: /bank-soal?page=1&mapel_id=5&tipe_soal=pg
    return api.get('/bank-soal', { params }) 
  },

  // Tambah soal (PENTING: Pakai FormData karena ada file)
  create(data) {
    return api.post('/bank-soal', data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  // Hapus soal
  delete(id) {
    return api.delete(`/bank-soal/${id}`)
  },

  importSoal(data) { 
      return api.post('/bank-soal/import', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
      }) 
  },
  
  update(id, data) { 
    return api.put(`/bank-soal/${id}`, data) 
  },
  // Hapus Massal
  bulkDelete: (ids) => api.post('/bank-soal/bulk-delete', { ids }),
  
  // Export Excel
  exportSoal: (params) => api.get('/bank-soal/export', { 
    params, 
    responseType: 'blob' 
  }),
}