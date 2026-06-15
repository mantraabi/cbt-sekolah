<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import settingApi from '@/api/setting'
import authApi from '@/api/auth'
import licenseApi from '@/api/license'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'vue-sonner'
import { PhFloppyDisk, PhImage, PhUpload, PhLockKey, PhKey, PhCheckCircle, PhWarning, PhXCircle, PhClock } from '@phosphor-icons/vue'

const router = useRouter()

const backendUrl = import.meta.env.VITE_API_URL 
    ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') 
    : 'http://localhost:5000';

// --- STATE PENGATURAN SEKOLAH ---
const loading = ref(false)
const form = ref({
    nama_sekolah: '', alamat_sekolah: '', website: '', email: '',
    kepala_sekolah: '', nip: '', list_pelanggaran: '', max_pelanggaran: 5
})
const logoPreview = ref(null)
const logoFile = ref(null)

// --- STATE GANTI PASSWORD ---
const dialogPasswordOpen = ref(false)
const loadingPassword = ref(false)
const formPassword = ref({
    password_lama: '',
    password_baru: '',
    konfirmasi_password: ''
})

// --- STATE LISENSI ---
const licenseInfo = ref(null)
const licenseKey = ref('')
const loadingLicense = ref(false)
const dialogLicenseOpen = ref(false)
const packageFeatures = ref(null)

const fetchLicense = async () => {
    try {
        const res = await licenseApi.getStatus()
        licenseInfo.value = res.data
    } catch (e) {
        licenseInfo.value = { status: 'none', message: 'Gagal memuat lisensi' }
    }
}

const handleActivateLicense = async () => {
    if (!licenseKey.value.trim()) return toast.error('Masukkan license key!')
    loadingLicense.value = true
    try {
        const res = await licenseApi.activate(licenseKey.value.trim())
        toast.success(res.data.msg)
        licenseKey.value = ''
        dialogLicenseOpen.value = false
        fetchLicense()
    } catch (e) {
        toast.error(e.response?.data?.msg || 'Gagal aktivasi lisensi')
    } finally {
        loadingLicense.value = false
    }
}

const handleDeactivateLicense = async () => {
    if (!confirm('Hapus lisensi? Sistem akan masuk mode terbatas.')) return
    try {
        await licenseApi.deactivate()
        toast.success('Lisensi dihapus')
        fetchLicense()
    } catch (e) {
        toast.error('Gagal menghapus lisensi')
    }
}

const fetchPackageFeatures = async () => {
    try {
        const res = await licenseApi.getFeatures()
        packageFeatures.value = res.data
    } catch (e) {
        packageFeatures.value = null
    }
}

const featureLabels = {
    export_excel: 'Export Nilai Excel',
    import_soal: 'Import Soal Excel',
    backup_restore: 'Backup & Restore DB',
    monitoring: 'Monitoring Real-time',
    item_analysis: 'Analisis Butir Soal',
    koreksi_esai: 'Koreksi Esai Manual',
    cetak_kartu: 'Cetak Kartu Ujian',
    bank_soal_unlimited: 'Bank Soal Unlimited',
    rekap_nilai: 'Rekap Nilai',
    manajemen_pengguna: 'Kelola Pengguna'
}

const getLicenseColor = (status) => {
    if (status === 'active') return 'border-green-200 bg-green-50'
    if (status === 'expired') return 'border-yellow-200 bg-yellow-50'
    return 'border-red-200 bg-red-50'
}

const getLicenseIcon = (status) => {
    if (status === 'active') return PhCheckCircle
    if (status === 'expired') return PhClock
    return PhXCircle
}

// --- LOGIC PENGATURAN SEKOLAH ---
const fetchData = async () => {
    try {
        const res = await settingApi.get()
        form.value = res.data
        if(res.data.logo) {
            logoPreview.value = `${backendUrl}/uploads/${res.data.logo}`
        }
    } catch (e) { console.error(e) }
}

const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
        logoFile.value = file
        logoPreview.value = URL.createObjectURL(file)
    }
}

const handleSubmit = async () => {
    loading.value = true
    const formData = new FormData()
    
    Object.keys(form.value).forEach(key => {
        formData.append(key, form.value[key] || '')
    })
    
    if(logoFile.value) formData.append('logo', logoFile.value)

    try {
        await settingApi.update(formData)
        toast.success("Pengaturan Sekolah Disimpan!")
        setTimeout(() => window.location.reload(), 1000) 
    } catch (error) {
        toast.error("Gagal menyimpan")
    } finally {
        loading.value = false
    }
}

