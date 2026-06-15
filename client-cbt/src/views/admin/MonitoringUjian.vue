<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import examApi from '@/api/exam'
import { toast } from 'vue-sonner'
import { PhDesktop, PhCheckCircle, PhWarning, PhStopCircle, PhUsers, PhUserMinus, PhArrowLeft } from '@phosphor-icons/vue' 
import { Button } from '@/components/ui/button'

// +++ IMPORT SOCKET.IO CLIENT +++
import { io } from 'socket.io-client'

const route = useRoute()
const router = useRouter()

const participants = ref([])
const stats = ref({ total_peserta: 0, sudah_login: 0, belum_login: 0, mengerjakan: 0, selesai: 0, idle: 0 })
const loading = ref(true)

// Variabel untuk menampung koneksi socket
let socket = null 

// Ambil URL Backend dari Environment
const backendUrl = import.meta.env.VITE_API_URL 
    ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') 
    : 'http://localhost:5000';

const fetchStatus = async () => {
    try {
        const res = await examApi.getMonitoring(route.params.id)
        participants.value = res.data.data      
        stats.value = res.data.statistik        
    } catch (e) {
        console.error("Gagal load monitoring")
    } finally {
        loading.value = false
    }
}

const handleReset = async (nilaiId, nama) => {
    if(!confirm(`Reset login siswa ${nama}? Data jawaban akan hilang.`)) return;
    try {
        await examApi.resetExamStudent(nilaiId)
        toast.success("Siswa di-reset")
        fetchStatus()
    } catch(e) {
        toast.error("Gagal")
    }
}

const handleForceSubmit = async (nilaiId, nama) => {
    if(!confirm(`Paksa selesai ujian untuk ${nama}?\n\nSistem akan menarik jawaban autosave terakhir dan menghitung nilainya sekarang juga.`)) return;
    try {
        await examApi.forceSubmitStudent(nilaiId)
        toast.success(`Ujian ${nama} berhasil disubmit paksa!`)
        fetchStatus()
    } catch(e) {
        toast.error("Gagal melakukan paksa submit")
    }
}

// FUNGSI KEMBALI AMAN (CERDAS MENGENALI ASAL ROLE)
const goBack = () => {
    // router.back() akan mengembalikan ke halaman sebelumnya (entah itu /admin/exams atau /pengawas/exams)
    router.back() 
}

onMounted(() => {
    // 1. Muat data awal
    fetchStatus()
    
    // 2. Buka Koneksi Socket ke Backend (BUG #18 FIX: Kirim auth token)
    socket = io(backendUrl, {
        auth: { token: localStorage.getItem('token') }
    })
    
    // 3. Masuk ke "Kamar" (Room) khusus ujian ini
    socket.emit('join_monitoring', route.params.id)
    
    // 4. Dengarkan Sinyal dari Backend (Tanpa perlu Polling/Refresh Manual)
    socket.on('refresh_monitoring', () => {
        fetchStatus() // Refresh hanya jika ada siswa login baru
    })
    
    socket.on('update_siswa', (data) => {
        fetchStatus() // Refresh hanya jika ada siswa menjawab/selesai
    })
})

onUnmounted(() => {
    // BERSIHKAN KONEKSI SAAT GURU PINDAH HALAMAN
    if (socket) {
        socket.emit('leave_monitoring', route.params.id)
        socket.disconnect()
    }
})
</script>

