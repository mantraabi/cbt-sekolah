<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth' 
import examApi from '@/api/exam'
import subjectApi from '@/api/subject'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription
} from '@/components/ui/dialog'
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'vue-sonner'
import { 
  PhPlus, PhTrash, PhCalendarCheck, PhClock, PhCopy, PhDesktop, 
  PhPencilSimple, PhArrowsClockwise, PhClipboardText, PhFunnel, 
  PhCaretLeft, PhCaretRight 
} from '@phosphor-icons/vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore() 

// FUNGSI SAKTI: Cek apakah URL saat ini diawali dengan '/admin'
const isAdminRoute = computed(() => route.path.startsWith('/admin'))

const exams = ref([])
const subjects = ref([])
const loading = ref(true)
const dialogOpen = ref(false)
const isEditMode = ref(false)
const editId = ref(null)

const filters = ref({
    mapel_id: 'ALL', kelas: 'ALL', page: 1, limit: 10
})
const paginationInfo = ref({ totalItems: 0, totalPages: 1 })

const kelasOptions = computed(() => {
    const classes = subjects.value.map(m => m.kelas)
    return [...new Set(classes)].sort((a, b) => a - b)
})

const form = ref({
    nama_ujian: '', jenis_ujian: 'UAS', mapel_id: '',
    tgl_mulai: '', tgl_selesai: '', durasi_menit: 60, acak_soal: true
})

const fetchData = async () => {
    loading.value = true
    try {
        if (subjects.value.length === 0) {
            const resSubjects = await subjectApi.getAll({ limit: 10000 })
            subjects.value = resSubjects.data.data ? resSubjects.data.data : resSubjects.data
        }

        const resExams = await examApi.getAll(filters.value)
        
        if (resExams.data.data) {
            exams.value = resExams.data.data
            paginationInfo.value = { 
                totalItems: resExams.data.totalItems, 
                totalPages: resExams.data.totalPages 
            }
        } else {
            exams.value = resExams.data
        }
    } catch (error) {
        toast.error("Gagal memuat data")
    } finally {
        loading.value = false
    }
}

watch(() => [filters.value.mapel_id, filters.value.kelas], () => {
    filters.value.page = 1
    fetchData()
})
watch(() => filters.value.page, () => fetchData())

const getStatus = (exam) => {
    const now = new Date()
    const start = new Date(exam.tgl_mulai)
    const end = new Date(exam.tgl_selesai)
    if (now < start) return { label: 'Dijadwalkan', color: 'bg-yellow-100 text-yellow-800' }
    if (now > end) return { label: 'Selesai', color: 'bg-red-100 text-red-800' }
    return { label: 'Aktif', color: 'bg-green-100 text-green-800' }
}

const openEdit = (exam) => {
    isEditMode.value = true
    editId.value = exam.id
    const formatDateTime = (dateString) => {
        if(!dateString) return ''
        const d = new Date(dateString)
        return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)
    }
    form.value = {
        nama_ujian: exam.nama_ujian, jenis_ujian: exam.jenis_ujian,
        mapel_id: String(exam.mapel_id), tgl_mulai: formatDateTime(exam.tgl_mulai),
        tgl_selesai: formatDateTime(exam.tgl_selesai), durasi_menit: exam.durasi_menit,
        acak_soal: exam.acak_soal !== false
    }
    dialogOpen.value = true
}

const handleSubmit = async () => {
    if (!form.value.nama_ujian || !form.value.mapel_id || !form.value.tgl_mulai || !form.value.tgl_selesai) {
        return toast.error("Semua field wajib diisi!")
    }
    if (new Date(form.value.tgl_selesai) <= new Date(form.value.tgl_mulai)) {
        return toast.error("Tanggal selesai harus setelah tanggal mulai!")
    }
    try {
        if (isEditMode.value) {
            await examApi.update(editId.value, form.value)
            toast.success("Jadwal diperbarui")
        } else {
            await examApi.create(form.value)
            toast.success("Ujian dijadwalkan")
        }
        dialogOpen.value = false
        resetForm()
        fetchData()
    } catch (error) { toast.error(error.response?.data?.msg || "Gagal menyimpan") }
}

const deleteExam = async (id) => {
    if(!confirm("Yakin hapus jadwal ujian ini?")) return
    try { await examApi.delete(id); toast.success("Jadwal dihapus"); fetchData() } 
    catch (error) { toast.error(error.response?.data?.msg || "Gagal menghapus jadwal") }
}

const handleRefreshToken = async (id) => {
    if(!confirm("Ubah token ujian ini? Siswa yang belum login harus menggunakan token baru.")) return
    try { await examApi.refreshToken(id); toast.success("Token diperbarui!"); fetchData() } 
    catch (error) { toast.error("Gagal memperbarui token") }
}