// --- LOGIC GANTI PASSWORD ---
const submitGantiPassword = async () => {
    if (!formPassword.value.password_lama || !formPassword.value.password_baru) {
        return toast.error("Semua kolom wajib diisi!")
    }
    if (formPassword.value.password_baru !== formPassword.value.konfirmasi_password) {
        return toast.error("Konfirmasi password tidak cocok!")
    }
    if (formPassword.value.password_baru.length < 6) {
        return toast.error("Password baru minimal 6 karakter!")
    }

    loadingPassword.value = true
    try {
        await authApi.changePassword({
            password_lama: formPassword.value.password_lama,
            password_baru: formPassword.value.password_baru
        })
        
        toast.success("Password berhasil diubah! Silakan login ulang.")
        dialogPasswordOpen.value = false
        formPassword.value = { password_lama: '', password_baru: '', konfirmasi_password: '' }
        
        // Logout Otomatis
        setTimeout(() => {
            localStorage.removeItem('token') // Sesuaikan jika kamu pakai Pinia/cara lain
            window.location.href = '/'
        }, 1500)

    } catch (error) {
        const msg = error.response?.data?.msg || "Gagal mengubah password"
        toast.error(msg)
    } finally {
        loadingPassword.value = false
    }
}

onMounted(() => {
    fetchData()
    fetchLicense()
    fetchPackageFeatures()
})
</script>

