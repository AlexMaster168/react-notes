import { chromium } from '@playwright/test'
import { mkdir, readFile } from 'node:fs/promises'

const baseURL = process.env.SCREENSHOT_URL || 'http://127.0.0.1:4174'
await mkdir('docs/screenshots', { recursive: true })
const browser = await chromium.launch()
try {
  const iconPage = await browser.newPage()
  const icon = await readFile('public/icon.svg', 'utf8')
  for (const size of [180, 192, 512]) {
    await iconPage.setViewportSize({ width: size, height: size })
    await iconPage.setContent(
      `<style>html,body{margin:0;width:100%;height:100%;background:transparent}svg{width:100%;height:100%}</style>${icon}`,
    )
    await iconPage.screenshot({ path: `public/icon-${size}.png`, omitBackground: true })
  }
  await iconPage.close()
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    timezoneId: 'Europe/Kyiv',
  })
  await page.addInitScript(() => {
    if (!localStorage.getItem('react-notes:language'))
      localStorage.setItem('react-notes:language', 'ru')
  })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.clock.setFixedTime(new Date('2026-10-04T12:00:00Z'))
  const screenshot = async (name) => {
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({
      path: `docs/screenshots/${name}.png`,
      fullPage: true,
      animations: 'disabled',
    })
  }
  await page.goto(baseURL)
  await page.getByRole('button', { name: 'Посмотреть на примере', exact: true }).click()
  await page.getByRole('button', { name: 'Закрыть уведомление' }).click()
  // The examples are generated through the public onboarding flow, not fixtures injected into the page.
  await screenshot('01-dashboard-ru')
  await page.getByRole('button', { name: 'Редактировать: Спланировать неделю' }).click()
  await screenshot('02-editor-ru')
  await page.getByRole('button', { name: 'Закрыть окно' }).click()
  await page.locator('.main-nav').getByRole('button', { name: 'Планировщик', exact: true }).click()
  await screenshot('03-planner-ru')
  await page
    .locator('.main-nav')
    .getByRole('button', { name: /^Все записи/ })
    .click()
  await page.getByLabel('Язык', { exact: true }).selectOption('uk')
  await page.locator('.topbar').getByRole('button', { name: 'Налаштування', exact: true }).click()
  await page.getByRole('button', { name: 'Ліс', exact: true }).click()
  await page.getByRole('button', { name: 'Закрити вікно' }).click()
  await page.evaluate(() => localStorage.removeItem('react-notes:workspace:v1'))
  await page.reload()
  await page.getByRole('button', { name: 'Переглянути приклад', exact: true }).click()
  await page.getByRole('button', { name: 'Закрити повідомлення' }).click()
  await screenshot('04-ukrainian-forest')
  await page.getByLabel('Мова', { exact: true }).selectOption('en')
  await page.locator('.topbar').getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('button', { name: 'Dark', exact: true }).click()
  await page.getByRole('button', { name: 'Ocean', exact: true }).click()
  await page.getByRole('button', { name: 'Close dialog' }).click()
  await page.evaluate(() => localStorage.removeItem('react-notes:workspace:v1'))
  await page.reload()
  await page.getByRole('button', { name: 'Explore an example', exact: true }).click()
  await page.getByRole('button', { name: 'Dismiss notification' }).click()
  await screenshot('05-english-dark-ocean')
  await page.locator('.topbar').getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('button', { name: 'Light', exact: true }).click()
  await page.getByRole('button', { name: 'Lavender', exact: true }).click()
  await screenshot('06-themes-settings')
  await page.getByRole('button', { name: 'Close dialog' }).click()
  await page.getByLabel('Language', { exact: true }).selectOption('ru')
  await page.evaluate(() => localStorage.removeItem('react-notes:workspace:v1'))
  await page.reload()
  await page.getByRole('button', { name: 'Посмотреть на примере', exact: true }).click()
  await page.getByRole('button', { name: 'Закрыть уведомление' }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await screenshot('07-mobile')
  if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth))
    throw new Error('Mobile layout overflows horizontally')
  if (errors.length) throw new Error(errors.join('\n'))
  console.log('Saved 7 verified screenshots to docs/screenshots and generated PWA icons.')
} finally {
  await browser.close()
}
