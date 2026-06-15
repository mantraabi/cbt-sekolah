import api from '@/api/axios'

export default {
  downloadBackup() {
    return api.get('/system/backup', { responseType: 'blob' }) // blob penting untuk download file
  },
  restore(formData) {
    return api.post('/system/restore', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}