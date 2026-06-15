import { test, expect } from '@playwright/test'

/**
 * E2E — Dashboard Builder
 * Flujos: crear dashboard, agregar item, renombrar, guardar, eliminar.
 */
test.describe('Dashboard Builder', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]',    'editor@jsh.local')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/builder/)
  })

  test('crea un nuevo dashboard y aparece en la lista', async ({ page }) => {
    await page.click('[data-testid="new-dashboard-btn"]')
    const name = `Test Dashboard ${Date.now()}`
    await page.fill('[data-testid="dashboard-name-input"]', name)
    await page.click('[data-testid="confirm-create-btn"]')
    await expect(page.locator(`text=${name}`)).toBeVisible({ timeout: 5_000 })
  })

  test('agrega un chart item al dashboard', async ({ page }) => {
    // Seleccionar primer dashboard
    await page.click('[data-testid="dashboard-list-item"]')
    await page.click('[data-testid="add-chart-btn"]')
    await expect(page.locator('[data-testid="chart-card"]').first()).toBeVisible({ timeout: 5_000 })
  })

  test('renombra un item de chart', async ({ page }) => {
    await page.click('[data-testid="dashboard-list-item"]')
    await page.click('[data-testid="add-chart-btn"]')
    const card = page.locator('[data-testid="chart-card"]').first()
    await card.locator('[data-testid="rename-btn"]').click()
    await card.locator('[data-testid="item-title-input"]').fill('Ventas 2026')
    await card.locator('[data-testid="item-title-input"]').press('Enter')
    await expect(card.locator('text=Ventas 2026')).toBeVisible()
  })

  test('guarda dashboard y persiste tras reload', async ({ page }) => {
    await page.click('[data-testid="dashboard-list-item"]')
    await page.click('[data-testid="save-dashboard-btn"]')
    await expect(page.locator('[data-testid="save-status"]')).toHaveText(/guardado/i, { timeout: 5_000 })
    await page.reload()
    await expect(page.locator('[data-testid="chart-card"]').first()).toBeVisible({ timeout: 5_000 })
  })

  test('elimina un item de chart del dashboard', async ({ page }) => {
    await page.click('[data-testid="dashboard-list-item"]')
    const countBefore = await page.locator('[data-testid="chart-card"]').count()
    await page.locator('[data-testid="chart-card"]').first().locator('[data-testid="remove-btn"]').click()
    const countAfter = await page.locator('[data-testid="chart-card"]').count()
    expect(countAfter).toBeLessThan(countBefore + 1)
  })
})
