import api from '@/api/axios'

export default {
  getAll(params) {
    return api.get('/students', { params }) 
  },
  getClasses() {
    return api.get('/students/classes')
  },
  create(data) { 
  return api.post('/students', data)
  },
  update(id, data) {
    return api.put(`/students/${id}`, data)
  },
  bulkDelete: (ids) => 
    api.post('/students/bulk-delete', { ids }
  ),
  delete(id) {
    return api.delete(`/students/${id}`)
  },
  importData(data) {
    return api.post('/students/import', { students: data })
  }
}