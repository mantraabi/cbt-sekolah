import api from '@/api/axios'

export default {
  get() { return api.get('/settings') },
  update(formData) {
    // Pakai header multipart untuk upload file
    return api.put('/settings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}