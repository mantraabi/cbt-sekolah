import api from '@/api/axios'

export default {
  getStats() {
    return api.get('/dashboard/stats')
  }
}