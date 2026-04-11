import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: './', // Required for Electron - relative paths
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('purify')) return 'vendor-pdf'
          if (id.includes('recharts')) return 'vendor-charts'
          if (id.includes('@supabase')) return 'vendor-supabase'
          if (
            id.includes('react-dom') ||
            id.includes('react-router') ||
            id.includes('/react/') ||
            id.includes('scheduler')
          ) {
            return 'vendor-react'
          }
        },
      },
    },
    chunkSizeWarningLimit: 900,
    // Ensure assets use relative paths for Electron
    assetsDir: 'assets',
    sourcemap: true,
  },
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@features': path.resolve(__dirname, './src/features'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@stores': path.resolve(__dirname, './src/stores'),
      '@types': path.resolve(__dirname, './src/types'),
    },
  },
  server: {
    port: 3007,
    open: true,
  },
  // Define environment variables that will be replaced at build time
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
  },
})
