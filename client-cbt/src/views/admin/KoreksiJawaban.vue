<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import examApi from '@/api/exam'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'vue-sonner'
import { PhArrowLeft, PhCheckCircle, PhXCircle, PhFloppyDisk } from '@phosphor-icons/vue'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const saving = ref(false)

const studentInfo = ref(null)
const examInfo = ref(null)
const answerList = ref([]) // Detail jawaban

// --- FETCH DATA ---
const fetchData = async () => {
    loading.value = true
    try {
        // ID yang diambil dari URL adalah ID NILAI (bukan user_id)
        const res = await examApi.getStudentResult(route.params.nilaiId)
        
        studentInfo.value = res.data.user
        examInfo.value = res.data.ujian
        
        // Parse detail_jawaban jika masih string
        let details = res.data.detail_jawaban
        if (typeof details === 'string') {
            try { details = JSON.parse(details) } catch(e) { details = [] }
        }
        answerList.value = details
        
    } catch (error) {
        console.error(error)
        toast.error("Gagal memuat data jawaban")
    } finally {
        loading.value = false
    }
}

// --- HELPER FORMAT KUNCI JAWABAN (UPDATE PENTING) ---
const formatComplexKey = (keyString, type) => {
    if (!keyString || keyString === '-') return '-';

    try {
        // 1. Jika PG Kompleks (Format: ["A", "C"])
        if (type === 'pg_kompleks') {
            const parsed = JSON.parse(keyString);
            if (Array.isArray(parsed)) return parsed.join(', '); // Jadi "A, C"
            return keyString;
        }

        // 2. Jika Menjodohkan (Format JSON Pair)
        if (type === 'menjodohkan') {
            const parsed = JSON.parse(keyString);
            if (Array.isArray(parsed)) {
                // Ubah jadi list HTML string biar rapi
                return parsed.map(p => `${p.k} ➜ ${p.p}`).join('<br>');
            }
        }
        
        return keyString; // Default (PG/Esai)
    } catch (e) {
        return keyString; // Jika gagal parse, tampilkan apa adanya
    }
}

// Helper Format Jawaban Siswa (Menjodohkan/Kompleks)
const formatStudentAnswer = (ans, type) => {
    if (!ans) return '<span class="text-red-500 italic">Tidak Dijawab</span>';
    
    if (type === 'pg_kompleks' && Array.isArray(ans)) {
        return ans.join(', ');
    }
    
    if (type === 'menjodohkan' && Array.isArray(ans)) {
        return ans.map(p => `${p.kiri} ➜ ${p.kanan}`).join('<br>');
    }

    return ans;
}

// --- SIMPAN KOREKSI ---
const handleSave = async () => {
    saving.value = true
    
    // Payload
    const koreksiData = answerList.value.map(item => ({
        soal_id: item.soal_id,
        skor_baru: item.skor
    }))

    try {
        await examApi.saveCorrection(route.params.nilaiId, koreksiData)
        
        toast.success("Koreksi berhasil disimpan!")
        
        // FIX: Jangan redirect paksa jika data examInfo belum lengkap
        // Cukup reload data di halaman ini saja agar nilai terupdate
        await fetchData() 
        
        // ATAU Jika ingin kembali:
        // pastikan examInfo.value.id ada
        // if(examInfo.value?.id) router.push(`/admin/exams/${examInfo.value.id}/results`)

    } catch (error) {
        console.error(error) // Cek console browser untuk detail error
        toast.error("Gagal menyimpan koreksi")
    } finally {
        saving.value = false
    }
}

onMounted(() => fetchData())
</script>

<template>
  <div class="space-y-6 pb-20">
    <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
            <Button variant="outline" size="icon" @click="router.back()">
                <PhArrowLeft />
            </Button>
            <div>
                <h2 class="text-2xl font-bold">Koreksi Jawaban</h2>
                <p class="text-slate-500" v-if="studentInfo">
                    {{ studentInfo.nama_lengkap }} ({{ studentInfo.kelas }}) - {{ examInfo?.nama_ujian }}
                </p>
            </div>
        </div>
        <Button @click="handleSave" :disabled="saving" class="gap-2">
            <PhFloppyDisk /> {{ saving ? 'Menyimpan...' : 'Simpan Nilai' }}
        </Button>
    </div>

    <div v-if="loading" class="text-center py-10">Memuat data...</div>

    <div v-else class="space-y-4">
        <Card v-for="(item, idx) in answerList" :key="idx" 
            :class="item.is_benar ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30'">
            <CardHeader class="pb-2">
                <div class="flex justify-between items-start">
                    <CardTitle class="text-base font-medium flex gap-2">
                        <span class="bg-slate-200 px-2 rounded text-sm h-fit">No. {{ idx + 1 }}</span>
                        <span v-html="item.pertanyaan"></span>
                    </CardTitle>
                    
                    <Badge :variant="item.is_benar ? 'default' : 'destructive'" class="capitalize">
                        {{ item.tipe_soal.replace('_', ' ') }}
                    </Badge>
                </div>
            </CardHeader>
            
            <CardContent class="grid md:grid-cols-2 gap-6 pt-2">
                
                <div class="space-y-1">
                    <p class="text-xs font-bold text-slate-500 uppercase">Jawaban Siswa</p>
                    <div class="p-3 bg-white rounded border min-h-[3rem] text-sm font-medium"
                         :class="item.is_benar ? 'text-green-700 border-green-200' : 'text-red-700 border-red-200'">
                        <span v-html="formatStudentAnswer(item.jawaban_siswa, item.tipe_soal)"></span>
                    </div>
                </div>

                <div class="space-y-4">
                    <div class="space-y-1">
                        <p class="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                            <PhCheckCircle class="text-green-600" /> Kunci / Referensi
                        </p>
                        <div class="p-3 bg-slate-100 rounded border text-sm text-slate-700 font-mono">
                            <span v-html="formatComplexKey(item.kunci_jawaban, item.tipe_soal)"></span>
                        </div>
                    </div>

                    <div class="space-y-1">
                        <div class="flex justify-between">
                            <p class="text-xs font-bold text-slate-500 uppercase">Skor (Bobot Max: {{ item.max_skor || 1 }})</p>
                            <span v-if="item.status_koreksi === 'menunggu'" class="text-[10px] bg-yellow-100 text-yellow-700 px-2 rounded-full animate-pulse">
                                Perlu Koreksi
                            </span>
                        </div>
                        <div class="flex items-center gap-2">
                            <Input 
                                type="number" 
                                v-model="item.skor" 
                                class="w-24 font-bold"
                                :class="item.skor > 0 ? 'text-green-600' : 'text-red-600'"
                            />
                            <span class="text-xs text-slate-400">Edit angka ini untuk mengubah nilai</span>
                        </div>
                    </div>
                </div>

            </CardContent>
        </Card>
    </div>
  </div>
</template>