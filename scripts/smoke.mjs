import { chromium, expect } from '@playwright/test'
const browser = await chromium.launch()
try {
  const context = await browser.newContext()
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(process.env.SMOKE_URL || 'http://127.0.0.1:4174')
  await expect(page.getByRole('heading', { name: 'Усі записи.' })).toBeVisible()
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload()
  await page.waitForFunction(() => !!navigator.serviceWorker.controller)
  await context.setOffline(true)
  await page.reload()
  await page.getByRole('button', { name: 'Додати запис', exact: true }).click()
  await page.getByLabel('Назва', { exact: true }).fill('Працює без інтернету')
  await page.getByRole('dialog').getByRole('button', { name: 'Зберегти', exact: true }).click()
  await page.reload()
  await expect(page.locator('article')).toContainText('Працює без інтернету')
  if (errors.length) throw new Error(errors.join('\n'))
  console.log(
    'Production smoke check passed: service worker, offline reload, offline writes and persistence.',
  )
} finally {
  await browser.close()
}
