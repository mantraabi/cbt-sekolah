<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import examApi from '@/api/exam'
import api from '@/api/axios' // <-- TAMBAHAN: Import Axios API langsung untuk endpoint baru
import PrintHeader from '@/components/PrintHeader.vue' 
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
// <-- TAMBAHAN: Import komponen Dialog untuk Pop-up Modal Analisis
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'vue-sonner'
// <-- TAMBAHAN: Import icon PhChartBar
import { PhArrowLeft, PhPrinter, PhFunnel, PhPencilSimple, PhMicrosoftExcelLogo, PhArrowCounterClockwise, PhChartBar } from '@phosphor-icons/vue' 

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const examInfo = ref(null) 
const participantList = ref([])
const selectedClass = ref('ALL')
const exporting = ref(false)

// --- STATE BARU UNTUK ANALISIS SOAL ---
const showAnalysis = ref(false)
const analysisData = ref([])
const loadingAnalysis = ref(false)

const fetchResults = async () => {
    loading.value = true
    try {
        const res = await examApi.getResults(route.params.id)
        examInfo.value = res.data.ujian
        participantList.value = res.data.peserta
    } catch (error) {
        toast.error("Gagal memuat hasil nilai")
        router.push('/admin/exams')
    } finally {
        loading.value = false
    }
}

// --- FUNGSI BARU: MENGAMBIL DATA ANALISIS ---
const openAnalysis = async () => {
    showAnalysis.value = true
    loadingAnalysis.value = true
    try {
        // Memanggil endpoint API baru yang tadi kita buat di backend
        const res = await api.get(`/exams/${route.params.id}/analysis`)
        analysisData.value = res.data.analisis
    } catch (error) {
        toast.error("Gagal memuat analisis soal")
    } finally {
        loadingAnalysis.value = false
    }
}

const classOptions = computed(() => {
    const classes = participantList.value.map(p => p.user?.kelas).filter(k => k)
    return [...new Set(classes)].sort()
})

const filteredParticipants = computed(() => {
    if (selectedClass.value === 'ALL') return participantList.value
    return participantList.value.filter(p => p.user?.kelas === selectedClass.value)
})

const printPage = () => { window.print() }

const handleExport = async () => {
    exporting.value = true
    try {
        const response = await examApi.exportGrades(route.params.id)
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        const cleanName = examInfo.value.nama_ujian.replace(/ /g, '_');
        const filename = `Rekap_Nilai_${cleanName}.xlsx`;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success("File Excel berhasil diunduh!")
    } catch (error) {
        console.error(error)
        toast.error("Gagal mendownload excel")
    } finally {
        exporting.value = false
    }
}

const handleReset = async (nilaiId, namaSiswa) => {
    if (!confirm(`PERINGATAN: Apakah Anda yakin ingin me-RESET ujian siswa "${namaSiswa}"?`)) return;
    if (!confirm(`Data jawaban dan nilai "${namaSiswa}" akan DIHAPUS PERMANEN dan siswa harus mengerjakan dari awal. Lanjutkan?`)) return;
    try {
        loading.value = true;
        await examApi.resetExamStudent(nilaiId);
        toast.success(`Ujian siswa ${namaSiswa} berhasil di-reset.`);
        fetchResults(); 
    } catch (error) {
        console.error(error);
        toast.error("Gagal mereset ujian.");
        loading.value = false;
    }
}

onMounted(() => {
    fetchResults()
})
</script>

