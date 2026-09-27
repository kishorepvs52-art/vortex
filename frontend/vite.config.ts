import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// All backend traffic is proxied through the dev server so the browser
// only ever uses RELATIVE URLs (required by the sandboxed preview host).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // @ts-expect-error — allowedHosts exists in current Vite 5.4.x security releases
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
});
