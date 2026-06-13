import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/team-randomizer/',
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://coms.kw.ac.kr',
        changeOrigin: true,
        secure: true,
        cookieDomainRewrite: 'localhost',
      },
    },
  },
})
