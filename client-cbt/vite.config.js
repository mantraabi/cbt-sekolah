// vite.config.js
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  // #9 FIX: Chunk splitting untuk cache optimal
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor besar dipisah → browser cache terpisah
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
          'vendor-ui': ['reka-ui', '@phosphor-icons/vue'],
          'vendor-utils': ['axios', 'socket.io-client', 'xlsx'],
        }
      }
    },
    // Target modern browser → bundle lebih kecil
    target: 'es2020',
    // Minify dengan esbuild (default, cepat)
    minify: 'esbuild',
    // Source map untuk debug di production (opsional, hapus kalau mau lebih kecil)
    sourcemap: false,
  }
})
