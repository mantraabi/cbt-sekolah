<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/axios' 
import authApi from '@/api/auth' // <--- 1. IMPORT AUTH API
import { useAuthStore } from '@/stores/auth' 

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'vue-sonner'

const router = useRouter()
const authStore = useAuthStore() 

const form = ref({
  username: '',
  password: ''
})

const namaSekolah = ref('Memuat...') 
const logoSekolah = ref(null)

const backendUrl = import.meta.env.VITE_API_URL 
    ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') 
    : 'http://localhost:5000';

const handleLogin = async () => {
  try {
    // 1. Lakukan login (Dapat Token)
    await authStore.login(form.value)
    
    // +++ 2. JURUS ANTI NYASAR: Ambil Role Sebelum Pindah Halaman +++
    try {
        const res = await authApi.getMe()
        if (res.data) {
            authStore.user = res.data
            localStorage.setItem('user', JSON.stringify(res.data))
        }
    } catch (err) {
        console.error("Gagal memastikan role user", err)
    }

    toast.success("Login Berhasil", {
      description: "Selamat datang kembali!",
    })
    
    // 3. Sekarang role-nya pasti sudah ada!
    setTimeout(() => {
        const role = authStore.user?.role?.toLowerCase();
        
        if (role === 'admin' || role === 'guru') {
            router.push('/admin/dashboard'); 
        } else if (role === 'pengawas') {
            router.push('/pengawas/exams');
        } else {
            router.push('/student/dashboard');
        }
    }, 500);

  } catch (errorMessage) {
    toast.error("Gagal Masuk", {
      description: errorMessage,
    })
  }
}

const fetchSchoolInfo = async () => {
    try {
        const res = await api.get('/settings/public')
        
        if (res.data.nama_sekolah) {
            namaSekolah.value = res.data.nama_sekolah
            
            if (res.data.logo) {
                if (res.data.logo.startsWith('http')) {
                    logoSekolah.value = res.data.logo
                } else {
                    logoSekolah.value = `${backendUrl}/uploads/${res.data.logo}`
                }
            }
            
            document.title = `Login - ${res.data.nama_sekolah}`
        }
    } catch (error) {
        console.error("Gagal ambil info sekolah", error)
        namaSekolah.value = "Sistem Ujian CBT" 
    }
}

onMounted(() => {
    fetchSchoolInfo()
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-50 p-4 sm:p-8">
    <div class="flex flex-col gap-6 w-full max-w-5xl">
      <Card class="overflow-hidden p-0 shadow-2xl border-0 rounded-2xl">
        <CardContent class="grid p-0 md:grid-cols-2 min-h-[550px]">
          
          <form @submit.prevent="handleLogin" class="p-8 md:p-12 flex flex-col justify-center bg-white">
            <div class="grid gap-6">
              
              <div class="flex flex-col items-center gap-3 text-center mb-2">
                <div v-if="logoSekolah" class="flex justify-center mb-2">
                    <img 
                        :src="logoSekolah" 
                        alt="Logo Sekolah" 
                        class="h-20 w-auto object-contain drop-shadow-sm"
                        @error="logoSekolah = null" 
                    />
                </div>
                
                <h1 class="text-3xl font-bold text-slate-900">
                  {{ namaSekolah !== 'Memuat...' ? namaSekolah : 'Selamat Datang' }}
                </h1>
                <p class="text-slate-500 text-sm">
                  Silakan login untuk memulai ujian atau mengelola sistem.
                </p>
              </div>
              
              <div class="grid gap-2 text-left">
                <Label for="username">Username / NIS</Label>
                <Input
                  id="username"
                  v-model="form.username"
                  type="text"
                  placeholder="Masukkan username atau NIS"
                  required
                  class="h-11 bg-slate-50"
                />
              </div>
              
              <div class="grid gap-2 text-left">
                <div class="flex items-center justify-between">
                  <Label for="password">Password</Label>
                </div>
                <Input 
                  id="password" 
                  v-model="form.password" 
                  type="password" 
                  placeholder="••••••••" 
                  required 
                  class="h-11 bg-slate-50"
                />
              </div>
              
              <Button type="submit" class="w-full h-12 text-md mt-2 font-bold" :disabled="authStore.loading">
                <span v-if="authStore.loading">Memeriksa...</span>
                <span v-else>Masuk ke Sistem</span>
              </Button>
              
            </div>
          </form>

          <div class="bg-slate-100 relative hidden md:block">
            <img
              src="https://images.unsplash.com/photo-1652620364162-4c0a3387a0f0?q=80&w=1000&auto=format&fit=crop"
              alt="Background CBT"
              class="absolute inset-0 h-full w-full object-cover"
            >
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent flex items-end p-10">
               <div class="text-white">
                  <h2 class="text-3xl font-bold mb-3">Computer Based Test</h2>
                  <p class="text-slate-200 text-sm leading-relaxed max-w-sm">
                    Platform ujian berbasis komputer modern yang cepat, aman, dan dapat diandalkan untuk sekolah.
                  </p>
               </div>
            </div>
          </div>

        </CardContent>
      </Card>
      
      <div class="text-center text-xs text-slate-500 space-y-1">
        <div>&copy; {{ new Date().getFullYear() }} {{ namaSekolah !== 'Memuat...' ? namaSekolah : 'Sistem Ujian Online' }}. All rights reserved.</div>
        <div>
          Dikembangkan oleh 
          <a href="https://abimantra.my.id" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors">
            abimantra.my.id
          </a>
        </div>
      </div>
      
    </div>
  </div>
</template>