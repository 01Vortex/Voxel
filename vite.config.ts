import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/client/index.ts'),
      name: 'VoxelComment',
      fileName: 'voxel-comment',
      formats: ['umd', 'es']
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: {
          vue: 'Vue'
        },
        assetFileNames: 'voxel-comment.[ext]',
        exports: 'named'
      }
    },
    outDir: 'dist',
    emptyOutDir: true
  }
})
