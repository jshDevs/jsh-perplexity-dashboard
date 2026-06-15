import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals:     true,
    environment: 'node',
    include:     ['src/tests/**/*.test.ts'],
    coverage: {
      provider:  'v8',
      reporter:  ['text', 'html', 'lcov'],
      include:   ['src/**/*.ts'],
      exclude:   ['src/tests/**', 'src/app.ts'],
      thresholds: {
        lines:      70,
        functions:  70,
        branches:   60,
        statements: 70,
      },
    },
  },
})
