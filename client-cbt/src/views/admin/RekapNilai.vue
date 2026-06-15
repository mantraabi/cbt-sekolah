<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import examApi from '@/api/exam'
import subjectApi from '@/api/subject' // Tambahkan API Subject untuk list mapel
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select'
import { PhChartBar, PhFunnel, PhCaretLeft, PhCaretRight } from '@phosphor-icons/vue'

const router = useRouter()
const historyList = ref([])
const subjects = ref([])
const loading = ref(false)

// --- STATE PAGINATION & FILTER ---
const filters = ref({
    mapel_id: 'ALL', 
    kelas: 'ALL', 
    page: 1, 
    limit: 10
})
const paginationInfo = ref({ totalItems: 0, totalPages: 1 })

// Ekstrak daftar kelas unik dari data mata pelajaran
const kelasOptions = computed(() => [...new Set(subjects.value.map(m => m.kelas))].sort())

const fetchData = async () => {
    loading.value = true
    try {
        // PERBAIKAN: Kirim limit 10000 & tangkap format .data.data
        if (subjects.value.length === 0) {
            // #8 FIX: Jangan load 10000, cukup yang dibutuhkan untuk dropdown
            const resSubjects = await subjectApi.getAll({ limit: 500 })
            subjects.value = resSubjects.data.data ? resSubjects.data.data : resSubjects.data
        }

        const res = await examApi.getHistory(filters.value)
        
        if (res.data.data) {
            historyList.value = res.data.data
            paginationInfo.value = { 
                totalItems: res.data.totalItems, 
                totalPages: res.data.totalPages 
            }
        } else {
            historyList.value = res.data
        }
    } finally {
        loading.value = false
    }
}

// Watcher untuk Filter: Kembali ke hal 1 jika mapel/kelas diganti
watch(() => [filters.value.mapel_id, filters.value.kelas], () => {
    filters.value.page = 1
    fetchData()
})

// Watcher untuk Pagination: Fetch data jika halaman diganti
watch(() => filters.value.page, () => fetchData())

onMounted(() => fetchData())
</script>

<template>
    <div class="space-y-4">
        <div class="flex flex-col gap-4 bg-white p-4 rounded-lg shadow-sm border">
            <div>
                <h2 class="text-2xl font-bold flex items-center gap-2 text-slate-900">
                    <PhChartBar class="text-blue-600" weight="fill" /> Rekap Nilai
                </h2>
                <p class="text-slate-500 text-sm mt-1">Arsip hasil ujian yang telah selesai dilaksanakan.</p>
            </div>

            <div class="flex flex-wrap items-center gap-3 pt-2 border-t mt-2">
                <span class="text-sm font-medium text-slate-500 flex items-center gap-1">
                    <PhFunnel /> Filter:
                </span>
                
                <Select v-model="filters.mapel_id">
                    <SelectTrigger class="w-[220px] h-9 bg-slate-50">
                        <SelectValue placeholder="Semua Mapel" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Semua Mata Pelajaran</SelectItem>
                        <SelectItem v-for="m in subjects" :key="m.id" :value="String(m.id)">
                            {{ m.nama_mapel }} ({{ m.kelas }})
                        </SelectItem>
                    </SelectContent>
                </Select>

                <Select v-model="filters.kelas">
                    <SelectTrigger class="w-[150px] h-9 bg-slate-50">
                        <SelectValue placeholder="Semua Kelas" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Semua Kelas</SelectItem>
                        <SelectItem v-for="k in kelasOptions" :key="k" :value="k">{{ k }}</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        <div class="border rounded-lg bg-white overflow-hidden shadow-sm flex flex-col">
            <Table>
                <TableHeader class="bg-slate-50">
                    <TableRow>
                        <TableHead>Nama Ujian</TableHead>
                        <TableHead>Mapel & Kelas</TableHead>
                        <TableHead>Waktu Selesai</TableHead>
                        <TableHead class="text-center">Peserta Submit</TableHead>
                        <TableHead class="text-right">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-if="loading">
                        <TableCell colspan="5" class="text-center py-10 text-slate-500">Memuat data...</TableCell>
                    </TableRow>

                    <TableRow v-else-if="historyList.length === 0">
                        <TableCell colspan="5" class="text-center h-24 text-slate-500">Tidak ada riwayat ujian yang sesuai.</TableCell>
                    </TableRow>

                    <TableRow v-else v-for="item in historyList" :key="item.id">
                        <TableCell class="font-medium">
                            <div class="font-bold text-slate-800">{{ item.nama_ujian }}</div>
                            <Badge variant="secondary" class="mt-1 text-[10px]">{{ item.jenis_ujian }}</Badge>
                        </TableCell>
                        <TableCell>
                            {{ item.mapel }} <br>
                            <span class="text-xs text-slate-400 font-medium">Kelas {{ item.kelas }}</span>
                        </TableCell>
                        <TableCell class="text-sm text-slate-600">
                            {{ item.tgl_selesai ? new Date(item.tgl_selesai).toLocaleString('id-ID') : '-' }}
                        </TableCell>
                        <TableCell class="text-center">
                            <Badge variant="outline" class="bg-blue-50 text-blue-700 border-blue-200">
                                {{ item.jumlah_peserta }} Siswa
                            </Badge>
                        </TableCell>
                        <TableCell class="text-right">
                            <Button size="sm" class="bg-blue-600 hover:bg-blue-700 text-white" @click="router.push(`/admin/exams/${item.id}/results`)">
                                <PhChartBar class="mr-2" /> Detail Nilai
                            </Button>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>

            <div class="flex items-center justify-between p-4 border-t bg-slate-50">
                <div class="text-sm text-slate-500">
                    Halaman {{ filters.page }} dari {{ paginationInfo.totalPages }} (Total {{ paginationInfo.totalItems }} Riwayat)
                </div>
                <div class="flex items-center gap-2">
                    <Button variant="outline" size="sm" :disabled="filters.page <= 1" @click="filters.page--">
                        <PhCaretLeft class="mr-1" /> Prev
                    </Button>
                    <Button variant="outline" size="sm" :disabled="filters.page >= paginationInfo.totalPages" @click="filters.page++">
                        Next <PhCaretRight class="ml-1" />
                    </Button>
                </div>
            </div>
        </div>
    </div>
</template>