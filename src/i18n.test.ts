import { afterEach, describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import ts from 'typescript'
import { getLocale, messages, setLanguage, t } from './i18n'
afterEach(() => setLanguage('ru'))
describe('translations', () => {
  it('covers every literal translation key in source', () => {
    const missing: string[] = []
    for (const file of readdirSync('src').filter(
      (file) => /\.(tsx?|ts)$/.test(file) && !file.includes('.test.'),
    )) {
      const source = ts.createSourceFile(
        file,
        readFileSync(`src/${file}`, 'utf8'),
        ts.ScriptTarget.Latest,
        true,
        file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      )
      const visit = (node: ts.Node) => {
        if (
          ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) &&
          node.expression.text === 't' &&
          ts.isStringLiteral(node.arguments[0]) &&
          !messages[node.arguments[0].text]
        )
          missing.push(`${file}: ${node.arguments[0].text}`)
        ts.forEachChild(node, visit)
      }
      visit(source)
    }
    expect(missing).toEqual([])
  })
  it('preserves placeholders in every language', () => {
    const tokens = (value: string) =>
      [...value.matchAll(/\{\{\w+\}\}/g)].map((match) => match[0]).sort()
    for (const [key, translations] of Object.entries(messages))
      for (const translation of translations) {
        expect(translation.trim()).not.toBe('')
        expect(tokens(translation)).toEqual(tokens(key))
      }
  })
  it('updates the document and translates without altering user values', () => {
    setLanguage('uk')
    expect(t('Сегодня')).toBe('Сьогодні')
    expect(getLocale()).toBe('uk-UA')
    setLanguage('en')
    expect(t('Восстановить: {{0}}', { '0': 'Моя заметка' })).toBe('Restore: Моя заметка')
    expect(document.documentElement.lang).toBe('en')
  })
})
