import { t, getLanguage, setLanguage, LANGUAGES, type Language } from './i18n'
import { useRef, useState } from 'react'
import { Download, Upload, ShieldCheck, Laptop, Sun, Moon } from 'lucide-react'
import { Modal } from './Modal'
import { STORAGE_KEY, validateWorkspace, localDate } from './model'
import type { Workspace } from './types'
export type Theme = 'light' | 'dark' | 'system'
export type Palette = 'terracotta' | 'forest' | 'ocean' | 'lavender'
function download(content: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function Settings({
  workspace,
  close,
  restore,
  theme,
  setTheme,
  palette,
  setPalette,
}: {
  workspace: Workspace
  close: () => void
  restore: (workspace: Workspace) => boolean
  theme: Theme
  setTheme: (theme: Theme) => void
  palette: Palette
  setPalette: (palette: Palette) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Workspace | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const importFile = async (file?: File) => {
    setError('')
    setSuccess('')
    if (!file) return
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error(t('Размер файла не должен превышать 10 МБ.'))
      setPending(validateWorkspace(JSON.parse(await file.text())))
    } catch (error) {
      setError(error instanceof Error ? error.message : t('Не удалось прочитать файл.'))
    }
    if (input.current) input.current.value = ''
  }
  return (
    <Modal title={t('Настройки')} close={close}>
      <div className="settings-content">
        <section>
          <label className="field">
            {t('Язык')}
            <select
              aria-label={t('Язык')}
              value={getLanguage()}
              onChange={(event) => setLanguage(event.target.value as Language)}
            >
              {LANGUAGES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </section>
        <section>
          <h3>{t('Цветовая тема')}</h3>
          <div className="palette-options">
            {(
              [
                { value: 'terracotta', label: 'Терракота' },
                { value: 'forest', label: 'Лес' },
                { value: 'ocean', label: 'Океан' },
                { value: 'lavender', label: 'Лаванда' },
              ] as const
            ).map((item) => (
              <button
                key={item.value}
                className={`palette-option ${item.value} ${palette === item.value ? 'selected' : ''}`}
                aria-pressed={palette === item.value}
                onClick={() => setPalette(item.value)}
              >
                <span />
                {t(item.label)}
              </button>
            ))}
          </div>
        </section>
        <section>
          <h3>{t('Оформление')}</h3>
          <div className="theme-options">
            {(
              [
                { value: 'light', label: t('Светлое'), Icon: Sun },
                { value: 'dark', label: t('Тёмное'), Icon: Moon },
                { value: 'system', label: t('Как в системе'), Icon: Laptop },
              ] as const
            ).map(({ value, label, Icon }) => (
              <button
                key={value}
                className={theme === value ? 'selected' : ''}
                aria-pressed={theme === value}
                onClick={() => setTheme(value)}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
        </section>
        <section>
          <h3>{t('Ваши данные')}</h3>
          <p>
            {t(
              'Записи хранятся только в этом браузере. Для переноса на другое устройство скачайте копию и восстановите её там.',
            )}
          </p>
          <div className="backup-buttons">
            <button
              className="button secondary"
              onClick={() =>
                download(JSON.stringify(workspace, null, 2), `dela-${localDate()}.json`)
              }
            >
              <Download size={17} />
              {t('Скачать копию')}
            </button>
            <button className="button secondary" onClick={() => input.current?.click()}>
              <Upload size={17} />
              {t('Восстановить')}
            </button>
          </div>
          <input
            ref={input}
            type="file"
            accept="application/json,.json"
            hidden
            aria-label={t('Файл резервной копии')}
            onChange={(event) => {
              void importFile(event.target.files?.[0])
            }}
          />
          {pending ? (
            <div className="import-confirm">
              <strong>
                {t('Восстановить {{0}} записей и {{1}} папок?', {
                  '0': pending.entries.length,
                  '1': pending.folders.length,
                })}
              </strong>
              <p>
                {t(
                  'Текущие данные будут заменены. Сначала сохраните их копию. Действие можно отменить, пока вкладка открыта.',
                )}
              </p>
              <button
                className="button primary"
                onClick={() => {
                  if (restore(pending)) {
                    setPending(null)
                    setSuccess(t('Резервная копия восстановлена.'))
                  }
                }}
              >
                {t('Заменить данные')}
              </button>
              <button className="text-button" onClick={() => setPending(null)}>
                {t('Отмена')}
              </button>
            </div>
          ) : null}
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          {success ? <p role="status">{success}</p> : null}
        </section>
        <section className="privacy-note">
          <ShieldCheck size={22} />
          <div>
            <h3>{t('Личное пространство')}</h3>
            <p>
              {t(
                'Без аккаунта, рекламы и аналитики. Очистка данных браузера удалит записи — сохраняйте резервные копии. Офлайн-режим доступен после первого открытия сайта.',
              )}
            </p>
            <button
              className="text-button"
              onClick={() => {
                try {
                  const raw = localStorage.getItem(STORAGE_KEY)
                  if (raw) {
                    download(raw, `dela-raw-${localDate()}.json`)
                    setSuccess(t('Исходная копия скачана.'))
                  } else setError(t('Сохранённых данных нет.'))
                } catch {
                  setError(t('Хранилище браузера недоступно.'))
                }
              }}
            >
              {t('Скачать исходные данные хранилища')}
            </button>
          </div>
        </section>
        <div className="settings-shortcuts">
          <span>
            {t('Новая запись')}
            <kbd>N</kbd>
          </span>
          <span>
            {t('Поиск')}
            <kbd>/</kbd>
          </span>
          <span>
            {t('Закрыть окно')}
            <kbd>Esc</kbd>
          </span>
        </div>
      </div>
    </Modal>
  )
}
