import { test, expect } from '@playwright/test'

/**
 * E2E — WebSocket / Realtime
 * Verifica que RealtimeBadge conecta y muestra estado correcto.
 */
test.describe('Realtime Badge', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]',    'viewer@jsh.local')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.goto('/infer')
  })

  test('badge muestra estado En vivo al conectar WS', async ({ page }) => {
    // El badge debe aparecer después de que WS establece conexión
    await expect(
      page.locator('[data-testid="realtime-badge"]')
    ).toHaveText(/en vivo|live/i, { timeout: 10_000 })
  })

  test('badge muestra estado correcto (verde = conectado)', async ({ page }) => {
    const badge = page.locator('[data-testid="realtime-badge"]')
    await expect(badge).toBeVisible({ timeout: 10_000 })
    // Verificar clase CSS verde (conexión establecida)
    await expect(badge).toHaveClass(/bg-green|text-green/)
  })
})
