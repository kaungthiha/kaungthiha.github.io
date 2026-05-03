import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/tools/festival-thingamabob/',
  build: {
    outDir: '../../tools/festival-thingamabob',
    emptyOutDir: true,
  },
})
