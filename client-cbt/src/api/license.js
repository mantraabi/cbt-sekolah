// src/api/license.js
import api from '@/api/axios'

export default {
  // Cek status lisensi (admin)
  getStatus() {
    return api.get('/license/status')
  },
  // Aktifkan lisensi
  activate(license_key) {
    return api.post('/license/activate', { license_key })
  },
  // Hapus lisensi
  deactivate() {
    return api.delete('/license/deactivate')
  },
  getFeatures() {
    return api.get('/license/features')
  }
}
