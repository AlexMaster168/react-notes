import { t } from './i18n'
import { COLORS, type Entry, type Workspace, type View, type Color } from './types'
export class BackupValidationError extends Error {}
export const STORAGE_KEY = 'react-notes:workspace:v1'
export const EMPTY_WORKSPACE: Workspace = { version: 1, entries: [], folders: [] }
export const id = () => crypto.randomUUID()
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function parseDate(date: string): Date {
  return new Date(`${date}T12:00:00`)
}
export function isDate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    localDate(parseDate(value)) === value
  )
}
export function nextDate(date: string, repeat: Entry['repeat']): string {
  const value = parseDate(date)
  if (repeat === 'daily') value.setDate(value.getDate() + 1)
  if (repeat === 'weekly') value.setDate(value.getDate() + 7)
  if (repeat === 'monthly') {
    const day = value.getDate()
    value.setDate(1)
    value.setMonth(value.getMonth() + 1)
    value.setDate(Math.min(day, new Date(value.getFullYear(), value.getMonth() + 1, 0).getDate()))
  }
  return localDate(value)
}
export function newEntry(
  kind: Entry['kind'] = 'task',
  folderId: string | null = null,
  dueDate = '',
): Entry {
  const now = new Date().toISOString()
  const entryId = id()
  return {
    id: entryId,
    seriesId: entryId,
    kind,
    title: '',
    body: '',
    folderId,
    color: 'coral',
    priority: 'medium',
    pinned: false,
    dueDate,
    dueTime: '',
    repeat: 'none',
    completed: false,
    checklist: [],
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    deletedAt: null,
  }
}
export function toggleEntry(workspace: Workspace, entryId: string): Workspace {
  const entry = workspace.entries.find((item) => item.id === entryId)
  if (!entry || entry.kind !== 'task' || entry.deletedAt || entry.archivedAt) return workspace
  const now = new Date().toISOString()
  const entries = workspace.entries.map((item) =>
    item.id === entryId ? { ...item, completed: !item.completed, updatedAt: now } : item,
  )
  if (!entry.completed && entry.repeat !== 'none' && entry.dueDate) {
    const dueDate = nextDate(entry.dueDate, entry.repeat)
    // Re-completing an occurrence must not create duplicate future tasks.
    if (
      !entries.some(
        (item) => !item.deletedAt && item.seriesId === entry.seriesId && item.dueDate === dueDate,
      )
    ) {
      entries.unshift({
        ...entry,
        id: id(),
        completed: false,
        dueDate,
        checklist: entry.checklist.map((item) => ({ ...item, id: id(), done: false })),
        createdAt: now,
        updatedAt: now,
      })
    }
  }
  return { ...workspace, entries }
}
export function matchesView(entry: Entry, view: View, today = localDate()): boolean {
  if (view === 'trash') return !!entry.deletedAt
  if (entry.deletedAt) return false
  if (view === 'archive') return !!entry.archivedAt
  if (entry.archivedAt) return false
  if (view === 'completed') return entry.kind === 'task' && entry.completed
  if (view === 'notes') return entry.kind === 'note'
  if (view === 'today')
    return entry.kind === 'task' && !entry.completed && !!entry.dueDate && entry.dueDate <= today
  if (view === 'upcoming') return entry.kind === 'task' && !entry.completed && entry.dueDate > today
  if (view.startsWith('folder:')) return entry.folderId === view.slice(7)
  return entry.kind === 'note' || !entry.completed
}
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const isColor = (value: unknown): value is Color => COLORS.includes(value as Color)
const validTimestamp = (value: unknown): boolean =>
  typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value))
