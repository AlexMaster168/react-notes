import { t, getLocale } from './i18n'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, CalendarDays, Check } from 'lucide-react'
import { localDate, parseDate } from './model'
import type { Entry } from './types'
const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
export function Calendar({
  entries,
  create,
  edit,
  toggle,
}: {
  entries: Entry[]
  create: (date: string) => void
  edit: (entry: Entry) => void
  toggle: (entry: Entry) => void
}) {
  const [month, setMonth] = useState(() => {
    const date = new Date()
    return new Date(date.getFullYear(), date.getMonth(), 1)
  })
  const [selected, setSelected] = useState(localDate)
  const offset = (month.getDay() + 6) % 7
  const days = Array.from(
    { length: 42 },
    (_, index) => new Date(month.getFullYear(), month.getMonth(), index - offset + 1),
  )
  const tasks = entries.filter(
    (entry) => entry.kind === 'task' && !entry.deletedAt && !entry.archivedAt && entry.dueDate,
  )
  const selectedTasks = tasks
    .filter((entry) => entry.dueDate === selected)
    .sort((a, b) => Number(a.completed) - Number(b.completed) || a.dueTime.localeCompare(b.dueTime))
  const move = (step: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + step, 1))
  return (
    <div className="calendar-layout">
      <section className="calendar-panel" aria-label={t('Календарь задач')}>
        <div className="calendar-toolbar">
          <h2>
            {new Intl.DateTimeFormat(getLocale(), { month: 'long', year: 'numeric' }).format(month)}
          </h2>
          <div>
            <button
              className="text-button"
              onClick={() => {
                const now = new Date()
                setMonth(new Date(now.getFullYear(), now.getMonth(), 1))
                setSelected(localDate())
              }}
            >
              {t('Сегодня')}
            </button>
            <button
              className="icon-button"
              aria-label={t('Предыдущий месяц')}
              onClick={() => move(-1)}
            >
              <ChevronLeft size={19} />
            </button>
            <button
              className="icon-button"
              aria-label={t('Следующий месяц')}
              onClick={() => move(1)}
            >
              <ChevronRight size={19} />
            </button>
          </div>
        </div>
        <div className="calendar-weekdays">
          {weekdays.map((day) => (
            <span key={day}>{t(day)}</span>
          ))}
        </div>
        <div className="calendar-grid">
          {days.map((date) => {
            const key = localDate(date),
              dayTasks = tasks.filter((entry) => entry.dueDate === key)
            return (
              <button
                key={key}
                className={`calendar-day ${date.getMonth() !== month.getMonth() ? 'other-month' : ''} ${key === localDate() ? 'is-today' : ''} ${key === selected ? 'is-selected' : ''}`}
                aria-label={t('{{0}}, задач: {{1}}', {
                  '0': new Intl.DateTimeFormat(getLocale(), {
                    day: 'numeric',
                    month: 'long',
                  }).format(date),
                  '1': dayTasks.length,
                })}
                aria-pressed={key === selected}
                onClick={() => setSelected(key)}
              >
                <span className="day-number">{date.getDate()}</span>
                <span className="calendar-events">
                  {dayTasks.slice(0, 2).map((entry) => (
                    <span
                      className={`calendar-event ${entry.color} ${entry.completed ? 'event-done' : ''}`}
                      key={entry.id}
                    >
                      <i />
                      {entry.title}
                    </span>
                  ))}
                  {dayTasks.length > 2 ? (
                    <span className="more-events">
                      {t('Ещё')}
                      {dayTasks.length - 2}
                    </span>
                  ) : null}
                </span>
              </button>
            )
          })}
        </div>
      </section>
      <aside className="day-agenda">
        <span className="eyebrow">{t('ПЛАН НА ДЕНЬ')}</span>
        <h2>
          {new Intl.DateTimeFormat(getLocale(), { day: 'numeric', month: 'long' }).format(
            parseDate(selected),
          )}
        </h2>
        <p className="muted">
          {new Intl.DateTimeFormat(getLocale(), { weekday: 'long' }).format(parseDate(selected))}
        </p>
        <button className="button secondary full" onClick={() => create(selected)}>
          <Plus size={17} />
          {t('Добавить задачу')}
        </button>
        {selectedTasks.length ? (
          <div className="agenda-items">
            {selectedTasks.map((entry) => (
              <div className={`agenda-item ${entry.completed ? 'is-complete' : ''}`} key={entry.id}>
                <span className="agenda-time">{entry.dueTime || t('Весь день')}</span>
                <div>
                  <button
                    className={`task-check ${entry.completed ? 'checked' : ''}`}
                    aria-label={t('{{0}}: {{1}}', {
                      '0': entry.completed ? t('Вернуть в работу') : t('Выполнить'),
                      '1': entry.title,
                    })}
                    onClick={() => toggle(entry)}
                  >
                    {entry.completed ? <Check size={14} /> : null}
                  </button>
                  <button className="agenda-title" onClick={() => edit(entry)}>
                    {entry.title}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="agenda-empty">
            <CalendarDays size={30} />
            <p>{t('День открыт для планов')}</p>
            <span>{t('Добавьте дело или оставьте время для себя.')}</span>
          </div>
        )}
      </aside>
    </div>
  )
}
