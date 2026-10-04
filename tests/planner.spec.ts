import { test, expect, type Page } from '@playwright/test'

async function createTask(
  page: Page,
  title: string,
  options: { date?: string; repeat?: string; checklist?: string } = {},
) {
  await page.getByRole('button', { name: 'Добавить запись', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Название', { exact: true }).fill(title)
  if (options.date) await dialog.getByLabel('Дата', { exact: true }).fill(options.date)
  if (options.repeat)
    await dialog.getByLabel('Повторение', { exact: true }).selectOption(options.repeat)
  if (options.checklist) await dialog.getByLabel('Новый пункт чек-листа').fill(options.checklist)
  await dialog.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(dialog).not.toBeVisible()
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('react-notes:language'))
      localStorage.setItem('react-notes:language', 'ru')
  })
  await page.clock.setFixedTime(new Date('2026-10-04T12:00:00'))
  await page.goto('/')
})

test('defaults to Ukrainian for a new visitor', async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:4173/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'uk')
  await expect(page.getByRole('heading', { name: 'Усі записи.' })).toBeVisible()
  await page.getByLabel('Мова', { exact: true }).selectOption('ru')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Все записи.' })).toBeVisible()
  await context.close()
})

test('creates, edits, completes and persists a task with a checklist', async ({ page }) => {
  await createTask(page, 'Купить продукты', { checklist: 'Молоко' })
  await expect(page.locator('article')).toContainText('0 из 1 пунктов')
  await page.getByRole('button', { name: 'Редактировать: Купить продукты' }).click()
  await page.getByRole('dialog').getByLabel('Название', { exact: true }).fill('Купить молоко')
  await page.getByRole('checkbox', { name: 'Выполнено: Молоко' }).check()
  await page.getByRole('dialog').getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(page.locator('article')).toContainText('1 из 1 пунктов')
  await page.reload()
  await expect(page.getByRole('button', { name: 'Купить молоко', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Выполнить: Купить молоко' }).click()
  await page
    .locator('.main-nav')
    .getByRole('button', { name: /^Выполнено/ })
    .click()
  await expect(page.getByRole('button', { name: 'Вернуть в работу: Купить молоко' })).toBeVisible()
})
test('creates and renames a coloured folder and keeps its entries when deleting it', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Создать папку', exact: true }).click()
  await page.getByLabel('Название папки').fill('Рабочие планы')
  await page.getByRole('button', { name: 'Голубой', exact: true }).click()
  await page.getByRole('button', { name: 'Сохранить папку' }).click()
  await page
    .locator('.folder-nav')
    .getByRole('button', { name: /^Рабочие планы/ })
    .click()
  await createTask(page, 'Подготовить отчёт')
  await expect(page.locator('article .folder-label')).toHaveText('Рабочие планы')
  await page.getByRole('button', { name: 'Изменить папку: Рабочие планы' }).click()
  await page.getByLabel('Название папки').fill('Проект')
  await page.getByRole('button', { name: 'Сохранить папку' }).click()
  await page.getByRole('button', { name: 'Изменить папку: Проект' }).click()
  await page.getByRole('button', { name: 'Удалить папку', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Удалить папку', exact: true }).click()
  await expect(page.locator('article .folder-label')).toHaveText('Без папки')
})
test('creates the next recurring occurrence without duplication', async ({ page }) => {
  await createTask(page, 'Повторяющееся дело', { date: '2026-10-04', repeat: 'weekly' })
  await page.getByRole('button', { name: 'Выполнить: Повторяющееся дело' }).click()
  let entries = await page.evaluate(
    () => JSON.parse(localStorage.getItem('react-notes:workspace:v1')!).entries,
  )
  expect(entries).toHaveLength(2)
  expect(entries.some((item: { dueDate: string }) => item.dueDate === '2026-10-11')).toBe(true)
  await page
    .locator('.main-nav')
    .getByRole('button', { name: /^Выполнено/ })
    .click()
  await page.getByRole('button', { name: 'Вернуть в работу: Повторяющееся дело' }).click()
  await page
    .locator('.main-nav')
    .getByRole('button', { name: /^Все записи/ })
    .click()
  await page
    .locator('article')
    .filter({ hasText: 'Сегодня' })
    .getByRole('button', { name: 'Выполнить: Повторяющееся дело' })
    .click()
  entries = await page.evaluate(
    () => JSON.parse(localStorage.getItem('react-notes:workspace:v1')!).entries,
  )
  expect(entries).toHaveLength(2)
  await page.locator('.main-nav').getByRole('button', { name: 'Планировщик', exact: true }).click()
  await expect(page.getByLabel('Календарь задач')).toBeVisible()
  await expect(page.locator('.calendar-grid')).toContainText('Повторяющееся дело')
})
test('archives, restores, trashes, and undoes a deletion', async ({ page }) => {
  await createTask(page, 'Сохранить идею')
  await page.getByRole('button', { name: 'Архивировать: Сохранить идею' }).click()
  await page.getByRole('button', { name: 'Архив', exact: true }).click()
  await page.getByRole('button', { name: 'Разархивировать: Сохранить идею' }).click()
  await page
    .locator('.main-nav')
    .getByRole('button', { name: /^Все записи/ })
    .click()
  await page.getByRole('button', { name: 'В корзину: Сохранить идею' }).click()
  await page.getByRole('button', { name: 'Корзина', exact: true }).click()
  await page.getByRole('button', { name: 'Восстановить: Сохранить идею' }).click()
  await page
    .locator('.main-nav')
    .getByRole('button', { name: /^Все записи/ })
    .click()
  await page.getByRole('button', { name: 'В корзину: Сохранить идею' }).click()
  await page.getByRole('button', { name: 'Отменить', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Сохранить идею', exact: true })).toBeVisible()
})
test('searches notes and filters tasks by colour and priority', async ({ page }) => {
  await createTask(page, 'Важная задача')
  await page.getByRole('button', { name: 'Редактировать: Важная задача' }).click()
  await page.getByRole('dialog').getByLabel('Приоритет', { exact: true }).selectOption('high')
  await page.getByRole('button', { name: 'Лавандовый', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Сохранить', exact: true }).click()
  await page.getByRole('button', { name: 'Добавить запись', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Заметка', exact: true }).click()
  await page.getByLabel('Название', { exact: true }).fill('Мысль')
  await page.getByLabel('Текст заметки').fill('Редкий поисковый текст')
  await page.getByRole('dialog').getByRole('button', { name: 'Сохранить', exact: true }).click()
  await page.getByLabel('Поиск записей', { exact: true }).fill('Редкий')
  await expect(page.locator('article')).toHaveCount(1)
  await expect(page.locator('article')).toContainText('Мысль')
  await page.getByRole('button', { name: 'Очистить поиск' }).click()
  await page.getByRole('button', { name: 'Фильтры', exact: true }).click()
  await page.locator('.filter-bar').getByLabel('Цвет', { exact: true }).selectOption('violet')
  await page.locator('.filter-bar').getByLabel('Приоритет', { exact: true }).selectOption('high')
  await expect(page.locator('article')).toHaveCount(1)
  await expect(page.locator('article')).toContainText('Важная задача')
})
test('switches between all three languages and keeps the chosen theme', async ({ page }) => {
  await page.getByLabel('Язык', { exact: true }).selectOption('uk')
  await expect(page.getByRole('heading', { name: 'Усі записи.' })).toBeVisible()
  await page.getByLabel('Мова', { exact: true }).selectOption('en')
  await expect(page.getByRole('heading', { name: 'All entries.' })).toBeVisible()
  expect(await page.locator('body').innerText()).not.toMatch(/[а-яёіїєґ]/i)
  await page.locator('.topbar').getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('button', { name: 'Dark', exact: true }).click()
  await page.getByRole('button', { name: 'Ocean', exact: true }).click()
  await page.getByRole('button', { name: 'Close dialog' }).click()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'ocean')
  await page.getByRole('button', { name: 'Planner', exact: true }).click()
  await expect(page.locator('.calendar-weekdays')).toContainText('Mon')
})
test('rejects invalid imports, keeps entries and exports a backup', async ({ page }) => {
  await createTask(page, 'Не потерять')
  await page.locator('.topbar').getByRole('button', { name: 'Настройки', exact: true }).click()
  await page.locator('input[type=file]').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version":2}'),
  })
  await expect(page.getByRole('alert')).toBeVisible()
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Скачать копию', exact: true }).click()
  const downloaded = await downloading
  expect(downloaded.suggestedFilename()).toMatch(/^dela-.*\.json$/)
  await page.getByRole('button', { name: 'Закрыть окно', exact: true }).click()
  await expect(page.locator('article')).toContainText('Не потерять')
})
test('restores a valid backup only after explicit confirmation', async ({ page }) => {
  await createTask(page, 'Старая запись')
  const backup = await page.evaluate(() => localStorage.getItem('react-notes:workspace:v1')!)
  const data = JSON.parse(backup)
  data.entries[0].title = 'Восстановленная запись'
  await page.locator('.topbar').getByRole('button', { name: 'Настройки', exact: true }).click()
  await page.locator('input[type=file]').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(data)),
  })
  await expect(page.locator('.import-confirm')).toBeVisible()
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('react-notes:workspace:v1')!).entries[0].title,
    ),
  ).toBe('Старая запись')
  await page.getByRole('button', { name: 'Заменить данные', exact: true }).click()
  await page.getByRole('button', { name: 'Закрыть окно', exact: true }).click()
  await expect(page.locator('article')).toContainText('Восстановленная запись')
  await page.getByRole('button', { name: 'Отменить', exact: true }).click()
  await expect(page.locator('article')).toContainText('Старая запись')
})
test('supports keyboard shortcuts and closes the editor with Escape', async ({ page }) => {
  await page.keyboard.press('n')
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByLabel('Название', { exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.keyboard.press('/')
  await expect(page.getByLabel('Поиск записей', { exact: true })).toBeFocused()
})
test('works on a narrow screen without horizontal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await createTask(page, 'Задача на телефоне')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.getByRole('button', { name: 'Открыть меню' }).click()
  await page.getByRole('button', { name: 'Планировщик', exact: true }).click()
  await expect(page.getByLabel('Календарь задач')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})
