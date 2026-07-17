import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')
)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version)
  },
  server: {
    host: '0.0.0.0',
    port: 5555,
    hmr: {
      host: 'localhost'
    },
    proxy: {
      '/api': {
        target: 'http://overwatch-core:7000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
