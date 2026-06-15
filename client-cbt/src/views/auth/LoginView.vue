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
                      <a href="https://t.me/cbtlisensiBot" target="_blank" rel="noopener noreferrer"
                         class="flex items-center gap-2 text-blue-300 hover:text-blue-200 transition-colors">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                        @cbtlisensiBot
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
          <a href="https://t.me/cbtlisensiBot" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-700 hover:underline font-medium transition-colors">
            Telegram
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