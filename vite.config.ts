import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite-plus'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Prettier y vue-tsc siguen siendo las comprobaciones de formato y tipos de Vue.
  check: { fmt: false },
  lint: {
    categories: { correctness: 'error' },
    ignorePatterns: ['backup/**', 'test-results/**', 'playwright-report/**'],
  },
  plugins: [
    vue({
      template: {
        transformAssetUrls: {
          base: null,
          includeAbsolute: false,
        },
      },
    }),
    vueDevTools({
      launchEditor: "webstorm"
    }),
    tailwindcss(),
  ],
  server: {
    sourcemapIgnoreList: false
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
