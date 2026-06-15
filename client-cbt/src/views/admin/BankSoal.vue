<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import bankSoalApi from '@/api/bankSoal' 
import subjectApi from '@/api/subject'
import api from '@/api/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'vue-sonner'
import { 
    PhPlus, PhTrash, PhPencilSimple, PhImage, PhCaretLeft, PhCaretRight, 
    PhX, PhDownloadSimple, PhUploadSimple, PhFileCsv, PhFunnel, PhMicrosoftExcelLogo 
} from '@phosphor-icons/vue'

const backendUrl = import.meta.env.VITE_API_URL 
    ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') 
    : 'http://localhost:5000';

const soalList = ref([])
const mapelList = ref([])
const loading = ref(false)
const dialogOpen = ref(false)
const importDialogOpen = ref(false)

const importFile = ref(null)
const selectedMapelImport = ref('')

const isEditMode = ref(false)
const editId = ref(null)
const fileInput = ref(null)

// STATE FITUR BARU: BULK DELETE
const selectedIds = ref([])

const filters = ref({
    mapel_id: 'ALL', tipe_soal: 'ALL', kelas: 'ALL', page: 1, limit: 10
})

const paginationInfo = ref({ totalItems: 0, totalPages: 1 })

const form = ref({
    pertanyaan: '', tipe_soal: 'pg', mapel_id: '', bobot: 1,
    opsi_jawaban: [{ kode: 'A', teks: '' }, { kode: 'B', teks: '' }, { kode: 'C', teks: '' }, { kode: 'D', teks: '' }],
    kunci_pg: '', kunci_pg_kompleks: [], kunci_esai: '',      
    menjodohkan_kiri: [{ teks: '' }], menjodohkan_kanan: [{ teks: '' }]
})

const fileGambar = ref(null)

const fetchData = async () => {
    loading.value = true
    try {
        // PERBAIKAN: Hantar limit besar & tangkap format respons pagination (.data.data)
        if (mapelList.value.length === 0) {
            const resMapel = await subjectApi.getAll({ limit: 10000 })
            mapelList.value = resMapel.data.data ? resMapel.data.data : resMapel.data
        }

        const resSoal = await bankSoalApi.getAll({
            page: filters.value.page, limit: filters.value.limit,
            mapel_id: filters.value.mapel_id, tipe_soal: filters.value.tipe_soal, kelas: filters.value.kelas
        })
        
        if (resSoal.data.data) {
            soalList.value = resSoal.data.data
            paginationInfo.value = { totalItems: resSoal.data.totalItems, totalPages: resSoal.data.totalPages }
        } else {
            soalList.value = resSoal.data
        }
        selectedIds.value = [] // Reset centangan
    } catch (error) { 
        toast.error("Gagal memuat data.") 
    } finally { 
        loading.value = false 
    }
}
watch(() => [filters.value.mapel_id, filters.value.tipe_soal, filters.value.kelas], () => {
    filters.value.page = 1
    fetchData()
})
watch(() => filters.value.page, () => fetchData())

// --- LOGIC BULK DELETE & EXPORT ---
const isAllSelected = computed(() => {
    return soalList.value.length > 0 && selectedIds.value.length === soalList.value.length
})

const toggleSelectAll = (e) => {
    if (e.target.checked) selectedIds.value = soalList.value.map(s => s.id)
    else selectedIds.value = []
}

const handleBulkDelete = async () => {
    if(!confirm(`Yakin ingin menghapus ${selectedIds.value.length} soal terpilih?`)) return
    loading.value = true
    try {
        const res = await bankSoalApi.bulkDelete(selectedIds.value)
        toast.success(res.data.msg)
        fetchData()
    } catch (error) { toast.error("Gagal hapus massal") } 
    finally { loading.value = false }
}