const optionalTimestamp = (value: unknown): boolean => value === null || validTimestamp(value)
export function validateWorkspace(value: unknown): Workspace {
  const fail = () => {
    throw new BackupValidationError(t('Файл не является корректной резервной копией «Дела».'))
  }
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !Array.isArray(value.folders) ||
    !Array.isArray(value.entries) ||
    value.folders.length > 200 ||
    value.entries.length > 10000
  )
    return fail()
  const identifiers = new Set<string>()
  const validId = (value: unknown) =>
    typeof value === 'string' && value.length > 0 && value.length <= 100 && !identifiers.has(value)
  for (const folder of value.folders) {
    if (
      !isRecord(folder) ||
      !validId(folder.id) ||
      typeof folder.name !== 'string' ||
      !folder.name.trim() ||
      folder.name.length > 60 ||
      !isColor(folder.color)
    )
      return fail()
    identifiers.add(folder.id as string)
  }
  const folderIds = new Set(value.folders.map((folder) => (folder as Record<string, unknown>).id))
  for (const item of value.entries) {
    if (
      !isRecord(item) ||
      typeof item.seriesId !== 'string' ||
      !item.seriesId ||
      item.seriesId.length > 100
    )
      return fail()
    if (
      !isRecord(item) ||
      !validId(item.id) ||
      !['task', 'note'].includes(item.kind as string) ||
      typeof item.title !== 'string' ||
      !item.title.trim() ||
      item.title.length > 200 ||
      typeof item.body !== 'string' ||
      item.body.length > 20000 ||
      !isColor(item.color) ||
      !['low', 'medium', 'high'].includes(item.priority as string) ||
      typeof item.pinned !== 'boolean' ||
      typeof item.completed !== 'boolean' ||
      !(item.folderId === null || folderIds.has(item.folderId)) ||
      !(item.dueDate === '' || isDate(item.dueDate)) ||
      !(
        item.dueTime === '' ||
        (typeof item.dueTime === 'string' &&
          /^([01]\d|2[0-3]):[0-5]\d$/.test(item.dueTime) &&
          item.dueDate)
      ) ||
      !['none', 'daily', 'weekly', 'monthly'].includes(item.repeat as string) ||
      (item.repeat !== 'none' && (!item.dueDate || item.kind !== 'task')) ||
      !validTimestamp(item.createdAt) ||
      !validTimestamp(item.updatedAt) ||
      !optionalTimestamp(item.archivedAt) ||
      !optionalTimestamp(item.deletedAt) ||
      !Array.isArray(item.checklist) ||
      item.checklist.length > 100
    )
      return fail()
    identifiers.add(item.id as string)
    for (const check of item.checklist) {
      if (
        !isRecord(check) ||
        !validId(check.id) ||
        typeof check.text !== 'string' ||
        !check.text.trim() ||
        check.text.length > 300 ||
        typeof check.done !== 'boolean'
      )
        return fail()
      identifiers.add(check.id as string)
    }
  }
  // Project validated records into the schema to discard unknown fields.
  const clean: Workspace = { version: 1, folders: [], entries: [] }
  for (const item of value.folders) {
    const folder = item as Workspace['folders'][number]
    clean.folders.push({ id: folder.id, name: folder.name.trim(), color: folder.color })
  }
  for (const raw of value.entries) {
    const item = raw as Entry
    clean.entries.push({
      id: item.id,
      seriesId: item.seriesId,
      kind: item.kind,
      title: item.title.trim(),
      body: item.body,
      folderId: item.folderId,
      color: item.color,
      priority: item.priority,
      pinned: item.pinned,
      dueDate: item.dueDate,
      dueTime: item.dueTime,
      repeat: item.repeat,
      completed: item.completed,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      archivedAt: item.archivedAt,
      deletedAt: item.deletedAt,
      checklist: item.checklist.map((check) => ({
        id: check.id,
        text: check.text.trim(),
        done: check.done,
      })),
    })
  }
  return clean
}
export function loadWorkspace(): {
  workspace: Workspace
  error: string | null
} {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return { workspace: raw ? validateWorkspace(JSON.parse(raw)) : EMPTY_WORKSPACE, error: null }
  } catch {
    return {
      workspace: EMPTY_WORKSPACE,
      error: t(
        'Не удалось прочитать сохранённые данные. Они не перезаписаны. Скачайте исходную копию в настройках перед восстановлением.',
      ),
    }
  }
}
export function demoWorkspace(): Workspace {
  const workId = id(),
    personalId = id(),
    ideasId = id(),
    today = localDate()
  const make = (title: string, overrides: Partial<Entry>) => ({
    ...newEntry(),
    title,
    ...overrides,
  })
  return {
    version: 1,
    folders: [
      { id: workId, name: t('Работа'), color: 'violet' },
      { id: personalId, name: t('Личное'), color: 'sage' },
      { id: ideasId, name: t('Идеи'), color: 'amber' },
    ],
    entries: [
      make(t('Спланировать неделю'), {
        body: t('Выбрать три главных дела и оставить время для себя.'),
        dueDate: today,
        dueTime: '09:00',
        color: 'violet',
        folderId: workId,
        priority: 'high',
        checklist: [
          { id: id(), text: t('Посмотреть календарь'), done: true },
          { id: id(), text: t('Расставить приоритеты'), done: false },
        ],
      }),
      make(t('Небольшая прогулка'), {
        dueDate: today,
        dueTime: '18:30',
        color: 'sage',
        folderId: personalId,
        repeat: 'daily',
      }),
      make(t('Место для хороших идей'), {
        kind: 'note',
        body: t(
          'Идеям не обязательно сразу становиться задачами. Собирайте здесь всё, к чему захочется вернуться.',
        ),
        color: 'amber',
        folderId: ideasId,
        pinned: true,
      }),
      make(t('Начать новый проект'), {
        body: t('Первый маленький шаг — уже движение вперёд.'),
        dueDate: nextDate(today, 'weekly'),
        color: 'coral',
        folderId: workId,
      }),
    ],
  }
}
