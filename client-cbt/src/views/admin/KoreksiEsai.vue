<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import examApi from '@/api/exam'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'vue-sonner'
import { PhCheckCircle, PhWarning, PhPencilSimple } from '@phosphor-icons/vue'

const route = useRoute()
const candidates = ref([])
const loading = ref(true)

// State untuk Modal Koreksi
const selectedStudent = ref(null) // Data siswa yg sedang dikoreksi
const essays = ref([]) // Soal-soal esai milik siswa tsb
const dialogOpen = ref(false)
const loadingEssays = ref(false)

// Fetch Daftar Siswa
const fetchCandidates = async () => {
    loading.value = true
    try {
        const res = await examApi.getCandidates(route.params.id)
        candidates.value = res.data
    } catch (e) {
        console.error(e)
    } finally {
        loading.value = false
    }
}

// Buka Modal Koreksi
const openCorrection = async (candidate) => {
    selectedStudent.value = candidate
    dialogOpen.value = true
    loadingEssays.value = true
    try {
        const res = await examApi.getStudentEssays(candidate.nilai_id)
        essays.value = res.data.essays
    } catch (e) {
        toast.error("Gagal mengambil jawaban siswa")
        dialogOpen.value = false
    } finally {
        loadingEssays.value = false
    }
}

// Simpan Skor Per Soal
const saveScore = async (essay, index) => {
    // Validasi Input
    if (essay.skor < 0 || essay.skor > essay.max_skor) {
        return toast.error(`Skor harus antara 0 - ${essay.max_skor}`)
    }

    try {
        const res = await examApi.saveEssayScore({
            nilai_id: selectedStudent.value.nilai_id,
            soal_id: essay.soal_id,
            skor_guru: essay.skor
        })
        
        toast.success("Nilai tersimpan")
        // Update UI lokal biar jadi hijau
        essays.value[index].status_koreksi = 'selesai'
        
        // Update Nilai Sementara di tampilan (opsional, biar guru tau progress)
        selectedStudent.value.nilai_sementara = res.data.nilai_akhir_baru

    } catch (e) {
        toast.error(e.response?.data?.msg || "Gagal simpan")
    }
}

onMounted(() => fetchCandidates())
</script>

<template>
    <div class="space-y-6">
        <div>
            <h2 class="text-2xl font-bold">Koreksi Jawaban Esai</h2>
            <p class="text-slate-500">Berikan penilaian manual untuk soal uraian siswa.</p>
        </div>

        <div class="border rounded-lg bg-white overflow-hidden">
            <table class="w-full text-sm text-left">
                <thead class="bg-slate-50 border-b">
                    <tr>
                        <th class="px-4 py-3 font-medium">Nama Siswa</th>
                        <th class="px-4 py-3 font-medium">Kelas</th>
                        <th class="px-4 py-3 font-medium text-center">Status Esai</th>
                        <th class="px-4 py-3 font-medium text-right">Nilai Akhir (Saat Ini)</th>
                        <th class="px-4 py-3 font-medium text-right">Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="loading"><td colspan="5" class="p-4 text-center">Memuat data...</td></tr>
                    <tr v-else-if="candidates.length === 0"><td colspan="5" class="p-4 text-center text-slate-500">Belum ada siswa yang mengerjakan ujian ini.</td></tr>
                    
                    <tr v-else v-for="c in candidates" :key="c.nilai_id" class="border-b hover:bg-slate-50 transition">
                        <td class="px-4 py-3 font-medium">{{ c.siswa_nama }}</td>
                        <td class="px-4 py-3 text-slate-500">{{ c.siswa_kelas }}</td>
                        <td class="px-4 py-3 text-center">
                            <Badge v-if="c.pending > 0" variant="destructive" class="bg-orange-500 hover:bg-orange-600">
                                {{ c.pending }} Belum Dinilai
                            </Badge>
                            <Badge v-else variant="default" class="bg-green-600 hover:bg-green-700">
                                <PhCheckCircle class="mr-1"/> Selesai
                            </Badge>
                        </td>
                        <td class="px-4 py-3 text-right font-mono font-bold text-slate-700">
                            {{ c.nilai_sementara }}
                        </td>
                        <td class="px-4 py-3 text-right">
                            <Button size="sm" variant="outline" @click="openCorrection(c)">
                                <PhPencilSimple class="mr-2"/> Koreksi
                            </Button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <Dialog v-model:open="dialogOpen">
            <DialogContent class="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Lembar Jawab: {{ selectedStudent?.siswa_nama }}</DialogTitle>
                    <DialogDescription>
                        Bandingkan jawaban siswa dengan kunci jawaban, lalu beri skor.
                    </DialogDescription>
                </DialogHeader>

                <div v-if="loadingEssays" class="py-10 text-center">Memuat jawaban...</div>
                
                <div v-else class="space-y-8 py-4">
                    <div v-for="(essay, idx) in essays" :key="essay.soal_id" class="border rounded-lg p-4 bg-slate-50">
                        <div class="flex justify-between mb-2">
                            <span class="font-bold text-slate-700">Soal No. {{ idx + 1 }}</span>
                            <Badge variant="outline">Bobot Max: {{ essay.max_skor }}</Badge>
                        </div>

                        <div class="mb-4 text-sm font-medium" v-html="essay.pertanyaan"></div>

                        <div class="grid md:grid-cols-2 gap-4">
                            <div class="bg-green-50 p-3 rounded border border-green-200 text-sm">
                                <h4 class="font-bold text-green-800 mb-1 text-xs uppercase">Kunci Jawaban (Referensi Guru)</h4>
                                <p class="text-green-900 whitespace-pre-wrap">{{ essay.kunci_jawaban || '-' }}</p>
                            </div>

                            <div class="bg-white p-3 rounded border border-slate-300 text-sm shadow-sm">
                                <h4 class="font-bold text-slate-800 mb-1 text-xs uppercase">Jawaban Siswa</h4>
                                <p class="text-slate-900 whitespace-pre-wrap font-serif">{{ essay.jawaban_siswa || '(Tidak Menjawab)' }}</p>
                            </div>
                        </div>

                        <div class="mt-4 flex items-center justify-end gap-3 bg-white p-2 rounded border border-slate-100">
                            <label class="text-sm font-semibold">Berikan Skor:</label>
                            <Input 
                                type="number" 
                                v-model="essay.skor" 
                                class="w-24 text-center font-bold" 
                                :max="essay.max_skor" 
                                min="0"
                            />
                            <span class="text-slate-400 text-sm">/ {{ essay.max_skor }}</span>
                            <Button size="sm" @click="saveScore(essay, idx)" :disabled="essay.skor > essay.max_skor">
                                Simpan
                            </Button>
                        </div>
                    </div>

                    <div v-if="essays.length === 0" class="text-center text-slate-500">
                        Tidak ada soal esai dalam ujian ini.
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    </div>
</template>