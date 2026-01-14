import { defineConfig } from 'vite'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: './',
  base: '/MathHelper/',
  resolve: {
    alias: {
      crypto: resolve(__dirname, 'src/utils/crypto-shim.ts')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: 'expression-editor-modular.html'
    }
  },
  server: {
    host: '0.0.0.0',
    port: 8000,
    open: '/expression-editor-modular.html'
  }
})
