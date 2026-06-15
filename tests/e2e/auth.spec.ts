import { test, expect } from '@playwright/test'

/**
 * E2E — Autenticación
 * Flujos: login exitoso, login fallido, logout, redirect post-login.
 */
test.describe('Auth — Login / Logout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('login exitoso redirige a /builder para editor', async ({ page }) => {
    await page.fill('input[type="email"]',    'editor@jsh.local')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/builder/)
    await expect(page.locator('h1, [data-testid="builder-title"]')).toBeVisible()
  })

  test('credenciales incorrectas muestra error sin redirigir', async ({ page }) => {
    await page.fill('input[type="email"]',    'no@existe.com')
    await page.fill('input[type="password"]', 'wrong')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=incorrectos')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('acceder a /builder sin autenticar redirige a /login', async ({ page }) => {
    await page.goto('/builder')
    await expect(page).toHaveURL(/\/login/)
  })

  test('logout limpia sesión y redirige a /login', async ({ page }) => {
    // Login primero
    await page.fill('input[type="email"]',    'editor@jsh.local')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/builder/)
    // Logout
    await page.click('[data-testid="logout-btn"]')
    await expect(page).toHaveURL(/\/login/)
    // Verificar que no puede volver a /builder
    await page.goto('/builder')
    await expect(page).toHaveURL(/\/login/)
  })
})
