<script setup>
import { ref } from 'vue'
import systemApi from '@/api/system'
import { Button } from '@/components/ui/button'
import { toast } from 'vue-sonner'
import { PhDatabase, PhDownloadSimple, PhUploadSimple, PhWarning } from '@phosphor-icons/vue'

const loading = ref(false)
const restoreFile = ref(null)

// DOWNLOAD BACKUP
const handleBackup = async () => {
    loading.value = true
    try {
        const response = await systemApi.downloadBackup()
        // Buat link download virtual
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        const date = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `backup_cbt_${date}.json`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success("Backup berhasil didownload")
    } catch (error) {
        toast.error("Gagal backup database")
    } finally {
        loading.value = false
    }
}

// RESTORE DATABASE
const handleFile = (e) => {
    restoreFile.value = e.target.files[0]
}

const handleRestore = async () => {
    if(!restoreFile.value) return toast.error("Pilih file JSON dulu!")
    
    if(!confirm("PERINGATAN KERAS: \nRestore akan MENGHAPUS SEMUA DATA saat ini dan menggantinya dengan data dari file backup.\n\nLanjutkan?")) return;

    loading.value = true
    const formData = new FormData()
    formData.append('file_backup', restoreFile.value)

    try {
        await systemApi.restore(formData)
        toast.success("Restore Berhasil! Silakan Login Ulang.")
        setTimeout(() => window.location.href = '/', 2000)
    } catch (error) {
        toast.error("Gagal restore data. Pastikan file benar.")
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <div class="max-w-4xl mx-auto space-y-8">
        <div>
            <h2 class="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <PhDatabase class="text-blue-600"/> Maintenance System
            </h2>
            <p class="text-slate-500">Backup dan Restore data ujian untuk keamanan.</p>
        </div>

        <div class="grid md:grid-cols-2 gap-8">
            <div class="border rounded-xl p-6 bg-white shadow-sm flex flex-col justify-between">
                <div>
                    <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                        <PhDownloadSimple size="24" weight="bold"/>
                    </div>
                    <h3 class="text-lg font-bold mb-2">Backup Database</h3>
                    <p class="text-sm text-slate-600 mb-6">
                        Unduh seluruh data (Siswa, Soal, Nilai, Pengaturan) dalam format JSON. Simpan file ini di tempat aman (Google Drive/Flashdisk).
                    </p>
                </div>
                <Button @click="handleBackup" :disabled="loading" class="w-full">
                    {{ loading ? 'Memproses...' : 'Download Backup Data' }}
                </Button>
            </div>

            <div class="border rounded-xl p-6 bg-white shadow-sm flex flex-col justify-between border-t-4 border-t-red-500">
                <div>
                    <div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center text-red-600 mb-4">
                        <PhUploadSimple size="24" weight="bold"/>
                    </div>
                    <h3 class="text-lg font-bold mb-2">Restore Database</h3>
                    <div class="bg-red-50 p-3 rounded border border-red-100 mb-4">
                        <p class="text-xs text-red-700 font-semibold flex gap-2">
                            <PhWarning size="16"/> PERHATIAN:
                        </p>
                        <p class="text-xs text-red-600 mt-1">
                            Tindakan ini akan <b>MENIMPA/MENGHAPUS</b> data yang ada sekarang. Pastikan Anda tahu apa yang Anda lakukan.
                        </p>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-1">File Backup (.json)</label>
                        <input type="file" @change="handleFile" accept=".json" class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                    </div>
                </div>
                <Button variant="destructive" @click="handleRestore" :disabled="loading" class="w-full">
                    {{ loading ? 'Memulihkan...' : 'Restore Data Sekarang' }}
                </Button>
            </div>
        </div>
    </div>
</template>