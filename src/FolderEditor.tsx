import { t } from './i18n'
import { useState, type FormEvent } from 'react'
import { Check, Trash2 } from 'lucide-react'
import { Modal } from './Modal'
import { COLORS, COLOR_LABELS, type Folder } from './types'
export function FolderEditor({
  initial,
  save,
  remove,
  close,
}: {
  initial: Folder
  save: (folder: Folder) => boolean
  remove?: () => void
  close: () => void
}) {
  const [folder, setFolder] = useState(initial)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (folder.name.trim() && save({ ...folder, name: folder.name.trim() })) close()
  }
  return (
    <Modal title={initial.name ? t('Изменить папку') : t('Новая папка')} close={close}>
      <form onSubmit={submit} className="editor-form">
        <label className="field">
          {t('Название папки')}
          <input
            autoFocus
            data-autofocus
            required
            maxLength={60}
            value={folder.name}
            placeholder={t('Например, Личное')}
            onChange={(event) => setFolder({ ...folder, name: event.target.value })}
          />
        </label>
        <fieldset className="color-field">
          <legend>{t('Цвет папки')}</legend>
          <div className="color-picker">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`color-swatch ${color} ${folder.color === color ? 'selected' : ''}`}
                aria-label={t(COLOR_LABELS[color])}
                aria-pressed={folder.color === color}
                onClick={() => setFolder({ ...folder, color })}
              >
                {folder.color === color ? <Check size={16} /> : null}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="modal-footer">
          {remove ? (
            <button type="button" className="button danger" onClick={remove}>
              <Trash2 size={16} />
              {t('Удалить папку')}
            </button>
          ) : null}
          <button type="submit" className="button primary">
            {t('Сохранить папку')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
