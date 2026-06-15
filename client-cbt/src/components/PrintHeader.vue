<script setup>
import { ref, onMounted } from 'vue'
import settingApi from '@/api/setting'

const setting = ref({
    nama_sekolah: 'LOADING...',
    alamat_sekolah: '',
    website: '',
    email: '',
    logo: null
})

// Ambil data dari backend saat komponen dimuat
const fetchSetting = async () => {
    try {
        const res = await settingApi.get()
        setting.value = res.data
    } catch (e) {
        console.error("Gagal load setting kop surat")
    }
}

const backendUrl = import.meta.env.VITE_API_URL 
    ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') 
    : 'http://localhost:5000';

onMounted(() => fetchSetting())
</script>

<template>
  <div class="hidden print:block text-center border-b-2 border-black pb-4 mb-6">
    <div class="flex items-center justify-center gap-6 mb-2">
        <div class="w-24 h-24 flex items-center justify-center">
            <img 
                v-if="setting.logo" 
                :src="`${backendUrl}/uploads/${setting.logo}`" 
                class="w-full h-full object-contain"
            />
            <div v-else class="w-full h-full bg-slate-200 flex items-center justify-center border text-[10px] text-slate-500">
                NO LOGO
            </div>
        </div>
        
        <div class="text-center flex-1">
            <h1 class="text-3xl font-bold uppercase tracking-wider font-serif">
                {{ setting.nama_sekolah }}
            </h1>
            <p class="text-sm text-slate-800 mt-1 font-serif">
                {{ setting.alamat_sekolah }}
            </p>
            <p class="text-xs text-slate-600 mt-1 italic font-serif">
                Web: {{ setting.website }} | Email: {{ setting.email }}
            </p>
        </div>
    </div>
    
    <div class="mt-4 border-t-2 border-black pt-2 border-double">
        <h2 class="text-xl font-bold underline uppercase tracking-widest">Laporan Hasil Ujian</h2>
    </div>
  </div>
</template>