import { describe, expect, it, vi } from 'vitest'
import {
  EMPTY_WORKSPACE,
  STORAGE_KEY,
  demoWorkspace,
  isDate,
  loadWorkspace,
  localDate,
  matchesView,
  newEntry,
  nextDate,
  toggleEntry,
  validateWorkspace,
} from './model'
import type { Entry, Workspace } from './types'
const task = (overrides: Partial<Entry> = {}): Entry => ({
  ...newEntry(),
  title: 'Test task',
  ...overrides,
})
const workspace = (...entries: Entry[]): Workspace => ({ ...EMPTY_WORKSPACE, entries })
describe('local calendar dates', () => {
  it.each([
    ['2026-01-31', 'monthly', '2026-02-28'],
    ['2028-01-31', 'monthly', '2028-02-29'],
    ['2026-12-31', 'daily', '2027-01-01'],
    ['2026-03-27', 'weekly', '2026-04-03'],
    ['2026-12-15', 'monthly', '2027-01-15'],
  ] as const)('advances %s by %s', (date, repeat, expected) =>
    expect(nextDate(date, repeat)).toBe(expected),
  )
  it.each(['2026-02-30', '2025-02-29', '2026-13-01', '2026-01-32', '<script>', '04/10/2026'])(
    'rejects invalid date %s',
    (date) => expect(isDate(date)).toBe(false),
  )
  it('uses local date parts rather than UTC', () => {
    const date = new Date(2026, 9, 4, 0, 1)
    expect(localDate(date)).toBe('2026-10-04')
  })
})
describe('recurring tasks', () => {
  it('preserves a completed occurrence and creates a fresh checklist for the next', () => {
    const entry = task({
      repeat: 'weekly',
      dueDate: '2026-10-04',
      checklist: [{ id: 'check-1', text: 'A step', done: true }],
    })
    const result = toggleEntry(workspace(entry), entry.id)
    expect(result.entries.find((item) => item.id === entry.id)?.completed).toBe(true)
    const next = result.entries[0]
    expect(next).toMatchObject({
      dueDate: '2026-10-11',
      completed: false,
      seriesId: entry.seriesId,
    })
    expect(next.checklist[0].done).toBe(false)
    expect(next.checklist[0].id).not.toBe('check-1')
    expect(validateWorkspace(result)).toEqual(result)
  })
  it('does not duplicate the next occurrence on reopen and complete', () => {
    const entry = task({ repeat: 'daily', dueDate: '2026-10-04' })
    const result = toggleEntry(
      toggleEntry(toggleEntry(workspace(entry), entry.id), entry.id),
      entry.id,
    )
    expect(result.entries).toHaveLength(2)
  })
  it('handles two separate recurring tasks with the same title', () => {
    const a = task({ repeat: 'daily', dueDate: '2026-10-04' }),
      b = task({ repeat: 'daily', dueDate: '2026-10-04' })
    expect(toggleEntry(toggleEntry(workspace(a, b), a.id), b.id).entries).toHaveLength(4)
  })
  it.each([
    { kind: 'note' },
    { deletedAt: new Date().toISOString() },
    { archivedAt: new Date().toISOString() },
  ] as Partial<Entry>[])('does not toggle ineligible entries', (overrides) => {
    const entry = task(overrides),
      data = workspace(entry)
    expect(toggleEntry(data, entry.id)).toBe(data)
  })
})
describe('views', () => {
  it('includes overdue tasks today but excludes them from upcoming', () => {
    const entry = task({ dueDate: '2026-10-03' })
    expect(matchesView(entry, 'today', '2026-10-04')).toBe(true)
    expect(matchesView(entry, 'upcoming', '2026-10-04')).toBe(false)
  })
  it('keeps archive and trash separate from active views', () => {
    const entry = task({
      archivedAt: new Date().toISOString(),
      deletedAt: new Date().toISOString(),
    })
    expect(matchesView(entry, 'all')).toBe(false)
    expect(matchesView(entry, 'archive')).toBe(false)
    expect(matchesView(entry, 'trash')).toBe(true)
  })
  it('includes completed entries in their folder while excluding them from all', () => {
    const entry = task({ folderId: 'work', completed: true })
    expect(matchesView(entry, 'folder:work')).toBe(true)
    expect(matchesView(entry, 'all')).toBe(false)
    expect(matchesView(entry, 'completed')).toBe(true)
  })
})
describe('backup validation', () => {
  it('round-trips example data and removes unknown fields', () => {
    const data = demoWorkspace()
    expect(validateWorkspace(JSON.parse(JSON.stringify(data)))).toEqual(data)
    expect(validateWorkspace({ ...data, unexpected: 'value' })).not.toHaveProperty('unexpected')
  })
  it.each([{ version: 2 }, { entries: null }, { folders: 'broken' }])(
    'rejects malformed roots',
    (overrides) => expect(() => validateWorkspace({ ...EMPTY_WORKSPACE, ...overrides })).toThrow(),
  )
  it.each([
    { dueDate: '2026-02-30' },
    { dueTime: '25:60' },
    { repeat: 'weekly' },
    { folderId: 'missing' },
    { color: 'invented' },
    { title: ' ' },
    { body: 'x'.repeat(20001) },
    { seriesId: null },
    { checklist: [{ id: 'step', text: ' ', done: true }] },
  ])('rejects malformed entries', (overrides) =>
    expect(() => validateWorkspace(workspace(task(overrides as Partial<Entry>)))).toThrow(),
  )
  it('rejects duplicate identifiers', () => {
    const entry = task()
    expect(() => validateWorkspace(workspace(entry, entry))).toThrow()
  })
  it('preserves corrupt raw data for recovery', () => {
    localStorage.setItem(STORAGE_KEY, 'broken-json')
    expect(loadWorkspace().error).not.toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBe('broken-json')
  })
  it('handles unavailable storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError')
    })
    expect(loadWorkspace()).toMatchObject({ workspace: EMPTY_WORKSPACE, error: expect.any(String) })
  })
})
