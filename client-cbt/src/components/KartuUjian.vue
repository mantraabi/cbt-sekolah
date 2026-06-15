<script setup>
import { computed } from 'vue'

const props = defineProps({
    siswa: { type: Object, required: true },
    sekolah: { type: Object, required: true }
})

// 1. Tambahkan backendUrl yang dinamis
const backendUrl = import.meta.env.VITE_API_URL 
    ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') 
    : 'http://localhost:5000';

// 2. Ganti localhost dengan backendUrl
const fotoUrl = computed(() => props.siswa.foto ? `${backendUrl}/uploads/${props.siswa.foto}` : null)
const logoUrl = computed(() => props.sekolah.logo ? `${backendUrl}/uploads/${props.sekolah.logo}` : null)
</script>

<template>
    <div class="border border-slate-800 bg-white text-slate-900 shadow-sm break-inside-avoid relative overflow-hidden"
         style="width: 9.5cm; height: 6.2cm; padding: 0.2cm;">
        
        <div class="flex items-center gap-2 border-b border-slate-800 pb-1 mb-1">
            <div class="w-8 h-8 flex-shrink-0 flex items-center justify-center">
                <img v-if="logoUrl" :src="logoUrl" class="w-full h-full object-contain" />
            </div>
            <div class="flex-1 text-center leading-none">
                <h3 class="font-bold text-[10px] uppercase tracking-wide">{{ sekolah.nama_sekolah }}</h3>
                <p class="text-[7px] mt-0.5">{{ sekolah.alamat_sekolah || sekolah.alamat || '-' }}</p>
            </div>
        </div>

        <div class="text-center font-bold text-[9px] bg-slate-100 border-y border-slate-200 mb-2 py-0.5 uppercase tracking-wider">
            KARTU PESERTA UJIAN
        </div>

        <div class="flex gap-2 items-start">
            <div class="w-[2cm] h-[2.6cm] border border-slate-300 bg-slate-50 flex items-center justify-center text-[7px] text-slate-400 flex-shrink-0">
                <img v-if="fotoUrl" :src="fotoUrl" class="w-full h-full object-cover" />
                <span v-else class="text-center">FOTO<br>2x3</span>
            </div>

            <div class="flex-1 text-[9px] leading-tight space-y-1">
                <div class="flex">
                    <span class="w-12 font-semibold">Nama</span>
                    <span class="font-bold uppercase truncate">: {{ siswa.nama_lengkap }}</span>
                </div>
                <div class="flex">
                    <span class="w-12 font-semibold">No. Ujian</span>
                    <span class="font-mono font-bold">: {{ siswa.username }}</span>
                </div>
                 <div class="flex">
                    <span class="w-12 font-semibold">Password</span>
                    <span class="font-mono font-bold">: {{ siswa.password_asli || '******' }}</span>
                </div>
                <div class="flex">
                    <span class="w-12 font-semibold">Kelas</span>
                    <span>: {{ siswa.kelas }}</span>
                </div>
            </div>
        </div>

        <div class="absolute bottom-1 right-2 text-center w-24">
            <p class="text-[7px]">Kepala Sekolah,</p>
            <div class="h-6"></div> 
            <p class="text-[7px] font-bold underline">{{ sekolah.kepala_sekolah }}</p>
            <p class="text-[6px] -mt-0.5">NIP. {{ sekolah.nip || '-' }}</p>
        </div>

        <div class="absolute bottom-1 left-2 w-40">
            <p class="text-[6px] italic text-slate-500 leading-tight">
                *Wajib dibawa saat ujian.<br>
                *Jaga kerahasiaan password Anda.
            </p>
        </div>

    </div>
</template>

<style scoped>
.break-inside-avoid {
    break-inside: avoid;
    page-break-inside: avoid;
}
</style>