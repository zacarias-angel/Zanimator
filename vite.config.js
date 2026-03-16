import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@editor': '/src/editor',
      '@engine': '/src/engine',
      '@runtime': '/src/runtime',
      '@exporter': '/src/exporter',
      '@store': '/src/store',
    },
  },
})