const handleExport = async () => {
    try {
        toast.info("Menyiapkan file Excel...")
        const res = await bankSoalApi.exportSoal({
            mapel_id: filters.value.mapel_id,
            tipe_soal: filters.value.tipe_soal,
            kelas: filters.value.kelas
        })

        const url = window.URL.createObjectURL(new Blob([res.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `Bank_Soal_${new Date().getTime()}.xlsx`)
        document.body.appendChild(link)
        link.click()
        link.remove()
        toast.success("Berhasil di-export!")
    } catch (error) { toast.error("Gagal export data") }
}

const resetForm = () => {
    form.value = {
        pertanyaan: '', tipe_soal: 'pg', mapel_id: '', bobot: 1,
        opsi_jawaban: [{kode:'A',teks:''},{kode:'B',teks:''},{kode:'C',teks:''},{kode:'D',teks:''}],
        kunci_pg: '', kunci_pg_kompleks: [], kunci_esai: '',
        menjodohkan_kiri: [{ teks: '' }], menjodohkan_kanan: [{ teks: '' }]
    }
    fileGambar.value = null
    isEditMode.value = false
    editId.value = null

    if (fileInput.value) fileInput.value.value = ''
}

const openAdd = () => { resetForm(); dialogOpen.value = true }

const openEdit = (item) => {
    resetForm()
    isEditMode.value = true
    editId.value = item.id
    form.value.pertanyaan = item.pertanyaan
    form.value.tipe_soal = item.tipe_soal
    form.value.mapel_id = String(item.mapel_id)
    form.value.bobot = item.bobot

    const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : v)

    if (item.tipe_soal === 'pg' || item.tipe_soal === 'pg_kompleks') form.value.opsi_jawaban = parse(item.opsi_jawaban) || []
    if (item.tipe_soal === 'pg') form.value.kunci_pg = item.kunci_pg
    else if (item.tipe_soal === 'pg_kompleks') form.value.kunci_pg_kompleks = parse(item.kunci_pg_kompleks) || []
    else if (item.tipe_soal === 'esai') form.value.kunci_esai = item.kunci_esai
    else if (item.tipe_soal === 'menjodohkan') {
        form.value.menjodohkan_kiri = parse(item.menjodohkan_kiri) || [{teks:''}]
        form.value.menjodohkan_kanan = parse(item.menjodohkan_kanan) || [{teks:''}]
    }
    dialogOpen.value = true
}

// FITUR BARU: FUNGSI UNTUK MEMUNCULKAN KUNCI JAWABAN DI TABEL
const formatKunciJawaban = (soal) => {
    if (soal.tipe_soal === 'pg') return soal.kunci_pg || '-';
    if (soal.tipe_soal === 'esai') return soal.kunci_esai || '-';
    if (soal.tipe_soal === 'pg_kompleks') {
        try {
            const parsed = typeof soal.kunci_pg_kompleks === 'string' ? JSON.parse(soal.kunci_pg_kompleks) : soal.kunci_pg_kompleks;
            return Array.isArray(parsed) ? parsed.join(', ') : '-';
        } catch(e) { return '-'; }
    }
    if (soal.tipe_soal === 'menjodohkan') return 'Lihat Detail';
    return '-';
}

const addBarisJodoh = () => { form.value.menjodohkan_kiri.push({ teks: '' }); form.value.menjodohkan_kanan.push({ teks: '' }) }
const removeBarisJodoh = (index) => {
    if (form.value.menjodohkan_kiri.length > 1) {
        form.value.menjodohkan_kiri.splice(index, 1); form.value.menjodohkan_kanan.splice(index, 1)
    }
}
const handleFileChange = (e) => { fileGambar.value = e.target.files[0] }

const handleSubmit = async () => {
    if (!form.value.pertanyaan || !form.value.mapel_id) return toast.error("Pertanyaan dan Mapel wajib diisi!")

    const formData = new FormData()
    formData.append('pertanyaan', form.value.pertanyaan); formData.append('tipe_soal', form.value.tipe_soal)
    formData.append('mapel_id', form.value.mapel_id); formData.append('bobot', form.value.bobot)
    if (fileGambar.value) formData.append('gambar', fileGambar.value)

    if (form.value.tipe_soal === 'pg') {
        formData.append('opsi_jawaban', JSON.stringify(form.value.opsi_jawaban))
        formData.append('kunci_pg', form.value.kunci_pg) 
    } 
    else if (form.value.tipe_soal === 'esai') formData.append('kunci_esai', form.value.kunci_esai)
    else if (form.value.tipe_soal === 'pg_kompleks') {
        formData.append('opsi_jawaban', JSON.stringify(form.value.opsi_jawaban))
        formData.append('kunci_pg_kompleks', JSON.stringify(form.value.kunci_pg_kompleks))
    }
    else if (form.value.tipe_soal === 'menjodohkan') {
        formData.append('menjodohkan_kiri', JSON.stringify(form.value.menjodohkan_kiri))
        formData.append('menjodohkan_kanan', JSON.stringify(form.value.menjodohkan_kanan))
    }

    try {
        if (isEditMode.value) {
            // 4. FIX: Gunakan api.put langsung dengan gembok header 'multipart/form-data'
            await api.put(`/bank-soal/${editId.value}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
        } else {
            // Untuk Create (Tambah baru) biarkan pakai bawaan
            await bankSoalApi.create(formData) 
        }
        toast.success("Soal tersimpan"); dialogOpen.value = false; resetForm(); fetchData()
    } catch (error) { 
        toast.error("Gagal menyimpan soal") 
    }
}

const deleteSoal = async (id) => {
    if(!confirm("Yakin hapus soal ini?")) return
    try { await bankSoalApi.delete(id); toast.success("Terhapus"); fetchData() } 
    catch (error) { toast.error("Gagal hapus") }
}

const downloadTemplate = () => {
    const headers = ["Tipe Soal", "Pertanyaan", "Opsi (Pisahkan dengan |)", "Kunci Jawaban", "Bobot"];
    const rows = [
        headers,
        ["pg", "Ibu kota Indonesia?", "Jakarta|Bandung|Surabaya|Medan", "A", "1"],
        ["pg_kompleks", "Bilangan prima?", "2|4|6|7", "A,D", "1"],
        ["menjodohkan", "Cocokkan buah:", "", "Merah=Apel|Kuning=Pisang", "1"],
        ["esai", "Jelaskan fotosintesis!", "", "Proses tumbuhan...", "5"]
    ];
    let csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(";")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.href = encodedUri; link.download = "template_bank_soal.csv"; document.body.appendChild(link); link.click();
}

const handleImportFile = (e) => { importFile.value = e.target.files[0] }

const handleImportSubmit = async () => {
    if(!importFile.value || !selectedMapelImport.value) return toast.error("Pilih data lengkap!")
    const formData = new FormData()
    formData.append('file', importFile.value); formData.append('mapel_id', selectedMapelImport.value)
    try {
        await bankSoalApi.importSoal(formData) 
        toast.success("Import Berhasil!"); importDialogOpen.value = false; fetchData()
    } catch (error) { toast.error("Gagal Import") }
}

const kelasOptions = computed(() => [...new Set(mapelList.value.map(m => m.kelas))].sort())

onMounted(() => fetchData())
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 bg-white p-4 rounded-lg shadow-sm border">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 class="text-2xl font-bold">Bank Soal</h2>
                <p class="text-slate-500 text-sm">Kelola daftar pertanyaan ujian.</p>
            </div>
            
            <div class="flex flex-wrap gap-2 items-center">
                <Transition name="fade">
                    <Button v-if="selectedIds.length > 0" variant="destructive" class="animate-in fade-in zoom-in duration-200" @click="handleBulkDelete">
                        <PhTrash class="mr-2 h-4 w-4" weight="bold" /> 
                        Hapus ({{ selectedIds.length }})
                    </Button>
                </Transition>

                <Button variant="outline" class="text-green-600 border-green-200 hover:bg-green-50" @click="handleExport">
                    <PhMicrosoftExcelLogo class="mr-2" weight="fill" /> Export
                </Button>

                <Dialog v-model:open="importDialogOpen">
                    <DialogTrigger as-child>
                        <Button variant="outline"><PhUploadSimple class="mr-2" /> Import</Button>
                    </DialogTrigger>
                    <DialogContent class="max-w-xl">
                        <DialogHeader>
                            <DialogTitle>Import Soal dari Excel</DialogTitle>
                        </DialogHeader>
                        <div class="space-y-4 py-4">
                            <div>
                                <Label>Masukan ke Mapel:</Label>
                                <Select v-model="selectedMapelImport">
                                    <SelectTrigger><SelectValue placeholder="Pilih Mapel" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem v-for="m in mapelList" :key="m.id" :value="String(m.id)">{{ m.nama_mapel }} ({{ m.kelas }})</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div class="flex items-center gap-2 mt-2">
                                <Label class="cursor-pointer bg-slate-100 px-3 py-2 rounded flex items-center gap-2 hover:bg-slate-200 border w-full justify-center">
                                    <PhFileCsv class="text-blue-600 text-xl" /> 
                                    <span class="text-sm font-medium text-slate-700">{{ importFile ? importFile.name : 'Pilih File Excel' }}</span>
                                    <input type="file" class="hidden" @change="handleImportFile" accept=".xlsx,.xls,.csv" />
                                </Label>
                            </div>
                            <div class="pt-2 text-xs text-slate-500">
                                Butuh format? <span class="text-blue-600 cursor-pointer hover:underline" @click="downloadTemplate">Download Template</span>
                            </div>
                            <Button class="w-full" @click="handleImportSubmit">Mulai Import</Button>
                        </div>
                    </DialogContent>
                </Dialog>

                <Button @click="openAdd"><PhPlus class="mr-2" /> Tambah Soal</Button>
            </div>
        </div>

        <div class="flex flex-wrap items-center gap-3 pt-2 border-t mt-2">
            <span class="text-sm font-medium text-slate-500 flex items-center gap-1"><PhFunnel /> Filter:</span>
            
            <Select v-model="filters.mapel_id">
                <SelectTrigger class="w-[200px] h-9 bg-slate-50">
                    <SelectValue placeholder="Semua Mapel" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL">Semua Mata Pelajaran</SelectItem>
                    <SelectItem v-for="m in mapelList" :key="m.id" :value="String(m.id)">{{ m.nama_mapel }} ({{ m.kelas }})</SelectItem>
                </SelectContent>
            </Select>

            <Select v-model="filters.tipe_soal">
                <SelectTrigger class="w-[150px] h-9 bg-slate-50">
                    <SelectValue placeholder="Semua Tipe" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL">Semua Tipe</SelectItem>
                    <SelectItem value="pg">Pilihan Ganda</SelectItem>
                    <SelectItem value="pg_kompleks">PG Kompleks</SelectItem>
                    <SelectItem value="menjodohkan">Menjodohkan</SelectItem>
                    <SelectItem value="esai">Esai</SelectItem>
                </SelectContent>
            </Select>

            <Select v-model="filters.kelas">
                <SelectTrigger class="w-[120px] h-9 bg-slate-50">
                    <SelectValue placeholder="Semua Kelas" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL">Semua Kelas</SelectItem>
                    <SelectItem v-for="k in kelasOptions" :key="k" :value="k">{{ k }}</SelectItem>
                </SelectContent>
            </Select>
        </div>
    </div>

    <div class="border rounded-lg bg-white flex flex-col shadow-sm">
        <Table>
            <TableHeader class="bg-slate-50">
                <TableRow>
                    <TableHead class="w-[40px] text-center">
                        <input 
                            type="checkbox" 
                            class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            :checked="isAllSelected"
                            @change="toggleSelectAll"
                        />
                    </TableHead>
                    <TableHead class="w-[50px] text-center">No</TableHead>
                    <TableHead>Soal</TableHead>
                    <TableHead>Kunci Jawaban</TableHead>
                    <TableHead>Mapel</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead class="text-right">Aksi</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow v-if="loading">
                    <TableCell colspan="7" class="text-center py-10 text-slate-500">Memuat data...</TableCell>
                </TableRow>
                <TableRow v-else-if="soalList.length === 0">
                    <TableCell colspan="7" class="text-center py-10 text-slate-500">Tidak ada data soal.</TableCell>
                </TableRow>
                
                <TableRow v-else v-for="(soal, index) in soalList" :key="soal.id" :class="{'bg-blue-50/50': selectedIds.includes(soal.id)}">
                    <TableCell class="text-center">
                        <input 
                            type="checkbox" 
                            class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            :value="soal.id"
                            v-model="selectedIds"
                        />
                    </TableCell>
                    <TableCell class="text-center">{{ (filters.page - 1) * filters.limit + index + 1 }}</TableCell>
                    
                    <TableCell class="max-w-[200px] xl:max-w-[350px]">
                        <div class="truncate font-medium text-slate-800" :title="soal.pertanyaan">{{ soal.pertanyaan }}</div>
                        <img v-if="soal.gambar" :src="`${backendUrl}/uploads/${soal.gambar}`" class="h-10 mt-1 rounded border object-contain bg-slate-50" />
                    </TableCell>

                    <TableCell class="max-w-[120px]">
                        <div class="text-xs font-bold text-green-700 bg-green-50 border border-green-100 px-2 py-1 rounded truncate w-max max-w-full" :title="formatKunciJawaban(soal)">
                            {{ formatKunciJawaban(soal) }}
                        </div>
                    </TableCell>

                    <TableCell>
                        <Badge variant="outline">{{ soal.mata_pelajaran?.nama_mapel }}</Badge>
                        <div class="text-xs text-slate-500 mt-1">{{ soal.mata_pelajaran?.kelas }}</div>
                    </TableCell>
                    <TableCell>
                        <Badge :variant="soal.tipe_soal === 'pg' ? 'default' : 'secondary'" class="capitalize">
                            {{ soal.tipe_soal.replace('_', ' ') }}
                        </Badge>
                    </TableCell>
                    <TableCell class="text-right space-x-2">
                        <Button variant="ghost" size="icon" class="text-blue-600 hover:bg-blue-50" @click="openEdit(soal)">
                            <PhPencilSimple size="18" />
                        </Button>
                        <Button variant="ghost" size="icon" class="text-red-500 hover:bg-red-50" @click="deleteSoal(soal.id)">
                            <PhTrash size="18" />
                        </Button>
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>

        <div class="flex items-center justify-between p-4 border-t bg-slate-50">
            <div class="text-sm text-slate-500">
                Hal {{ filters.page }} dari {{ paginationInfo.totalPages }} (Total {{ paginationInfo.totalItems }})
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

    <Dialog v-model:open="dialogOpen">
        <DialogContent class="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>{{ isEditMode ? 'Edit Soal' : 'Buat Soal Baru' }}</DialogTitle>
            </DialogHeader>

            <div class="space-y-4 py-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <Label>Mata Pelajaran</Label>
                        <Select v-model="form.mapel_id">
                            <SelectTrigger><SelectValue placeholder="Pilih Mapel" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem v-for="m in mapelList" :key="m.id" :value="String(m.id)">
                                    {{ m.nama_mapel }} ({{ m.kelas }})
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Tipe Soal</Label>
                        <Select v-model="form.tipe_soal" :disabled="isEditMode">
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pg">Pilihan Ganda</SelectItem>
                                <SelectItem value="pg_kompleks">PG Kompleks</SelectItem>
                                <SelectItem value="menjodohkan">Menjodohkan</SelectItem>
                                <SelectItem value="esai">Esai</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div class="space-y-2">
                    <Label>Pertanyaan (Induk Soal)</Label>
                    <Textarea v-model="form.pertanyaan" placeholder="Tulis pertanyaan..." rows="3" />
                    
                    <div v-if="isEditMode && !fileGambar && soalList.find(s => s.id === editId)?.gambar" class="mt-2 p-2 border rounded bg-slate-50 w-max">
                        <span class="text-xs text-slate-500 font-bold mb-1 block">Gambar Saat Ini:</span>
                        <img :src="`${backendUrl}/uploads/${soalList.find(s => s.id === editId)?.gambar}`" class="h-24 object-contain rounded border" />
                    </div>
    
                    <div class="flex items-center gap-2 mt-2">
                        <Label class="cursor-pointer bg-slate-100 px-3 py-2 rounded flex items-center gap-2 hover:bg-slate-200 border">
                            <PhImage /> {{ fileGambar ? fileGambar.name : 'Upload Gambar Baru' }}
                            
                            <input type="file" ref="fileInput" class="hidden" @change="handleFileChange" accept="image/*" />
                        </Label>
                        <span v-if="fileGambar" class="text-xs text-red-500 cursor-pointer hover:underline" @click="fileGambar = null">Hapus Pilihan</span>
                    </div>
                </div>

                <div class="border p-4 rounded-lg bg-slate-50">
                    <div v-if="form.tipe_soal === 'pg'" class="space-y-3">
                        <Label>Opsi Jawaban & Kunci</Label>
                        <div v-for="(opsi, idx) in form.opsi_jawaban" :key="idx" class="flex items-center gap-2">
                            <span class="font-bold w-6">{{ opsi.kode }}.</span>
                            <Input v-model="opsi.teks" placeholder="Isi jawaban..." />
                            <input type="radio" name="kunci" :value="opsi.kode" v-model="form.kunci_pg" class="w-5 h-5 accent-blue-600" />
                        </div>
                    </div>

                    <div v-if="form.tipe_soal === 'pg_kompleks'" class="space-y-3">
                        <Label>Opsi Jawaban (Pilih Banyak)</Label>
                        <div v-for="(opsi, idx) in form.opsi_jawaban" :key="idx + 'kompleks'" class="flex items-center gap-2">
                            <span class="font-bold w-6">{{ opsi.kode }}.</span>
                            <Input v-model="opsi.teks" />
                            <input type="checkbox" :value="opsi.kode" v-model="form.kunci_pg_kompleks" class="w-5 h-5 accent-blue-600" />
                        </div>
                    </div>

                    <div v-if="form.tipe_soal === 'menjodohkan'" class="space-y-4">
                        <div class="flex justify-between items-center">
                            <Label>Pasangan Pernyataan & Jawaban</Label>
                            <Button size="sm" variant="outline" @click="addBarisJodoh"><PhPlus class="mr-1"/> Tambah Baris</Button>
                        </div>
                        
                        <div class="grid grid-cols-[1fr_1fr_auto] gap-2 font-bold text-xs text-slate-500 mb-1">
                            <span>LAJUR KIRI</span>
                            <span>LAJUR KANAN</span>
                            <span></span>
                        </div>

                        <div v-for="(item, idx) in form.menjodohkan_kiri" :key="idx" class="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                            <Input v-model="form.menjodohkan_kiri[idx].teks" placeholder="Pernyataan..." />
                            <Input v-model="form.menjodohkan_kanan[idx].teks" placeholder="Pasangannya..." />
                            <Button variant="ghost" size="icon" class="text-red-500" @click="removeBarisJodoh(idx)" :disabled="form.menjodohkan_kiri.length === 1">
                                <PhX />
                            </Button>
                        </div>
                    </div>

                    <div v-if="form.tipe_soal === 'esai'" class="space-y-3">
                        <Label class="font-bold">Kunci Jawaban / Kata Kunci (Opsional)</Label>
                        
                        <Textarea 
                            v-model="form.kunci_esai" 
                            placeholder="contoh: soekarno, hatta, jakarta" 
                            rows="2"
                        />
                        
                        <div class="text-xs text-slate-600 bg-blue-50 p-3 rounded-md border border-blue-100 leading-relaxed">
                            <span class="font-bold text-blue-700 block mb-1">💡 Tips Koreksi Otomatis:</span> 
                            Masukkan kata kunci yang wajib ada di jawaban siswa, pisahkan dengan koma (,). Sistem akan memberi nilai otomatis proporsional sesuai jumlah kata kunci yang ditebak siswa. 
                            <span class="font-bold text-orange-600 mt-1 block">Kosongkan kolom ini jika Anda ingin mengoreksi esai secara manual nantinya.</span>
                        </div>
                    </div>
                </div>

                <div class="flex items-center gap-4">
                    <div class="w-24">
                        <Label>Bobot</Label>
                        <Input type="number" v-model="form.bobot" />
                    </div>
                    <Button class="flex-1 mt-6" @click="handleSubmit">
                        {{ loading ? 'Menyimpan...' : (isEditMode ? 'Simpan Perubahan' : 'Buat Soal') }}
                    </Button>
                </div>
            </div>
        </DialogContent>
    </Dialog>
  </div>
</template>