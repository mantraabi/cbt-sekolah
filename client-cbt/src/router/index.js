import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth' 

// #9 FIX: Lazy-load layouts juga (hemat initial bundle)
const AdminLayout = () => import('@/layouts/AdminLayout.vue')
const StudentLayout = () => import('@/layouts/StudentLayout.vue')
const PengawasLayout = () => import('@/layouts/PengawasLayout.vue')

const routes = [
  {
      path: '/',  
      name: 'Login',
      component: () => import('../views/auth/LoginView.vue') 
  },
  
  // 1. ADMIN ROUTES (Rumah Admin)
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true }, 
    children: [
      { path: 'dashboard', meta: { title: 'Dashboard' }, component: () => import('@/views/admin/Dashboard.vue') },
      { path: 'bank-soal', meta: { title: 'Bank Soal' }, component: () => import('@/views/admin/BankSoal.vue') },
      { path: 'academic', meta: { title: 'Data Akademik' }, component: () => import('@/views/admin/DataMapel.vue') },
      { path: 'exams', meta: { title: 'Jadwal Ujian' }, component: () => import('@/views/admin/JadwalUjian.vue') },
      { path: 'exams/:id/results', meta: { title: 'Hasil Nilai' }, component: () => import('@/views/admin/HasilNilai.vue') },
      { path: 'rekap-nilai', meta: { title: 'Rekap Nilai' }, component: () => import('@/views/admin/RekapNilai.vue') },
      { path: 'students', meta: { title: 'Data Siswa' }, component: () => import('@/views/admin/DataSiswa.vue') },
      { path: 'settings', meta: { title: 'Pengaturan' }, component: () => import('@/views/admin/Pengaturan.vue') },
      { path: 'users', meta: { title: 'Manajemen Pengguna' }, component: () => import('@/views/admin/ManajemenPengguna.vue') },
      { path: 'koreksi/:nilaiId', meta: { title: 'Koreksi Jawaban' }, component: () => import('@/views/admin/KoreksiJawaban.vue') },
      { path: 'koreksi-esai/:id', meta: { title: 'Koreksi Esai' }, component: () => import('@/views/admin/KoreksiEsai.vue') },
      { path: 'cetak-kartu', meta: { title: 'Cetak Kartu' }, component: () => import('@/views/admin/CetakKartu.vue') },
      { path: 'monitoring/:id', meta: { title: 'Monitoring Ujian' }, component: () => import('@/views/admin/MonitoringUjian.vue') },
      { path: 'maintenance', meta: { title: 'Maintenance' }, component: () => import('@/views/admin/Maintenance.vue') },
      { path: 'changelog', meta: { title: 'Informasi Update' }, component: () => import('@/views/admin/ChangelogView.vue') }
    ]
  },

  // 2. PENGAWAS ROUTES (Rumah Pengawas)
  {
    path: '/pengawas',
    component: PengawasLayout,
    meta: { requiresAuth: true },
    children: [
      { path: 'exams', meta: { title: 'Jadwal Ujian' }, component: () => import('@/views/admin/JadwalUjian.vue') },
      { path: 'monitoring/:id', meta: { title: 'Monitoring Ujian' }, component: () => import('@/views/admin/MonitoringUjian.vue') },
      { path: 'changelog', meta: { title: 'Informasi Update' }, component: () => import('@/views/admin/ChangelogView.vue') }
    ]
  },

  // 3. STUDENT ROUTES (Rumah Siswa)
  {
    path: '/student',
    component: StudentLayout, 
    meta: { requiresAuth: true },
    children: [
      { path: 'dashboard', meta: { title: 'Dashboard Siswa' }, component: () => import('@/views/student/Dashboard.vue') },
      { path: 'exam/:id', meta: { title: 'Mengerjakan Ujian' }, component: () => import('@/views/student/ExamView.vue') },
      { path: 'change-password', meta: { title: 'Ganti Password' }, component: () => import('@/views/student/GantiPassword.vue') }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// ==========================================
// SATPAM JALUR LALU LINTAS
// ==========================================
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const isAuthenticated = authStore.isAuthenticated
  
  // +++ TAMBAHKAN .toLowerCase() DI SINI +++
  const role = authStore.user?.role?.toLowerCase() 

  if (to.meta.requiresAuth && !isAuthenticated) return next('/')

  if (to.path === '/' && isAuthenticated) {
    if (role === 'admin' || role === 'guru') return next('/admin/dashboard')
    if (role === 'pengawas') return next('/pengawas/exams')
    return next('/student/dashboard')
  }

  if (to.path.startsWith('/admin') && role === 'pengawas') {
    return next('/pengawas/exams')
  }

  if (to.path.startsWith('/pengawas') && (role === 'admin' || role === 'guru')) {
    return next('/admin/dashboard')
  }

  if (to.path.startsWith('/admin') && role === 'guru') {
    // Daftar ruangan terlarang untuk Guru
    const forbiddenPaths = [
        '/admin/students', 
        '/admin/users', 
        '/admin/academic', 
        '/admin/settings', 
        '/admin/maintenance', 
        '/admin/cetak-kartu'
    ]
    
    // Cek apakah Guru mencoba masuk ke ruangan terlarang
    const isForbidden = forbiddenPaths.some(path => to.path.startsWith(path))
    
    if (isForbidden) {
        // Tendang balik ke Dashboard Guru tanpa ampun
        return next('/admin/dashboard')
    }
  }

  // Mencegah selamanya: Admin/Guru/Pengawas TIDAK BOLEH masuk ke area Siswa!
  if (to.path.startsWith('/student') && ['admin', 'guru', 'pengawas'].includes(role)) {
    if (role === 'pengawas') return next('/pengawas/exams')
    return next('/admin/dashboard')
  }

  next()
})

// ==========================================
// DYNAMIC DOCUMENT TITLE (Ubah Judul Tab Otomatis)
// ==========================================
router.afterEach((to) => {
  if (to.path === '/') return;

  // Sekarang dia akan mengambil nama dari meta.title yang sudah kita buat di atas
  let pageTitle = to.meta.title || to.name || 'Panel';
  
  pageTitle = pageTitle.replace(/([A-Z])/g, ' $1').trim();

  document.title = `${pageTitle} | CBT Sekolah`;
});

export default router