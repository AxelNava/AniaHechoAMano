import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite-plus'
import { mergeConfig, configDefaults } from 'vite-plus/test/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [
        ...configDefaults.exclude,
        'e2e/**',
        'test-results/**',
        'playwright-report/**',
        'backup/**',
      ],
      // Conservar el comportamiento de Vitest 4 al adoptar el runner incluido.
      // https://viteplus.dev/guide/vitest-v5#remove-unneeded-compatibility-settings
      clearMocks: false,
      sharedViteServer: false,
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
)
