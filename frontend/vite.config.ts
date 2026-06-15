import { defineConfig } from 'vite'
import react    from '@vitejs/plugin-react'
import path     from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // ECharts core — cargado siempre
          'echarts-core':   ['echarts', 'echarts-for-react'],
          // ECharts-GL — solo si hay chart 3D
          'echarts-gl':     ['echarts-gl'],
          // Plotly — lazy chunk (violin, splom, ternary)
          'plotly':         ['react-plotly.js', 'plotly.js-dist-min'],
          // Nivo — lazy chunk (waffle, chord)
          'nivo':           ['@nivo/core', '@nivo/waffle', '@nivo/chord'],
          // React runtime
          'react-vendor':   ['react', 'react-dom'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  test: {
    globals:     true,
    environment: 'jsdom',
    setupFiles:  './src/test/setup.ts',
    css:         false,
    coverage: {
      provider:  'v8',
      reporter:  ['text', 'html', 'lcov'],
      include:   ['src/**/*.{ts,tsx}'],
      exclude:   ['src/test/**', 'src/main.tsx'],
      thresholds: { lines: 70, functions: 70, branches: 60, statements: 70 },
    },
  },
})
