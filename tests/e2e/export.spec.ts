import { test, expect } from '@playwright/test'
import path from 'path'

/**
 * E2E — Export de datos
 * Verifica que los downloads se disparan correctamente.
 */
test.describe('Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]',    'editor@jsh.local')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.goto('/infer')
    // Cargar fixture
    const csvPath = path.join(__dirname, '../fixtures/sales.csv')
    await page.setInputFiles('input[type="file"]', csvPath)
    await expect(page.locator('[data-testid="ingest-status"]')).toHaveText(/ready/i, { timeout: 15_000 })
  })

  test('descarga CSV desde ExportMenu', async ({ page }) => {
    const card = page.locator('[data-testid="chart-card"]').first()
    await card.locator('[data-testid="export-btn"]').click()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      card.locator('text=CSV').click(),
    ])
    expect(download.suggestedFilename()).toMatch(/\.csv$/)
  })

  test('descarga PNG desde ExportMenu', async ({ page }) => {
    const card = page.locator('[data-testid="chart-card"]').first()
    await card.locator('[data-testid="export-btn"]').click()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      card.locator('text=PNG').click(),
    ])
    expect(download.suggestedFilename()).toMatch(/\.png$/)
  })
})
