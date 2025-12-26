import { defineConfig } from 'vite'

export default defineConfig({
  root: './',
  base: '/MathHelper/',
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
