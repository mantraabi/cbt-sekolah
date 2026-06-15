// public/sw.js — Service Worker untuk cache static assets
// Membuat load lebih cepat & bisa offline untuk halaman yang sudah dikunjungi

const CACHE_NAME = 'cbt-sekolah-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
];

// Install: cache shell app
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate: hapus cache lama
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch: cache-first untuk static assets, network-first untuk API
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // JANGAN cache API calls (harus selalu fresh dari server)
    if (url.pathname.startsWith('/api/')) {
        return;
    }

    // JANGAN cache socket.io
    if (url.pathname.startsWith('/socket.io/')) {
        return;
    }

    // Cache-first untuk static assets (JS, CSS, gambar, font)
    if (request.destination === 'script' || 
        request.destination === 'style' || 
        request.destination === 'image' ||
        request.destination === 'font') {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) return cached;
                return fetch(request).then((response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    }
                    return response;
                });
            })
        );
        return;
    }

    // Network-first untuk HTML pages
    event.respondWith(
        fetch(request).catch(() => caches.match(request))
    );
});
