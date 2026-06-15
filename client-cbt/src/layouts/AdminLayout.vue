<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import authApi from '@/api/auth' // <--- IMPORT AUTH API SEPERTI MILIK SISWA
import { Button } from '@/components/ui/button'
import { 
  PhSquaresFour, PhFiles, PhCalendarCheck, PhChartBar, PhSignOut,
  PhStudent, PhBookBookmark, PhGear, PhIdentificationCard,
  PhDatabase, PhInfo, PhUsers
} from '@phosphor-icons/vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// Daftar SEMUA Menu
const menus = [
  { name: 'Dashboard', path: '/admin/dashboard', icon: PhSquaresFour },
  { name: 'Bank Soal', path: '/admin/bank-soal', icon: PhFiles },
  { name: 'Jadwal Ujian', path: '/admin/exams', icon: PhCalendarCheck },
  { name: 'Rekap Nilai', path: '/admin/rekap-nilai', icon: PhChartBar },
  { name: 'Data Siswa', path: '/admin/students', icon: PhStudent },
  { name: 'Data Pengguna', path: '/admin/users', icon: PhUsers },
  { name: 'Cetak Kartu', path: '/admin/cetak-kartu', icon: PhIdentificationCard },
  { name: 'Data Akademik', path: '/admin/academic', icon: PhBookBookmark },
  { name: 'Pengaturan', path: '/admin/settings', icon: PhGear },
  { name: 'Maintenance', path: '/admin/maintenance', icon: PhDatabase },
  { name: 'Informasi', path: '/admin/changelog', icon: PhInfo}
]

// 🛡️ FILTER MENU BERDASARKAN ROLE 🛡️
const filteredMenus = computed(() => {
  const role = authStore.user?.role?.toLowerCase();
  
  if (role === 'guru') {
    const allowedForGuru = ['Dashboard', 'Bank Soal', 'Jadwal Ujian', 'Rekap Nilai', 'Informasi'];
    return menus.filter(m => allowedForGuru.includes(m.name));
  }
  return menus;
})

const isMenuActive = (menuPath) => {
    return route.path.startsWith(menuPath)
}

const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  authStore.logout()
  window.location.href = '/' 
}

// +++ JURUS ANTI-AMNESIA SUPER AMPUH +++
onMounted(async () => {
    // 1. Coba baca dari memori lokal dulu biar layar tidak kedip
    const localUser = localStorage.getItem('user')
    if (localUser && localUser !== 'undefined') {
        try {
            authStore.user = { ...authStore.user, ...JSON.parse(localUser) }
        } catch(e) {}
    }

    // 2. Tarik data profil paling fresh dari Backend (pasti berhasil dapat nama lengkap!)
    try {
        const res = await authApi.getMe()
        if (res.data) {
            authStore.user = res.data // Kirim data ke Pinia (otomatis Dashboard ikut update!)
            localStorage.setItem('user', JSON.stringify(res.data)) // Simpan ke memori
        }
    } catch (error) {
        console.error("Gagal menarik data profil terbaru")
    }
})
</script>

<template>
  <div class="flex h-screen bg-slate-50 font-sans">
    
    <aside class="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full z-10">
      <div class="h-16 flex items-center px-6 border-b border-slate-100">
        <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
            <PhFiles class="text-white text-xl" weight="bold" />
        </div>
        <span class="font-bold text-lg text-slate-800 tracking-tight">CBT Sekolah</span>
      </div>

      <nav class="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <router-link 
          v-for="menu in filteredMenus" 
          :key="menu.path" 
          :to="menu.path"
          class="flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors"
          :class="isMenuActive(menu.path) ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'"
        >
          <component :is="menu.icon" class="mr-3 text-lg" :weight="isMenuActive(menu.path) ? 'fill' : 'regular'" />
          {{ menu.name }}
        </router-link>
      </nav>

      <div class="p-4 border-t border-slate-100">
        <Button variant="ghost" class="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" @click="handleLogout">
          <PhSignOut class="mr-2 text-lg" />
          Keluar
        </Button>
      </div>
    </aside>

    <main class="flex-1 ml-64 flex flex-col min-h-screen">
      <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
        <h2 class="text-lg font-semibold text-slate-800 capitalize">
          {{ menus.find(m => route.path.startsWith(m.path))?.name || 'Panel' }}
        </h2>
        
        <div class="flex items-center gap-3">
            <div class="text-right hidden md:block">
                <p class="text-sm font-medium text-slate-900">{{ authStore.user?.nama_lengkap || authStore.user?.username || 'Pengguna' }}</p>
                <p class="text-xs font-bold capitalize" :class="authStore.user?.role === 'guru' ? 'text-blue-600' : 'text-slate-500'">
                  {{ authStore.user?.role || '' }}
                </p>
            </div>
            <div class="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold border border-slate-200">
                {{ authStore.user?.nama_lengkap?.charAt(0) || 'U' }}
            </div>
        </div>
      </header>

      <div class="p-8 overflow-auto">
        <router-view />
      </div>
    </main>
  </div>
</template>