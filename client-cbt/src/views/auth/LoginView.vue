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
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent flex items-end p-10">
               <div class="text-white w-full">
                  <h2 class="text-3xl font-bold mb-3">Computer Based Test</h2>
                  <p class="text-slate-200 text-sm leading-relaxed max-w-sm mb-6">
                    Platform ujian berbasis komputer modern yang cepat, aman, dan dapat diandalkan untuk sekolah.
                  </p>
                  <div class="border-t border-white/20 pt-4 mt-4">
                    <p class="text-xs text-slate-300 uppercase tracking-wider mb-3 font-semibold">Ingin menggunakan CBT Sekolah?</p>
                    <div class="flex flex-col gap-2 text-sm">
                      <a href="https://wa.me/6287824223781" target="_blank" rel="noopener noreferrer"
                         class="flex items-center gap-2 text-green-300 hover:text-green-200 transition-colors">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        +62 878-2422-3781
                      </a>
                      <a href="https://abimantra.my.id" target="_blank" rel="noopener noreferrer"
                         class="flex items-center gap-2 text-blue-300 hover:text-blue-200 transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"/></svg>
                        abimantra.my.id
                      </a>
                    </div>
                  </div>
               </div>
            </div>
          </div>

        </CardContent>
      </Card>
      
      <div class="text-center text-xs text-slate-500 space-y-2">
        <div>&copy; {{ new Date().getFullYear() }} {{ namaSekolah !== 'Memuat...' ? namaSekolah : 'Sistem Ujian Online' }}. All rights reserved.</div>
        <div class="flex items-center justify-center gap-4">
          <a href="https://wa.me/6287824223781" target="_blank" rel="noopener noreferrer" class="text-green-600 hover:text-green-800 hover:underline font-medium transition-colors">
            WhatsApp
          </a>
          <span class="text-slate-300">|</span>
          <a href="https://abimantra.my.id" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors">
            Abi Creative
          </a>
          <span class="text-slate-300">|</span>
          <a href="https://github.com/mantraabi/cbt-sekolah" target="_blank" rel="noopener noreferrer" class="text-slate-600 hover:text-slate-800 hover:underline font-medium transition-colors">
            GitHub
          </a>
        </div>
      </div>
      
    </div>
  </div>
</template>