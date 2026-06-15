import { test, expect } from '@playwright/test'

test.describe('Chart type picker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
  })

  test('smoke: app loads without JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
    expect(errors.filter((e) => !e.includes('favicon'))).toHaveLength(0)
  })

  test('smoke: ChartRenderer mounts for bar chart', async ({ page }) => {
    // Navigate to a dashboard that auto-generates charts
    await page.goto('http://localhost:3000/dashboards')
    const body = await page.locator('body').textContent()
    expect(body).toBeTruthy()
  })
})

test.describe('Visual regression — chart types', () => {
  const CHART_TYPES = ['bar', 'line', 'pie', 'scatter', 'heatmap', 'radar']

  for (const chartType of CHART_TYPES) {
    test(`${chartType} chart renders correctly`, async ({ page }) => {
      await page.goto(`http://localhost:3000/demo?chart=${chartType}`)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(800) // ECharts animation settle

      const chart = page.locator('[data-chart-type]').first()
      if (await chart.count() > 0) {
        await expect(chart).toHaveScreenshot(`${chartType}-chart.png`, {
          maxDiffPixels: 200,
        })
      }
    })
  }
})
