import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue()],
    server: {
        host: '0.0.0.0',
        port: 5173,
        hmr: {
            host: 'localhost'
        },
        proxy: {
            '/api': {
                target: 'http://overwatch-core:8000',
                changeOrigin: true,
                secure: false
            }
        }
    }
})
