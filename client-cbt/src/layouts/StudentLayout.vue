<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import authApi from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { PhStudent, PhSignOut, PhLockKey, PhSquaresFour, PhCaretDown } from '@phosphor-icons/vue'

const router = useRouter()
const user = ref({
  nama_lengkap: 'Siswa',
  username: '',
  kelas: ''
})

const fetchUser = async () => {
  try {
    const localUser = localStorage.getItem('user')
    if (localUser) {
      user.value = JSON.parse(localUser)
    }

    const res = await authApi.getMe()
    user.value = res.data
    
    localStorage.setItem('user', JSON.stringify(res.data))
  } catch (error) {
    console.error("Gagal load user info")
    if (error.response?.status === 401) handleLogout()
  }
}

// PERBAIKAN: Fungsi Logout Siswa (BUG #15 & #17 FIX)
const handleLogout = () => {
  // Clear Pinia state juga
  const authStore = useAuthStore()
  authStore.logout() // Sudah hapus token + user dari Pinia + localStorage

  // Redirect ke Login secara paksa agar cache browser bersih
  window.location.href = '/'
}

const getInitials = (name) => {
  if (!name) return 'S'
  const parts = name.split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

onMounted(() => {
  fetchUser()
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 font-sans">
    
    <header class="bg-white border-b h-16 sticky top-0 z-50 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        
        <div class="flex items-center gap-2 cursor-pointer" @click="router.push('/student/dashboard')">
          <div class="bg-blue-600 text-white p-1.5 rounded-lg">
            <PhStudent weight="bold" class="text-xl" />
          </div>
          <span class="font-bold text-xl text-slate-800 tracking-tight">Dashboard Siswa</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" class="flex items-center gap-2 h-auto py-1 px-2 hover:bg-slate-100 rounded-full transition-colors">

              <Avatar class="h-9 w-9 border border-slate-200">
                <AvatarImage src="" /> <AvatarFallback class="bg-blue-100 text-blue-700 font-bold text-xs">
                  {{ getInitials(user.nama_lengkap) }}
                </AvatarFallback>
              </Avatar>
              
              <PhCaretDown class="text-slate-400 text-xs" />
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end" class="w-56">
            <DropdownMenuLabel>
              <div class="font-normal text-xs text-slate-500">Login sebagai</div>
              <div class="font-bold text-slate-800 truncate">{{ user.nama_lengkap }}</div>
              <div class="text-xs text-blue-600 font-medium">Kelas {{ user.kelas || '-' }}</div>
            </DropdownMenuLabel>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem @click="router.push('/student/dashboard')">
              <PhSquaresFour class="mr-2 h-4 w-4" /> Dashboard
            </DropdownMenuItem>
            
            <DropdownMenuItem @click="router.push('/student/change-password')">
              <PhLockKey class="mr-2 h-4 w-4" /> Ganti Password
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem class="text-red-600 focus:text-red-600 focus:bg-red-50" @click="handleLogout">
              <PhSignOut class="mr-2 h-4 w-4" /> Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>

    <main class="max-w-7xl mx-auto p-4 md:p-8">
      <RouterView />
    </main>
    
  </div>
</template>