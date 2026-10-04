import { t, getLocale } from './i18n'
import {
  Archive,
  CalendarDays,
  Check,
  Flag,
  Pin,
  RotateCcw,
  Repeat2,
  Trash2,
  FileText,
  ListChecks,
  Pencil,
} from 'lucide-react'
import { localDate, parseDate } from './model'
import { PRIORITY_LABELS, type Entry, type Folder } from './types'

export function EntryCard({
  entry,
  folder,
  edit,
  toggle,
  patch,
  purge,
}: {
  entry: Entry
  folder?: Folder
  edit: () => void
  toggle: () => void
  patch: (changes: Partial<Entry>, message: string) => void
  purge: () => void
}) {
  const dateFormat = new Intl.DateTimeFormat(getLocale(), { day: 'numeric', month: 'short' })
  const overdue =
    entry.kind === 'task' &&
    !entry.completed &&
    !entry.deletedAt &&
    !entry.archivedAt &&
    !!entry.dueDate &&
    entry.dueDate < localDate()
  const checks = entry.checklist.filter((item) => item.done).length
  return (
    <article className={`entry-card ${entry.color} ${entry.completed ? 'is-complete' : ''}`}>
      <div className="card-top">
        <span className="entry-kind">
          {entry.kind === 'note' ? (
            <>
              <FileText size={13} />
              {t('Заметка')}
            </>
          ) : (
            <>
              <ListChecks size={13} />
              {t('Задача')}
            </>
          )}
        </span>
        <div className="card-top-actions">
          {entry.priority === 'high' && entry.kind === 'task' ? (
            <span title={t('Высокий приоритет')} className="high-priority">
              <Flag size={14} />
            </span>
          ) : null}
          {!entry.deletedAt && !entry.archivedAt ? (
            <button
              className={`icon-button pin-button ${entry.pinned ? 'pinned' : ''}`}
              onClick={() =>
                patch(
                  { pinned: !entry.pinned },
                  entry.pinned ? t('Запись откреплена') : t('Запись закреплена'),
                )
              }
              aria-label={t('{{0}}: {{1}}', {
                '0': entry.pinned ? t('Открепить') : t('Закрепить'),
                '1': entry.title,
              })}
            >
              <Pin size={15} />
            </button>
          ) : null}
        </div>
      </div>
      <div className="card-title-row">
        {entry.kind === 'task' ? (
          <button
            className={`task-check ${entry.completed ? 'checked' : ''}`}
            disabled={!!entry.deletedAt || !!entry.archivedAt}
            onClick={toggle}
            aria-label={t('{{0}}: {{1}}', {
              '0': entry.completed ? t('Вернуть в работу') : t('Выполнить'),
              '1': entry.title,
            })}
            aria-pressed={entry.completed}
          >
            {entry.completed ? <Check size={14} /> : null}
          </button>
        ) : null}
        <button className="card-title" onClick={edit} disabled={!!entry.deletedAt}>
          {entry.title}
        </button>
      </div>
      {entry.body ? <p className="card-body">{entry.body}</p> : null}
      {entry.checklist.length ? (
        <div className="card-checklist">
          <div className="checklist-progress">
            <span>{t('{{0}} из {{1}} пунктов', { '0': checks, '1': entry.checklist.length })}</span>
            <span>{Math.round((checks / entry.checklist.length) * 100)}%</span>
          </div>
          <div className="progress-track">
            <span style={{ width: `${(checks / entry.checklist.length) * 100}%` }} />
          </div>
        </div>
      ) : null}
      <div className="card-meta">
        {entry.dueDate ? (
          <span className={`date-badge ${overdue ? 'overdue' : ''}`}>
            <CalendarDays size={13} />
            {entry.dueDate === localDate()
              ? t('Сегодня')
              : dateFormat.format(parseDate(entry.dueDate))}
            {entry.dueTime ? ` · ${entry.dueTime}` : ''}
            {overdue ? t(' · просрочено') : ''}
          </span>
        ) : null}
        {entry.repeat !== 'none' ? (
          <span title={t('Повторяющаяся задача')}>
            <Repeat2 size={14} />
          </span>
        ) : null}
        {entry.kind === 'task' && entry.priority !== 'medium' ? (
          <span className="priority-label">{t(PRIORITY_LABELS[entry.priority])}</span>
        ) : null}
      </div>
      <div className="card-footer">
        <span className="folder-label">
          {folder ? (
            <>
              <i className={`folder-dot ${folder.color}`} />
              {folder.name}
            </>
          ) : (
            t('Без папки')
          )}
        </span>
        <div className="card-actions">
          {entry.deletedAt ? (
            <>
              <button
                className="icon-button"
                aria-label={t('Восстановить: {{0}}', { '0': entry.title })}
                onClick={() => patch({ deletedAt: null }, t('Запись восстановлена'))}
              >
                <RotateCcw size={15} />
              </button>
              <button
                className="icon-button danger-icon"
                aria-label={t('Удалить навсегда: {{0}}', { '0': entry.title })}
                onClick={purge}
              >
                <Trash2 size={15} />
              </button>
            </>
          ) : (
            <>
              <button
                className="icon-button"
                aria-label={t('Редактировать: {{0}}', { '0': entry.title })}
                onClick={edit}
              >
                <Pencil size={14} />
              </button>
              <button
                className="icon-button"
                aria-label={t('{{0}}: {{1}}', {
                  '0': entry.archivedAt ? t('Разархивировать') : t('Архивировать'),
                  '1': entry.title,
                })}
                onClick={() =>
                  patch(
                    { archivedAt: entry.archivedAt ? null : new Date().toISOString() },
                    entry.archivedAt ? t('Запись возвращена из архива') : t('Запись в архиве'),
                  )
                }
              >
                {entry.archivedAt ? <RotateCcw size={15} /> : <Archive size={15} />}
              </button>
              <button
                className="icon-button danger-icon"
                aria-label={t('В корзину: {{0}}', { '0': entry.title })}
                onClick={() =>
                  patch({ deletedAt: new Date().toISOString() }, t('Запись перемещена в корзину'))
                }
              >
                <Trash2 size={15} />
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  )
}