const copyToken = (token) => { navigator.clipboard.writeText(token); toast.success(`Token ${token} disalin!`) }

const resetForm = () => {
    isEditMode.value = false; editId.value = null
    form.value = { nama_ujian: '', jenis_ujian: 'UAS', mapel_id: '', tgl_mulai: '', tgl_selesai: '', durasi_menit: 60, acak_soal: true }
}

const akhiriUjian = async (id) => {
    if(!confirm("Yakin ingin mengakhiri ujian ini sekarang? Waktu selesai akan diubah ke saat ini.")) return;
    try { await examApi.forceClose(id); toast.success("Ujian ditutup!"); fetchData() } 
    catch (error) { toast.error("Gagal mengakhiri ujian") }
}

// FUNGSI CERDAS YANG BARU: Mengecek langsung dari URL saat ini
const goToMonitoring = (examId) => {
    // Karena isAdminRoute adalah 'computed', kita harus pakai .value di JavaScript
    if (isAdminRoute.value) {
        // Jika asalnya dari URL /admin, buang ke Admin
        router.push(`/admin/monitoring/${examId}`)
    } else {
        // Jika asalnya dari URL /pengawas, buang ke Pengawas
        router.push(`/pengawas/monitoring/${examId}`)
    }
}

onMounted(() => fetchData())
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-4 bg-white p-4 rounded-lg shadow-sm border">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 class="text-2xl font-bold flex items-center gap-2">
                    <PhCalendarCheck class="text-blue-600" /> Jadwal Ujian
                </h2>
                <p class="text-slate-500">Atur waktu pelaksanaan ujian untuk siswa.</p>
            </div>
            
            <Dialog v-model:open="dialogOpen" v-if="isAdminRoute">
                <DialogTrigger as-child>
                    <Button @click="resetForm"><PhPlus class="mr-2" /> Buat Jadwal Ujian</Button>
                </DialogTrigger>
                <DialogContent class="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{{ isEditMode ? 'Edit Jadwal Ujian' : 'Buat Jadwal Baru' }}</DialogTitle>
                        <DialogDescription>Isi formulir di bawah ini untuk mengatur jadwal.</DialogDescription>
                    </DialogHeader>
                    <div class="space-y-4 py-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div class="col-span-2 md:col-span-1">
                                <Label>Nama Ujian</Label>
                                <Input v-model="form.nama_ujian" placeholder="Contoh: UAS Matematika" />
                            </div>
                            <div class="col-span-2 md:col-span-1">
                                <Label>Jenis Ujian</Label>
                                <Select v-model="form.jenis_ujian">
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="UH">Ulangan Harian</SelectItem>
                                        <SelectItem value="UTS">UTS</SelectItem>
                                        <SelectItem value="UAS">UAS</SelectItem>
                                        <SelectItem value="TO">Tryout</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div class="space-y-2">
                            <Label>Mata Pelajaran (Kelas)</Label>
                            <Select v-model="form.mapel_id">
                                <SelectTrigger><SelectValue placeholder="Pilih Mapel" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem v-for="m in subjects" :key="m.id" :value="String(m.id)">
                                        {{ m.nama_mapel }} ({{ m.kelas }})
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div><Label>Waktu Mulai</Label><Input type="datetime-local" v-model="form.tgl_mulai" /></div>
                            <div><Label>Waktu Selesai</Label><Input type="datetime-local" v-model="form.tgl_selesai" /></div>
                        </div>
                        <div class="space-y-2">
                            <Label>Durasi (Menit)</Label>
                            <div class="flex items-center gap-2">
                                <PhClock class="text-slate-400" />
                                <Input type="number" v-model="form.durasi_menit" min="10" />
                            </div>
                        </div>
                        <div class="flex items-center gap-3 p-3 border rounded-lg bg-blue-50 mt-2">
                            <input type="checkbox" id="acak_soal" v-model="form.acak_soal" class="w-5 h-5 text-blue-600 rounded cursor-pointer" />
                            <div>
                                <Label for="acak_soal" class="font-bold text-blue-800 cursor-pointer text-sm">Acak Urutan Soal</Label>
                                <p class="text-xs text-blue-600/80 mt-0.5">Setiap siswa akan mendapatkan urutan soal berbeda.</p>
                            </div>
                        </div>
                        <Button class="w-full mt-4" @click="handleSubmit">Simpan Jadwal</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>

        <div class="flex flex-wrap items-center gap-3 pt-2 border-t mt-2">
            <span class="text-sm font-medium text-slate-500 flex items-center gap-1"><PhFunnel /> Filter:</span>
            
            <Select v-model="filters.mapel_id">
                <SelectTrigger class="w-[220px] h-9 bg-slate-50">
                    <SelectValue placeholder="Semua Mapel" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL">Semua Mata Pelajaran</SelectItem>
                    <SelectItem v-for="m in subjects" :key="m.id" :value="String(m.id)">{{ m.nama_mapel }} ({{ m.kelas }})</SelectItem>
                </SelectContent>
            </Select>

            <Select v-model="filters.kelas">
                <SelectTrigger class="w-[150px] h-9 bg-slate-50">
                    <SelectValue placeholder="Semua Kelas" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL">Semua Kelas</SelectItem>
                    <SelectItem v-for="k in kelasOptions" :key="k" :value="k">Kelas {{ k }}</SelectItem>
                </SelectContent>
            </Select>
        </div>
    </div>

    <div class="border rounded-lg bg-white overflow-hidden shadow-sm flex flex-col">
        <Table>
            <TableHeader class="bg-slate-50">
                <TableRow>
                    <TableHead>Nama Ujian</TableHead>
                    <TableHead>Mapel</TableHead>
                    <TableHead class="text-center">Token</TableHead>
                    <TableHead>Waktu</TableHead>
                    <TableHead class="text-center">Status</TableHead>
                    <TableHead class="text-right">Aksi</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow v-if="loading">
                    <TableCell colspan="6" class="text-center py-10 text-slate-500">Memuat data...</TableCell>
                </TableRow>
                <TableRow v-else-if="exams.length === 0">
                    <TableCell colspan="6" class="text-center py-10 text-slate-500">Tidak ada jadwal ujian yang sesuai.</TableCell>
                </TableRow>
                
                <TableRow v-else v-for="exam in exams" :key="exam.id">
                    <TableCell>
                        <div class="font-bold">{{ exam.nama_ujian }}</div>
                        <span class="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{{ exam.jenis_ujian }}</span>
                    </TableCell>
                    <TableCell>
                        {{ exam.mata_pelajaran?.nama_mapel }} <br>
                        <span class="text-xs text-slate-400 font-medium">Kelas {{ exam.mata_pelajaran?.kelas }}</span>
                    </TableCell>
                    <TableCell class="text-center">
                        <div class="flex items-center justify-center gap-1">
                            <Badge variant="outline" class="font-mono text-lg tracking-widest bg-slate-50 mr-1">{{ exam.token }}</Badge>
                            
                            <Button variant="ghost" size="icon" class="h-6 w-6 text-slate-500" @click="copyToken(exam.token)" title="Salin Token">
                                <PhCopy />
                            </Button>

                            <Button v-if="isAdminRoute" variant="ghost" size="icon" class="h-6 w-6 text-blue-500" @click="handleRefreshToken(exam.id)" title="Acak Token Baru">
                                <PhArrowsClockwise />
                            </Button>
                        </div>
                    </TableCell>
                    <TableCell class="text-sm">
                        <div class="text-green-600 font-medium">{{ new Date(exam.tgl_mulai).toLocaleString() }}</div>
                        <div class="text-slate-500 text-xs mt-1">Durasi: {{ exam.durasi_menit }} Menit</div>
                    </TableCell>
                    <TableCell class="text-center">
                        <Badge :class="getStatus(exam).color">{{ getStatus(exam).label }}</Badge>
                    </TableCell>
                    <TableCell class="text-right">
                        <div class="flex items-center justify-end gap-2">
                            
                            <Button variant="outline" size="sm" class="h-8 border-blue-200 text-blue-700 hover:bg-blue-50" @click="goToMonitoring(exam.id)" title="Pantau Ujian Live">
                                <PhDesktop class="mr-2 h-4 w-4" /> Monitoring
                            </Button>
                            
                            <template v-if="isAdminRoute">
                                <Button variant="outline" size="sm" class="h-8 border-yellow-300 text-yellow-700 hover:bg-yellow-50" @click="openEdit(exam)" title="Edit Jadwal">
                                    <PhPencilSimple class="h-4 w-4" /> Edit
                                </Button>
                                <Button variant="outline" size="sm" class="h-8 border-green-500 text-green-700 hover:bg-green-50" @click="router.push(`/admin/exams/${exam.id}/results`)">
                                    <PhClipboardText class="mr-1.5 h-4 w-4" weight="bold" /> Hasil
                                </Button>
                                <Button variant="destructive" size="sm" class="h-8" @click="akhiriUjian(exam.id)" title="Akhiri ujian secara paksa">
                                    Akhiri Ujian
                                </Button>
                                <Button variant="ghost" size="icon" class="text-red-500 hover:bg-red-50 h-8 w-8" @click="deleteExam(exam.id)">
                                    <PhTrash />
                                </Button>
                            </template>

                        </div>
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>

        <div class="flex items-center justify-between p-4 border-t bg-slate-50">
            <div class="text-sm text-slate-500">
                Halaman {{ filters.page }} dari {{ paginationInfo.totalPages }} (Total {{ paginationInfo.totalItems }} Jadwal)
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