<template>
    <div class="space-y-6">
        
        <div class="flex flex-col md:flex-row gap-4 md:gap-0 justify-between items-start md:items-center bg-white p-4 rounded-lg border shadow-sm">
            
            <div class="flex items-center gap-4">
                <Button variant="outline" size="icon" @click="goBack">
                    <PhArrowLeft size="20" />
                </Button>
                <div>
                    <h2 class="text-2xl font-bold">Monitoring Ujian Live</h2>
                    <p class="text-slate-500 flex items-center text-sm">
                        Data diperbarui secara <span class="ml-2 font-bold text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-full text-xs flex items-center gap-1 animate-pulse"><div class="w-1.5 h-1.5 bg-green-600 rounded-full"></div> Real-Time</span>
                    </p>
                </div>
            </div>
            
            <div class="flex gap-4 text-sm font-medium">
                <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div> Mengerjakan</div>
                <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full bg-orange-400"></div> Idle/Putus</div>
                <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full bg-green-500"></div> Selesai</div>
            </div>
            
        </div>
        
        <div v-if="!loading" class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-white p-4 rounded-lg border shadow-sm flex items-center gap-4">
                <div class="p-3 bg-blue-50 text-blue-600 rounded-lg"><PhUsers size="24" weight="fill"/></div>
                <div><p class="text-sm text-slate-500 font-medium">Total Siswa</p><p class="text-2xl font-bold">{{ stats.total_peserta }}</p></div>
            </div>
            <div class="bg-white p-4 rounded-lg border shadow-sm flex items-center gap-4">
                <div class="p-3 bg-green-50 text-green-600 rounded-lg"><PhCheckCircle size="24" weight="fill"/></div>
                <div><p class="text-sm text-slate-500 font-medium">Sudah Login</p><p class="text-2xl font-bold text-green-600">{{ stats.sudah_login }}</p></div>
            </div>
            <div class="bg-white p-4 rounded-lg border shadow-sm flex items-center gap-4">
                <div class="p-3 bg-red-50 text-red-600 rounded-lg"><PhUserMinus size="24" weight="fill"/></div>
                <div><p class="text-sm text-slate-500 font-medium">Belum Login</p><p class="text-2xl font-bold text-red-600">{{ stats.belum_login }}</p></div>
            </div>
            <div class="bg-white p-4 rounded-lg border shadow-sm flex flex-col justify-center">
                <div class="flex justify-between text-sm mb-1"><span class="text-slate-500">Mengerjakan:</span> <span class="font-bold text-blue-600">{{ stats.mengerjakan }}</span></div>
                <div class="flex justify-between text-sm mb-1"><span class="text-slate-500">Selesai:</span> <span class="font-bold text-green-600">{{ stats.selesai }}</span></div>
                <div class="flex justify-between text-sm"><span class="text-slate-500">Idle/Putus:</span> <span class="font-bold text-orange-500">{{ stats.idle }}</span></div>
            </div>
        </div>

        <div v-if="loading" class="text-center py-10">Memuat data...</div>

        <div v-else class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div v-for="p in participants" :key="p.id" 
                class="border rounded-lg p-4 flex flex-col justify-between relative overflow-hidden transition-all bg-white"
                :class="{
                    'border-blue-300 ring-2 ring-blue-100': p.status === 'mengerjakan',
                    'border-green-300 bg-green-50': p.status === 'selesai',
                    'border-orange-300 bg-orange-50': p.status === 'idle'
                }"
            >
                <div class="absolute top-0 left-0 w-full h-1"
                    :class="{
                        'bg-blue-500': p.status === 'mengerjakan',
                        'bg-green-500': p.status === 'selesai',
                        'bg-orange-400': p.status === 'idle'
                    }"
                ></div>

                <div>
                    <div class="flex justify-between items-start">
                        <h3 class="font-bold truncate max-w-[120px]" :title="p.nama">{{ p.nama }}</h3>
                        
                        <div class="flex items-center gap-1">
                            <span v-if="p.pelanggaran > 0" 
                                  class="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-sm" 
                                  title="Jumlah Pelanggaran (Pindah Tab)">
                                {{ p.pelanggaran }}x
                            </span>

                            <PhCheckCircle v-if="p.status === 'selesai'" weight="fill" class="text-green-600"/>
                            <PhDesktop v-else-if="p.status === 'mengerjakan'" weight="fill" class="text-blue-600 animate-pulse"/>
                            <PhWarning v-else weight="fill" class="text-orange-500"/>
                        </div>
                    </div>
                    <p class="text-xs text-slate-500 mt-1">{{ p.username }} | {{ p.kelas }}</p>
                </div>

                <div class="mt-4 pt-2 border-t border-slate-200/50 flex justify-between items-center">
                    <div class="text-xs font-mono">
                        <span v-if="p.status === 'selesai'" class="font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded">
                            SELESAI
                        </span>
                        <span v-else class="text-slate-500">
                            Active: {{ new Date(p.last_active).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}
                        </span>
                    </div>
                    
                    <div class="flex gap-1" v-if="p.status !== 'selesai'">
                        <Button variant="outline" size="sm" class="h-6 px-2 text-xs text-blue-600 border-blue-200 hover:bg-blue-50" title="Paksa Selesai & Hitung Nilai" @click="handleForceSubmit(p.id, p.nama)">
                            <PhCheckCircle weight="bold" class="mr-1" /> Selesai
                        </Button>
                        <Button variant="ghost" size="icon" class="h-6 w-6 text-red-500 hover:bg-red-50" title="Reset Login Siswa (Hapus Data)" @click="handleReset(p.id, p.nama)">
                            <PhStopCircle weight="bold" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
        
        <div v-if="!loading && participants.length === 0" class="text-center py-10 text-slate-400 bg-slate-50 rounded-lg border border-dashed">
            Belum ada siswa yang login ke ujian ini.
        </div>
    </div>
</template>