<template>
    <div class="space-y-6">
        <div>
            <h2 class="text-3xl font-bold tracking-tight text-slate-900">Pengaturan Sekolah</h2>
            <p class="text-slate-500">Atur identitas sekolah, logo, dan pejabat penandatangan.</p>
        </div>

        <div class="grid md:grid-cols-3 gap-6">
            <div class="md:col-span-2 space-y-6">
                <Card>
                    <CardHeader><CardTitle>Identitas Sekolah</CardTitle></CardHeader>
                    <CardContent class="space-y-4">
                            <div class="space-y-2">
                                <Label>Nama Sekolah</Label>
                                <Input v-model="form.nama_sekolah" placeholder="SMP NEGERI 1 KONOHA" class="font-bold"/>
                            </div>
                            <div class="space-y-2">
                                <Label>Alamat Lengkap</Label>
                                <Textarea v-model="form.alamat_sekolah" placeholder="Jl. Shinobi No. 1, Kota Konoha" rows="3" />
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div class="space-y-2">
                                    <Label>Website</Label>
                                    <Input v-model="form.website" placeholder="www.sekolah.sch.id" />
                                </div>
                                <div class="space-y-2">
                                    <Label>Email</Label>
                                    <Input v-model="form.email" placeholder="admin@sekolah.sch.id" />
                                </div>
                            </div>

                            <div class="pt-4 mt-4 border-t space-y-4">
                                <h3 class="font-semibold text-slate-700">Pejabat Penandatangan (Kartu Ujian)</h3>
                                <div class="grid grid-cols-2 gap-4">
                                    <div class="space-y-2">
                                        <Label>Nama Kepala Sekolah</Label>
                                        <Input v-model="form.kepala_sekolah" placeholder="Nama Lengkap & Gelar" />
                                    </div>
                                    <div class="space-y-2">
                                        <Label>NIP</Label>
                                        <Input v-model="form.nip" placeholder="NIP. 199..." />
                                    </div>
                                </div>
                            </div>

                            <div class="pt-4 mt-4 border-t space-y-4">
                                <h3 class="font-semibold text-slate-700">Aturan & Keamanan Ujian</h3>
                                
                                <div class="space-y-2">
                                    <Label>Batas Maksimal Pelanggaran</Label>
                                    <Input 
                                        type="number" 
                                        v-model="form.max_pelanggaran" 
                                        placeholder="Contoh: 5" 
                                        class="md:w-1/2"
                                    />
                                    <p class="text-xs text-slate-500">
                                        Jika siswa pindah tab melebihi batas ini, ujian akan otomatis disubmit (selesai).
                                    </p>
                                </div>

                                <div class="space-y-2">
                                    <Label>Daftar Pelanggaran</Label>
                                    <textarea 
                                        v-model="form.list_pelanggaran" 
                                        class="w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" 
                                        rows="3"
                                        placeholder="Pisahkan dengan koma (Contoh: Mencontek, Buka Tab Baru, Membuka Buku)"
                                    ></textarea>
                                    <p class="text-xs text-slate-500">Pisahkan setiap pelanggaran dengan tanda koma (,)</p>
                                </div>
                            </div>
                        </CardContent>
                </Card>
            </div>

            <div>
                <Card>
                    <CardHeader><CardTitle>Logo Sekolah</CardTitle></CardHeader>
                    <CardContent class="flex flex-col items-center space-y-4">
                        <div class="w-40 h-40 border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden bg-slate-50 relative group">
                            <img v-if="logoPreview" :src="logoPreview" class="w-full h-full object-contain p-2" />
                            <div v-else class="text-slate-400 text-sm flex flex-col items-center">
                                <PhImage size="32" />
                                <span>No Logo</span>
                            </div>
                        </div>
                        
                        <div class="w-full">
                            <Label for="logo-upload" class="cursor-pointer inline-flex w-full justify-center items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
                                <PhUpload /> Pilih Gambar...
                            </Label>
                            <input id="logo-upload" type="file" class="hidden" accept="image/*" @change="handleFileChange" />
                        </div>
                        <p class="text-xs text-slate-500 text-center">Format: PNG/JPG (Transparan lebih baik). Max 2MB.</p>
                    </CardContent>
                </Card>

                <Button class="w-full mt-6" size="lg" @click="handleSubmit" :disabled="loading">
                    <PhFloppyDisk class="mr-2 text-lg" weight="bold"/> 
                    {{ loading ? 'Menyimpan...' : 'Simpan Perubahan' }}
                </Button>

                <!-- LISENSI CARD -->
                <Card class="mt-6" :class="licenseInfo ? getLicenseColor(licenseInfo.status) : 'border-slate-200'">
                    <CardHeader class="pb-3 border-b">
                        <CardTitle class="text-lg flex items-center gap-2">
                            <PhKey weight="bold" /> Lisensi Sistem
                        </CardTitle>
                    </CardHeader>
                    <CardContent class="pt-4 space-y-3">
                        <div v-if="licenseInfo" class="flex items-start gap-3">
                            <component :is="getLicenseIcon(licenseInfo.status)" 
                                size="24" weight="fill"
                                :class="{
                                    'text-green-600': licenseInfo.status === 'active',
                                    'text-yellow-600': licenseInfo.status === 'expired',
                                    'text-red-600': licenseInfo.status !== 'active' && licenseInfo.status !== 'expired'
                                }"
                            />
                            <div class="flex-1 text-sm">
                                <p class="font-bold" :class="{
                                    'text-green-800': licenseInfo.status === 'active',
                                    'text-yellow-800': licenseInfo.status === 'expired',
                                    'text-red-800': licenseInfo.status !== 'active' && licenseInfo.status !== 'expired'
                                }">
                                    {{ licenseInfo.status === 'active' ? 'AKTIF' : licenseInfo.status === 'expired' ? 'EXPIRED' : licenseInfo.status === 'none' ? 'BELUM ADA' : 'TIDAK VALID' }}
                                </p>
                                <p v-if="licenseInfo.sekolah && licenseInfo.sekolah !== '-'" class="text-slate-600 mt-1">
                                    {{ licenseInfo.sekolah }}
                                </p>
                                <p v-if="licenseInfo.fitur && licenseInfo.fitur !== '-'" class="text-xs text-slate-500 mt-0.5">
                                    Paket: <span class="font-semibold capitalize">{{ licenseInfo.fitur }}</span>
                                    <span v-if="licenseInfo.max_siswa"> • Max {{ licenseInfo.max_siswa }} siswa</span>
                                </p>
                                <p v-if="licenseInfo.days_left > 0" class="text-xs text-slate-500 mt-0.5">
                                    {{ licenseInfo.days_left }} hari tersisa
                                </p>
                                <p v-if="licenseInfo.message" class="text-xs mt-1" :class="{
                                    'text-green-600': licenseInfo.status === 'active',
                                    'text-red-600': licenseInfo.status !== 'active'
                                }">
                                    {{ licenseInfo.message }}
                                </p>
                            </div>
                        </div>

                        <div class="flex gap-2 pt-2">
                            <Dialog v-model:open="dialogLicenseOpen">
                                <DialogTrigger as-child>
                                    <Button variant="outline" size="sm" class="flex-1">
                                        <PhKey class="mr-1 h-4 w-4" /> 
                                        {{ licenseInfo?.status === 'active' ? 'Ganti Lisensi' : 'Aktifkan Lisensi' }}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent class="sm:max-w-[500px]">
                                    <DialogHeader>
                                        <DialogTitle>Aktifkan Lisensi</DialogTitle>
                                    </DialogHeader>
                                    <div class="space-y-4 py-4">
                                        <p class="text-sm text-slate-500">
                                            Masukkan license key yang Anda dapatkan dari penyedia sistem CBT.
                                        </p>
                                        <div class="space-y-2">
                                            <Label>License Key</Label>
                                            <textarea 
                                                v-model="licenseKey" 
                                                class="w-full border rounded-md p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" 
                                                rows="4"
                                                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                            ></textarea>
                                        </div>
                                        <Button class="w-full" @click="handleActivateLicense" :disabled="loadingLicense">
                                            {{ loadingLicense ? 'Memverifikasi...' : 'Aktifkan' }}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                            <Button v-if="licenseInfo?.status === 'active'" variant="ghost" size="sm" class="text-red-500 hover:text-red-700 hover:bg-red-50" @click="handleDeactivateLicense">
                                Hapus
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <!-- FITUR PAKET -->
                <Card v-if="packageFeatures && licenseInfo?.status === 'active'" class="mt-4">
                    <CardHeader class="pb-3 border-b">
                        <CardTitle class="text-sm flex items-center gap-2">
                            <PhCheckCircle size="16" weight="fill" class="text-blue-600" />
                            Fitur Paket {{ packageFeatures.plan }}
                        </CardTitle>
                    </CardHeader>
                    <CardContent class="pt-4">
                        <div class="space-y-2">
                            <div v-for="(enabled, key) in packageFeatures.features" :key="key"
                                class="flex items-center gap-2 text-sm">
                                <span v-if="enabled" class="text-green-600">✅</span>
                                <span v-else class="text-red-400">❌</span>
                                <span :class="enabled ? 'text-slate-700' : 'text-slate-400 line-through'">
                                    {{ featureLabels[key] || key }}
                                </span>
                            </div>
                        </div>
                        <div v-if="packageFeatures.allowed_tipe_soal" class="mt-4 pt-3 border-t">
                            <p class="text-xs text-slate-500 mb-1">Tipe Soal Diizinkan:</p>
                            <div class="flex gap-1 flex-wrap">
                                <span v-for="t in packageFeatures.allowed_tipe_soal" :key="t"
                                    class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded capitalize">
                                    {{ t.replace('_', ' ') }}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card class="mt-8 border-red-100">
                    <CardHeader class="bg-red-50/50 pb-4 border-b">
                        <CardTitle class="text-red-700 text-lg flex items-center gap-2">
                            <PhLockKey weight="bold" /> Keamanan Akun
                        </CardTitle>
                    </CardHeader>
                    <CardContent class="pt-4 text-center">
                        <p class="text-xs text-slate-500 mb-4">Ubah password akun Administrator untuk menjaga keamanan sistem CBT.</p>
                        
                        <Dialog v-model:open="dialogPasswordOpen">
                            <DialogTrigger as-child>
                                <Button variant="outline" class="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
                                    Ganti Password Admin
                                </Button>
                            </DialogTrigger>

                            <DialogContent class="sm:max-w-[400px]">
                                <DialogHeader>
                                    <DialogTitle>Ubah Password Admin</DialogTitle>
                                </DialogHeader>
                                <div class="space-y-4 py-4">
                                    <div class="space-y-2">
                                        <Label>Password Lama</Label>
                                        <Input type="password" v-model="formPassword.password_lama" placeholder="Masukkan password saat ini" />
                                    </div>
                                    <div class="space-y-2">
                                        <Label>Password Baru</Label>
                                        <Input type="password" v-model="formPassword.password_baru" placeholder="Minimal 6 karakter" />
                                    </div>
                                    <div class="space-y-2">
                                        <Label>Konfirmasi Password Baru</Label>
                                        <Input type="password" v-model="formPassword.konfirmasi_password" placeholder="Ketik ulang password baru" />
                                    </div>
                                    <Button class="w-full mt-4" @click="submitGantiPassword" :disabled="loadingPassword">
                                        {{ loadingPassword ? 'Memproses...' : 'Simpan Password' }}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </CardContent>
                </Card>

            </div>
        </div>
    </div>
</template>