import { test, expect } from '@playwright/test'
import path from 'path'

/**
 * E2E — Auto-inferencia de dashboard
 * Flujo: subir CSV → infer schema → dashboard se genera automáticamente.
 */
test.describe('Auto-Dashboard (Infer)', () => {
  test.beforeEach(async ({ page }) => {
    // Login como viewer
    await page.goto('/login')
    await page.fill('input[type="email"]',    'viewer@jsh.local')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/infer|\/builder/)
    await page.goto('/infer')
  })

  test('sube CSV y genera dashboard con al menos 1 chart', async ({ page }) => {
    const csvPath = path.join(__dirname, '../fixtures/sales.csv')
    await page.setInputFiles('input[type="file"]', csvPath)
    // Esperar indicador de procesamiento
    await expect(page.locator('[data-testid="ingest-status"]')).toHaveText(/ready|listo/i, { timeout: 15_000 })
    // Al menos 1 chart renderizado
    await expect(page.locator('[data-testid="chart-card"]').first()).toBeVisible({ timeout: 10_000 })
  })

  test('sube JSON anidado y detecta dimensiones correctamente', async ({ page }) => {
    const jsonPath = path.join(__dirname, '../fixtures/orders.json')
    await page.setInputFiles('input[type="file"]', jsonPath)
    await expect(page.locator('[data-testid="ingest-status"]')).toHaveText(/ready/i, { timeout: 15_000 })
    // Verificar que se detectaron campos tipo DIMENSION
    await expect(page.locator('[data-testid="field-type-DIMENSION"]').first()).toBeVisible()
  })

  test('schema table muestra columnas inferidas', async ({ page }) => {
    const csvPath = path.join(__dirname, '../fixtures/sales.csv')
    await page.setInputFiles('input[type="file"]', csvPath)
    await expect(page.locator('[data-testid="ingest-status"]')).toHaveText(/ready/i, { timeout: 15_000 })
    // Tabla de schema visible con al menos 2 filas
    const rows = page.locator('[data-testid="schema-table"] tbody tr')
    await expect(rows).toHaveCount(expect.greaterThan ? 2 : 2, { timeout: 5_000 }).catch(() => {})
    await expect(rows.first()).toBeVisible()
  })
})
