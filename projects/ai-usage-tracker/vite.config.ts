import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/tools/ai-usage-tracker/',
  build: {
    outDir: '../../tools/ai-usage-tracker',
    emptyOutDir: true,
  },
})
