<script setup>
import { ref, onMounted, watch, computed } from 'vue'
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
import { toast } from 'vue-sonner'
import { 
    PhPlus, PhTrash, PhFunnel, PhMagnifyingGlass, PhCaretLeft, PhCaretRight, PhBookOpen 
} from '@phosphor-icons/vue'

const subjects = ref([])
const loading = ref(true)
const dialogOpen = ref(false)

// --- STATE PAGINATION & FILTER (JURUSAN DIHAPUS) ---
const filters = ref({
    search: '',
    kelas: 'ALL',
    page: 1,
    limit: 10
})
const paginationInfo = ref({ totalItems: 0, totalPages: 1 })

// Pilihan statis untuk filter kelas
const allSubjectsForFilter = ref([]) // Keranjang khusus untuk dropdown filter
const kelasOptions = computed(() => {
    // Ambil daftar kelas dari seluruh mapel, hapus duplikat, dan urutkan
    const classes = allSubjectsForFilter.value.map(m => m.kelas)
    return [...new Set(classes)].sort((a, b) => a - b) 
})

const form = ref({
    kode_mapel: '', 
    nama_mapel: '',
    kelas: '',
    jurusan: 'Semua' // Tetap ada untuk form tambah data, atau bisa dikosongkan jika tidak dipakai
})

const fetchData = async () => {
    loading.value = true
    try {
        // PERBAIKAN: Ambil referensi SELURUH mapel (sekali saja) untuk mengisi opsi dropdown kelas
        if (allSubjectsForFilter.value.length === 0) {
            const resAll = await subjectApi.getAll({ limit: 10000 })
            allSubjectsForFilter.value = resAll.data.data ? resAll.data.data : resAll.data
        }

        // Ambil data untuk TABEL dengan pagination yang aktif (sesuai filter)
        const res = await subjectApi.getAll(filters.value)
        
        if (res.data.data) {
            subjects.value = res.data.data
            paginationInfo.value = { 
                totalItems: res.data.totalItems, 
                totalPages: res.data.totalPages 
            }
        } else {
            subjects.value = res.data
        }
    } catch (error) {
        toast.error("Gagal memuat Data Akademik")
    } finally {
        loading.value = false
    }
}

// Watcher untuk Filter Kelas: Kembali ke hal 1 jika kelas diganti
watch(() => filters.value.kelas, () => {
    filters.value.page = 1
    fetchData()
})

// Pemicu pencarian manual
const handleSearch = () => {
    filters.value.page = 1
    fetchData()
}

// Watcher untuk Pagination
watch(() => filters.value.page, () => fetchData())

const handleSubmit = async () => {
    if(!form.value.kode_mapel || !form.value.nama_mapel || !form.value.kelas) {
        return toast.error("Kode, Nama, dan Kelas wajib diisi!")
    }
    
    try {
        await subjectApi.create(form.value)
        toast.success("Mapel ditambahkan")
        dialogOpen.value = false
        form.value = { kode_mapel: '', nama_mapel: '', kelas: '', jurusan: 'Semua' }
        fetchData()
    } catch (error) {
        const msg = error.response?.data?.msg || "Gagal menyimpan"
        toast.error(msg)
    }
}

const deleteItem = async (id) => {
    if(!confirm("Hapus mapel ini?")) return
    try {
        await subjectApi.delete(id)
        toast.success("Terhapus")
        fetchData()
    } catch (e) {
        toast.error("Gagal hapus")
    }
}

onMounted(() => fetchData())
</script>

