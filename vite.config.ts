import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // O ponto antes da barra garante que o GitHub ache os arquivos na pasta correta
  base: './', 
  
  plugins: [react()],

  resolve: {
    alias: {
      // Isso alinha os caminhos internos do seu projeto
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Limpa a pasta anterior para não sobrar nenhum arquivo com erro
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
  }
})
