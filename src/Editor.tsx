import { t } from './i18n'
import { useState, type FormEvent } from 'react'
import { Plus, Trash2, Check, Pin } from 'lucide-react'
import { Modal } from './Modal'
import { COLORS, COLOR_LABELS, PRIORITY_LABELS, type Entry, type Folder } from './types'
import { id } from './model'
export function Editor({
  initial,
  folders,
  save,
  close,
}: {
  initial: Entry
  folders: Folder[]
  save: (entry: Entry) => boolean
  close: () => void
}) {
  const [draft, setDraft] = useState(initial)
  const [checkText, setCheckText] = useState('')
  const [error, setError] = useState('')
  const field = <K extends keyof Entry>(key: K, value: Entry[K]) =>
    setDraft((previous) => ({ ...previous, [key]: value }))
  const addCheck = () => {
    if (!checkText.trim() || draft.checklist.length >= 100) return
    field('checklist', [...draft.checklist, { id: id(), text: checkText.trim(), done: false }])
    setCheckText('')
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!draft.title.trim()) {
      setError(t('Добавьте название.'))
      return
    }
    if (draft.repeat !== 'none' && !draft.dueDate) {
      setError(t('Для повторения выберите дату.'))
      return
    }
    const checklist =
      checkText.trim() && draft.checklist.length < 100
        ? [...draft.checklist, { id: id(), text: checkText.trim(), done: false }]
        : draft.checklist
    if (
      save({ ...draft, title: draft.title.trim(), checklist, updatedAt: new Date().toISOString() })
    )
      close()
  }
  return (
    <Modal title={initial.title ? t('Редактировать запись') : t('Новая запись')} close={close} wide>
      <form onSubmit={submit} className="editor-form">
        <div className="type-tabs" role="group" aria-label={t('Тип записи')}>
          {(['task', 'note'] as const).map((kind) => (
            <button
              type="button"
              key={kind}
              className={draft.kind === kind ? 'selected' : ''}
              onClick={() =>
                setDraft((previous) => ({
                  ...previous,
                  kind,
                  dueDate: kind === 'note' ? '' : previous.dueDate,
                  dueTime: kind === 'note' ? '' : previous.dueTime,
                  repeat: kind === 'note' ? 'none' : previous.repeat,
                  completed: kind === 'note' ? false : previous.completed,
                }))
              }
            >
              {kind === 'task' ? t('Задача') : t('Заметка')}
            </button>
          ))}
        </div>
        <label className="field">
          {t('Название')}
          <input
            autoFocus
            data-autofocus
            required
            maxLength={200}
            value={draft.title}
            onChange={(event) => field('title', event.target.value)}
            placeholder={t('Что хочется сделать?')}
          />
        </label>
        <label className="field">
          {draft.kind === 'note' ? t('Текст заметки') : t('Описание')}
          <textarea
            rows={4}
            maxLength={20000}
            value={draft.body}
            onChange={(event) => field('body', event.target.value)}
            placeholder={t('Детали, идеи, полезные ссылки…')}
          />
        </label>
        <div className="form-grid">
          <label className="field">
            {t('Папка')}
            <select
              aria-label={t('Папка')}
              value={draft.folderId ?? ''}
              onChange={(event) => field('folderId', event.target.value || null)}
            >
              <option value="">{t('Без папки')}</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </label>
          {draft.kind === 'task' ? (
            <label className="field">
              {t('Приоритет')}
              <select
                aria-label={t('Приоритет')}
                value={draft.priority}
                onChange={(event) => field('priority', event.target.value as Entry['priority'])}
              >
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {t(label)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <button
              type="button"
              className={`pin-option ${draft.pinned ? 'selected' : ''}`}
              onClick={() => field('pinned', !draft.pinned)}
            >
              <Pin size={16} /> {draft.pinned ? t('Закреплена') : t('Закрепить заметку')}
            </button>
          )}
        </div>
        {draft.kind === 'task' ? (
          <div className="form-grid three">
            <label className="field">
              {t('Дата')}
              <input
                type="date"
                value={draft.dueDate}
                min="1900-01-01"
                max="9999-12-31"
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    dueDate: event.target.value,
                    dueTime: event.target.value ? previous.dueTime : '',
                  }))
                }
              />
            </label>
            <label className="field">
              {t('Время')}
              <input
                type="time"
                disabled={!draft.dueDate}
                value={draft.dueTime}
                onChange={(event) => field('dueTime', event.target.value)}
              />
            </label>
            <label className="field">
              {t('Повторение')}
              <select
                aria-label={t('Повторение')}
                value={draft.repeat}
                onChange={(event) => field('repeat', event.target.value as Entry['repeat'])}
              >
                <option value="none">{t('Не повторять')}</option>
                <option value="daily">{t('Каждый день')}</option>
                <option value="weekly">{t('Каждую неделю')}</option>
                <option value="monthly">{t('Каждый месяц')}</option>
              </select>
            </label>
          </div>
        ) : null}
        <fieldset className="color-field">
          <legend>{t('Цвет записи')}</legend>
          <div className="color-picker">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`color-swatch ${color} ${draft.color === color ? 'selected' : ''}`}
                aria-label={t(COLOR_LABELS[color])}
                aria-pressed={draft.color === color}
                onClick={() => field('color', color)}
              >
                {draft.color === color ? <Check size={16} /> : null}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="checklist-editor">
          <span className="field-label">{t('Чек-лист')}</span>
          {draft.checklist.map((item) => (
            <div key={item.id} className="check-edit-row">
              <input
                type="checkbox"
                checked={item.done}
                aria-label={t('Выполнено: {{0}}', { '0': item.text })}
                onChange={() =>
                  field(
                    'checklist',
                    draft.checklist.map((check) =>
                      check.id === item.id ? { ...check, done: !check.done } : check,
                    ),
                  )
                }
              />
              <input
                aria-label={t('Текст пункта')}
                maxLength={300}
                required
                value={item.text}
                onChange={(event) =>
                  field(
                    'checklist',
                    draft.checklist.map((check) =>
                      check.id === item.id ? { ...check, text: event.target.value } : check,
                    ),
                  )
                }
              />
              <button
                type="button"
                className="icon-button"
                aria-label={t('Удалить пункт: {{0}}', { '0': item.text })}
                onClick={() =>
                  field(
                    'checklist',
                    draft.checklist.filter((check) => check.id !== item.id),
                  )
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <div className="check-add-row">
            <input
              value={checkText}
              maxLength={300}
              placeholder={t('Добавить пункт…')}
              aria-label={t('Новый пункт чек-листа')}
              onChange={(event) => setCheckText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addCheck()
                }
              }}
            />
            <button
              type="button"
              className="icon-button"
              aria-label={t('Добавить пункт')}
              disabled={!checkText.trim() || draft.checklist.length >= 100}
              onClick={addCheck}
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
        {error ? (
          <p role="alert" className="form-error">
            {error}
          </p>
        ) : null}
        <div className="modal-footer">
          <button type="button" className="button secondary" onClick={close}>
            {t('Отмена')}
          </button>
          <button type="submit" className="button primary">
            {t('Сохранить')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
