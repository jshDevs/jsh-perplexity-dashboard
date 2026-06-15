import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E — JSH Dashboard
 * Corre contra el stack completo levantado con Docker Compose.
 * Base URL: http://localhost:5173 (Vite dev) o http://localhost:80 (prod nginx)
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,       // serializado: evita conflictos de estado en DB
  forbidOnly: !!process.env.CI,
  retries:  process.env.CI ? 2 : 0,
  workers:  1,
  timeout:  30_000,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  use: {
    baseURL:     process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace:       'on-first-retry',
    screenshot:  'only-on-failure',
    video:       'retain-on-failure',
    // Headers para intranet offline-first (sin llamadas externas)
    extraHTTPHeaders: { 'X-Requested-With': 'XMLHttpRequest' },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Levanta el stack si E2E_SKIP_SERVER no está seteado
  webServer: process.env.E2E_SKIP_SERVER ? undefined : {
    command: 'docker compose -f docker-compose.prod.yml up --wait',
    url:     'http://localhost:5173',
    timeout: 120_000,
    reuseExistingServer: true,
  },
})
