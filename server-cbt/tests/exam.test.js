// tests/exam.test.js — Test flow kritis CBT
// Jalankan: npx jest tests/ --verbose
// Pastikan: npm i -D jest supertest

const request = require('supertest');

// ============================================
// KONFIGURASI TEST
// ============================================
const BASE_URL = process.env.TEST_URL || 'http://localhost:5000';
let adminToken = '';
let studentToken = '';
let examId = '';

// ============================================
// TEST SUITE
// ============================================

describe('AUTH - Login', () => {
    test('Admin bisa login', async () => {
        const res = await request(BASE_URL)
            .post('/api/auth/login')
            .send({ username: 'admin', password: 'admin123' });
        
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('accessToken');
        expect(res.body.user.role).toBe('admin');
        adminToken = res.body.accessToken;
    });

    test('Password salah ditolak', async () => {
        const res = await request(BASE_URL)
            .post('/api/auth/login')
            .send({ username: 'admin', password: 'salah' });
        
        expect(res.status).toBe(400);
    });

    test('Input kosong ditolak validasi', async () => {
        const res = await request(BASE_URL)
            .post('/api/auth/login')
            .send({ username: '', password: '' });
        
        expect(res.status).toBe(400);
    });
});

describe('HEALTH CHECK', () => {
    test('GET /api/health → status ok', async () => {
        const res = await request(BASE_URL).get('/api/health');
        
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
        expect(res.body).toHaveProperty('database');
        expect(res.body).toHaveProperty('uptime');
    });
});

describe('EXAM - Protected Routes', () => {
    test('Tanpa token → 401', async () => {
        const res = await request(BASE_URL).get('/api/exams');
        expect(res.status).toBe(401);
    });

    test('Admin bisa lihat jadwal ujian', async () => {
        const res = await request(BASE_URL)
            .get('/api/exams')
            .set('Authorization', `Bearer ${adminToken}`);
        
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
    });
});

describe('EXAM - Create & Delete', () => {
    test('Admin bisa buat jadwal ujian', async () => {
        // Perlu mapel_id yang valid — skip jika tidak ada
        const mapelRes = await request(BASE_URL)
            .get('/api/subjects?limit=1')
            .set('Authorization', `Bearer ${adminToken}`);
        
        if (!mapelRes.body.data?.length) {
            console.log('⚠️  Skip: belum ada mata pelajaran');
            return;
        }

        const mapelId = mapelRes.body.data[0].id;
        
        const res = await request(BASE_URL)
            .post('/api/exams')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                nama_ujian: 'TEST UJIAN AUTOMATED',
                jenis_ujian: 'UH',
                tgl_mulai: new Date().toISOString(),
                tgl_selesai: new Date(Date.now() + 3600000).toISOString(),
                durasi_menit: 60,
                mapel_id: mapelId,
                acak_soal: false
            });
        
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('token');
    });

    test('Siswa tidak bisa buat jadwal ujian', async () => {
        // Login sebagai siswa dulu
        const loginRes = await request(BASE_URL)
            .post('/api/auth/login')
            .send({ username: 'siswa1', password: '123456' });
        
        if (loginRes.status !== 200) {
            console.log('⚠️  Skip: siswa1 tidak ditemukan');
            return;
        }

        const res = await request(BASE_URL)
            .post('/api/exams')
            .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
            .send({ nama_ujian: 'HACKED' });
        
        expect(res.status).toBe(403);
    });
});

describe('SECURITY', () => {
    test('Rate limit login (> 10 attempt)', async () => {
        const promises = [];
        for (let i = 0; i < 12; i++) {
            promises.push(
                request(BASE_URL)
                    .post('/api/auth/login')
                    .send({ username: 'bruteforce', password: 'wrong' })
            );
        }
        
        const results = await Promise.all(promises);
        const rateLimited = results.some(r => r.status === 429);
        expect(rateLimited).toBe(true);
    });
});
