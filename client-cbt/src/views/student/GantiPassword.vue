<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import authApi from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'vue-sonner'
import { PhLockKey, PhArrowLeft } from '@phosphor-icons/vue'

const router = useRouter()
const form = ref({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
})
const loading = ref(false)

const handleChange = async () => {
    // Validasi Frontend
    if (form.value.newPassword !== form.value.confirmPassword) {
        return toast.error("Konfirmasi password tidak cocok")
    }
    if (form.value.newPassword.length < 6) {
        return toast.warning("Password minimal 6 karakter")
    }

    loading.value = true
    try {
        await authApi.changePassword({
            password_lama: form.value.currentPassword,
            password_baru: form.value.newPassword
        })
        
        toast.success("Password Berhasil Diganti!")
        
        // Logout user agar login ulang dengan password baru
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setTimeout(() => router.push('/'), 1500)

    } catch (error) {
        toast.error(error.response?.data?.msg || "Gagal ganti password")
    } finally {
        loading.value = false
    }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <Card class="w-full max-w-md shadow-lg">
        <CardHeader>
            <div class="flex items-center gap-2 mb-2">
                 <Button variant="ghost" size="icon" @click="router.push('/student/dashboard')">
                    <PhArrowLeft />
                 </Button>
                 <CardTitle class="text-xl">Ganti Password</CardTitle>
            </div>
            <CardDescription>Amankan akunmu dengan password baru.</CardDescription>
        </CardHeader>
        <CardContent>
            <form @submit.prevent="handleChange" class="space-y-4">
                <div class="space-y-2">
                    <Label>Password Lama</Label>
                    <Input type="password" v-model="form.currentPassword" placeholder="Masukkan password saat ini" required />
                </div>
                
                <div class="space-y-2">
                    <Label>Password Baru</Label>
                    <Input type="password" v-model="form.newPassword" placeholder="Minimal 6 karakter" required />
                </div>

                <div class="space-y-2">
                    <Label>Konfirmasi Password Baru</Label>
                    <Input type="password" v-model="form.confirmPassword" placeholder="Ulangi password baru" required />
                </div>

                <Button type="submit" class="w-full mt-4" :disabled="loading">
                    <PhLockKey class="mr-2" />
                    {{ loading ? 'Menyimpan...' : 'Simpan Password Baru' }}
                </Button>
            </form>
        </CardContent>
    </Card>
  </div>
</template>