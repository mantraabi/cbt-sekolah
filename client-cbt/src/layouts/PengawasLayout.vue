<script setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import authApi from '@/api/auth' // <--- IMPORT AUTH API
import { Button } from '@/components/ui/button'
import { PhShieldCheck, PhSignOut } from '@phosphor-icons/vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  authStore.logout()
  window.location.href = '/'
}

// +++ JURUS ANTI-AMNESIA SUPER AMPUH +++
onMounted(async () => {
    const localUser = localStorage.getItem('user')
    if (localUser && localUser !== 'undefined') {
        try {
            authStore.user = { ...authStore.user, ...JSON.parse(localUser) }
        } catch(e) {}
    }

    try {
        const res = await authApi.getMe()
        if (res.data) {
            authStore.user = res.data
            localStorage.setItem('user', JSON.stringify(res.data))
        }
    } catch (error) {
        console.error("Gagal menarik data profil terbaru")
    }
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 font-sans flex flex-col">
    
    <header class="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 sticky top-0 z-20 shadow-md">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
            <PhShieldCheck class="text-white text-2xl" weight="bold" />
        </div>
        <div>
            <h1 class="font-bold text-lg text-white tracking-tight leading-tight">Panel Pengawas</h1>
            <p class="text-xs text-slate-400">Sistem Monitoring Ujian</p>
        </div>
      </div>
      
      <div class="flex items-center gap-4">
        <div class="text-right hidden sm:block">
            <p class="text-sm font-medium text-white">{{ authStore.user?.nama_lengkap || authStore.user?.username || 'Pengguna' }}</p>
            <p class="text-xs text-green-400 font-bold capitalize">{{ authStore.user?.role || '' }}</p>
        </div>
        <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-800 font-bold border border-green-200">
            {{ authStore.user?.nama_lengkap?.charAt(0) || 'P' }}
        </div>
        
        <div class="w-px h-8 bg-slate-700 mx-2"></div>
        
        <Button variant="ghost" size="icon" class="text-red-400 hover:text-red-300 hover:bg-slate-800" @click="handleLogout" title="Keluar">
          <PhSignOut class="text-xl" />
        </Button>
      </div>
    </header>

    <main class="flex-1 p-4 md:p-8 overflow-auto w-full max-w-7xl mx-auto">
      <router-view />
    </main>

  </div>
</template>