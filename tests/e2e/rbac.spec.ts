import { test, expect } from '@playwright/test'

/**
 * E2E — RBAC
 * viewer NO puede acceder a /builder → redirige a /forbidden.
 * editor SÍ puede acceder a /builder.
 * admin puede acceder a todo.
 */
test.describe('RBAC — Control de acceso por rol', () => {
  test('viewer redirige a /forbidden al intentar acceder a /builder', async ({ page }) => {
    // Login viewer
    await page.goto('/login')
    await page.fill('input[type="email"]',    'viewer@jsh.local')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    // Intentar ir a /builder
    await page.goto('/builder')
    await expect(page).toHaveURL(/\/forbidden/)
    await expect(page.locator('text=Acceso denegado')).toBeVisible()
  })

  test('editor accede a /builder sin restricción', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]',    'editor@jsh.local')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/builder/)
    await expect(page.locator('[data-testid="builder-title"], h1')).toBeVisible()
  })

  test('admin accede a /builder y ve controles adicionales', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]',    'admin@jsh.local')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.goto('/builder')
    await expect(page.locator('[data-testid="builder-title"], h1')).toBeVisible()
  })
})
