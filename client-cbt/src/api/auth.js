// File: client-cbt/src/api/auth.js
import api from '@/api/axios'

export default {
  // Login
  login(credentials) { 
    return api.post('/auth/login', credentials) 
  },
  
  // Cek User sedang login (Get Me)
  getMe() { 
    return api.get('/auth/me') 
  },
  
  // Ganti Password (Fitur Baru)
  changePassword(data) { 
    return api.post('/auth/change-password', data) 
  } 
}