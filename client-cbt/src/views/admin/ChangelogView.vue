<script setup>
import { PhMegaphone, PhRocketLaunch, PhBug, PhWrench, PhChartBar, PhDatabase, PhPalette, PhFunnel, PhBrain, PhShieldCheck } from '@phosphor-icons/vue'
</script>

<template>
  <div class="space-y-6 max-w-4xl pb-10">
    <div>
        <h2 class="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <PhMegaphone class="text-blue-600" /> Info Update & Changelog
        </h2>
        <p class="text-slate-500 mt-1">Catatan pembaruan dan fitur terbaru pada aplikasi CBT Sekolah.</p>
    </div>

    <div class="bg-white rounded-xl border-2 border-blue-100 shadow-md overflow-hidden relative">
        <div class="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
        <div class="bg-blue-50/50 border-b border-blue-100 p-4 flex justify-between items-center pl-6">
            <div>
                <h3 class="font-bold text-lg text-blue-900">Versi 1.5.0 (Smart Grading & Role Management)</h3>
                <span class="text-xs text-blue-600 font-medium">Dirilis: 14 Maret 2026</span>
            </div>
            <span class="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm animate-pulse">Terbaru</span>
        </div>
        
        <div class="p-6 space-y-6 pl-8">
            <div>
                <h4 class="font-bold text-slate-800 flex items-center gap-2 mb-3">
                    <PhBrain class="text-blue-500 text-xl" weight="fill" /> Fitur Cerdas (Baru)
                </h4>
                <ul class="list-disc pl-5 space-y-2 text-sm text-slate-600">
                    <li><strong class="text-slate-800">Koreksi Esai Otomatis (Mesin):</strong> Guru kini dapat memasukkan kata kunci jawaban pada soal esai. Sistem akan otomatis membaca jawaban siswa dan memberikan nilai proporsional detik itu juga saat siswa mengklik tombol Selesai.</li>
                </ul>
            </div>

            <div>
                <h4 class="font-bold text-slate-800 flex items-center gap-2 mb-3">
                    <PhShieldCheck class="text-blue-500 text-xl" weight="fill" /> Keamanan & Manajemen
                </h4>
                <ul class="list-disc pl-5 space-y-2 text-sm text-slate-600">
                    <li><strong class="text-slate-800">Menu Data Pengguna:</strong> Penambahan menu khusus untuk mengelola akun staf (Admin, Guru, dan Pengawas) secara terpisah dari data ratusan Siswa.</li>
                    <li><strong class="text-slate-800">Isolasi Hak Akses (Role Base):</strong> Akun Guru dan Pengawas kini memiliki batasan menu yang ketat. Mereka tidak lagi dapat mengakses area sensitif seperti Pengaturan atau menghapus data sistem.</li>
                </ul>
            </div>

            <div>
                <h4 class="font-bold text-slate-800 flex items-center gap-2 mb-3">
                    <PhBug class="text-red-500 text-xl" weight="fill" /> Perbaikan Sistem (Fixes)
                </h4>
                <ul class="list-disc pl-5 space-y-2 text-sm text-slate-600">
                    <li><strong>Algoritma Pengacakan Soal:</strong> Memperbarui mesin acak soal (dan opsi menjodohkan) ke algoritma <em>Fisher-Yates Shuffle</em> yang jauh lebih stabil di sisi server.</li>
                    <li><strong>Bug Nama "Memuat...":</strong> Mengatasi masalah tulisan "Memuat..." di pojok kanan atas layar dengan menerapkan teknik penarikan profil otomatis dari <em>Backend</em>.</li>
                    <li><strong>Routing Salah Kamar:</strong> Mencegah bug keamanan di mana Admin bisa tersasar ke dashboard Pengawas akibat sisa <em>cache</em> memori <em>browser</em>.</li>
                </ul>
            </div>
        </div>
    </div>

    <div class="bg-white rounded-xl border shadow-sm overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
        <div class="bg-slate-50 border-b p-4 flex justify-between items-center">
            <div>
                <h3 class="font-bold text-lg text-slate-800">Versi 1.4.0 (Auto-Installer & Scalability)</h3>
                <span class="text-xs text-slate-500 font-medium">Dirilis: 10 Maret 2026</span>
            </div>
        </div>
        
        <div class="p-6 space-y-6">
            <div>
                <h4 class="font-bold text-slate-800 flex items-center gap-2 mb-3">
                    <PhRocketLaunch class="text-slate-500 text-xl" weight="fill" /> Fitur Super (Baru)
                </h4>
                <ul class="list-disc pl-5 space-y-2 text-sm text-slate-600">
                    <li><strong class="text-slate-800">Server-Side Pagination:</strong> Menu <strong>Jadwal Ujian</strong>, <strong>Rekap Nilai</strong>, dan <strong>Data Akademik</strong> kini sanggup menampung puluhan ribu data tanpa <em>lag</em>, berkat pemotongan data langsung dari mesin database.</li>
                    <li><strong class="text-slate-800">Advanced Filtering:</strong> Menambahkan <em>dropdown filter</em> (berdasarkan Mapel & Kelas) serta kolom pencarian terintegrasi di berbagai menu utama.</li>
                </ul>
            </div>

            <div>
                <h4 class="font-bold text-slate-800 flex items-center gap-2 mb-3">
                    <PhBug class="text-slate-500 text-xl" weight="fill" /> Perbaikan Sistem (Fixes)
                </h4>
                <ul class="list-disc pl-5 space-y-2 text-sm text-slate-600">
                    <li>Memperbaiki konflik *Routing API* pada Data Akademik yang menyebabkan fitur filter tidak merespons.</li>
                    <li>Mengembalikan tombol aksi "Akhiri Ujian" yang sempat hilang pada tabel Jadwal Ujian.</li>
                </ul>
            </div>
        </div>
    </div>

    <div class="bg-white rounded-xl border shadow-sm overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
        <div class="bg-slate-50 border-b p-4 flex justify-between items-center">
            <div>
                <h3 class="font-bold text-lg text-slate-800">Versi 1.3.0 (Analytics & Performance)</h3>
                <span class="text-xs text-slate-500 font-medium">Dirilis: 1 Maret 2026</span>
            </div>
        </div>
        
        <div class="p-6 space-y-6">
            <div>
                <h4 class="font-bold text-slate-800 flex items-center gap-2 mb-3">
                    <PhChartBar class="text-slate-500 text-xl" weight="fill" /> Fitur Premium
                </h4>
                <ul class="list-disc pl-5 space-y-2 text-sm text-slate-600">
                    <li><strong class="text-slate-800">Analisis Butir Soal:</strong> Guru kini dapat melihat statistik detail tingkat kesulitan soal (Mudah/Sedang/Sulit) dan persentase kelulusan per butir soal di halaman Hasil Nilai.</li>
                    <li><strong class="text-slate-800">Changelog In-App:</strong> Penambahan halaman ini agar setiap pembaruan sistem dapat dipantau secara transparan oleh panitia.</li>
                </ul>
            </div>

            <div>
                <h4 class="font-bold text-slate-800 flex items-center gap-2 mb-3">
                    <PhDatabase class="text-slate-500 text-xl" weight="fill" /> Optimasi Performa
                </h4>
                <ul class="list-disc pl-5 space-y-2 text-sm text-slate-600">
                    <li><strong class="text-slate-800">Database Indexing:</strong> Menerapkan struktur *Index* pada MySQL untuk mempercepat proses *query* hingga 10x lipat, mencegah *server down* saat Try Out massal.</li>
                </ul>
            </div>

            <div>
                <h4 class="font-bold text-slate-800 flex items-center gap-2 mb-3">
                    <PhPalette class="text-slate-500 text-xl" weight="fill" /> Peningkatan UI / UX
                </h4>
                <ul class="list-disc pl-5 space-y-2 text-sm text-slate-600">
                    <li>Tabel Bank Soal kini dilengkapi kolom **Kunci Jawaban**.</li>
                    <li>Teks pertanyaan yang panjang pada Bank Soal kini dipotong rapi (maksimal 1 baris) dengan fitur *Hover Tooltip* untuk membaca selengkapnya.</li>
                    <li>Penambahan tombol "Kembali" pada halaman Monitoring Ujian Live.</li>
                </ul>
            </div>
        </div>
    </div>

    <div class="bg-white rounded-xl border shadow-sm overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
        <div class="bg-slate-50 border-b p-4 flex justify-between items-center">
            <div>
                <h3 class="font-bold text-lg text-slate-800">Versi 1.2.0 (Massive Update)</h3>
                <span class="text-xs text-slate-500 font-medium">Dirilis: 28 Februari 2026</span>
            </div>
        </div>
        
        <div class="p-6 space-y-6">
            <div>
                <h4 class="font-bold text-slate-800 flex items-center gap-2 mb-3">
                    <PhRocketLaunch class="text-slate-500 text-xl" weight="fill" /> Fitur Baru
                </h4>
                <ul class="list-disc pl-5 space-y-2 text-sm text-slate-600">
                    <li>Hapus Massal (Siswa & Soal) dengan satu kali klik menggunakan kotak centang.</li>
                    <li>Export Bank Soal ke format Excel (.xlsx) yang rapi.</li>
                    <li>Tombol 'Selesai' paksa per individu di menu Monitoring Live.</li>
                    <li>Statistik Live Monitoring untuk memantau jumlah siswa yang sudah/belum login secara real-time.</li>
                </ul>
            </div>

            <div>
                <h4 class="font-bold text-slate-800 flex items-center gap-2 mb-3">
                    <PhBug class="text-slate-500 text-xl" weight="fill" /> Perbaikan Bug (Fixes)
                </h4>
                <ul class="list-disc pl-5 space-y-2 text-sm text-slate-600">
                    <li>Memperbaiki sistem Anti-Curang yang terlalu sensitif (toleransi layar mati 15 detik).</li>
                    <li>Memperbaiki bug siswa tiba-tiba 'Selesai' akibat tiket login yang terlalu cepat kedaluwarsa.</li>
                    <li>Memperbaiki tampilan tabel Cetak PDF Rekap Nilai yang terpotong.</li>
                    <li>Mengembalikan Riwayat Ujian di Dashboard Siswa yang sempat hilang.</li>
                </ul>
            </div>
        </div>
    </div>

  </div>
</template>