<template>
  <div class="space-y-6 print:space-y-2">
    
    <PrintHeader />

    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div class="flex items-center gap-4">
            <Button variant="outline" size="icon" @click="router.push('/admin/exams')">
                <PhArrowLeft />
            </Button>
            <div>
                <h2 class="text-2xl font-bold tracking-tight">Hasil Ujian</h2>
                <p class="text-slate-500">Rekap nilai siswa untuk ujian ini.</p>
            </div>
        </div>
        
        <div class="flex flex-wrap items-center gap-2">
            <div class="flex items-center gap-2 bg-white px-3 py-2 rounded-md border shadow-sm">
                <PhFunnel class="text-slate-400" />
                <Select v-model="selectedClass">
                    <SelectTrigger class="w-[150px] h-8 border-none shadow-none p-0 focus:ring-0">
                        <SelectValue placeholder="Semua Kelas" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Semua Kelas</SelectItem>
                        <SelectItem v-for="cls in classOptions" :key="cls" :value="cls">{{ cls }}</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Button variant="outline" class="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" @click="openAnalysis">
                <PhChartBar class="mr-2 h-4 w-4" weight="bold" /> Analisis Soal
            </Button>

            <Button class="bg-green-600 hover:bg-green-700 text-white" @click="handleExport" :disabled="exporting">
                <PhMicrosoftExcelLogo class="mr-2 h-4 w-4" weight="fill" /> 
                {{ exporting ? 'Loading...' : 'Excel' }}
            </Button>

            <Button variant="outline" @click="printPage">
                <PhPrinter class="mr-2 h-4 w-4" /> Cetak / PDF
            </Button>
        </div>
        
    </div>

    <div v-if="examInfo" class="bg-white p-6 rounded-lg border shadow-sm print:border-none print:shadow-none print:p-0 print:mb-4">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm print:grid-cols-2">
            <div>
                <span class="text-slate-500 block print:text-black print:font-bold">Nama Ujian:</span>
                <span class="font-medium print:text-black">{{ examInfo.nama_ujian }}</span>
            </div>
            <div>
                <span class="text-slate-500 block print:text-black print:font-bold">Kelas / Mapel:</span>
                <span class="font-medium print:text-black">{{ examInfo.mata_pelajaran?.nama_mapel }} ({{ examInfo.mata_pelajaran?.kelas }})</span>
            </div>
            <div>
                <span class="text-slate-500 block print:text-black print:font-bold">Waktu Pelaksanaan:</span>
                <span class="font-medium print:text-black">{{ new Date(examInfo.tgl_mulai).toLocaleString() }}</span>
            </div>
            <div>
                <span class="text-slate-500 block print:text-black print:font-bold">Total Peserta:</span>
                <span class="font-medium text-blue-600 print:text-black">{{ filteredParticipants.length }} Siswa</span>
            </div>
        </div>
    </div>

    <div class="border rounded-lg bg-white shadow-sm overflow-hidden print:border-black print:shadow-none">
        <Table class="print:text-sm">
            <TableHeader>
                <TableRow>
                    <TableHead class="w-[50px] text-center border-b print:border-black print:text-black print:font-bold">No</TableHead>
                    <TableHead class="border-b print:border-black print:text-black print:font-bold">Nama Siswa</TableHead>
                    <TableHead class="border-b print:border-black print:text-black print:font-bold">Username</TableHead>
                    <TableHead class="text-center border-b print:border-black print:text-black print:font-bold">Kelas</TableHead>
                    <TableHead class="text-center border-b print:border-black print:text-black print:font-bold">Benar</TableHead>
                    <TableHead class="text-center border-b print:border-black print:text-black print:font-bold">Salah</TableHead>
                    <TableHead class="text-right border-b print:border-black print:text-black print:font-bold">Nilai</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow v-for="(row, index) in filteredParticipants" :key="row.id" class="print:border-black">
                    <TableCell class="text-center font-bold border-b print:border-black">{{ index + 1 }}</TableCell>
                    <TableCell class="font-medium border-b print:border-black">{{ row.user?.nama_lengkap }}</TableCell>
                    <TableCell class="text-slate-500 print:text-black border-b print:border-black">{{ row.user?.username }}</TableCell>
                    <TableCell class="text-center border-b print:border-black">{{ row.user?.kelas || '-' }}</TableCell>
                    <TableCell class="text-center text-green-600 font-bold print:text-black border-b print:border-black">{{ row.total_benar }}</TableCell>
                    <TableCell class="text-center text-red-500 font-bold print:text-black border-b print:border-black">{{ row.total_salah }}</TableCell>
                    
                    <TableCell class="text-right border-b print:border-black">
                        <div class="flex flex-col items-end gap-1">
                            <span class="font-bold text-lg">{{ row.nilai_akhir.toFixed(2) }}</span>
                            <div class="flex items-center gap-3 print:hidden">
                                <button class="text-xs flex items-center gap-1 text-orange-600 hover:text-orange-800 font-medium transition-colors" title="Reset Ujian Siswa (Hapus Nilai)" @click="handleReset(row.id, row.user?.nama_lengkap)">
                                    <PhArrowCounterClockwise class="w-3 h-3" weight="bold" /> Reset
                                </button>
                                <button class="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium transition-colors" @click="router.push(`/admin/koreksi/${row.id}`)">
                                    <PhPencilSimple class="w-3 h-3" weight="bold" /> Koreksi
                                </button>
                            </div>
                        </div>
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
    </div>

    <div class="hidden print:flex justify-end mt-10 mr-10">
        <div class="text-center">
            <p class="mb-16">Mengetahui,<br><span contenteditable="true" class="outline-none border-b border-transparent hover:border-slate-300">Guru Mata Pelajaran</span></p>
            <p class="font-bold underline outline-none border-b border-transparent hover:border-slate-300" contenteditable="true">( ............................................ )</p>
            <p class="mt-1">NIP. <span contenteditable="true" class="outline-none border-b border-transparent hover:border-slate-300">.................................</span></p>
        </div>
    </div>

    <Dialog v-model:open="showAnalysis">
        <DialogContent class="max-w-5xl max-h-[85vh] overflow-y-auto" :escape-key-closes="true">
            <DialogHeader>
                <DialogTitle class="text-2xl font-bold flex items-center gap-2 border-b pb-4">
                    <PhChartBar class="text-blue-600" weight="fill" /> Analisis Butir Soal
                </DialogTitle>
            </DialogHeader>

            <div v-if="loadingAnalysis" class="py-12 text-center text-slate-500 animate-pulse font-medium">
                Mengalkulasi data jawaban siswa...
            </div>
            
            <div v-else-if="analysisData.length === 0" class="py-12 text-center text-slate-500 bg-slate-50 rounded-lg border-dashed border-2">
                Belum ada data analisis yang bisa ditampilkan.
            </div>

            <div v-else class="mt-2">
                <div class="bg-blue-50 text-blue-800 px-4 py-3 rounded-md text-sm mb-4">
                    Statistik ini dihitung berdasarkan jawaban dari <b>{{ filteredParticipants.length }} peserta</b> yang telah menyelesaikan ujian.
                </div>
                
                <div class="border rounded-lg overflow-hidden shadow-sm">
                    <Table>
                        <TableHeader class="bg-slate-100">
                            <TableRow>
                                <TableHead class="w-[50px] text-center font-bold text-slate-700">No</TableHead>
                                <TableHead class="font-bold text-slate-700">Pertanyaan</TableHead>
                                <TableHead class="text-center font-bold text-slate-700">Tipe</TableHead>
                                <TableHead class="text-center font-bold text-green-700">Benar</TableHead>
                                <TableHead class="text-center font-bold text-red-700">Salah</TableHead>
                                <TableHead class="text-center font-bold text-slate-500">Kosong</TableHead>
                                <TableHead class="text-center font-bold text-slate-700">% Benar</TableHead>
                                <TableHead class="text-center font-bold text-slate-700">Kategori</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow v-for="(item, index) in analysisData" :key="item.soal_id" class="hover:bg-slate-50">
                                <TableCell class="text-center font-bold text-slate-600">{{ index + 1 }}</TableCell>
                                <TableCell class="max-w-[250px] truncate" :title="item.pertanyaan">{{ item.pertanyaan }}</TableCell>
                                <TableCell class="text-center uppercase text-xs font-medium text-slate-500">{{ item.tipe_soal }}</TableCell>
                                <TableCell class="text-center font-bold text-green-600">{{ item.dijawab_benar }}</TableCell>
                                <TableCell class="text-center font-bold text-red-500">{{ item.dijawab_salah }}</TableCell>
                                <TableCell class="text-center font-medium text-slate-400">{{ item.tidak_dijawab }}</TableCell>
                                <TableCell class="text-center font-bold">{{ item.persentase_benar }}%</TableCell>
                                <TableCell class="text-center">
                                    <Badge :class="{
                                        'bg-green-100 text-green-700 hover:bg-green-200': item.tingkat_kesulitan === 'Mudah',
                                        'bg-yellow-100 text-yellow-700 hover:bg-yellow-200': item.tingkat_kesulitan === 'Sedang',
                                        'bg-red-100 text-red-700 hover:bg-red-200 border-red-200': item.tingkat_kesulitan === 'Sulit',
                                        'bg-slate-100 text-slate-700': item.tingkat_kesulitan === 'Belum Ada Data'
                                    }">
                                        {{ item.tingkat_kesulitan }}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </div>
        </DialogContent>
    </Dialog>

  </div>
</template>

<style>
/* ... (Style print sama seperti sebelumnya, tidak ada yang berubah) ... */
@media print {
    aside, header, nav, .sidebar { display: none !important; }
    main { margin: 0 !important; padding: 0 !important; width: 100% !important; max-width: 100% !important; }
    .print\:hidden { display: none !important; }
    .print\:block { display: block !important; }
    .print\:flex { display: flex !important; }
    @page { size: A4; margin: 1cm; }
    body { background-color: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    .overflow-hidden, .overflow-auto, .overflow-x-auto, div { overflow: visible !important; }
    table { width: 100% !important; border-collapse: collapse !important; page-break-inside: auto !important; }
    tr { page-break-inside: avoid !important; page-break-after: auto !important; }
    thead { display: table-header-group !important; }
    th, td { border: 1px solid black !important; color: black !important; padding: 8px !important; }
}
</style>