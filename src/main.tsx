import { t } from './i18n'
import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import '@fontsource-variable/manrope'
import './styles.css'
import './palettes.css'
class ErrorBoundary extends Component<
  {
    children: ReactNode
  },
  {
    failed: boolean
  }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application error', error, info.componentStack)
  }
  render() {
    if (this.state.failed)
      return (
        <main className="fatal-error">
          <h1>{t('Не удалось открыть приложение')}</h1>
          <p>
            {t('Сохранённые записи остаются в этом браузере. Попробуйте перезагрузить страницу.')}
          </p>
          <button className="button primary" onClick={() => window.location.reload()}>
            {t('Перезагрузить')}
          </button>
        </main>
      )
    return this.props.children
  }
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