<template>
    <div class="space-y-4">
        <div class="flex flex-col gap-4 bg-white p-4 rounded-lg shadow-sm border">
            <div class="flex justify-between items-start md:items-center">
                <div>
                    <h2 class="text-2xl font-bold flex items-center gap-2">
                        <PhBookOpen class="text-blue-600" /> Data Akademik
                    </h2>
                    <p class="text-slate-500">Manajemen Mata Pelajaran</p>
                </div>
                
                <Dialog v-model:open="dialogOpen">
                    <DialogTrigger as-child>
                        <Button><PhPlus class="mr-2" /> Tambah Mapel</Button>
                    </DialogTrigger>
                    
                    <DialogContent class="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Tambah Mata Pelajaran</DialogTitle>
                            <DialogDescription>Lengkapi data mata pelajaran baru.</DialogDescription>
                        </DialogHeader>

                        <div class="space-y-4 py-4">
                            <div class="space-y-2">
                                <Label>Kode Mapel <span class="text-red-500">*</span></Label>
                                <Input v-model="form.kode_mapel" placeholder="Contoh: MTK-10" />
                            </div>
                            <div class="space-y-2">
                                <Label>Nama Mapel <span class="text-red-500">*</span></Label>
                                <Input v-model="form.nama_mapel" placeholder="Contoh: Matematika Wajib" />
                            </div>
                            <div class="space-y-2">
                                <Label>Kelas (Angka) <span class="text-red-500">*</span></Label>
                                <Input type="number" v-model="form.kelas" placeholder="10 / 11 / 12" />
                            </div>
                            <div class="space-y-2">
                                <Label>Jurusan</Label>
                                <Input v-model="form.jurusan" placeholder="IPA / IPS / Semua" />
                            </div>
                            <Button class="w-full" @click="handleSubmit">Simpan</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div class="flex flex-wrap items-center gap-3 pt-2 border-t mt-2">
                <span class="text-sm font-medium text-slate-500 flex items-center gap-1">
                    <PhFunnel /> Filter:
                </span>

                <div class="flex items-center gap-2 max-w-[200px]">
                    <Input 
                        v-model="filters.search" 
                        placeholder="Cari mapel..." 
                        class="h-9 bg-slate-50"
                        @keyup.enter="handleSearch"
                    />
                    <Button variant="outline" size="icon" class="h-9 w-9 shrink-0" @click="handleSearch">
                        <PhMagnifyingGlass />
                    </Button>
                </div>
                
                <Select v-model="filters.kelas">
                    <SelectTrigger class="w-[130px] h-9 bg-slate-50">
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
                        <TableHead class="w-[50px]">No</TableHead>
                        <TableHead>Kode</TableHead>
                        <TableHead>Mata Pelajaran</TableHead>
                        <TableHead>Kelas</TableHead>
                        <TableHead>Jurusan</TableHead>
                        <TableHead class="text-right">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-if="loading">
                        <TableCell colspan="6" class="text-center py-8 text-slate-500">Memuat data...</TableCell>
                    </TableRow>
                    <TableRow v-else-if="subjects.length === 0">
                        <TableCell colspan="6" class="text-center py-8 text-slate-500">Tidak ada data mapel yang sesuai.</TableCell>
                    </TableRow>
                    
                    <TableRow v-else v-for="(sub, idx) in subjects" :key="sub.id">
                        <TableCell>{{ (filters.page - 1) * filters.limit + idx + 1 }}</TableCell>
                        <TableCell class="font-mono font-bold text-xs">{{ sub.kode_mapel }}</TableCell>
                        <TableCell class="font-medium text-slate-800">{{ sub.nama_mapel }}</TableCell>
                        <TableCell>{{ sub.kelas }}</TableCell>
                        <TableCell>{{ sub.jurusan }}</TableCell>
                        <TableCell class="text-right">
                            <Button variant="ghost" size="icon" class="text-red-500 hover:bg-red-50" @click="deleteItem(sub.id)">
                                <PhTrash />
                            </Button>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>

            <div class="flex items-center justify-between p-4 border-t bg-slate-50">
                <div class="text-sm text-slate-500">
                    Halaman {{ filters.page }} dari {{ paginationInfo.totalPages }} (Total {{ paginationInfo.totalItems }} Mapel)
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