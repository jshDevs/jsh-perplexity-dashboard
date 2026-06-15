import { test, expect } from '@playwright/test'

test('smoke: login screen renders', async ({ page }) => {
  await page.goto('http://localhost:3000')
  await expect(page.locator('body')).toContainText(/login|dashboard|ingest/i)
})

test('smoke: can open app shell', async ({ page }) => {
  await page.goto('http://localhost:3000')
  await expect(page).toHaveTitle(/Dashboard|JSH|Vite/i)
})
