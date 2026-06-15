<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import examApi from '@/api/exam'
import authApi from '@/api/auth' // <--- IMPORT PENTING
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'vue-sonner'
import { 
    PhClock, PhBookOpen, PhCalendarBlank, 
    PhStudent, PhLockKey, PhCheckCircle 
} from '@phosphor-icons/vue'

const router = useRouter()
const allExams = ref([])
const loading = ref(false)

// State User (Default kosong dulu)
const user = ref({
    nama_lengkap: 'Memuat...',
    kelas: '-',
    username: '-'
})

// 1. Fetch Data User Terbaru (FIX BUG NAMA HILANG)
const fetchUserProfile = async () => {
    try {
        // Coba ambil dari localStorage dulu biar cepat (Cache)
        const localUser = localStorage.getItem('user')
        if (localUser) {
            user.value = JSON.parse(localUser)
        }

        // TAPI, tetap panggil API untuk update data terbaru (Kelas/Nama mungkin berubah)
        const res = await authApi.getMe()
        user.value = res.data
        
        // Simpan update-an ke localStorage biar sinkron
        localStorage.setItem('user', JSON.stringify(res.data))
    } catch (error) {
        console.error("Gagal load profil", error)
        // Jika token expired, redirect login
        if(error.response?.status === 401) router.push('/login')
    }
}

// 2. Fetch Data Ujian
const fetchExams = async () => {
    loading.value = true
    try {
        const res = await examApi.getStudentExams()
        allExams.value = res.data
    } catch (error) {
        toast.error("Gagal memuat ujian")
    } finally {
        loading.value = false
    }
}

// --- COMPUTED ---
const historyExams = computed(() => allExams.value.filter(exam => exam.nilais && exam.nilais.length > 0))
const availableExams = computed(() => allExams.value.filter(exam => !exam.nilais || exam.nilais.length === 0))

const getExamStatus = (exam) => {
    const now = new Date()
    const start = new Date(exam.tgl_mulai)
    const end = new Date(exam.tgl_selesai)
    if (now < start) return { label: 'Belum Mulai', color: 'bg-yellow-100 text-yellow-800', canJoin: false }
    if (now > end) return { label: 'Terlewat', color: 'bg-red-100 text-red-800', canJoin: false }
    return { label: 'Berlangsung', color: 'bg-green-100 text-green-800', canJoin: true }
}

const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    })
}

const joinExam = (exam) => {
    router.push(`/student/exam/${exam.id}`)
}

onMounted(() => {
    fetchUserProfile() // <--- PANGGIL INI
    fetchExams()
})
</script>

<template>
  <div class="space-y-8 pb-10">
    
    <Card class="bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-none shadow-lg">
        <CardContent class="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div class="flex items-center gap-4">
                <div class="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl border-2 border-white/30 backdrop-blur-sm">
                    <PhStudent weight="fill" />
                </div>
                <div>
                    <h2 class="text-2xl font-bold">{{ user.nama_lengkap }}</h2>
                    <p class="text-blue-100 flex items-center gap-2 text-sm">
                        <span class="bg-blue-800/50 px-2 py-0.5 rounded">Kelas {{ user.kelas || '-' }}</span>
                        <span>•</span>
                        <span class="font-mono opacity-80">NIS: {{ user.username }}</span>
                    </p>
                </div>
            </div>

            <Button 
                variant="secondary" 
                class="bg-white/10 text-white hover:bg-white/20 border-white/20 shadow-none"
                @click="router.push('/student/change-password')"
            >
                <PhLockKey class="mr-2 h-4 w-4" /> Ganti Password
            </Button>
        </CardContent>
    </Card>

    <div>
        <h2 class="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <PhBookOpen class="text-blue-600" weight="duotone" />
            Ujian Tersedia
        </h2>

        <div v-if="loading" class="text-center py-10 text-slate-500">Memuat jadwal...</div>
        
        <div v-else-if="availableExams.length === 0" class="text-center py-10 bg-white rounded-lg border border-dashed text-slate-500">
            Tidak ada ujian aktif saat ini.
        </div>
        
        <div v-else class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card v-for="exam in availableExams" :key="exam.id" class="border-t-4 border-t-blue-500 hover:shadow-lg transition-all flex flex-col">
                <CardHeader>
                    <div class="flex justify-between items-start mb-2">
                        <Badge variant="secondary" class="bg-blue-50 text-blue-700 hover:bg-blue-100">
                            {{ exam.mata_pelajaran?.nama_mapel || 'Umum' }}
                        </Badge>
                        <span 
                            class="text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide"
                            :class="getExamStatus(exam).color"
                        >
                            {{ getExamStatus(exam).label }}
                        </span>
                    </div>
                    <CardTitle class="text-lg leading-snug text-slate-900 line-clamp-2">{{ exam.nama_ujian }}</CardTitle>
                    <div class="text-xs text-slate-400 mt-1">{{ exam.jenis_ujian }}</div>
                </CardHeader>
                
                <CardContent class="space-y-3 text-sm text-slate-600 flex-1">
                    <div class="flex items-center gap-2">
                        <PhClock weight="bold" class="text-slate-400" />
                        <span>Durasi: <b>{{ exam.durasi_menit }} Menit</b></span>
                    </div>
                    <div class="flex items-center gap-2">
                        <PhCalendarBlank weight="bold" class="text-slate-400" />
                        <div class="flex flex-col text-xs">
                            <span>Mulai: {{ formatDate(exam.tgl_mulai) }}</span>
                            <span>Batas: {{ formatDate(exam.tgl_selesai) }}</span>
                        </div>
                    </div>
                </CardContent>

                <CardFooter>
                    <Button 
                        class="w-full" 
                        :disabled="!getExamStatus(exam).canJoin"
                        @click="joinExam(exam)"
                    >
                        {{ getExamStatus(exam).canJoin ? 'Kerjakan Sekarang' : 'Belum Mulai / Terlewat' }}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    </div>

    <div v-if="historyExams.length > 0">
        <h2 class="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2 mt-8">
            <PhCheckCircle class="text-green-600" weight="duotone" />
            Riwayat Ujian Saya
        </h2>

        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card v-for="exam in historyExams" :key="exam.id + 'hist'" class="bg-slate-50 border-slate-200 opacity-90 hover:opacity-100 transition-opacity">
                <CardHeader class="pb-2">
                    <div class="flex justify-between items-start">
                        <h3 class="font-bold text-slate-700 line-clamp-1">{{ exam.nama_ujian }}</h3>
                        <Badge class="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Selesai</Badge>
                    </div>
                    <p class="text-xs text-slate-500">{{ exam.mata_pelajaran?.nama_mapel }}</p>
                </CardHeader>
                <CardContent>
                    <div class="flex items-center justify-between text-sm mt-2">
                        <span class="text-slate-500">Dikirim pada:</span>
                        <span class="font-medium">{{ formatDate(exam.nilais[0]?.createdAt) }}</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>

  </div>
</template>