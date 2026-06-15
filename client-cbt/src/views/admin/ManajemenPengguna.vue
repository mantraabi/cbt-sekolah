<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api/axios' // Asumsi kamu menggunakan instance axios bawaan
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription
} from '@/components/ui/dialog'
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'vue-sonner'
import { 
  PhUsers, PhPlus, PhTrash, PhPencilSimple, PhMagnifyingGlass
} from '@phosphor-icons/vue'

const users = ref([])
const loading = ref(true)
const dialogOpen = ref(false)
const isEditMode = ref(false)
const editId = ref(null)

const form = ref({
    username: '',
    nama_lengkap: '',
    password: '',
    role: 'pengawas' // Default role
})

// Fungsi memanggil data dari backend (Sesuaikan endpoint API kamu jika berbeda)
const fetchUsers = async () => {
    loading.value = true
    try {
        // Asumsi endpoint kamu adalah /api/users
        const res = await api.get('/users')
        users.value = res.data.data || res.data
    } catch (error) {
        toast.error("Gagal memuat data pengguna")
    } finally {
        loading.value = false
    }
}

const getRoleColor = (role) => {
    if (role === 'admin') return 'bg-purple-100 text-purple-800 border-purple-200'
    if (role === 'guru') return 'bg-blue-100 text-blue-800 border-blue-200'
    if (role === 'pengawas') return 'bg-green-100 text-green-800 border-green-200'
    return 'bg-slate-100 text-slate-800 border-slate-200'
}

const openEdit = (user) => {
    isEditMode.value = true
    editId.value = user.id
    form.value = {
        username: user.username,
        nama_lengkap: user.nama_lengkap,
        password: '', // Kosongkan password saat edit, isi jika ingin diganti
        role: user.role
    }
    dialogOpen.value = true
}

const resetForm = () => {
    isEditMode.value = false
    editId.value = null
    form.value = { username: '', nama_lengkap: '', password: '', role: 'pengawas' }
}

const handleSubmit = async () => {
    if (!form.value.username || !form.value.nama_lengkap) {
        return toast.error("Username dan Nama Lengkap wajib diisi!")
    }
    if (!isEditMode.value && !form.value.password) {
        return toast.error("Password wajib diisi untuk pengguna baru!")
    }

    try {
        if (isEditMode.value) {
            // Jika password kosong saat edit, hapus dari payload agar tidak mengubah password lama
            const payload = { ...form.value }
            if (!payload.password) delete payload.password
            
            await api.put(`/users/${editId.value}`, payload)
            toast.success("Data pengguna diperbarui")
        } else {
            await api.post('/users', form.value)
            toast.success("Pengguna baru berhasil ditambahkan")
        }
        dialogOpen.value = false
        resetForm()
        fetchUsers()
    } catch (error) { 
        toast.error(error.response?.data?.msg || "Gagal menyimpan data pengguna") 
    }
}

const deleteUser = async (id, nama) => {
    if(!confirm(`Yakin ingin menghapus akun ${nama}?\nAkses loginnya akan dicabut secara permanen.`)) return
    try { 
        await api.delete(`/users/${id}`)
        toast.success("Pengguna berhasil dihapus")
        fetchUsers() 
    } catch (error) { 
        toast.error(error.response?.data?.msg || "Gagal menghapus pengguna") 
    }
}

onMounted(() => fetchUsers())
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-lg shadow-sm border">
        <div>
            <h2 class="text-2xl font-bold flex items-center gap-2 text-slate-800">
                <PhUsers class="text-blue-600" /> Manajemen Pengguna
            </h2>
            <p class="text-slate-500">Kelola akun akses Admin, Guru, dan Pengawas.</p>
        </div>
        
        <Dialog v-model:open="dialogOpen">
            <DialogTrigger as-child>
                <Button @click="resetForm"><PhPlus class="mr-2" /> Tambah Pengguna</Button>
            </DialogTrigger>
            <DialogContent class="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{{ isEditMode ? 'Edit Pengguna' : 'Tambah Pengguna Baru' }}</DialogTitle>
                    <DialogDescription>
                        Pastikan username unik dan mudah diingat.
                    </DialogDescription>
                </DialogHeader>
                <div class="space-y-4 py-4">
                    <div class="space-y-2">
                        <Label>Nama Lengkap</Label>
                        <Input v-model="form.nama_lengkap" placeholder="Contoh: Bapak Budi Santoso" />
                    </div>
                    <div class="space-y-2">
                        <Label>Username</Label>
                        <Input v-model="form.username" placeholder="Contoh: budisantoso" :disabled="isEditMode" />
                        <span v-if="isEditMode" class="text-xs text-orange-500">Username tidak dapat diubah setelah dibuat.</span>
                    </div>
                    <div class="space-y-2">
                        <Label>Role Akses</Label>
                        <Select v-model="form.role">
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pengawas">Pengawas (Monitoring Saja)</SelectItem>
                                <SelectItem value="guru">Guru (Bisa Buat Soal/Jadwal)</SelectItem>
                                <SelectItem value="admin">Administrator (Akses Penuh)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div class="space-y-2">
                        <Label>Password</Label>
                        <Input v-model="form.password" type="password" :placeholder="isEditMode ? 'Kosongkan jika tidak ingin ganti' : 'Minimal 6 karakter'" />
                    </div>
                    <Button class="w-full mt-4" @click="handleSubmit">
                        {{ isEditMode ? 'Simpan Perubahan' : 'Buat Akun' }}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    </div>

    <div class="border rounded-lg bg-white overflow-hidden shadow-sm flex flex-col">
        <Table>
            <TableHeader class="bg-slate-50">
                <TableRow>
                    <TableHead>Nama Lengkap</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead class="text-right">Aksi</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow v-if="loading">
                    <TableCell colspan="4" class="text-center py-10 text-slate-500">Memuat data pengguna...</TableCell>
                </TableRow>
                <TableRow v-else-if="users.length === 0">
                    <TableCell colspan="4" class="text-center py-10 text-slate-500">Belum ada data pengguna ditemukan.</TableCell>
                </TableRow>
                
                <TableRow v-else v-for="user in users" :key="user.id">
                    <TableCell class="font-medium text-slate-800">
                        {{ user.nama_lengkap }}
                    </TableCell>
                    <TableCell>
                        <span class="font-mono text-sm bg-slate-100 px-2 py-1 rounded text-slate-600">
                            {{ user.username }}
                        </span>
                    </TableCell>
                    <TableCell>
                        <Badge variant="outline" class="capitalize" :class="getRoleColor(user.role)">
                            {{ user.role }}
                        </Badge>
                    </TableCell>
                    <TableCell class="text-right">
                        <div class="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" class="h-8 border-yellow-300 text-yellow-700 hover:bg-yellow-50" @click="openEdit(user)" title="Edit Pengguna">
                                <PhPencilSimple class="mr-1 h-4 w-4" /> Edit
                            </Button>
                            <Button variant="ghost" size="icon" class="text-red-500 hover:bg-red-50 h-8 w-8" @click="deleteUser(user.id, user.nama_lengkap)">
                                <PhTrash />
                            </Button>
                        </div>
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
    </div>
  </div>
</template>