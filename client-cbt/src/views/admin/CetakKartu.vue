<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import studentApi from '@/api/student'
import settingApi from '@/api/setting'
import KartuUjian from '@/components/KartuUjian.vue'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PhPrinter, PhFunnel, PhCaretLeft, PhCaretRight } from '@phosphor-icons/vue'

const students = ref([])
const setting = ref({})
const loading = ref(true)

// Filter State
const selectedClass = ref('ALL')
const classOptions = ref([])

// Pagination State
const currentPage = ref(1)
const itemsPerPage = 8 // 8 Kartu per halaman (2 Kolom x 4 Baris) agar pas di A4

// Fetch Data
const fetchData = async () => {
    loading.value = true
    try {
        const resSetting = await settingApi.get()
        setting.value = resSetting.data

        const resClasses = await studentApi.getClasses()
        classOptions.value = resClasses.data

        // Ambil SEMUA siswa dulu, baru kita filter & paginasi di frontend
        const resStudents = await studentApi.getAll({ limit: 2000 }) 
        students.value = resStudents.data.result

    } catch (e) {
        console.error(e)
    } finally {
        loading.value = false
    }
}

// Logic Filter Kelas
const filteredStudents = computed(() => {
    if(selectedClass.value === 'ALL') return students.value
    return students.value.filter(s => s.kelas === selectedClass.value)
})

// Logic Pagination
const totalPages = computed(() => Math.ceil(filteredStudents.value.length / itemsPerPage))

const paginatedStudents = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage
    const end = start + itemsPerPage
    return filteredStudents.value.slice(start, end)
})

// Reset ke halaman 1 jika ganti kelas
watch(selectedClass, () => {
    currentPage.value = 1
})

const printCards = () => {
    window.print()
}

onMounted(() => fetchData())
</script>

<template>
    <div class="space-y-6">
        
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
            <div>
                <h2 class="text-3xl font-bold tracking-tight text-slate-900">Cetak Kartu Ujian</h2>
                <p class="text-slate-500">
                    Total: {{ filteredStudents.length }} Siswa. 
                    Menampilkan {{ paginatedStudents.length }} kartu per halaman.
                </p>
            </div>

            <div class="flex flex-wrap gap-2 items-center">
                <div class="flex items-center gap-2 bg-white px-3 py-2 rounded-md border shadow-sm">
                    <PhFunnel class="text-slate-400" />
                    <Select v-model="selectedClass">
                        <SelectTrigger class="w-[150px] h-8 border-none shadow-none p-0 focus:ring-0">
                            <SelectValue placeholder="Pilih Kelas" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Semua Kelas</SelectItem>
                            <SelectItem v-for="cls in classOptions" :key="cls" :value="cls">
                                {{ cls }}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                
                <div class="flex items-center gap-1 bg-white px-2 py-1 rounded-md border shadow-sm">
                    <Button variant="ghost" size="icon" :disabled="currentPage === 1" @click="currentPage--">
                        <PhCaretLeft />
                    </Button>
                    <span class="text-sm font-bold w-12 text-center">{{ currentPage }} / {{ totalPages }}</span>
                    <Button variant="ghost" size="icon" :disabled="currentPage === totalPages || totalPages === 0" @click="currentPage++">
                        <PhCaretRight />
                    </Button>
                </div>

                <Button @click="printCards">
                    <PhPrinter class="mr-2 h-4 w-4" /> Cetak Halaman Ini
                </Button>
            </div>
        </div>

        <div v-if="loading" class="text-center py-10 print:hidden">Memuat data...</div>
        
        <div v-else class="print-container">
            <div v-if="paginatedStudents.length === 0" class="text-center py-10 text-slate-500 print:hidden">
                Tidak ada data siswa untuk ditampilkan.
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid print:grid-cols-2 print:gap-4">
                <div 
                    v-for="siswa in paginatedStudents" 
                    :key="siswa.id" 
                    class="flex justify-center print:block"
                >
                    <KartuUjian :siswa="siswa" :sekolah="setting" />
                </div>
            </div>
        </div>

    </div>
</template>

<style>
/* CSS KHUSUS PRINT */
@media print {
    /* 1. Sembunyikan Sidebar & Header Admin */
    aside, header, nav, .sidebar { 
        display: none !important; 
    }
    
    /* 2. Sembunyikan tombol-tombol filter di halaman ini */
    .print\:hidden {
        display: none !important;
    }

    /* 3. Reset Layout Utama */
    main {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
    }

    /* 4. Atur Grid Kartu agar Rapi 2 Kolom */
    .print-container {
        width: 100%;
        max-width: 210mm; 
        margin: 0 auto;
        padding-top: 0.5cm; /* Sedikit jarak atas */
    }

    .grid {
        display: grid !important;
        grid-template-columns: repeat(2, 1fr) !important; 
        column-gap: 0.5cm !important; /* Jarak antar kolom */
        row-gap: 0.5cm !important;    /* Jarak antar baris */
        justify-items: center;        /* Tengahkan kartu di kolomnya */
    }

    /* Pastikan Halaman Pindah dengan Rapih */
    .grid > div {
        break-inside: avoid;
        page-break-inside: avoid;
    }

    /* 5. Atur Halaman Kertas */
    @page { 
        size: A4; 
        margin: 1cm; 
    }

    body {
        background-color: white;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
}
</style>