import { t } from './i18n'
import { useRegisterSW } from 'virtual:pwa-register/react'
export function PwaBanner({ editing }: { editing: boolean }) {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()
  return needRefresh && !editing ? (
    <div className="update-banner" role="status">
      <span>{t('Доступна новая версия приложения.')}</span>
      <button
        className="text-button"
        onClick={() => {
          void updateServiceWorker(true)
        }}
      >
        {t('Обновить')}
      </button>
      <button className="text-button" onClick={() => setNeedRefresh(false)}>
        {t('Позже')}
      </button>
    </div>
  ) : null
}
