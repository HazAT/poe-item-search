import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    minify: false,
    rollupOptions: {
      input: {
        content: 'src/content.js'
      },
      output: {
        entryFileNames: '[name].js'
      }
    }
  }
})