import { t } from './i18n'
import { useEffect, useRef, useState } from 'react'
import { loadWorkspace, STORAGE_KEY, validateWorkspace, BackupValidationError } from './model'
import type { Workspace } from './types'
export function useWorkspace() {
  const [initial] = useState(loadWorkspace)
  const [workspace, setWorkspace] = useState(initial.workspace)
  const [storageError, setStorageError] = useState(initial.error)
  const [notice, setNotice] = useState('')
  const [canUndo, setCanUndo] = useState(false)
  const workspaceRef = useRef(workspace)
  const recoveryBlocked = useRef(!!initial.error)
  const history = useRef<Workspace[]>([])
  const commit = (next: Workspace, message = t('Изменения сохранены')) => {
    if (recoveryBlocked.current) {
      setNotice(t('Сначала восстановите данные из резервной копии в настройках.'))
      return false
    }
    try {
      const clean = validateWorkspace(next)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clean))
      history.current = [...history.current.slice(-19), workspaceRef.current]
      setCanUndo(true)
      workspaceRef.current = clean
      setWorkspace(clean)
      setStorageError(null)
      setNotice(message)
      return true
    } catch (error) {
      setStorageError(
        error instanceof BackupValidationError
          ? error.message
          : t(
              'Не удалось сохранить. Память браузера недоступна или заполнена. Изменения не применены; экспортируйте данные.',
            ),
      )
      return false
    }
  }
  const undo = () => {
    const previous = history.current.at(-1)
    if (!previous) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(previous))
      history.current.pop()
      setCanUndo(history.current.length > 0)
      workspaceRef.current = previous
      setWorkspace(previous)
      setStorageError(null)
      setNotice(t('Последнее действие отменено'))
    } catch {
      setStorageError(t('Не удалось сохранить отмену действия.'))
    }
  }
  const recover = (next: Workspace) => {
    const wasBlocked = recoveryBlocked.current
    recoveryBlocked.current = false
    const saved = commit(next, t('Резервная копия восстановлена'))
    if (!saved) recoveryBlocked.current = wasBlocked
    return saved
  }
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return
      const loaded = loadWorkspace()
      if (loaded.error) {
        recoveryBlocked.current = true
        setStorageError(loaded.error)
        return
      }
      workspaceRef.current = loaded.workspace
      history.current = []
      setCanUndo(false)
      recoveryBlocked.current = false
      setWorkspace(loaded.workspace)
      setStorageError(null)
      setNotice(t('Данные обновлены из другой вкладки'))
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])
  return { workspace, commit, undo, recover, canUndo, storageError, notice, setNotice }
}
