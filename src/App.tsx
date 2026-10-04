import { t, getLocale, useLanguage, setLanguage, LANGUAGES, type Language } from './i18n'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  FileText,
  Folder as FolderIcon,
  Inbox,
  LayoutGrid,
  List,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings as SettingsIcon,
  Sparkles,
  Sun,
  Trash2,
  Undo2,
  X,
  Clock3,
  SlidersHorizontal,
} from 'lucide-react'
import { useWorkspace } from './useWorkspace'
import { demoWorkspace, id, localDate, matchesView, newEntry, toggleEntry } from './model'
import { COLORS, COLOR_LABELS, type Entry, type Folder, type View } from './types'
import { EntryCard } from './EntryCard'
import { Editor } from './Editor'
import { FolderEditor } from './FolderEditor'
import { Calendar } from './Calendar'
import { Settings, type Theme, type Palette } from './Settings'
import { Modal } from './Modal'
import { PwaBanner } from './PwaBanner'
const navigation = [
  { view: 'all', label: 'Все записи', Icon: Inbox },
  { view: 'today', label: 'Сегодня', Icon: Sun },
  { view: 'upcoming', label: 'Предстоящие', Icon: Clock3 },
  { view: 'calendar', label: 'Планировщик', Icon: CalendarDays },
  { view: 'notes', label: 'Заметки', Icon: FileText },
  { view: 'completed', label: 'Выполнено', Icon: CheckCheck },
] as const
const descriptions: Record<string, string> = {
  all: 'Всё важное — на своём месте.',
  today: 'Небольшие шаги. Хороший день.',
  upcoming: 'Планы, которым ещё предстоит случиться.',
  calendar: 'Освободите место для самого важного.',
  notes: 'Поймайте мысль, пока она рядом.',
  completed: 'Каждое завершённое дело — маленькая победа.',
  archive: 'Сохранено на будущее.',
  trash: 'Удалённые записи можно восстановить.',
}
function readTheme(): Theme {
  try {
    const value = localStorage.getItem('react-notes:theme')
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}
type Confirmation = {
  title: string
  body: string
  action: () => void
  label: string
}
export default function App() {
  const language = useLanguage()
  const [palette, setPalette] = useState<Palette>(() => {
    try {
      const value = localStorage.getItem('react-notes:palette')
      return value === 'forest' || value === 'ocean' || value === 'lavender' ? value : 'terracotta'
    } catch {
      return 'terracotta'
    }
  })
  useEffect(() => {
    document.documentElement.dataset.palette = palette
    try {
      localStorage.setItem('react-notes:palette', palette)
    } catch {
      /* Optional preference. */
    }
  }, [palette])
  useEffect(() => {
    document.documentElement.lang = language
    document.title = t('Дела — задачи и заметки')
  }, [language])
  const { workspace, commit, undo, recover, canUndo, storageError, notice, setNotice } =
    useWorkspace()
  const [view, setView] = useState<View>('all')
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('all')
  const [color, setColor] = useState('all')
  const [priority, setPriority] = useState('all')
  const [sort, setSort] = useState('date')
  const [layout, setLayout] = useState<'grid' | 'list'>('grid')
  const [editor, setEditor] = useState<Entry | null>(null)
  const [folderEditor, setFolderEditor] = useState<Folder | null>(null)
  const [settings, setSettings] = useState(false)
  const [confirm, setConfirm] = useState<Confirmation | null>(null)
  const [sidebar, setSidebar] = useState(false)
  const [filters, setFilters] = useState(false)
  const [theme, setTheme] = useState<Theme>(readTheme)
  const [today, setToday] = useState(localDate)
  const search = useRef<HTMLInputElement>(null)
  const modalOpen = !!editor || !!folderEditor || settings || !!confirm
  const activeFolder = view.startsWith('folder:')
    ? workspace.folders.find((folder) => folder.id === view.slice(7))
    : undefined
  const title =
    activeFolder?.name ??
    t(
      navigation.find((item) => item.view === view)?.label ??
        (view === 'archive' ? 'Архив' : view === 'trash' ? 'Корзина' : 'Все записи'),
    )
  const active = workspace.entries.filter((entry) => !entry.deletedAt && !entry.archivedAt)
  const activeTasks = active.filter((entry) => entry.kind === 'task')
  const completedCount = activeTasks.filter((entry) => entry.completed).length
  const todayTasks = activeTasks.filter((entry) => entry.dueDate === today)
  const todayCompleted = todayTasks.filter((entry) => entry.completed).length
  const overdue = activeTasks.filter(
    (entry) => !entry.completed && entry.dueDate && entry.dueDate < today,
  ).length
  const folderMap = useMemo(
    () => new Map(workspace.folders.map((folder) => [folder.id, folder])),
    [workspace.folders],
  )
  const locale = { ru: 'ru-RU', uk: 'uk-UA', en: 'en-GB' }[language]
  const visible = useMemo(() => {
    const weights = { high: 0, medium: 1, low: 2 }
    const searchText = query.trim().toLocaleLowerCase('ru')
    return workspace.entries
      .filter(
        (entry) =>
          matchesView(entry, view, today) &&
          (kind === 'all' || entry.kind === kind) &&
          (color === 'all' || entry.color === color) &&
          (priority === 'all' || (entry.kind === 'task' && entry.priority === priority)) &&
          (!searchText ||
            `${entry.title} ${entry.body} ${entry.checklist.map((item) => item.text).join(' ')}`
              .toLocaleLowerCase('ru')
              .includes(searchText)),
      )
      .sort(
        (a, b) =>
          Number(b.pinned) - Number(a.pinned) ||
          (sort === 'title'
            ? a.title.localeCompare(b.title, locale)
            : sort === 'priority'
              ? weights[a.priority] - weights[b.priority]
              : sort === 'newest'
                ? b.createdAt.localeCompare(a.createdAt)
                : (a.dueDate || '9999').localeCompare(b.dueDate || '9999') ||
                  a.dueTime.localeCompare(b.dueTime)) ||
          b.createdAt.localeCompare(a.createdAt),
      )
  }, [workspace.entries, view, today, query, kind, color, priority, sort, locale])
  const filterCount = Number(color !== 'all') + Number(priority !== 'all')
  const create = (
    entryKind: Entry['kind'] = view === 'notes' ? 'note' : 'task',
    date = view === 'today' ? today : '',
  ) => setEditor(newEntry(entryKind, activeFolder?.id ?? null, date))
  const navigate = (next: View) => {
    setView(next)
    setSidebar(false)
    setQuery('')
    setKind('all')
    setColor('all')
    setPriority('all')
  }
  const patchEntry = (entry: Entry, changes: Partial<Entry>, message: string) =>
    commit(
      {
        ...workspace,
        entries: workspace.entries.map((item) =>
          item.id === entry.id
            ? { ...item, ...changes, updatedAt: new Date().toISOString() }
            : item,
        ),
      },
      message,
    )
  const saveEntry = (entry: Entry) => {
    const exists = workspace.entries.some((item) => item.id === entry.id)
    if (!exists && workspace.entries.length >= 10000) {
      setNotice(t('Достигнут лимит 10 000 записей. Экспортируйте и очистите ненужные записи.'))
      return false
    }
    return commit(
      {
        ...workspace,
        entries: exists
          ? workspace.entries.map((item) => (item.id === entry.id ? entry : item))
          : [entry, ...workspace.entries],
      },
      exists ? t('Запись обновлена') : t('Запись добавлена'),
    )
  }
  useEffect(() => {
    const interval = window.setInterval(() => setToday(localDate()), 30000)
    const refresh = () => setToday(localDate())
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', refresh)
    }
  }, [])
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === 'system' ? (media.matches ? 'dark' : 'light') : theme
    }
    apply()
    media.addEventListener('change', apply)
    try {
      localStorage.setItem('react-notes:theme', theme)
    } catch {
      /* Theme preferences are optional. */
    }
    return () => media.removeEventListener('change', apply)
  }, [theme])
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (
        modalOpen ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        (event.target instanceof HTMLElement &&
          (event.target.matches('input, textarea, select') || event.target.isContentEditable))
      )
        return
      if (event.key.toLowerCase() === 'n') {
        event.preventDefault()
        setEditor(
          newEntry(
            view === 'notes' ? 'note' : 'task',
            activeFolder?.id ?? null,
            view === 'today' ? today : '',
          ),
        )
      }
      if (event.key === '/') {
        event.preventDefault()
        search.current?.focus()
      }
      if (event.key === 'Escape') setSidebar(false)
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [modalOpen, view, activeFolder?.id, today])
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 6000)
    return () => clearTimeout(timer)
  }, [notice, setNotice])
  const purge = (entry: Entry) =>
    setConfirm({
      title: t('Удалить запись навсегда?'),
      body: t('«{{0}}» будет удалена из этого браузера.', { '0': entry.title }),
      label: t('Удалить навсегда'),
      action: () => {
        commit(
          { ...workspace, entries: workspace.entries.filter((item) => item.id !== entry.id) },
          t('Запись удалена'),
        )
        setConfirm(null)
      },
    })
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        {t('Перейти к записям')}
      </a>
      {sidebar ? (
        <button
          className="sidebar-overlay"
          aria-label={t('Закрыть меню')}
          onClick={() => setSidebar(false)}
        />
      ) : null}
      <aside className={`sidebar ${sidebar ? 'open' : ''}`} aria-label={t('Главное меню')}>
        <a
          className="brand"
          href="#"
          onClick={(event) => {
            event.preventDefault()
            navigate('all')
          }}
        >
          <span className="brand-mark">
            <Check size={23} strokeWidth={3} />
          </span>
          <span>
            {t('дела')}
            <span className="brand-period">.</span>
          </span>
        </a>
        <div className="workspace-label">
          <span className="workspace-avatar">{t('А')}</span>
          <div>
            <strong>{t('Личное пространство')}</strong>
            <span>{t('Ваш маленький порядок')}</span>
          </div>
        </div>
        <button
          className="button primary new-entry"
          onClick={() => {
            create()
            setSidebar(false)
          }}
        >
          <Plus size={19} />
          {t('Новая запись')}
          <kbd>N</kbd>
        </button>
        <nav className="main-nav">
          {navigation.map(({ view: next, label, Icon }) => (
            <button
              key={next}
              className={`nav-item ${view === next ? 'active' : ''}`}
              onClick={() => navigate(next)}
            >
              <Icon size={18} />
              <span>{t(label)}</span>
              {next !== 'calendar' ? (
                <span className="nav-count">
                  {workspace.entries.filter((entry) => matchesView(entry, next, today)).length}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-section-label">
          <span>{t('МОИ ПАПКИ')}</span>
          <button
            className="icon-button"
            aria-label={t('Создать папку')}
            onClick={() => setFolderEditor({ id: id(), name: '', color: 'violet' })}
          >
            <Plus size={16} />
          </button>
        </div>
        <nav className="folder-nav" aria-label={t('Папки')}>
          {workspace.folders.length ? (
            workspace.folders.map((folder) => (
              <div
                className={`folder-nav-row ${view === `folder:${folder.id}` ? 'active' : ''}`}
                key={folder.id}
              >
                <button className="nav-item" onClick={() => navigate(`folder:${folder.id}`)}>
                  <FolderIcon size={17} className={`folder-icon ${folder.color}`} />
                  <span>{folder.name}</span>
                  <span className="nav-count">
                    {active.filter((entry) => entry.folderId === folder.id).length}
                  </span>
                </button>
                <button
                  className="icon-button folder-menu"
                  aria-label={t('Изменить папку: {{0}}', { '0': folder.name })}
                  onClick={() => setFolderEditor(folder)}
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>
            ))
          ) : (
            <button
              className="folder-empty"
              onClick={() => setFolderEditor({ id: id(), name: '', color: 'sage' })}
            >
              {t('Создайте папку для своих планов')}
              <Plus size={15} />
            </button>
          )}
        </nav>
        <div className="sidebar-bottom">
          <nav>
            {[
              { next: 'archive' as const, label: t('Архив'), Icon: Archive },
              { next: 'trash' as const, label: t('Корзина'), Icon: Trash2 },
            ].map(({ next, label, Icon }) => (
              <button
                key={next}
                className={`nav-item ${view === next ? 'active' : ''}`}
                onClick={() => navigate(next)}
              >
                <Icon size={17} />
                <span>{t(label)}</span>
              </button>
            ))}
            <button
              className="nav-item"
              onClick={() => {
                setSettings(true)
                setSidebar(false)
              }}
            >
              <SettingsIcon size={17} />
              <span>{t('Настройки')}</span>
            </button>
          </nav>
          <div className="local-status">
            <span />
            {storageError ? t('Данные требуют внимания') : t('Сохранено на этом устройстве')}
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              onClick={() => setSidebar(true)}
              aria-label={t('Открыть меню')}
            >
              <Menu size={21} />
            </button>
            <span>{t('Моё пространство')}</span>
            <ChevronRight size={14} />
            <strong>{title}</strong>
          </div>
          <div className="topbar-actions">
            <select
              className="language-switch"
              aria-label={t('Язык')}
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
            >
              {LANGUAGES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.value.toUpperCase()}
                </option>
              ))}
            </select>
            <span className="top-date">
              {new Intl.DateTimeFormat(getLocale(), { day: 'numeric', month: 'long' }).format(
                new Date(`${today}T12:00:00`),
              )}
            </span>
            <button
              className="icon-button"
              aria-label={t('Настройки')}
              onClick={() => setSettings(true)}
            >
              <SettingsIcon size={18} />
            </button>
            <span className="top-avatar">{t('А')}</span>
          </div>
        </header>
        <main id="main" className="main-content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">{t('МЕНЬШЕ СУЕТЫ. БОЛЬШЕ ЯСНОСТИ.')}</span>
              <h1>
                {title}
                <span className="heading-dot">.</span>
              </h1>
              <p>{t(descriptions[view] ?? 'Отдельное место для связанных дел и идей.')}</p>
            </div>
            {view !== 'trash' && view !== 'archive' ? (
              <button className="button primary heading-add" onClick={() => create()}>
                <Plus size={18} />
                {view === 'notes' ? t('Новая заметка') : t('Добавить запись')}
              </button>
            ) : null}
          </div>
          {storageError ? (
            <div className="storage-error" role="alert">
              <strong>{t('Данные требуют внимания')}</strong>
              <p>{storageError}</p>
              <button className="button secondary" onClick={() => setSettings(true)}>
                {t('Открыть резервные копии')}
              </button>
            </div>
          ) : null}
          {(view === 'all' || view === 'today') && workspace.entries.length > 0 ? (
            <div className="overview">
              <section className="focus-card">
                <div className="focus-icon">
                  <Sun size={22} />
                </div>
                <div>
                  <span>{t('Фокус на сегодня')}</span>
                  <h2>
                    {todayTasks.length
                      ? t('{{0}} из {{1}} дел завершено', {
                          '0': todayCompleted,
                          '1': todayTasks.length,
                        })
                      : t('У каждого дня свой ритм')}
                  </h2>
                  <p>
                    {overdue
                      ? t('{{0}} просроченных дел ждут внимания.', { '0': overdue })
                      : t('Оставьте время и для того, что радует.')}
                  </p>
                </div>
                <div
                  className="focus-progress"
                  style={
                    {
                      '--progress': `${todayTasks.length ? (todayCompleted / todayTasks.length) * 100 : 0}%`,
                    } as React.CSSProperties
                  }
                >
                  <span>
                    {todayTasks.length ? Math.round((todayCompleted / todayTasks.length) * 100) : 0}
                    <small>%</small>
                  </span>
                </div>
              </section>
              <section className="stat-card">
                <span className="stat-icon">
                  <CheckCheck size={21} />
                </span>
                <strong>{completedCount}</strong>
                <span>{t('дел завершено')}</span>
                <small>{t('Маленькие шаги считаются')}</small>
              </section>
            </div>
          ) : null}
          {view === 'calendar' ? (
            <Calendar
              entries={workspace.entries}
              create={(date) => create('task', date)}
              edit={setEditor}
              toggle={(entry) =>
                commit(
                  toggleEntry(workspace, entry.id),
                  entry.completed ? t('Задача возвращена в работу') : t('Задача выполнена'),
                )
              }
            />
          ) : (
            <>
              <div className="content-toolbar">
                <div className="content-tabs" role="group" aria-label={t('Тип записей')}>
                  {[
                    { value: 'all', label: t('Все') },
                    { value: 'task', label: t('Задачи') },
                    { value: 'note', label: t('Заметки') },
                  ].map((item) => (
                    <button
                      key={item.value}
                      className={kind === item.value ? 'selected' : ''}
                      aria-pressed={kind === item.value}
                      onClick={() => setKind(item.value)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="toolbar-actions">
                  <label className="search-field">
                    <Search size={16} />
                    <input
                      ref={search}
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={t('Поиск записей…')}
                      aria-label={t('Поиск записей')}
                    />
                    {query ? (
                      <button
                        className="icon-button"
                        aria-label={t('Очистить поиск')}
                        onClick={() => setQuery('')}
                      >
                        <X size={14} />
                      </button>
                    ) : (
                      <kbd>/</kbd>
                    )}
                  </label>
                  <button
                    className={`icon-button filter-toggle ${filters || filterCount ? 'selected' : ''}`}
                    aria-label={t('Фильтры')}
                    aria-expanded={filters}
                    onClick={() => setFilters(!filters)}
                  >
                    <SlidersHorizontal size={17} />
                    {filterCount ? <span>{filterCount}</span> : null}
                  </button>
                  <div className="layout-toggle">
                    <button
                      className={`icon-button ${layout === 'grid' ? 'selected' : ''}`}
                      aria-label={t('Вид карточками')}
                      aria-pressed={layout === 'grid'}
                      onClick={() => setLayout('grid')}
                    >
                      <LayoutGrid size={17} />
                    </button>
                    <button
                      className={`icon-button ${layout === 'list' ? 'selected' : ''}`}
                      aria-label={t('Вид списком')}
                      aria-pressed={layout === 'list'}
                      onClick={() => setLayout('list')}
                    >
                      <List size={19} />
                    </button>
                  </div>
                </div>
              </div>
              {filters ? (
                <div className="filter-bar">
                  <label>
                    {t('Цвет')}
                    <select
                      aria-label={t('Цвет')}
                      value={color}
                      onChange={(event) => setColor(event.target.value)}
                    >
                      <option value="all">{t('Все цвета')}</option>
                      {COLORS.map((item) => (
                        <option key={item} value={item}>
                          {t(COLOR_LABELS[item])}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t('Приоритет')}
                    <select
                      aria-label={t('Приоритет')}
                      value={priority}
                      onChange={(event) => setPriority(event.target.value)}
                    >
                      <option value="all">{t('Любой')}</option>
                      <option value="high">{t('Высокий')}</option>
                      <option value="medium">{t('Обычный')}</option>
                      <option value="low">{t('Низкий')}</option>
                    </select>
                  </label>
                  <button
                    className="text-button"
                    onClick={() => {
                      setColor('all')
                      setPriority('all')
                      setQuery('')
                      setKind('all')
                    }}
                  >
                    {t('Сбросить')}
                  </button>
                </div>
              ) : null}
              <div className="list-meta">
                <span>
                  {t('{{0}} записей', { '0': visible.length })}
                  {query || kind !== 'all' || filterCount ? t(' по вашему запросу') : ''}
                </span>
                <label>
                  {t('Сортировка:')}
                  <select
                    aria-label={t('Сортировка')}
                    value={sort}
                    onChange={(event) => setSort(event.target.value)}
                  >
                    <option value="date">{t('По дате')}</option>
                    <option value="newest">{t('Сначала новые')}</option>
                    <option value="priority">{t('По приоритету')}</option>
                    <option value="title">{t('По названию')}</option>
                  </select>
                </label>
              </div>
              {visible.length ? (
                <div className={`entries ${layout}`}>
                  {visible.map((entry) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      folder={entry.folderId ? folderMap.get(entry.folderId) : undefined}
                      edit={() => setEditor(entry)}
                      toggle={() =>
                        commit(
                          toggleEntry(workspace, entry.id),
                          entry.completed ? t('Задача возвращена в работу') : t('Задача выполнена'),
                        )
                      }
                      patch={(changes, message) => patchEntry(entry, changes, message)}
                      purge={() => purge(entry)}
                    />
                  ))}
                  {!query &&
                  !filterCount &&
                  view !== 'trash' &&
                  view !== 'archive' &&
                  layout === 'grid' ? (
                    <button className="add-card" onClick={() => create()}>
                      <span>
                        <Plus size={25} />
                      </span>
                      <strong>{t('Ещё одна хорошая идея')}</strong>
                      <small>{t('Добавьте задачу или заметку')}</small>
                    </button>
                  ) : null}
                </div>
              ) : (
                <section className="empty-state">
                  <div className="empty-illustration">
                    <span className="empty-paper">
                      <List size={34} />
                      <i />
                      <i />
                    </span>
                    <span className="empty-spark">
                      <Sparkles size={23} />
                    </span>
                    <span className="empty-check">
                      <Check size={19} />
                    </span>
                  </div>
                  <h2>
                    {query || filterCount || kind !== 'all'
                      ? t('Ничего не нашлось')
                      : view === 'completed'
                        ? t('Всё ещё впереди')
                        : view === 'trash'
                          ? t('Корзина пуста')
                          : view === 'archive'
                            ? t('Пока ничего в архиве')
                            : view === 'today'
                              ? t('Сегодня всё спокойно')
                              : t('Начните с маленького шага')}
                  </h2>
                  <p>
                    {query || filterCount || kind !== 'all'
                      ? t('Попробуйте изменить запрос или убрать фильтры.')
                      : view === 'trash' || view === 'archive'
                        ? t('Здесь появятся записи, которые вы сюда переместите.')
                        : t('Запишите дело, сохраните мысль или спланируйте день.')}
                  </p>
                  {view !== 'trash' && view !== 'archive' && view !== 'completed' ? (
                    <button className="button primary" onClick={() => create()}>
                      <Plus size={17} />
                      {t('Создать запись')}
                    </button>
                  ) : null}
                  {workspace.entries.length === 0 &&
                  workspace.folders.length === 0 &&
                  !storageError ? (
                    <button
                      className="text-button demo-button"
                      onClick={() =>
                        commit(
                          demoWorkspace(),
                          t('Примеры добавлены — их можно изменить или удалить'),
                        )
                      }
                    >
                      {t('Посмотреть на примере')}
                      <ArrowUpRight size={14} />
                    </button>
                  ) : null}
                </section>
              )}
            </>
          )}
          <footer className="page-footer">
            <span>
              <span className="small-logo">✓</span>
              {t('Порядок начинается с одной записи.')}
            </span>
            <button className="text-button" onClick={() => setSettings(true)}>
              <CircleHelp size={14} />
              {t('Данные и подсказки')}
            </button>
          </footer>
        </main>
      </div>
      {editor ? (
        <Editor
          key={editor.id}
          initial={editor}
          folders={workspace.folders}
          save={saveEntry}
          close={() => setEditor(null)}
        />
      ) : null}
      {folderEditor ? (
        <FolderEditor
          key={folderEditor.id}
          initial={folderEditor}
          close={() => setFolderEditor(null)}
          save={(folder) => {
            if (
              !workspace.folders.some((item) => item.id === folder.id) &&
              workspace.folders.length >= 200
            ) {
              setNotice(t('Достигнут лимит 200 папок.'))
              return false
            }
            if (
              workspace.folders.some(
                (item) =>
                  item.id !== folder.id &&
                  item.name.toLocaleLowerCase('ru') === folder.name.toLocaleLowerCase('ru'),
              )
            ) {
              setNotice(t('Папка с таким названием уже есть.'))
              return false
            }
            return commit(
              {
                ...workspace,
                folders: workspace.folders.some((item) => item.id === folder.id)
                  ? workspace.folders.map((item) => (item.id === folder.id ? folder : item))
                  : [...workspace.folders, folder],
              },
              t('Папка сохранена'),
            )
          }}
          remove={
            folderEditor.name
              ? () => {
                  const folder = folderEditor
                  setFolderEditor(null)
                  setConfirm({
                    title: t('Удалить папку?'),
                    body: t(
                      'Папка «{{0}}» исчезнет. Все её записи останутся в разделе «Все записи».',
                      { '0': folder.name },
                    ),
                    label: t('Удалить папку'),
                    action: () => {
                      if (
                        commit(
                          {
                            ...workspace,
                            folders: workspace.folders.filter((item) => item.id !== folder.id),
                            entries: workspace.entries.map((item) =>
                              item.folderId === folder.id ? { ...item, folderId: null } : item,
                            ),
                          },
                          t('Папка удалена, записи сохранены'),
                        )
                      )
                        navigate('all')
                      setConfirm(null)
                    },
                  })
                }
              : undefined
          }
        />
      ) : null}
      {settings ? (
        <Settings
          workspace={workspace}
          close={() => setSettings(false)}
          restore={recover}
          theme={theme}
          setTheme={setTheme}
          palette={palette}
          setPalette={setPalette}
        />
      ) : null}
      {confirm ? (
        <Modal title={confirm.title} close={() => setConfirm(null)}>
          <p className="confirm-body">{confirm.body}</p>
          <div className="modal-footer">
            <button className="button secondary" onClick={() => setConfirm(null)}>
              {t('Отмена')}
            </button>
            <button className="button danger" onClick={confirm.action}>
              {confirm.label}
            </button>
          </div>
        </Modal>
      ) : null}
      {notice ? (
        <div className="toast" role="status">
          <Check size={17} />
          <span>{notice}</span>
          {canUndo ? (
            <button onClick={undo}>
              <Undo2 size={15} />
              {t('Отменить')}
            </button>
          ) : null}
          <button
            className="toast-close"
            aria-label={t('Закрыть уведомление')}
            onClick={() => setNotice('')}
          >
            <X size={16} />
          </button>
        </div>
      ) : null}
      <PwaBanner editing={modalOpen} />
    </div>
  )
}
